import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as familyMeetingsService from '../services/familyMeetingsService';

import { generateId } from '../utils/generateId';

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
  isLoaded: boolean;
  addMeeting: (m: Omit<FamilyMeeting, 'id'>) => string;
  deleteMeeting: (id: string) => void;
  toggleAgendaItem: (meetingId: string, agendaItemId: string) => void;
  updateNotes: (meetingId: string, notes: string) => void;
  setMood: (meetingId: string, mood: string) => void;
  setDuration: (meetingId: string, minutes: number) => void;
  setAttendees: (meetingId: string, attendeeIds: string[]) => void;
  addActionItem: (meetingId: string, text: string, assigneeId: string) => void;
  toggleActionItem: (meetingId: string, actionItemId: string) => void;
  fetchFromServer: (familyId?: string) => Promise<void>;
}

export const useFamilyMeetingsStore = create<FamilyMeetingsState>()(
  persist(
    (set, get) => {
      const syncMeeting = (meetingId: string) => {
        const meeting = get().meetings.find((m) => m.id === meetingId);
        if (meeting) {
          familyMeetingsService.updateMeetingRemote(meetingId, {
            agenda: meeting.agenda,
            notes: meeting.notes,
            mood: meeting.mood,
            durationMinutes: meeting.durationMinutes,
            attendeeIds: meeting.attendeeIds,
            actionItems: meeting.actionItems,
          }).catch(() => {});
        }
      };

      return {
      meetings: [],
      isLoaded: false,

      addMeeting: (m) => {
        const id = generateId();
        const meeting: FamilyMeeting = { ...m, id };
        set((s) => ({ meetings: [meeting, ...s.meetings] }));
        familyMeetingsService.createMeeting(meeting).catch(() => {
          set((s) => ({ meetings: s.meetings.filter((x) => x.id !== id) }));
        });
        return id;
      },

      deleteMeeting: (id) => {
        const prev = get().meetings;
        set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) }));
        familyMeetingsService.deleteMeetingRemote(id).catch(() => { set({ meetings: prev }); });
      },

      toggleAgendaItem: (meetingId, agendaItemId) => {
        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === meetingId
              ? { ...m, agenda: m.agenda.map((a) => (a.id === agendaItemId ? { ...a, done: !a.done } : a)) }
              : m
          ),
        }));
        syncMeeting(meetingId);
      },

      updateNotes: (meetingId, notes) => {
        set((s) => ({
          meetings: s.meetings.map((m) => (m.id === meetingId ? { ...m, notes } : m)),
        }));
        syncMeeting(meetingId);
      },

      setMood: (meetingId, mood) => {
        set((s) => ({
          meetings: s.meetings.map((m) => (m.id === meetingId ? { ...m, mood } : m)),
        }));
        syncMeeting(meetingId);
      },

      setDuration: (meetingId, minutes) => {
        set((s) => ({
          meetings: s.meetings.map((m) => (m.id === meetingId ? { ...m, durationMinutes: minutes } : m)),
        }));
        syncMeeting(meetingId);
      },

      setAttendees: (meetingId, attendeeIds) => {
        set((s) => ({
          meetings: s.meetings.map((m) => (m.id === meetingId ? { ...m, attendeeIds } : m)),
        }));
        syncMeeting(meetingId);
      },

      addActionItem: (meetingId, text, assigneeId) => {
        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === meetingId
              ? { ...m, actionItems: [...m.actionItems, { id: generateId(), text, assigneeId, done: false }] }
              : m
          ),
        }));
        syncMeeting(meetingId);
      },

      toggleActionItem: (meetingId, actionItemId) => {
        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === meetingId
              ? { ...m, actionItems: m.actionItems.map((a) => (a.id === actionItemId ? { ...a, done: !a.done } : a)) }
              : m
          ),
        }));
        syncMeeting(meetingId);
      },

      fetchFromServer: async () => {
        try {
          const { meetings } = await familyMeetingsService.fetchMeetings();
          set({ meetings, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },
      };
    },
    {
      name: 'family-command-center-meetings',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ meetings: state.meetings }),
    }
  )
);
