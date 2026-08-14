import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Alert,
  Image,
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGuardianStore } from '../../../store/useGuardianStore';
import { useFamilyStore } from '../../../store/useFamilyStore';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/spacing';
import { CollapsibleHeader } from '../../../components/common/CollapsibleHeader';
import type { ChildDeviceStatus } from '../../../types';
import { GuardianNative, type NativeAppUsage } from '../../../native/GuardianNative';
import { useTranslation } from 'react-i18next';

const statusColors: Record<ChildDeviceStatus, string> = {
  online: colors.success,
  offline: colors.textMuted,
  school_mode: '#2980B9',
  bedtime: '#6A1B9A',
  restricted: colors.danger,
};

const statusLabels: Record<ChildDeviceStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  school_mode: 'School Mode',
  bedtime: 'Bedtime',
  restricted: 'Restricted',
};

function formatLastSeen(iso: string): string {
  if (!iso) return 'Unknown';

  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

export function ChildDeviceDetailScreen({ navigation, route }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const { deviceId } = route.params ?? {};

  const devices = useGuardianStore((s) => s.devices);
  const appUsage = useGuardianStore((s) => s.appUsage);
  const screenTimeRules = useGuardianStore((s) => s.screenTimeRules);
  const sendCommand = useGuardianStore((s) => s.sendCommand);
  const hydrate = useGuardianStore((s) => s.hydrate);
  const streamingDeviceId = useGuardianStore((s) => s.streamingDeviceId);
  const setStreamingDeviceId = useGuardianStore((s) => s.setStreamingDeviceId);

  const [repairCode, setRepairCode] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);

  // Screenshot / live view state
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotAt, setScreenshotAt] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  // liveViewActive is derived from the store so it persists across navigations
  const liveViewActive = streamingDeviceId === deviceId;
  const liveViewInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Web filter toggle — initialised from server state and kept in sync
  const [webFilterOn, setWebFilterOn] = useState(false);

  // Notification feed state
  const [notifications, setNotifications] = useState<
    { id: string; packageName: string; title: string; text: string; receivedAt: string }[]
  >([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const fetchScreenshot = useCallback(async () => {
    if (!deviceId) return;
    try {
      const { apiRequest } = await import('../../../api/client');
      const res = await apiRequest(`/guardian/devices/${deviceId}/screenshot`) as { jpeg: string | null; capturedAt: string | null };
      if (res.jpeg) {
        setScreenshot(res.jpeg);
        setScreenshotAt(res.capturedAt);
      }
    } catch { /* silent */ }
  }, [deviceId]);

  const handleTakeScreenshot = useCallback(async () => {
    if (!deviceId) return;
    setScreenshotLoading(true);
    const sentAt = Date.now();
    sendCommand(deviceId, 'take_screenshot');
    // Poll every 2s for up to 30s — child may need to grant screen capture permission first
    const poll = async () => {
      try {
        const { apiRequest } = await import('../../../api/client');
        const res = await apiRequest(`/guardian/devices/${deviceId}/screenshot`) as { jpeg: string | null; capturedAt: string | null };
        if (res.jpeg && res.capturedAt && new Date(res.capturedAt).getTime() >= sentAt) {
          setScreenshot(res.jpeg);
          setScreenshotAt(res.capturedAt);
          setScreenshotLoading(false);
          return true;
        }
      } catch { /* retry */ }
      return false;
    };
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      if (await poll()) return;
    }
    setScreenshotLoading(false);
  }, [deviceId, sendCommand]);

  const toggleLiveView = useCallback(async () => {
    if (!deviceId) return;
    if (liveViewActive) {
      sendCommand(deviceId, 'stop_screen_stream');
      if (liveViewInterval.current) clearInterval(liveViewInterval.current);
      liveViewInterval.current = null;
      setStreamingDeviceId(null);
    } else {
      sendCommand(deviceId, 'start_screen_stream', { intervalMs: 1500 });
      setStreamingDeviceId(deviceId);
      // Poll for frames every 1.5s
      liveViewInterval.current = setInterval(fetchScreenshot, 1500);
    }
  }, [deviceId, liveViewActive, sendCommand, fetchScreenshot, setStreamingDeviceId]);

  const handleSaveScreenshot = useCallback(async () => {
    if (!screenshot || !deviceId) return;
    try {
      const filename = `child_screenshot_${Date.now()}.jpg`;
      const path = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, screenshot, {
        encoding: FileSystem.EncodingType.Base64,
      });
      // Share sheet lets guardian save to Photos, Files, AirDrop, etc.
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, { mimeType: 'image/jpeg', dialogTitle: 'Save Screenshot' });
      }
      // Delete from server after sharing so it doesn't persist there
      try {
        const { apiRequest } = await import('../../../api/client');
        await apiRequest(`/guardian/devices/${deviceId}/screenshot`, { method: 'DELETE' });
      } catch { /* non-fatal */ }
      setScreenshot(null);
      setScreenshotAt(null);
    } catch {
      Alert.alert('Error', 'Could not save screenshot.');
    }
  }, [screenshot, deviceId]);

  // Resume polling if live view was active when we navigated back
  useEffect(() => {
    if (liveViewActive && !liveViewInterval.current) {
      liveViewInterval.current = setInterval(fetchScreenshot, 1500);
    }
    return () => {
      if (liveViewInterval.current) {
        clearInterval(liveViewInterval.current);
        liveViewInterval.current = null;
      }
    };
  }, [liveViewActive]);

  const fetchNotifications = useCallback(async () => {
    if (!deviceId) return;
    setNotifLoading(true);
    try {
      const { apiRequest } = await import('../../../api/client');
      const res = await apiRequest(`/guardian/devices/${deviceId}/notifications?limit=30`) as {
        notifications: { id: string; packageName: string; title: string; text: string; receivedAt: string }[];
      };
      setNotifications(res.notifications ?? []);
    } catch { /* silent */ } finally {
      setNotifLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchNotifications();
    fetchScreenshot();
  }, [deviceId]);

  const handleRepair = useCallback(async () => {
    if (!deviceId) return;
    setRepairing(true);
    try {
      const { apiRequest } = await import('../../../api/client');
      const res = await apiRequest(`/guardian/devices/${deviceId}/repair`, { method: 'POST' }) as { pairingCode: string };
      setRepairCode(res.pairingCode);
      await hydrate();
    } catch {
      Alert.alert('Error', 'Could not generate a reconnect code. Please try again.');
    } finally {
      setRepairing(false);
    }
  }, [deviceId, hydrate]);

  const members = useFamilyStore((s) => s.members);

  const device = devices.find((d) => d.id === deviceId);
  const member = members.find((m) => m.id === device?.memberId);

  // Sync web filter toggle from server-side device state (single source of truth)
  useEffect(() => {
    if (device?.webFilterEnabled !== undefined) {
      setWebFilterOn(device.webFilterEnabled);
    }
  }, [device?.webFilterEnabled]);

  const [nativeUsage, setNativeUsage] = useState<NativeAppUsage[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    GuardianNative.getUsageStats(today)
      .then((stats) => {
        if (stats && stats.length > 0) {
          setNativeUsage(
            stats
              .sort((a, b) => b.usageMinutes - a.usageMinutes)
              .slice(0, 5)
          );
        }
      })
      .catch(() => {});
  }, []);

  if (!device) {
    return (
      <View style={[styles.container, styles.notFoundContainer]}>
        <Ionicons name="phone-portrait-outline" size={48} color={colors.textMuted} />
        <Text style={styles.notFoundTitle}>Device not found</Text>
        <Text style={styles.notFoundText}>
          This child device may have been removed or is no longer paired.
        </Text>
      </View>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const todayUsage = appUsage
    .filter((u) => u.deviceId === deviceId && u.date === today)
    .sort((a, b) => b.usageMinutes - a.usageMinutes)
    .slice(0, 5);

  const rule = screenTimeRules.find(
    (r) => r.memberId === device.memberId && r.isActive
  );

  const totalUsageToday = todayUsage.reduce(
    (sum, u) => sum + u.usageMinutes,
    0
  );

  const limitProgress =
    rule && rule.dailyLimitMinutes > 0
      ? Math.min(1, totalUsageToday / rule.dailyLimitMinutes)
      : 0;

  const progressColor =
    limitProgress > 0.8
      ? colors.danger
      : limitProgress > 0.6
        ? colors.warning
        : colors.success;

  const handleCommand = (
    type:
      | 'lock'
      | 'unlock'
      | 'school_on'
      | 'school_off'
      | 'bedtime_on'
      | 'bedtime_off'
      | 'location_request'
  ) => {
    const labels: Record<string, string> = {
      lock: 'Lock Device',
      unlock: 'Unlock Device',
      school_on: 'Enable School Mode',
      school_off: 'Disable School Mode',
      bedtime_on: 'Enable Bedtime',
      bedtime_off: 'Disable Bedtime',
      location_request: 'Request Location Update',
    };

    Alert.alert(
      labels[type],
      `Send "${labels[type]}" to ${device.deviceName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            sendCommand(device.id, type);
          },
        },
      ]
    );
  };

  const activeStatusColor = statusColors[device.status];
  const activeStatusLabel = statusLabels[device.status];

  const platformLabel = device.platform === 'ios' ? 'iOS' : 'Android';
  const platformIcon = device.platform === 'ios' ? 'logo-apple' : 'logo-android';

  const screenHeader = (
    <LinearGradient
      colors={['#081B33', '#0F2952', '#1E4A8A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.headerGlow} />

      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.getParent()?.navigate('Home')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.headerTextBlock}>
          <Text style={styles.headerEyebrow}>Guardian Device</Text>
          <Text style={styles.headerTitle}>{member?.name ?? 'Unknown Child'}</Text>
          <Text style={styles.headerSubtitle}>{device.deviceName}</Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: activeStatusColor + '30' }]}>
          <View style={[styles.statusDot, { backgroundColor: activeStatusColor }]} />
          <Text style={styles.statusLabel}>{activeStatusLabel}</Text>
        </View>
      </View>

      <View style={styles.headerStats}>
        <View style={styles.statCard}>
          <Ionicons name={platformIcon as any} size={18} color="#fff" />
          <Text style={styles.statValue}>{platformLabel}</Text>
          <Text style={styles.statLabel}>Platform</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="battery-half" size={18} color="#fff" />
          <Text style={styles.statValue}>{device.batteryLevel}%</Text>
          <Text style={styles.statLabel}>Battery</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="time-outline" size={18} color="#fff" />
          <Text style={styles.statValue}>{formatLastSeen(device.lastSeen)}</Text>
          <Text style={styles.statLabel}>Last Seen</Text>
        </View>
      </View>

      <View style={styles.headerFooter}>
        <View style={styles.footerChip}>
          <Ionicons name="shield-checkmark" size={14} color="rgba(255,255,255,0.85)" />
          <Text style={styles.footerChipText}>
            {rule ? 'Rules Active' : 'No Rule Set'}
          </Text>
        </View>

        <View style={styles.footerChip}>
          <Ionicons name="time" size={14} color="rgba(255,255,255,0.85)" />
          <Text style={styles.footerChipText}>
            {Math.floor(totalUsageToday / 60)}h {totalUsageToday % 60}m today
          </Text>
        </View>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#081B33', '#0F2952']}
      style={[styles.compactHeader, { paddingTop: insets.top }]}
    >
      <Pressable accessibilityRole="button" onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.getParent()?.navigate('Home')} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>

      <View style={styles.compactTitleBlock}>
        <Text style={styles.compactTitle}>{member?.name ?? 'Device'}</Text>
        <Text style={styles.compactSubtitle}>{device.deviceName}</Text>
      </View>

      <View style={[styles.compactStatusDot, { backgroundColor: activeStatusColor }]} />
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({
          onScroll,
          onScrollEndDrag,
          onMomentumScrollEnd,
          scrollEventThrottle,
          contentPaddingTop,
        }) => (
          <ScrollView
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom: 100,
                paddingTop: contentPaddingTop,
              },
            ]}
          >
            {/* Reconnect banner — shown when device is offline */}
            {device.status === 'offline' && (
              <View style={[styles.card, shadows.card, { marginBottom: 12 }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="wifi-outline" size={18} color={colors.warning} />
                  <Text style={[styles.cardTitle, { color: colors.warning }]}>Device Offline</Text>
                </View>
                {repairCode ? (
                  <View>
                    <Text style={styles.sectionLabel}>Share this code with the child device to reconnect:</Text>
                    <Text style={[styles.coordText, { fontSize: 28, letterSpacing: 6, textAlign: 'center', marginVertical: 12 }]}>
                      {repairCode}
                    </Text>
                    <Text style={[styles.coordSubText, { textAlign: 'center' }]}>
                      Open the Family Guardian app on the child device and enter this code.
                    </Text>
                    <Pressable accessibilityRole="button"
                      style={[styles.commandBtn, { alignSelf: 'center', marginTop: 8, paddingHorizontal: 20 }]}
                      onPress={() => setRepairCode(null)}
                    >
                      <Text style={[styles.commandLabel, { color: colors.textMuted }]}>Dismiss</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable accessibilityRole="button"
                    style={[styles.commandBtn, { alignSelf: 'flex-start', flexDirection: 'row', gap: 8 }]}
                    onPress={handleRepair}
                    disabled={repairing}
                  >
                    <Ionicons name="refresh-circle-outline" size={20} color={colors.primary} />
                    <Text style={[styles.commandLabel, { color: colors.primary }]}>
                      {repairing ? 'Generating code…' : 'Reconnect Device'}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            <View style={styles.commandsRow}>
              {[
                (device.status === 'restricted' || (device.status as string) === 'locked')
                  ? { label: 'Unlock', icon: 'lock-open', color: colors.success, cmd: 'unlock' as const }
                  : { label: 'Lock', icon: 'lock-closed', color: colors.danger, cmd: 'lock' as const },
                device.status === 'school_mode'
                  ? { label: 'School ✓', icon: 'school', color: '#2980B9', cmd: 'school_off' as const }
                  : { label: 'School', icon: 'school', color: '#2980B9', cmd: 'school_on' as const },
                device.status === 'bedtime'
                  ? { label: 'Bedtime ✓', icon: 'moon', color: '#6A1B9A', cmd: 'bedtime_off' as const }
                  : { label: 'Bedtime', icon: 'moon', color: '#6A1B9A', cmd: 'bedtime_on' as const },
                {
                  label: 'Location',
                  icon: 'locate',
                  color: colors.success,
                  cmd: 'location_request' as const,
                },
              ].map((item) => (
                <Pressable accessibilityRole="button"
                  key={item.cmd}
                  style={[styles.commandBtn, shadows.sm]}
                  onPress={() => handleCommand(item.cmd)}
                >
                  <View
                    style={[
                      styles.commandIcon,
                      { backgroundColor: item.color + '18' },
                    ]}
                  >
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={[styles.commandLabel, { color: item.color }]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.card, shadows.card]}>
              <View style={styles.cardHeader}>
                <Ionicons name="location" size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>Last Known Location</Text>
              </View>

              {device.location ? (
                <View>
                  {device.location.address && (
                    <Text style={styles.addressText}>
                      {device.location.address}
                    </Text>
                  )}

                  <Text style={styles.coordText}>
                    {device.location.lat.toFixed(5)}, {device.location.lng.toFixed(5)}
                  </Text>

                  <Text style={styles.coordSubText}>
                    Accuracy: ±{device.location.accuracy}m ·{' '}
                    {formatLastSeen(device.location.timestamp ?? '')}
                  </Text>

                  <Pressable accessibilityRole="button"
                    style={styles.refreshBtn}
                    onPress={() => handleCommand('location_request')}
                  >
                    <Ionicons name="refresh" size={14} color={colors.primary} />
                    <Text style={styles.refreshBtnText}>
                      Request Location Update
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.noLocation}>
                  <Ionicons
                    name="location-outline"
                    size={32}
                    color={colors.textMuted}
                  />
                  <Text style={styles.noLocationText}>No location data</Text>

                  <Pressable accessibilityRole="button"
                    style={styles.refreshBtn}
                    onPress={() => handleCommand('location_request')}
                  >
                    <Ionicons name="locate" size={14} color={colors.primary} />
                    <Text style={styles.refreshBtnText}>Request Location</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={[styles.card, shadows.card]}>
              <View style={styles.cardHeader}>
                <Ionicons name="time" size={18} color="#8E44AD" />
                <Text style={styles.cardTitle}>Screen Time Today</Text>

                <Pressable accessibilityRole="button"
                  onPress={() => navigation.navigate('ScreenTime')}
                  style={styles.cardAction}
                >
                  <Text style={styles.cardActionText}>Manage</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.primary}
                  />
                </Pressable>
              </View>

              <View style={styles.screenTimeRing}>
                <View style={styles.ringOuter}>
                  <View
                    style={[
                      styles.ringFill,
                      {
                        width: `${Math.round(limitProgress * 100)}%`,
                        backgroundColor: progressColor,
                      },
                    ]}
                  />
                </View>

                <View style={styles.screenTimeNumbers}>
                  <Text style={styles.screenTimeValue}>
                    {Math.floor(totalUsageToday / 60)}h {totalUsageToday % 60}m
                  </Text>

                  <Text style={styles.screenTimeLabel}>
                    {rule && rule.dailyLimitMinutes > 0
                      ? `of ${Math.floor(rule.dailyLimitMinutes / 60)}h ${
                          rule.dailyLimitMinutes % 60
                        }m limit`
                      : 'No daily limit set'}
                  </Text>
                </View>
              </View>
            </View>

            {(nativeUsage.length > 0 || todayUsage.length > 0) && (
              <View style={[styles.card, shadows.card]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="apps" size={18} color={colors.info} />
                  <Text style={styles.cardTitle}>Top Apps Today</Text>
                </View>

                {nativeUsage.length > 0
                  ? nativeUsage.map((entry) => {
                      const maxMins = nativeUsage[0].usageMinutes;
                      const barWidth =
                        maxMins > 0 ? (entry.usageMinutes / maxMins) * 100 : 0;

                      return (
                        <View key={entry.packageName} style={styles.appRow}>
                          <Text style={styles.appName} numberOfLines={1}>
                            {entry.appName}
                          </Text>

                          <View style={styles.appBarContainer}>
                            <View style={[styles.appBar, { width: `${barWidth}%` }]} />
                          </View>

                          <Text style={styles.appMins}>{entry.usageMinutes}m</Text>
                        </View>
                      );
                    })
                  : todayUsage.map((entry) => {
                      const maxMins = todayUsage[0].usageMinutes;
                      const barWidth =
                        maxMins > 0 ? (entry.usageMinutes / maxMins) * 100 : 0;

                      return (
                        <View key={entry.id} style={styles.appRow}>
                          <Text style={styles.appName} numberOfLines={1}>
                            {entry.appName}
                          </Text>

                          <View style={styles.appBarContainer}>
                            <View style={[styles.appBar, { width: `${barWidth}%` }]} />
                          </View>

                          <Text style={styles.appMins}>{entry.usageMinutes}m</Text>
                        </View>
                      );
                    })}
              </View>
            )}

            <View style={[styles.card, shadows.card]}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={colors.success}
                />
                <Text style={styles.cardTitle}>Active Rules</Text>

                <Pressable accessibilityRole="button"
                  onPress={() => navigation.navigate('ScreenTime')}
                  style={styles.cardAction}
                >
                  <Text style={styles.cardActionText}>Edit Rules</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.primary}
                  />
                </Pressable>
              </View>

              {rule ? (
                <View>
                  <View style={styles.ruleRow}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.ruleText}>
                      Daily limit:{' '}
                      {rule.dailyLimitMinutes > 0
                        ? `${rule.dailyLimitMinutes} min`
                        : 'None'}
                    </Text>
                  </View>

                  {rule.scheduledDowntime
                    .filter((d) => d.isActive)
                    .map((dt) => (
                      <View key={dt.id} style={styles.ruleRow}>
                        <Ionicons
                          name="moon-outline"
                          size={14}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.ruleText}>
                          {dt.label}: {dt.startTime} – {dt.endTime}
                        </Text>
                      </View>
                    ))}

                  {rule.blockedApps.length > 0 && (
                    <View style={styles.ruleRow}>
                      <Ionicons
                        name="ban-outline"
                        size={14}
                        color={colors.danger}
                      />
                      <Text style={styles.ruleText}>
                        {rule.blockedApps.length} blocked apps
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.noRulesText}>
                  No active rules. Tap "Edit Rules" to set up screen time.
                </Text>
              )}
            </View>

            {/* ── Remote Screenshot / Live View ── */}
            <View style={[styles.card, shadows.card]}>
              <View style={styles.cardHeader}>
                <Ionicons name="phone-portrait" size={18} color="#2980B9" />
                <Text style={styles.cardTitle}>Remote Screen</Text>
                {liveViewActive && device.platform !== 'ios' && (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                )}
              </View>

              {device.platform === 'ios' ? (
                <View style={styles.iosScreenNote}>
                  <Ionicons name="lock-closed-outline" size={28} color={colors.textMuted} />
                  <Text style={styles.iosScreenNoteTitle}>Not available on iOS</Text>
                  <Text style={styles.iosScreenNoteText}>
                    Apple's iOS sandbox prevents silent screen capture from third-party apps.
                    Use the Screen Time data above to monitor app usage.
                  </Text>
                  <Pressable accessibilityRole="button"
                    style={[styles.screenshotBtn, { marginTop: 12, alignSelf: 'stretch' }]}
                    onPress={() => sendCommand(device.id, 'open_app_picker')}
                  >
                    <Ionicons name="apps-outline" size={16} color={colors.primary} />
                    <Text style={styles.screenshotBtnText}>Pick Apps to Block (on child device)</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {screenshot ? (
                    <View>
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${screenshot}` }}
                        style={styles.screenshotImg}
                        resizeMode="contain"
                      />
                      {screenshotAt && (
                        <Text style={styles.coordSubText}>
                          Captured {formatLastSeen(screenshotAt)}{liveViewActive ? ' · Live' : ''}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.noLocationText}>No screenshot yet</Text>
                  )}

                  {/* Action buttons row */}
                  <View style={styles.screenshotActions}>
                    <Pressable accessibilityRole="button"
                      style={[styles.screenshotBtn, { flex: 1 }]}
                      onPress={handleTakeScreenshot}
                      disabled={screenshotLoading || liveViewActive}
                    >
                      {screenshotLoading
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Ionicons name="camera" size={16} color={liveViewActive ? colors.textMuted : colors.primary} />
                      }
                      <Text style={[styles.screenshotBtnText, liveViewActive && { color: colors.textMuted }]}>
                        {screenshotLoading ? 'Capturing…' : 'Screenshot'}
                      </Text>
                    </Pressable>

                    <Pressable accessibilityRole="button"
                      style={[
                        styles.screenshotBtn,
                        { flex: 1, backgroundColor: liveViewActive ? colors.danger + '18' : colors.background },
                      ]}
                      onPress={toggleLiveView}
                    >
                      <Ionicons
                        name={liveViewActive ? 'stop-circle' : 'videocam'}
                        size={16}
                        color={liveViewActive ? colors.danger : '#2980B9'}
                      />
                      <Text style={[styles.screenshotBtnText, { color: liveViewActive ? colors.danger : '#2980B9' }]}>
                        {liveViewActive ? 'Stop Live' : 'Live View'}
                      </Text>
                    </Pressable>

                    {screenshot && (
                      <Pressable accessibilityRole="button"
                        style={[styles.screenshotBtn, { flex: 1 }]}
                        onPress={handleSaveScreenshot}
                      >
                        <Ionicons name="download-outline" size={16} color={colors.success} />
                        <Text style={[styles.screenshotBtnText, { color: colors.success }]}>Save</Text>
                      </Pressable>
                    )}
                  </View>
                </>
              )}
            </View>

            {/* ── Web Filter ── */}
            <View style={[styles.card, shadows.card]}>
              <View style={styles.cardHeader}>
                <Ionicons name="shield-checkmark" size={18} color="#16A085" />
                <Text style={styles.cardTitle}>Web Filter</Text>
              </View>
              <Text style={[styles.noLocationText, { marginBottom: 10 }]}>
                {device.platform === 'ios'
                  ? 'Blocks all web content in Safari (iOS). Enable to shield from adult/gambling sites.'
                  : 'Blocks adult, gambling & violence sites at DNS level (works in all browsers).'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable accessibilityRole="button"
                  style={[
                    styles.screenshotBtn,
                    { flex: 1, backgroundColor: webFilterOn ? '#E8F5E9' : undefined },
                  ]}
                  onPress={() => {
                    const next = !webFilterOn;
                    setWebFilterOn(next);
                    if (next) {
                      sendCommand(device.id, 'web_filter_on', {
                        categories: ['adult', 'violence', 'gambling'],
                      });
                    } else {
                      sendCommand(device.id, 'web_filter_off');
                    }
                  }}
                >
                  <Ionicons
                    name={webFilterOn ? 'shield-checkmark' : 'shield-outline'}
                    size={16}
                    color={webFilterOn ? '#16A085' : colors.textMuted}
                  />
                  <Text style={[styles.screenshotBtnText, webFilterOn && { color: '#16A085' }]}>
                    {webFilterOn ? 'Web Filter ON' : 'Enable Web Filter'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* ── Notification Feed ── */}
            <View style={[styles.card, shadows.card]}>
              <View style={styles.cardHeader}>
                <Ionicons name="notifications" size={18} color="#E67E22" />
                <Text style={styles.cardTitle}>Recent Notifications</Text>
                <Pressable accessibilityRole="button" style={styles.cardAction} onPress={fetchNotifications}>
                  <Ionicons name="refresh" size={14} color={colors.primary} />
                </Pressable>
              </View>

              {notifLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
              ) : notifications.length === 0 ? (
                <Text style={styles.noLocationText}>No notifications captured yet</Text>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <View key={n.id} style={styles.notifRow}>
                    <View style={styles.notifIcon}>
                      <Ionicons name="phone-portrait-outline" size={14} color="#E67E22" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifApp} numberOfLines={1}>{n.packageName.split('.').pop()}</Text>
                      {n.title ? <Text style={styles.notifTitle} numberOfLines={1}>{n.title}</Text> : null}
                      {n.text ? <Text style={styles.notifText} numberOfLines={2}>{n.text}</Text> : null}
                    </View>
                    <Text style={styles.notifTime}>{formatLastSeen(n.receivedAt)}</Text>
                  </View>
                ))
              )}
            </View>

            <Pressable accessibilityRole="button"
              style={[styles.navRow, shadows.sm]}
              onPress={() => navigation.navigate('GuardianChat', { deviceId })}
            >
              <Ionicons name="chatbubbles" size={20} color={colors.primary} />
              <Text style={styles.navRowText}>Messages</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>

            <Pressable accessibilityRole="button"
              style={[styles.navRow, shadows.sm]}
              onPress={() => navigation.navigate('Geofence')}
            >
              <Ionicons name="location" size={20} color="#2980B9" />
              <Text style={styles.navRowText}>Manage Geofence Zones</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <Pressable accessibilityRole="button"
              style={[styles.navRow, shadows.sm]}
              onPress={() => navigation.navigate('BlockedSites', { deviceId })}
            >
              <Ionicons name="shield" size={20} color="#E74C3C" />
              <Text style={styles.navRowText}>Web Filter Log</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </ScrollView>
        )}
      </CollapsibleHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  notFoundContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 14,
  },

  notFoundText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },

  headerGlow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextBlock: { flex: 1 },

  headerEyebrow: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 2,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
  },

  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 3,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },

  headerStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    marginTop: 5,
  },

  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },

  headerFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  footerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },

  footerChipText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '700',
  },

  compactHeader: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  compactTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },

  compactTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  compactSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 1,
  },

  compactStatusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)',
  },

  content: { padding: 16 },

  commandsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  commandBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },

  commandIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  commandLabel: {
    fontSize: 11,
    fontWeight: '800',
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },

  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  cardActionText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },

  sectionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },

  addressText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },

  coordText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'monospace' as any,
  },

  coordSubText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },

  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  refreshBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },

  noLocation: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },

  noLocationText: {
    fontSize: 13,
    color: colors.textMuted,
  },

  screenTimeRing: {
    gap: 10,
  },

  ringOuter: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },

  ringFill: {
    height: '100%',
    borderRadius: 6,
  },

  screenTimeNumbers: {
    alignItems: 'center',
    marginTop: 4,
  },

  screenTimeValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },

  screenTimeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  appName: {
    width: 100,
    fontSize: 13,
    color: colors.text,
  },

  appBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },

  appBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },

  appMins: {
    width: 32,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },

  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  ruleText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  noRulesText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },

  navRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  screenshotImg: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    backgroundColor: '#000',
    marginBottom: 6,
  },

  screenshotActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  screenshotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: colors.background,
  },

  screenshotBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  iosScreenNote: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  iosScreenNoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  iosScreenNoteText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.danger + '18',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },

  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 1,
  },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  notifIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E67E2218',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notifApp: {
    fontSize: 11,
    color: '#E67E22',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  notifTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },

  notifText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  notifTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});