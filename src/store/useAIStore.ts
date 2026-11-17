import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildFamilyContext } from '../utils/buildFamilyContext';
import { ApiService } from '../services/ApiService';
import { AI_TOOLS, executeTool, type ToolName } from '../services/AIToolService';
import type { ChatMessage, AIInsight } from '../types';

interface AIState {
  messages: ChatMessage[];
  insights: AIInsight[];
  isTyping: boolean;
  isStreaming: boolean;
  apiKey: string;
  railwayUrl: string;
  voiceEnabled: boolean;
  ttsEnabled: boolean;

  addMessage: (m: ChatMessage) => void;
  setTyping: (v: boolean) => void;
  clearMessages: () => void;
  addInsight: (i: AIInsight) => void;
  markInsightRead: (id: string) => void;
  setApiKey: (key: string) => void;
  setRailwayUrl: (url: string) => void;
  setVoiceEnabled: (v: boolean) => void;
  setTtsEnabled: (v: boolean) => void;
  sendMessage: (content: string, imageBase64?: string) => Promise<string>;
  streamMessage: (content: string) => Promise<string>;
  saveMemoryFromConversation: (userMsg: string, aiReply: string) => void;
  seedDemoInsights: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useAIStore = create<AIState>()(persist((set, get) => ({
  messages: [],
  insights: [],
  isTyping: false,
  isStreaming: false,
  apiKey: '',
  railwayUrl: '',
  voiceEnabled: false,
  ttsEnabled: true,

  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setTyping: (v) => set({ isTyping: v }),
  clearMessages: () => set({ messages: [] }),
  addInsight: (i) => set((s) => ({ insights: [i, ...s.insights] })),
  markInsightRead: (id) =>
    set((s) => ({ insights: s.insights.map((i) => (i.id === id ? { ...i, isRead: true } : i)) })),
  setApiKey: (key) => set({ apiKey: key }),
  setRailwayUrl: (url) => set({ railwayUrl: url }),
  setVoiceEnabled: (v) => set({ voiceEnabled: v }),
  setTtsEnabled: (v) => set({ ttsEnabled: v }),

  sendMessage: async (content: string, imageBase64?: string): Promise<string> => {
    const { messages, apiKey, railwayUrl } = get();
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMessage], isTyping: true }));

    // Build rich real-time context from all stores
    const familyContext = buildFamilyContext();

    const systemPrompt = `You are the Family Command Center AI — an intelligent, warm, and proactive household chief of staff.
You help families manage their finances, schedules, tasks, health, and home operations.
You speak in a supportive, organized, and occasionally encouraging tone.
Keep responses concise and actionable (2-4 short paragraphs max). Use emoji sparingly for visual clarity.
Always reference the specific family data provided — never give generic advice when you have real numbers.

LIVE FAMILY DATA (as of right now):
${familyContext}

You can help with:
- Financial planning and budget analysis based on the real numbers above
- Task management — mention specific overdue tasks by name
- Meal planning and pantry management
- Health and wellness suggestions
- Goal tracking and milestone celebrations
- Home operations and vehicle maintenance
- Emergency preparedness
- Kid reward system management`;

    // Build message content (with optional image)
    const userContent: any = imageBase64
      ? [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: content },
        ]
      : content;

    const allMessages = [...messages.slice(-10), userMessage].map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.id === userMessage.id && imageBase64 ? userContent : m.content,
    }));

    let assistantContent = '';

    try {
      // Use Railway proxy if configured, otherwise call Anthropic directly
      const endpoint = railwayUrl
        ? `${railwayUrl}/api/ai/chat`
        : 'https://api.anthropic.com/v1/messages';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!railwayUrl) {
        headers['x-api-key'] = apiKey || '';
        headers['anthropic-version'] = '2023-06-01';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages: allMessages,
          tools: AI_TOOLS,
        }),
      });

      if (response.ok && (apiKey || railwayUrl)) {
        const data = await response.json();
        const stopReason = data.stop_reason;

        // Handle tool_use — execute tools then get final reply
        if (stopReason === 'tool_use' && Array.isArray(data.content)) {
          const toolUseBlocks = data.content.filter((b: any) => b.type === 'tool_use');
          const toolResults: any[] = [];
          const actionSummaries: string[] = [];

          for (const block of toolUseBlocks) {
            const result = await executeTool(block.name as ToolName, block.input || {});
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: result.success ? result.message : `Error: ${result.message}`,
            });
            actionSummaries.push(result.message);
          }

          // Follow-up call with tool results to get Claude's final reply
          const followUpMessages = [
            ...allMessages,
            { role: 'assistant' as const, content: data.content },
            { role: 'user' as const, content: toolResults },
          ];
          const followUpResponse = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 1024,
              system: systemPrompt,
              messages: followUpMessages,
              tools: AI_TOOLS,
            }),
          });
          if (followUpResponse.ok) {
            const followUpData = await followUpResponse.json();
            const textBlock = followUpData.content?.find((b: any) => b.type === 'text');
            assistantContent = textBlock?.text ?? `Done! ${actionSummaries.join('; ')}`;
          } else {
            assistantContent = `✅ ${actionSummaries.join('\n✅ ')}`;
          }

          const assistantMessageWithTools: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: assistantContent,
            timestamp: new Date().toISOString(),
            toolActions: actionSummaries,
          };
          set((s) => ({ messages: [...s.messages, assistantMessageWithTools], isTyping: false }));
          get().saveMemoryFromConversation(content, assistantContent);
          return assistantContent;
        } else {
          // Support both direct Anthropic response and Railway proxy response shapes
          const textBlock = data.content?.find((b: any) => b.type === 'text');
          assistantContent = textBlock?.text ?? data.content?.[0]?.text ?? data.message ?? getDemoResponse(content);
        }
      } else {
        assistantContent = getDemoResponse(content);
      }
    } catch {
      assistantContent = getDemoResponse(content);
    }

    const assistantMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date().toISOString(),
      suggestions: getContextSuggestions(content),
    };
    set((s) => ({ messages: [...s.messages, assistantMessage], isTyping: false }));
    get().saveMemoryFromConversation(content, assistantContent);
    return assistantContent;
  },

  saveMemoryFromConversation: (userMsg: string, aiReply: string) => {
    // Heuristically detect memory-worthy facts from the user message
    const lower = userMsg.toLowerCase();
    const { addMemory } = (require('../store/useMemoryStore').useMemoryStore as any).getState();
    const family = (require('../store/useFamilyStore').useFamilyStore as any).getState().family;
    if (!family) return;

    // Detect food preferences
    if (/\b(love|hate|allergic|don't like|don't eat|favorite food|prefer)\b/i.test(userMsg)) {
      addMemory({ familyId: family.id, type: 'preference', title: 'Food/Preference', content: userMsg, isPinned: false });
      return;
    }
    // Detect important dates
    if (/\b(birthday|anniversary|graduation|wedding|due date|appointment)\b/i.test(userMsg)) {
      addMemory({ familyId: family.id, type: 'important_date', title: 'Important Date', content: userMsg, isPinned: false });
      return;
    }
    // Detect medical info
    if (/\b(doctor|medication|allerg|diagnos|prescription|health|therapy)\b/i.test(userMsg)) {
      addMemory({ familyId: family.id, type: 'health', title: 'Health Note', content: userMsg, isPinned: false });
      return;
    }
    // Detect goals or wishes
    if (/\b(want to|goal|dream|plan to|saving for|hope to|wish)\b/i.test(userMsg)) {
      addMemory({ familyId: family.id, type: 'goal', title: 'Family Goal', content: userMsg, isPinned: false });
    }
  },

  streamMessage: async (content: string): Promise<string> => {
    const { messages } = get();
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    // Placeholder assistant message that grows as chunks arrive
    const assistantId = generateId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMessage, assistantMessage], isStreaming: true }));

    const familyContext = buildFamilyContext();
    const systemPrompt = `You are the Family Command Center AI — an intelligent, warm, and proactive household chief of staff.
Keep responses concise and actionable. Use emoji sparingly.
Always reference the specific family data provided.\n\nLIVE FAMILY DATA:\n${familyContext}`;

    const allMessages = [...messages.slice(-10), userMessage].map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    let full = '';
    try {
      full = await ApiService.stream(
        '/api/ai/chat/stream',
        { model: 'claude-haiku-4-5-20251001', max_tokens: 1024, system: systemPrompt, messages: allMessages, stream: true },
        (delta) => {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + delta } : m
            ),
          }));
        }
      );
    } catch {
      // Fallback to non-streaming if stream endpoint not available
      full = getDemoResponse(content);
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantId ? { ...m, content: full } : m
        ),
      }));
    }
    set({ isStreaming: false });
    get().saveMemoryFromConversation(content, full);
    return full;
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
  name: 'ai-store',
  storage: createJSONStorage(() => AsyncStorage),
}
));

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
