const { withAndroidManifest } = require('@expo/config-plugins');

// Android 11+ (API 30+) hides other apps/services from PackageManager queries
// unless they're declared in a <queries> block. @react-native-voice/voice
// calls SpeechRecognizer.isRecognitionAvailable(), which depends on being
// able to see the RecognitionService — without this, Voice.isAvailable()
// silently returns false on real Android 11+ devices even though Google
// Speech Services is installed and RECORD_AUDIO is granted.
const SPEECH_INTENT_ACTIONS = [
  'android.speech.RecognitionService',
  'android.speech.action.RECOGNIZE_SPEECH',
];

module.exports = function withAndroidSpeechQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest.queries) manifest.queries = [{}];
    const queriesEl = manifest.queries[0];
    if (!queriesEl.intent) queriesEl.intent = [];

    for (const actionName of SPEECH_INTENT_ACTIONS) {
      const exists = queriesEl.intent.some((intent) =>
        intent.action?.some((a) => a.$?.['android:name'] === actionName)
      );
      if (!exists) {
        queriesEl.intent.push({ action: [{ $: { 'android:name': actionName } }] });
      }
    }

    return config;
  });
};
