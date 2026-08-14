import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { useGuardianStore } from '../../../store/useGuardianStore';
import { useFamilyStore } from '../../../store/useFamilyStore';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/spacing';

// Plain-language summary of GUARDIAN_DATA_CATEGORIES from the API
// (family-command-center-api/src/routes/guardian.ts) — keep in sync if that
// list ever changes.
const CONSENT_ITEMS = [
  'Real-time and historical location',
  'App usage and screen time',
  'Ability to remotely lock the device',
  'Web content filtering activity',
  'Push notifications sent to the device',
];

// Parent-side screen: parent picks a child member, calls POST /guardian/devices/register
// to get a 6-char pairing code, then shows it for the child to enter in the
// Family Guardian child app (family-guardian-child).
export function PairChildDeviceScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);
  const generateChildPairingCode = useGuardianStore((s) => s.generateChildPairingCode);
  const checkGuardianConsent = useGuardianStore((s) => s.checkGuardianConsent);
  const grantGuardianConsent = useGuardianStore((s) => s.grantGuardianConsent);

  const children = members.filter((m) => m.role === 'child');

  const [selectedId, setSelectedId] = useState<string | null>(
    children.length === 1 ? children[0].id : null,
  );
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // COPPA: before this parent can generate a pairing code for a child, they
  // must consent to the data collection Family Guardian will do once that
  // child's device is paired — see POST /guardian/devices/register's
  // server-side enforcement in the API, which rejects registration outright
  // if no active GuardianConsent exists for the memberId.
  const [consentStatus, setConsentStatus] = useState<'checking' | 'needed' | 'granted' | null>(null);
  const [consenting, setConsenting] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  const selectedChild = children.find((m) => m.id === selectedId);

  useEffect(() => {
    if (!selectedId) {
      setConsentStatus(null);
      return;
    }
    let cancelled = false;
    setConsentStatus('checking');
    checkGuardianConsent(selectedId)
      .then((hasConsent) => {
        if (!cancelled) setConsentStatus(hasConsent ? 'granted' : 'needed');
      })
      .catch(() => {
        // Fail closed — still require an explicit consent tap rather than
        // silently treating a network error as "consent granted".
        if (!cancelled) setConsentStatus('needed');
      });
    return () => { cancelled = true; };
  }, [selectedId, checkGuardianConsent]);

  const handleConsent = async () => {
    if (!selectedId) return;
    setConsenting(true);
    setConsentError(null);
    try {
      await grantGuardianConsent(selectedId);
      setConsentStatus('granted');
    } catch {
      setConsentError('Could not save your consent. Check your connection and try again.');
    } finally {
      setConsenting(false);
    }
  };

  const generate = async () => {
    if (!selectedId || !selectedChild) return;
    setLoading(true);
    setError(null);
    try {
      const deviceName = `${selectedChild.name}'s Phone`;
      const generated = await generateChildPairingCode({
        deviceName,
        platform: 'ios',
        memberId: selectedId,
      });
      setCode(generated);
    } catch {
      setError('Could not generate a pairing code. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const qrData = code
    ? JSON.stringify({ type: 'device-pair', pairingCode: code, familyId: family?.id })
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#081B33', '#0F2952', '#1E4A8A']}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button"
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.getParent()?.navigate('Home')}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Pair Child Device</Text>
          <View style={{ width: 38 }} />
        </View>
        <Text style={styles.headerSub}>
          Generate a code for your child to enter in the Family Guardian app
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Step 1: pick child */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.sectionTitle}>1. Select Child</Text>
          {children.length === 0 ? (
            <Text style={styles.noChildren}>
              No child members found. Add a child member to your family first.
            </Text>
          ) : (
            children.map((child) => (
              <Pressable accessibilityRole="button"
                key={child.id}
                style={[styles.memberRow, selectedId === child.id && styles.memberRowSelected]}
                onPress={() => { setSelectedId(child.id); setCode(null); setError(null); }}
              >
                <View style={[styles.avatar, { backgroundColor: child.avatarColor ?? colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {child.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName}>{child.name}</Text>
                {selectedId === child.id && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </Pressable>
            ))
          )}
        </View>

        {/* Step 2: COPPA consent — required before a pairing code can be generated */}
        {selectedChild && consentStatus !== 'granted' && (
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.sectionTitle}>2. Data Collection Consent</Text>
            <Text style={styles.hint}>
              As {selectedChild.name}&apos;s parent or guardian, please review what Family
              Guardian will collect once {selectedChild.name}&apos;s device is paired:
            </Text>
            <View style={styles.consentList}>
              {CONSENT_ITEMS.map((item) => (
                <View key={item} style={styles.consentItemRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  <Text style={styles.consentItemText}>{item}</Text>
                </View>
              ))}
            </View>
            {consentError && (
              <Text style={styles.errorText}>{consentError}</Text>
            )}
            <Pressable accessibilityRole="button"
              style={[styles.generateBtn, (consenting || consentStatus === 'checking') && { opacity: 0.6 }]}
              onPress={handleConsent}
              disabled={consenting || consentStatus === 'checking'}
            >
              {consenting || consentStatus === 'checking' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                  <Text style={styles.generateBtnText}>I Consent — Continue</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Step 3: generate */}
        {selectedChild && consentStatus === 'granted' && !code && (
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.sectionTitle}>3. Generate Pairing Code</Text>
            <Text style={styles.hint}>
              A 6-character code will be created for {selectedChild.name}. Have them
              open the Family Guardian app on their device and enter it there.
            </Text>
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            <Pressable accessibilityRole="button"
              style={[styles.generateBtn, loading && { opacity: 0.6 }]}
              onPress={generate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="key-outline" size={18} color="#fff" />
                  <Text style={styles.generateBtnText}>Generate Code</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Step 4: show code */}
        {code && (
          <View style={[styles.card, shadows.card, { alignItems: 'center' }]}>
            <Text style={styles.sectionTitle}>4. Share This Code</Text>
            <Text style={styles.hint}>
              Have {selectedChild?.name} open the Family Guardian app and enter this code:
            </Text>

            <View style={styles.codeBubble}>
              <Text style={styles.codeText}>{code}</Text>
            </View>

            {qrData && (
              <View style={styles.qrWrap}>
                <QRCode value={qrData} size={160} />
                <Text style={styles.qrHint}>Or scan the QR code</Text>
              </View>
            )}

            <Pressable accessibilityRole="button"
              style={styles.regenerateBtn}
              onPress={() => { setCode(null); setError(null); }}
            >
              <Ionicons name="refresh" size={15} color={colors.primary} />
              <Text style={styles.regenerateBtnText}>Generate New Code</Text>
            </Pressable>
          </View>
        )}

        {/* Instructions */}
        <View style={[styles.card, styles.infoCard, shadows.card]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={18} color={colors.info} />
            <Text style={styles.infoTitle}>How It Works</Text>
          </View>
          {[
            'Download the "Family Guardian" app on the child\'s device.',
            'Open the app — it shows a code entry screen automatically.',
            'Enter the 6-character code from this screen.',
            'The device is now paired and will appear in your Guardian Dashboard.',
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },

  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
  },

  content: { padding: 16, gap: 16 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },

  noChildren: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 8,
  },

  memberRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  memberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },

  errorText: {
    fontSize: 13,
    color: colors.danger,
    marginBottom: 12,
  },

  consentList: {
    gap: 10,
    marginBottom: 18,
  },

  consentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  consentItemText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },

  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },

  generateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  codeBubble: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 32,
    backgroundColor: '#E8EEF9',
    marginBottom: 16,
    minWidth: 240,
    alignItems: 'center',
  },

  codeText: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 8,
    fontFamily: 'monospace' as any,
  },

  qrWrap: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },

  qrHint: {
    fontSize: 12,
    color: colors.textMuted,
  },

  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },

  regenerateBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },

  infoCard: {
    backgroundColor: colors.infoLight,
  },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.info,
  },

  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
  },

  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },

  stepNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },

  stepText: {
    flex: 1,
    fontSize: 13,
    color: colors.info,
    lineHeight: 20,
  },
});
