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
  // Registered so pre-existing `eslint-disable-next-line react-hooks/...` /
  // `@typescript-eslint/...` comments elsewhere in the codebase resolve
  // instead of erroring as "rule definition not found" — none of their
  // rules are turned on below, so this stays an accessibility-only gate.
  plugins: ['react-hooks', '@typescript-eslint'],
  rules: {
    // Apple/Android guidance treats accessibilityHint as an exception, not a
    // default: it's for when the *result* of an action isn't clear from the
    // label alone (e.g. hint "Deletes this item" on a label "Delete"). Firing
    // on every single accessibilityLabel produces redundant VoiceOver/TalkBack
    // chatter on ordinary elements like a labeled "Back" button, which is
    // worse UX than the missing label this whole pass exists to fix.
    'react-native-a11y/has-accessibility-hint': 'off',
  },
  ignorePatterns: ['node_modules/', 'android/', 'ios/', 'web-build/', '.expo/'],
};
