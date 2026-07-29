const { withAppBuildGradle } = require('@expo/config-plugins');

// One of this project's native Android deps still pulls in legacy
// pre-AndroidX com.android.support:* artifacts (support-compat,
// versionedparcelable, localbroadcastmanager, ...) alongside their AndroidX
// replacements. Jetifier rewrites the *jetifiable* libraries that reference
// the old artifacts, but doesn't remove the old artifacts themselves from
// the dependency graph, so both versions of identical classes/resources end
// up on the release classpath. This surfaces one module at a time as each
// gets exercised by a different Gradle task — first
// checkReleaseDuplicateClasses ("Duplicate class ... support-compat-28.0.0
// .aar"), then mergeReleaseJavaResource ("2 files found with path
// META-INF/androidx.localbroadcastmanager_localbroadcastmanager.version ...
// com.android.support:localbroadcastmanager:28.0.0") — rather than excluding
// one module per failure, exclude the whole com.android.support group:
// every class/resource it provides already exists in its AndroidX
// equivalent, so this is the standard, safe fix (see
// https://d.android.com/r/tools/classpath-sync-errors).
// This project doesn't commit android/ — Expo regenerates it fresh on every
// prebuild — hence a config plugin instead of hand-editing build.gradle.
module.exports = function withAndroidExcludeLegacySupportLib(config) {
  return withAppBuildGradle(config, (config) => {
    const marker = 'exclude legacy com.android.support (see plugins/withAndroidExcludeLegacySupportLib.js)';
    if (config.modResults.contents.includes(marker)) return config;

    const block = `
// ${marker}
configurations.all {
    exclude group: 'com.android.support'
}
`;
    config.modResults.contents += block;
    return config;
  });
};
