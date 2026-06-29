/**
 * Auto-populates family store from sign-up profile data.
 * Called once after a new account is created.
 */
import { useFamilyStore } from '../store/useFamilyStore';
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

export function populateFromSignUp(user: AuthUser) {
  const familyId = `family-${user.id}`;
  const memberId = `member-${user.id}`;
  const now = new Date().toISOString();

  const family: Family = {
    id: familyId,
    name: user.familyName || `The ${user.displayName.split(' ').pop() || user.displayName} Family`,
    motto: user.familyMotto,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: 'USD',
    militaryMode: false,
    premiumTier: 'free',
    healthScore: 75,
    createdAt: now,
    ...(user.city ? { homeAddress: user.city } : {}),
  };

  const member: FamilyMember = {
    id: memberId,
    familyId,
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
