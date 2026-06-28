import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useFamilyStore } from '../../store/useFamilyStore';
import { colors } from '../../theme/colors';

export function FamilyInviteQRScreen() {
  const family = useFamilyStore((s) => s.family);

  // Prevent fake fallback data
  if (!family?.id) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Family Found</Text>
        <Text style={styles.emptySubtitle}>
          Please create or load your family profile first.
        </Text>
      </View>
    );
  }

  const inviteData = JSON.stringify({
    type: 'family-invite',
    familyId: family.id,
    familyName: family.name,
    createdAt: new Date().toISOString(),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan to Join Family</Text>

      <View style={styles.qrCard}>
        <QRCode value={inviteData} size={240} />
      </View>

      <Text style={styles.familyName}>{family.name}</Text>

      {family.motto ? (
        <Text style={styles.motto}>"{family.motto}"</Text>
      ) : null}

      <Text style={styles.subtitle}>
        Have your spouse, kids, or guardians scan this QR code to request access
        to your Family Command Center.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 30,
  },

  qrCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    elevation: 4,
  },

  familyName: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },

  motto: {
    marginTop: 8,
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.textSecondary,
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 24,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
});