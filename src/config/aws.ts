import { API_BASE_URL } from './api';

// Single source of truth for the API host — was previously hardcoded to
// 'http://localhost:3001' here, separately from API_BASE_URL in config/api.ts.
// 'localhost' only resolves correctly on an iOS simulator (where it means
// "this Mac"); on Android emulators/physical devices it means "this device",
// so every request silently failed there — which is why syncWithBackend()
// (useAuthStore) could never link the account no matter how many times you
// signed in. Reusing API_BASE_URL means both configs move together from now on.
export const awsConfig = {
  apiBaseUrl: API_BASE_URL,
  s3Bucket: '',
  region: 'us-east-1',
};