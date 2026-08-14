import React, { useState } from 'react';
import {
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
import type { ParentApprovalRequest } from '../../../types';
import { useTranslation } from 'react-i18next';

const TYPE_LABEL_KEYS: Record<ParentApprovalRequest['type'], string> = {
  app_install: 'family.screens.approvalRequests.typeAppInstall',
  screen_time_extension: 'family.screens.approvalRequests.typeScreenTimeExtension',
  location_override: 'family.screens.approvalRequests.typeLocationOverride',
  purchase: 'family.screens.approvalRequests.typePurchase',
  website: 'family.screens.approvalRequests.typeWebsite',
};

const FILTER_LABEL_KEYS: Record<FilterTab, string> = {
  pending: 'family.screens.approvalRequests.filterPending',
  approved: 'family.screens.approvalRequests.filterApproved',
  denied: 'family.screens.approvalRequests.filterDenied',
};

const FILTER_NAME_KEYS: Record<FilterTab, string> = {
  pending: 'family.screens.approvalRequests.filterNamePending',
  approved: 'family.screens.approvalRequests.filterNameApproved',
  denied: 'family.screens.approvalRequests.filterNameDenied',
};

const TYPE_ICONS: Record<ParentApprovalRequest['type'], string> = {
  app_install: 'download',
  screen_time_extension: 'time',
  location_override: 'location',
  purchase: 'card',
  website: 'globe',
};

const TYPE_COLORS: Record<ParentApprovalRequest['type'], string> = {
  app_install: '#2980B9',
  screen_time_extension: '#8E44AD',
  location_override: '#27AE60',
  purchase: '#F39C12',
  website: '#E74C3C',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type FilterTab = 'pending' | 'approved' | 'denied';

export function ApprovalRequestsScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const approvalRequests = useGuardianStore((s) => s.approvalRequests);
  const respondToApproval = useGuardianStore((s) => s.respondToApproval);
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);

  const [filter, setFilter] = useState<FilterTab>('pending');

  const getMemberName = (memberId: string) =>
    members.find((m) => m.id === memberId)?.name ??
    t('family.screens.approvalRequests.unknown');

  const getMemberColor = (memberId: string) =>
    members.find((m) => m.id === memberId)?.avatarColor ?? '#94A3B8';

  const filtered = [...approvalRequests]
    .filter((r) => r.status === filter)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const counts = {
    pending: approvalRequests.filter((r) => r.status === 'pending').length,
    approved: approvalRequests.filter((r) => r.status === 'approved').length,
    denied: approvalRequests.filter((r) => r.status === 'denied').length,
  };

  const filterTabs: {
    key: FilterTab;
    label: string;
    color: string;
  }[] = [
    {
      key: 'pending',
      label: t(FILTER_LABEL_KEYS.pending, { count: counts.pending }),
      color: colors.warning,
    },
    {
      key: 'approved',
      label: t(FILTER_LABEL_KEYS.approved, { count: counts.approved }),
      color: colors.success,
    },
    {
      key: 'denied',
      label: t(FILTER_LABEL_KEYS.denied, { count: counts.denied }),
      color: colors.danger,
    },
  ];

  const screenHeader = (
    <LinearGradient
      colors={['#081B33', '#0F2952', '#1E4A8A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.headerGlow} />

      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>{t('family.screens.approvalRequests.headerEyebrow')}</Text>
          <Text style={styles.headerTitle}>{t('family.screens.approvalRequests.headerTitle')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('family.screens.approvalRequests.headerSubtitle')}
          </Text>
        </View>

        {counts.pending > 0 && (
          <View style={styles.badgePremium}>
            <Text style={styles.badgePremiumText}>{counts.pending}</Text>
          </View>
        )}
      </View>

      

      <View style={styles.filterRow}>
        {filterTabs.map((tab) => (
          <Pressable accessibilityRole="button"
            key={tab.key}
            onPress={() => setFilter(tab.key)}
            style={[
              styles.filterTab,
              filter === tab.key && styles.filterTabActive,
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === tab.key && { color: tab.color },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#081B33', '#0F2952']}
      style={[styles.compactHeader, { paddingTop: insets.top }]}
    >
      <Pressable accessibilityRole="button"
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>

      <Text style={styles.compactTitle}>{t('family.screens.approvalRequests.headerTitle')}</Text>

      {counts.pending > 0 ? (
        <View style={styles.badgePremium}>
          <Text style={styles.badgePremiumText}>{counts.pending}</Text>
        </View>
      ) : (
        <View style={{ width: 32 }} />
      )}
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <CollapsibleHeader
        fullHeader={screenHeader}
        compactHeader={screenCompact}
      >
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
            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons
                  name={
                    filter === 'pending'
                      ? 'hourglass-outline'
                      : filter === 'approved'
                      ? 'checkmark-circle-outline'
                      : 'close-circle-outline'
                  }
                  size={64}
                  color={colors.textMuted}
                />
                <Text style={styles.emptyTitle}>
                  {t('family.screens.approvalRequests.emptyTitle', {
                    filter: t(FILTER_NAME_KEYS[filter]),
                  })}
                </Text>
                <Text style={styles.emptyDesc}>
                  {filter === 'pending'
                    ? t('family.screens.approvalRequests.emptyDescPending')
                    : t('family.screens.approvalRequests.emptyDescOther', {
                        filter: t(FILTER_NAME_KEYS[filter]),
                      })}
                </Text>
              </View>
            )}

            {filtered.map((req) => {
              const typeColor = TYPE_COLORS[req.type];
              const memberName = getMemberName(req.memberId);
              const memberColor = getMemberColor(req.memberId);

              return (
                <View
                  key={req.id}
                  style={[
                    styles.requestCard,
                    shadows.card,
                    req.status === 'pending' && styles.cardPending,
                    req.status === 'approved' && styles.cardApproved,
                    req.status === 'denied' && styles.cardDenied,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.memberAvatar,
                        { backgroundColor: memberColor },
                      ]}
                    >
                      <Text style={styles.memberAvatarText}>
                        {memberName.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.cardInfo}>
                      <Text style={styles.memberName}>{memberName}</Text>
                      <Text style={styles.requestTime}>
                        {formatTime(req.createdAt)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: typeColor + '18' },
                      ]}
                    >
                      <Ionicons
                        name={TYPE_ICONS[req.type] as any}
                        size={12}
                        color={typeColor}
                      />
                      <Text
                        style={[
                          styles.typeBadgeText,
                          { color: typeColor },
                        ]}
                      >
                        {t(TYPE_LABEL_KEYS[req.type])}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.requestTitle}>{req.title}</Text>
                  <Text style={styles.requestDesc}>
                    {req.description}
                  </Text>

                  {req.status === 'pending' && (
                    <View style={styles.actionRow}>
                      <Pressable accessibilityRole="button"
                        style={styles.denyBtn}
                        onPress={() =>
                          respondToApproval(
                            req.id,
                            'denied',
                            activeMemberId ?? 'parent'
                          )
                        }
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color={colors.danger}
                        />
                        <Text style={styles.denyBtnText}>{t('family.screens.approvalRequests.deny')}</Text>
                      </Pressable>

                      <Pressable accessibilityRole="button"
                        style={styles.approveBtn}
                        onPress={() =>
                          respondToApproval(
                            req.id,
                            'approved',
                            activeMemberId ?? 'parent'
                          )
                        }
                      >
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.approveBtnText}>
                          {t('family.screens.approvalRequests.approve')}
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {req.status !== 'pending' && req.respondedAt && (
                    <Text style={styles.respondedAt}>
                      {req.status === 'approved'
                        ? t('family.screens.approvalRequests.approvedAt')
                        : t('family.screens.approvalRequests.deniedAt')}{' '}
                      {formatTime(req.respondedAt)}
                    </Text>
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
    paddingBottom: 12,
    position: 'relative',
  },

  headerGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextWrap: { flex: 1 },

  headerEyebrow: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },

  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },

  badgePremium: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E74C3C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  badgePremiumText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  headerStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },

  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },

  filterRow: { flexDirection: 'row', gap: 6 },

  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  filterTabActive: {
    backgroundColor: '#fff',
  },

  filterTabText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
  },

  compactHeader: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  compactTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  content: { padding: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },

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
    textAlign: 'center',
  },

  requestCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  cardPending: {
    backgroundColor: colors.warningLight,
    borderWidth: 1.5,
    borderColor: colors.warning + '44',
  },

  cardApproved: {
    backgroundColor: colors.successLight,
    borderWidth: 1.5,
    borderColor: colors.success + '44',
  },

  cardDenied: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },

  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  memberAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },

  cardInfo: { flex: 1 },

  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  requestTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },

  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  requestTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },

  requestDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },

  denyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: '#fff',
  },

  denyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },

  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.success,
  },

  approveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  respondedAt: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
});
