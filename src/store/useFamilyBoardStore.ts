import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as boardService from '../services/boardService';

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
  isLoaded: boolean;
  isHydrating: boolean;
  addPost: (p: Omit<BoardPost, 'id' | 'createdAt' | 'reactions'>) => Promise<void>;
  togglePin: (id: string) => void;
  addReaction: (postId: string, memberId: string, emoji: string) => void;
  deletePost: (id: string) => Promise<void>;
  getActivePosts: () => BoardPost[];
  fetchFromServer: (familyId?: string) => Promise<void>;
  hydratePosts: () => Promise<void>;
}

export const useFamilyBoardStore = create<FamilyBoardState>()(
  persist(
    (set, get) => ({
      posts: [],
      isLoaded: false,
      isHydrating: false,

      addPost: async (p) => {
        const post: BoardPost = { ...p, id: generateId(), createdAt: new Date().toISOString(), reactions: [] };
        set((s) => ({ posts: [post, ...s.posts] }));
        try {
          await boardService.createPost(post);
        } catch {
          set((s) => ({ posts: s.posts.filter((x) => x.id !== post.id) }));
        }
      },

      togglePin: (id) => {
        set((s) => ({
          posts: s.posts.map((p) => (p.id === id ? { ...p, isPinned: !p.isPinned } : p)),
        }));
        const post = get().posts.find((p) => p.id === id);
        if (post) boardService.updatePost(id, { isPinned: post.isPinned }).catch(() => {});
      },

      addReaction: (postId, memberId, emoji) => {
        set((s) => ({
          posts: s.posts.map((p) => {
            if (p.id !== postId) return p;
            const filtered = p.reactions.filter((r) => r.memberId !== memberId || r.emoji !== emoji);
            if (filtered.length === p.reactions.length) {
              const withoutMember = p.reactions.filter((r) => r.memberId !== memberId);
              return { ...p, reactions: [...withoutMember, { memberId, emoji }] };
            }
            return { ...p, reactions: filtered };
          }),
        }));
        const post = get().posts.find((p) => p.id === postId);
        if (post) boardService.updatePost(postId, { reactions: post.reactions }).catch(() => {});
      },

      deletePost: async (id) => {
        const prev = get().posts;
        set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }));
        try {
          await boardService.deletePost(id);
        } catch {
          set({ posts: prev });
        }
      },

      getActivePosts: () => {
        const { posts } = get();
        const now = new Date().toISOString();
        return posts.filter((p) => !p.expiresAt || p.expiresAt > now);
      },

      fetchFromServer: async () => {
        set({ isHydrating: true });
        try {
          const { posts } = await boardService.fetchPosts();
          set({ posts, isLoaded: true });
        } catch {
        } finally {
          set({ isHydrating: false, isLoaded: true });
        }
      },

      hydratePosts: async () => {
        set({ isHydrating: true });
        try {
          const { posts } = await boardService.fetchPosts();
          set({ posts, isLoaded: true });
        } catch {
        } finally {
          set({ isHydrating: false, isLoaded: true });
        }
      },
    }),
    {
      name: 'family-command-center-board',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ posts: state.posts }),
    }
  )
);

export type { BoardPost, PostPriority, PostCategory };
