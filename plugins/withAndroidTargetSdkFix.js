const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

// Google Play requires new apps/updates to target Android 16 (API 36) since
// 2026-08-31; Expo SDK 53 defaults to 35.
const SDK = 36;

// app.config.ts pins compileSdkVersion/targetSdkVersion to 35 via
// expo-build-properties, but that plugin only writes an
// `android.compileSdkVersion`/`android.targetSdkVersion` property into
// gradle.properties — a mechanism the generated android/build.gradle's
// `expo-root-project` Gradle plugin (expo-modules-autolinking) doesn't
// consult at all. That plugin instead resolves `rootProject.ext.compileSdkVersion`
// from Expo's dynamically-generated version catalog (settings.gradle's
// useExpoVersionCatalog()), which @react-native-google-signin/google-signin's
// autolinking skews down to 25/26 — Play Store rejects anything that low
// ("Target SDK of artifact is too low"). Rather than fight that resolution
// chain, hardcode both values directly in the generated app/build.gradle,
// same "this project doesn't commit android/" reasoning as the sibling
// withAndroidManifestPlacementFix plugin.
module.exports = function withAndroidTargetSdkFix(config) {
  // AGP 8.8 (RN 0.79) predates API 36 and warns/fails without this.
  config = withGradleProperties(config, (config) => {
    const props = config.modResults.filter(
      (p) => !(p.type === 'property' && p.key === 'android.suppressUnsupportedCompileSdk'),
    );
    props.push({ type: 'property', key: 'android.suppressUnsupportedCompileSdk', value: String(SDK) });
    config.modResults = props;
    return config;
  });
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    const compileSdkLine = 'compileSdk rootProject.ext.compileSdkVersion';
    if (contents.includes(compileSdkLine)) {
      contents = contents.replace(compileSdkLine, `compileSdk ${SDK}`);
    } else if (!contents.includes(`compileSdk ${SDK}`)) {
      throw new Error(
        'withAndroidTargetSdkFix: expected "compileSdk rootProject.ext.compileSdkVersion" in app/build.gradle — template may have changed.',
      );
    }

    const targetSdkLine = 'targetSdkVersion rootProject.ext.targetSdkVersion';
    if (contents.includes(targetSdkLine)) {
      contents = contents.replace(targetSdkLine, `targetSdkVersion ${SDK}`);
    } else if (!contents.includes(`targetSdkVersion ${SDK}`)) {
      throw new Error(
        'withAndroidTargetSdkFix: expected "targetSdkVersion rootProject.ext.targetSdkVersion" in app/build.gradle — template may have changed.',
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
