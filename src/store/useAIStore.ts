import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { ChatMessage, AIInsight } from '../types';

interface AIState {
  messages: ChatMessage[];
  insights: AIInsight[];
  isTyping: boolean;
  apiKey: string;

  addMessage: (m: ChatMessage) => void;
  setTyping: (v: boolean) => void;
  clearMessages: () => void;
  addInsight: (i: AIInsight) => void;
  markInsightRead: (id: string) => void;
  setApiKey: (key: string) => void;
  sendMessage: (content: string, familyContext: string) => Promise<void>;
  seedDemoInsights: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
  messages: [],
  insights: [],
  isTyping: false,
  apiKey: '',

  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setTyping: (v) => set({ isTyping: v }),
  clearMessages: () => set({ messages: [] }),
  addInsight: (i) => set((s) => ({ insights: [i, ...s.insights] })),
  markInsightRead: (id) =>
    set((s) => ({ insights: s.insights.map((i) => (i.id === id ? { ...i, isRead: true } : i)) })),
  setApiKey: (key) => set({ apiKey: key }),

  sendMessage: async (content: string, familyContext: string) => {
    const { messages, apiKey } = get();
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMessage], isTyping: true }));

    try {
      const systemPrompt = `You are the Family Command Center AI — an intelligent, warm, and proactive household chief of staff.
You help families manage their finances, schedules, tasks, health, and home operations.
You speak in a supportive, organized, and occasionally encouraging tone.
Keep responses concise and actionable. Use emoji sparingly for visual clarity.

Current family context:
${familyContext}

You can help with:
- Financial planning and budget analysis
- Task management and scheduling
- Meal planning and pantry management
- Health and wellness suggestions
- Goal tracking and milestone celebrations
- Home operations and vehicle maintenance
- Emergency preparedness
- Kid reward system management
- Military family support

Always provide specific, personalized advice based on the family context provided.`;

      const allMessages = [
        ...messages.slice(-10),
        userMessage,
      ].map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || 'demo-key',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages: allMessages,
        }),
      });

      let assistantContent = '';

      if (!response.ok || !apiKey) {
        assistantContent = getDemoResponse(content);
      } else {
        const data = await response.json();
        assistantContent = data.content?.[0]?.text || getDemoResponse(content);
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
        suggestions: getContextSuggestions(content),
      };

      set((s) => ({ messages: [...s.messages, assistantMessage], isTyping: false }));
    } catch {
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: getDemoResponse(content),
        timestamp: new Date().toISOString(),
        suggestions: getContextSuggestions(content),
      };
      set((s) => ({ messages: [...s.messages, assistantMessage], isTyping: false }));
    }
  },

  seedDemoInsights: () => {
    const now = new Date().toISOString();
    const insights: AIInsight[] = [
      { id: generateId(), familyId: 'demo-family', type: 'financial', title: '💡 Budget Alert', summary: "You've spent 78% of your Food budget this month. Consider meal prepping to stretch the remaining $421.75.", priority: 'medium', actionLabel: 'View Budget', actionRoute: 'Finance', isRead: false, createdAt: now },
      { id: generateId(), familyId: 'demo-family', type: 'alert', title: '⚠️ Bill Due Soon', summary: 'Car Insurance ($185) is due in 5 days. Set up autopay to avoid late fees.', priority: 'high', actionLabel: 'Pay Now', actionRoute: 'Finance', isRead: false, createdAt: now },
      { id: generateId(), familyId: 'demo-family', type: 'tip', title: '🎯 Goal Progress', summary: "You're 41% toward your Hawaii vacation fund! Keep it up — $4,750 more to go.", priority: 'low', actionLabel: 'View Goals', actionRoute: 'Operations', isRead: false, createdAt: now },
      { id: generateId(), familyId: 'demo-family', type: 'health', title: '🏆 Family Health Score Up!', summary: "This week's task completion rate improved by 12%. The family is firing on all cylinders!", priority: 'low', actionLabel: 'View Score', actionRoute: 'Home', isRead: true, createdAt: now },
      { id: generateId(), familyId: 'demo-family', type: 'task', title: '📋 3 Tasks Overdue', summary: "Aiden has 2 chores pending and the car oil change is 2 weeks overdue.", priority: 'high', actionLabel: 'View Tasks', actionRoute: 'Family', isRead: false, createdAt: now },
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

function getDemoResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('budget') || lower.includes('money') || lower.includes('spend')) {
    return `📊 **Budget Analysis**\n\nBased on your current spending patterns:\n\n• **Food**: 78% used ($378/$800) — You're on track but slightly fast-paced this month\n• **Transport**: 45% used ($180/$400) — Well managed!\n• **Utilities**: 70% used ($245/$350) — Consider energy-saving habits\n\n💡 **My Recommendation**: Try batch cooking this weekend to reduce dining-out expenses. This alone could save you $150-200 this month.`;
  }
  if (lower.includes('task') || lower.includes('chore') || lower.includes('todo')) {
    return `✅ **Task Overview**\n\nYour family has **5 pending tasks** this week:\n\n🔴 **High Priority**\n• Pay electricity bill (due in 2 days)\n• Help Aiden with math homework\n\n🟡 **Medium Priority**\n• Grocery shopping\n• Car oil change\n\n🟢 **Low Priority**\n• Clean bedroom (Aiden)\n\n💡 **Tip**: Completing all tasks this week would earn your family **165 points** toward the Hawaii trip reward!`;
  }
  if (lower.includes('meal') || lower.includes('food') || lower.includes('dinner') || lower.includes('recipe')) {
    return `🍽️ **Meal Planning Suggestion**\n\nBased on your pantry inventory, here's a smart meal plan:\n\n**Tonight**: Chicken pasta with tomato sauce (uses chicken breast before expiry)\n**Tomorrow**: Rice bowl with mixed vegetables\n**Wednesday**: Egg stir-fry with pasta\n\n🛒 **Shopping needed**: Fresh vegetables, cheese, bread\n\n💰 **Estimated savings**: Planning meals this way saves ~$85/week vs. spontaneous shopping!`;
  }
  if (lower.includes('goal') || lower.includes('vacation') || lower.includes('save') || lower.includes('hawaii')) {
    return `🎯 **Goal Tracking Update**\n\n**Hawaii Vacation Fund** — $3,250 / $8,000 (41%)\n• At current pace, you'll reach your goal in **~9 months** ✓\n• To hit it by June: save $525/month\n\n💡 **Boost Strategy**:\n1. Redirect Netflix savings ($22.99) → vacation fund\n2. Use cashback rewards from Amazon Prime\n3. Consider a family savings challenge this month\n\nYou've got this! 🌺`;
  }
  if (lower.includes('health') || lower.includes('score') || lower.includes('wellness')) {
    return `❤️ **Family Health Score: 78/100**\n\n**Breakdown:**\n• 📊 Financial Health: 68 — Room to improve budgeting\n• ✅ Task Completion: 80 — Great job this week!\n• 🎯 Goal Progress: 65 — Stay consistent\n• 💬 Communication: 88 — Family is in sync!\n\n**To improve your score:**\n1. Complete 2+ overdue tasks\n2. Set up auto-pay for recurring bills\n3. Add 1 new family goal this week`;
  }
  if (lower.includes('vehicle') || lower.includes('car') || lower.includes('service')) {
    return `🚗 **Vehicle Status Report**\n\n**Toyota Camry (2021)**\n• Mileage: 35,420 miles\n• ⚠️ Oil change due — 3 months overdue!\n• Insurance expires in 6 months\n• Estimated service cost: $65-85\n\n**Honda CR-V (2022)**\n• Mileage: 22,180 miles\n• ✅ Service up to date\n• Insurance expires in 4 months\n\n💡 **Action needed**: Schedule Camry service this week. I can help you find nearby service centers.`;
  }
  return `👋 Hi! I'm your **Family Command Center AI** — your household Chief of Staff.\n\nI can help you with:\n• 📊 Budget analysis & financial planning\n• ✅ Task management & scheduling\n• 🍽️ Meal planning & pantry optimization\n• 🎯 Goal tracking & milestone planning\n• 🚗 Vehicle & home maintenance\n• ❤️ Family health score improvement\n• 🏆 Rewards & motivation strategies\n\nWhat would you like to tackle today?`;
}

function getContextSuggestions(input: string): string[] {
  const lower = input.toLowerCase();
  if (lower.includes('budget') || lower.includes('money')) {
    return ['Show spending trends', 'Set budget alert', 'Find savings opportunities'];
  }
  if (lower.includes('meal') || lower.includes('food')) {
    return ['Plan this week\'s meals', 'Generate shopping list', 'What\'s in the pantry?'];
  }
  if (lower.includes('task') || lower.includes('chore')) {
    return ['Assign tasks to kids', 'Set reminders', 'View completed tasks'];
  }
  return ['How is our budget?', 'What tasks are due?', 'Show family health score', 'Plan this week\'s meals'];
}
