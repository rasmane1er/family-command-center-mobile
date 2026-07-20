import { enqueueSync } from '../sync/enqueueSync';
import { mmkvStorage } from '../storage/mmkvStorage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Family, FamilyMember, Task, CalendarEvent, Goal, Reward, RewardCatalogItem, Achievement } from '../types';
import { defaultPermissionsForRole } from '../types';
import * as calendarService from '../services/calendarService';
import * as taskService from '../services/taskService';
import * as rewardService from '../services/rewardService';
import { apiRequest, ApiRequestError } from '../api/client';
import { authBridge } from './authBridge';

interface FamilyState {
  family: Family | null;
  members: FamilyMember[];
  tasks: Task[];
  events: CalendarEvent[];
  goals: Goal[];
  rewards: Reward[];
  rewardCatalog: RewardCatalogItem[];
  hasSeededRewardCatalog: boolean;
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
  // Resolves false (after rolling back the optimistic removal) if the
  // backend delete fails, so a confirmation-gated UI can tell the user it
  // didn't actually happen instead of the member silently reappearing.
  removeMember: (id: string) => Promise<boolean>;
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
  // Pulls redemption history from the backend, same reasoning as
  // hydrateTasks/hydrateEvents above — addReward/clearRewardHistory below
  // already write through to the same backend, this is the read side.
  hydrateRewards: () => Promise<void>;
  awardPoints: (memberId: string, points: number) => void;

  addRewardCatalogItem: (item: RewardCatalogItem) => void;
  deleteRewardCatalogItem: (id: string) => void;
  // One-time starter catalog so the Store tab isn't empty on a brand-new
  // family — real, persisted, family-editable items from the start, not a
  // hardcoded array rendered outside the store. Safe to call on every
  // fetchFromServer(); the hasSeededRewardCatalog guard makes it a no-op
  // after the first run.
  seedRewardCatalogDefaults: () => void;

  isLoaded: boolean;
  fetchFromServer: () => Promise<void>;
  // Child onboarding: look up a family by its 6-char invite code and
  // set the local family state so the child can access the family.
  joinWithCode: (code: string) => Promise<void>;
}

import { generateId } from '../utils/generateId';

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
  rewardCatalog: [],
  hasSeededRewardCatalog: false,
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
      .catch((err) => {
        set((s) => ({ members: s.members.filter((x) => x.id !== m.id) }));
        // The client-side check in AddMemberScreen (features.maxFamilyMembers)
        // normally blocks this before it reaches the server — this only fires
        // if that check was stale or bypassed. Re-thrown (unlike every other
        // error here) so the caller can show the same UpgradePrompt instead of
        // the member silently vanishing with no explanation.
        if (err instanceof ApiRequestError && (err.body as { error?: string } | undefined)?.error === 'member_limit_exceeded') {
          throw err;
        }
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
    if (!familyId) return Promise.resolve(true);
    return apiRequest(`/family/${familyId}/members/${id}`, { method: 'DELETE' })
      .then(() => true)
      .catch(() => {
        set({ members: prev });
        return false;
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

  addReward: (r) => {
    set((s) => ({ rewards: [...s.rewards, r] }));
    rewardService.createReward(r).catch(() => {
      set((s) => ({ rewards: s.rewards.filter((x) => x.id !== r.id) }));
    });
  },
  redeemReward: (id) => {
    const prev = get().rewards;
    const redeemedAt = new Date().toISOString();
    set((s) => ({
      rewards: s.rewards.map((r) => (r.id === id ? { ...r, isRedeemed: true, redeemedAt } : r)),
    }));
    rewardService.updateRewardRemote(id, { isRedeemed: true, redeemedAt }).catch(() => {
      set({ rewards: prev });
    });
  },
  clearRewardHistory: (memberId) => {
    const prev = get().rewards;
    set((s) => ({ rewards: s.rewards.filter((r) => r.memberId !== memberId) }));
    rewardService.deleteRewardsByMember(memberId).catch(() => {
      set({ rewards: prev });
    });
  },
  hydrateRewards: async () => {
    try {
      const { rewards } = await rewardService.fetchRewards();
      set({ rewards });
    } catch {
      // offline or backend unreachable — keep whatever is already local.
    }
  },
  awardPoints: (memberId, points) =>
    set((s) => ({
      members: s.members.map((m) => (m.id === memberId ? { ...m, points: m.points + points } : m)),
    })),

  addRewardCatalogItem: (item) => set((s) => ({ rewardCatalog: [...s.rewardCatalog, item] })),
  deleteRewardCatalogItem: (id) =>
    set((s) => ({ rewardCatalog: s.rewardCatalog.filter((r) => r.id !== id) })),
  seedRewardCatalogDefaults: () => {
    if (get().hasSeededRewardCatalog) return;
    const familyId = get().family?.id ?? '';
    const defaults: Omit<RewardCatalogItem, 'id' | 'familyId'>[] = [
      { name: 'Extra Screen Time', description: '30 min of extra screen time', cost: 100, icon: 'phone-portrait', color: '#8E44AD' },
      { name: 'Choose Dinner', description: 'Pick the family dinner tonight', cost: 150, icon: 'restaurant', color: '#F5A623' },
      { name: 'Stay Up Late', description: '1 hour past bedtime', cost: 200, icon: 'moon', color: '#2C3E50' },
      { name: 'Movie Night Pick', description: 'You choose the movie', cost: 250, icon: 'film', color: '#E74C3C' },
      { name: 'Ice Cream Trip', description: 'Family ice cream outing', cost: 300, icon: 'ice-cream', color: '#E91E63' },
      { name: 'No Chores Day', description: 'Skip all chores for one day', cost: 400, icon: 'happy', color: '#27AE60' },
      { name: 'Sleepover', description: 'Have a friend sleep over', cost: 500, icon: 'people', color: '#2980B9' },
      { name: 'Game Purchase', description: '$10 game or app', cost: 750, icon: 'game-controller', color: '#9B59B6' },
    ];
    set({
      rewardCatalog: defaults.map((d) => ({ ...d, id: generateId(), familyId })),
      hasSeededRewardCatalog: true,
    });
  },

  // Real hydration for the core family/members/tasks data — previously a
  // no-op stub that nothing else even called, meaning family/member/task
  // changes made on another family member's device never showed up here.
  // GET /sync/family already existed and worked (it's what onboarding's
  // family-creation flow POSTs to); this just wires up the read side too.
  fetchFromServer: async () => {
    let fetchSucceeded = false;
    try {
      const data = await apiRequest('/sync/family') as {
        family: Family; members: FamilyMember[];
      };
      set({ family: data.family, members: data.members });
      fetchSucceeded = true;

      // Self-heal: a real backend family can exist with no member matching
      // the signed-in user (e.g. populateFromSignUp previously fabricated a
      // local-only member that never reached the server, or the account was
      // bootstrapped some other way). Without this, isParent/activeMemberId
      // lookups silently fail and parent-only tabs disappear even though the
      // user genuinely owns this family.
      const authUser = authBridge.getSnapshot().user;
      // The backend User.id (resolved server-side off the Firebase-verified
      // email on every social sign-in, so it's stable across sessions) —
      // NOT authUser.id, which for social sign-in is whatever the client
      // locally echoed back from the provider credential. Apple only
      // discloses a real name/email on the very first authorization; every
      // sign-in after that reconstructs a fallback email client-side, so
      // matching on authUser.id/email alone made every repeat Apple sign-in
      // fail to find its own member and self-heal-create a duplicate one.
      const backendUserId = authBridge.getSnapshot().backendUserId;
      if (authUser?.email) {
        const email = authUser.email.toLowerCase();
        const findSelf = (members: FamilyMember[]) =>
          members.find(
            (m) => (backendUserId && m.linkedUserId === backendUserId) || m.email?.toLowerCase() === email
          );

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
            status: 'ACTIVE',
            points: 0,
            level: 1,
            isAdmin: true,
            createdAt: now,
            isLocalProfile: false,
            linkedUserId: backendUserId ?? authUser.id,
            isPinProtected: false,
            permissions: defaultPermissionsForRole('parent'),
            inviteStatus: 'accepted',
          });
        }

        const activeStillValid = get().members.some((m) => m.id === get().activeMemberId);
        if (!activeStillValid) set({ activeMemberId: self.id });
      }
    } catch (err: any) {
      console.warn('[family] fetchFromServer failed:', err);
      // Only sign out on 401 if we had a backend session to begin with.
      // When syncWithBackend fails (login 401 + register 409 = password mismatch
      // or network issue), familyId/backendUserId are never set — the user is
      // legitimately logged in locally but has no backend token. Signing out in
      // that case creates an infinite loop: sign-out → re-auth → syncWithBackend
      // fails again → fetchFromServer 401 → sign-out again.
      if (err?.message?.includes('401')) {
        const { familyId, backendUserId } = authBridge.getSnapshot();
        if (familyId || backendUserId) {
          // We had a real backend session that became invalid — sign out.
          authBridge.signOut();
        }
        // No backend session established yet — stay logged in with local data.
        return;
      }
      // Any other error (network, 5xx) — stay logged in with local data.
      // Do NOT set isLoaded: true here — leave it false so the next screen
      // mount can retry (isLoaded: true with empty members blocks all retries).
      return;
    }
    await get().hydrateTasks();
    await get().hydrateRewards();
    get().seedRewardCatalogDefaults();
    // Only mark loaded after a successful fetch — failing with empty members
    // and isLoaded: true would prevent Dashboard from ever retrying.
    if (fetchSucceeded) set({ isLoaded: true });
  },

  joinWithCode: async (code: string) => {
    const normalized = code.trim().toUpperCase();
    const result = await apiRequest<{ family: Family; members: FamilyMember[] }>(
      `/family/join-code/${normalized}`,
    );
    set({ family: result.family, members: result.members, isLoaded: true });
    // Auto-select the first child member (most likely the one the code was for)
    const childMember = result.members.find((m) => m.role === 'child');
    if (childMember) set({ activeMemberId: childMember.id });
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
    rewardCatalog: state.rewardCatalog,
    hasSeededRewardCatalog: state.hasSeededRewardCatalog,
    goals: state.goals,
    rewards: state.rewards,
    achievements: state.achievements,
    activeMemberId: state.activeMemberId,
  }),
}
  )
);
