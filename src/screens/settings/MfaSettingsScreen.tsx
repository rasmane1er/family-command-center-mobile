import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../theme/ThemeContext';

type Step = 'status' | 'setup' | 'backupCodes' | 'disable';

export function MfaSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const mfaEnabled = useAuthStore((s) => s.mfaEnabled);
  const mfaSetup = useAuthStore((s) => s.mfaSetup);
  const mfaEnable = useAuthStore((s) => s.mfaEnable);
  const mfaDisable = useAuthStore((s) => s.mfaDisable);

  const [step, setStep] = useState<Step>('status');
  const [loading, setLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    const res = await mfaSetup();
    setLoading(false);
    if (!res.success) {
      Alert.alert(t('common.error'), res.error ?? 'Could not start setup.');
      return;
    }
    setQrCodeDataUrl(res.qrCodeDataUrl ?? null);
    setSecret(res.secret ?? null);
    setStep('setup');
  };

  const confirmEnable = async () => {
    if (code.trim().length !== 6) return;
    setLoading(true);
    setError(null);
    const res = await mfaEnable(code.trim());
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? 'Invalid code.');
      return;
    }
    setBackupCodes(res.backupCodes ?? []);
    setCode('');
    setStep('backupCodes');
  };

  const confirmDisable = async () => {
    if (!password || code.trim().length < 6) return;
    setLoading(true);
    setError(null);
    const res = await mfaDisable(password, code.trim());
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? 'Could not disable two-factor authentication.');
      return;
    }
    setPassword('');
    setCode('');
    setStep('status');
    Alert.alert(t('common.success', 'Success'), 'Two-factor authentication has been turned off.');
  };

  const s = styles(colors, isDark);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" onPress={() => (step === 'status' ? navigation.goBack() : setStep('status'))} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Two-Factor Authentication</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {step === 'status' && (
          <>
            <View style={s.statusCard}>
              <Ionicons
                name={mfaEnabled ? 'shield-checkmark' : 'shield-outline'}
                size={40}
                color={mfaEnabled ? '#34C759' : colors.textMuted}
              />
              <Text style={s.statusTitle}>{mfaEnabled ? 'Two-factor authentication is on' : 'Two-factor authentication is off'}</Text>
              <Text style={s.statusSubtitle}>
                {mfaEnabled
                  ? 'A code from your authenticator app is required every time you sign in.'
                  : 'Add an extra layer of security — a code from an authenticator app will be required to sign in, on top of your password.'}
              </Text>
            </View>

            {mfaEnabled ? (
              <Pressable accessibilityRole="button" style={s.dangerButton} onPress={() => setStep('disable')}>
                <Text style={s.dangerButtonText}>Turn Off Two-Factor Authentication</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" style={s.primaryButton} onPress={startSetup} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryButtonText}>Set Up Two-Factor Authentication</Text>}
              </Pressable>
            )}
          </>
        )}

        {step === 'setup' && (
          <>
            <Text style={s.stepInstructions}>
              1. Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password, etc.)
            </Text>
            {qrCodeDataUrl && <Image source={{ uri: qrCodeDataUrl }} style={s.qrImage} resizeMode="contain" />}
            {secret && (
              <Pressable accessibilityRole="button"
                style={s.secretRow}
                onPress={() => { Clipboard.setStringAsync(secret); Alert.alert('Copied', 'Manual entry key copied to clipboard.'); }}
              >
                <Text style={s.secretLabel}>Can't scan? Enter manually:</Text>
                <Text style={s.secretValue}>{secret}</Text>
              </Pressable>
            )}
            <Text style={s.stepInstructions}>2. Enter the 6-digit code your app generates</Text>
            <TextInput accessibilityLabel="000000"
              style={s.codeInput}
              placeholder="000000"
              placeholderTextColor={colors.textMuted}
              value={code}
              onChangeText={(v) => { setCode(v); setError(null); }}
              keyboardType="number-pad"
              maxLength={6}
            />
            {error && <Text style={s.errorText}>{error}</Text>}
            <Pressable accessibilityRole="button" style={s.primaryButton} onPress={confirmEnable} disabled={loading || code.trim().length !== 6}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryButtonText}>Verify & Turn On</Text>}
            </Pressable>
          </>
        )}

        {step === 'backupCodes' && (
          <>
            <Ionicons name="checkmark-circle" size={40} color="#34C759" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={s.statusTitle}>Two-factor authentication is on</Text>
            <Text style={s.statusSubtitle}>
              Save these backup codes somewhere safe. Each one can be used once to sign in if you lose access to your authenticator app.
            </Text>
            <View style={s.backupCodesGrid}>
              {backupCodes.map((c) => (
                <Text key={c} style={s.backupCode}>{c}</Text>
              ))}
            </View>
            <Pressable accessibilityRole="button"
              style={s.secondaryButton}
              onPress={() => { Clipboard.setStringAsync(backupCodes.join('\n')); Alert.alert('Copied', 'Backup codes copied to clipboard.'); }}
            >
              <Text style={s.secondaryButtonText}>Copy Codes</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={s.primaryButton} onPress={() => { setStep('status'); setQrCodeDataUrl(null); setSecret(null); }}>
              <Text style={s.primaryButtonText}>Done</Text>
            </Pressable>
          </>
        )}

        {step === 'disable' && (
          <>
            <Text style={s.stepInstructions}>Confirm your password and a current code to turn off two-factor authentication.</Text>
            <TextInput accessibilityLabel="Password"
              style={s.textInput}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={(v) => { setPassword(v); setError(null); }}
              secureTextEntry
            />
            <TextInput accessibilityLabel="6-digit code or backup code"
              style={s.textInput}
              placeholder="6-digit code or backup code"
              placeholderTextColor={colors.textMuted}
              value={code}
              onChangeText={(v) => { setCode(v); setError(null); }}
              autoCapitalize="characters"
            />
            {error && <Text style={s.errorText}>{error}</Text>}
            <Pressable accessibilityRole="button" style={s.dangerButton} onPress={confirmDisable} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.dangerButtonText}>Confirm: Turn Off</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = (colors: any, isDark: boolean) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  content: { padding: 20, paddingBottom: 60 },
  statusCard: {
    alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16,
    padding: 24, marginBottom: 24,
  },
  statusTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 12, textAlign: 'center' },
  statusSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  primaryButton: { backgroundColor: '#4A8FD9', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: isDark ? colors.surface : '#EEF2F7', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  secondaryButtonText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  dangerButton: { backgroundColor: '#FF3B30', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  dangerButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  stepInstructions: { fontSize: 14, color: colors.text, marginBottom: 14, lineHeight: 20 },
  qrImage: { width: 220, height: 220, alignSelf: 'center', marginBottom: 16, backgroundColor: '#fff', borderRadius: 12 },
  secretRow: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 20 },
  secretLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  secretValue: { fontSize: 15, color: colors.text, fontFamily: 'Courier', letterSpacing: 1 },
  codeInput: {
    backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
    fontSize: 20, letterSpacing: 6, color: colors.text, textAlign: 'center', marginBottom: 16,
  },
  textInput: {
    backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
    fontSize: 15, color: colors.text, marginBottom: 12,
  },
  errorText: { color: '#FF3B30', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  backupCodesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 16,
  },
  backupCode: {
    width: '48%', fontSize: 14, fontFamily: 'Courier', color: colors.text,
    paddingVertical: 6, textAlign: 'center',
  },
});
