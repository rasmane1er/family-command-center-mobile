import { create } from 'zustand';
import type { LegacyItem, LegacyItemType } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 11);

interface LegacyState {
  items: LegacyItem[];
  addItem: (i: Omit<LegacyItem, 'id' | 'createdAt' | 'reactions'>) => void;
  toggleFeatured: (id: string) => void;
  addReaction: (id: string, memberId: string, emoji: string) => void;
  deleteItem: (id: string) => void;
  getItemsByType: (type: LegacyItemType) => LegacyItem[];
  seedDemoData: () => void;
}

export const useLegacyStore = create<LegacyState>((set, get) => ({
  items: [],

  addItem: (i) => {
    const now = new Date().toISOString();
    set((s) => ({
      items: [{ ...i, id: generateId(), createdAt: now, reactions: [] }, ...s.items],
    }));
  },

  toggleFeatured: (id) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, isFeatured: !i.isFeatured } : i)),
    })),

  addReaction: (id, memberId, emoji) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id
          ? { ...i, reactions: [...i.reactions.filter((r) => r.memberId !== memberId), { memberId, emoji }] }
          : i
      ),
    })),

  deleteItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  getItemsByType: (type) => get().items.filter((i) => i.type === type),

  seedDemoData: () => {
    const now = new Date().toISOString();
    const items: LegacyItem[] = [
      { id: 'leg1', familyId: 'demo-family', memberId: 'member-1', type: 'story', title: "Grandpa's Immigration Story", content: "Marcus's grandfather came to America in 1962 with $47 and a suitcase. He built a successful bakery from nothing over 30 years. A story of grit, community, and never giving up.", date: '1962-03-15', tags: ['history', 'inspiration', 'family roots'], isPrivate: false, isFeatured: true, reactions: [{ memberId: 'member-2', emoji: '❤️' }, { memberId: 'member-3', emoji: '🌟' }], createdAt: now },
      { id: 'leg2', familyId: 'demo-family', memberId: 'member-2', type: 'tradition', title: 'Christmas Eve Tamale Night', content: "Sarah's family has made tamales every Christmas Eve since 1985. The whole family gathers in the kitchen — kids help spread masa, elders tell stories. Takes 6 hours and feeds 30 people.", date: '2024-12-24', tags: ['tradition', 'Christmas', 'food', 'family'], isPrivate: false, isFeatured: true, reactions: [{ memberId: 'member-1', emoji: '🫔' }, { memberId: 'member-3', emoji: '❤️' }, { memberId: 'member-4', emoji: '😍' }], createdAt: now },
      { id: 'leg3', familyId: 'demo-family', memberId: 'member-3', type: 'milestone', title: "Aiden's First Basketball Game", content: "October 14, 2023 — Aiden scored his first basket in the 4th quarter. The whole family went wild. He wore #12 just like his dad. The team won 34-28.", date: '2023-10-14', tags: ['sports', 'Aiden', 'milestone', 'basketball'], isPrivate: false, isFeatured: false, reactions: [{ memberId: 'member-1', emoji: '🏀' }, { memberId: 'member-2', emoji: '🎉' }], createdAt: now },
      { id: 'leg4', familyId: 'demo-family', memberId: 'member-1', type: 'letter', title: 'Letter to Future Aiden (Age 18)', content: "My son, by the time you read this you'll be heading off to your next adventure. I want you to know that every sacrifice your mother and I made was worth it. You have the heart of a champion. Lead with kindness and curiosity — those are the real superpowers. Love always, Dad.", date: '2024-01-01', tags: ['letter', 'Aiden', 'future', 'Marcus'], isPrivate: false, isFeatured: true, reactions: [{ memberId: 'member-2', emoji: '😭' }], createdAt: now },
      { id: 'leg5', familyId: 'demo-family', memberId: 'member-2', type: 'recipe', title: "Grandma Rosa's Arroz con Leche", content: "2 cups rice, 4 cups whole milk, 1 cup sugar, 2 cinnamon sticks, 1 tsp vanilla. Cook on low 45 min stirring constantly. The secret: add a pinch of salt. Serves 8. Four generations have made this recipe.", date: '1985-01-01', tags: ['recipe', 'tradition', 'dessert', 'family'], isPrivate: false, isFeatured: false, reactions: [{ memberId: 'member-3', emoji: '😋' }, { memberId: 'member-4', emoji: '❤️' }], createdAt: now },
      { id: 'leg6', familyId: 'demo-family', memberId: 'member-4', type: 'milestone', title: "Lily Learns to Read", content: "April 3, 2024 — Lily read her first full book cover to cover! 'The Very Hungry Caterpillar' — she sounded out every word. We cried. She was so proud.", date: '2024-04-03', tags: ['Lily', 'milestone', 'school', 'proud'], isPrivate: false, isFeatured: false, reactions: [{ memberId: 'member-1', emoji: '📚' }, { memberId: 'member-2', emoji: '🥰' }], createdAt: now },
    ];
    set({ items });
  },
}));
