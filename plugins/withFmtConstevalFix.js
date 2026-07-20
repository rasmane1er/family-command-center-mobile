const { withPodfile } = require('@expo/config-plugins');

// Xcode 26 ships a newer Clang that tightened how it validates C++20 consteval
// functions. The {fmt} library vendored inside React Native (via RCT-Folly,
// on RN 0.79) relies on compile-time format-string checking through consteval
// constructors that no longer satisfy the stricter constant-expression rules,
// so the Xcode build fails with "call to consteval function ... is not a
// constant expression" deep inside fmt's headers — nothing in this project's
// own code is at fault. Fixed upstream in later fmt/RN releases; until this
// project upgrades off RN 0.79, compiling just the 'fmt' (and 'RCT-Folly',
// which bundles it) pod targets against C++17 instead of C++20 skips the
// consteval code path entirely — fmt falls back to its runtime format-string
// validation, and the rest of the project keeps using C++20 (RN's own code
// needs it). This project doesn't commit ios/ — Expo regenerates it fresh on
// every prebuild — hence a config plugin instead of hand-editing the Podfile.
//
// Must run AFTER react_native_post_install(...), not before: that helper
// re-applies CLANG_CXX_LANGUAGE_STANDARD=c++20 across pod targets itself, so
// an override placed earlier in post_install gets silently clobbered —
// confirmed by a real EAS build still failing identically with the fix
// applied at the top of the block.
const AFFECTED_PODS = ['fmt', 'RCT-Folly'];

module.exports = function withFmtConstevalFix(config) {
  return withPodfile(config, (config) => {
    const marker = 'fmt consteval fix for Xcode 26';
    if (config.modResults.contents.includes(marker)) return config;

    const hook = `
  # ${marker} (see plugins/withFmtConstevalFix.js)
  installer.pods_project.targets.each do |target|
    next unless ${JSON.stringify(AFFECTED_PODS)}.include?(target.name)
    target.build_configurations.each do |build_config|
      build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
    end
  end
`;

    // Insert right after the react_native_post_install(...) call closes, so
    // this fix applies on top of (not underneath) whatever it sets.
    const reactNativePostInstallRegex = /(react_native_post_install\(\s*installer,[\s\S]*?\n\s*\)\n)/;
    if (reactNativePostInstallRegex.test(config.modResults.contents)) {
      config.modResults.contents = config.modResults.contents.replace(
        reactNativePostInstallRegex,
        `$1${hook}`
      );
    } else {
      // Fallback: no react_native_post_install call found (unexpected
      // template shape) — append right after post_install opens instead of
      // silently doing nothing.
      const postInstallRegex = /(post_install do \|installer\|)/;
      if (postInstallRegex.test(config.modResults.contents)) {
        config.modResults.contents = config.modResults.contents.replace(
          postInstallRegex,
          `$1\n${hook}`
        );
      } else {
        config.modResults.contents += `\npost_install do |installer|\n${hook}end\n`;
      }
    }

    return config;
  });
};
