import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useFamilyStore } from '../../store/useFamilyStore';
import { colors } from '../../theme/colors';

interface RoleGuardProps {
  children: React.ReactNode;
  allowParent?: boolean;
  allowChild?: boolean;
  allowGrandparent?: boolean;
  title?: string;
  message?: string;
}

export function RoleGuard({
  children,
  allowParent = false,
  allowChild = false,
  allowGrandparent = false,
  title = 'Access Restricted',
  message = 'This section is not available for the active profile.',
}: RoleGuardProps) {
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);

  const activeMember = members.find((member) => member.id === activeMemberId);

  const isParent =
    activeMember?.role === 'parent' ||
    activeMember?.role === 'guardian' ||
    activeMember?.isAdmin === true;

  const isChild = activeMember?.role === 'child';
  const isGrandparent = activeMember?.role === 'grandparent';

  const allowed =
    (allowParent && isParent) ||
    (allowChild && isChild) ||
    (allowGrandparent && isGrandparent);

  if (!allowed) {
    return (
      <View style={styles.deniedContainer}>
        <Text style={styles.deniedTitle}>{title}</Text>
        <Text style={styles.deniedText}>{message}</Text>
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