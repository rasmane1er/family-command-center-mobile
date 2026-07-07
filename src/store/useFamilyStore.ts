import { enqueueSync } from '../sync/enqueueSync';
import { mmkvStorage } from '../storage/mmkvStorage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Family, FamilyMember, Task, CalendarEvent, Goal, Reward, Achievement } from '../types';
import { defaultPermissionsForRole } from '../types';
import * as calendarService from '../services/calendarService';
import * as taskService from '../services/taskService';
import { apiRequest } from '../api/client';
import { useAuthStore } from './useAuthStore';

interface FamilyState {
  family: Family | null;
  members: FamilyMember[];
  tasks: Task[];
  events: CalendarEvent[];
  goals: Goal[];
  rewards: Reward[];
  achievements: Achievement[];
  activeMemberId: string | null;

  setFamily: (f: Family) => void;
  updateFamily: (updates: Partial<Family>) => void;
  // Resolves with the member as it ends up in state — with its id reconciled
  // to the real backend-assigned one once the write-through completes, so
  // callers that need the final id (e.g. fetchFromServer's self-heal) don't
  // have to guess at timing.
  addMember: (m: FamilyMember) => Promise<FamilyMember>;
  addLocalProfile: (m: FamilyMember) => void;
  updateMember: (id: string, updates: Partial<FamilyMember>) => void;
  removeMember: (id: string) => void;
  setActiveMember: (id: string | null) => void;

  addTask: (t: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  completeTask: (id: string, memberId: string) => void;
  deleteTask: (id: string) => void;
  // Pulls tasks from the backend, same reasoning as hydrateEvents below —
  // this is the read side of a real bidirectional sync, not just a queued
  // write nobody ever reads back.
  hydrateTasks: () => Promise<void>;
  isHydratingTasks: boolean;

  // Approval workflow for requiresApproval tasks — submitTaskForApproval
  // never awards points itself; approveTask is the only path that does,
  // by delegating to the exact same completeTask above (one place, not
  // two, decides what "completed" means and what it's worth).
  submitTaskForApproval: (id: string, memberId: string, photoUrl?: string) => void;
  approveTask: (id: string) => void;
  rejectTask: (id: string, note?: string) => void;

  addEvent: (e: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  // Pulls events from the backend so events another family member added on
  // their own device actually show up here — local addEvent/updateEvent/
  // deleteEvent above already write through to the same backend, this is
  // the read side of that same real (not just queued-and-forgotten) sync.
  hydrateEvents: () => Promise<void>;
  isHydratingEvents: boolean;

  addGoal: (g: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  addReward: (r: Reward) => void;
  redeemReward: (id: string) => void;
  // Wipes a member's reward records entirely (both history and any
  // still-unredeemed catalog entries tied to them) — used by the "Clear
  // History" action in Rewards Center, scoped per-child to match how the
  // rest of that screen is already scoped.
  clearRewardHistory: (memberId: string) => void;
  awardPoints: (memberId: string, points: number) => void;

  isLoaded: boolean;
  fetchFromServer: () => Promise<void>;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
  family: null,
  members: [],
  tasks: [],
  isHydratingTasks: false,
  events: [],
  isHydratingEvents: false,
  goals: [],
  rewards: [],
  achievements: [],
  activeMemberId: null,
  isLoaded: false,

  setFamily: (f) => set({ family: f }),
  updateFamily: (updates) => set((s) => (s.family ? { family: { ...s.family, ...updates } } : s)),
  addMember: (m) => {
    set((s) => ({ members: [...s.members, m] }));
    const familyId = get().family?.id ?? m.familyId;
    // Previously this only went through enqueueSync's write-only audit log
    // (never actually read back by anything), so a new member never really
    // existed server-side and would vanish from every other family
    // member's device on next real sync. The backend assigns its own id
    // (it doesn't accept a client-supplied one here), so the optimistic
    // local id gets reconciled to the real one once the response comes back.
    return apiRequest(`/family/${familyId}/members`, { method: 'POST', body: JSON.stringify(m) })
      .then((res: any) => {
        const finalId = res?.member?.id && res.member.id !== m.id ? res.member.id : m.id;
        if (finalId !== m.id) {
          set((s) => ({ members: s.members.map((x) => (x.id === m.id ? { ...x, id: finalId } : x)) }));
        }
        return { ...m, id: finalId };
      })
      .catch(() => {
        set((s) => ({ members: s.members.filter((x) => x.id !== m.id) }));
        return m;
      });
  },
  addLocalProfile: (m) => {
    set((s) => ({ members: [...s.members, m] }));
    enqueueSync({
      entity: 'family',
      action: 'create',
      payload: { type: 'member', data: m },
    });
  },
  updateMember: (id, updates) => {
    const prev = get().members;
    set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, ...updates } : m)) }));
    const familyId = get().family?.id;
    if (!familyId) return;
    apiRequest(`/family/${familyId}/members/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }).catch(() => {
      set({ members: prev });
    });
  },
  removeMember: (id) => {
    const prev = get().members;
    set((s) => ({ members: s.members.filter((m) => m.id !== id) }));
    const familyId = get().family?.id;
    if (!familyId) return;
    apiRequest(`/family/${familyId}/members/${id}`, { method: 'DELETE' }).catch(() => {
      set({ members: prev });
    });
  },
  setActiveMember: (id) => set({ activeMemberId: id }),

  addTask: (t) => {
    set((s) => ({ tasks: [...s.tasks, t] }));
    taskService.createTask(t).catch(() => {
      set((s) => ({ tasks: s.tasks.filter((x) => x.id !== t.id) }));
    });
  },
  updateTask: (id, updates) => {
    const prev = get().tasks;
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) }));
    taskService.updateTaskRemote(id, updates).catch(() => { set({ tasks: prev }); });
  },
  completeTask: (id, memberId) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const prevTasks = get().tasks;
    const prevMembers = get().members;
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, status: 'completed', completedAt: new Date().toISOString(), completedBy: memberId } : t
      ),
      members: s.members.map((m) =>
        m.id === memberId ? { ...m, points: m.points + task.points } : m
      ),
    }));
    // Atomic on the backend (task status + member points in one
    // transaction) — rolled back locally together if it fails, so the UI
    // never shows a task as completed without the points actually landing,
    // or vice versa.
    taskService.completeTaskRemote(id, memberId).catch(() => {
      set({ tasks: prevTasks, members: prevMembers });
    });
  },
  submitTaskForApproval: (id, memberId, photoUrl) => {
    const prev = get().tasks;
    const updates = {
      status: 'pending_approval' as const,
      submittedBy: memberId,
      submittedAt: new Date().toISOString(),
      ...(photoUrl ? { completionPhotoUrl: photoUrl } : {}),
      rejectionNote: undefined,
    };
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    taskService.updateTaskRemote(id, updates).catch(() => { set({ tasks: prev }); });
  },
  approveTask: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    // Delegates to completeTask so point-awarding only ever happens in one
    // place, regardless of whether a task skipped approval or went through it.
    if (task?.submittedBy) get().completeTask(id, task.submittedBy);
  },
  rejectTask: (id, note) => {
    const prev = get().tasks;
    const updates = {
      status: 'pending' as const,
      submittedBy: undefined,
      submittedAt: undefined,
      completionPhotoUrl: undefined,
      rejectionNote: note,
    };
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    taskService.updateTaskRemote(id, updates).catch(() => { set({ tasks: prev }); });
  },
  deleteTask: (id) => {
    const prev = get().tasks;
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    taskService.deleteTaskRemote(id).catch(() => { set({ tasks: prev }); });
  },
  hydrateTasks: async () => {
    set({ isHydratingTasks: true });
    try {
      const { tasks } = await taskService.fetchTasks();
      set({ tasks });
    } catch {
      // offline or backend unreachable — keep whatever is already local.
    } finally {
      set({ isHydratingTasks: false });
    }
  },

  addEvent: (e) => {
  set((s) => ({ events: [...s.events, e] }));
  // e.id is client-generated and sent through unchanged as the row's real
  // primary key (the backend accepts a caller-supplied id) — no separate
  // local-id-to-server-id reconciliation needed, unlike Guardian devices.
  // Rolled back on failure — otherwise the next hydrateEvents() (a full
  // replace from the server) would silently discard an event that never
  // actually made it to the backend, with no error shown to the user.
  calendarService.createEvent(e).catch(() => {
    set((s) => ({ events: s.events.filter((ev) => ev.id !== e.id) }));
  });
},
  updateEvent: (id, updates) => {
    const prev = get().events;
    set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)) }));
    calendarService.updateEventRemote(id, updates).catch(() => { set({ events: prev }); });
  },
  deleteEvent: (id) => {
    const prev = get().events;
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    calendarService.deleteEventRemote(id).catch(() => { set({ events: prev }); });
  },
  hydrateEvents: async () => {
    set({ isHydratingEvents: true });
    try {
      const { events } = await calendarService.fetchEvents();
      set({ events });
    } catch {
      // offline or backend unreachable — keep whatever is already local.
    } finally {
      set({ isHydratingEvents: false });
    }
  },

  addGoal: (g) => {
  set((s) => ({ goals: [...s.goals, g] }));

  enqueueSync({
    entity: 'family',
    action: 'create',
    payload: { type: 'goal', data: g },
  });
},
  updateGoal: (id, updates) =>
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)) })),
  deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

  addReward: (r) => set((s) => ({ rewards: [...s.rewards, r] })),
  redeemReward: (id) =>
    set((s) => ({
      rewards: s.rewards.map((r) =>
        r.id === id ? { ...r, isRedeemed: true, redeemedAt: new Date().toISOString() } : r
      ),
    })),
  clearRewardHistory: (memberId) =>
    set((s) => ({ rewards: s.rewards.filter((r) => r.memberId !== memberId) })),
  awardPoints: (memberId, points) =>
    set((s) => ({
      members: s.members.map((m) => (m.id === memberId ? { ...m, points: m.points + points } : m)),
    })),

  // Real hydration for the core family/members/tasks data — previously a
  // no-op stub that nothing else even called, meaning family/member/task
  // changes made on another family member's device never showed up here.
  // GET /sync/family already existed and worked (it's what onboarding's
  // family-creation flow POSTs to); this just wires up the read side too.
  fetchFromServer: async () => {
    try {
      const data = await apiRequest('/sync/family') as {
        family: Family; members: FamilyMember[];
      };
      set({ family: data.family, members: data.members });

      // Self-heal: a real backend family can exist with no member matching
      // the signed-in user (e.g. populateFromSignUp previously fabricated a
      // local-only member that never reached the server, or the account was
      // bootstrapped some other way). Without this, isParent/activeMemberId
      // lookups silently fail and parent-only tabs disappear even though the
      // user genuinely owns this family.
      const authUser = useAuthStore.getState().user;
      if (authUser?.email) {
        const email = authUser.email.toLowerCase();
        const findSelf = (members: FamilyMember[]) =>
          members.find((m) => m.email?.toLowerCase() === email || m.linkedUserId === authUser.id);

        let self = findSelf(data.members);
        if (!self) {
          const now = new Date().toISOString();
          self = await get().addMember({
            id: generateId(),
            familyId: data.family.id,
            name: authUser.displayName,
            role: authUser.familyRole === 'guardian' ? 'guardian' : 'parent',
            avatar: authUser.avatarUri,
            avatarColor: authUser.avatarColor ?? '#4A8FD9',
            dateOfBirth: authUser.dateOfBirth,
            email: authUser.email,
            phone: authUser.phone,
            status: 'active',
            points: 0,
            level: 1,
            isAdmin: true,
            createdAt: now,
            isLocalProfile: false,
            linkedUserId: authUser.id,
            isPinProtected: false,
            permissions: defaultPermissionsForRole('parent'),
            inviteStatus: 'accepted',
          });
        }

        const activeStillValid = get().members.some((m) => m.id === get().activeMemberId);
        if (!activeStillValid) set({ activeMemberId: self.id });
      }
    } catch {
      // offline or backend unreachable — keep whatever is already local.
    }
    await get().hydrateTasks();
    set({ isLoaded: true });
  },
    }),
    {
  name: 'family-command-center-family',
  storage: createJSONStorage(() => mmkvStorage),
  partialize: (state) => ({
    family: state.family,
    members: state.members,
    tasks: state.tasks,
    events: state.events,
    goals: state.goals,
    rewards: state.rewards,
    achievements: state.achievements,
    activeMemberId: state.activeMemberId,
  }),
}
  )
);
