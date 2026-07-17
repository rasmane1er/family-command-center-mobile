import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useFamilyStore } from '../../store/useFamilyStore';
import { usePermissions } from '../../hooks/usePermissions';
import { colors } from '../../theme/colors';
import type { MemberPermissions } from '../../types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowParent?: boolean;
  allowChild?: boolean;
  allowGrandparent?: boolean;
  allowCaregiver?: boolean;
  permission?: keyof MemberPermissions;
  title?: string;
  message?: string;
}

export function RoleGuard({
  children,
  allowParent = false,
  allowChild = false,
  allowGrandparent = false,
  allowCaregiver = false,
  permission,
  title,
  message,
}: RoleGuardProps) {
  const { t } = useTranslation();
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const perms = usePermissions();

  const activeMember = members.find((member) => member.id === activeMemberId);

  let allowed: boolean;

  if (permission !== undefined) {
    // Permission-based check
    allowed = perms[permission] === true;
  } else {
    // Legacy role-based check
    const isParent =
      activeMember?.role === 'parent' ||
      activeMember?.role === 'guardian' ||
      activeMember?.isAdmin === true;

    const isChild = activeMember?.role === 'child';
    const isGrandparent = activeMember?.role === 'grandparent';
    const isCaregiver = activeMember?.role === 'caregiver';

    allowed =
      (allowParent && isParent) ||
      (allowChild && isChild) ||
      (allowGrandparent && isGrandparent) ||
      (allowCaregiver && isCaregiver);
  }

  if (!allowed) {
    return (
      <View style={styles.deniedContainer}>
        <Text style={styles.deniedTitle}>{title ?? t('screens.shared.accessRestrictedTitle')}</Text>
        <Text style={styles.deniedText}>{message ?? t('screens.shared.accessRestrictedMsg')}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  deniedContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deniedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  deniedText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
