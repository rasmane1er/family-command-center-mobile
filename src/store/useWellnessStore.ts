import { create } from 'zustand';
import { ApiRequestError } from '../api/client';
import { QUOTA_EXCEEDED_MESSAGE } from '../services/aiService';
import {
  WeightEntry, MealSuggestions,
  fetchWeightEntries, logWeightEntry, setWeightGoal as setWeightGoalRemote, fetchMealSuggestions,
} from '../services/wellnessService';

interface WellnessState {
  entries: WeightEntry[];
  weightGoalLbs: number | null;
  isLoading: boolean;
  error: string | null;

  suggestions: MealSuggestions | null;
  isSuggesting: boolean;
  suggestionError: string | null;

  loadWeightData: (memberId: string) => Promise<void>;
  logWeight: (memberId: string, weightLbs: number) => Promise<void>;
  setGoal: (memberId: string, weightGoalLbs: number | null) => Promise<void>;
  generateMealSuggestions: (memberId: string) => Promise<void>;
  clearSuggestions: () => void;
}

function friendlyError(e: unknown, fallback: string): string {
  if (e instanceof ApiRequestError) {
    if (e.status === 403) return "This feature is for adults only and isn't available on this profile.";
    if (e.status === 429 && (e.body as { error?: string })?.error === 'ai_quota_exceeded') return QUOTA_EXCEEDED_MESSAGE;
  }
  return fallback;
}

export const useWellnessStore = create<WellnessState>()((set) => ({
  entries: [],
  weightGoalLbs: null,
  isLoading: false,
  error: null,

  suggestions: null,
  isSuggesting: false,
  suggestionError: null,

  loadWeightData: async (memberId) => {
    set({ isLoading: true, error: null });
    try {
      const { entries } = await fetchWeightEntries(memberId);
      set({ entries, weightGoalLbs: null, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: friendlyError(e, "Couldn't load your weight data. Check your connection and try again.") });
    }
  },

  logWeight: async (memberId, weightLbs) => {
    try {
      const { entry } = await logWeightEntry(memberId, weightLbs);
      set((s) => ({
        entries: [entry, ...s.entries.filter((e) => e.date !== entry.date)]
          .sort((a, b) => b.date.localeCompare(a.date)),
      }));
    } catch (e) {
      set({ error: friendlyError(e, "Couldn't save that weight entry. Check your connection and try again.") });
      throw e;
    }
  },

  setGoal: async (memberId, weightGoalLbs) => {
    try {
      const res = await setWeightGoalRemote(memberId, weightGoalLbs);
      set({ weightGoalLbs: res.weightGoalLbs });
    } catch (e) {
      set({ error: friendlyError(e, "Couldn't save your goal. Check your connection and try again.") });
      throw e;
    }
  },

  generateMealSuggestions: async (memberId) => {
    set({ isSuggesting: true, suggestionError: null });
    try {
      const { suggestions, alreadyLoggedAll } = await fetchMealSuggestions(memberId);
      set({
        suggestions,
        isSuggesting: false,
        suggestionError: alreadyLoggedAll
          ? "You've already logged all three meals today — nice work!"
          : suggestions ? null : 'No suggestions came back — try again in a moment.',
      });
    } catch (e) {
      set({ isSuggesting: false, suggestionError: friendlyError(e, "Couldn't reach the AI service. Please try again in a moment.") });
    }
  },

  clearSuggestions: () => set({ suggestions: null, suggestionError: null }),
}));
