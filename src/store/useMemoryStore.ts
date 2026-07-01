import { create } from 'zustand';
import type { FamilyMemory, MemoryType } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 11);

interface MemoryState {
  memories: FamilyMemory[];
  addMemory: (m: Omit<FamilyMemory, 'id' | 'createdAt' | 'lastAccessed'>) => void;
  pinMemory: (id: string) => void;
  deleteMemory: (id: string) => void;
  clearMemories: () => void;
  getMemoriesByMember: (memberId: string) => FamilyMemory[];
  getMemoriesByType: (type: MemoryType) => FamilyMemory[];
  seedDemoData: () => void;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],

  addMemory: (m) => {
    const now = new Date().toISOString();
    set((s) => ({
      memories: [{ ...m, id: generateId(), createdAt: now, lastAccessed: now }, ...s.memories],
    }));
  },

  pinMemory: (id) =>
    set((s) => ({
      memories: s.memories.map((m) => (m.id === id ? { ...m, isPinned: !m.isPinned } : m)),
    })),

  deleteMemory: (id) =>
    set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),

  clearMemories: () => set({ memories: [] }),

  getMemoriesByMember: (memberId) => get().memories.filter((m) => m.memberId === memberId),

  getMemoriesByType: (type) => get().memories.filter((m) => m.type === type),

  seedDemoData: () => {
    const now = new Date().toISOString();
    const memories: FamilyMemory[] = [
      { id: 'mem1', familyId: 'demo-family', memberId: 'member-1', type: 'preference', title: 'Marcus loves jazz', content: 'Plays Miles Davis every Sunday morning while making pancakes. Pre-war jazz especially.', tags: ['music', 'morning', 'Marcus'], isPinned: true, sentiment: 'positive', createdAt: now, lastAccessed: now },
      { id: 'mem2', familyId: 'demo-family', memberId: 'member-2', type: 'habit', title: "Sarah's yoga routine", content: 'Yoga every Tuesday and Thursday 6am before kids wake up. Prefers Hatha style.', tags: ['fitness', 'routine', 'Sarah'], isPinned: false, sentiment: 'positive', createdAt: now, lastAccessed: now },
      { id: 'mem3', familyId: 'demo-family', memberId: 'member-3', type: 'milestone', title: "Aiden's first A in Math!", content: 'Aiden got an A on his geometry test after 3 weeks of extra study. Celebrated with ice cream.', tags: ['school', 'milestone', 'Aiden'], isPinned: true, sentiment: 'positive', createdAt: now, lastAccessed: now },
      { id: 'mem4', familyId: 'demo-family', memberId: 'member-4', type: 'preference', title: 'Lily is afraid of thunderstorms', content: 'Needs extra comfort during storms — warm blanket, hot cocoa, and staying near a parent.', tags: ['Lily', 'comfort', 'weather'], isPinned: false, sentiment: 'neutral', createdAt: now, lastAccessed: now },
      { id: 'mem5', familyId: 'demo-family', type: 'insight', title: 'Family spends most on weekends', content: 'AI detected 67% of discretionary spending happens Friday–Sunday. Restaurants and entertainment.', tags: ['finance', 'insight', 'spending'], isPinned: true, sentiment: 'neutral', createdAt: now, lastAccessed: now },
      { id: 'mem6', familyId: 'demo-family', type: 'habit', title: 'Sunday Family Dinners', content: 'Every Sunday at 6pm. No phones. Marcus cooks, Sarah picks the dessert, kids set the table.', tags: ['tradition', 'family', 'dinner'], isPinned: true, sentiment: 'positive', createdAt: now, lastAccessed: now },
      { id: 'mem7', familyId: 'demo-family', memberId: 'member-3', type: 'conflict', title: 'Aiden vs screen time limits', content: 'Ongoing tension about 2-hour screen time rule. Compromise reached: extra 30min for completed chores.', tags: ['conflict', 'rules', 'Aiden'], isPinned: false, sentiment: 'negative', createdAt: now, lastAccessed: now },
      { id: 'mem8', familyId: 'demo-family', type: 'milestone', title: 'Saved $1,000 toward Hawaii!', content: 'First major savings milestone for the family vacation fund. Kids celebrated with a dance party.', tags: ['savings', 'vacation', 'milestone'], isPinned: true, sentiment: 'positive', createdAt: now, lastAccessed: now },
    ];
    set({ memories });
  },
}));
