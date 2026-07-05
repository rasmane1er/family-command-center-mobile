import React, { useEffect } from 'react';
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
import { useTranslation } from 'react-i18next';

import { useGuardianStore } from '../../../store/useGuardianStore';
import { useFamilyStore } from '../../../store/useFamilyStore';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/spacing';
import { CollapsibleHeader } from '../../../components/common/CollapsibleHeader';
import type { ChildDevice, ChildDeviceStatus } from '../../../types';
import { SubscriptionGate } from '../../../components/common/SubscriptionGate';

const BOTTOM_MENU_HEIGHT = 72;
const FAB_BOTTOM_OFFSET = BOTTOM_MENU_HEIGHT + 22;

const statusColors: Record<ChildDeviceStatus, string> = {
  online: colors.success,
  offline: colors.textMuted,
  school_mode: '#2980B9',
  bedtime: '#6A1B9A',
  restricted: colors.danger,
};

function BatteryIcon({ level }: { level: number }) {
  const color = level > 20 ? colors.success : colors.danger;
  const iconName = level > 80 ? 'battery-full' : level > 40 ? 'battery-half' : 'battery-dead';

  return (
    <View style={styles.batteryRow}>
      <Ionicons name={iconName as any} size={16} color={color} />
      <Text style={[styles.batteryText, { color }]}>{level}%</Text>
    </View>
  );
}

function formatLastSeen(iso: string, t: (key: string, options?: any) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return t('family.screens.guardianDashboard.lastSeenJustNow');
  if (mins < 60) return t('family.screens.guardianDashboard.lastSeenMinutesAgo', { count: mins });

  const hours = Math.floor(mins / 60);

  if (hours < 24) return t('family.screens.guardianDashboard.lastSeenHoursAgo', { count: hours });

  return t('family.screens.guardianDashboard.lastSeenDaysAgo', { count: Math.floor(hours / 24) });
}

const statusLabelKeys: Record<ChildDeviceStatus, string> = {
  online: 'statusOnline',
  offline: 'statusOffline',
  school_mode: 'statusSchoolMode',
  bedtime: 'statusBedtime',
  restricted: 'statusRestricted',
};

export function GuardianDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('family');

  const devices = useGuardianStore((s) => s.devices);
  const sosAlerts = useGuardianStore((s) => s.sosAlerts);
  const approvalRequests = useGuardianStore((s) => s.approvalRequests);
  const sendCommand = useGuardianStore((s) => s.sendCommand);
  const hydrate = useGuardianStore((s) => s.hydrate);
  const thisDeviceId = useGuardianStore((s) => s.thisDeviceId);
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);

  const activeMember = members.find((m) => m.id === activeMemberId);
  const showChildRegistrationBanner = activeMember?.role === 'child' && !thisDeviceId;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const unresolved = sosAlerts.filter((a) => !a.isResolved);
  const pendingApprovals = approvalRequests.filter((r) => r.status === 'pending');
  const onlineDevices = devices.filter((d) => d.status === 'online').length;
  const restrictedDevices = devices.filter(
    (d) => d.status === 'restricted' || d.status === 'school_mode' || d.status === 'bedtime'
  ).length;

  const getMemberName = (memberId: string) =>
    members.find((m) => m.id === memberId)?.name ?? 'Unknown';

  const getMemberColor = (memberId: string) =>
    members.find((m) => m.id === memberId)?.avatarColor ?? '#94A3B8';

  const handleQuickCommand = (device: ChildDevice, type: 'lock' | 'school_on' | 'bedtime_on') => {
    const labels: Record<string, string> = {
      lock: 'Lock Device',
      school_on: 'Enable School Mode',
      bedtime_on: 'Enable Bedtime Mode',
    };

    Alert.alert(
      labels[type],
      `Send "${labels[type]}" command to ${device.deviceName}?`,
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

  const screenHeader = (
    <LinearGradient
      colors={['#071B36', '#0F2952', '#1E4A8A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 8 }]}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.headerTextBlock}>
          <View style={styles.headerEyebrowRow}>
            <View style={styles.liveDot} />
            <Text style={styles.headerEyebrow}>Guardian Command Center</Text>
          </View>
          <Text style={styles.headerTitle}>Family Guardian</Text>
          <Text style={styles.headerSubtitle}>
            Devices, approvals, safety alerts, and parental controls
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate('ApprovalRequests')}
          style={styles.headerIconButton}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
          {pendingApprovals.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingApprovals.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroLabel}>Protection status</Text>
            <Text style={styles.heroTitle}>
              {unresolved.length > 0 ? 'Action needed' : 'All systems guarded'}
            </Text>
          </View>

          <View
            style={[
              styles.statusPill,
              unresolved.length > 0 ? styles.statusPillDanger : styles.statusPillSafe,
            ]}
          >
            <Ionicons
              name={unresolved.length > 0 ? 'warning' : 'shield-checkmark'}
              size={14}
              color={unresolved.length > 0 ? colors.danger : colors.success}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: unresolved.length > 0 ? colors.danger : colors.success },
              ]}
            >
              {unresolved.length > 0 ? `${unresolved.length} SOS` : 'Secure'}
            </Text>
          </View>
        </View>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{devices.length}</Text>
            <Text style={styles.heroStatLabel}>Devices</Text>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{onlineDevices}</Text>
            <Text style={styles.heroStatLabel}>Online</Text>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{pendingApprovals.length}</Text>
            <Text style={styles.heroStatLabel}>Approvals</Text>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{restrictedDevices}</Text>
            <Text style={styles.heroStatLabel}>Controlled</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#071B36', '#0F2952']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.compactHeader, { paddingTop: insets.top }]}
    >
      <Pressable onPress={() => navigation.goBack()} style={styles.compactBack}>
        <Ionicons name="arrow-back" size={21} color="#fff" />
      </Pressable>

      <View style={styles.compactTitleBlock}>
        <Text style={styles.compactTitle}>Family Guardian</Text>
        <Text style={styles.compactSubtitle}>
          {devices.length} device{devices.length === 1 ? '' : 's'} · {pendingApprovals.length} approval
          {pendingApprovals.length === 1 ? '' : 's'}
        </Text>
      </View>

      <Pressable
        onPress={() => navigation.navigate('ApprovalRequests')}
        style={styles.compactAction}
      >
        <Ionicons name="checkmark-circle-outline" size={21} color="#fff" />
        {pendingApprovals.length > 0 && (
          <View style={styles.compactBadge}>
            <Text style={styles.compactBadgeText}>{pendingApprovals.length}</Text>
          </View>
        )}
      </Pressable>
    </LinearGradient>
  );

  return (
    <SubscriptionGate requiredTier="premium" featureName="Guardian Dashboard">
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
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: contentPaddingTop,
                paddingBottom: Math.max(insets.bottom, 16) + BOTTOM_MENU_HEIGHT + 96,
              },
            ]}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
            showsVerticalScrollIndicator={false}
          >
            {/* SOS Banner */}
            {unresolved.length > 0 && (
              <Pressable
                onPress={() => navigation.navigate('SOSAlerts')}
                style={styles.sosBanner}
              >
                <Ionicons name="warning" size={22} color="#fff" />
                <Text style={styles.sosBannerText}>
                  {unresolved.length} Active SOS Alert{unresolved.length > 1 ? 's' : ''} — Tap to view
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </Pressable>
            )}

            {/* Quick links row */}
            <View style={styles.quickLinksRow}>
              {[
                { label: 'Geofences', icon: 'location', route: 'Geofence', color: '#2980B9', bg: '#D6EAF8' },
                { label: 'Screen Time', icon: 'time', route: 'ScreenTime', color: '#8E44AD', bg: '#F3E5F5' },
                { label: 'SOS Alerts', icon: 'warning', route: 'SOSAlerts', color: colors.danger, bg: colors.dangerLight },
                { label: 'Approvals', icon: 'checkmark-circle', route: 'ApprovalRequests', color: colors.success, bg: colors.successLight },
              ].map((item) => (
                <Pressable
                  key={item.route}
                  onPress={() => navigation.navigate(item.route)}
                  style={[styles.quickLink, shadows.sm]}
                >
                  <View style={[styles.quickLinkIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <Text style={styles.quickLinkLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            {showChildRegistrationBanner && (
              <Pressable
                style={[styles.childBanner, shadows.card]}
                onPress={() => navigation.navigate('RegisterChildDevice')}
              >
                <View style={styles.childBannerIcon}>
                  <Ionicons name="phone-portrait" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.childBannerTitle}>Register this device</Text>
                  <Text style={styles.childBannerDesc}>
                    Connect this device to your family so a parent can manage it.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </Pressable>
            )}

            <Text style={styles.sectionTitle}>Paired Devices</Text>

            {devices.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="phone-portrait-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No paired devices yet</Text>
                <Text style={styles.emptyDesc}>Tap + to pair a child's device</Text>
              </View>
            )}

            {devices.map((device) => (
              <Pressable
                key={device.id}
                style={[styles.deviceCard, shadows.card]}
                onPress={() => navigation.navigate('ChildDeviceDetail', { deviceId: device.id })}
              >
                <View style={styles.deviceCardHeader}>
                  <View style={[styles.deviceAvatar, { backgroundColor: getMemberColor(device.memberId) }]}>
                    <Text style={styles.deviceAvatarText}>
                      {getMemberName(device.memberId).charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceMemberName}>{getMemberName(device.memberId)}</Text>
                    <Text style={styles.deviceName}>{device.deviceName}</Text>
                    <View style={styles.deviceMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: statusColors[device.status] + '22' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColors[device.status] }]} />
                        <Text style={[styles.statusLabel, { color: statusColors[device.status] }]}>
                          {t(`family.screens.guardianDashboard.${statusLabelKeys[device.status]}`)}
                        </Text>
                      </View>
                      <Ionicons
                        name={device.platform === 'ios' ? 'logo-apple' : 'logo-android'}
                        size={14}
                        color={colors.textMuted}
                        style={{ marginLeft: 8 }}
                      />
                    </View>
                  </View>

                  <View style={styles.deviceRight}>
                    <BatteryIcon level={device.batteryLevel} />
                    <Text style={styles.lastSeen}>{formatLastSeen(device.lastSeen, t)}</Text>
                  </View>
                </View>

                <View style={styles.deviceActions}>
                  <Pressable
                    style={styles.deviceActionBtn}
                    onPress={() => handleQuickCommand(device, 'lock')}
                  >
                    <Ionicons name="lock-closed" size={16} color={colors.danger} />
                    <Text style={[styles.deviceActionText, { color: colors.danger }]}>Lock</Text>
                  </Pressable>

                  <Pressable
                    style={styles.deviceActionBtn}
                    onPress={() => handleQuickCommand(device, 'school_on')}
                  >
                    <Ionicons name="school" size={16} color="#2980B9" />
                    <Text style={[styles.deviceActionText, { color: '#2980B9' }]}>School</Text>
                  </Pressable>

                  <Pressable
                    style={styles.deviceActionBtn}
                    onPress={() => handleQuickCommand(device, 'bedtime_on')}
                  >
                    <Ionicons name="moon" size={16} color="#6A1B9A" />
                    <Text style={[styles.deviceActionText, { color: '#6A1B9A' }]}>Bedtime</Text>
                  </Pressable>

                  <Pressable
                    style={styles.deviceActionBtn}
                    onPress={() => navigation.navigate('ChildDeviceDetail', { deviceId: device.id })}
                  >
                    <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.deviceActionText, { color: colors.textSecondary }]}>Manage</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </CollapsibleHeader>

      {/* FAB */}
      <Pressable
        style={[
          styles.fab,
          {
            bottom: Math.max(insets.bottom, 16) + FAB_BOTTOM_OFFSET,
          },
        ]}
        onPress={() => navigation.navigate('EnterPairingCode')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
    </SubscriptionGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: 10,
    paddingBottom: 5,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 5,
  },

  headerIconButton: {
    width: 30,
    height: 30,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextBlock: { flex: 1 },

  headerEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 1,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },

  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 3,
    lineHeight: 17,
  },

  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 22,
    padding: 10,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 5,
  },

  heroLabel: {
    fontSize: 6,
    color: 'rgba(255,255,255,0.62)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  heroTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.2,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },

  statusPillSafe: {
    backgroundColor: 'rgba(39,174,96,0.18)',
  },

  statusPillDanger: {
    backgroundColor: 'rgba(231,76,60,0.18)',
  },

  statusPillText: {
    fontSize: 8,
    fontWeight: '800',
  },

  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroStat: {
    flex: 1,
    alignItems: 'center',
  },

  heroStatValue: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },

  heroStatLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.62)',
    marginTop: 3,
    fontWeight: '700',
  },

  heroDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  compactHeader: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  compactBack: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  compactTitleBlock: {
    flex: 1,
  },

  compactTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  compactSubtitle: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },

  compactAction: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#0F2952',
  },

  badgeText: { fontSize: 10, color: '#fff', fontWeight: '800' },

  compactBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0F2952',
  },

  compactBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  content: { padding: 16 },

  sosBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    ...shadows.sm,
  },

  sosBannerText: {
    flex: 1,
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },

  quickLinksRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },

  quickLink: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 7,
  },

  quickLinkIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickLinkLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  childBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },

  childBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  childBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },

  childBannerDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 16,
  },

  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
  },

  deviceCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
  },

  deviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 14,
  },

  deviceAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deviceAvatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },

  deviceInfo: { flex: 1 },

  deviceMemberName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  deviceName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },

  deviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
    gap: 5,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
  },

  deviceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },

  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  batteryText: {
    fontSize: 12,
    fontWeight: '700',
  },

  lastSeen: {
    fontSize: 11,
    color: colors.textMuted,
  },

  deviceActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background + '66',
  },

  deviceActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },

  deviceActionText: {
    fontSize: 11,
    fontWeight: '700',
  },

  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
