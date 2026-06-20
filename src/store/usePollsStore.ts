import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PollOption {
  id: string;
  text: string;
  emoji: string;
  votes: string[]; // member ids
}

export interface Poll {
  id: string;
  question: string;
  emoji: string;
  options: PollOption[];
  createdBy: string;
  createdAt: string;
  isAnonymous: boolean;
  isActive: boolean;
  category: 'food' | 'activity' | 'decision' | 'fun' | 'other';
}

interface PollsState {
  polls: Poll[];
  castVote: (pollId: string, optionId: string, memberId: string) => void;
  closePoll: (pollId: string) => void;
  addPoll: (poll: Omit<Poll, 'id' | 'createdAt'>) => void;
  deletePoll: (pollId: string) => void;
  seedDemoData: () => void;
}

const DEMO_POLLS: Omit<Poll, 'id'>[] = [
  {
    question: "What's for dinner tonight?",
    emoji: '🍽️',
    options: [
      { id: 'o1', text: 'Taco Night', emoji: '🌮', votes: ['member-1', 'member-3'] },
      { id: 'o2', text: 'Pizza', emoji: '🍕', votes: ['member-4'] },
      { id: 'o3', text: 'Spaghetti', emoji: '🍝', votes: ['member-2'] },
      { id: 'o4', text: 'Grilled Chicken', emoji: '🍗', votes: [] },
    ],
    createdBy: 'member-2',
    createdAt: new Date().toISOString(),
    isAnonymous: false,
    isActive: true,
    category: 'food',
  },
  {
    question: "Where should we go for our summer vacation?",
    emoji: '🏖️',
    options: [
      { id: 'o5', text: 'Beach (Florida)', emoji: '🌊', votes: ['member-2', 'member-4'] },
      { id: 'o6', text: 'Mountains (Colorado)', emoji: '⛰️', votes: ['member-1', 'member-3'] },
      { id: 'o7', text: 'Theme Park', emoji: '🎢', votes: ['member-3'] },
      { id: 'o8', text: 'Camping Road Trip', emoji: '🏕️', votes: [] },
    ],
    createdBy: 'member-1',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    isAnonymous: false,
    isActive: true,
    category: 'activity',
  },
  {
    question: "What movie for Family Movie Night?",
    emoji: '🎬',
    options: [
      { id: 'o9', text: 'Action Adventure', emoji: '🎯', votes: ['member-1', 'member-3'] },
      { id: 'o10', text: 'Animated / Kids', emoji: '🎠', votes: ['member-4'] },
      { id: 'o11', text: 'Comedy', emoji: '😂', votes: ['member-2'] },
    ],
    createdBy: 'member-1',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    isAnonymous: false,
    isActive: false,
    category: 'fun',
  },
  {
    question: "Should we get a dog?",
    emoji: '🐕',
    options: [
      { id: 'o12', text: 'Yes! Let\'s do it!', emoji: '🐾', votes: ['member-3', 'member-4'] },
      { id: 'o13', text: 'Not yet, but maybe', emoji: '🤔', votes: ['member-2'] },
      { id: 'o14', text: 'No', emoji: '🚫', votes: ['member-1'] },
    ],
    createdBy: 'member-3',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    isAnonymous: false,
    isActive: false,
    category: 'decision',
  },
];

export const usePollsStore = create<PollsState>()(
  persist(
    (set) => ({
      polls: [],
      castVote: (pollId, optionId, memberId) =>
        set((s) => ({
          polls: s.polls.map((poll) => {
            if (poll.id !== pollId) return poll;
            return {
              ...poll,
              options: poll.options.map((opt) => {
                const alreadyVoted = poll.options.some((o) => o.votes.includes(memberId));
                if (alreadyVoted) {
                  return { ...opt, votes: opt.votes.filter((v) => v !== memberId) };
                }
                return opt.id === optionId
                  ? { ...opt, votes: [...opt.votes, memberId] }
                  : opt;
              }),
            };
          }),
        })),
      closePoll: (pollId) =>
        set((s) => ({
          polls: s.polls.map((p) => (p.id === pollId ? { ...p, isActive: false } : p)),
        })),
      addPoll: (poll) =>
        set((s) => ({
          polls: [
            { ...poll, id: `poll-${Date.now()}`, createdAt: new Date().toISOString() },
            ...s.polls,
          ],
        })),
      deletePoll: (pollId) =>
        set((s) => ({ polls: s.polls.filter((p) => p.id !== pollId) })),
      seedDemoData: () =>
        set({
          polls: DEMO_POLLS.map((p, i) => ({ ...p, id: `poll-seed-${i}` })),
        }),
    }),
    { name: 'polls-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
