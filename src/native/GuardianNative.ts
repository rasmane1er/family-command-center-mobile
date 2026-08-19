import { NativeModules, Platform } from 'react-native';

const {
  UsageStatsModule,
  LocationModule,
  DeviceControlModule,
  FamilyControlsModule,
  IOSLocationModule,
  AppBlockerModule,
  FamilyActivityPickerModule,
} = NativeModules;

export interface NativeAppUsage {
  packageName: string;
  appName: string;
  usageMinutes: number;
}

export interface NativeLocation {
  lat: number;
  lng: number;
  accuracy: number;
  address?: string;
  locationAt: string;
}

type PickerResult = {
  applicationCount: number;
  categoryCount: number;
  available: boolean;
  cancelled?: boolean;
};

const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios';

const unavailablePickerResult: PickerResult = {
  applicationCount: 0,
  categoryCount: 0,
  available: false,
};

const safeCall = async <T>(
  fn: (() => Promise<T>) | undefined,
  fallback: T
): Promise<T> => {
  try {
    if (!fn) return fallback;
    // An optional-chained call into a native module that isn't linked in the
    // current binary (e.g. a stale local build predating a new module)
    // resolves to `undefined` rather than throwing, so the try/catch alone
    // doesn't catch it — fall back explicitly on a nullish result too.
    const result = await fn();
    return result ?? fallback;
  } catch {
    return fallback;
  }
};

export const GuardianNative = {
  // Android Usage Stats
  getUsageStats: (date: string): Promise<NativeAppUsage[]> =>
    isAndroid
      ? safeCall(() => UsageStatsModule?.getUsageStats(date), [])
      : Promise.resolve([]),

  hasUsagePermission: (): Promise<boolean> =>
    isAndroid
      ? safeCall(() => UsageStatsModule?.hasUsagePermission(), false)
      : Promise.resolve(false),

  openUsagePermissionSettings: (): Promise<boolean> =>
    isAndroid
      ? safeCall(() => UsageStatsModule?.openUsagePermissionSettings(), false)
      : Promise.resolve(false),

  // Location
  startLocationTracking: (intervalMs: number): Promise<boolean> =>
    isAndroid
      ? safeCall(() => LocationModule?.startLocationTracking(intervalMs), false)
      : isIOS
        ? safeCall(() => IOSLocationModule?.startLocationTracking(intervalMs), false)
        : Promise.resolve(false),

  stopLocationTracking: (): Promise<boolean> =>
    isAndroid
      ? safeCall(() => LocationModule?.stopLocationTracking(), false)
      : isIOS
        ? safeCall(() => IOSLocationModule?.stopLocationTracking(), false)
        : Promise.resolve(false),

  getLastLocation: (): Promise<NativeLocation | null> =>
    isAndroid
      ? safeCall(() => LocationModule?.getLastLocation(), null)
      : isIOS
        ? safeCall(() => IOSLocationModule?.getLastLocation(), null)
        : Promise.resolve(null),

  hasLocationPermission: (): Promise<boolean> =>
    isAndroid
      ? safeCall(() => LocationModule?.hasLocationPermission(), false)
      : isIOS
        ? safeCall(() => IOSLocationModule?.hasLocationPermission(), false)
        : Promise.resolve(false),

  // iOS Screen Time / Family Controls
  requestScreenTimePermission: (): Promise<string> =>
    isIOS
      ? safeCall(
          () => FamilyControlsModule?.requestScreenTimePermission(),
          'unavailable'
        )
      : Promise.resolve('unavailable'),

  isScreenTimeAuthorized: (): Promise<boolean> =>
    isIOS
      ? safeCall(() => FamilyControlsModule?.isAuthorized(), false)
      : Promise.resolve(false),

  setAppRestrictions: (bundleIds: string[]): Promise<boolean> =>
    isIOS
      ? safeCall(() => FamilyControlsModule?.setAppRestrictions(bundleIds), false)
      : Promise.resolve(false),

  clearRestrictions: (): Promise<boolean> =>
    isIOS
      ? safeCall(() => FamilyControlsModule?.clearRestrictions(), false)
      : Promise.resolve(false),

  // Android Device Control
  lockScreen: (): Promise<boolean> =>
    isAndroid
      ? safeCall(() => DeviceControlModule?.lockScreen(), false)
      : Promise.resolve(false),

  isDeviceAdminActive: (): Promise<boolean> =>
    isAndroid
      ? safeCall(() => DeviceControlModule?.isDeviceAdminActive(), false)
      : Promise.resolve(false),

  requestDeviceAdmin: (): Promise<boolean> =>
    isAndroid
      ? safeCall(() => DeviceControlModule?.requestDeviceAdmin(), false)
      : Promise.resolve(false),

  setBedtimeMode: (enabled: boolean): Promise<boolean> =>
    isAndroid
      ? safeCall(() => DeviceControlModule?.setBedtimeMode(enabled), false)
      : Promise.resolve(false),

  setSchoolMode: (enabled: boolean): Promise<boolean> =>
    isAndroid
      ? safeCall(() => DeviceControlModule?.setSchoolMode(enabled), false)
      : Promise.resolve(false),

  // Android App Blocker
  setBlockedApps: (packages: string[]): Promise<boolean> =>
    isAndroid
      ? safeCall(() => AppBlockerModule?.setBlockedApps(packages), false)
      : Promise.resolve(false),

  getBlockedApps: (): Promise<string[]> =>
    isAndroid
      ? safeCall(() => AppBlockerModule?.getBlockedApps(), [])
      : Promise.resolve([]),

  isAccessibilityServiceEnabled: (): Promise<boolean> =>
    isAndroid
      ? safeCall(() => AppBlockerModule?.isAccessibilityServiceEnabled(), false)
      : Promise.resolve(false),

  openAccessibilitySettings: (): Promise<boolean> =>
    isAndroid
      ? safeCall(() => AppBlockerModule?.openAccessibilitySettings(), false)
      : Promise.resolve(false),

  // iOS FamilyActivityPicker
  presentAppPicker: (): Promise<PickerResult> =>
    isIOS
      ? safeCall(
          () => FamilyActivityPickerModule?.presentPicker(),
          unavailablePickerResult
        )
      : Promise.resolve(unavailablePickerResult),

  applyAppRestrictions: (
    applicationCount: number,
    categoryCount: number
  ): Promise<boolean> =>
    isIOS
      ? safeCall(
          () =>
            FamilyActivityPickerModule?.applySelectedRestrictions(
              applicationCount,
              categoryCount
            ),
          false
        )
      : Promise.resolve(false),

  // FCM token handled by Expo notifications
  getFCMToken: (): Promise<string | null> => Promise.resolve(null),
};