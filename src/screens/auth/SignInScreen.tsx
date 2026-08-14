import React, { useState, useRef, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithCredential, getIdToken } from '@react-native-firebase/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

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

// Debug-only: pulls just the aud/iss claims out of a JWT payload, without a
// full base64 API (Hermes doesn't reliably expose atob) and without logging
// the whole bearer token. Used to diagnose Firebase's auth/internal-error,
// which gives no detail on which audience it actually rejected.
function decodeJwtClaims(jwt: string): { aud?: string; iss?: string } {
  try {
    const payload = jwt.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const bytes: number[] = [];
    let buffer = 0;
    let bits = 0;
    for (const c of base64) {
      if (c === '=') break;
      const val = chars.indexOf(c);
      if (val === -1) continue;
      buffer = (buffer << 6) | val;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((buffer >> bits) & 0xff);
      }
    }
    const str = bytes.map((b) => String.fromCharCode(b)).join('');
    const decoded = decodeURIComponent(
      str.split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    );
    const json = JSON.parse(decoded);
    return { aud: json.aud, iss: json.iss };
  } catch {
    return {};
  }
}

export default function SignInScreen({ navigation }: Props) {
  const { t } = useTranslation('auth');
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithSocial, unlockWithBiometric } = useAuthStore();

  // Google auth — only active when native modules are linked AND real client
  // IDs are supplied via env (see eas.json / .env). Without real IDs the
  // native SDK would attempt OAuth with garbage and fail cryptically, so the
  // request is only constructed once all three are actually present.
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleConfigured = Boolean(googleAndroidClientId && googleIosClientId && googleWebClientId);
  // useIdTokenAuthRequest (vs. plain useAuthRequest) is what makes the SDK
  // exchange the auth code for an id_token alongside the access_token on
  // native — that id_token is what gets handed to Firebase below.
  const googleHook = Google?.useIdTokenAuthRequest && googleConfigured
    ? Google.useIdTokenAuthRequest({
        androidClientId: googleAndroidClientId,
        iosClientId: googleIosClientId,
        webClientId: googleWebClientId,
      })
    : [null, null, null] as const;
  const [googleRequest, googleResponse, promptGoogleAsync] = googleHook;

  React.useEffect(() => {
    if (!googleResponse || (googleResponse as any).type !== 'success') return;
    const auth = (googleResponse as any).authentication;
    // On native, expo-auth-session performs a code exchange and returns both
    // an access token (for the userinfo REST call below) and an id_token
    // (what Firebase's GoogleAuthProvider actually needs). On web it may
    // only return params.id_token from the implicit flow.
    const googleIdToken: string | undefined = auth?.idToken ?? (googleResponse as any).params?.id_token;
    if (!googleIdToken) {
      Alert.alert(t('auth.screens.signIn.googleProfileErrorTitle'), t('auth.screens.signIn.googleProfileErrorMsg'));
      return;
    }
    fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${auth?.accessToken}` },
    })
      .then((r) => r.json())
      .then(async (info) => {
        {
          const claims = decodeJwtClaims(googleIdToken);
          console.log(
            `[auth] Google id_token aud=${claims.aud} iss=${claims.iss} envIosClientId=${googleIosClientId} hasAccessToken=${Boolean(auth?.accessToken)}`,
          );
        }
        // idToken alone is sufficient for Firebase's exchange — omitting a
        // potentially malformed accessToken here to isolate whether IT was
        // the actual cause of auth/internal-error (the aud/iss claims above
        // already confirmed the idToken itself is well-formed and safelisted).
        const credential = GoogleAuthProvider.credential(googleIdToken);
        const userCredential = await signInWithCredential(getAuth(), credential);
        const firebaseIdToken = await getIdToken(userCredential.user);

        await signInWithSocial(
          {
            id: info.id ?? Math.random().toString(36),
            email: info.email ?? '',
            displayName: info.name || (info.email ? info.email.split('@')[0] : 'Google User'),
            avatarColor: '#4285F4',
            provider: 'google',
          },
          firebaseIdToken,
        );
        const { user } = useAuthStore.getState();
        if (user) {
          const { useFamilyStore } = require('../../store/useFamilyStore');
          if (!useFamilyStore.getState().family) {
            const { populateFromSignUp } = require('../../utils/populateFromSignUp');
            await populateFromSignUp(user);
          }
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .catch((err) => {
        console.error('[auth] Google sign-in failed', err);
        Alert.alert(t('auth.screens.signIn.googleProfileErrorTitle'), t('auth.screens.signIn.googleProfileErrorMsg'));
      });
  }, [googleResponse]);

  const handleGoogleSignIn = () => {
    if (!Google) {
      Alert.alert(
        t('auth.screens.signIn.nativeBuildRequiredTitle'),
        t('auth.screens.signIn.googleNativeBuildMsg'),
        [{ text: t('auth.screens.signIn.ok') }],
      );
      return;
    }
    if (!googleConfigured || !promptGoogleAsync) {
      Alert.alert(
        t('auth.screens.signIn.googleNotConfiguredTitle'),
        t('auth.screens.signIn.googleNotConfiguredMsg'),
        [{ text: t('auth.screens.signIn.ok') }],
      );
      return;
    }
    (promptGoogleAsync as () => void)();
  };

  const handleAppleSignIn = async () => {
    // Sign in with Apple has no native implementation on Android — Apple
    // only ships the native module for iOS; expo-apple-authentication's
    // signInAsync() throws there regardless of whether the module linked
    // successfully, which used to surface as a generic, confusing "Apple
    // Sign-In Failed" instead of an honest "not available on this platform".
    // (A real Android path would need Apple's web/REST OAuth flow via a
    // registered Services ID + redirect — not implemented here.)
    if (Platform.OS !== 'ios') {
      Alert.alert(
        t('auth.screens.signIn.appleAndroidUnsupportedTitle'),
        t('auth.screens.signIn.appleAndroidUnsupportedMsg'),
        [{ text: t('auth.screens.signIn.ok') }],
      );
      return;
    }
    if (!AppleAuthentication) {
      Alert.alert(
        t('auth.screens.signIn.nativeBuildRequiredTitle'),
        t('auth.screens.signIn.appleNativeBuildMsg'),
        [{ text: t('auth.screens.signIn.ok') }],
      );
      return;
    }
    try {
      // Firebase's Apple credential wants the RAW nonce, while Apple itself
      // is only ever given the SHA-256 HASH of it (and echoes that hash back
      // inside identityToken) — generating+hashing here, not relying on
      // AppleAuthentication to do it, is what lets us hand the raw value to
      // Firebase afterwards.
      const rawNonce = Array.from(await Crypto.getRandomBytesAsync(16))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) {
        Alert.alert(t('auth.screens.signIn.appleSignInFailedTitle'), t('auth.screens.signIn.appleSignInFailedMsg'));
        return;
      }
      const emailAddr = credential.email ?? `${credential.user}@privaterelay.appleid.com`;
      // Apple only ever discloses the real name on the very first
      // authorization for this app+Apple ID pair — every sign-in after that
      // (even a first *successful* one, if an earlier attempt got this far
      // before failing downstream) gets an empty fullName. Falling back to
      // the email's local part (like the email/password signIn() flow does)
      // is wrong here specifically: when Apple also withholds the real email,
      // emailAddr becomes `${credential.user}@privaterelay.appleid.com`, so
      // splitting on '@' just hands back credential.user — Apple's opaque
      // per-app-per-user id — verbatim as the person's displayed "name".
      // Only use the email-derived fallback when it's a real user email.
      const name = credential.fullName
        ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
        : '';
      const fallbackName = credential.email ? emailAddr.split('@')[0] : 'Apple User';

      const appleFirebaseCredential = new OAuthProvider('apple.com').credential({
        idToken: credential.identityToken,
        rawNonce,
      });
      const userCredential = await signInWithCredential(getAuth(), appleFirebaseCredential);
      const firebaseIdToken = await getIdToken(userCredential.user);

      await signInWithSocial(
        {
          id: credential.user,
          email: emailAddr,
          displayName: name || fallbackName,
          avatarColor: '#000000',
          provider: 'apple',
        },
        firebaseIdToken,
      );
      const { user } = useAuthStore.getState();
      if (user) {
        const { useFamilyStore } = require('../../store/useFamilyStore');
        if (!useFamilyStore.getState().family) {
          const { populateFromSignUp } = require('../../utils/populateFromSignUp');
          await populateFromSignUp(user);
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        console.error('[auth] Apple sign-in failed', e);
        Alert.alert(t('auth.screens.signIn.appleSignInFailedTitle'), t('auth.screens.signIn.appleSignInFailedMsg'));
      }
    }
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showBiometric, setShowBiometric] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Check biometric availability on mount — only offer it when the user
  // opted in at signup AND there's still a persisted session on this device
  // to unlock into (unlockWithBiometric never touches a password).
  useEffect(() => {
    (async () => {
      const biometricEnabled = await SecureStore.getItemAsync('biometric_enabled');
      if (biometricEnabled === 'true' && useAuthStore.getState().user) {
        setShowBiometric(true);
      }
    })();
  }, []);

  const handleBiometricSignIn = async () => {
    setLoading(true);
    const success = await unlockWithBiometric();
    setLoading(false);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('auth.screens.signIn.signInFailedTitle'), t('auth.screens.signIn.genericError'));
    }
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  const handleSignIn = async () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = t('auth.screens.signIn.emailRequired');
    if (!password) newErrors.password = t('auth.screens.signIn.passwordRequired');
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    const result = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (result.error === 'email_not_verified') {
        // pendingVerificationEmail already set in the store — AuthNavigator
        // will automatically switch to EmailVerificationScreen.
        return;
      }
      if (result.error === 'mfa_required') {
        // mfaChallenge already set in the store — AuthNavigator will
        // automatically switch to MfaChallengeScreen.
        return;
      }
      Alert.alert(t('auth.screens.signIn.signInFailedTitle'), result.error ?? t('auth.screens.signIn.genericError'));
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
            <View style={styles.logoShadowWrap}>
              <View style={styles.logoRim}>
                <LinearGradient
                  colors={['#FFFFFF', '#F1F4FA', '#DDE4EF']}
                  start={{ x: 0.15, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <LinearGradient
                  colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
                  start={{ x: 0.1, y: 0.1 }}
                  end={{ x: 0.6, y: 0.6 }}
                  style={styles.logoHighlight}
                />
                {/* Solid white disc behind the logo — the PNG has its own
                    opaque white background, so it has to sit on plain white
                    (matching precedent) rather than the gradient bezel above,
                    or its rectangular edges show through as a visible square. */}
                <View style={styles.logoCircle}>
                  <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
                </View>
              </View>
            </View>
            <Text style={styles.logoTitle}>{t('auth.screens.signIn.logoTitle')}</Text>
            <Text style={styles.logoSubtitle}>{t('auth.screens.signIn.logoSubtitle')}</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('auth.welcomeBack')}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              {t('auth.screens.signIn.cardSubtitle')}
            </Text>

            {/* Biometric sign in button */}
            {showBiometric && (
              <Pressable
                style={[styles.biometricButton, { borderColor: colors.primary }]}
                onPress={handleBiometricSignIn}
              >
                <Ionicons name="finger-print-outline" size={20} color={colors.primary} />
                <Text style={[styles.biometricButtonText, { color: colors.primary }]}>
                  {t('auth.screens.signIn.biometricButton')}
                </Text>
              </Pressable>
            )}

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('auth.email')}</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: inputBg,
                    borderColor: errors.email ? '#E74C3C' : emailFocused ? colors.primary : colors.border,
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
                  placeholder={t('auth.screens.signIn.emailPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password field */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('auth.password')}</Text>
                <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={[styles.forgotLink, { color: colors.primary }]}>{t('auth.forgotPassword')}</Text>
                </Pressable>
              </View>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: inputBg,
                    borderColor: errors.password ? '#E74C3C' : passwordFocused ? colors.primary : colors.border,
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
                  ref={passwordRef}
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder={t('auth.screens.signIn.passwordPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
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
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
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
                    <Text style={styles.primaryButtonText}>{t('auth.signIn')}</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>{t('auth.screens.signIn.or')}</Text>
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
                <Text style={[styles.outlineButtonText, { color: '#fff' }]}>{t('auth.screens.signIn.continueWithApple')}</Text>
              </Pressable>
            )}

            {/* Google Sign In */}
            <Pressable
              style={[styles.outlineButton, { borderColor: colors.border, backgroundColor: inputBg, marginTop: 10 }]}
              onPress={handleGoogleSignIn}
            >
              <Ionicons name="globe-outline" size={20} color={colors.text} />
              <Text style={[styles.outlineButtonText, { color: colors.text }]}>{t('auth.screens.signIn.continueWithGoogle')}</Text>
            </Pressable>
          </View>

          {/* Bottom link */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>{t('auth.screens.signIn.newToApp')}</Text>
            <Pressable onPress={() => navigation.navigate('SignUp')}>
              <Text style={[styles.bottomLink, { color: '#7EB8F7' }]}>{t('auth.createAccount')}</Text>
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
  logoShadowWrap: {
    marginBottom: 16,
    borderRadius: 47,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  // A visible bezel ring is what actually reads as "glass/metal disc" on
  // Android, since Android elevation renders as a flat grey blur (no soft
  // directional shadow like iOS shadow* props) — the gradient ring here
  // carries the glossy effect, leaving the inner white disc (below) plain
  // so the logo's own opaque white background blends in seamlessly.
  logoRim: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    overflow: 'hidden',
  },
  logoHighlight: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    transform: [{ rotate: '-30deg' }],
  },
  logoImage: {
    width: '100%',
    height: '100%',
    zIndex: 2,
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

  // Biometric button
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  biometricButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  errorText: {
    fontSize: 12,
    color: '#E74C3C',
    marginTop: 4,
    marginLeft: 2,
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
