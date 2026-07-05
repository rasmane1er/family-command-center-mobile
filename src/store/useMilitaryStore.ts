import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import { useFamilyStore } from './useFamilyStore';
import type {
  Deployment,
  PCSMove,
  FamilyReadiness,
  ChainOfCommandContact,
  Task,
  CalendarEvent,
} from '../types';

const generateId = () => Math.random().toString(36).substring(2, 11);

// Day-offsets relative to moveDate — a real, well-known PCS (Permanent
// Change of Station) checklist, not a generic "moving checklist". Written
// as real Task rows via useFamilyStore so they show up in the regular
// Tasks screen too, get real due-date/overdue handling, and don't need a
// second "is this done" concept living only in this store.
const PCS_CHECKLIST_TEMPLATE: { title: string; daysBefore: number }[] = [
  { title: 'Update DEERS with new duty station', daysBefore: 90 },
  { title: 'Request copies of PCS orders', daysBefore: 75 },
  { title: 'Research new duty station housing options', daysBefore: 60 },
  { title: 'Schedule household goods (HHG) pickup', daysBefore: 45 },
  { title: 'Request school records transfer', daysBefore: 30 },
  { title: 'Transfer medical & TRICARE records', daysBefore: 30 },
  { title: 'Update mailing address (USPS + banks)', daysBefore: 21 },
  { title: 'Schedule final out-processing appointment', daysBefore: 14 },
  { title: 'Cancel or transfer local utilities', daysBefore: 10 },
  { title: 'Final housing walkthrough / clean', daysBefore: 3 },
  { title: 'Confirm travel & lodging for move day', daysBefore: 2 },
];

export const PCS_CHECKLIST_CATEGORY = 'PCS Move';

interface MilitaryState {
  deployments: Deployment[];
  pcsMoves: PCSMove[];
  readiness: FamilyReadiness | null;

  addDeployment: (d: Deployment) => void;
  updateDeployment: (id: string, updates: Partial<Deployment>) => void;
  deleteDeployment: (id: string) => void;

  addPCSMove: (move: PCSMove) => void;
  deletePCSMove: (id: string) => void;

  updateReadiness: (updates: Partial<Omit<FamilyReadiness, 'familyId' | 'contacts' | 'updatedAt'>>) => void;
  addContact: (contact: ChainOfCommandContact) => void;
  updateContact: (id: string, updates: Partial<ChainOfCommandContact>) => void;
  removeContact: (id: string) => void;
}

export const useMilitaryStore = create<MilitaryState>()(
  persist(
    (set, get) => ({
      deployments: [],
      pcsMoves: [],
      readiness: null,

      addDeployment: (d) => {
        set((s) => ({ deployments: [...s.deployments, d] }));

        // Real calendar events, not a separate "military calendar" — the
        // same Calendar screen everyone already uses will show these.
        const { addEvent } = useFamilyStore.getState();
        const family = useFamilyStore.getState().family;
        const familyId = family?.id ?? d.familyId;
        const now = new Date().toISOString();
        const typeLabel = d.type === 'deployment' ? 'Deployment' : d.type === 'tdy' ? 'TDY' : 'Training';

        const departureEvent: CalendarEvent = {
          id: generateId(),
          familyId,
          title: `${typeLabel} departure — ${d.location}`,
          startDate: d.startDate,
          endDate: d.startDate,
          allDay: true,
          attendees: [d.memberId],
          color: '#4A7C59',
          category: 'Military',
          recurrence: 'none',
          createdAt: now,
          createdBy: d.memberId,
        };
        addEvent(departureEvent);

        if (d.endDate) {
          const returnEvent: CalendarEvent = {
            id: generateId(),
            familyId,
            title: `${typeLabel} return — ${d.location}`,
            startDate: d.endDate,
            endDate: d.endDate,
            allDay: true,
            attendees: [d.memberId],
            color: '#4A7C59',
            category: 'Military',
            recurrence: 'none',
            createdAt: now,
            createdBy: d.memberId,
          };
          addEvent(returnEvent);
        }
      },
      updateDeployment: (id, updates) =>
        set((s) => ({ deployments: s.deployments.map((d) => (d.id === id ? { ...d, ...updates } : d)) })),
      deleteDeployment: (id) => set((s) => ({ deployments: s.deployments.filter((d) => d.id !== id) })),

      addPCSMove: (move) => {
        set((s) => ({ pcsMoves: [...s.pcsMoves, move] }));

        const { addTask } = useFamilyStore.getState();
        const family = useFamilyStore.getState().family;
        const members = useFamilyStore.getState().members;
        const familyId = family?.id ?? move.familyId;
        const createdBy = members[0]?.id ?? 'user';
        const now = new Date().toISOString();
        const moveDateMs = new Date(move.moveDate).getTime();

        for (const item of PCS_CHECKLIST_TEMPLATE) {
          const dueDate = new Date(moveDateMs - item.daysBefore * 86400000).toISOString();
          const task: Task = {
            id: generateId(),
            familyId,
            title: item.title,
            description: `PCS move: ${move.fromLocation} → ${move.toLocation}`,
            dueDate,
            priority: item.daysBefore <= 14 ? 'high' : 'medium',
            status: 'pending',
            category: PCS_CHECKLIST_CATEGORY,
            recurrence: 'none',
            points: 10,
            createdAt: now,
            createdBy,
            pcsMoveId: move.id,
          };
          addTask(task);
        }
      },
      deletePCSMove: (id) => {
        set((s) => ({ pcsMoves: s.pcsMoves.filter((m) => m.id !== id) }));
        // Removing a move also removes its generated checklist tasks —
        // otherwise they'd linger in the main Tasks list with no move to
        // belong to.
        const { tasks, deleteTask } = useFamilyStore.getState();
        for (const t of tasks) {
          if (t.pcsMoveId === id) deleteTask(t.id);
        }
      },

      updateReadiness: (updates) => {
        const family = useFamilyStore.getState().family;
        set((s) => {
          const base: FamilyReadiness = s.readiness ?? {
            familyId: family?.id ?? 'demo-family',
            contacts: [],
            updatedAt: new Date().toISOString(),
          };
          return { readiness: { ...base, ...updates, updatedAt: new Date().toISOString() } };
        });
      },
      addContact: (contact) => {
        const family = useFamilyStore.getState().family;
        set((s) => {
          const base: FamilyReadiness = s.readiness ?? {
            familyId: family?.id ?? 'demo-family',
            contacts: [],
            updatedAt: new Date().toISOString(),
          };
          return {
            readiness: { ...base, contacts: [...base.contacts, contact], updatedAt: new Date().toISOString() },
          };
        });
      },
      updateContact: (id, updates) => {
        const current = get().readiness;
        if (!current) return;
        set({
          readiness: {
            ...current,
            contacts: current.contacts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
            updatedAt: new Date().toISOString(),
          },
        });
      },
      removeContact: (id) => {
        const current = get().readiness;
        if (!current) return;
        set({
          readiness: {
            ...current,
            contacts: current.contacts.filter((c) => c.id !== id),
            updatedAt: new Date().toISOString(),
          },
        });
      },
    }),
    {
      name: 'family-command-center-military',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
