import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  navigation: any;
}

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation('auth');
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { resetPassword, confirmPasswordReset } = useAuthStore();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeFocused, setCodeFocused] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const buttonScale = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer after successful send
  useEffect(() => {
    if (countdown > 0) {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sent]);

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert(t('auth.screens.forgotPassword.missingEmailTitle'), t('auth.screens.forgotPassword.missingEmailMsg'));
      return;
    }
    setLoading(true);
    const result = await resetPassword(email.trim().toLowerCase());
    setLoading(false);

    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('auth.screens.forgotPassword.resetFailedTitle'), result.error ?? t('auth.screens.forgotPassword.genericError'));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
      setCountdown(60);
    }
  };

  const handleResend = async () => {
    setSent(false);
    setCountdown(0);
    await handleReset();
  };

  const handleConfirmReset = async () => {
    if (code.trim().length !== 6) {
      Alert.alert(t('auth.screens.forgotPassword.missingEmailTitle'), t('auth.screens.forgotPassword.missingCodeMsg'));
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t('auth.screens.forgotPassword.resetFailedTitle'), t('auth.screens.forgotPassword.passwordTooShortMsg'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('auth.screens.forgotPassword.resetFailedTitle'), t('auth.screens.forgotPassword.passwordsMismatchMsg'));
      return;
    }

    setResetLoading(true);
    const result = await confirmPasswordReset(email.trim().toLowerCase(), code.trim(), newPassword);
    setResetLoading(false);

    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('auth.screens.forgotPassword.resetFailedTitle'), result.error ?? t('auth.screens.forgotPassword.genericError'));
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      t('auth.screens.forgotPassword.resetSuccessTitle'),
      t('auth.screens.forgotPassword.resetSuccessMsg'),
      [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }],
    );
  };

  const inputBg = isDark ? colors.surface : '#F8FAFD';

  const countdownMins = Math.floor(countdown / 60);
  const countdownSecs = countdown % 60;
  const countdownLabel = `${countdownMins}:${countdownSecs.toString().padStart(2, '0')}`;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#040D1A', '#0A1E3D', '#0F2952']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable accessibilityRole="button"
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={12}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* Lock illustration */}
          <View style={styles.illustrationSection}>
            <View style={styles.illustrationCircle}>
              <Ionicons name="lock-open-outline" size={64} color="#FFFFFF" />
            </View>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('auth.screens.forgotPassword.title')}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              {t('auth.screens.forgotPassword.subtitle')}
            </Text>

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('auth.screens.forgotPassword.emailLabel')}</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: inputBg,
                    borderColor: emailFocused ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailFocused ? colors.primary : colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput accessibilityLabel={t('auth.screens.forgotPassword.emailPlaceholder')}
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder={t('auth.screens.forgotPassword.emailPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                  editable={!sent}
                />
              </View>
            </View>

            {/* Success banner */}
            {sent && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.successText}>
                  {t('auth.screens.forgotPassword.successMessage')}
                </Text>
              </View>
            )}

            {/* Resend countdown or button */}
            {sent && (
              <View style={styles.resendRow}>
                {countdown > 0 ? (
                  <Text style={[styles.resendCountdown, { color: colors.textSecondary }]}>
                    {t('auth.screens.forgotPassword.resendIn', { countdown: countdownLabel })}
                  </Text>
                ) : (
                  <Pressable accessibilityRole="button" onPress={handleResend}>
                    <Text style={[styles.resendLink, { color: colors.primary }]}>{t('auth.screens.forgotPassword.resendLink')}</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Send Reset Link button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 4 }}>
              <Pressable accessibilityRole="button"
                style={[
                  styles.primaryButton,
                  (loading || sent) && styles.primaryButtonDisabled,
                ]}
                onPress={handleReset}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={loading || sent}
              >
                <LinearGradient
                  colors={['#1E4A8A', '#0F2952']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryButtonText}>
                        {sent ? t('auth.screens.forgotPassword.emailSentButton') : t('auth.screens.forgotPassword.sendButton')}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Step 2: code + new password, shown once the email has been sent */}
            {sent && (
              <View style={styles.resetStep}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('auth.screens.forgotPassword.codeLabel')}</Text>
                  <View
                    style={[
                      styles.inputRow,
                      { backgroundColor: inputBg, borderColor: codeFocused ? colors.primary : colors.border },
                    ]}
                  >
                    <Ionicons
                      name="keypad-outline"
                      size={18}
                      color={codeFocused ? colors.primary : colors.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput accessibilityLabel={t('auth.screens.forgotPassword.codePlaceholder')}
                      style={[styles.textInput, { color: colors.text, letterSpacing: 4 }]}
                      placeholder={t('auth.screens.forgotPassword.codePlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={code}
                      onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      onFocus={() => setCodeFocused(true)}
                      onBlur={() => setCodeFocused(false)}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('auth.screens.forgotPassword.newPasswordLabel')}</Text>
                  <View
                    style={[
                      styles.inputRow,
                      { backgroundColor: inputBg, borderColor: newPasswordFocused ? colors.primary : colors.border },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={newPasswordFocused ? colors.primary : colors.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput accessibilityLabel={t('auth.screens.forgotPassword.newPasswordPlaceholder')}
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder={t('auth.screens.forgotPassword.newPasswordPlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      onFocus={() => setNewPasswordFocused(true)}
                      onBlur={() => setNewPasswordFocused(false)}
                      returnKeyType="next"
                    />
                    <Pressable accessibilityRole="button" onPress={() => setShowNewPassword(!showNewPassword)} hitSlop={8}>
                      <Ionicons
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('auth.screens.forgotPassword.confirmPasswordLabel')}</Text>
                  <View
                    style={[
                      styles.inputRow,
                      { backgroundColor: inputBg, borderColor: confirmPasswordFocused ? colors.primary : colors.border },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={confirmPasswordFocused ? colors.primary : colors.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput accessibilityLabel={t('auth.screens.forgotPassword.confirmPasswordPlaceholder')}
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder={t('auth.screens.forgotPassword.confirmPasswordPlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      onFocus={() => setConfirmPasswordFocused(true)}
                      onBlur={() => setConfirmPasswordFocused(false)}
                      returnKeyType="done"
                      onSubmitEditing={handleConfirmReset}
                    />
                  </View>
                </View>

                <Pressable accessibilityRole="button"
                  style={[styles.primaryButton, resetLoading && styles.primaryButtonDisabled]}
                  onPress={handleConfirmReset}
                  disabled={resetLoading}
                >
                  <LinearGradient
                    colors={['#1E4A8A', '#0F2952']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButtonGradient}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-outline" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryButtonText}>{t('auth.screens.forgotPassword.resetButton')}</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Back to Sign In */}
            <Pressable accessibilityRole="button"
              style={styles.backToSignIn}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Ionicons name="arrow-back-outline" size={15} color={colors.primary} />
              <Text style={[styles.backToSignInText, { color: colors.primary }]}>
                {t('auth.screens.forgotPassword.backToSignIn')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  orb1: {
    position: 'absolute',
    top: -60,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(30, 74, 138, 0.45)',
    opacity: 0.6,
  },
  orb2: {
    position: 'absolute',
    bottom: 80,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 212, 170, 0.18)',
    opacity: 0.5,
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  illustrationSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  illustrationCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  card: {
    width: '100%',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 24,
  },

  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  successText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  resendRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resetStep: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.25)',
  },
  resendCountdown: {
    fontSize: 13,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
  },

  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 56,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  divider: {
    height: 1,
    marginVertical: 24,
  },

  backToSignIn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backToSignInText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
