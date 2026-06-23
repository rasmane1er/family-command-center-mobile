import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

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
  addGift: (g: Omit<GiftIdea, 'id' | 'createdAt'>) => void;
  updateGift: (id: string, updates: Partial<GiftIdea>) => void;
  deleteGift: (id: string) => void;
  updateStatus: (id: string, status: GiftStatus) => void;
  seedDemoData: () => void;
}

export const useGiftStore = create<GiftState>((set) => ({
  gifts: [],
  addGift: (g) => set((s) => ({ gifts: [{ ...g, id: generateId(), createdAt: new Date().toISOString() }, ...s.gifts] })),
  updateGift: (id, updates) => set((s) => ({ gifts: s.gifts.map((g) => g.id === id ? { ...g, ...updates } : g) })),
  deleteGift: (id) => set((s) => ({ gifts: s.gifts.filter((g) => g.id !== id) })),
  updateStatus: (id, status) => set((s) => ({ gifts: s.gifts.map((g) => g.id === id ? { ...g, status } : g) })),
  seedDemoData: () => {
    const now = new Date().toISOString();
    const gifts: GiftIdea[] = [
      { id: 'g1', familyId: 'demo-family', forMemberId: 'member-2', occasion: 'birthday', title: 'Instant Pot Duo 7-in-1', description: 'She mentioned wanting one for meal prep', estimatedPrice: 89, priority: 'high', status: 'purchased', purchasedBy: 'member-1', isSurprise: true, createdAt: now },
      { id: 'g2', familyId: 'demo-family', forMemberId: 'member-2', occasion: 'birthday', title: 'Yoga mat & blocks set', estimatedPrice: 55, priority: 'medium', status: 'idea', isSurprise: true, createdAt: now },
      { id: 'g3', familyId: 'demo-family', forMemberId: 'member-3', occasion: 'christmas', title: 'PlayStation gift card $50', estimatedPrice: 50, priority: 'high', status: 'idea', isSurprise: false, createdAt: now },
      { id: 'g4', familyId: 'demo-family', forMemberId: 'member-3', occasion: 'christmas', title: 'Minecraft Lego set', estimatedPrice: 79, priority: 'medium', status: 'purchased', purchasedBy: 'member-2', isSurprise: true, createdAt: now },
      { id: 'g5', familyId: 'demo-family', forMemberId: 'member-4', occasion: 'birthday', title: 'American Girl Doll', estimatedPrice: 120, priority: 'high', status: 'purchased', purchasedBy: 'member-1', isSurprise: true, createdAt: now },
      { id: 'g6', familyId: 'demo-family', forMemberId: 'member-1', occasion: 'fathers_day', title: 'Yeti tumbler', estimatedPrice: 45, priority: 'medium', status: 'given', isSurprise: false, createdAt: now },
    ];
    set({ gifts });
  },
}));
