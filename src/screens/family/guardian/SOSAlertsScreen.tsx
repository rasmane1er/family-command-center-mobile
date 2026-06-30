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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function SOSAlertsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const sosAlerts = useGuardianStore((s) => s.sosAlerts);
  const resolveSOSAlert = useGuardianStore((s) => s.resolveSOSAlert);
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);

  const sorted = [...sosAlerts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getMemberName = (memberId: string) =>
    members.find((m) => m.id === memberId)?.name ?? 'Unknown';

  const getMemberColor = (memberId: string) =>
    members.find((m) => m.id === memberId)?.avatarColor ?? '#94A3B8';

  const handleResolve = (id: string, memberName: string) => {
    Alert.alert(
      'Resolve SOS Alert',
      `Mark this SOS alert from ${memberName} as resolved?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: () => resolveSOSAlert(id, activeMemberId ?? 'parent'),
        },
      ]
    );
  };

  const unresolvedCount = sosAlerts.filter((a) => !a.isResolved).length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F2952', '#1E4A8A']}
        style={[styles.header, { paddingTop: insets.top + 6 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>SOS Alerts</Text>
            {unresolvedCount > 0 && (
              <Text style={styles.headerSubtitle}>{unresolvedCount} unresolved</Text>
            )}
          </View>
          <View style={styles.sosIcon}>
            <Ionicons name="warning" size={22} color={unresolvedCount > 0 ? '#FF6B6B' : 'rgba(255,255,255,0.5)'} />
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {sorted.length === 0 && (
          <View style={styles.allClear}>
            <View style={styles.allClearIcon}>
              <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            </View>
            <Text style={styles.allClearTitle}>All Clear</Text>
            <Text style={styles.allClearDesc}>No active SOS alerts. Your family is safe.</Text>
          </View>
        )}

        {sorted.map((alert) => {
          const memberName = getMemberName(alert.memberId);
          const memberColor = getMemberColor(alert.memberId);
          return (
            <View
              key={alert.id}
              style={[
                styles.alertCard,
                shadows.card,
                alert.isResolved ? styles.alertCardResolved : styles.alertCardActive,
              ]}
            >
              <View style={styles.alertHeader}>
                <View style={[styles.alertAvatar, { backgroundColor: memberColor }]}>
                  <Text style={styles.alertAvatarText}>{memberName.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={styles.alertInfo}>
                  <View style={styles.alertTitleRow}>
                    <Text style={[styles.alertMemberName, alert.isResolved && styles.textMuted]}>
                      {memberName}
                    </Text>
                    {!alert.isResolved && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                      </View>
                    )}
                    {alert.isResolved && (
                      <View style={styles.resolvedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                        <Text style={styles.resolvedBadgeText}>Resolved</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.alertTime, alert.isResolved && styles.textMuted]}>
                    {formatTime(alert.createdAt)}
                  </Text>
                  {alert.message && (
                    <Text style={[styles.alertMessage, alert.isResolved && styles.textMuted]}>
                      "{alert.message}"
                    </Text>
                  )}
                </View>
              </View>

              {alert.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={14} color={colors.textSecondary} />
                  <Text style={styles.locationText}>
                    {alert.location.address
                      ? alert.location.address
                      : `${alert.location.lat.toFixed(5)}, ${alert.location.lng.toFixed(5)}`}
                  </Text>
                </View>
              )}

              {alert.isResolved && alert.resolvedAt && (
                <Text style={styles.resolvedAt}>
                  Resolved {formatTime(alert.resolvedAt)}
                  {alert.resolvedBy
                    ? ` by ${getMemberName(alert.resolvedBy)}`
                    : ''}
                </Text>
              )}

              {!alert.isResolved && (
                <Pressable
                  style={styles.resolveBtn}
                  onPress={() => handleResolve(alert.id, memberName)}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={styles.resolveBtnText}>Mark as Resolved</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: { paddingHorizontal: 20, paddingBottom: 8 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  headerTextBlock: { flex: 1 },

  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },

  headerSubtitle: { fontSize: 12, color: '#FF6B6B', marginTop: 2, fontWeight: '600' },

  sosIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  content: { padding: 16 },

  allClear: { alignItems: 'center', paddingVertical: 80 },

  allClearIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.successLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },

  allClearTitle: { fontSize: 20, fontWeight: '800', color: colors.success },

  allClearDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },

  alertCard: {
    borderRadius: 16, padding: 16, marginBottom: 14,
  },

  alertCardActive: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1.5,
    borderColor: colors.danger + '44',
    ...shadows.card,
  },

  alertCardResolved: {
    backgroundColor: colors.card,
    ...shadows.sm,
  },

  alertHeader: { flexDirection: 'row', gap: 14, marginBottom: 6 },

  alertAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },

  alertAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },

  alertInfo: { flex: 1 },

  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },

  alertMemberName: { fontSize: 16, fontWeight: '700', color: colors.text },

  activeBadge: {
    backgroundColor: colors.danger, borderRadius: 6,
    paddingVertical: 2, paddingHorizontal: 6,
  },

  activeBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  resolvedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.successLight, borderRadius: 6,
    paddingVertical: 2, paddingHorizontal: 6,
  },

  resolvedBadgeText: { fontSize: 9, fontWeight: '700', color: colors.success },

  alertTime: { fontSize: 12, color: colors.textSecondary },

  alertMessage: {
    fontSize: 13, color: colors.text, fontStyle: 'italic', marginTop: 4,
  },

  textMuted: { color: colors.textMuted },

  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8,
    padding: 10, marginBottom: 12,
  },

  locationText: { fontSize: 12, color: colors.textSecondary, flex: 1 },

  resolvedAt: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },

  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.success, borderRadius: 12, padding: 12, marginTop: 4,
  },

  resolveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
