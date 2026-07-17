import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useConnectStore } from '../../store/useConnectStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { CoParentAccessGrant, CoParentPermission, SharedChildFields } from '../../types';

const SHARED_FIELD_LABELS: { key: keyof SharedChildFields; label: string; icon: string }[] = [
  { key: 'allergies', label: 'Allergies', icon: 'warning-outline' },
  { key: 'medicalNotes', label: 'Medical Notes', icon: 'medkit-outline' },
  { key: 'medications', label: 'Medications', icon: 'medical-outline' },
  { key: 'schoolName', label: 'School', icon: 'school-outline' },
  { key: 'emergencyContactName', label: 'Emergency Contact', icon: 'person-outline' },
  { key: 'emergencyContactPhone', label: 'Emergency Phone', icon: 'call-outline' },
];

export function CoParentingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [permission, setPermission] = useState<CoParentPermission>('VIEW');
  const [sharing, setSharing] = useState(false);
  const [expandedGrantId, setExpandedGrantId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<SharedChildFields>>({});
  const [saving, setSaving] = useState(false);

  const family = useFamilyStore((s) => s.family);
  const members = useFamilyStore((s) => s.members);
  const connections = useConnectStore((s) => s.connections);
  const coParentGrants = useConnectStore((s) => s.coParentGrants);
  const sharedChildren = useConnectStore((s) => s.sharedChildren);
  const sharedCustodyEvents = useConnectStore((s) => s.sharedCustodyEvents);
  const fetchFromServer = useConnectStore((s) => s.fetchFromServer);
  const fetchCoParentGrants = useConnectStore((s) => s.fetchCoParentGrants);
  const fetchSharedCustodyEvents = useConnectStore((s) => s.fetchSharedCustodyEvents);
  const createCoParentGrant = useConnectStore((s) => s.createCoParentGrant);
  const acceptCoParentGrant = useConnectStore((s) => s.acceptCoParentGrant);
  const declineCoParentGrant = useConnectStore((s) => s.declineCoParentGrant);
  const revokeCoParentGrant = useConnectStore((s) => s.revokeCoParentGrant);
  const loadGrantedChild = useConnectStore((s) => s.loadGrantedChild);
  const updateGrantedChild = useConnectStore((s) => s.updateGrantedChild);

  const children = members.filter((m) => m.role === 'child');
  const ownedGrants = coParentGrants.filter((g) => g.ownerFamilyId === family?.id);
  const heldGrants = coParentGrants.filter((g) => g.holderFamilyId === family?.id);

  useEffect(() => {
    fetchFromServer();
    fetchCoParentGrants();
    fetchSharedCustodyEvents();
  }, [fetchFromServer, fetchCoParentGrants, fetchSharedCustodyEvents]);

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Child';

  const handleShare = async () => {
    if (!selectedChildId || !selectedFamilyId) return;
    setSharing(true);
    const result = await createCoParentGrant(selectedChildId, selectedFamilyId, permission);
    setSharing(false);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowShareModal(false);
      setSelectedChildId(null);
      setSelectedFamilyId(null);
      setPermission('VIEW');
    } else {
      Alert.alert('Could not share', result.error);
    }
  };

  const handleExpandGrant = (grant: CoParentAccessGrant) => {
    if (expandedGrantId === grant.id) {
      setExpandedGrantId(null);
      return;
    }
    setExpandedGrantId(grant.id);
    setEditValues({});
    if (grant.status === 'ACTIVE' && !sharedChildren[grant.id]) loadGrantedChild(grant.id);
  };

  const handleSaveChild = async (grantId: string) => {
    setSaving(true);
    const result = await updateGrantedChild(grantId, editValues);
    setSaving(false);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditValues({});
    } else {
      Alert.alert('Could not save', result.error);
    }
  };

  const handleRevoke = (grant: CoParentAccessGrant) => {
    Alert.alert('Revoke access?', 'They\'ll no longer be able to see or edit this child\'s shared info.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => revokeCoParentGrant(grant.id) },
    ]);
  };

  const renderGrantCard = (grant: CoParentAccessGrant, asOwner: boolean) => {
    const otherName = asOwner ? grant.holderFamily?.name ?? 'Household' : grant.ownerFamily?.name ?? 'Household';
    const isExpanded = expandedGrantId === grant.id;
    const child = sharedChildren[grant.id];
    const canEdit = !asOwner && grant.permission === 'EDIT';

    return (
      <Card key={grant.id} style={styles.grantCard} variant="elevated">
        <Pressable onPress={() => grant.status === 'ACTIVE' && handleExpandGrant(grant)} style={styles.grantTop}>
          <View style={styles.childIcon}>
            <Ionicons name="person" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.childName}>{asOwner ? memberName(grant.childMemberId) : 'Shared child'}</Text>
            <Text style={styles.otherHousehold}>{asOwner ? `Shared with ${otherName}` : `Shared by ${otherName}`}</Text>
          </View>
          <Badge
            label={grant.status === 'ACTIVE' ? (grant.permission === 'EDIT' ? 'Can Edit' : 'View Only') : grant.status}
            variant={grant.status === 'ACTIVE' ? 'success' : grant.status === 'PENDING' ? 'warning' : 'neutral'}
            size="sm"
          />
        </Pressable>

        {grant.status === 'PENDING' && !asOwner && (
          <View style={styles.rowActions}>
            <Pressable onPress={() => acceptCoParentGrant(grant.id)} style={[styles.actionBtn, styles.acceptBtn]}>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Accept</Text>
            </Pressable>
            <Pressable onPress={() => declineCoParentGrant(grant.id)} style={styles.actionBtn}>
              <Ionicons name="close" size={16} color={colors.danger} />
              <Text style={[styles.actionBtnText, { color: colors.danger }]}>Decline</Text>
            </Pressable>
          </View>
        )}

        {grant.status === 'ACTIVE' && (
          <View style={styles.rowActions}>
            <Pressable onPress={() => handleRevoke(grant)} style={styles.actionBtn}>
              <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
              <Text style={[styles.actionBtnText, { color: colors.danger }]}>Revoke Access</Text>
            </Pressable>
          </View>
        )}

        {isExpanded && grant.status === 'ACTIVE' && (
          <View style={styles.childDetail}>
            {!child ? (
              <Text style={styles.loadingText}>Loading…</Text>
            ) : (
              SHARED_FIELD_LABELS.map((f) => (
                <View key={f.key} style={styles.fieldRow}>
                  <Ionicons name={f.icon as any} size={15} color={colors.textMuted} />
                  {canEdit ? (
                    <TextInput
                      style={styles.fieldInput}
                      placeholder={f.label}
                      placeholderTextColor={colors.textMuted}
                      value={editValues[f.key] ?? (child[f.key] as string) ?? ''}
                      onChangeText={(v) => setEditValues((prev) => ({ ...prev, [f.key]: v }))}
                    />
                  ) : (
                    <Text style={styles.fieldValue}>{(child[f.key] as string) || `No ${f.label.toLowerCase()} set`}</Text>
                  )}
                </View>
              ))
            )}
            {canEdit && Object.keys(editValues).length > 0 && (
              <Button title="Save Changes" onPress={() => handleSaveChild(grant.id)} loading={saving} size="sm" style={{ marginTop: 10, alignSelf: 'flex-start' }} />
            )}
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#1E4A8A']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Co-Parenting</Text>
          <Pressable onPress={() => setShowShareModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
        <Text style={styles.headerSubtitle}>Keep a child's info in sync across two households.</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Shared By Me</Text>
        {ownedGrants.length > 0 ? ownedGrants.map((g) => renderGrantCard(g, true)) : (
          <Text style={styles.emptyDesc}>You haven't shared any children's info with another household yet.</Text>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Shared With Me</Text>
        {heldGrants.length > 0 ? heldGrants.map((g) => renderGrantCard(g, false)) : (
          <Text style={styles.emptyDesc}>No households have shared a child's info with you yet.</Text>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Shared Custody Calendar</Text>
        {sharedCustodyEvents.length > 0 ? (
          sharedCustodyEvents.map((e) => (
            <Card key={e.id} style={styles.eventCard} variant="elevated">
              <View style={styles.eventIcon}>
                <Ionicons name="calendar" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.childName}>{e.title}</Text>
                <Text style={styles.otherHousehold}>{new Date(e.startDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
              </View>
            </Card>
          ))
        ) : (
          <Text style={styles.emptyDesc}>No shared custody events yet — pickup/dropoff and other events a co-parenting household marks as shared will show up here.</Text>
        )}
      </ScrollView>

      <Modal visible={showShareModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowShareModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Share a Child's Info</Text>
          <Text style={styles.modalSubtitle}>
            Give a connected household access to this child's allergies, medical notes, school, and emergency contacts — kept in sync, not copied.
          </Text>

          <Text style={styles.modalLabel}>Child</Text>
          <View style={styles.chipRow}>
            {children.length === 0 ? (
              <Text style={styles.emptyDesc}>Add a child in Family Profiles first.</Text>
            ) : children.map((c) => (
              <Pressable key={c.id} onPress={() => setSelectedChildId(c.id)} style={[styles.chip, selectedChildId === c.id && styles.chipActive]}>
                <Text style={[styles.chipText, selectedChildId === c.id && styles.chipTextActive]}>{c.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Household</Text>
          <View style={styles.chipRow}>
            {connections.length === 0 ? (
              <Text style={styles.emptyDesc}>Connect with a household first, in Family Connect.</Text>
            ) : connections.map((c) => {
              const other = c.requesterFamily ?? c.recipientFamily;
              const otherFamilyId = c.requesterFamily ? c.requesterFamilyId : c.recipientFamilyId;
              return (
                <Pressable key={c.id} onPress={() => setSelectedFamilyId(otherFamilyId)} style={[styles.chip, selectedFamilyId === otherFamilyId && styles.chipActive]}>
                  <Text style={[styles.chipText, selectedFamilyId === otherFamilyId && styles.chipTextActive]}>{other?.name ?? 'Household'}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.modalLabel}>Permission</Text>
          <View style={styles.chipRow}>
            <Pressable onPress={() => setPermission('VIEW')} style={[styles.chip, permission === 'VIEW' && styles.chipActive]}>
              <Text style={[styles.chipText, permission === 'VIEW' && styles.chipTextActive]}>View Only</Text>
            </Pressable>
            <Pressable onPress={() => setPermission('EDIT')} style={[styles.chip, permission === 'EDIT' && styles.chipActive]}>
              <Text style={[styles.chipText, permission === 'EDIT' && styles.chipTextActive]}>Can Edit</Text>
            </Pressable>
          </View>

          <Button
            title="Send Share Request"
            onPress={handleShare}
            fullWidth
            size="lg"
            loading={sharing}
            disabled={!selectedChildId || !selectedFamilyId}
            style={{ marginTop: 8 }}
          />
          <Button title="Cancel" onPress={() => setShowShareModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 10 },
  emptyDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  grantCard: { marginBottom: 10, borderRadius: 14 },
  eventCard: { marginBottom: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  eventIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  grantTop: { flexDirection: 'row', alignItems: 'center' },
  childIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  childName: { fontSize: 15, fontWeight: '700', color: colors.text },
  otherHousehold: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.background },
  acceptBtn: { backgroundColor: colors.success },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  childDetail: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 10 },
  loadingText: { fontSize: 13, color: colors.textMuted },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldValue: { flex: 1, fontSize: 13, color: colors.text },
  fieldInput: { flex: 1, fontSize: 13, color: colors.text, backgroundColor: colors.background, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  modal: { flex: 1, backgroundColor: colors.background, padding: 20 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
});
