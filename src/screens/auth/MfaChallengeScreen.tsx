import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';

// Shown by AuthNavigator whenever useAuthStore.mfaChallenge is set — i.e.
// the password step of sign-in just succeeded and the account has TOTP MFA
// enabled. Accepts either a 6-digit authenticator code or an XXXXX-XXXXX
// backup code.
export function MfaChallengeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const completeMfaChallenge = useAuthStore((s) => s.completeMfaChallenge);
  const cancelMfaChallenge = useAuthStore((s) => s.cancelMfaChallenge);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    const result = await completeMfaChallenge(code.trim());
    setLoading(false);
    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error ?? t('auth.screens.mfaChallenge.invalidCode'));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Navigation handled automatically by AppNavigator watching isAuthenticated
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#040D1A', '#0A1E3D', '#0F2952']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <Pressable style={styles.backButton} onPress={() => Alert.alert(
          t('auth.screens.mfaChallenge.cancelTitle'),
          t('auth.screens.mfaChallenge.cancelMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.ok'), style: 'destructive', onPress: cancelMfaChallenge },
          ],
        )}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={36} color="#4A8FD9" />
        </View>

        <Text style={styles.title}>{t('auth.screens.mfaChallenge.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.screens.mfaChallenge.subtitle')}</Text>

        <TextInput
          style={styles.input}
          placeholder={t('auth.screens.mfaChallenge.placeholder')}
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={code}
          onChangeText={(v) => { setCode(v); setError(null); }}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          maxLength={11}
          onSubmitEditing={handleSubmit}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={[styles.submitButton, (!code.trim() || loading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!code.trim() || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{t('auth.screens.mfaChallenge.verify')}</Text>}
        </Pressable>

        <Text style={styles.hint}>{t('auth.screens.mfaChallenge.backupHint')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#040D1A' },
  content: { flex: 1, paddingHorizontal: 28, alignItems: 'center' },
  backButton: { position: 'absolute', left: 0, top: 0, padding: 8 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(74,143,217,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20, marginTop: 24,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 32, lineHeight: 21 },
  input: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 18, fontSize: 20, letterSpacing: 4, color: '#fff', textAlign: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  errorText: { color: '#FF6B6B', fontSize: 13, marginTop: 10, textAlign: 'center' },
  submitButton: {
    width: '100%', backgroundColor: '#4A8FD9', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 20,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center', marginTop: 18 },
});
