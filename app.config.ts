import { ExpoConfig, ConfigContext } from 'expo/config';

// EAS Build sets this during cloud builds (matches the profile names in
// eas.json); unset locally for `expo start`/`expo run:android`, which is
// also a real dev scenario needing plain HTTP to a LAN IP.
const isDevBuild = !process.env.EAS_BUILD_PROFILE || process.env.EAS_BUILD_PROFILE === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Family Command Center',
  slug: 'family-command-center',
  scheme: 'familycommandcenter',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './src/assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './src/assets/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  ios: {
    supportsTablet: true,
    // 'com.familycommandcenter.app' is permanently registered to an
    // unrelated, inaccessible Apple Developer account (confirmed: no result
    // anywhere in this account's Identifiers, App Store Connect, or a fresh
    // registration attempt) — Android's package name is unaffected and
    // deliberately kept as the original string since it has no equivalent
    // global-collision risk.
    bundleIdentifier: 'com.grasmane.familycommandcenter',
    googleServicesFile: './GoogleService-Info.plist',
    usesAppleSignIn: true,
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ?? '',
    },
    infoPlist: {
      NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
      NSLocalNetworkUsageDescription:
        'Family Command Center connects to your Philips Hue Bridge on your home WiFi network to control your smart lights.',
      // The app only uses standard HTTPS/TLS (via Plaid, Firebase, RevenueCat,
      // etc.) — no proprietary/non-exempt encryption — so this is accurate and
      // skips Apple's manual export-compliance prompt on every TestFlight build.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './src/assets/icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.familycommandcenter.app',
    googleServicesFile: './google-services.json',
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ?? '',
      },
    },
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
    ],
  },
  web: {
    favicon: './src/assets/favicon.png',
  },
  plugins: [
    'expo-font',
    'expo-notifications',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Family Command Center to access your photos.',
        cameraPermission: 'Allow Family Command Center to use your camera.',
      },
    ],
    [
      'expo-contacts',
      {
        contactsPermission:
          'Allow Family Command Center to access your contacts so you can invite family members.',
      },
    ],
    ['expo-document-picker', { iCloudContainerEnvironment: 'Production' }],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Allow Family Command Center to use your current location to center a new geofence zone.',
      },
    ],
    'expo-secure-store',
    'expo-web-browser',
    'expo-apple-authentication',
    [
      'expo-local-authentication',
      {
        faceIDPermission:
          'Allow Family Command Center to use Face ID to unlock the app.',
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission:
          'Allow Family Command Center to access the microphone for voice input to the AI Assistant.',
        speechRecognitionPermission:
          'Allow Family Command Center to recognize your speech for voice input to the AI Assistant.',
      },
    ],
    './plugins/withAndroidManifestPlacementFix.js',
    './plugins/withAndroidExcludeLegacySupportLib.js',
    './plugins/withFmtConstevalFix.js',
    [
      'expo-build-properties',
      {
        android: { usesCleartextTraffic: isDevBuild },
        // expo-speech-recognition's podspec requires iOS 16.4+ (on-device
        // speech recognition APIs introduced that version) — CocoaPods
        // silently drops any pod whose minimum iOS version exceeds the
        // project's deployment target rather than erroring, which is why
        // this pod was missing from Podfile.lock with no build failure to
        // point at it. iOS 16.4 shipped March 2023; adoption has been
        // well over 90% for years, so this doesn't meaningfully narrow
        // device support.
        ios: { useFrameworks: 'static', deploymentTarget: '16.4' },
      },
    ],
    'expo-localization',
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    '@react-native-firebase/messaging',
    // organization/project let EAS builds upload source maps under this
    // project so Sentry stack traces resolve to real file/line instead of
    // minified bundle positions. SENTRY_AUTH_TOKEN is an EAS secret env var
    // (preview + production) — never put an auth token in this file.
    ['@sentry/react-native', { organization: 'opportunity-corridor', project: 'react-native' }],
  ],
  extra: {
    eas: { projectId: '82729187-433d-4547-b35a-8b432f5a1a20' },
  },
  owner: 'grasmane',
});
