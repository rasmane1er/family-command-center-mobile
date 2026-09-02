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
  Image,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithCredential, getIdToken } from '@react-native-firebase/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { awsConfig } from '../../config/aws';
import { useTranslation } from 'react-i18next';
import { captureError } from '../../config/sentry';

// Native social-auth modules are loaded lazily so the app works without a
// full native rebuild. They become functional once you run `npx expo run:ios`.
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
let WebBrowser: typeof import('expo-web-browser') | null = null;
let Google: typeof import('expo-auth-session/providers/google') | null = null;
let AuthSession: typeof import('expo-auth-session') | null = null;
let QueryParamsUtil: typeof import('expo-auth-session/build/QueryParams') | null = null;
// Android Google sign-in uses this native SDK, not expo-auth-session's
// browser-redirect flow above (still used for iOS, where it works fine —
// iOS OAuth clients validate by bundle ID, which doesn't have Android's
// failure mode below). expo-auth-session's Android flow drives a generic
// browser authorization request using an Android-type OAuth client ID,
// which Google validates against the SHA-1 certificate that actually
// signed the installed app — but Google Play re-signs every app it
// distributes with its own "Play App Signing" key, a different
// certificate than the one used to build/upload it. That mismatch is
// invisible from the developer's own machine (a sideloaded or
// internal-testing build is signed with the upload key, so it works
// there) and only ever seen by a user who installed via the Play Store.
// The native SDK sidesteps this entirely — it authenticates through
// Google Play Services on-device rather than a redirect Google's server
// has to validate by certificate fingerprint.
let GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null = null;
let isSuccessResponse: typeof import('@react-native-google-signin/google-signin').isSuccessResponse | null = null;
let isErrorWithCode: typeof import('@react-native-google-signin/google-signin').isErrorWithCode | null = null;
let statusCodes: typeof import('@react-native-google-signin/google-signin').statusCodes | null = null;
try {
  AppleAuthentication = require('expo-apple-authentication');
  WebBrowser = require('expo-web-browser');
  Google = require('expo-auth-session/providers/google');
  AuthSession = require('expo-auth-session');
  QueryParamsUtil = require('expo-auth-session/build/QueryParams');
  WebBrowser?.maybeCompleteAuthSession?.();
  ({ GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = require('@react-native-google-signin/google-signin'));
} catch {
  // Native modules not linked yet — social auth will show "run native build" prompt.
}

interface Props {
  navigation: any;
}

// Fixed brand palette for this screen — matches the sign-in mockup exactly,
// intentionally not theme-aware (same "fixed brand statement" approach the
// previous dark-enterprise version took, just light instead of dark).
const NAVY = '#0D1B2A';
const BLUE = '#1E4A8A';
const BLUE_LIGHT = '#2B6FEC';
const SLATE = '#64748B';
const SURFACE = '#F8FAFD';
const BORDER = '#E4EAF2';
const BG = '#F4F8FF';

// Decodes a JWT's payload without a full base64 API (Hermes doesn't
// reliably expose atob) and without logging the whole bearer token.
// Originally added to diagnose Firebase's auth/internal-error (which gives
// no detail on which audience it actually rejected) by reading aud/iss; the
// Android Apple sign-in flow below also uses it to read the id_token's own
// sub/email claims client-side (Firebase still independently verifies the
// token's signature server-side in signInWithCredential).
function decodeJwtClaims(jwt: string): { aud?: string; iss?: string; sub?: string; email?: string } {
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
    return { aud: json.aud, iss: json.iss, sub: json.sub, email: json.email };
  } catch {
    return {};
  }
}

// The app's actual "FCC" wordmark, cropped to its glyph bounds with the
// white background keyed out to transparency (see fcc-logo.png) — derived
// from icon.png, which only ships as an opaque square app-icon tile.
const FCC_ICON = require('../../assets/images/fcc-logo.png');

// A simplified, standard four-color Google "G" mark — the conventional icon
// used on "Continue with Google" buttons industry-wide.
function GoogleGIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z" />
      <Path fill="#4CAF50" d="M24 44c5.3 0 10.2-2 13.8-5.4l-6.4-5.4C29.3 34.9 26.8 36 24 36c-5.3 0-9.6-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.4 5.4C40.9 36.5 44 30.9 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

export default function SignInScreen({ navigation }: Props) {
  const { t } = useTranslation('auth');
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
  // Services ID for Apple's web/REST OAuth flow, used only on Android (see
  // handleAppleSignInAndroid below) — iOS uses the native module instead.
  const appleServicesId = process.env.EXPO_PUBLIC_APPLE_SERVICES_ID;
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

  // Native SDK config for Android only — iOS keeps using the expo-auth-session
  // flow above (see the comment by the GoogleSignin require above for why).
  // webClientId (not androidClientId) is what the native SDK needs here: it
  // resolves the Android-specific OAuth client itself, from the app's own
  // package name + signing certificate via Google Play Services, and only
  // needs the web client to know which Firebase/GCP project's server-side
  // audience the resulting idToken should be minted for.
  React.useEffect(() => {
    if (Platform.OS === 'android' && GoogleSignin && googleWebClientId) {
      GoogleSignin.configure({ webClientId: googleWebClientId });
    }
  }, [googleWebClientId]);

  const handleGoogleSignInAndroid = async () => {
    if (!GoogleSignin || !isSuccessResponse || !isErrorWithCode || !statusCodes) {
      Alert.alert(
        t('auth.screens.signIn.nativeBuildRequiredTitle'),
        t('auth.screens.signIn.googleNativeBuildMsg'),
        [{ text: t('auth.screens.signIn.ok') }],
      );
      return;
    }
    if (!googleWebClientId) {
      Alert.alert(
        t('auth.screens.signIn.googleNotConfiguredTitle'),
        t('auth.screens.signIn.googleNotConfiguredMsg'),
        [{ text: t('auth.screens.signIn.ok') }],
      );
      return;
    }
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return; // user cancelled — not an error
      const { idToken, user: googleUser } = response.data;
      if (!idToken) {
        Alert.alert(t('auth.screens.signIn.googleProfileErrorTitle'), t('auth.screens.signIn.googleProfileErrorMsg'));
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(getAuth(), credential);
      const firebaseIdToken = await getIdToken(userCredential.user);

      await signInWithSocial(
        {
          id: googleUser.id,
          email: googleUser.email ?? '',
          displayName: googleUser.name || (googleUser.email ? googleUser.email.split('@')[0] : 'Google User'),
          avatarColor: '#4285F4',
          provider: 'google',
        },
        firebaseIdToken,
      );
      const { user: authUser } = useAuthStore.getState();
      if (authUser) {
        const { useFamilyStore } = require('../../store/useFamilyStore');
        if (!useFamilyStore.getState().family) {
          const { populateFromSignUp } = require('../../utils/populateFromSignUp');
          await populateFromSignUp(authUser);
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return;
      console.error('[auth] Google sign-in (Android, native) failed', e?.message ?? e, e?.code);
      captureError(e instanceof Error ? e : new Error(String(e)), { stage: 'handleGoogleSignInAndroid', code: e?.code });
      Alert.alert(t('auth.screens.signIn.googleProfileErrorTitle'), t('auth.screens.signIn.googleProfileErrorMsg'));
    }
  };

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
    if (Platform.OS === 'android') {
      handleGoogleSignInAndroid();
      return;
    }
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

  // Shared tail end of both the iOS (native) and Android (web/REST) Apple
  // flows below — once either one has produced Apple's identityToken + the
  // raw nonce that was hashed into it, signing into Firebase and syncing
  // with the backend is identical either way.
  const finishAppleSignIn = async (identityToken: string, rawNonce: string, appleUserId: string, email: string | null, fullName: string) => {
    const emailAddr = email ?? `${appleUserId}@privaterelay.appleid.com`;
    const fallbackName = email ? emailAddr.split('@')[0] : 'Apple User';

    const appleFirebaseCredential = new OAuthProvider('apple.com').credential({
      idToken: identityToken,
      rawNonce,
    });
    const userCredential = await signInWithCredential(getAuth(), appleFirebaseCredential);
    const firebaseIdToken = await getIdToken(userCredential.user);

    await signInWithSocial(
      {
        id: appleUserId,
        email: emailAddr,
        displayName: fullName || fallbackName,
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
  };

  const handleAppleSignInIOS = async () => {
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
      // Apple only ever discloses the real name on the very first
      // authorization for this app+Apple ID pair — every sign-in after that
      // (even a first *successful* one, if an earlier attempt got this far
      // before failing downstream) gets an empty fullName.
      const name = credential.fullName
        ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
        : '';
      await finishAppleSignIn(credential.identityToken, rawNonce, credential.user, credential.email, name);
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        console.error('[auth] Apple sign-in failed', e);
        Alert.alert(t('auth.screens.signIn.appleSignInFailedTitle'), t('auth.screens.signIn.appleSignInFailedMsg'));
      }
    }
  };

  // Apple ships no native Sign in with Apple SDK for Android — only iOS/
  // macOS — so this drives Apple's own web/REST OAuth flow instead:
  // 1. Open Apple's /authorize endpoint in a Custom Tab (WebBrowser), asking
  //    for response_type=code+id_token so Apple hands back an identityToken
  //    directly, with no server-side token exchange (and no need to touch
  //    the Sign in with Apple private key) required at all.
  // 2. Apple can only redirect to a real https:// URL, and (since name/email
  //    are requested) must use response_mode=form_post — so the redirect
  //    target is a small backend route (POST /auth/apple/callback) whose
  //    only job is bouncing those params into the app via its own custom
  //    URL scheme, which WebBrowser.openAuthSessionAsync is watching for.
  // 3. From there it's identical to the iOS path: build the same Firebase
  //    OAuthProvider('apple.com') credential and hand off to
  //    finishAppleSignIn.
  const handleAppleSignInAndroid = async () => {
    if (!WebBrowser || !AuthSession || !QueryParamsUtil) {
      Alert.alert(
        t('auth.screens.signIn.nativeBuildRequiredTitle'),
        t('auth.screens.signIn.appleNativeBuildMsg'),
        [{ text: t('auth.screens.signIn.ok') }],
      );
      return;
    }
    if (!appleServicesId) {
      Alert.alert(t('auth.screens.signIn.appleSignInFailedTitle'), t('auth.screens.signIn.appleSignInFailedMsg'));
      return;
    }
    try {
      const rawNonce = Array.from(await Crypto.getRandomBytesAsync(16))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const state = Array.from(await Crypto.getRandomBytesAsync(8))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const appRedirectUri = AuthSession.makeRedirectUri({ scheme: 'familycommandcenter', path: 'apple-auth' });
      const backendCallbackUrl = `${awsConfig.apiBaseUrl}/auth/apple/callback`;
      const authorizeParams = new URLSearchParams({
        client_id: appleServicesId,
        redirect_uri: backendCallbackUrl,
        response_type: 'code id_token',
        response_mode: 'form_post',
        scope: 'name email',
        state,
        nonce: hashedNonce,
      });

      const result = await WebBrowser.openAuthSessionAsync(
        `https://appleid.apple.com/auth/authorize?${authorizeParams.toString()}`,
        appRedirectUri,
      );
      if (result.type !== 'success') return; // user cancelled/dismissed — not an error

      const { params } = QueryParamsUtil.getQueryParams(result.url);
      if (params.error) {
        if (params.error !== 'user_cancelled_authorize') {
          console.error('[auth] Apple sign-in (Android) failed: redirect carried an error param', params.error);
          captureError(new Error(`Apple sign-in (Android) redirect error: ${params.error}`), { params });
          Alert.alert(t('auth.screens.signIn.appleSignInFailedTitle'), t('auth.screens.signIn.appleSignInFailedMsg'));
        }
        return;
      }
      if (params.state !== state) {
        console.error('[auth] Apple sign-in failed: state mismatch', { expected: state, received: params.state });
        captureError(new Error('Apple sign-in (Android) state mismatch'), { expected: state, received: params.state });
        Alert.alert(t('auth.screens.signIn.appleSignInFailedTitle'), t('auth.screens.signIn.appleSignInFailedMsg'));
        return;
      }
      if (!params.id_token) {
        console.error('[auth] Apple sign-in (Android) failed: no id_token in redirect', params);
        captureError(new Error('Apple sign-in (Android) redirect missing id_token'), { params });
        Alert.alert(t('auth.screens.signIn.appleSignInFailedTitle'), t('auth.screens.signIn.appleSignInFailedMsg'));
        return;
      }

      // Apple's id_token 'sub' claim is the stable per-app-per-user id
      // (same value AppleAuthentication.signInAsync calls `user` on iOS);
      // decoding it client-side here is fine — Firebase independently
      // verifies the token's signature server-side in signInWithCredential.
      const claims = decodeJwtClaims(params.id_token);
      const appleUserId = typeof claims.sub === 'string' ? claims.sub : '';
      // Apple only includes name/email in `user` on the very first
      // authorization for this app+Apple ID pair, as a JSON string.
      let name = '';
      let email: string | null = typeof claims.email === 'string' ? claims.email : null;
      if (params.user) {
        try {
          const parsedUser = JSON.parse(params.user);
          if (parsedUser.name) {
            name = `${parsedUser.name.firstName ?? ''} ${parsedUser.name.lastName ?? ''}`.trim();
          }
          if (!email && parsedUser.email) email = parsedUser.email;
        } catch {
          // malformed 'user' param — fall back to id_token claims only
        }
      }

      await finishAppleSignIn(params.id_token, rawNonce, appleUserId, email, name);
    } catch (e: any) {
      console.error('[auth] Apple sign-in (Android) failed', e?.message ?? e, e?.code);
      captureError(e instanceof Error ? e : new Error(String(e)), { stage: 'handleAppleSignInAndroid', code: e?.code });
      Alert.alert(t('auth.screens.signIn.appleSignInFailedTitle'), t('auth.screens.signIn.appleSignInFailedMsg'));
    }
  };

  const handleAppleSignIn = () => {
    if (Platform.OS === 'ios') {
      handleAppleSignInIOS();
    } else {
      handleAppleSignInAndroid();
    }
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Soft decorative wash at the bottom, echoing the mockup's pale-blue
          gradient behind the footer links — subtle, not a hard shape. */}
      <View style={styles.bgBlob} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Hero — full-bleed photo background with the logo/title/tagline
              overlaid on top, matching the mockup's single merged hero. */}
          <ImageBackground
            source={require('../../assets/images/family-hero.png')}
            style={styles.hero}
            imageStyle={styles.heroBgImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(244,248,255,0.97)', 'rgba(244,248,255,0)']}
              locations={[0, 0.58]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroScrim}
            />
            <View style={[styles.heroTextBlock, { paddingTop: insets.top + 16 }]}>
              <Image source={FCC_ICON} style={styles.heroLogoImage} resizeMode="contain" />
              <Text style={styles.heroTitle}>{t('auth.screens.signIn.logoTitle')}</Text>
              <Text style={styles.heroTagline}>
                {t('auth.screens.signIn.heroTaglineLine1')}
                {'\n'}
                <Text style={styles.heroTaglineAccent}>{t('auth.screens.signIn.heroTaglineLine2')}</Text>
              </Text>
            </View>
          </ImageBackground>

          {/* Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.welcomeIconCircle}>
                <Ionicons name="people" size={20} color={BLUE} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>{t('auth.welcomeBack')}</Text>
                <Text style={styles.cardSubtitle}>{t('auth.screens.signIn.cardSubtitle')}</Text>
              </View>
            </View>

            {/* Biometric sign in button */}
            {showBiometric && (
              <Pressable accessibilityRole="button"
                style={styles.biometricButton}
                onPress={handleBiometricSignIn}
              >
                <View style={styles.biometricIconChip}>
                  <Ionicons name="finger-print-outline" size={18} color={BLUE} />
                </View>
                <Text style={styles.biometricButtonText}>
                  {t('auth.screens.signIn.biometricButton')}
                </Text>
              </Pressable>
            )}

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('auth.screens.signIn.emailLabel')}</Text>
              <View
                style={[
                  styles.inputRow,
                  { borderColor: errors.email ? '#E74C3C' : emailFocused ? BLUE_LIGHT : BORDER },
                ]}
              >
                <View style={[styles.inputIconChip, emailFocused && styles.inputIconChipActive]}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={emailFocused ? BLUE_LIGHT : SLATE}
                  />
                </View>
                <TextInput accessibilityLabel={t('auth.screens.signIn.emailPlaceholder')}
                  style={styles.textInput}
                  placeholder={t('auth.screens.signIn.emailPlaceholder')}
                  placeholderTextColor={SLATE}
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
                <Text style={styles.fieldLabel}>{t('auth.password')}</Text>
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotLink}>{t('auth.forgotPassword')}</Text>
                </Pressable>
              </View>
              <View
                style={[
                  styles.inputRow,
                  { borderColor: errors.password ? '#E74C3C' : passwordFocused ? BLUE_LIGHT : BORDER },
                ]}
              >
                <View style={[styles.inputIconChip, passwordFocused && styles.inputIconChipActive]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={passwordFocused ? BLUE_LIGHT : SLATE}
                  />
                </View>
                <TextInput accessibilityLabel={t('auth.screens.signIn.passwordPlaceholder')}
                  ref={passwordRef}
                  style={styles.textInput}
                  placeholder={t('auth.screens.signIn.passwordPlaceholder')}
                  placeholderTextColor={SLATE}
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
                <Pressable accessibilityRole="button" onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={SLATE}
                    style={styles.eyeIcon}
                  />
                </Pressable>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Remember me */}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
              accessibilityLabel={t('auth.screens.signIn.rememberMe')}
              style={styles.rememberRow}
              onPress={() => setRememberMe((v) => !v)}
              hitSlop={6}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>{t('auth.screens.signIn.rememberMe')}</Text>
            </Pressable>

            {/* Sign In button */}
            <Animated.View style={[styles.primaryButtonShadowWrap, { transform: [{ scale: buttonScale }] }]}>
              <Pressable accessibilityRole="button"
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleSignIn}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#4A8FD9', '#1E4A8A', '#0F2952']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>{t('auth.signIn')}</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.primaryButtonArrow} />
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.screens.signIn.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Apple Sign In — WHITE_OUTLINE matches the mockup's white
                button while staying Apple's own compliant native component. */}
            {Platform.OS === 'ios' && AppleAuthentication?.AppleAuthenticationButton ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
                cornerRadius={12}
                style={{ width: '100%', height: 44 }}
                onPress={handleAppleSignIn}
              />
            ) : (
              <Pressable accessibilityRole="button"
                style={styles.outlineButton}
                onPress={handleAppleSignIn}
              >
                <Ionicons name="logo-apple" size={18} color={NAVY} />
                <Text style={styles.outlineButtonText}>{t('auth.screens.signIn.continueWithApple')}</Text>
              </Pressable>
            )}

            {/* Google Sign In */}
            <Pressable accessibilityRole="button"
              style={[styles.outlineButton, { marginTop: 8 }]}
              onPress={handleGoogleSignIn}
            >
              <GoogleGIcon size={18} />
              <Text style={styles.outlineButtonText}>{t('auth.screens.signIn.continueWithGoogle')}</Text>
            </Pressable>
          </View>

          {/* Bottom link */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>{t('auth.screens.signIn.newToApp')}</Text>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.bottomLink}>{t('auth.createAccount')}</Text>
            </Pressable>
          </View>

          {/* Terms notice */}
          <View style={styles.termsRow}>
            <Ionicons name="shield-checkmark" size={13} color={SLATE} style={styles.termsIcon} />
            <Text style={styles.termsText}>
              {t('auth.screens.signIn.termsPrefix')}{' '}
              <Text style={styles.termsLink} onPress={() => navigation.navigate('TermsOfService')}>
                {t('auth.screens.signIn.termsOfService')}
              </Text>{' '}
              {t('auth.screens.signIn.and')}{' '}
              <Text style={styles.termsLink} onPress={() => navigation.navigate('PrivacyPolicy')}>
                {t('auth.screens.signIn.privacyPolicy')}
              </Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  bgBlob: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    right: -40,
    height: 220,
    borderTopLeftRadius: 300,
    borderTopRightRadius: 300,
    backgroundColor: 'rgba(74,143,217,0.08)',
  },

  // Hero — full-bleed photo background, text overlaid on top-left
  hero: {
    height: 258,
    width: '100%',
    overflow: 'hidden',
  },
  heroBgImage: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroTextBlock: {
    paddingLeft: 22,
    paddingRight: 16,
    maxWidth: '64%',
  },
  heroLogoImage: {
    width: 148,
    height: 67,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: NAVY,
    marginTop: 2,
    lineHeight: 25,
  },
  heroTagline: {
    fontSize: 12,
    color: SLATE,
    marginTop: 8,
    lineHeight: 16,
    maxWidth: '84%',
    textShadowColor: 'rgba(244,248,255,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  heroTaglineAccent: {
    color: BLUE_LIGHT,
    fontWeight: '700',
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 26,
    padding: 18,
    shadowColor: '#0F2952',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  welcomeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E9F1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: 0.1,
  },
  cardSubtitle: {
    fontSize: 12,
    color: SLATE,
    marginTop: 2,
  },

  // Biometric button
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BLUE_LIGHT,
    backgroundColor: 'rgba(43,111,236,0.06)',
    marginBottom: 12,
  },
  biometricIconChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(43,111,236,0.12)',
  },
  biometricButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: BLUE_LIGHT,
  },

  // Fields
  fieldGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 5,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '600',
    color: BLUE_LIGHT,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: SURFACE,
    paddingHorizontal: 7,
  },
  inputIconChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  inputIconChipActive: {
    backgroundColor: 'rgba(43,111,236,0.1)',
  },
  eyeIcon: {
    marginLeft: 8,
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    color: NAVY,
  },
  errorText: {
    fontSize: 11,
    color: '#E74C3C',
    marginTop: 3,
    marginLeft: 2,
  },

  // Remember me
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
  },
  checkboxChecked: {
    backgroundColor: BLUE_LIGHT,
    borderColor: BLUE_LIGHT,
  },
  rememberText: {
    fontSize: 13,
    color: NAVY,
    fontWeight: '500',
  },

  // Primary button
  primaryButtonShadowWrap: {
    borderRadius: 14,
    shadowColor: '#1E4A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    height: 48,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  primaryButtonArrow: {
    marginLeft: 8,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerText: {
    fontSize: 12,
    color: SLATE,
    marginHorizontal: 12,
  },

  // Outline buttons
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
  },

  // Bottom
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  bottomText: {
    fontSize: 13,
    color: SLATE,
  },
  bottomLink: {
    fontSize: 13,
    fontWeight: '700',
    color: BLUE_LIGHT,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 36,
    gap: 5,
  },
  termsIcon: {
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 10.5,
    color: SLATE,
    lineHeight: 14,
    textAlign: 'center',
  },
  termsLink: {
    color: BLUE_LIGHT,
    fontWeight: '600',
  },
});
