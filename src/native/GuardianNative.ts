import { NativeModules, Platform } from 'react-native';

const { UsageStatsModule, LocationModule, DeviceControlModule, FamilyControlsModule, IOSLocationModule, AppBlockerModule } = NativeModules;

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

const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios';

export const GuardianNative = {
  // Usage Stats (Android only)
  getUsageStats: (date: string): Promise<NativeAppUsage[]> =>
    isAndroid ? UsageStatsModule.getUsageStats(date) : Promise.resolve([]),
  hasUsagePermission: (): Promise<boolean> =>
    isAndroid ? UsageStatsModule.hasUsagePermission() : Promise.resolve(false),
  openUsagePermissionSettings: (): Promise<boolean> =>
    isAndroid ? UsageStatsModule.openUsagePermissionSettings() : Promise.resolve(false),

  // Location (cross-platform)
  startLocationTracking: (intervalMs: number): Promise<boolean> =>
    isAndroid
      ? LocationModule.startLocationTracking(intervalMs)
      : isIOS
        ? IOSLocationModule.startLocationTracking(intervalMs)
        : Promise.resolve(false),
  stopLocationTracking: (): Promise<boolean> =>
    isAndroid
      ? LocationModule.stopLocationTracking()
      : isIOS
        ? IOSLocationModule.stopLocationTracking()
        : Promise.resolve(false),
  getLastLocation: (): Promise<NativeLocation | null> =>
    isAndroid
      ? LocationModule.getLastLocation()
      : isIOS
        ? IOSLocationModule.getLastLocation()
        : Promise.resolve(null),
  hasLocationPermission: (): Promise<boolean> =>
    isAndroid
      ? LocationModule.hasLocationPermission()
      : isIOS
        ? IOSLocationModule.hasLocationPermission()
        : Promise.resolve(false),

  // iOS Screen Time / Family Controls (iOS 16+ only)

  /**
   * Request Screen Time (FamilyControls) authorization.
   * Resolves: "authorized" | "denied" | "notDetermined" | "unavailable"
   */
  requestScreenTimePermission: (): Promise<string> =>
    isIOS ? FamilyControlsModule.requestScreenTimePermission() : Promise.resolve('unavailable'),

  /**
   * Check whether Screen Time authorization is currently approved.
   * Resolves: boolean
   */
  isScreenTimeAuthorized: (): Promise<boolean> =>
    isIOS ? FamilyControlsModule.isAuthorized() : Promise.resolve(false),

  /**
   * Apply app restrictions for the given bundle IDs.
   *
   * NOTE: Apple does not allow creating ApplicationTokens from bundle identifiers.
   * To shield specific apps you must present FamilyActivityPicker (SwiftUI) and
   * obtain a FamilyActivitySelection from the user. This method is provided for
   * API surface compatibility; the bundleIds argument is currently unused at the
   * native layer.
   *
   * Resolves: boolean
   */
  setAppRestrictions: (bundleIds: string[]): Promise<boolean> =>
    isIOS ? FamilyControlsModule.setAppRestrictions(bundleIds) : Promise.resolve(false),

  /**
   * Clear all ManagedSettings shield restrictions.
   * Resolves: boolean
   */
  clearRestrictions: (): Promise<boolean> =>
    isIOS ? FamilyControlsModule.clearRestrictions() : Promise.resolve(false),

  // Device Control
  lockScreen: (): Promise<boolean> =>
    isAndroid ? DeviceControlModule.lockScreen() : Promise.resolve(false),
  isDeviceAdminActive: (): Promise<boolean> =>
    isAndroid ? DeviceControlModule.isDeviceAdminActive() : Promise.resolve(false),
  requestDeviceAdmin: (): Promise<boolean> =>
    isAndroid ? DeviceControlModule.requestDeviceAdmin() : Promise.resolve(false),
  setBedtimeMode: (enabled: boolean): Promise<boolean> =>
    isAndroid ? DeviceControlModule.setBedtimeMode(enabled) : Promise.resolve(false),
  setSchoolMode: (enabled: boolean): Promise<boolean> =>
    isAndroid ? DeviceControlModule.setSchoolMode(enabled) : Promise.resolve(false),

  // App Blocker (Android only — AccessibilityService)
  setBlockedApps: (packages: string[]): Promise<boolean> =>
    isAndroid ? AppBlockerModule.setBlockedApps(packages) : Promise.resolve(false),
  getBlockedApps: (): Promise<string[]> =>
    isAndroid ? AppBlockerModule.getBlockedApps() : Promise.resolve([]),
  isAccessibilityServiceEnabled: (): Promise<boolean> =>
    isAndroid ? AppBlockerModule.isAccessibilityServiceEnabled() : Promise.resolve(false),
  openAccessibilitySettings: (): Promise<boolean> =>
    isAndroid ? AppBlockerModule.openAccessibilitySettings() : Promise.resolve(false),

  // FCM token - handled by expo-notifications in the child app
  // In the parent app we just expose a placeholder
  getFCMToken: (): Promise<string | null> => Promise.resolve(null),
};
