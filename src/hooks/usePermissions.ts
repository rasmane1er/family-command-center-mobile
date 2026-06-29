import { useFamilyStore } from '../store/useFamilyStore';
import type { MemberPermissions } from '../types';

const FULL_PERMISSIONS: MemberPermissions = {
  viewFinance: true, manageFinance: true, viewTasks: true, manageTasks: true,
  viewCalendar: true, manageCalendar: true, viewHealth: true, manageHealth: true,
  viewDocuments: true, manageDocuments: true, viewFamily: true, manageFamily: true,
  viewOperations: true, manageOperations: true, approveRequests: true,
  viewAI: true, manageAI: true, switchProfiles: true, viewAllProfiles: true,
};

export function usePermissions(): MemberPermissions {
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const activeMember = members.find((m) => m.id === activeMemberId);
  if (!activeMember) return FULL_PERMISSIONS;
  if (activeMember.isAdmin) return FULL_PERMISSIONS;
  return activeMember.permissions ?? FULL_PERMISSIONS;
}

export function useHasPermission(key: keyof MemberPermissions): boolean {
  const perms = usePermissions();
  return perms[key] === true;
}
