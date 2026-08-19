import { API_BASE_URL } from '../config/api';
import { secureStorage } from '../storage/secureStorage';
import { refreshAccessToken } from '../api/client';

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
  // Every /ai/* route requires auth — falling back to a stored token here
  // (rather than requiring every call site to remember to pass one) is what
  // actually matters: every AI screen was omitting this `token` param, so
  // every request 401'd and got swallowed into a generic "unavailable"
  // message. Centralizing it here means that class of bug can't recur
  // per-screen — new callers get it for free.
  const authToken = token ?? (await secureStorage.getToken('access_token'));

  const doFetch = (t?: string) =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      body: JSON.stringify(body),
    });

  let res = await doFetch(authToken ?? undefined);

  // Access tokens are short-lived (15m, see api/src/utils/jwt.ts). Without
  // this, every AI feature sharing this helper (Guardian Chat, Parenting
  // Coach, Negotiator, Digital Twin, Memory Insights, dashboard insight
  // cards) surfaced "AI is temporarily unavailable" the moment a session
  // outlived the token, instead of transparently refreshing and retrying
  // like apiRequest() does for every other authenticated call in the app.
  // Only retried when we supplied the token ourselves (not an explicit
  // caller-provided one) — a caller passing its own token owns that token's
  // lifecycle.
  if (res.status === 401 && !token) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await doFetch(newToken);
  }

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

/* ── Generic AI quick-fill — camera/voice autofill for any "Add X" form ──
   Unlike the chat helpers above, these deliberately let errors throw
   instead of swallowing them into a fallback value: a quick-fill failure
   needs to surface to the caller so the form can tell the user to just
   type it in, rather than silently leaving every field blank. */
export interface QuickFillField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  description: string;
}

export type QuickFillResult = Record<string, string | number | boolean | null>;

export function extractFieldsFromPhoto(
  imageBase64: string,
  fields: QuickFillField[],
  context?: string,
  token?: string,
): Promise<QuickFillResult> {
  return post<{ fields: QuickFillResult }>('/ai/extract-fields', { imageBase64, fields, context }, token)
    .then((data) => data.fields);
}

export function parseFieldsFromText(
  text: string,
  fields: QuickFillField[],
  context?: string,
  token?: string,
): Promise<QuickFillResult> {
  return post<{ fields: QuickFillResult }>('/ai/parse-fields', { text, fields, context }, token)
    .then((data) => data.fields);
}
