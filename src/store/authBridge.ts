/**
 * Zero-import bridge for auth state.
 *
 * Stores that need familyId/user/signOut import from here instead of
 * useAuthStore to break the circular dependency:
 *   useAuthStore → resetAllStores → store → useAuthStore
 *
 * useAuthStore registers itself here immediately after the store is created.
 */

import type { AuthUser } from './useAuthStore';

interface AuthSnapshot {
  user: AuthUser | null;
  familyId: string | null;
  backendUserId: string | null;
}

type Getter = () => AuthSnapshot;
type SignOut = () => void;

let _get: Getter = () => ({ user: null, familyId: null, backendUserId: null });
let _signOut: SignOut = () => {};

export function registerAuthBridge(get: Getter, signOut: SignOut) {
  _get = get;
  _signOut = signOut;
}

export const authBridge = {
  getSnapshot: (): AuthSnapshot => _get(),
  signOut: (): void => _signOut(),
};
