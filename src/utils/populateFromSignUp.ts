/**
 * Auto-populates family store from sign-up profile data.
 * Called once after a new account is created (or a social sign-in completes).
 */
import { useFamilyStore } from '../store/useFamilyStore';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import type { AuthUser } from '../store/useAuthStore';
import type { Family, FamilyMember } from '../types';
import { defaultPermissionsForRole } from '../types';

const ROLE_MAP: Record<string, FamilyMember['role']> = {
  parent: 'parent',
  co_parent: 'parent',
  single_parent: 'parent',
  guardian: 'guardian',
  other: 'parent',
};

export async function populateFromSignUp(user: AuthUser) {
  const { familyId } = useAuthStore.getState();

  if (familyId) {
    // Real backend account already exists — hydrate the actual family/
    // members/tasks from the server instead of fabricating local-only ids
    // (`family-${user.id}`/`member-${user.id}`) that would never match what
    // the backend actually created. fetchFromServer also self-heals a
    // missing "self" member for this account, if needed.
    await useFamilyStore.getState().fetchFromServer();
    useAppStore.getState().updateSettings({ displayName: user.displayName });
    return;
  }

  // No backend link yet (offline sign-up, or social sign-in which doesn't
  // call the backend at all) — populate a local-only family so the app is
  // usable immediately. This becomes backend-linked and gets reconciled
  // automatically the next time fetchFromServer runs after a real sync.
  const localFamilyId = `family-${user.id}`;
  const memberId = `member-${user.id}`;
  const now = new Date().toISOString();

  const family: Family = {
    id: localFamilyId,
    name: user.familyName || `The ${user.displayName.split(' ').pop() || user.displayName} Family`,
    motto: user.familyMotto,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: 'USD',
    militaryMode: false,
    premiumTier: 'free',
    createdAt: now,
    ...(user.city ? { homeAddress: user.city } : {}),
  };

  const member: FamilyMember = {
    id: memberId,
    familyId: localFamilyId,
    name: user.displayName,
    role: ROLE_MAP[user.familyRole ?? 'parent'] ?? 'parent',
    avatar: user.avatarUri,
    avatarColor: user.avatarColor ?? '#4A8FD9',
    dateOfBirth: user.dateOfBirth,
    email: user.email,
    phone: user.phone,
    status: 'active',
    points: 0,
    level: 1,
    isAdmin: true,
    createdAt: now,
    isLocalProfile: false,
    linkedUserId: user.id,
    isPinProtected: false,
    permissions: defaultPermissionsForRole('parent'),
    inviteStatus: 'accepted',
  };

  useFamilyStore.getState().setFamily(family);
  useFamilyStore.getState().addMember(member);
  useFamilyStore.getState().setActiveMember(memberId);

  // Pre-fill display name in app settings
  useAppStore.getState().updateSettings({ displayName: user.displayName });
}
