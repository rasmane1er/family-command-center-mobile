import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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
import { CollapsibleHeader } from '../../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';

// Shown on a CHILD'S device: registers this physical device with the
// backend (POST /guardian/devices/register) and displays the real,
// server-issued pairing code/QR for a parent to scan or type in on
// EnterPairingCodeScreen. This screen used to fabricate a random code
// locally and show it on the PARENT's device — inverted from what the
// backend actually expects (register is child-side, pair is parent-side).
export function RegisterChildDeviceScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();

  const thisDeviceId = useGuardianStore((s) => s.thisDeviceId);
  const myPairingCode = useGuardianStore((s) => s.myPairingCode);
  const devices = useGuardianStore((s) => s.devices);
  const registerThisDevice = useGuardianStore((s) => s.registerThisDevice);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);

  const activeMember = members.find((m) => m.id === activeMemberId);
  const thisDevice = devices.find((d) => d.id === thisDeviceId);
  const alreadyPaired = !!thisDevice?.isPaired;

  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async () => {
    if (!activeMemberId) {
      setError('Select a profile for this device first.');
      return;
    }
    setIsRegistering(true);
    setError(null);
    try {
      const deviceName = `${activeMember?.name ?? 'My'}'s ${Platform.OS === 'ios' ? 'iPhone' : 'Phone'}`;
      await registerThisDevice({
        deviceName,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        memberId: activeMemberId,
      });
    } catch {
      setError('Could not reach the family server. Check your connection and try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  useEffect(() => {
    if (!thisDeviceId && !alreadyPaired) {
      register();
    }
  }, []);

  const handleRefresh = () => {
    register();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const code = myPairingCode ?? '------';

  const formattedCode =
    code.length === 6 ? `${code.slice(0, 3)} · ${code.slice(3)}` : code;

  const pairingData = JSON.stringify({
    type: 'device-pair',
    familyId: family?.id,
    pairingCode: myPairingCode,
    createdAt: new Date().toISOString(),
  });

  const screenHeader = (
    <LinearGradient
      colors={['#081B33', '#0F2952', '#1E4A8A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.headerGlow} />

      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={handleCancel} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.headerTextBlock}>
          <Text style={styles.headerEyebrow}>Guardian Setup</Text>
          <Text style={styles.headerTitle}>Register This Device</Text>
          <Text style={styles.headerSubtitle}>
            Connect this device securely to your family.
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons name="phone-portrait" size={22} color="#fff" />
        </View>
      </View>

      <View style={styles.headerStats}>
        <View style={styles.statCard}>
          <Ionicons name="keypad" size={18} color="#fff" />
          <Text style={styles.statValue}>6-digit</Text>
          <Text style={styles.statLabel}>Pairing Code</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="shield-checkmark" size={18} color="#fff" />
          <Text style={styles.statValue}>Secure</Text>
          <Text style={styles.statLabel}>Connection</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="flash" size={18} color="#fff" />
          <Text style={styles.statValue}>Instant</Text>
          <Text style={styles.statLabel}>Activation</Text>
        </View>
      </View>

      <View style={styles.headerPill}>
        <Ionicons name="information-circle" size={14} color="#fff" />
        <Text style={styles.headerPillText}>
          Show this code to a parent to connect this device.
        </Text>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#081B33', '#0F2952']}
      style={[styles.compactHeader, { paddingTop: insets.top }]}
    >
      <Pressable accessibilityRole="button" onPress={handleCancel} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>

      <View style={styles.compactTitleBlock}>
        <Text style={styles.compactTitle}>{t('guardian.registerDevice')}</Text>
        <Text style={styles.compactSubtitle}>{formattedCode}</Text>
      </View>

      <Pressable accessibilityRole="button" onPress={handleRefresh} style={styles.compactAction}>
        <Ionicons name="refresh" size={18} color="#fff" />
      </Pressable>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({
          onScroll,
          onScrollEndDrag,
          onMomentumScrollEnd,
          scrollEventThrottle,
          contentPaddingTop,
        }) => (
          <ScrollView
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom: 100,
                paddingTop: contentPaddingTop,
              },
            ]}
          >
            {alreadyPaired ? (
              <View style={[styles.codeCard, shadows.md]}>
                <Ionicons name="checkmark-circle" size={40} color={colors.success} />
                <Text style={styles.codeCardTitle}>This device is already paired</Text>
                <Text style={styles.codeHint}>{thisDevice?.deviceName}</Text>
              </View>
            ) : isRegistering ? (
              <View style={[styles.codeCard, shadows.md]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.codeHint}>Registering this device…</Text>
              </View>
            ) : error ? (
              <View style={[styles.codeCard, shadows.md]}>
                <Ionicons name="alert-circle" size={32} color={colors.danger} />
                <Text style={styles.codeCardTitle}>{error}</Text>
                <Pressable accessibilityRole="button" style={styles.refreshBtn} onPress={handleRefresh}>
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                  <Text style={styles.refreshBtnText}>Try Again</Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.codeCard, shadows.md]}>
                <View style={styles.codeHeader}>
                  <Ionicons
                    name="phone-portrait"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.codeCardTitle}>Pairing Code</Text>
                </View>

                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{formattedCode}</Text>
                </View>

                <Text style={styles.codeHint}>
                  Give this code to a parent, or let them scan the QR code below.
                </Text>

                <Pressable accessibilityRole="button" style={styles.refreshBtn} onPress={handleRefresh}>
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                  <Text style={styles.refreshBtnText}>Generate New Code</Text>
                </Pressable>
              </View>
            )}

            <View style={[styles.instructionsCard, shadows.card]}>
              <Text style={styles.instructionsTitle}>How to Pair</Text>

              {[
                {
                  step: '1',
                  text: 'On a parent’s device, open Family Guardian and tap “Add Device”.',
                },
                {
                  step: '2',
                  text: 'They’ll scan the QR code below, or type in the code shown above.',
                },
                {
                  step: '3',
                  text: `The code is: ${formattedCode}`,
                },
                {
                  step: '4',
                  text: 'Once paired, this device will appear in their Guardian Dashboard.',
                },
              ].map((item) => (
                <View key={item.step} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{item.step}</Text>
                  </View>

                  <Text style={styles.stepText}>{item.text}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.qrCard, shadows.card]}>
              <Text style={styles.qrCardTitle}>Or Show QR Code</Text>

              <View style={styles.qrPlaceholder}>
                <View style={styles.qrInner}>
                  {myPairingCode ? (
                    <QRCode value={pairingData} size={160} />
                  ) : (
                    <Ionicons name="qr-code" size={80} color={colors.primary} />
                  )}
                  <Text style={styles.qrCodeLabel}>{formattedCode}</Text>
                </View>

                <Text style={styles.qrNote}>
                  A parent scans this from the “Add Device” screen.
                </Text>
              </View>
            </View>

            <View style={[styles.tipsCard, shadows.card]}>
              <View style={styles.tipsHeader}>
                <Ionicons
                  name="information-circle"
                  size={18}
                  color={colors.info}
                />
                <Text style={styles.tipsTitle}>Tips</Text>
              </View>

              {[
                'Keep both devices on the same Wi-Fi network for faster pairing.',
                'The parent must have Family Command Center installed too.',
                'Parental controls take effect immediately after pairing.',
              ].map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            <Pressable accessibilityRole="button" style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Cancel Pairing</Text>
            </Pressable>
          </ScrollView>
        )}
      </CollapsibleHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },

  headerGlow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 5,
  },

  backBtn: {
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextBlock: { flex: 1 },

  headerEyebrow: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.58)',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 2,
  },

  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
  },

  headerSubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 3,
    fontWeight: '600',
  },

  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  headerStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 5,
  },

  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  statValue: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    marginTop: 5,
  },

  statLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 2,
  },

  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },

  headerPillText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },

  compactHeader: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  compactTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },

  compactTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  compactSubtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    marginTop: 1,
    fontFamily: 'monospace' as any,
    letterSpacing: 1.5,
  },

  compactAction: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { padding: 16 },

  codeCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },

  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  codeCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },

  codeBox: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 30,
    backgroundColor: '#E8EEF9',
    marginBottom: 12,
    minWidth: 240,
    alignItems: 'center',
  },

  codeText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 6,
    fontFamily: 'monospace' as any,
  },

  codeHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
    textAlign: 'center',
  },

  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  refreshBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },

  instructionsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  instructionsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },

  stepRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
    alignItems: 'flex-start',
  },

  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  stepNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },

  stepText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.text,
    lineHeight: 20,
  },

  qrCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  qrCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },

  qrPlaceholder: { alignItems: 'center' },

  qrInner: {
    width: 160,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: colors.background,
  },

  qrCodeLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 3,
    fontFamily: 'monospace' as any,
  },

  qrNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },

  tipsCard: {
    backgroundColor: colors.infoLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },

  tipsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.info,
  },

  tipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    alignItems: 'flex-start',
  },

  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.info,
    marginTop: 7,
    flexShrink: 0,
  },

  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.info,
    lineHeight: 18,
  },

  cancelBtn: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});