import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as journalService from '../services/journalService';

export interface JournalReaction {
  memberId: string;
  emoji: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  emoji: string;
  authorId: string;
  mood: 1 | 2 | 3 | 4 | 5;
  isPrivate: boolean;
  tags: string[];
  reactions: JournalReaction[];
}

const MOOD_LABELS: Record<number, string> = { 1: 'Rough', 2: 'Meh', 3: 'Okay', 4: 'Good', 5: 'Amazing' };
const MOOD_EMOJIS: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '😊', 5: '🤩' };

export { MOOD_LABELS, MOOD_EMOJIS };

// Bounds the local optimistic-add path between server syncs — fetchFromServer
// already returns a server-capped list (see the API's DOMAIN_LIST_CAP), but
// addEntry's local prepend has no cap of its own otherwise.
const MAX_ENTRIES = 500;

interface JournalStore {
  entries: JournalEntry[];
  isLoaded: boolean;
  addEntry: (entry: Omit<JournalEntry, 'id' | 'reactions'>) => Promise<void>;
  deleteEntry: (id: string) => void;
  addReaction: (entryId: string, memberId: string, emoji: string) => void;
  removeReaction: (entryId: string, memberId: string) => void;
  fetchFromServer: (familyId?: string) => Promise<void>;
}

export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      entries: [],
      isLoaded: false,

      addEntry: async (entry) => {
        const newEntry: JournalEntry = { ...entry, id: `journal-${Date.now()}`, reactions: [] };
        set((s) => ({ entries: [newEntry, ...s.entries].slice(0, MAX_ENTRIES) }));
        try {
          await journalService.createEntry(newEntry);
        } catch {
          set((s) => ({ entries: s.entries.filter((e) => e.id !== newEntry.id) }));
        }
      },

      deleteEntry: (id) => {
        const prev = get().entries;
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
        journalService.deleteEntryRemote(id).catch(() => { set({ entries: prev }); });
      },

      addReaction: (entryId, memberId, emoji) => {
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  reactions: [
                    ...e.reactions.filter((r) => r.memberId !== memberId),
                    { memberId, emoji },
                  ],
                }
              : e
          ),
        }));
        const entry = get().entries.find((e) => e.id === entryId);
        if (entry) journalService.updateEntryRemote(entryId, { reactions: entry.reactions }).catch(() => {});
      },

      removeReaction: (entryId, memberId) => {
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === entryId
              ? { ...e, reactions: e.reactions.filter((r) => r.memberId !== memberId) }
              : e
          ),
        }));
        const entry = get().entries.find((e) => e.id === entryId);
        if (entry) journalService.updateEntryRemote(entryId, { reactions: entry.reactions }).catch(() => {});
      },

      fetchFromServer: async () => {
        try {
          const { entries } = await journalService.fetchEntries();
          set({ entries, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },
    }),
    { name: 'journal-store', storage: createJSONStorage(() => mmkvStorage) }
  )
);
