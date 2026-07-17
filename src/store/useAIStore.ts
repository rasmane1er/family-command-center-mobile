import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { ChatMessage, AIInsight } from '../types';
import { API_BASE_URL } from '../config/api';
import { secureStorage } from '../storage/secureStorage';

const AI_UNAVAILABLE_MESSAGE = "I'm having trouble reaching the AI service right now. Please try again in a moment.";

interface AIState {
  messages: ChatMessage[];
  insights: AIInsight[];
  isTyping: boolean;
  apiKey: string;

  addMessage: (m: ChatMessage) => void;
  setTyping: (v: boolean) => void;
  clearMessages: () => void;
  addInsight: (i: AIInsight) => void;
  clearInsights: () => void;
  markInsightRead: (id: string) => void;
  setApiKey: (key: string) => void;
  sendMessage: (content: string, familyContext: string) => Promise<void>;
  seedDemoInsights: () => void;
}

import { generateId } from '../utils/generateId';

// Persisted messages grow on every turn with no natural cap — the
// slice(-10) inside sendMessage below is only the recency window sent to
// the model as prompt context, not a limit on what's stored. Capped here so
// the MMKV payload doesn't grow for the lifetime of the install.
const MAX_MESSAGES = 500;
const MAX_INSIGHTS = 200;

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
  messages: [],
  insights: [],
  isTyping: false,
  apiKey: '',

  addMessage: (m) => set((s) => ({ messages: [...s.messages, m].slice(-MAX_MESSAGES) })),
  setTyping: (v) => set({ isTyping: v }),
  clearMessages: () => set({ messages: [] }),
  addInsight: (i) => set((s) => ({ insights: [i, ...s.insights].slice(0, MAX_INSIGHTS) })),
  clearInsights: () => set({ insights: [] }),
  markInsightRead: (id) =>
    set((s) => ({ insights: s.insights.map((i) => (i.id === id ? { ...i, isRead: true } : i)) })),
  setApiKey: (key) => set({ apiKey: key }),

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
      const history = messages.slice(-10).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user' as 'user' | 'model',
        content: m.content,
      }));

      // /ai/chat requires auth — this call was missing the Authorization
      // header entirely, so every request 401'd and silently fell through
      // to a canned fallback response with fabricated numbers (e.g. "Family
      // Health Score: 78/100"), which is why this looked like it was
      // "working" (plausible fake answers) while actually never reaching
      // the real model. Auth is fixed now, but on any remaining failure
      // (backend hiccup, model outage) this must show an honest
      // unavailability message, not another fabricated answer that could
      // be mistaken for real personalized advice.
      const token = await secureStorage.getToken('access_token');
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
      });

      let assistantContent = '';
      let suggestions: string[] = [];
      let pendingAction: { type: string; payload: Record<string, unknown> } | undefined = undefined;

      if (response.ok) {
        const data = (await response.json()) as { reply: string; suggestions?: string[]; action?: { type: string; payload: Record<string, unknown> } };
        assistantContent = data.reply || AI_UNAVAILABLE_MESSAGE;
        suggestions = data.reply ? (data.suggestions ?? []) : [];
        if (data.action) {
          pendingAction = data.action;
        }
      } else {
        assistantContent = AI_UNAVAILABLE_MESSAGE;
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
        suggestions,
        ...(pendingAction ? { pendingAction } : {}),
      };

      set((s) => ({ messages: [...s.messages, assistantMessage].slice(-MAX_MESSAGES), isTyping: false }));
    } catch {
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

