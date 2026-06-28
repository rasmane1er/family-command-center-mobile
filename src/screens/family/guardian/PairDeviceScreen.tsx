import React, { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGuardianStore } from '../../../store/useGuardianStore';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/spacing';

export function PairDeviceScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const activePairingCode = useGuardianStore((s) => s.activePairingCode);
  const generatePairingCode = useGuardianStore((s) => s.generatePairingCode);
  const clearPairingCode = useGuardianStore((s) => s.clearPairingCode);

  useEffect(() => {
    generatePairingCode();
    return () => {
      // Code stays active until explicitly cleared or user refreshes
    };
  }, []);

  const handleRefresh = () => {
    generatePairingCode();
  };

  const handleCancel = () => {
    clearPairingCode();
    navigation.goBack();
  };

  const code = activePairingCode ?? '------';

  // Format code as "A7X · 2K9" for readability
  const formattedCode = code.length === 6
    ? `${code.slice(0, 3)} · ${code.slice(3)}`
    : code;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F2952', '#1E4A8A']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={handleCancel} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Pair Child's Device</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {/* Code display */}
        <View style={[styles.codeCard, shadows.md]}>
          <View style={styles.codeHeader}>
            <Ionicons name="phone-portrait" size={24} color={colors.primary} />
            <Text style={styles.codeCardTitle}>Pairing Code</Text>
          </View>

          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{formattedCode}</Text>
          </View>

          <Text style={styles.codeHint}>This code expires when you leave this screen</Text>

          <Pressable style={styles.refreshBtn} onPress={handleRefresh}>
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={styles.refreshBtnText}>Generate New Code</Text>
          </Pressable>
        </View>

        {/* Instructions */}
        <View style={[styles.instructionsCard, shadows.card]}>
          <Text style={styles.instructionsTitle}>How to Pair</Text>

          {[
            { step: '1', text: 'On your child\'s device, open Family Command Center' },
            { step: '2', text: 'Tap "Connect to Family" on the welcome screen' },
            { step: '3', text: `Enter the code shown above: ${formattedCode}` },
            { step: '4', text: 'Once paired, the device will appear in your Guardian Dashboard' },
          ].map((item) => (
            <View key={item.step} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{item.step}</Text>
              </View>
              <Text style={styles.stepText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* QR placeholder */}
        <View style={[styles.qrCard, shadows.card]}>
          <Text style={styles.qrCardTitle}>Or Show QR Code</Text>
          <View style={styles.qrPlaceholder}>
            <View style={styles.qrInner}>
              <Ionicons name="qr-code" size={80} color={colors.primary} />
              <Text style={styles.qrCodeLabel}>{formattedCode}</Text>
            </View>
            <Text style={styles.qrNote}>QR scanning coming soon — use the code above for now</Text>
          </View>
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, shadows.card]}>
          <View style={styles.tipsHeader}>
            <Ionicons name="information-circle" size={18} color={colors.info} />
            <Text style={styles.tipsTitle}>Tips</Text>
          </View>
          {[
            'Keep both devices on the same Wi-Fi network for faster pairing.',
            'The child\'s device must have Family Command Center installed.',
            'Parental controls take effect immediately after pairing.',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Cancel Pairing</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: { paddingHorizontal: 20, paddingBottom: 16 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff' },

  content: { padding: 16 },

  codeCard: {
    backgroundColor: colors.card, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16,
  },

  codeHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20,
  },

  codeCardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  codeBox: {
    borderWidth: 2, borderColor: colors.primary, borderRadius: 16,
    paddingVertical: 24, paddingHorizontal: 40,
    backgroundColor: '#E8EEF9', marginBottom: 12,
    minWidth: 240, alignItems: 'center',
  },

  codeText: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 6,
    fontFamily: 'monospace' as any,
  },

  codeHint: { fontSize: 12, color: colors.textMuted, marginBottom: 16, textAlign: 'center' },

  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.background, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: colors.border,
  },

  refreshBtnText: { fontSize: 14, color: colors.primary, fontWeight: '600' },

  instructionsCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 16,
  },

  instructionsTitle: {
    fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16,
  },

  stepRow: { flexDirection: 'row', gap: 14, marginBottom: 14, alignItems: 'flex-start' },

  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  stepNumText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  stepText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },

  qrCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 16,
  },

  qrCardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 14 },

  qrPlaceholder: { alignItems: 'center' },

  qrInner: {
    width: 160, height: 160, borderRadius: 12,
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12,
    backgroundColor: colors.background,
  },

  qrCodeLabel: {
    fontSize: 14, fontWeight: '700', color: colors.primary,
    letterSpacing: 3, fontFamily: 'monospace' as any,
  },

  qrNote: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },

  tipsCard: {
    backgroundColor: colors.infoLight, borderRadius: 16, padding: 16, marginBottom: 20,
  },

  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },

  tipsTitle: { fontSize: 14, fontWeight: '700', color: colors.info },

  tipRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },

  tipDot: {
    width: 5, height: 5, borderRadius: 3, backgroundColor: colors.info,
    marginTop: 7, flexShrink: 0,
  },

  tipText: { flex: 1, fontSize: 13, color: colors.info, lineHeight: 18 },

  cancelBtn: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
  },

  cancelBtnText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
});
