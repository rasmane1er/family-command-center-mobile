import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { useChoreStore, Chore, ChoreFrequency, ChoreCategory } from '../../store/useChoreStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const FREQ_LABELS: Record<ChoreFrequency, string> = {
  daily: 'Daily', weekly: 'Weekly', biweekly: 'Every 2 Weeks', monthly: 'Monthly',
};

const FREQ_FILTERS: { key: ChoreFrequency | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Biweekly' },
  { key: 'monthly', label: 'Monthly' },
];

const CAT_EMOJIS: Record<ChoreCategory, string> = {
  kitchen: '🍳', bathroom: '🚿', bedroom: '🛏️', living: '🛋️',
  outdoor: '🌿', laundry: '👕', other: '🧹',
};

function isDoneToday(chore: Chore): boolean {
  return chore.lastCompletedDate === new Date().toISOString().split('T')[0];
}

function isOverdue(chore: Chore): boolean {
  if (!chore.lastCompletedDate) return chore.frequency === 'daily' || chore.frequency === 'weekly';
  const daysSince = Math.floor((Date.now() - new Date(chore.lastCompletedDate).getTime()) / 86400000);
  if (chore.frequency === 'daily') return daysSince >= 1;
  if (chore.frequency === 'weekly') return daysSince >= 7;
  if (chore.frequency === 'biweekly') return daysSince >= 14;
  if (chore.frequency === 'monthly') return daysSince >= 30;
  return false;
}

export function ChoreRotationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<ChoreFrequency | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🧹');
  const [newFreq, setNewFreq] = useState<ChoreFrequency>('weekly');

  const { chores, completeChore, deleteChore, addChore, seedDemoData } = useChoreStore();
  const members = useFamilyStore((s) => s.members);

  if (chores.length === 0) seedDemoData();

  const getMember = (id?: string) => members.find((m) => m.id === id);

  const filtered = useMemo(() =>
    filter === 'all' ? chores : chores.filter((c) => c.frequency === filter),
    [chores, filter]
  );

  const overdueCount = chores.filter(isOverdue).length;
  const doneToday = chores.filter(isDoneToday).length;

  const handleComplete = (chore: Chore) => {
    const assignee = getMember(chore.assignedMemberIds[chore.currentAssigneeIndex]);
    const nextIndex = (chore.currentAssigneeIndex + 1) % chore.assignedMemberIds.length;
    const nextAssignee = getMember(chore.assignedMemberIds[nextIndex]);
    Alert.alert(
      `Mark as Done?`,
      `${chore.emoji} ${chore.name}\n\nCompleted by: ${assignee?.name ?? 'Unknown'}\nNext up: ${nextAssignee?.name ?? 'Same person'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Done! ✓',
          onPress: () => {
            completeChore(chore.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleDelete = (chore: Chore) => {
    Alert.alert('Delete Chore', `Remove "${chore.name}" from rotation?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteChore(chore.id) },
    ]);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addChore({
      name: newName.trim(),
      emoji: newEmoji,
      description: '',
      frequency: newFreq,
      estimatedMinutes: 20,
      points: 15,
      color: '#2980B9',
      category: 'other',
      assignedMemberIds: members.slice(0, 2).map((m) => m.id),
      lastCompletedDate: undefined,
      lastCompletedBy: undefined,
    });
    setNewName('');
    setNewEmoji('🧹');
    setNewFreq('weekly');
    setShowAdd(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1A3C34', '#16A085']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Chore Rotation</Text>
            <Text style={styles.headerSub}>{doneToday} done today · {overdueCount} overdue</Text>
          </View>
          <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{chores.length}</Text>
            <Text style={styles.statLabel}>Total Chores</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: overdueCount > 0 ? '#FFD166' : '#4EECD0' }]}>{overdueCount}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: '#4EECD0' }]}>{doneToday}</Text>
            <Text style={styles.statLabel}>Done Today</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FREQ_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 56 }}>🧹</Text>
            <Text style={styles.emptyTitle}>No chores here</Text>
            <Text style={styles.emptyDesc}>Tap + to add chores and assign them to family members for automatic rotation.</Text>
          </View>
        )}

        {filtered.map((chore) => {
          const assignee = getMember(chore.assignedMemberIds[chore.currentAssigneeIndex]);
          const done = isDoneToday(chore);
          const overdue = isOverdue(chore);

          return (
            <Pressable key={chore.id} onLongPress={() => handleDelete(chore)}>
              <Card
                style={{
                  ...styles.choreCard,
                  ...(done ? styles.choreCardDone : {}),
                  ...(overdue && !done ? styles.choreCardOverdue : {}),
                  borderLeftColor: chore.color,
                }}
                variant="elevated"
              >
                <View style={styles.choreTop}>
                  <Text style={styles.choreEmoji}>{chore.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.choreNameRow}>
                      <Text style={[styles.choreName, done && styles.choreNameDone]}>{chore.name}</Text>
                      {done && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
                      {overdue && !done && <View style={styles.overdueBadge}><Text style={styles.overdueText}>OVERDUE</Text></View>}
                    </View>
                    <View style={styles.choreMeta}>
                      <Text style={styles.choreFreq}>{FREQ_LABELS[chore.frequency]}</Text>
                      <Text style={styles.choreDot}>·</Text>
                      <Text style={styles.choreTime}>{chore.estimatedMinutes} min</Text>
                      <Text style={styles.choreDot}>·</Text>
                      <Text style={styles.chorePoints}>+{chore.points} pts</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.assigneeRow}>
                  <View style={styles.assigneeInfo}>
                    <View style={[styles.assigneeDot, { backgroundColor: assignee?.avatarColor ?? colors.primary }]} />
                    <Text style={styles.assigneeLabel}>Up now: </Text>
                    <Text style={styles.assigneeName}>{assignee?.name ?? 'Unassigned'}</Text>
                  </View>

                  <View style={styles.rotationChips}>
                    {chore.assignedMemberIds.map((mid, idx) => {
                      const m = getMember(mid);
                      return (
                        <View
                          key={mid}
                          style={[
                            styles.rotationDot,
                            { backgroundColor: m?.avatarColor ?? colors.border },
                            idx === chore.currentAssigneeIndex && styles.rotationDotActive,
                          ]}
                        >
                          <Text style={styles.rotationInitial}>{m?.name?.charAt(0) ?? '?'}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {!done && (
                  <Pressable
                    style={[styles.doneBtn, { backgroundColor: chore.color }]}
                    onPress={() => handleComplete(chore)}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.doneBtnText}>Mark Done</Text>
                  </Pressable>
                )}
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Chore</Text>
            <Pressable onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalLabel}>Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
              {['🧹', '🍽️', '🚿', '🛏️', '🗑️', '👕', '🌿', '✨', '🍳', '🚰'].map((e) => (
                <Pressable key={e} onPress={() => setNewEmoji(e)} style={[styles.emojiBtn, newEmoji === e && styles.emojiBtnActive]}>
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Chore Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Take out trash"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Frequency</Text>
            <View style={styles.freqRow}>
              {(['daily', 'weekly', 'biweekly', 'monthly'] as ChoreFrequency[]).map((f) => (
                <Pressable key={f} onPress={() => setNewFreq(f)} style={[styles.freqBtn, newFreq === f && styles.freqBtnActive]}>
                  <Text style={[styles.freqBtnText, newFreq === f && styles.freqBtnTextActive]}>
                    {FREQ_LABELS[f]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.saveBtn} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>Add Chore</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  back: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14, marginBottom: 14, justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  filterTextActive: { color: '#1A3C34' },
  content: { padding: 16 },
  choreCard: { marginBottom: 12, borderRadius: 16, borderLeftWidth: 4 },
  choreCardDone: { opacity: 0.65 },
  choreCardOverdue: { borderColor: colors.danger },
  choreTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  choreEmoji: { fontSize: 32 },
  choreNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  choreName: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  choreNameDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  choreMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  choreFreq: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  choreDot: { fontSize: 11, color: colors.textMuted },
  choreTime: { fontSize: 11, color: colors.textSecondary },
  chorePoints: { fontSize: 11, color: colors.success, fontWeight: '700' },
  overdueBadge: { backgroundColor: colors.dangerLight, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  overdueText: { fontSize: 9, fontWeight: '800', color: colors.danger, letterSpacing: 0.5 },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  assigneeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assigneeDot: { width: 10, height: 10, borderRadius: 5 },
  assigneeLabel: { fontSize: 12, color: colors.textSecondary },
  assigneeName: { fontSize: 12, fontWeight: '700', color: colors.text },
  rotationChips: { flexDirection: 'row', gap: 4 },
  rotationDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', opacity: 0.5 },
  rotationDotActive: { opacity: 1, borderWidth: 2, borderColor: '#fff' },
  rotationInitial: { fontSize: 11, fontWeight: '800', color: '#fff' },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 9 },
  doneBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalContent: { padding: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  emojiBtn: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 2, borderColor: 'transparent' },
  emojiBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  freqBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  freqBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  freqBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  freqBtnTextActive: { color: colors.primary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
