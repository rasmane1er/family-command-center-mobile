import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useJoinRequestsStore } from '../../store/useJoinRequestsStore';
import { colors } from '../../theme/colors';
import type { FamilyMember } from '../../types';
import { defaultPermissionsForRole } from '../../types';

type RequestFilter = 'pending' | 'approved' | 'rejected';

const FILTERS: RequestFilter[] = ['pending', 'approved', 'rejected'];

const generateId = () => Math.random().toString(36).substring(2, 11);

export function JoinRequestsScreen({ navigation, route }: any) {
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
      status: 'active',
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

    Alert.alert('Approved', `${request.requesterName} has been added to the family.`);
  };

  const handleReject = (id: string) => {
    const request = requests.find((r) => r.id === id);
    rejectRequest(id);
    Alert.alert('Rejected', `${request?.requesterName ?? 'Request'} was rejected.`);
  };

  const handleClearHistory = () => {
    Alert.alert('Clear History', 'Remove approved/rejected history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearHistory },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerIcon}>
          <Ionicons name="person-add-outline" size={34} color={colors.primary} />
        </View>

        <Text style={styles.title}>Join Requests</Text>
        <Text style={styles.subtitle}>Approve, reject, and review family join history.</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = filter === item;

          return (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {item.charAt(0).toUpperCase() + item.slice(1)} ({counts[item]})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filter !== 'pending' && displayedRequests.length > 0 && (
        <Button
          title="Clear History"
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
          <Text style={styles.emptyTitle}>No {filter} requests</Text>
          <Text style={styles.emptyText}>
            {filter === 'pending'
              ? 'New QR scan requests will appear here.'
              : `Your ${filter} join request history will appear here.`}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 100 },

  header: { alignItems: 'center', paddingVertical: 28 },
  backBtn: { position: 'absolute', top: 16, left: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  headerIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 12 },

  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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