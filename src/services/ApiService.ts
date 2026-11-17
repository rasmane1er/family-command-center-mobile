import { useAIStore } from '../store/useAIStore';

export class ApiService {
  private static baseUrl(): string {
    return useAIStore.getState().railwayUrl;
  }

  private static headers(): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }

  static async post<T = any>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl()}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json();
  }

  static async get<T = any>(path: string): Promise<T> {
    const url = `${this.baseUrl()}${path}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json();
  }

  // Stream a POST response — calls onChunk for each SSE data line, returns full text
  static async stream(
    path: string,
    body: unknown,
    onChunk: (delta: string) => void
  ): Promise<string> {
    const url = `${this.baseUrl()}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...this.headers(), Accept: 'text/event-stream' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`API ${res.status}: ${text}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let full = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          // Support both Anthropic SSE shape and custom Railway shape
          const delta =
            parsed?.delta?.text ??
            parsed?.choices?.[0]?.delta?.content ??
            parsed?.chunk ??
            '';
          if (delta) {
            full += delta;
            onChunk(delta);
          }
        } catch {
          // non-JSON SSE lines (comments, etc.) — skip
        }
      }
    }
    return full;
  }

  static isConfigured(): boolean {
    return !!this.baseUrl();
  }
}
