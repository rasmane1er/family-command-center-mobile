import { secureStorage } from '../storage/secureStorage';
import { awsConfig } from '../config/aws';

// Access tokens are short-lived (15m, see api/src/utils/jwt.ts). This
// dedupes concurrent 401s into a single /auth/refresh call so parallel
// requests don't each try to refresh independently.
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await secureStorage.getToken('refresh_token');
      if (!refreshToken) return null;

      const res = await fetch(`${awsConfig.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;

      const body = await res.json();
      await secureStorage.setToken('access_token', body.accessToken);
      return body.accessToken as string;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await secureStorage.getToken('access_token');

  const doFetch = (authToken: string | null) =>
    fetch(`${awsConfig.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
    });

  let response = await doFetch(token);

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await doFetch(newToken);
    }
  }

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}