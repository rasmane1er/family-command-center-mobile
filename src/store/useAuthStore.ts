import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as SecureStore from 'expo-secure-store';
import { secureStorage } from '../storage/secureStorage';
import { awsConfig } from '../config/aws';
import { apiRequest } from '../api/client';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'non_binary' | 'prefer_not';
  occupation?: string;
  bio?: string;
  avatarUri?: string;
  avatarColor?: string;
  familyName?: string;
  familyMotto?: string;
  familyRole?: 'parent' | 'co_parent' | 'single_parent' | 'guardian' | 'other';
  numberOfChildren?: number;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  provider: 'email' | 'apple' | 'google';
  createdAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  // Populated once the account is synced with the backend (see syncWithBackend
  // below). Null until then — features that need it (live chat, subscriptions)
  // should treat null as "not yet backend-linked" rather than an error.
  familyId: string | null;
  backendUserId: string | null;

  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: SignUpData) => Promise<{ success: boolean; error?: string }>;
  signInWithSocial: (user: Omit<AuthUser, 'createdAt'>) => Promise<void>;
  signOut: () => void;
  // Permanently deletes the backend account (and the whole family, if this
  // was its last remaining login) via DELETE /auth/account, then clears
  // local auth state. Does NOT clear other stores/tokens itself — callers
  // (SettingsScreen) are responsible for resetAllStores()+signOut() after
  // this resolves, same as any other full-wipe flow in this app.
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<AuthUser>) => void;
  // Verifies a password against the currently signed-in account without
  // touching auth state — used to gate device-lock changes (see
  // ProfileSwitcherScreen) so a child can't bypass a locked device just by
  // knowing the lightweight per-profile switch PIN.
  verifyPassword: (password: string) => Promise<boolean>;
}

export interface SignUpData {
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: AuthUser['gender'];
  occupation?: string;
  bio?: string;
  avatarUri?: string;
  avatarColor?: string;
  familyName?: string;
  familyMotto?: string;
  familyRole?: AuthUser['familyRole'];
  numberOfChildren?: number;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

const CREDENTIALS_KEY = 'fcc_credentials';

async function hashPassword(password: string): Promise<string> {
  let hash = 0;
  const str = password + 'fcc_salt_2024';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

async function getStoredCredentials(): Promise<Record<string, { displayName: string; hash: string }> | null> {
  try {
    const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveCredentials(data: Record<string, { displayName: string; hash: string }>) {
  await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(data));
}

interface BackendAuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string; familyId: string; familyName: string | null };
}

async function persistBackendSession(result: BackendAuthResult): Promise<{ familyId: string; backendUserId: string }> {
  await secureStorage.setToken('access_token', result.accessToken);
  await secureStorage.setToken('refresh_token', result.refreshToken);
  return { familyId: result.user.familyId, backendUserId: result.user.id };
}

// Best-effort link to the real backend so server-backed features (live chat,
// subscriptions) work. Never throws — the app is local-first, so an
// unreachable server or a pre-existing account must not block sign-up/sign-in.
//
// Always tries login first, then falls back to registering a new backend
// account (using familyName/memberName if given) if login fails. This one
// order correctly handles both:
//  - brand-new sign-ups (login fails since no backend account exists yet →
//    register creates it)
//  - legacy local-only accounts signing in for the first time since backend
//    auth was wired up (same thing — no backend account yet → register
//    bootstraps one from their current session, backend-linking them)
async function syncWithBackend(params: {
  email: string;
  password: string;
  familyName?: string;
  memberName?: string;
}): Promise<{ familyId: string; backendUserId: string } | null> {
  const { email, password, familyName, memberName } = params;

  try {
    console.log('[auth] syncWithBackend: trying login at', `${awsConfig.apiBaseUrl}/auth/login`);
    const loginRes = await fetch(`${awsConfig.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (loginRes.ok) {
      console.log('[auth] syncWithBackend: login succeeded, familyId linked');
      return persistBackendSession(await loginRes.json());
    }
    console.warn('[auth] syncWithBackend: login failed', loginRes.status, await loginRes.text().catch(() => ''));

    if (!familyName || !memberName) {
      console.warn('[auth] syncWithBackend: no familyName/memberName to fall back to register with — giving up');
      return null;
    }

    console.log('[auth] syncWithBackend: trying register at', `${awsConfig.apiBaseUrl}/auth/register`);
    const registerRes = await fetch(`${awsConfig.apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, familyName, memberName }),
    });
    if (!registerRes.ok) {
      console.warn('[auth] syncWithBackend: register failed', registerRes.status, await registerRes.text().catch(() => ''));
      return null;
    }

    console.log('[auth] syncWithBackend: register succeeded, familyId linked');
    return persistBackendSession(await registerRes.json());
  } catch (err) {
    // Offline or backend unreachable — local account still works.
    console.warn('[auth] syncWithBackend: network error, could not reach backend at', awsConfig.apiBaseUrl, err);
    return null;
  }
}

// Find-or-create backend link for Google/Apple sign-in — there's no
// password to check, so this can't reuse syncWithBackend's login-then-
// register flow. Same never-throws contract: an unreachable/failing backend
// must not block the local social sign-in from working.
async function syncSocialWithBackend(params: {
  email: string;
  displayName: string;
  provider: 'google' | 'apple';
  familyName?: string;
}): Promise<{ familyId: string; backendUserId: string } | null> {
  try {
    const res = await fetch(`${awsConfig.apiBaseUrl}/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      console.warn('[auth] syncSocialWithBackend: failed', res.status, await res.text().catch(() => ''));
      return null;
    }
    return persistBackendSession(await res.json());
  } catch (err) {
    console.warn('[auth] syncSocialWithBackend: network error, could not reach backend at', awsConfig.apiBaseUrl, err);
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      familyId: null,
      backendUserId: null,

      signUp: async (data) => {
        const normalizedEmail = data.email.toLowerCase().trim();
        if (!data.displayName.trim()) return { success: false, error: 'Please enter your name.' };
        if (!normalizedEmail.includes('@')) return { success: false, error: 'Please enter a valid email.' };
        if (data.password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

        const credentials = (await getStoredCredentials()) ?? {};
        if (credentials[normalizedEmail]) {
          return { success: false, error: 'An account with this email already exists.' };
        }

        const hash = await hashPassword(data.password);
        credentials[normalizedEmail] = { displayName: data.displayName.trim(), hash };
        await saveCredentials(credentials);

        const user: AuthUser = {
          id: Math.random().toString(36).substring(2),
          email: normalizedEmail,
          displayName: data.displayName.trim(),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          occupation: data.occupation,
          bio: data.bio,
          avatarUri: data.avatarUri,
          avatarColor: data.avatarColor ?? '#4A8FD9',
          familyName: data.familyName,
          familyMotto: data.familyMotto,
          familyRole: data.familyRole ?? 'parent',
          numberOfChildren: data.numberOfChildren,
          streetAddress: data.streetAddress,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          provider: 'email',
          createdAt: new Date().toISOString(),
        };

        set({ isAuthenticated: true, user });

        const backend = await syncWithBackend({
          email: normalizedEmail,
          password: data.password,
          familyName: data.familyName?.trim() || `${data.lastName.trim()} Family`,
          memberName: user.displayName,
        });
        if (backend) set({ familyId: backend.familyId, backendUserId: backend.backendUserId });

        return { success: true };
      },

      signIn: async (email, password) => {
        const normalizedEmail = email.toLowerCase().trim();
        if (!normalizedEmail || !password) return { success: false, error: 'Please fill in all fields.' };

        const credentials = (await getStoredCredentials()) ?? {};
        const stored = credentials[normalizedEmail];

        // No local record on this device — could be a fresh install, or an
        // account created on a different device entirely (e.g. this exact
        // account was signed up on an iOS simulator, then sign-in was tried
        // from a separate Android emulator install, which has its own empty
        // local credential cache). The backend is the real source of truth
        // for whether this email/password pair is valid, not just this
        // device's local cache — previously this returned "No account
        // found" purely because the cache was empty, even when the backend
        // had a perfectly valid account for it.
        if (!stored) {
          try {
            const res = await fetch(`${awsConfig.apiBaseUrl}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: normalizedEmail, password }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              return { success: false, error: typeof body.error === 'string' ? body.error : 'No account found with this email.' };
            }

            const authResult: BackendAuthResult = await res.json();
            const { familyId, backendUserId } = await persistBackendSession(authResult);

            const displayName = normalizedEmail.split('@')[0];
            const hash = await hashPassword(password);
            await saveCredentials({ ...credentials, [normalizedEmail]: { displayName, hash } });

            const user: AuthUser = {
              id: backendUserId,
              email: normalizedEmail,
              displayName,
              avatarColor: '#4A8FD9',
              familyRole: 'parent',
              provider: 'email',
              createdAt: new Date().toISOString(),
            };
            set({ isAuthenticated: true, user, familyId, backendUserId });
            return { success: true };
          } catch {
            return { success: false, error: 'Could not reach the server. Check your connection and try again.' };
          }
        }

        const hash = await hashPassword(password);
        if (hash !== stored.hash) return { success: false, error: 'Incorrect password.' };

        const existing = get().user;
        const user: AuthUser = {
          id: existing?.id ?? Math.random().toString(36).substring(2),
          email: normalizedEmail,
          displayName: stored.displayName,
          avatarColor: existing?.avatarColor ?? '#4A8FD9',
          familyName: existing?.familyName,
          familyRole: existing?.familyRole ?? 'parent',
          provider: 'email',
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          phone: existing?.phone,
          dateOfBirth: existing?.dateOfBirth,
          city: existing?.city,
        };

        set({ isAuthenticated: true, user });

        const backend = await syncWithBackend({
          email: normalizedEmail,
          password,
          // Fallback for legacy local-only accounts that never went through
          // the backend — bootstraps a backend family/account from whatever
          // profile info exists locally so this session becomes backend-linked.
          familyName: existing?.familyName?.trim() || `${stored.displayName}'s Family`,
          memberName: stored.displayName,
        });
        if (backend) set({ familyId: backend.familyId, backendUserId: backend.backendUserId });

        return { success: true };
      },

      signInWithSocial: async (userData) => {
        const user: AuthUser = {
          ...userData,
          createdAt: new Date().toISOString(),
        };
        set({ isAuthenticated: true, user });

        const backend = await syncSocialWithBackend({
          email: user.email,
          displayName: user.displayName,
          provider: user.provider as 'google' | 'apple',
          familyName: user.familyName,
        });
        if (backend) set({ familyId: backend.familyId, backendUserId: backend.backendUserId });
      },

      signOut: () => {
        set({ isAuthenticated: false, user: null, familyId: null, backendUserId: null });
        secureStorage.removeToken('access_token').catch(() => {});
        secureStorage.removeToken('refresh_token').catch(() => {});
      },

      deleteAccount: async () => {
        if (!get().familyId) {
          return { success: false, error: 'This account is not backend-linked yet — nothing to delete server-side.' };
        }
        try {
          await apiRequest('/auth/account', { method: 'DELETE' });
          return { success: true };
        } catch {
          return { success: false, error: 'Could not delete your account. Check your connection and try again.' };
        }
      },

      resetPassword: async (email) => {
        const normalizedEmail = email.toLowerCase().trim();
        const credentials = (await getStoredCredentials()) ?? {};
        if (!credentials[normalizedEmail]) {
          return { success: false, error: 'No account found with this email.' };
        }
        return { success: true };
      },

      updateProfile: (updates) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...updates } });
      },

      verifyPassword: async (password) => {
        const email = get().user?.email;
        if (!email) return false;
        const credentials = (await getStoredCredentials()) ?? {};
        const stored = credentials[email];
        if (!stored) return false;
        const hash = await hashPassword(password);
        return hash === stored.hash;
      },
    }),
    {
      name: 'family-command-center-auth',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        familyId: state.familyId,
        backendUserId: state.backendUserId,
      }),
    }
  )
);
