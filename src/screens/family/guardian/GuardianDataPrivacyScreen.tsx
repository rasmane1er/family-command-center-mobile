import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as guardianService from '../../../services/guardianService';
import { useGuardianStore } from '../../../store/useGuardianStore';
import { useFamilyStore } from '../../../store/useFamilyStore';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/spacing';

// Plain-language summary of GUARDIAN_DATA_CATEGORIES from the API
// (family-command-center-api/src/routes/guardian.ts) — keep in sync with
// the identical list in PairChildDeviceScreen.tsx.
const CONSENT_ITEMS = [
  'Real-time and historical location',
  'App usage and screen time',
  'Ability to remotely lock the device',
  'Web content filtering activity',
  'Push notifications sent to the device',
];

// Retention windows — keep in sync with RETENTION_DAYS in
// family-command-center-api/src/services/retentionCleanup.ts.
const RETENTION_ITEMS = [
  { label: 'App usage & screen time', days: '90 days' },
  { label: 'Notifications & web filter activity', days: '180 days' },
  { label: 'Live location', days: "Not stored after unpairing — it isn't kept as history" },
];

// COPPA expects a "what does this app collect about my child" disclosure
// that a parent can revisit anytime, not just a one-time screen shown during
// pairing (see PairChildDeviceScreen's consent step, and the gap this closes
// — docs/PCI_COPPA_SCOPE_REVIEW.md item 1 in the API repo). Reachable from a
// paired child's device detail screen at any time.
export function GuardianDataPrivacyScreen({ route, navigation }: any) {
  const { deviceId, memberId } = route.params ?? {};
  const members = useFamilyStore((s) => s.members);
  const revokeGuardianConsentAndUnpair = useGuardianStore((s) => s.revokeGuardianConsentAndUnpair);
  const member = members.find((m) => m.id === memberId);

  const [consent, setConsent] = useState<guardianService.GuardianConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    try {
      const { consent: c } = await guardianService.getConsentStatus(memberId);
      setConsent(c);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Could not load consent details.');
    }
  }, [memberId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRevoke = () => {
    Alert.alert(
      'Revoke Data Collection Consent',
      `This immediately unpairs ${member?.name ?? "this child's"} device and permanently deletes everything Family Guardian has collected for them — location, app usage, notifications, and web filter history. This can't be undone; you'd need to pair the device again and re-consent to resume monitoring.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke & Delete Data',
          style: 'destructive',
          onPress: async () => {
            setRevoking(true);
            try {
              await revokeGuardianConsentAndUnpair(memberId);
              navigation.getParent()?.navigate('GuardianDashboard') ?? navigation.popToTop();
            } catch (e: any) {
              Alert.alert('Failed to revoke consent', e.message ?? 'Check your connection and try again.');
            } finally {
              setRevoking(false);
            }
          },
        },
      ],
    );
  };

  const header = (
    <LinearGradient colors={['#0F2952', '#1E3A6E']} style={styles.header}>
      <SafeAreaView edges={['top']} style={styles.headerInner}>
        <View style={styles.topRow}>
          <TouchableOpacity accessibilityRole="button" style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <View style={styles.shieldBadge}>
            <Ionicons name="lock-closed" size={16} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Data & Privacy</Text>
            <Text style={styles.headerSub}>{member?.name ? `For ${member.name}` : 'Family Guardian'}</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {header}
      <ScrollView contentContainerStyle={styles.body}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>What Family Guardian Collects</Text>
          <View style={styles.list}>
            {CONSENT_ITEMS.map((item) => (
              <View key={item} style={styles.listRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>How Long We Keep This Data</Text>
          <View style={styles.list}>
            {RETENTION_ITEMS.map((item) => (
              <View key={item.label} style={styles.retentionRow}>
                <Text style={styles.listText}>{item.label}</Text>
                <Text style={styles.retentionDays}>{item.days}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Your Consent Record</Text>
          {consent ? (
            <>
              <Text style={styles.listText}>
                Consented by {consent.consentedByEmail} on{' '}
                {new Date(consent.consentedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <Text style={[styles.listText, { marginTop: 4, color: colors.textMuted }]}>Policy version {consent.policyVersion}</Text>
            </>
          ) : (
            <Text style={styles.listText}>No active consent record was found for this device.</Text>
          )}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.revokeBtn, revoking && { opacity: 0.6 }]}
          onPress={handleRevoke}
          disabled={revoking || !consent}
        >
          {revoking ? (
            <ActivityIndicator color={colors.danger} size="small" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.revokeBtnText}>Revoke Consent & Unpair Device</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingBottom: 16 },
  headerInner: { paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shieldBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  body: { padding: 16, gap: 12 },
  errorText: { color: colors.danger, fontSize: 13, marginBottom: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  list: { gap: 8 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  listText: { fontSize: 13, color: colors.text, flex: 1, lineHeight: 18 },
  retentionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  retentionDays: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  revokeBtnText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});
