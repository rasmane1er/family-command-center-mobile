import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { ChatMessage, AIInsight } from '../types';
import { apiRequest, ApiRequestError } from '../api/client';

const AI_UNAVAILABLE_MESSAGE = "I'm having trouble reaching the AI service right now. Please try again in a moment.";

interface AIState {
  messages: ChatMessage[];
  insights: AIInsight[];
  isTyping: boolean;
  apiKey: string;
  // Set when the backend's requireAiQuota middleware (src/middleware/subscription.ts
  // on the API) rejects a call with 429 ai_quota_exceeded — the client-side count
  // in AIAssistantScreen is only an approximation, so this is the source of truth.
  quotaExceeded: boolean;

  addMessage: (m: ChatMessage) => void;
  setTyping: (v: boolean) => void;
  clearMessages: () => void;
  addInsight: (i: AIInsight) => void;
  clearInsights: () => void;
  markInsightRead: (id: string) => void;
  setApiKey: (key: string) => void;
  sendMessage: (content: string, familyContext: string) => Promise<void>;
  // Reverses a change the assistant made (POST /ai/agent/actions/:id/undo).
  undoAction: (messageId: string, actionId: string) => Promise<boolean>;
  dismissQuotaExceeded: () => void;
  seedDemoInsights: () => void;
}

import { generateId } from '../utils/generateId';

// Persisted messages grow on every turn with no natural cap — the
// slice(-10) inside sendMessage below is only the recency window sent to
// the model as prompt context, not a limit on what's stored. Capped here so
// the MMKV payload doesn't grow for the lifetime of the install.
const MAX_MESSAGES = 500;
const MAX_INSIGHTS = 200;

type AgentAction = {
  id?: string;
  tool: string;
  summary: string;
  write: boolean;
  undoable?: boolean;
  proposal?: { type: string; payload: Record<string, unknown> };
};

type ChatHistory = { role: 'user' | 'model'; content: string }[];

// Re-pulls whatever the assistant just changed on the server, so a task,
// event or shopping item it created shows up without a manual refresh.
function refreshAfterAgentWrite(): void {
  try {
    const { useFamilyStore } = require('./useFamilyStore');
    const { useShoppingStore } = require('./useShoppingStore');
    useFamilyStore.getState().hydrateTasks?.();
    useFamilyStore.getState().hydrateEvents?.();
    useShoppingStore.getState().fetchFromServer?.();
  } catch {
    // best-effort — the next normal sync picks it up
  }
}

// The assistant can now act (calendar, shopping, tasks) and look things up,
// using the family's real data on the server — see /ai/agent on the API.
async function askAgent(content: string, history: ChatHistory): Promise<ChatMessage> {
  const data = await apiRequest<{ reply: string; actions?: AgentAction[] }>('/ai/agent', {
    method: 'POST',
    body: JSON.stringify({ message: content, history }),
  });
  const actions = data.actions ?? [];
  const proposal = actions.find((a) => a.proposal)?.proposal;
  const done = actions.filter((a) => a.write && a.id).map((a) => ({ id: a.id as string, summary: a.summary }));
  if (done.length > 0) refreshAfterAgentWrite();
  return {
    id: generateId(),
    role: 'assistant',
    content: data.reply || AI_UNAVAILABLE_MESSAGE,
    timestamp: new Date().toISOString(),
    suggestions: [],
    ...(proposal ? { pendingAction: proposal } : {}),
    ...(done.length > 0 ? { actions: done } : {}),
  };
}

// Previous advice-only endpoint — kept as a fallback if /ai/agent is
// unavailable (older server, outage), so chat never goes fully dark.
async function askLegacyChat(content: string, familyContext: string, history: ChatHistory): Promise<ChatMessage> {
  // Must go through apiRequest (not a raw fetch) — access tokens are
  // short-lived (15m, see api/src/utils/jwt.ts). apiRequest transparently
  // retries once with a refreshed token on a 401.
  const data = await apiRequest<{ reply: string; suggestions?: string[]; action?: { type: string; payload: Record<string, unknown> } }>(
    '/ai/chat',
    {
      method: 'POST',
      body: JSON.stringify({
        message: content,
        // On the first message history is empty and some backends choose a
        // shorter "intro" response. Embedding the completion directive in
        // context is the safest mobile-side nudge without touching the API.
        context: history.length === 0
          ? `${familyContext}\n\n[Assistant instruction: This is the start of the conversation. Always respond completely and thoroughly — never cut off mid-sentence or mid-thought. Include all relevant advice, steps, or details in a single response.]`
          : familyContext,
        history,
      }),
    },
  );
  return {
    id: generateId(),
    role: 'assistant',
    content: data.reply || AI_UNAVAILABLE_MESSAGE,
    timestamp: new Date().toISOString(),
    suggestions: data.reply ? (data.suggestions ?? []) : [],
    ...(data.action ? { pendingAction: data.action } : {}),
  };
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
  messages: [],
  insights: [],
  isTyping: false,
  apiKey: '',
  quotaExceeded: false,

  addMessage: (m) => set((s) => ({ messages: [...s.messages, m].slice(-MAX_MESSAGES) })),
  setTyping: (v) => set({ isTyping: v }),
  clearMessages: () => set({ messages: [] }),
  addInsight: (i) => set((s) => ({ insights: [i, ...s.insights].slice(0, MAX_INSIGHTS) })),
  clearInsights: () => set({ insights: [] }),
  markInsightRead: (id) =>
    set((s) => ({ insights: s.insights.map((i) => (i.id === id ? { ...i, isRead: true } : i)) })),
  setApiKey: (key) => set({ apiKey: key }),
  dismissQuotaExceeded: () => set({ quotaExceeded: false }),

  sendMessage: async (content: string, familyContext: string) => {
    const { messages } = get();
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMessage].slice(-MAX_MESSAGES), isTyping: true }));

    try {
      const history: ChatHistory = messages.slice(-10).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        content: m.content,
      }));

      let assistantMessage: ChatMessage;
      try {
        assistantMessage = await askAgent(content, history);
      } catch (agentErr) {
        // Quota / auth problems are real answers, not reasons to retry elsewhere.
        if (agentErr instanceof ApiRequestError && (agentErr.status === 429 || agentErr.status === 401 || agentErr.status === 400)) {
          throw agentErr;
        }
        assistantMessage = await askLegacyChat(content, familyContext, history);
      }

      set((s) => ({ messages: [...s.messages, assistantMessage].slice(-MAX_MESSAGES), isTyping: false }));
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 429) {
        const body = err.body as { error?: string } | undefined;
        if (body?.error === 'ai_quota_exceeded') {
          // Same upgrade prompt as the client-side aiQueryCount check in
          // AIAssistantScreen — this is the server-side rejection path (that
          // check is only an approximation of the real monthly counter).
          set({ isTyping: false, quotaExceeded: true });
          set((s) => ({ messages: s.messages.filter((m) => m.id !== userMessage.id) }));
          return;
        }
      }
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: AI_UNAVAILABLE_MESSAGE,
        timestamp: new Date().toISOString(),
        suggestions: [],
      };
      set((s) => ({ messages: [...s.messages, assistantMessage].slice(-MAX_MESSAGES), isTyping: false }));
    }
  },

  undoAction: async (messageId, actionId) => {
    try {
      await apiRequest(`/ai/agent/actions/${actionId}/undo`, { method: 'POST' });
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId ? { ...m, actions: m.actions?.filter((a) => a.id !== actionId) } : m,
        ),
      }));
      refreshAfterAgentWrite();
      return true;
    } catch {
      return false;
    }
  },

  seedDemoInsights: () => {
    const now = new Date().toISOString();
    const insights: AIInsight[] = [
      { id: generateId(), familyId: '', type: 'financial', title: '💡 Budget Alert', summary: "You've spent 78% of your Food budget this month. Consider meal prepping to stretch the remaining $421.75.", priority: 'medium', actionLabel: 'View Budget', actionRoute: 'Finance', isRead: false, createdAt: now },
      { id: generateId(), familyId: '', type: 'alert', title: '⚠️ Bill Due Soon', summary: 'Car Insurance ($185) is due in 5 days. Set up autopay to avoid late fees.', priority: 'high', actionLabel: 'Pay Now', actionRoute: 'Finance', isRead: false, createdAt: now },
      { id: generateId(), familyId: '', type: 'tip', title: '🎯 Goal Progress', summary: "You're 41% toward your Hawaii vacation fund! Keep it up — $4,750 more to go.", priority: 'low', actionLabel: 'View Goals', actionRoute: 'Operations', isRead: false, createdAt: now },
      { id: generateId(), familyId: '', type: 'health', title: '🏆 Family Health Score Up!', summary: "This week's task completion rate improved by 12%. The family is firing on all cylinders!", priority: 'low', actionLabel: 'View Score', actionRoute: 'Home', isRead: true, createdAt: now },
      { id: generateId(), familyId: '', type: 'task', title: '📋 3 Tasks Overdue', summary: "Aiden has 2 chores pending and the car oil change is 2 weeks overdue.", priority: 'high', actionLabel: 'View Tasks', actionRoute: 'Family', isRead: false, createdAt: now },
    ];
        set({ insights });
    },
  }),
  {
    name: 'family-command-center-ai',
    storage: createJSONStorage(() => mmkvStorage),
    partialize: (state) => ({
      messages: state.messages,
      insights: state.insights,
    }),
  }
 )
);

