import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as SecureStore from 'expo-secure-store';
import { secureStorage } from '../storage/secureStorage';
import { awsConfig } from '../config/aws';
import { apiRequest } from '../api/client';
import { resetAllStores } from '../storage/resetAllStores';
import { registerAuthBridge } from './authBridge';
// Only call after a backend session is confirmed (token in SecureStore).
// Calling without a token causes a 401 which the fetchFromServer 401-handler
// mistakes for a revoked session and signs the user back out.
function fetchFamilyAfterSignIn() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useFamilyStore } = require('./useFamilyStore') as typeof import('./useFamilyStore');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useAppStore } = require('./useAppStore') as typeof import('./useAppStore');
  useFamilyStore.getState().fetchFromServer().then(() => {
    // If the server returned a real family (members > 0), this is an existing
    // account signing in on a new device — skip onboarding and go straight to
    // the dashboard. isOnboarded is MMKV-persisted so it resets on a fresh install.
    const members = useFamilyStore.getState().members;
    if (members.length > 0) {
      useAppStore.getState().setOnboarded(true);
    }
  }).catch(() => {});
}

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
  pendingVerificationEmail: string | null;
  user: AuthUser | null;
  // Populated once the account is synced with the backend (see syncWithBackend
  // below). Null until then — features that need it (live chat, subscriptions)
  // should treat null as "not yet backend-linked" rather than an error.
  familyId: string | null;
  backendUserId: string | null;

  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: SignUpData) => Promise<{ success: boolean; error?: string }>;
  // idToken is a Firebase ID token obtained by exchanging the native
  // Google/Apple credential via @react-native-firebase/auth — the backend
  // verifies it server-side (see /auth/social) rather than trusting
  // whatever the client claims its email/provider to be.
  signInWithSocial: (user: Omit<AuthUser, 'createdAt'>, idToken: string) => Promise<void>;
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
  emailVerified?: boolean;
  user: { id: string; email: string; role: string; familyId: string; familyName: string | null };
}

async function persistBackendSession(result: BackendAuthResult): Promise<{ familyId: string; backendUserId: string }> {
  // Delete first so any pending sign-out deletion that fires after us is a no-op.
  // Order: delete → write prevents the race where signOut's fire-and-forget
  // removeToken lands after our setToken and wipes the freshly-written credential.
  await secureStorage.removeToken('access_token').catch(() => {});
  await secureStorage.removeToken('refresh_token').catch(() => {});
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
type BackendSyncResult = { familyId: string; backendUserId: string; emailVerified: boolean } | { needsVerification: true } | null;

async function syncWithBackend(params: {
  email: string;
  password: string;
  familyName?: string;
  memberName?: string;
  memberRole?: string;
}): Promise<BackendSyncResult> {
  const { email, password, familyName, memberName, memberRole } = params;

  try {
    console.log('[auth] syncWithBackend: trying login at', `${awsConfig.apiBaseUrl}/auth/login`);
    const loginRes = await fetch(`${awsConfig.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (loginRes.ok) {
      console.log('[auth] syncWithBackend: login succeeded, familyId linked');
      const data: BackendAuthResult = await loginRes.json();
      const session = await persistBackendSession(data);
      return { ...session, emailVerified: data.emailVerified ?? true };
    }

    // 403 email_not_verified — account exists but email not confirmed yet
    if (loginRes.status === 403) {
      const body = await loginRes.json().catch(() => ({}));
      if (body?.error === 'email_not_verified') {
        return { needsVerification: true };
      }
    }

    console.warn('[auth] syncWithBackend: login failed', loginRes.status);

    if (loginRes.status >= 500) {
      console.warn('[auth] syncWithBackend: server error during login, not attempting register to avoid duplicate family');
      return null;
    }

    if (!familyName || !memberName) {
      console.warn('[auth] syncWithBackend: no familyName/memberName to fall back to register with — giving up');
      return null;
    }

    console.log('[auth] syncWithBackend: trying register at', `${awsConfig.apiBaseUrl}/auth/register`);
    const registerRes = await fetch(`${awsConfig.apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, familyName, memberName, memberRole }),
    });
    if (!registerRes.ok) {
      console.warn('[auth] syncWithBackend: register failed', registerRes.status);
      return null;
    }

    console.log('[auth] syncWithBackend: register succeeded');
    const data: BackendAuthResult = await registerRes.json();
    const session = await persistBackendSession(data);
    return { ...session, emailVerified: data.emailVerified ?? true };
  } catch (err) {
    console.warn('[auth] syncWithBackend: network error', awsConfig.apiBaseUrl, err);
    return null;
  }
}

// Find-or-create backend link for Google/Apple sign-in — there's no
// password to check, so this can't reuse syncWithBackend's login-then-
// register flow. Same never-throws contract: an unreachable/failing backend
// must not block the local social sign-in from working.
async function syncSocialWithBackend(params: {
  idToken: string;
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
      pendingVerificationEmail: null,
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

        // Backend sync is awaited BEFORE isAuthenticated flips true — screens
        // mount the instant isAuthenticated is true and immediately call
        // fetchFromServer(), which reads the access token from SecureStore.
        // Setting isAuthenticated first left a window where that token
        // hadn't been persisted yet, so the resulting 401 was mistaken for
        // "session revoked" and force-signed the user right back out (see
        // fetchFromServer's 401 handler in useFamilyStore.ts). syncWithBackend
        // never throws — an unreachable backend still resolves (to null), so
        // this doesn't break the local-first "sign in even if offline" contract.
        const backend = await syncWithBackend({
          email: normalizedEmail,
          password: data.password,
          familyName: data.familyName?.trim() || `${data.lastName.trim()} Family`,
          memberName: user.displayName,
          memberRole: data.familyRole,
        });

        // If the backend created the account but email isn't verified yet,
        // park in pending state — don't authenticate until verification is done.
        if (backend && 'needsVerification' in backend) {
          set({ pendingVerificationEmail: normalizedEmail });
          return { success: true, needsEmailVerification: true } as any;
        }
        if (backend && 'emailVerified' in backend && !backend.emailVerified) {
          set({ pendingVerificationEmail: normalizedEmail });
          return { success: true, needsEmailVerification: true } as any;
        }

        set({
          isAuthenticated: true,
          pendingVerificationEmail: null,
          user,
          ...(backend && 'familyId' in backend && { familyId: backend.familyId, backendUserId: backend.backendUserId }),
        });

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
              if (res.status === 403 && body?.error === 'email_not_verified') {
                set({ pendingVerificationEmail: normalizedEmail });
                return { success: false, error: 'email_not_verified' };
              }
              return { success: false, error: typeof body.message === 'string' ? body.message : 'No account found with this email.' };
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
            set({ isAuthenticated: true, pendingVerificationEmail: null, user, familyId, backendUserId });
            fetchFamilyAfterSignIn();
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
          streetAddress: existing?.streetAddress,
          state: existing?.state,
          zipCode: existing?.zipCode,
        };

        // See the matching comment in signUp above — backend sync must be
        // awaited before isAuthenticated flips true, or screens race ahead
        // and call fetchFromServer() before any token is persisted.
        const backend = await syncWithBackend({
          email: normalizedEmail,
          password,
          // Fallback for legacy local-only accounts that never went through
          // the backend — bootstraps a backend family/account from whatever
          // profile info exists locally so this session becomes backend-linked.
          familyName: existing?.familyName?.trim() || `${stored.displayName}'s Family`,
          memberName: stored.displayName,
        });
        if (backend && 'needsVerification' in backend) {
          set({ pendingVerificationEmail: normalizedEmail });
          return { success: false, error: 'email_not_verified' };
        }
        set({
          isAuthenticated: true,
          pendingVerificationEmail: null,
          user,
          ...(backend && 'familyId' in backend && { familyId: backend.familyId, backendUserId: backend.backendUserId }),
        });
        if (backend && 'familyId' in backend) fetchFamilyAfterSignIn();
        return { success: true };
      },

      signInWithSocial: async (userData, idToken) => {
        const user: AuthUser = {
          ...userData,
          createdAt: new Date().toISOString(),
        };

        // See the matching comment in signUp above — this is the exact race
        // that was causing Google/Apple sign-in to bounce straight back to
        // the sign-in screen (isAuthenticated flipped true, a tab screen
        // mounted and called fetchFromServer() before the token from
        // syncSocialWithBackend had been written to SecureStore, the
        // resulting 401 was read as "session revoked", and useFamilyStore
        // force-signed the user back out).
        const backend = await syncSocialWithBackend({
          idToken,
          displayName: user.displayName,
          provider: user.provider as 'google' | 'apple',
          familyName: user.familyName,
        });
        set({
          isAuthenticated: true,
          user,
          ...(backend && { familyId: backend.familyId, backendUserId: backend.backendUserId }),
        });
        if (backend) fetchFamilyAfterSignIn();
      },

      signOut: () => {
        set({ isAuthenticated: false, user: null, familyId: null, backendUserId: null });
        // Await both deletions so a rapid sign-in cannot race past them and
        // have the deletion wipe the freshly-written token.
        Promise.all([
          secureStorage.removeToken('access_token'),
          secureStorage.removeToken('refresh_token'),
        ]).catch(() => {});
        // Every other store (family, tasks, finance, ...) is plain
        // MMKV-persisted and otherwise survives sign-out untouched. Without
        // this, signing out of one account and signing into a *different*
        // one on the same device left the previous account's family/member
        // data sitting in place — populateFromSignUp only seeds a family
        // when none exists yet, so the new account would silently inherit
        // and display the old one's data instead of getting its own.
        resetAllStores();
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

// Register after store creation so other stores can read auth state
// without importing useAuthStore directly (which would create a cycle).
registerAuthBridge(
  () => {
    const s = useAuthStore.getState();
    return { user: s.user, familyId: s.familyId, backendUserId: s.backendUserId };
  },
  () => useAuthStore.getState().signOut(),
);
