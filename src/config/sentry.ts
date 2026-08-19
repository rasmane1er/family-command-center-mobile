import * as Sentry from '@sentry/react-native';
import { API_BASE_URL } from './api';

// Set EXPO_PUBLIC_SENTRY_DSN (Sentry dashboard → Settings → Client Keys) as
// an EAS environment variable for preview/production builds — see eas.json
// and .env.example. Left unset in local dev: initSentry() becomes a no-op so
// crashes during development don't spam a shared Sentry project.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// Created once at module scope (not inside initSentry()) so AppNavigator can
// import the same instance and call registerNavigationContainer on it —
// Sentry.init() below just needs to receive it in `integrations`.
export const navigationIntegration = Sentry.reactNavigationIntegration();

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
    integrations: [navigationIntegration],
    // Lets outgoing API calls carry sentry-trace/baggage headers, so a
    // request that starts here continues as the SAME distributed trace once
    // it reaches the backend (see family-command-center-api/src/instrument.ts
    // — its httpIntegration picks these headers up automatically). Without
    // this, a mobile trace and the backend trace it triggered are two
    // disconnected halves instead of one end-to-end trace.
    tracePropagationTargets: [API_BASE_URL],
  });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!dsn) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
