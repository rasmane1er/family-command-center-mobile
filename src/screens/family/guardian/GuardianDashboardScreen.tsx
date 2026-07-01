import React from 'react';
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
import type { ChildDevice, ChildDeviceStatus } from '../../../types';
import { GuardianNative } from '../../../native/GuardianNative';

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

function formatLastSeen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function GuardianDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const devices = useGuardianStore((s) => s.devices);
  const sosAlerts = useGuardianStore((s) => s.sosAlerts);
  const approvalRequests = useGuardianStore((s) => s.approvalRequests);
  const sendCommand = useGuardianStore((s) => s.sendCommand);
  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);

  const unresolved = sosAlerts.filter((a) => !a.isResolved);
  const pendingApprovals = approvalRequests.filter((r) => r.status === 'pending');

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
            sendCommand(device.id, type, family?.id ?? 'demo-family');
            if (type === 'lock') GuardianNative.lockScreen();
            if (type === 'school_on') GuardianNative.setSchoolMode(true);
            if (type === 'bedtime_on') GuardianNative.setBedtimeMode(true);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        <LinearGradient
          colors={['#0F2952', '#1E4A8A']}
          style={[styles.header, { paddingTop: insets.top + 6 }]}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerTitle}>Family Guardian</Text>
              <Text style={styles.headerSubtitle}>Parental Controls</Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('ApprovalRequests')}
              style={styles.headerAction}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              {pendingApprovals.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingApprovals.length}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </LinearGradient>
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
                      {statusLabels[device.status]}
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
                <Text style={styles.lastSeen}>{formatLastSeen(device.lastSeen)}</Text>
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

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('PairDevice')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextBlock: { flex: 1 },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },

  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },

  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },

  badgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  content: { padding: 16 },

  sosBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },

  sosBannerText: {
    flex: 1,
    color: '#fff',
    fontWeight: '700',
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
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },

  quickLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickLinkLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    borderRadius: 16,
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
    fontWeight: '800',
    color: '#fff',
  },

  deviceInfo: { flex: 1 },

  deviceMemberName: {
    fontSize: 16,
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '600',
  },

  lastSeen: {
    fontSize: 11,
    color: colors.textMuted,
  },

  deviceActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    fontWeight: '600',
  },

  fab: {
    position: 'absolute',
    bottom: 30,
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
