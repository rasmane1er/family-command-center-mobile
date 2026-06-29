import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as SecureStore from 'expo-secure-store';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
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
  city?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  provider: 'email' | 'apple' | 'google';
  createdAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;

  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: SignUpData) => Promise<{ success: boolean; error?: string }>;
  signInWithSocial: (user: Omit<AuthUser, 'createdAt'>) => void;
  signOut: () => void;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<AuthUser>) => void;
}

export interface SignUpData {
  displayName: string;
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
  city?: string;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,

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
          city: data.city,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          provider: 'email',
          createdAt: new Date().toISOString(),
        };

        set({ isAuthenticated: true, user });
        return { success: true };
      },

      signIn: async (email, password) => {
        const normalizedEmail = email.toLowerCase().trim();
        if (!normalizedEmail || !password) return { success: false, error: 'Please fill in all fields.' };

        const credentials = (await getStoredCredentials()) ?? {};
        const stored = credentials[normalizedEmail];

        if (!stored) return { success: false, error: 'No account found with this email.' };

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
        return { success: true };
      },

      signInWithSocial: (userData) => {
        const user: AuthUser = {
          ...userData,
          createdAt: new Date().toISOString(),
        };
        set({ isAuthenticated: true, user });
      },

      signOut: () => {
        set({ isAuthenticated: false, user: null });
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
    }),
    {
      name: 'family-command-center-auth',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);
