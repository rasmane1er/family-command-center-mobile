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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

  const unresolvedCount = sosAlerts.filter((a) => !a.isResolved).length;
  const resolvedCount = sosAlerts.filter((a) => a.isResolved).length;

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

  const screenHeader = (
    <LinearGradient
      colors={['#3A0710', '#8B1E2D', '#E74C3C']}
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
          <Text style={styles.headerEyebrow}>Emergency Monitor</Text>
          <Text style={styles.headerTitle}>SOS Alerts</Text>
          <Text style={styles.headerSubtitle}>
            {unresolvedCount > 0
              ? `${unresolvedCount} unresolved alert${unresolvedCount > 1 ? 's' : ''}`
              : 'All family members are safe'}
          </Text>
        </View>

        <View
          style={[
            styles.sosIcon,
            unresolvedCount > 0 ? styles.sosIconActive : styles.sosIconSafe,
          ]}
        >
          <Ionicons
            name={unresolvedCount > 0 ? 'warning' : 'shield-checkmark'}
            size={22}
            color="#fff"
          />
        </View>
      </View>

      <View style={styles.headerStats}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{unresolvedCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{resolvedCount}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{sosAlerts.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.headerSafetyPill}>
        <Ionicons
          name={unresolvedCount > 0 ? 'radio' : 'checkmark-circle'}
          size={14}
          color="#fff"
        />
        <Text style={styles.headerSafetyText}>
          {unresolvedCount > 0
            ? 'Immediate attention required'
            : 'No active emergency alerts'}
        </Text>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#3A0710', '#8B1E2D']}
      style={[styles.compactHeader, { paddingTop: insets.top }]}
    >
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>

      <Text style={styles.compactTitle}>SOS Alerts</Text>

      <View
        style={[
          styles.compactBadge,
          unresolvedCount > 0 ? styles.compactBadgeActive : styles.compactBadgeSafe,
        ]}
      >
        <Text style={styles.compactBadgeText}>{unresolvedCount}</Text>
      </View>
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
            {sorted.length === 0 && (
              <View style={styles.allClear}>
                <View style={styles.allClearIcon}>
                  <Ionicons
                    name="checkmark-circle"
                    size={64}
                    color={colors.success}
                  />
                </View>
                <Text style={styles.allClearTitle}>All Clear</Text>
                <Text style={styles.allClearDesc}>
                  No SOS alerts. Your family is safe.
                </Text>
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
                    alert.isResolved
                      ? styles.alertCardResolved
                      : styles.alertCardActive,
                  ]}
                >
                  <View style={styles.alertHeader}>
                    <View
                      style={[
                        styles.alertAvatar,
                        { backgroundColor: memberColor },
                      ]}
                    >
                      <Text style={styles.alertAvatarText}>
                        {memberName.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.alertInfo}>
                      <View style={styles.alertTitleRow}>
                        <Text
                          style={[
                            styles.alertMemberName,
                            alert.isResolved && styles.textMuted,
                          ]}
                        >
                          {memberName}
                        </Text>

                        {!alert.isResolved && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>ACTIVE</Text>
                          </View>
                        )}

                        {alert.isResolved && (
                          <View style={styles.resolvedBadge}>
                            <Ionicons
                              name="checkmark-circle"
                              size={12}
                              color={colors.success}
                            />
                            <Text style={styles.resolvedBadgeText}>Resolved</Text>
                          </View>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.alertTime,
                          alert.isResolved && styles.textMuted,
                        ]}
                      >
                        {formatTime(alert.createdAt)}
                      </Text>

                      {alert.message && (
                        <Text
                          style={[
                            styles.alertMessage,
                            alert.isResolved && styles.textMuted,
                          ]}
                        >
                          "{alert.message}"
                        </Text>
                      )}
                    </View>
                  </View>

                  {alert.location && (
                    <View style={styles.locationRow}>
                      <Ionicons
                        name="location"
                        size={14}
                        color={colors.textSecondary}
                      />
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
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.resolveBtnText}>Mark as Resolved</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </CollapsibleHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

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
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    fontSize: 8,
    color: 'rgba(255,255,255,0.58)',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 2,
  },

  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
  },

  headerSubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 3,
    fontWeight: '600',
  },

  sosIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  sosIconActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  sosIconSafe: {
    backgroundColor: 'rgba(39,174,96,0.28)',
  },

  headerStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    paddingVertical: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  statValue: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },

  statLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 3,
  },

  headerSafetyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },

  headerSafetyText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },

  compactHeader: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  compactTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  compactBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  compactBadgeActive: {
    backgroundColor: colors.danger,
  },

  compactBadgeSafe: {
    backgroundColor: colors.success,
  },

  compactBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  content: { padding: 16 },

  allClear: { alignItems: 'center', paddingVertical: 80 },

  allClearIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  allClearTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.success,
  },

  allClearDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },

  alertCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
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

  alertHeader: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 6,
  },

  alertAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  alertAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },

  alertInfo: { flex: 1 },

  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },

  alertMemberName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  activeBadge: {
    backgroundColor: colors.danger,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },

  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },

  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successLight,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },

  resolvedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
  },

  alertTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  alertMessage: {
    fontSize: 13,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: 4,
  },

  textMuted: { color: colors.textMuted },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },

  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },

  resolvedAt: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },

  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },

  resolveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});