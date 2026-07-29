const { withAndroidManifest } = require('@expo/config-plugins');

// One of this project's native Android deps still ships a legacy
// com.android.support:support-compat:28.0.0 artifact (pre-AndroidX) instead
// of the androidx.* equivalent, and Jetifier doesn't rewrite every artifact
// it pulls in. Both that legacy artifact and androidx.core:core declare the
// application's android:appComponentFactory in their own AndroidManifest.xml
// with different values (android.support.v4.app.CoreComponentFactory vs
// androidx.core.app.CoreComponentFactory), so the manifest merger fails with
// "Attribute application@appComponentFactory ... is also present at
// [com.android.support:support-compat:28.0.0] ... Suggestion: add
// tools:replace="android:appComponentFactory"" — that's Gradle's own
// suggested resolution for this conflict, applied here. tools:replace alone
// isn't sufficient though — the merger additionally requires the winning
// value to actually be present on the same tag ("tools:replace specified...
// but no new value specified"), so android:appComponentFactory is set
// explicitly to the AndroidX value we want to keep.
// This project doesn't commit android/ — Expo regenerates it fresh on every
// prebuild — hence a config plugin instead of hand-editing the manifest.
module.exports = function withAndroidManifestPlacementFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest.$) manifest.$ = {};
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const application = manifest.application?.[0];
    if (application) {
      if (!application.$) application.$ = {};
      const attr = 'android:appComponentFactory';
      const existingReplace = application.$['tools:replace'];
      if (!existingReplace) {
        application.$['tools:replace'] = attr;
      } else if (!existingReplace.split(',').map((s) => s.trim()).includes(attr)) {
        application.$['tools:replace'] = `${existingReplace},${attr}`;
      }
      application.$[attr] = 'androidx.core.app.CoreComponentFactory';
    }

    return config;
  });
};
