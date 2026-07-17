import { create } from 'zustand';
import { apiRequest } from '../api/client';
import { useAuthStore } from './useAuthStore';
import {
  chatSocketService,
  type ChatMessage,
  type ChatThread,
  type ConnectionStatus,
} from '../services/chatSocketService';

export type { ChatMessage, ChatThread, ConnectionStatus };

interface ChatState {
  threads: ChatThread[];
  activeThreadId: string | null;
  messages: Record<string, ChatMessage[]>;
  connectionStatus: ConnectionStatus;
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  error: string | null;
  listenersWired: boolean;

  wireSocketListeners: () => void;
  connectSocket: () => Promise<void>;
  disconnectSocket: () => void;
  loadThreads: () => Promise<void>;
  openThread: (threadId: string) => Promise<void>;
  createThread: (params: { subject?: string; category?: string; body: string }) => Promise<string | null>;
  sendMessage: (threadId: string, body: string) => Promise<{ success: boolean; error?: string }>;
  setActiveThread: (threadId: string | null) => void;
  clearError: () => void;
}

// Not persisted (no `persist` middleware here), so this doesn't grow MMKV
// storage — but a support thread left open for a very long session would
// otherwise accumulate messages in memory without bound. Caps to the most
// recent N per thread instead.
const MAX_MESSAGES_PER_THREAD = 1000;

function upsertThread(threads: ChatThread[], thread: ChatThread): ChatThread[] {
  const others = threads.filter((t) => t.id !== thread.id);
  return [thread, ...others].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  messages: {},
  connectionStatus: 'disconnected',
  isLoadingThreads: false,
  isLoadingMessages: false,
  isSending: false,
  error: null,
  listenersWired: false,

  wireSocketListeners: () => {
    if (get().listenersWired) return;
    set({ listenersWired: true });

    chatSocketService.onConnectionStatus((status) => set({ connectionStatus: status }));

    chatSocketService.onMessage((message) => {
      set((s) => {
        const existing = s.messages[message.threadId] ?? [];
        if (existing.some((m) => m.id === message.id)) return s;
        return {
          messages: {
            ...s.messages,
            [message.threadId]: [...existing, message].slice(-MAX_MESSAGES_PER_THREAD),
          },
          threads: s.threads.some((t) => t.id === message.threadId)
            ? s.threads
                .map((t) => (t.id === message.threadId ? { ...t, lastMessageAt: message.createdAt } : t))
                .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
            : s.threads,
        };
      });
    });

    chatSocketService.onThreadStatus(({ threadId, status }) => {
      set((s) => ({
        threads: s.threads.map((t) => (t.id === threadId ? { ...t, status } : t)),
      }));
    });
  },

  connectSocket: async () => {
    const familyId = useAuthStore.getState().familyId;
    if (!familyId) return;
    get().wireSocketListeners();
    await chatSocketService.connect();
  },

  disconnectSocket: () => {
    chatSocketService.disconnect();
  },

  loadThreads: async () => {
    const familyId = useAuthStore.getState().familyId;
    if (!familyId) {
      set({ error: 'not_linked' });
      return;
    }

    set({ isLoadingThreads: true, error: null });
    try {
      const res = await apiRequest<{ threads: ChatThread[] }>('/chat/threads/mine');
      set({ threads: res.threads, isLoadingThreads: false });
    } catch {
      set({ isLoadingThreads: false, error: 'load_threads_failed' });
    }
  },

  openThread: async (threadId) => {
    set({ activeThreadId: threadId, isLoadingMessages: true, error: null });
    try {
      const res = await apiRequest<{ thread: ChatThread; messages: ChatMessage[] }>(
        `/chat/threads/${threadId}/messages`,
      );
      set((s) => ({
        threads: upsertThread(s.threads, res.thread),
        messages: { ...s.messages, [threadId]: res.messages },
        isLoadingMessages: false,
      }));

      await get().connectSocket();
      if (chatSocketService.isConnected()) {
        await chatSocketService.joinThread(threadId);
      }
    } catch {
      set({ isLoadingMessages: false, error: 'load_messages_failed' });
    }
  },

  createThread: async ({ subject, category, body }) => {
    const familyId = useAuthStore.getState().familyId;
    if (!familyId) {
      set({ error: 'not_linked' });
      return null;
    }

    set({ isSending: true, error: null });
    try {
      const res = await apiRequest<{ thread: ChatThread & { messages: ChatMessage[] } }>('/chat/threads', {
        method: 'POST',
        body: JSON.stringify({ subject, category, body }),
      });
      const { messages: threadMessages, ...thread } = res.thread;

      set((s) => ({
        threads: upsertThread(s.threads, thread),
        messages: { ...s.messages, [thread.id]: threadMessages },
        activeThreadId: thread.id,
        isSending: false,
      }));

      await get().connectSocket();
      if (chatSocketService.isConnected()) {
        await chatSocketService.joinThread(thread.id);
      }

      return thread.id;
    } catch {
      set({ isSending: false, error: 'create_thread_failed' });
      return null;
    }
  },

  sendMessage: async (threadId, body) => {
    const trimmed = body.trim();
    if (!trimmed) return { success: false, error: 'empty' };

    set({ isSending: true, error: null });

    // Prefer the socket — the server broadcasts the message back to everyone
    // in the room (including us), so we intentionally do NOT append it here
    // to avoid dedup bugs. The REST fallback below has no such broadcast, so
    // it appends the returned message manually.
    if (chatSocketService.isConnected()) {
      const ack = await chatSocketService.sendMessage(threadId, trimmed);
      set({ isSending: false });
      if (ack.ok) return { success: true };
    }

    try {
      const res = await apiRequest<{ message: ChatMessage }>(`/chat/threads/${threadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: trimmed }),
      });
      set((s) => {
        const existing = s.messages[threadId] ?? [];
        if (existing.some((m) => m.id === res.message.id)) return { isSending: false };
        return {
          isSending: false,
          messages: {
            ...s.messages,
            [threadId]: [...existing, res.message].slice(-MAX_MESSAGES_PER_THREAD),
          },
          threads: s.threads
            .map((t) => (t.id === threadId ? { ...t, lastMessageAt: res.message.createdAt } : t))
            .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
        };
      });
      return { success: true };
    } catch {
      set({ isSending: false, error: 'send_failed' });
      return { success: false, error: 'send_failed' };
    }
  },

  setActiveThread: (threadId) => set({ activeThreadId: threadId }),
  clearError: () => set({ error: null }),
}));
