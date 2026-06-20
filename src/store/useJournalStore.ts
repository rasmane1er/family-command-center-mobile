import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface JournalStore {
  entries: JournalEntry[];
  addEntry: (entry: Omit<JournalEntry, 'id' | 'reactions'>) => void;
  deleteEntry: (id: string) => void;
  addReaction: (entryId: string, memberId: string, emoji: string) => void;
  removeReaction: (entryId: string, memberId: string) => void;
  seedDemoData: () => void;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];

export const useJournalStore = create<JournalStore>()(
  persist(
    (set) => ({
      entries: [],

      addEntry: (entry) => set((s) => ({
        entries: [{ ...entry, id: `journal-${Date.now()}`, reactions: [] }, ...s.entries],
      })),

      deleteEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      addReaction: (entryId, memberId, emoji) => set((s) => ({
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
      })),

      removeReaction: (entryId, memberId) => set((s) => ({
        entries: s.entries.map((e) =>
          e.id === entryId
            ? { ...e, reactions: e.reactions.filter((r) => r.memberId !== memberId) }
            : e
        ),
      })),

      seedDemoData: () => set((s) => {
        if (s.entries.length > 0) return s;
        const entries: JournalEntry[] = [
          {
            id: 'j-1',
            date: daysAgo(1),
            title: 'Best soccer game yet!',
            content: "Aiden scored his first goal today! The whole family was there cheering. He was so proud after the game — we went out for ice cream to celebrate. These are the moments I want to remember forever. Watching his face light up when the ball went in was pure magic.",
            emoji: '⚽',
            authorId: 'member-1',
            mood: 5,
            isPrivate: false,
            tags: ['Aiden', 'soccer', 'celebration', 'milestone'],
            reactions: [
              { memberId: 'member-2', emoji: '❤️' },
              { memberId: 'member-3', emoji: '🎉' },
            ],
          },
          {
            id: 'j-2',
            date: daysAgo(3),
            title: 'Family movie night',
            content: "We finally watched the new movie everyone's been talking about. Made popcorn from scratch, built a blanket fort in the living room. Lily fell asleep halfway through and Aiden pretended he didn't cry at the ending. Marcus and I stayed up talking after the kids went to bed — good conversation about our summer trip plans.",
            emoji: '🍿',
            authorId: 'member-2',
            mood: 4,
            isPrivate: false,
            tags: ['family time', 'movie night', 'traditions'],
            reactions: [
              { memberId: 'member-1', emoji: '😂' },
              { memberId: 'member-3', emoji: '❤️' },
              { memberId: 'member-4', emoji: '🍿' },
            ],
          },
          {
            id: 'j-3',
            date: daysAgo(5),
            title: 'Tough week, but we got through it',
            content: "Work has been really overwhelming this week. Marcus had to travel, so I was handling everything solo. The kids were incredible though — Aiden made dinner one night (pasta, not bad!), and Lily kept me company. Feeling grateful for this family even when things are hard.",
            emoji: '💪',
            authorId: 'member-1',
            mood: 3,
            isPrivate: false,
            tags: ['gratitude', 'hard times', 'family support'],
            reactions: [
              { memberId: 'member-2', emoji: '❤️' },
            ],
          },
          {
            id: 'j-4',
            date: daysAgo(8),
            title: "Lily's recital day",
            content: "Lily performed in her spring piano recital today. She was nervous all morning but walked on stage and played beautifully. Three months of practice paid off. She chose her own piece — Für Elise — and didn't miss a single note. So proud of her dedication.",
            emoji: '🎹',
            authorId: 'member-2',
            mood: 5,
            isPrivate: false,
            tags: ['Lily', 'piano', 'milestone', 'proud parent'],
            reactions: [
              { memberId: 'member-1', emoji: '🎉' },
              { memberId: 'member-3', emoji: '🎹' },
            ],
          },
          {
            id: 'j-5',
            date: daysAgo(12),
            title: 'Garden project complete',
            content: "Finally finished the raised garden bed we've been planning for months. The whole family helped — even Lily got her hands dirty planting tomatoes. We have herbs, strawberries, tomatoes and peppers. Looking forward to cooking with things we grew ourselves this summer.",
            emoji: '🌱',
            authorId: 'member-2',
            mood: 4,
            isPrivate: false,
            tags: ['garden', 'family project', 'outdoors', 'summer'],
            reactions: [
              { memberId: 'member-1', emoji: '🌿' },
              { memberId: 'member-3', emoji: '😍' },
              { memberId: 'member-4', emoji: '🍓' },
            ],
          },
          {
            id: 'j-6',
            date: daysAgo(20),
            title: 'Hawaii planning session',
            content: "Had our first family trip planning meeting! Made hot chocolate, spread maps on the table, each person picked their top activity. Aiden wants volcano hike, Lily wants sea turtles, I want the Road to Hana, Marcus picked snorkeling. So excited to make this happen in August.",
            emoji: '🌺',
            authorId: 'member-1',
            mood: 5,
            isPrivate: false,
            tags: ['Hawaii', 'travel', 'planning', 'family meeting'],
            reactions: [
              { memberId: 'member-2', emoji: '✈️' },
              { memberId: 'member-3', emoji: '🏄' },
              { memberId: 'member-4', emoji: '🐢' },
            ],
          },
        ];
        return { entries };
      }),
    }),
    { name: 'journal-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
