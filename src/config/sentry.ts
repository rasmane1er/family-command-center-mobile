import * as Sentry from '@sentry/react-native';

// Set EXPO_PUBLIC_SENTRY_DSN (Sentry dashboard → Settings → Client Keys) as
// an EAS environment variable for preview/production builds — see eas.json
// and .env.example. Left unset in local dev: initSentry() becomes a no-op so
// crashes during development don't spam a shared Sentry project.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!dsn) {
    if (!__DEV__) {
      console.warn('[sentry] EXPO_PUBLIC_SENTRY_DSN is not set — crash reporting is disabled in this build.');
    }
    return;
  }
  Sentry.init({
    dsn,
    debug: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: 0.2,
  });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!dsn) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
