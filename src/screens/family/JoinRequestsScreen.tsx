import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useJoinRequestsStore } from '../../store/useJoinRequestsStore';
import { colors } from '../../theme/colors';
import type { FamilyMember } from '../../types';
import { defaultPermissionsForRole } from '../../types';

type RequestFilter = 'pending' | 'approved' | 'rejected';

const FILTERS: RequestFilter[] = ['pending', 'approved', 'rejected'];

import { generateId } from '../../utils/generateId';

export function JoinRequestsScreen({ navigation, route }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<RequestFilter>('pending');

  const requests = useJoinRequestsStore((s) => s.requests);
  const approveRequest = useJoinRequestsStore((s) => s.approveRequest);
  const rejectRequest = useJoinRequestsStore((s) => s.rejectRequest);
  const clearHistory = useJoinRequestsStore((s) => s.clearHistory);

  const addMember = useFamilyStore((s) => s.addMember);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const members = useFamilyStore((s) => s.members);

  const activeMember = members.find((member) => member.id === activeMemberId);
  const canManageRequests =
    activeMember?.isAdmin === true ||
    activeMember?.role === 'parent' ||
    activeMember?.role === 'guardian';

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    }),
    [requests]
  );

  const displayedRequests = requests.filter((request) => request.status === filter);

  const handleApprove = (id: string) => {
    const request = requests.find((r) => r.id === id);
    if (!request) return;

    const member: FamilyMember = {
      id: generateId(),
      familyId: request.familyId,
      name: request.requesterName,
      role: request.requesterRole,
      avatarColor: '#2980B9',
      status: 'ACTIVE',
      points: 0,
      level: 1,
      isAdmin: false,
      isLocalProfile: false,
      linkedUserId: null,
      isPinProtected: false,
      permissions: defaultPermissionsForRole(request.requesterRole),
      inviteStatus: 'accepted',
      createdAt: new Date().toISOString(),
    };

    addMember(member);
    approveRequest(id);

    Alert.alert(
      t('family.screens.joinRequests.approvedTitle'),
      t('family.screens.joinRequests.approvedMsg', { name: request.requesterName })
    );
  };

  const handleReject = (id: string) => {
    const request = requests.find((r) => r.id === id);
    rejectRequest(id);
    Alert.alert(
      t('family.screens.joinRequests.rejectedTitle'),
      t('family.screens.joinRequests.rejectedMsg', {
        name: request?.requesterName ?? t('family.screens.joinRequests.rejectedFallbackName'),
      })
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      t('family.screens.joinRequests.clearHistoryConfirmTitle'),
      t('family.screens.joinRequests.clearHistoryConfirmMsg'),
      [
        { text: t('family.screens.joinRequests.cancel'), style: 'cancel' },
        { text: t('family.screens.joinRequests.clear'), style: 'destructive', onPress: clearHistory },
      ]
    );
  };

  const screenHeader = (
    <View style={[styles.header, { backgroundColor: '#0F2952', paddingTop: insets.top + 6 }]}>
      <Pressable accessibilityRole="button" onPress={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()} style={styles.backBtnHeader}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <View style={styles.headerIcon}>
        <Ionicons name="person-add-outline" size={34} color="#fff" />
      </View>
      <Text style={styles.title}>{t('family.screens.joinRequests.title')}</Text>
      <Text style={styles.subtitle}>{t('family.screens.joinRequests.subtitle')}</Text>
    </View>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#0F2952', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" onPress={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()} style={styles.backBtnHeader}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{t('family.screens.joinRequests.title')}</Text>
      <View style={{ width: 38 }} />
    </View>
  );

  return (
    <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
      {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
      >
      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = filter === item;
          const filterLabel =
            item === 'pending'
              ? t('family.screens.joinRequests.filterPending', { count: counts[item] })
              : item === 'approved'
                ? t('family.screens.joinRequests.filterApproved', { count: counts[item] })
                : t('family.screens.joinRequests.filterRejected', { count: counts[item] });

          return (
            <Pressable accessibilityRole="button"
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {filterLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filter !== 'pending' && displayedRequests.length > 0 && (
        <Button
          title={t('family.screens.joinRequests.clearHistory')}
          variant="outline"
          onPress={handleClearHistory}
          fullWidth
          style={{ marginBottom: 14 }}
        />
      )}

      {displayedRequests.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons
            name={
              filter === 'pending'
                ? 'hourglass-outline'
                : filter === 'approved'
                  ? 'checkmark-circle-outline'
                  : 'close-circle-outline'
            }
            size={42}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>
            {filter === 'pending'
              ? t('family.screens.joinRequests.emptyTitlePending')
              : filter === 'approved'
                ? t('family.screens.joinRequests.emptyTitleApproved')
                : t('family.screens.joinRequests.emptyTitleRejected')}
          </Text>
          <Text style={styles.emptyText}>
            {filter === 'pending'
              ? t('family.screens.joinRequests.emptyTextPending')
              : t('family.screens.joinRequests.emptyTextOther', { filter })}
          </Text>
        </Card>
      ) : (
        displayedRequests.map((request) => (
          <Card key={request.id} style={styles.card} variant="elevated">
            <View style={styles.requestHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {request.requesterName.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.name}>{request.requesterName}</Text>
                <Text style={styles.meta}>
                  {request.requesterRole} • {request.familyName}
                </Text>
                <Text style={styles.date}>{new Date(request.createdAt).toLocaleDateString()}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  request.status === 'approved'
                    ? styles.approvedBadge
                    : request.status === 'rejected'
                      ? styles.rejectedBadge
                      : styles.pendingBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    request.status === 'approved'
                      ? styles.approvedText
                      : request.status === 'rejected'
                        ? styles.rejectedText
                        : styles.pendingText,
                  ]}
                >
                  {request.status}
                </Text>
              </View>
            </View>

            {request.status === 'pending' && canManageRequests && (
              <View style={styles.actions}>
                <Button
                  title="Approve"
                  onPress={() => handleApprove(request.id)}
                  style={styles.actionBtn}
                />
                <Button
                  title="Reject"
                  onPress={() => handleReject(request.id)}
                  variant="outline"
                  style={styles.actionBtn}
                />
              </View>
            )}

            {request.status === 'pending' && !canManageRequests && (
              <Text style={styles.permissionHint}>
                Only parents, guardians, or admins can approve this request.
              </Text>
            )}
          </Card>
        ))
      )}
      </ScrollView>
      )}
    </CollapsibleHeader>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 100 },

  header: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  backBtnHeader: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  headerIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 12 },

  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

  filterChip: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },

  filterText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },

  filterTextActive: { color: '#fff' },

  emptyCard: { alignItems: 'center', padding: 28 },

  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 12 },

  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },

  permissionHint: {
    marginTop: 14,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },

  card: { marginBottom: 12, borderRadius: 16 },

  requestHeader: { flexDirection: 'row', alignItems: 'center' },

  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarInitial: { fontSize: 18, fontWeight: '800', color: colors.primary },

  name: { fontSize: 17, fontWeight: '800', color: colors.text },

  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
    textTransform: 'capitalize',
  },

  date: { fontSize: 11, color: colors.textMuted, marginTop: 3 },

  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },

  pendingBadge: { backgroundColor: '#FEF3E2' },

  approvedBadge: { backgroundColor: '#D5F5E3' },

  rejectedBadge: { backgroundColor: '#FDEDEC' },

  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },

  pendingText: { color: '#F5A623' },

  approvedText: { color: colors.success },

  rejectedText: { color: colors.danger },

  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },

  actionBtn: { flex: 1 },
});