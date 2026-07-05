import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as pollsService from '../services/pollsService';

export interface PollOption {
  id: string;
  text: string;
  emoji: string;
  votes: string[];
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
  isLoaded: boolean;
  castVote: (pollId: string, optionId: string, memberId: string) => void;
  closePoll: (pollId: string) => void;
  addPoll: (poll: Omit<Poll, 'id' | 'createdAt'>) => Promise<void>;
  deletePoll: (pollId: string) => void;
  fetchFromServer: (familyId?: string) => Promise<void>;
}

export const usePollsStore = create<PollsState>()(
  persist(
    (set, get) => ({
      polls: [],
      isLoaded: false,
      castVote: (pollId, optionId, memberId) => {
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
        }));
        const poll = get().polls.find((p) => p.id === pollId);
        if (poll) pollsService.updatePollRemote(pollId, { options: poll.options }).catch(() => {});
      },
      closePoll: (pollId) => {
        set((s) => ({
          polls: s.polls.map((p) => (p.id === pollId ? { ...p, isActive: false } : p)),
        }));
        pollsService.updatePollRemote(pollId, { isActive: false }).catch(() => {});
      },
      addPoll: async (poll) => {
        const newPoll: Poll = { ...poll, id: `poll-${Date.now()}`, createdAt: new Date().toISOString() };
        set((s) => ({ polls: [newPoll, ...s.polls] }));
        try {
          await pollsService.createPoll(newPoll);
        } catch {
          set((s) => ({ polls: s.polls.filter((p) => p.id !== newPoll.id) }));
        }
      },
      deletePoll: (pollId) => {
        const prev = get().polls;
        set((s) => ({ polls: s.polls.filter((p) => p.id !== pollId) }));
        pollsService.deletePollRemote(pollId).catch(() => { set({ polls: prev }); });
      },
      fetchFromServer: async () => {
        try {
          const { polls } = await pollsService.fetchPolls();
          set({ polls, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },
    }),
    { name: 'polls-store', storage: createJSONStorage(() => mmkvStorage) }
  )
);
