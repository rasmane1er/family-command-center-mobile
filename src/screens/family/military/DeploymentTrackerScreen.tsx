import React, { useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays, format } from 'date-fns';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { Card } from '../../../components/common/Card';
import { Avatar } from '../../../components/common/Avatar';
import { Button } from '../../../components/common/Button';
import { ProgressBar } from '../../../components/common/ProgressBar';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/spacing';
import { useMilitaryStore } from '../../../store/useMilitaryStore';
import { useFamilyStore } from '../../../store/useFamilyStore';
import type { Deployment, DeploymentType } from '../../../types';
import { useTranslation } from 'react-i18next';

const MILITARY_GREEN = '#4A7C59';
import { generateId } from '../../../utils/generateId';

const TYPE_LABELS: Record<DeploymentType, string> = {
  deployment: 'Deployment',
  tdy: 'TDY',
  training: 'Training',
};

function isValidDate(s: string): boolean {
  return !isNaN(new Date(s).getTime());
}

function DeploymentCard({ deployment, memberName, memberColor, onPress }: {
  deployment: Deployment;
  memberName: string;
  memberColor: string;
  onPress: () => void;
}) {
  const now = Date.now();
  const start = new Date(deployment.startDate).getTime();
  const end = deployment.endDate ? new Date(deployment.endDate).getTime() : null;

  const isUpcoming = start > now;
  const isCompleted = end !== null && end < now;
  const isActive = !isUpcoming && !isCompleted;

  let statusLabel = '';
  let statusColor = MILITARY_GREEN;
  if (isUpcoming) {
    statusLabel = `Departs in ${differenceInCalendarDays(start, now)}d`;
    statusColor = colors.info;
  } else if (isCompleted) {
    statusLabel = 'Completed';
    statusColor = colors.textMuted;
  } else if (end !== null) {
    statusLabel = `${differenceInCalendarDays(end, now)}d remaining`;
  } else {
    statusLabel = `Day ${differenceInCalendarDays(now, start) + 1}`;
  }

  const progress = isActive && end !== null ? Math.min(1, Math.max(0, (now - start) / (end - start))) : null;
  const halfwayPassed = progress !== null && progress >= 0.5;

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card} variant="elevated">
        <View style={styles.cardTop}>
          <Avatar name={memberName} color={memberColor} size={36} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>{TYPE_LABELS[deployment.type]} — {deployment.location}</Text>
            <Text style={styles.cardMeta}>{memberName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {progress !== null && (
          <View style={{ marginTop: 12 }}>
            <ProgressBar progress={progress} color={MILITARY_GREEN} height={7} style={{ borderRadius: 4 }} />
            <View style={styles.milestoneRow}>
              <Text style={styles.milestoneText}>
                {halfwayPassed ? '✓ ' : ''}Halfway: {format(new Date((start + (end as number)) / 2), 'MMM d, yyyy')}
              </Text>
              {deployment.rrDate && (
                <Text style={styles.milestoneText}>R&amp;R: {format(new Date(deployment.rrDate), 'MMM d')}</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.datesRow}>
          <Text style={styles.datesText}>
            {format(new Date(deployment.startDate), 'MMM d, yyyy')}
            {deployment.endDate ? ` – ${format(new Date(deployment.endDate), 'MMM d, yyyy')}` : ' – open-ended'}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

export function DeploymentTrackerScreen({ navigation }: any) {
  const deployments = useMilitaryStore((s) => s.deployments);
  const addDeployment = useMilitaryStore((s) => s.addDeployment);
  const updateDeployment = useMilitaryStore((s) => s.updateDeployment);
  const deleteDeployment = useMilitaryStore((s) => s.deleteDeployment);
  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);

  const { t } = useTranslation('family');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [type, setType] = useState<DeploymentType>('deployment');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rrDate, setRrDate] = useState('');
  const [notes, setNotes] = useState('');

  const sorted = [...deployments].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const resetForm = () => {
    setEditingId(null);
    setMemberId(members[0]?.id ?? '');
    setType('deployment');
    setLocation('');
    setStartDate('');
    setEndDate('');
    setRrDate('');
    setNotes('');
  };

  const openAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (d: Deployment) => {
    setEditingId(d.id);
    setMemberId(d.memberId);
    setType(d.type);
    setLocation(d.location);
    setStartDate(d.startDate.slice(0, 10));
    setEndDate(d.endDate ? d.endDate.slice(0, 10) : '');
    setRrDate(d.rrDate ? d.rrDate.slice(0, 10) : '');
    setNotes(d.notes ?? '');
    setShowModal(true);
  };

  const handleSave = () => {
    if (!location.trim() || !isValidDate(startDate)) {
      Alert.alert(t('common.validationTitle'), 'Please enter a location and a valid start date (YYYY-MM-DD).');
      return;
    }
    if (endDate && !isValidDate(endDate)) {
      Alert.alert(t('common.validationTitle'), 'End date must be in YYYY-MM-DD format.');
      return;
    }
    if (rrDate && !isValidDate(rrDate)) {
      Alert.alert(t('common.validationTitle'), 'R&R date must be in YYYY-MM-DD format.');
      return;
    }

    if (editingId) {
      updateDeployment(editingId, {
        memberId,
        type,
        location: location.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        rrDate: rrDate ? new Date(rrDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      const deployment: Deployment = {
        id: generateId(),
        familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
        memberId,
        type,
        location: location.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        rrDate: rrDate ? new Date(rrDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      addDeployment(deployment);
    }
    setShowModal(false);
    resetForm();
  };

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert(t('common.deleteTitle'), 'This removes the deployment/TDY entry. Calendar events already created will stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteDeployment(editingId); setShowModal(false); resetForm(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <PremiumHeader
        title="Deployment & TDY Tracker"
        onBack={() => navigation.goBack()}
        colors={['#0F2952', MILITARY_GREEN]}
        rightAction={
          <Pressable onPress={openAdd} style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sorted.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="airplane-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No deployments tracked yet</Text>
            <Text style={styles.emptyDesc}>Tap + to add a deployment, TDY, or training entry.</Text>
          </View>
        )}
        {sorted.map((d) => {
          const member = members.find((m) => m.id === d.memberId);
          return (
            <DeploymentCard
              key={d.id}
              deployment={d}
              memberName={member?.name ?? 'Service member'}
              memberColor={member?.avatarColor ?? MILITARY_GREEN}
              onPress={() => openEdit(d)}
            />
          );
        })}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{editingId ? 'Edit Entry' : 'New Deployment / TDY'}</Text>

          <Text style={styles.fieldLabel}>Service Member</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {members.map((m) => (
              <Pressable key={m.id} onPress={() => setMemberId(m.id)} style={[styles.memberChip, memberId === m.id && styles.memberChipActive]}>
                <Avatar name={m.name} color={m.avatarColor} size={28} />
                <Text style={styles.memberChipText}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.typeRow}>
            {(['deployment', 'tdy', 'training'] as DeploymentType[]).map((t) => (
              <Pressable key={t} onPress={() => setType(t)} style={[styles.typeChip, type === t && styles.typeChipActive]}>
                <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>{TYPE_LABELS[t]}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Location</Text>
          <TextInput style={styles.input} placeholder="e.g. Ramstein AB, Germany" value={location} onChangeText={setLocation} placeholderTextColor={colors.textMuted} />

          <Text style={styles.fieldLabel}>Start Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} placeholder="2026-08-01" value={startDate} onChangeText={setStartDate} placeholderTextColor={colors.textMuted} />

          <Text style={styles.fieldLabel}>End Date (optional)</Text>
          <TextInput style={styles.input} placeholder="Leave blank if unknown" value={endDate} onChangeText={setEndDate} placeholderTextColor={colors.textMuted} />

          <Text style={styles.fieldLabel}>R&amp;R / Leave Date (optional)</Text>
          <TextInput style={styles.input} placeholder="2026-11-15" value={rrDate} onChangeText={setRrDate} placeholderTextColor={colors.textMuted} />

          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Optional notes" value={notes} onChangeText={setNotes} placeholderTextColor={colors.textMuted} multiline />

          <Button title={editingId ? 'Save Changes' : 'Add Entry'} onPress={handleSave} fullWidth size="lg" style={{ marginTop: 8 }} />
          {editingId && (
            <Pressable style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Delete Entry</Text>
            </Pressable>
          )}
          <Button title="Cancel" onPress={() => { setShowModal(false); resetForm(); }} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  card: { borderRadius: 18, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  milestoneRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  milestoneText: { fontSize: 11, color: colors.textSecondary },
  datesRow: { marginTop: 10 },
  datesText: { fontSize: 12, color: colors.textMuted },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  memberChip: { alignItems: 'center', marginRight: 12, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', gap: 4 },
  memberChipActive: { borderColor: MILITARY_GREEN, backgroundColor: '#E7F0EA' },
  memberChipText: { fontSize: 11, color: colors.textSecondary },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center' },
  typeChipActive: { backgroundColor: MILITARY_GREEN, borderColor: MILITARY_GREEN },
  typeChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#fff' },
  input: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  deleteBtn: { backgroundColor: colors.dangerLight, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: colors.danger },
});
