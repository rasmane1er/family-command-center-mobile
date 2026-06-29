import { API_BASE_URL } from '../config/api';

const API_BASE = API_BASE_URL;

export interface AIMessage {
  role: 'user' | 'model';
  content: string;
}

export interface AIReply {
  reply: string;
  suggestions: string[];
  error?: string;
}

async function post<T>(
  path: string,
  body: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

/* ── Family Safety Assistant ── */
export async function chatWithSafetyAssistant(opts: {
  message: string;
  context?: string;
  history?: AIMessage[];
  mode?: 'general' | 'location' | 'screentime' | 'alerts';
  token?: string;
}): Promise<AIReply> {
  try {
    return await post<AIReply>('/ai/chat', {
      message: opts.message,
      context: opts.context,
      history: opts.history,
      mode: opts.mode,
    }, opts.token);
  } catch (e) {
    return { reply: 'AI is temporarily unavailable. Please try again.', suggestions: [], error: String(e) };
  }
}

/* ── Parenting Coach ── */
export async function chatWithParentingCoach(opts: {
  message: string;
  context?: string;
  history?: AIMessage[];
  childAge?: number;
  topic?: 'discipline' | 'education' | 'emotions' | 'health' | 'technology' | 'general';
  token?: string;
}): Promise<AIReply> {
  try {
    return await post<AIReply>('/ai/parenting-coach', {
      message: opts.message,
      context: opts.context,
      history: opts.history,
      childAge: opts.childAge,
      topic: opts.topic,
    }, opts.token);
  } catch (e) {
    return { reply: 'AI is temporarily unavailable. Please try again.', suggestions: [], error: String(e) };
  }
}

/* ── Family Negotiator ── */
export async function chatWithNegotiator(opts: {
  message: string;
  context?: string;
  history?: AIMessage[];
  conflictType?: string;
  parties?: string[];
  token?: string;
}): Promise<AIReply> {
  try {
    return await post<AIReply>('/ai/negotiator', {
      message: opts.message,
      context: opts.context,
      history: opts.history,
      conflictType: opts.conflictType,
      parties: opts.parties,
    }, opts.token);
  } catch (e) {
    return { reply: 'AI is temporarily unavailable. Please try again.', suggestions: [], error: String(e) };
  }
}

/* ── Digital Twin ── */
export async function chatWithDigitalTwin(opts: {
  message: string;
  context?: string;
  history?: AIMessage[];
  familyData?: Record<string, unknown>;
  token?: string;
}): Promise<AIReply> {
  try {
    return await post<AIReply>('/ai/digital-twin', {
      message: opts.message,
      context: opts.context,
      history: opts.history,
      familyData: opts.familyData,
    }, opts.token);
  } catch (e) {
    return { reply: 'AI is temporarily unavailable. Please try again.', suggestions: [], error: String(e) };
  }
}

/* ── AI Memory Insights ── */
export async function chatWithMemoryAI(opts: {
  message: string;
  context?: string;
  history?: AIMessage[];
  memories?: Array<{ title: string; content?: string; tags?: string[] }>;
  token?: string;
}): Promise<AIReply> {
  try {
    return await post<AIReply>('/ai/memory-insights', {
      message: opts.message,
      context: opts.context,
      history: opts.history,
      memories: opts.memories,
    }, opts.token);
  } catch (e) {
    return { reply: 'AI is temporarily unavailable. Please try again.', suggestions: [], error: String(e) };
  }
}

/* ── Family Insights (dashboard cards) ── */
export interface FamilyInsight {
  insight: string;
  category: 'finance' | 'tasks' | 'health' | 'relationships';
}

export async function getFamilyInsights(context: string, token?: string): Promise<FamilyInsight[]> {
  try {
    const data = await post<{ insights: FamilyInsight[] }>('/ai/insights', { context }, token);
    return data.insights ?? [];
  } catch {
    return [];
  }
}
