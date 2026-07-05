import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isPast } from 'date-fns';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { ProgressBar } from '../../../components/common/ProgressBar';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/spacing';
import { useMilitaryStore, PCS_CHECKLIST_CATEGORY } from '../../../store/useMilitaryStore';
import { useFamilyStore } from '../../../store/useFamilyStore';
import type { PCSMove } from '../../../types';
import { useTranslation } from 'react-i18next';

const MILITARY_GREEN = '#4A7C59';
const generateId = () => Math.random().toString(36).substring(2, 11);

function isValidDate(s: string): boolean {
  return !isNaN(new Date(s).getTime());
}

function MoveChecklist({ move }: { move: PCSMove }) {
  const tasks = useFamilyStore((s) => s.tasks);
  const members = useFamilyStore((s) => s.members);
  const completeTask = useFamilyStore((s) => s.completeTask);

  const checklist = tasks
    .filter((t) => t.pcsMoveId === move.id)
    .sort((a, b) => new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime());

  const done = checklist.filter((t) => t.status === 'completed').length;
  const progress = checklist.length > 0 ? done / checklist.length : 0;

  return (
    <View>
      <View style={styles.progressRow}>
        <ProgressBar progress={progress} color={MILITARY_GREEN} height={8} style={{ flex: 1, borderRadius: 4 }} />
        <Text style={styles.progressText}>{done}/{checklist.length}</Text>
      </View>

      {checklist.map((task) => {
        const overdue = !!task.dueDate && task.status !== 'completed' && isPast(new Date(task.dueDate));
        return (
          <Pressable
            key={task.id}
            onPress={() => task.status !== 'completed' && completeTask(task.id, members[0]?.id ?? task.createdBy)}
            style={styles.checklistRow}
          >
            <View style={[styles.checkCircle, task.status === 'completed' && styles.checkCircleDone]}>
              {task.status === 'completed' && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.checklistTitle, task.status === 'completed' && styles.checklistTitleDone]}>
                {task.title}
              </Text>
              {task.dueDate && (
                <Text style={[styles.checklistDue, overdue && styles.checklistDueOverdue]}>
                  {overdue ? 'Overdue — ' : 'Due '}{format(new Date(task.dueDate), 'MMM d, yyyy')}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PCSMoveScreen({ navigation }: any) {
  const pcsMoves = useMilitaryStore((s) => s.pcsMoves);
  const addPCSMove = useMilitaryStore((s) => s.addPCSMove);
  const deletePCSMove = useMilitaryStore((s) => s.deletePCSMove);
  const family = useFamilyStore((s) => s.family);

  const { t } = useTranslation('family');
  const [showModal, setShowModal] = useState(false);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [moveDate, setMoveDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...pcsMoves].sort((a, b) => new Date(b.moveDate).getTime() - new Date(a.moveDate).getTime());

  const handleAdd = () => {
    if (!fromLocation.trim() || !toLocation.trim() || !isValidDate(moveDate)) {
      Alert.alert(t('common.validationTitle'), 'Please enter both locations and a valid move date (YYYY-MM-DD).');
      return;
    }
    const move: PCSMove = {
      id: generateId(),
      familyId: family?.id ?? 'demo-family',
      fromLocation: fromLocation.trim(),
      toLocation: toLocation.trim(),
      moveDate: new Date(moveDate).toISOString(),
      createdAt: new Date().toISOString(),
    };
    addPCSMove(move);
    setFromLocation('');
    setToLocation('');
    setMoveDate('');
    setShowModal(false);
    setExpandedId(move.id);
  };

  const handleDelete = (move: PCSMove) => {
    Alert.alert(t('common.deleteTitle'), `This removes the "${move.fromLocation} → ${move.toLocation}" move and its checklist tasks.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePCSMove(move.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <PremiumHeader
        title="PCS Move Planner"
        onBack={() => navigation.goBack()}
        colors={['#0F2952', MILITARY_GREEN]}
        rightAction={
          <Pressable onPress={() => setShowModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sorted.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No PCS move planned</Text>
            <Text style={styles.emptyDesc}>
              Tap + to set a move date and get a real {PCS_CHECKLIST_CATEGORY} checklist, timed to your move.
            </Text>
          </View>
        )}

        {sorted.map((move) => {
          const expanded = expandedId === move.id;
          return (
            <Card key={move.id} style={styles.moveCard} variant="elevated">
              <Pressable onPress={() => setExpandedId(expanded ? null : move.id)} style={styles.moveHeader}>
                <View style={styles.moveIcon}>
                  <Ionicons name="airplane-outline" size={22} color={MILITARY_GREEN} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.moveTitle}>{move.fromLocation} → {move.toLocation}</Text>
                  <Text style={styles.moveMeta}>Move date: {format(new Date(move.moveDate), 'MMM d, yyyy')}</Text>
                </View>
                <Pressable onPress={() => handleDelete(move)} style={styles.deleteIconBtn}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </Pressable>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </Pressable>

              {expanded && (
                <View style={styles.checklistWrap}>
                  <MoveChecklist move={move} />
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>New PCS Move</Text>

          <Text style={styles.fieldLabel}>Current Duty Station</Text>
          <TextInput style={styles.input} placeholder="e.g. Fort Bragg, NC" value={fromLocation} onChangeText={setFromLocation} placeholderTextColor={colors.textMuted} />

          <Text style={styles.fieldLabel}>New Duty Station</Text>
          <TextInput style={styles.input} placeholder="e.g. Joint Base Lewis-McChord, WA" value={toLocation} onChangeText={setToLocation} placeholderTextColor={colors.textMuted} />

          <Text style={styles.fieldLabel}>Move Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} placeholder="2026-09-01" value={moveDate} onChangeText={setMoveDate} placeholderTextColor={colors.textMuted} />

          <Text style={styles.hint}>
            Adding this move creates a real checklist of tasks in your Tasks list, each due a set number of days before your move date.
          </Text>

          <Button title="Create Move & Checklist" onPress={handleAdd} fullWidth size="lg" />
          <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  moveCard: { borderRadius: 18, marginBottom: 12, padding: 0, overflow: 'hidden' },
  moveHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  moveIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E7F0EA', alignItems: 'center', justifyContent: 'center' },
  moveTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  moveMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  deleteIconBtn: { padding: 6, marginRight: 4 },
  checklistWrap: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  progressText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  checklistRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkCircleDone: { backgroundColor: MILITARY_GREEN, borderColor: MILITARY_GREEN },
  checklistTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  checklistTitleDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  checklistDue: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  checklistDueOverdue: { color: colors.danger, fontWeight: '600' },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: 20, lineHeight: 18 },
});
