import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as LocalAuthentication from 'expo-local-authentication';
import { secureStorage } from '../storage/secureStorage';
import { awsConfig } from '../config/aws';
import { apiRequest } from '../api/client';
import { resetAllStores } from '../storage/resetAllStores';
import { registerAuthBridge } from './authBridge';
import { validatePasswordStrength } from '../utils/passwordPolicy';
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
  // Best-known MFA status for the signed-in account — set from the actual
  // login path taken (mfa/challenge succeeded vs. plain login succeeded) and
  // kept in sync by mfaEnable/mfaDisable. Not fetched from a dedicated
  // status endpoint, so a stale value only self-corrects on the next login.
  mfaEnabled: boolean;
  // Set by signIn() when the backend responds mfaRequired instead of real
  // tokens — AuthNavigator renders MfaChallengeScreen while this is non-null,
  // same pattern as pendingVerificationEmail below.
  mfaChallenge: { mfaToken: string } | null;

  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  // Redeems the mfaChallenge token + a TOTP/backup code for a real session,
  // identical outcome to a successful signIn().
  completeMfaChallenge: (code: string) => Promise<{ success: boolean; error?: string }>;
  cancelMfaChallenge: () => void;
  mfaSetup: () => Promise<{ success: boolean; secret?: string; qrCodeDataUrl?: string; error?: string }>;
  mfaEnable: (token: string) => Promise<{ success: boolean; backupCodes?: string[]; error?: string }>;
  mfaDisable: (password: string, token: string) => Promise<{ success: boolean; error?: string }>;
  exportMyData: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
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
  // Requests a 6-digit reset code via POST /auth/forgot-password. Always
  // resolves success:true if the request reached the server — the backend
  // itself never reveals whether the email matches an account, so there's
  // nothing more specific to surface here either.
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  // Verifies the code from resetPassword and sets a new password via
  // POST /auth/reset-password. Doesn't touch local auth state — the user
  // still has to sign in with the new password afterward.
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<AuthUser>) => void;
  // Verifies a password against the currently signed-in account via the
  // real backend credential (POST /auth/verify-password) — used to gate
  // device-lock changes (see ProfileSwitcherScreen) so a child can't bypass
  // a locked device just by knowing the lightweight per-profile switch PIN.
  // Requires network; resolves false if unreachable (deny by default).
  verifyPassword: (password: string) => Promise<boolean>;
  // Re-enters an already-persisted session behind Face ID/Touch ID, without
  // ever touching a password — see SignUpScreen's biometric toggle. Returns
  // false (falling back to the normal sign-in screen) if there's no valid
  // hardware/enrollment or no persisted session left to unlock into.
  unlockWithBiometric: () => Promise<boolean>;
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
  // Cloudflare Turnstile response token — see SignUpScreen's widget. Omitted
  // entirely when EXPO_PUBLIC_TURNSTILE_SITE_KEY isn't configured; the
  // backend only enforces it once its own TURNSTILE_SECRET_KEY is set.
  turnstileToken?: string;
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

type LoginResult =
  | ({ ok: true } & { familyId: string; backendUserId: string })
  | { ok: false; needsVerification: true }
  | { ok: false; mfaRequired: true; mfaToken: string }
  | { ok: false; error: string };

// The backend (real bcrypt-verified account) is now the sole source of
// truth for sign-in — there's no local credential cache to fall back to
// anymore, so this always requires network. Raw fetch (not apiRequest) to
// match resetPassword/confirmPasswordReset below: a 401 here is an expected
// "wrong password" outcome, not a revoked-session signal apiRequest's
// automatic refresh handling is built around.
async function loginWithBackend(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${awsConfig.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 403 && body?.error === 'email_not_verified') {
        return { ok: false, needsVerification: true };
      }
      if (res.status === 423) {
        return { ok: false, error: body?.message ?? 'Too many failed attempts. Please try again in a few minutes.' };
      }
      if (res.status === 401) {
        return { ok: false, error: 'Invalid email or password.' };
      }
      return { ok: false, error: typeof body?.message === 'string' ? body.message : 'Could not sign in. Please try again.' };
    }

    if (body?.mfaRequired && typeof body?.mfaToken === 'string') {
      return { ok: false, mfaRequired: true, mfaToken: body.mfaToken };
    }

    const data = body as BackendAuthResult;
    const session = await persistBackendSession(data);
    return { ok: true, ...session };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

// Shared by /auth/login's mfaRequired branch and /auth/mfa/challenge — both
// return the exact same BackendAuthResult shape once a real session starts.
async function mfaChallengeWithBackend(mfaToken: string, code: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${awsConfig.apiBaseUrl}/auth/mfa/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfaToken, code }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: typeof body?.error === 'string' ? body.error : 'Invalid code. Please try again.' };
    }
    const data = body as BackendAuthResult;
    const session = await persistBackendSession(data);
    return { ok: true, ...session };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

type RegisterResult =
  | ({ ok: true; emailVerified: boolean } & { familyId: string; backendUserId: string })
  | { ok: false; needsVerification: true }
  | { ok: false; error: string };

async function registerWithBackend(payload: Record<string, unknown>): Promise<RegisterResult> {
  try {
    const res = await fetch(`${awsConfig.apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 409) {
        return { ok: false, error: 'An account with this email already exists. Try signing in instead.' };
      }
      if (typeof body?.error === 'object' && body.error?.fieldErrors) {
        const firstError = Object.values(body.error.fieldErrors as Record<string, string[]>).flat()[0];
        return { ok: false, error: firstError ?? 'Please check your details and try again.' };
      }
      return { ok: false, error: typeof body?.message === 'string' ? body.message : 'Could not create your account. Please try again.' };
    }

    const data = body as BackendAuthResult;
    const session = await persistBackendSession(data);
    return { ok: true, emailVerified: data.emailVerified ?? true, ...session };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

// Find-or-create backend link for Google/Apple sign-in — there's no
// password to check, so this can't reuse the login/register flow above.
// Never throws — an unreachable/failing backend must not block the local
// social sign-in from working.
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

// Shared by signIn's plain-login success path and completeMfaChallenge's
// post-challenge success path — both end up in the exact same authenticated
// state, just via a different number of steps to get there.
function applySuccessfulAuth(
  get: () => AuthState,
  set: (partial: Partial<AuthState>) => void,
  email: string,
  backendUserId: string,
  familyId: string,
  viaMfaChallenge: boolean,
): void {
  const existing = get().user;
  const user: AuthUser = {
    id: backendUserId,
    email,
    displayName: existing?.email === email && existing.displayName ? existing.displayName : email.split('@')[0],
    avatarColor: existing?.email === email ? existing.avatarColor : '#4A8FD9',
    familyRole: existing?.email === email ? existing.familyRole : 'parent',
    provider: 'email',
    createdAt: existing?.email === email ? existing.createdAt : new Date().toISOString(),
  };

  set({
    isAuthenticated: true,
    pendingVerificationEmail: null,
    user,
    familyId,
    backendUserId,
    // Reaching this point via a plain login (no MFA branch taken) means MFA
    // is off; reaching it via the challenge endpoint means it's on.
    mfaEnabled: viaMfaChallenge,
  });
  fetchFamilyAfterSignIn();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      pendingVerificationEmail: null,
      mfaEnabled: false,
      mfaChallenge: null,
      user: null,
      familyId: null,
      backendUserId: null,

      signUp: async (data) => {
        const normalizedEmail = data.email.toLowerCase().trim();
        if (!data.displayName.trim()) return { success: false, error: 'Please enter your name.' };
        if (!normalizedEmail.includes('@')) return { success: false, error: 'Please enter a valid email.' };
        const pw = validatePasswordStrength(data.password);
        if (!pw.valid) return { success: false, error: pw.reason };

        const result = await registerWithBackend({
          email: normalizedEmail,
          password: data.password,
          familyName: data.familyName?.trim() || `${data.lastName.trim()} Family`,
          memberName: data.displayName.trim(),
          memberRole: data.familyRole,
          // Immediately-usable fields only — avatarUri is typically a local
          // file:// URI at this point (uploaded to R2 only after signup
          // succeeds, see SignUpScreen), so it isn't sent here.
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          avatarColor: data.avatarColor,
          gender: data.gender,
          occupation: data.occupation,
          bio: data.bio,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          familyMotto: data.familyMotto,
          numberOfChildren: data.numberOfChildren,
          streetAddress: data.streetAddress,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          turnstileToken: data.turnstileToken,
        });

        if (!result.ok) {
          if ('needsVerification' in result) {
            set({ pendingVerificationEmail: normalizedEmail });
            return { success: true, needsEmailVerification: true } as any;
          }
          return { success: false, error: result.error };
        }

        const user: AuthUser = {
          id: result.backendUserId,
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

        if (!result.emailVerified) {
          set({ pendingVerificationEmail: normalizedEmail });
          return { success: true, needsEmailVerification: true } as any;
        }

        // isAuthenticated is intentionally NOT set here — AppNavigator swaps
        // to the main app the instant it goes true, which used to happen
        // before SignUpScreen's populateFromSignUp() had hydrated
        // useFamilyStore (worse, after its own resetAllStores() wiped it back
        // to blank), so the dashboard/tab bar briefly rendered against empty
        // state: no family name, and RoleGuard-gated tabs (Finance/
        // Operations) denied access because activeMember hadn't resolved
        // yet. SignUpScreen flips isAuthenticated itself once hydration
        // actually completes — see its handleSubmit.
        set({
          pendingVerificationEmail: null,
          user,
          familyId: result.familyId,
          backendUserId: result.backendUserId,
        });

        return { success: true };
      },

      signIn: async (email, password) => {
        const normalizedEmail = email.toLowerCase().trim();
        if (!normalizedEmail || !password) return { success: false, error: 'Please fill in all fields.' };

        const result = await loginWithBackend(normalizedEmail, password);

        if (!result.ok) {
          if ('needsVerification' in result) {
            set({ pendingVerificationEmail: normalizedEmail });
            return { success: false, error: 'email_not_verified' };
          }
          if ('mfaRequired' in result) {
            set({ mfaChallenge: { mfaToken: result.mfaToken } });
            return { success: false, error: 'mfa_required' };
          }
          return { success: false, error: result.error };
        }

        applySuccessfulAuth(get, set, normalizedEmail, result.backendUserId, result.familyId, false);
        return { success: true };
      },

      completeMfaChallenge: async (code) => {
        const challenge = get().mfaChallenge;
        if (!challenge) return { success: false, error: 'No pending MFA challenge.' };

        const result = await mfaChallengeWithBackend(challenge.mfaToken, code.trim());
        if (!result.ok) {
          return { success: false, error: 'error' in result ? result.error : 'Invalid code. Please try again.' };
        }

        const email = get().user?.email ?? '';
        applySuccessfulAuth(get, set, email, result.backendUserId, result.familyId, true);
        set({ mfaChallenge: null });
        return { success: true };
      },

      cancelMfaChallenge: () => set({ mfaChallenge: null }),

      mfaSetup: async () => {
        try {
          const res = await apiRequest<{ secret: string; qrCodeDataUrl: string }>('/auth/mfa/setup', { method: 'POST' });
          return { success: true, secret: res.secret, qrCodeDataUrl: res.qrCodeDataUrl };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : 'Could not start MFA setup.' };
        }
      },

      mfaEnable: async (token) => {
        try {
          const res = await apiRequest<{ enabled: boolean; backupCodes: string[] }>('/auth/mfa/enable', {
            method: 'POST',
            body: JSON.stringify({ token }),
          });
          set({ mfaEnabled: true });
          return { success: true, backupCodes: res.backupCodes };
        } catch {
          return { success: false, error: 'Invalid code. Please try again.' };
        }
      },

      mfaDisable: async (password, token) => {
        try {
          await apiRequest('/auth/mfa/disable', { method: 'POST', body: JSON.stringify({ password, token }) });
          set({ mfaEnabled: false });
          return { success: true };
        } catch {
          return { success: false, error: 'Could not disable MFA — check your password and code.' };
        }
      },

      exportMyData: async () => {
        try {
          const data = await apiRequest('/auth/export-data');
          return { success: true, data };
        } catch {
          return { success: false, error: 'Could not export your data. Please try again.' };
        }
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
        try {
          const res = await fetch(`${awsConfig.apiBaseUrl}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase().trim() }),
          });
          if (!res.ok) {
            return { success: false, error: 'Something went wrong. Please try again.' };
          }
          return { success: true };
        } catch {
          return { success: false, error: 'Could not reach the server. Check your connection and try again.' };
        }
      },

      confirmPasswordReset: async (email, code, newPassword) => {
        try {
          const res = await fetch(`${awsConfig.apiBaseUrl}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase().trim(), code, newPassword }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return { success: false, error: body?.error ?? 'Invalid or expired code. Please request a new one.' };
          }
          return { success: true };
        } catch {
          return { success: false, error: 'Could not reach the server. Check your connection and try again.' };
        }
      },

      updateProfile: (updates) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...updates } });
      },

      verifyPassword: async (password) => {
        try {
          const res = await apiRequest<{ valid: boolean }>('/auth/verify-password', {
            method: 'POST',
            body: JSON.stringify({ password }),
          });
          return res.valid;
        } catch {
          return false;
        }
      },

      unlockWithBiometric: async () => {
        try {
          const [hasHardware, isEnrolled] = await Promise.all([
            LocalAuthentication.hasHardwareAsync(),
            LocalAuthentication.isEnrolledAsync(),
          ]);
          if (!hasHardware || !isEnrolled) return false;

          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock Family Command Center',
          });
          if (!result.success) return false;

          // Gates re-entry into an already-persisted session only — never
          // touches a password. Nothing to unlock into if the session was
          // cleared (signed out) since it was last used.
          const [accessToken, refreshToken] = await Promise.all([
            secureStorage.getToken('access_token'),
            secureStorage.getToken('refresh_token'),
          ]);
          if (!accessToken || !refreshToken || !get().user) return false;

          set({ isAuthenticated: true });
          fetchFamilyAfterSignIn();
          return true;
        } catch {
          return false;
        }
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
        mfaEnabled: state.mfaEnabled,
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
