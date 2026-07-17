import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useFamilyStore } from '../../store/useFamilyStore';
import { colors } from '../../theme/colors';
import { useTranslation } from 'react-i18next';

export function FamilyInviteQRScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const family = useFamilyStore((s) => s.family);

  if (!family?.id) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar style="dark" />
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtnLight}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Ionicons name="people-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>{t('family.screens.familyInviteQR.noFamilyTitle')}</Text>
        <Text style={styles.emptySubtitle}>
          {t('family.screens.familyInviteQR.noFamilySubtitle')}
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

  // 6-char code: use backend-issued inviteCode when available, otherwise
  // derive a stable code from the last 6 alphanumeric chars of the family id.
  const shortCode =
    family.inviteCode ??
    family.id.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-6);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#0F2952', '#16476E']}
        style={[styles.header, { paddingTop: insets.top + 6 }]}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('inviteQR.title')}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.instruction}>
          {t('family.screens.familyInviteQR.instruction')}
        </Text>

        <View style={styles.qrCard}>
          <QRCode value={inviteData} size={220} />
        </View>

        <Text style={styles.familyName}>{family.name}</Text>
        {family.motto ? (
          <Text style={styles.motto}>"{family.motto}"</Text>
        ) : null}

        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>Child Join Code</Text>
          <Text style={styles.codeValue}>{shortCode}</Text>
          <Text style={styles.codeHint}>Share this code with a child joining on their own device</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            {t('family.screens.familyInviteQR.infoText')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  instruction: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  qrCard: { backgroundColor: '#fff', padding: 20, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },
  familyName: { marginTop: 24, fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  motto: { marginTop: 6, fontSize: 14, fontStyle: 'italic', color: colors.textSecondary, textAlign: 'center' },
  codeRow: { marginTop: 20, alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16, width: '100%', borderWidth: 1.5, borderColor: colors.border },
  codeLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  codeValue: { fontSize: 32, fontWeight: '900', color: colors.primary, letterSpacing: 8, fontFamily: 'monospace' as any },
  codeHint: { fontSize: 11, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16, backgroundColor: colors.primary + '10', borderRadius: 12, padding: 14 },
  infoText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 18, fontWeight: '500' },
  emptyContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  backBtnLight: { position: 'absolute', top: 56, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
