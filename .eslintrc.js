// Accessibility-only lint gate — see the "Start accessibility pass" commit
// for context. Deliberately scoped to react-native-a11y's rules alone
// (not a general style/quality ruleset) to avoid drowning the first run
// in unrelated noise; run via `npm run lint:a11y`, not the default `lint`
// script (which stays `tsc --noEmit` so nothing existing breaks).
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    sourceType: 'module',
  },
  extends: ['plugin:react-native-a11y/basic'],
  ignorePatterns: ['node_modules/', 'android/', 'ios/', 'web-build/', '.expo/'],
};
