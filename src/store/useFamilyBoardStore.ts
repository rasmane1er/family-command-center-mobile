import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

type PostPriority = 'low' | 'normal' | 'high' | 'urgent';
type PostCategory = 'announcement' | 'reminder' | 'rule' | 'celebration' | 'info' | 'question';

interface BoardPost {
  id: string;
  familyId: string;
  authorId: string;
  category: PostCategory;
  priority: PostPriority;
  title: string;
  content: string;
  isPinned: boolean;
  expiresAt?: string;
  reactions: { memberId: string; emoji: string }[];
  createdAt: string;
}

interface FamilyBoardState {
  posts: BoardPost[];
  addPost: (p: Omit<BoardPost, 'id' | 'createdAt' | 'reactions'>) => void;
  togglePin: (id: string) => void;
  addReaction: (postId: string, memberId: string, emoji: string) => void;
  deletePost: (id: string) => void;
  getActivePosts: () => BoardPost[];
  seedDemoData: () => void;
}

export const useFamilyBoardStore = create<FamilyBoardState>((set, get) => ({
  posts: [],

  addPost: (p) =>
    set((s) => ({
      posts: [
        { ...p, id: generateId(), createdAt: new Date().toISOString(), reactions: [] },
        ...s.posts,
      ],
    })),

  togglePin: (id) =>
    set((s) => ({
      posts: s.posts.map((p) => (p.id === id ? { ...p, isPinned: !p.isPinned } : p)),
    })),

  addReaction: (postId, memberId, emoji) =>
    set((s) => ({
      posts: s.posts.map((p) => {
        if (p.id !== postId) return p;
        // Remove existing reaction from this member, then add new one
        const filtered = p.reactions.filter((r) => r.memberId !== memberId || r.emoji !== emoji);
        if (filtered.length === p.reactions.length) {
          // No existing same reaction — remove any other reaction from member, add new
          const withoutMember = p.reactions.filter((r) => r.memberId !== memberId);
          return { ...p, reactions: [...withoutMember, { memberId, emoji }] };
        }
        // Same reaction existed — toggle off
        return { ...p, reactions: filtered };
      }),
    })),

  deletePost: (id) =>
    set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),

  getActivePosts: () => {
    const { posts } = get();
    const now = new Date().toISOString();
    return posts.filter((p) => !p.expiresAt || p.expiresAt > now);
  },

  seedDemoData: () => {
    const familyId = 'demo-family';
    const now = new Date();
    const posts: BoardPost[] = [
      {
        id: generateId(),
        familyId,
        authorId: 'member-1',
        category: 'announcement',
        priority: 'urgent',
        title: 'Car Pool Change This Week',
        content: 'Dad picking up kids Tuesday instead of Mom. Sarah has a work meeting that runs late. Marcus will be at Lincoln Elementary at 3:20pm. Make sure kids know!',
        isPinned: true,
        reactions: [
          { memberId: 'member-2', emoji: '👍' },
          { memberId: 'member-3', emoji: '👍' },
        ],
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: generateId(),
        familyId,
        authorId: 'member-2',
        category: 'celebration',
        priority: 'normal',
        title: 'Family Movie Night Friday 7pm',
        content: 'Vote on movie in polls! I am thinking we do popcorn bar this time with different toppings. Kids can pick their snacks. Let\'s make it a cozy night in!',
        isPinned: false,
        reactions: [
          { memberId: 'member-1', emoji: '❤️' },
          { memberId: 'member-3', emoji: '🎉' },
          { memberId: 'member-4', emoji: '🎉' },
        ],
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: generateId(),
        familyId,
        authorId: 'member-2',
        category: 'reminder',
        priority: 'high',
        title: "Aiden's Dentist Appt Thursday 3pm",
        content: 'Someone needs to pick up Aiden from Lincoln Elementary early on Thursday — dentist appointment is at 3pm at Dr. Miller\'s office. He needs to leave school by 2:45pm.',
        isPinned: false,
        reactions: [
          { memberId: 'member-1', emoji: '👍' },
        ],
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: generateId(),
        familyId,
        authorId: 'member-1',
        category: 'info',
        priority: 'normal',
        title: 'WiFi Password Changed',
        content: 'New WiFi password: FamilyHome2024#\nNetwork name stays the same (Johnson Home 5G). Updated all our devices already. Let me know if you have trouble connecting.',
        isPinned: false,
        reactions: [
          { memberId: 'member-2', emoji: '👍' },
          { memberId: 'member-3', emoji: '👍' },
        ],
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: generateId(),
        familyId,
        authorId: 'member-2',
        category: 'rule',
        priority: 'normal',
        title: 'New House Rule: No Phones at Dinner',
        content: 'Starting Monday we are implementing a no-phones-at-dinner policy. This includes parents too! Phones go in the basket by the door when we sit down. Dinner is family time. 30 min, undivided attention.',
        isPinned: false,
        reactions: [
          { memberId: 'member-1', emoji: '👍' },
          { memberId: 'member-4', emoji: '😮' },
        ],
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: generateId(),
        familyId,
        authorId: 'member-1',
        category: 'celebration',
        priority: 'normal',
        title: 'Congrats Lily! 🎉 Honor Roll!',
        content: 'So proud of our Lily for making the Honor Roll this semester! All A\'s and B\'s with a 3.8 GPA. We are taking her to her favorite restaurant this weekend to celebrate. Way to go sweetheart! 🌟',
        isPinned: true,
        reactions: [
          { memberId: 'member-2', emoji: '❤️' },
          { memberId: 'member-3', emoji: '🎉' },
          { memberId: 'member-4', emoji: '😂' },
        ],
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    set({ posts });
  },
}));

export type { BoardPost, PostPriority, PostCategory };
