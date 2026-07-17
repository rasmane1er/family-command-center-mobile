import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as giftService from '../services/giftService';

import { generateId } from '../utils/generateId';

export type GiftOccasion = 'birthday' | 'christmas' | 'anniversary' | 'graduation' | 'mothers_day' | 'fathers_day' | 'valentines' | 'other';
export type GiftStatus = 'idea' | 'purchased' | 'wrapped' | 'given';
export type GiftPriority = 'low' | 'medium' | 'high';

export interface GiftIdea {
  id: string;
  familyId: string;
  forMemberId: string;
  occasion: GiftOccasion;
  title: string;
  description?: string;
  estimatedPrice?: number;
  link?: string;
  priority: GiftPriority;
  status: GiftStatus;
  purchasedBy?: string;
  notes?: string;
  isSurprise: boolean;
  createdAt: string;
}

interface GiftState {
  gifts: GiftIdea[];
  isLoaded: boolean;
  isHydrating: boolean;
  addGift: (g: Omit<GiftIdea, 'id' | 'createdAt'>) => Promise<void>;
  updateGift: (id: string, updates: Partial<GiftIdea>) => Promise<void>;
  deleteGift: (id: string) => Promise<void>;
  updateStatus: (id: string, status: GiftStatus) => void;
  fetchFromServer: (familyId?: string) => Promise<void>;
  hydrateGifts: () => Promise<void>;
}

export const useGiftStore = create<GiftState>()(
  persist(
    (set, get) => ({
      gifts: [],
      isLoaded: false,
      isHydrating: false,

      addGift: async (g) => {
        const gift: GiftIdea = { ...g, id: generateId(), createdAt: new Date().toISOString() };
        set((s) => ({ gifts: [gift, ...s.gifts] }));
        try {
          await giftService.createGift(gift);
        } catch {
          set((s) => ({ gifts: s.gifts.filter((x) => x.id !== gift.id) }));
        }
      },

      updateGift: async (id, updates) => {
        const prev = get().gifts;
        set((s) => ({ gifts: s.gifts.map((g) => (g.id === id ? { ...g, ...updates } : g)) }));
        try {
          await giftService.updateGiftRemote(id, updates);
        } catch {
          set({ gifts: prev });
        }
      },

      deleteGift: async (id) => {
        const prev = get().gifts;
        set((s) => ({ gifts: s.gifts.filter((g) => g.id !== id) }));
        try {
          await giftService.deleteGiftRemote(id);
        } catch {
          set({ gifts: prev });
        }
      },

      updateStatus: (id, status) => {
        set((s) => ({ gifts: s.gifts.map((g) => (g.id === id ? { ...g, status } : g)) }));
        giftService.updateGiftRemote(id, { status }).catch(() => {});
      },

      fetchFromServer: async () => {
        set({ isHydrating: true });
        try {
          const { gifts } = await giftService.fetchGifts();
          set({ gifts, isLoaded: true });
        } catch {
        } finally {
          set({ isHydrating: false, isLoaded: true });
        }
      },

      hydrateGifts: async () => {
        set({ isHydrating: true });
        try {
          const { gifts } = await giftService.fetchGifts();
          set({ gifts, isLoaded: true });
        } catch {
        } finally {
          set({ isHydrating: false, isLoaded: true });
        }
      },
    }),
    {
      name: 'gift-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ gifts: state.gifts }),
    }
  )
);
