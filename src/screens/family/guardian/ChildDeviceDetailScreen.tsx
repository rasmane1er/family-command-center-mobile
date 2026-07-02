import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  const insets = useSafeAreaInsets();
  const { deviceId } = route.params ?? {};

  const devices = useGuardianStore((s) => s.devices);
  const appUsage = useGuardianStore((s) => s.appUsage);
  const screenTimeRules = useGuardianStore((s) => s.screenTimeRules);
  const sendCommand = useGuardianStore((s) => s.sendCommand);

  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);

  const device = devices.find((d) => d.id === deviceId);
  const member = members.find((m) => m.id === device?.memberId);

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
            sendCommand(device.id, type, family?.id ?? 'demo-family');

            if (type === 'lock') GuardianNative.lockScreen();
            if (type === 'school_on') GuardianNative.setSchoolMode(true);
            if (type === 'school_off') GuardianNative.setSchoolMode(false);
            if (type === 'bedtime_on') GuardianNative.setBedtimeMode(true);
            if (type === 'bedtime_off') GuardianNative.setBedtimeMode(false);
            if (type === 'location_request') {
              GuardianNative.startLocationTracking(30000);
            }
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
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
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
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
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
            <View style={styles.commandsRow}>
              {[
                {
                  label: 'Lock',
                  icon: 'lock-closed',
                  color: colors.danger,
                  cmd: 'lock' as const,
                },
                {
                  label: 'School',
                  icon: 'school',
                  color: '#2980B9',
                  cmd: 'school_on' as const,
                },
                {
                  label: 'Bedtime',
                  icon: 'moon',
                  color: '#6A1B9A',
                  cmd: 'bedtime_on' as const,
                },
                {
                  label: 'Location',
                  icon: 'locate',
                  color: colors.success,
                  cmd: 'location_request' as const,
                },
              ].map((item) => (
                <Pressable
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

                  <Pressable
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

                  <Pressable
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

                <Pressable
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

                <Pressable
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

            <Pressable
              style={[styles.navRow, shadows.sm]}
              onPress={() => navigation.navigate('Geofence')}
            >
              <Ionicons name="location" size={20} color="#2980B9" />
              <Text style={styles.navRowText}>Manage Geofence Zones</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
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
});