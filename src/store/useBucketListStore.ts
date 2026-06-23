import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type BucketCategory = 'travel' | 'experience' | 'achievement' | 'learn' | 'give' | 'adventure' | 'food' | 'other';

export interface BucketItem {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  category: BucketCategory;
  targetYear?: number;
  estimatedCost?: number;
  membersInterested: string[];
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  completedDate?: string;
  emoji: string;
  notes?: string;
  createdAt: string;
}

interface BucketListState {
  items: BucketItem[];
  addItem: (item: Omit<BucketItem, 'id' | 'createdAt'>) => void;
  updateItem: (id: string, updates: Partial<BucketItem>) => void;
  completeItem: (id: string) => void;
  deleteItem: (id: string) => void;
  seedDemoData: () => void;
}

export const useBucketListStore = create<BucketListState>((set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [{ ...item, id: generateId(), createdAt: new Date().toISOString() }, ...s.items] })),
  updateItem: (id, updates) => set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...updates } : i) })),
  completeItem: (id) => set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, isCompleted: true, completedDate: new Date().toISOString() } : i) })),
  deleteItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  seedDemoData: () => {
    const now = new Date().toISOString();
    const items: BucketItem[] = [
      { id: 'bl1', familyId: 'demo-family', title: 'See the Northern Lights in Iceland', description: 'Chase the aurora borealis as a family adventure', category: 'travel', targetYear: 2026, estimatedCost: 8000, membersInterested: ['member-1','member-2','member-3','member-4'], priority: 'high', isCompleted: false, emoji: '🌌', createdAt: now },
      { id: 'bl2', familyId: 'demo-family', title: 'Learn to surf together', description: 'Take a week-long surf camp in Costa Rica', category: 'adventure', targetYear: 2025, estimatedCost: 5000, membersInterested: ['member-1','member-2','member-3'], priority: 'medium', isCompleted: false, emoji: '🏄', createdAt: now },
      { id: 'bl3', familyId: 'demo-family', title: 'Visit all 50 US states', category: 'travel', estimatedCost: 15000, membersInterested: ['member-1','member-2','member-3','member-4'], priority: 'low', isCompleted: false, emoji: '🗺️', createdAt: now },
      { id: 'bl4', familyId: 'demo-family', title: 'Volunteer at a food bank together', category: 'give', targetYear: 2024, estimatedCost: 0, membersInterested: ['member-1','member-2','member-3','member-4'], priority: 'high', isCompleted: false, emoji: '🤝', createdAt: now },
      { id: 'bl5', familyId: 'demo-family', title: 'Run a 5K race together', category: 'achievement', targetYear: 2024, estimatedCost: 120, membersInterested: ['member-1','member-2','member-3'], priority: 'high', isCompleted: false, emoji: '🏃', createdAt: now },
      { id: 'bl6', familyId: 'demo-family', title: 'Cook a meal from every continent', category: 'food', estimatedCost: 300, membersInterested: ['member-1','member-2','member-3','member-4'], priority: 'medium', isCompleted: false, emoji: '🍳', createdAt: now },
      { id: 'bl7', familyId: 'demo-family', title: 'Visit Disneyland', category: 'experience', targetYear: 2024, estimatedCost: 3500, membersInterested: ['member-1','member-2','member-3','member-4'], priority: 'high', isCompleted: true, completedDate: new Date(Date.now() - 60 * 86400000).toISOString(), emoji: '🏰', createdAt: now },
      { id: 'bl8', familyId: 'demo-family', title: 'Learn a second language as a family', description: 'Take Spanish lessons together for one year', category: 'learn', targetYear: 2025, estimatedCost: 800, membersInterested: ['member-1','member-2','member-3','member-4'], priority: 'medium', isCompleted: false, emoji: '🌍', createdAt: now },
    ];
    set({ items });
  },
}));
