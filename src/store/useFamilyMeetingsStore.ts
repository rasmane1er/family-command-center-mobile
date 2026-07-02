import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

const generateId = () => Math.random().toString(36).substring(2, 11);

export interface MeetingAgendaItem {
  id: string;
  text: string;
  done: boolean;
}

export interface MeetingActionItem {
  id: string;
  text: string;
  assigneeId: string;
  done: boolean;
}

export interface FamilyMeeting {
  id: string;
  familyId: string;
  date: string;
  title: string;
  attendeeIds: string[];
  agenda: MeetingAgendaItem[];
  notes: string;
  actionItems: MeetingActionItem[];
  mood?: string;
  durationMinutes?: number;
}

interface FamilyMeetingsState {
  meetings: FamilyMeeting[];
  addMeeting: (m: Omit<FamilyMeeting, 'id'>) => string;
  deleteMeeting: (id: string) => void;
  toggleAgendaItem: (meetingId: string, agendaItemId: string) => void;
  updateNotes: (meetingId: string, notes: string) => void;
  setMood: (meetingId: string, mood: string) => void;
  setDuration: (meetingId: string, minutes: number) => void;
  setAttendees: (meetingId: string, attendeeIds: string[]) => void;
  addActionItem: (meetingId: string, text: string, assigneeId: string) => void;
  toggleActionItem: (meetingId: string, actionItemId: string) => void;
}

export const useFamilyMeetingsStore = create<FamilyMeetingsState>()(
  persist(
    (set) => ({
      meetings: [],

      addMeeting: (m) => {
        const id = generateId();
        set((s) => ({ meetings: [{ ...m, id }, ...s.meetings] }));
        return id;
      },

      deleteMeeting: (id) =>
        set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) })),

      toggleAgendaItem: (meetingId, agendaItemId) =>
        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === meetingId
              ? { ...m, agenda: m.agenda.map((a) => (a.id === agendaItemId ? { ...a, done: !a.done } : a)) }
              : m
          ),
        })),

      updateNotes: (meetingId, notes) =>
        set((s) => ({
          meetings: s.meetings.map((m) => (m.id === meetingId ? { ...m, notes } : m)),
        })),

      setMood: (meetingId, mood) =>
        set((s) => ({
          meetings: s.meetings.map((m) => (m.id === meetingId ? { ...m, mood } : m)),
        })),

      setDuration: (meetingId, minutes) =>
        set((s) => ({
          meetings: s.meetings.map((m) => (m.id === meetingId ? { ...m, durationMinutes: minutes } : m)),
        })),

      setAttendees: (meetingId, attendeeIds) =>
        set((s) => ({
          meetings: s.meetings.map((m) => (m.id === meetingId ? { ...m, attendeeIds } : m)),
        })),

      addActionItem: (meetingId, text, assigneeId) =>
        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === meetingId
              ? { ...m, actionItems: [...m.actionItems, { id: generateId(), text, assigneeId, done: false }] }
              : m
          ),
        })),

      toggleActionItem: (meetingId, actionItemId) =>
        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === meetingId
              ? { ...m, actionItems: m.actionItems.map((a) => (a.id === actionItemId ? { ...a, done: !a.done } : a)) }
              : m
          ),
        })),
    }),
    {
      name: 'family-command-center-meetings',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ meetings: state.meetings }),
    }
  )
);
