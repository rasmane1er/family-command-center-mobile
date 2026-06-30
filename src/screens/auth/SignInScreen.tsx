import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../theme/ThemeContext';

// Native social-auth modules are loaded lazily so the app works without a
// full native rebuild. They become functional once you run `npx expo run:ios`.
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
let WebBrowser: typeof import('expo-web-browser') | null = null;
let Google: typeof import('expo-auth-session/providers/google') | null = null;
try {
  AppleAuthentication = require('expo-apple-authentication');
  WebBrowser = require('expo-web-browser');
  Google = require('expo-auth-session/providers/google');
  WebBrowser?.maybeCompleteAuthSession?.();
} catch {
  // Native modules not linked yet — social auth will show "run native build" prompt.
}

interface Props {
  navigation: any;
}

export default function SignInScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithSocial } = useAuthStore();

  // Google auth — only active when native modules are linked
  const googleHook = Google?.useAuthRequest
    ? Google.useAuthRequest({
        androidClientId: 'YOUR_ANDROID_CLIENT_ID',
        iosClientId: 'YOUR_IOS_CLIENT_ID',
        webClientId: 'YOUR_WEB_CLIENT_ID',
      })
    : [null, null, null] as const;
  const [googleRequest, googleResponse, promptGoogleAsync] = googleHook;

  React.useEffect(() => {
    if (!googleResponse || (googleResponse as any).type !== 'success') return;
    const auth = (googleResponse as any).authentication;
    fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${auth?.accessToken}` },
    })
      .then((r) => r.json())
      .then((info) => {
        signInWithSocial({
          id: info.id ?? Math.random().toString(36),
          email: info.email ?? '',
          displayName: info.name ?? 'Google User',
          avatarColor: '#4285F4',
          provider: 'google',
        });
        const { user } = useAuthStore.getState();
        if (user) {
          const { useFamilyStore } = require('../../store/useFamilyStore');
          if (!useFamilyStore.getState().family) {
            const { populateFromSignUp } = require('../../utils/populateFromSignUp');
            populateFromSignUp(user);
          }
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .catch(() => Alert.alert('Error', 'Could not fetch Google profile.'));
  }, [googleResponse]);

  const handleGoogleSignIn = () => {
    if (!promptGoogleAsync) {
      Alert.alert(
        'Native Build Required',
        'Google Sign In needs a development build.\nRun: npx expo run:ios',
        [{ text: 'OK' }],
      );
      return;
    }
    (promptGoogleAsync as () => void)();
  };

  const handleAppleSignIn = async () => {
    if (!AppleAuthentication) {
      Alert.alert(
        'Native Build Required',
        'Apple Sign In needs a development build.\nRun: npx expo run:ios',
        [{ text: 'OK' }],
      );
      return;
    }
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const name = credential.fullName
        ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
        : 'Apple User';
      const emailAddr = credential.email ?? `${credential.user}@privaterelay.appleid.com`;
      signInWithSocial({
        id: credential.user,
        email: emailAddr,
        displayName: name || 'Apple User',
        avatarColor: '#000000',
        provider: 'apple',
      });
      const { user } = useAuthStore.getState();
      if (user) {
        const { useFamilyStore } = require('../../store/useFamilyStore');
        if (!useFamilyStore.getState().family) {
          const { populateFromSignUp } = require('../../utils/populateFromSignUp');
          populateFromSignUp(user);
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign In Failed', 'Could not sign in with Apple. Please try email/password.');
      }
    }
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const result = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Sign In Failed', result.error ?? 'An unexpected error occurred.');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigation handled automatically by AppNavigator watching isAuthenticated
    }
  };

  const inputBg = isDark ? colors.surface : '#F8FAFD';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Background gradient */}
      <LinearGradient
        colors={['#040D1A', '#0A1E3D', '#0F2952']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative glowing orbs */}
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
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo section */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.logoTitle}>Family Command Center</Text>
            <Text style={styles.logoSubtitle}>Your household, elevated.</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Welcome back</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Sign in to your family account
            </Text>

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email</Text>
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
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password field */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Password</Text>
                <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={[styles.forgotLink, { color: colors.primary }]}>Forgot Password?</Text>
                </Pressable>
              </View>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: inputBg,
                    borderColor: passwordFocused ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passwordFocused ? colors.primary : colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                    style={styles.eyeIcon}
                  />
                </Pressable>
              </View>
            </View>

            {/* Sign In button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 8 }}>
              <Pressable
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleSignIn}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={loading}
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
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Apple Sign In */}
            {Platform.OS === 'ios' && AppleAuthentication?.AppleAuthenticationButton ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={14}
                style={{ width: '100%', height: 52 }}
                onPress={handleAppleSignIn}
              />
            ) : (
              <Pressable
                style={[styles.outlineButton, { borderColor: colors.border, backgroundColor: '#000' }]}
                onPress={handleAppleSignIn}
              >
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <Text style={[styles.outlineButtonText, { color: '#fff' }]}>Continue with Apple</Text>
              </Pressable>
            )}

            {/* Google Sign In */}
            <Pressable
              style={[styles.outlineButton, { borderColor: colors.border, backgroundColor: inputBg, marginTop: 10 }]}
              onPress={handleGoogleSignIn}
              disabled={!googleRequest}
            >
              <Ionicons name="globe-outline" size={20} color={colors.text} />
              <Text style={[styles.outlineButtonText, { color: colors.text }]}>Continue with Google</Text>
            </Pressable>
          </View>

          {/* Bottom link */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>New to Family Command Center? </Text>
            <Pressable onPress={() => navigation.navigate('SignUp')}>
              <Text style={[styles.bottomLink, { color: '#7EB8F7' }]}>Create Account</Text>
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

  // Orbs
  orb1: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(30, 74, 138, 0.45)',
    opacity: 0.6,
  },
  orb2: {
    position: 'absolute',
    bottom: 60,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(0, 212, 170, 0.18)',
    opacity: 0.5,
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  logoSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 6,
    letterSpacing: 0.5,
  },

  // Card
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
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: 24,
  },

  // Fields
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '600',
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
  eyeIcon: {
    marginLeft: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },

  // Primary button
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 56,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    marginHorizontal: 12,
  },

  // Outline buttons
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Bottom
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  bottomText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
  },
  bottomLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
