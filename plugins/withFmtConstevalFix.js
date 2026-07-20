const { withPodfile } = require('@expo/config-plugins');

// Xcode 26's Clang enforces C++20 consteval strictly, which breaks fmt (bundled
// transitively via RCT-Folly, a React Native native dependency) on RN 0.79 —
// fmt's compile-time format-string validation relies on consteval constructors
// that Xcode 26 rejects with "call to consteval function ... is not a constant
// expression". Fixed upstream in later RN/fmt releases, but until this project
// upgrades off RN 0.79, defining FMT_CONSTEVAL as empty disables that
// compile-time check (fmt falls back to runtime validation) and lets the same
// code compile under the newer toolchain. This project doesn't commit ios/, so
// there's no Podfile to hand-edit — Expo regenerates it fresh on every prebuild,
// hence a config plugin instead.
module.exports = function withFmtConstevalFix(config) {
  return withPodfile(config, (config) => {
    const marker = "FMT_CONSTEVAL fix for Xcode 26";
    if (config.modResults.contents.includes(marker)) return config;

    const hook = `
  # ${marker} (see plugins/withFmtConstevalFix.js)
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |build_config|
      defs = build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
      defs = [defs] if defs.is_a?(String)
      defs << 'FMT_CONSTEVAL='
      build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
    end
  end
`;

    const postInstallRegex = /(post_install do \|installer\|)/;
    if (postInstallRegex.test(config.modResults.contents)) {
      config.modResults.contents = config.modResults.contents.replace(
        postInstallRegex,
        `$1\n${hook}`
      );
    } else {
      config.modResults.contents += `\npost_install do |installer|\n${hook}end\n`;
    }

    return config;
  });
};
