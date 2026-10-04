import React, { useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { View, Text, StyleSheet, ScrollView, FlatList, Pressable, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { ProgressRing } from '../../components/dashboard/ProgressRing';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { Task, TaskPriority, FamilyMember } from '../../types';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pickTaskCompletionPhoto } from '../../utils/pickTaskPhoto';
import { SignedImage } from '../../components/common/SignedImage';
import { useTranslation } from 'react-i18next';

const FILTERS = ['All', 'Pending', 'Needs Review', 'Completed', 'Overdue'];
const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

const priorityColors = {
  urgent: colors.danger,
  high: '#FF6B6B',
  medium: colors.warning,
  low: colors.success,
};

interface TaskListItemProps {
  task: Task;
  assignees: FamilyMember[];
  assigneeId: string;
  role: string | undefined;
  onPress: (task: Task, assigneeId: string) => void;
  onApprove: (id: string) => void;
  onReject: (task: Task) => void;
  onDelete: (id: string) => void;
  onPreviewPhoto: (url: string) => void;
}

// Memoized so an unrelated screen state change (opening the add-task modal,
// typing in it, etc.) doesn't re-render every visible task card — only rows
// whose own props actually changed re-render.
const TaskListItem = React.memo(function TaskListItem({
  task, assignees, assigneeId, role, onPress, onApprove, onReject, onDelete, onPreviewPhoto,
}: TaskListItemProps) {
  const isPendingApproval = task.status === 'pending_approval';
  const isDone = task.status === 'completed';
  const isOverdue = task.status === 'overdue';
  const tone = isPendingApproval ? '#F5A623' : priorityColors[task.priority];
  return (
    <View style={[styles.taskCard, isDone && styles.taskCardDone, isOverdue && styles.taskCardOverdue]}>
      <View style={styles.taskRow}>
        <Pressable accessibilityRole="button"
          onPress={() => onPress(task, assigneeId)}
          disabled={isPendingApproval}
          style={[
            styles.checkCircle,
            { borderColor: tone, backgroundColor: tone + '14' },
            isDone && styles.checkCircleComplete,
            isPendingApproval && styles.checkCirclePending,
          ]}
        >
          {isDone && <Ionicons name="checkmark" size={18} color="#fff" />}
          {isPendingApproval && <Ionicons name="hourglass-outline" size={15} color="#F5A623" />}
        </Pressable>

        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
            {task.title}
          </Text>
          {task.description && (
            <Text style={styles.taskDesc} numberOfLines={1}>{task.description}</Text>
          )}
          <View style={styles.taskMeta}>
            <View style={[styles.pill, { backgroundColor: tone + '1F' }]}>
              <View style={[styles.pillDot, { backgroundColor: tone }]} />
              <Text style={[styles.pillText, { color: tone, textTransform: 'capitalize' }]}>{task.priority}</Text>
            </View>
            <View style={[styles.pill, styles.pillNeutral]}>
              <Text style={[styles.pillText, { color: colors.textSecondary }]}>{task.category}</Text>
            </View>
            <View style={[styles.pill, styles.pillPoints]}>
              <Ionicons name="star" size={11} color="#D97706" />
              <Text style={[styles.pillText, { color: '#B45309' }]}>+{task.points} pts</Text>
            </View>
          </View>
          {task.dueDate && (
            <View style={styles.dueDateRow}>
              <Ionicons name="calendar-outline" size={13} color={isOverdue ? colors.danger : colors.textMuted} />
              <Text style={[styles.dueDate, isOverdue && { color: colors.danger, fontWeight: '700' }]}>
                Due {format(new Date(task.dueDate), 'MMM d, yyyy')}
              </Text>
            </View>
          )}
          {task.rejectionNote !== undefined && task.status === 'pending' && (
            <Text style={styles.rejectedHint}>Sent back — try again</Text>
          )}

          {isPendingApproval && (
            <View style={styles.reviewBox}>
              <View style={styles.reviewRow}>
                <Ionicons name="hourglass-outline" size={13} color="#B85C00" />
                <Text style={styles.reviewText}>Waiting for approval</Text>
                {task.completionPhotoUrl && (
                  <Pressable accessibilityRole="button" onPress={() => onPreviewPhoto(task.completionPhotoUrl!)}>
                    <SignedImage uri={task.completionPhotoUrl} style={styles.reviewThumb} />
                  </Pressable>
                )}
              </View>
              {role !== 'child' && (
                <View style={styles.reviewActions}>
                  <Pressable accessibilityRole="button" onPress={() => onApprove(task.id)} style={styles.approveBtn}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => onReject(task)} style={styles.rejectBtn}>
                    <Text style={styles.rejectBtnText}>Send Back</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.taskRight}>
          {assignees.length > 0 && (
            <View style={styles.assignees}>
              {assignees.slice(0, 2).map((a, i) => (
                <View key={a.id} style={[styles.assigneeRing, { marginLeft: i > 0 ? -10 : 0 }]}>
                  <Avatar name={a.name} color={a.avatarColor} size={28} />
                </View>
              ))}
            </View>
          )}
          <Pressable accessibilityRole="button" onPress={() => onDelete(task.id)} style={styles.deleteBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

export function TasksScreen({ navigation, route }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [newTaskRequiresApproval, setNewTaskRequiresApproval] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const tasks = useFamilyStore((s) => s.tasks);
  const memberId = route?.params?.memberId;
  const role = route?.params?.role;
  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);
  const addTask = useFamilyStore((s) => s.addTask);
  const completeTask = useFamilyStore((s) => s.completeTask);
  const submitTaskForApproval = useFamilyStore((s) => s.submitTaskForApproval);
  const approveTask = useFamilyStore((s) => s.approveTask);
  const rejectTask = useFamilyStore((s) => s.rejectTask);
  const deleteTask = useFamilyStore((s) => s.deleteTask);

 const visibleTasks =
  role === 'child' && memberId
    ? tasks.filter((task) => task.assignedTo?.includes(memberId))
    : tasks;

const filteredTasks = visibleTasks
  .filter((t) => {
    if (filter === 'All') return true;
    if (filter === 'Pending') return t.status === 'pending';
    if (filter === 'Needs Review') return t.status === 'pending_approval';
    if (filter === 'Completed') return t.status === 'completed';
    if (filter === 'Overdue') return t.status === 'overdue';
    return true;
  })
  .sort((a, b) => {
    const priority = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priority[a.priority] - priority[b.priority];
  });

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const task: Task = {
      id: `task-${Date.now()}`,
      familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
      title: newTaskTitle.trim(),
      assignedTo: selectedMember ? [selectedMember] : [],
      priority: newTaskPriority,
      status: 'pending',
      category: 'General',
      recurrence: 'none',
      points: newTaskPriority === 'urgent' ? 100 : newTaskPriority === 'high' ? 50 : newTaskPriority === 'medium' ? 30 : 15,
      createdAt: new Date().toISOString(),
      createdBy: members[0]?.id || 'user',
      requiresApproval: newTaskRequiresApproval,
    };
    addTask(task);
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setSelectedMember(null);
    setNewTaskRequiresApproval(false);
    setShowAddModal(false);
  };

  const handleTaskPress = useCallback(async (task: Task, assigneeId: string) => {
    if (task.status === 'completed' || task.status === 'pending_approval') return;
    if (task.requiresApproval) {
      const photoUrl = await pickTaskCompletionPhoto();
      submitTaskForApproval(task.id, assigneeId, photoUrl ?? undefined);
    } else {
      completeTask(task.id, assigneeId);
    }
  }, [submitTaskForApproval, completeTask]);

  const handleReject = useCallback((task: Task) => {
    Alert.alert('Send back to pending?', `"${task.title}" will go back to your kid's list so they can redo it.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send Back', style: 'destructive', onPress: () => rejectTask(task.id) },
    ]);
  }, [rejectTask]);

  // Precomputed once per members change instead of members.filter() being
  // re-run against the full member list for every task row on every render.
  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const renderTaskItem = useCallback(({ item: task }: { item: Task }) => {
    const assignees = (task.assignedTo ?? [])
      .map((id) => membersById.get(id))
      .filter((m): m is FamilyMember => !!m);
    const assigneeId = assignees[0]?.id || members[0]?.id || '';
    return (
      <TaskListItem
        task={task}
        assignees={assignees}
        assigneeId={assigneeId}
        role={role}
        onPress={handleTaskPress}
        onApprove={approveTask}
        onReject={handleReject}
        onDelete={deleteTask}
        onPreviewPhoto={setPreviewPhotoUrl}
      />
    );
  }, [membersById, members, role, handleTaskPress, approveTask, handleReject, deleteTask]);

  const stats = {
    total: visibleTasks.length,
    completed: visibleTasks.filter((t) => t.status === 'completed').length,
    pending: visibleTasks.filter((t) => t.status === 'pending').length,
    overdue: visibleTasks.filter((t) => t.status === 'overdue').length,
  };
  const completionRatio = stats.total > 0 ? stats.completed / stats.total : 0;

  const filterCounts: Record<string, number> = {
    All: visibleTasks.length,
    Pending: stats.pending,
    'Needs Review': visibleTasks.filter((t) => t.status === 'pending_approval').length,
    Completed: stats.completed,
    Overdue: stats.overdue,
  };

  const screenHeader = (
        <PremiumHeader
          title={t('tasks.title')}
          onBack={() => {
            if (route.params?.source === 'dashboard') { navigation.getParent()?.navigate('Home'); return; }
            if (navigation.canGoBack()) { navigation.goBack(); } else { navigation.getParent()?.navigate('Home'); }
          }}
          rightAction={
            <Pressable accessibilityRole="button" onPress={() => setShowAddModal(true)} style={styles.addBtn}>
              <Ionicons name="add" size={26} color="#fff" />
            </Pressable>
          }
        >
          <View style={styles.summaryRow}>
            <ProgressRing
              size={88}
              strokeWidth={9}
              progress={completionRatio}
              color="#5EEAD4"
              trackColor="rgba(255,255,255,0.18)"
            >
              <Text style={styles.ringPct}>{Math.round(completionRatio * 100)}%</Text>
              <Text style={styles.ringCaption}>{stats.completed}/{stats.total}</Text>
            </ProgressRing>

            <View style={styles.statGrid}>
              {[
                { label: 'Total', value: stats.total, color: '#fff', icon: 'layers' },
                { label: t('tasks.completed'), value: stats.completed, color: '#4ADE80', icon: 'checkmark-circle' },
                { label: t('tasks.pending'), value: stats.pending, color: '#FBBF24', icon: 'time' },
                { label: t('tasks.overdue'), value: stats.overdue, color: '#F87171', icon: 'alert-circle' },
              ].map((s, i) => (
                <View key={i} style={styles.statChip}>
                  <Ionicons name={s.icon as any} size={16} color={s.color} />
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {FILTERS.map((f) => (
              <Pressable accessibilityRole="button" key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}>
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                <View style={[styles.filterCount, filter === f && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, filter === f && styles.filterCountTextActive]}>{filterCounts[f] ?? 0}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </PremiumHeader>
  );
  const screenCompact = (
    <LinearGradient
      colors={['#0F2952', '#1E4A8A']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable accessibilityRole="button" onPress={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()} style={{ padding: 8, marginRight: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>Tasks</Text>
      <View />
    </LinearGradient>
  );

  return (
    <View style={styles.container}>


      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <FlatList
            data={filteredTasks}
            keyExtractor={(task) => task.id}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: 110, paddingTop: contentPaddingTop + 14 },
              filteredTasks.length === 0 && { flexGrow: 1 },
            ]}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <LinearGradient colors={['#E0E7FF', '#DBEAFE']} style={styles.emptyIconWrap}>
                  <Ionicons name="checkmark-done" size={38} color={colors.primaryLight} />
                </LinearGradient>
                <Text style={styles.emptyTitle}>No tasks here!</Text>
                <Text style={styles.emptyDesc}>{filter === 'Completed' ? 'Complete some tasks to see them here.' : 'All caught up! Add new tasks above.'}</Text>
                <Pressable accessibilityRole="button" onPress={() => setShowAddModal(true)} style={styles.emptyCta}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.emptyCtaText}>Add Task</Text>
                </Pressable>
              </View>
            }
            renderItem={renderTaskItem}
          />
        )}
      </CollapsibleHeader>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add New Task</Text>

          <TextInput accessibilityLabel="Task title..."
            style={styles.taskInput}
            placeholder="Task title..."
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <Text style={styles.modalLabel}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => (
              <Pressable accessibilityRole="button" key={p} onPress={() => setNewTaskPriority(p)} style={[styles.priorityChip, newTaskPriority === p && { backgroundColor: priorityColors[p], borderColor: priorityColors[p] }]}>
                <View style={[styles.priorityDot, { backgroundColor: newTaskPriority === p ? '#fff' : priorityColors[p] }]} />
                <Text style={[styles.priorityText, newTaskPriority === p && { color: '#fff' }]}>{p}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Assign To</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assignScroll} contentContainerStyle={styles.assignScrollContent}>
            {members.map((m) => (
              <Pressable accessibilityRole="button" key={m.id} onPress={() => setSelectedMember(selectedMember === m.id ? null : m.id)} style={[styles.assignChip, selectedMember === m.id && styles.assignChipActive]}>
                <Avatar name={m.name} color={m.avatarColor} size={32} />
                <Text style={styles.assignName}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable accessibilityRole="button" onPress={() => setNewTaskRequiresApproval((v) => !v)} style={styles.approveToggleRow}>
            <Ionicons name={newTaskRequiresApproval ? 'checkbox' : 'square-outline'} size={22} color={newTaskRequiresApproval ? colors.primary : colors.textMuted} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.approveToggleTitle}>Require approval before points</Text>
              <Text style={styles.approveToggleDesc}>Task moves to a review queue instead of completing instantly — good for chores you want to check.</Text>
            </View>
          </Pressable>

          <Button title="Add Task" onPress={handleAddTask} fullWidth size="lg" disabled={!newTaskTitle.trim()} style={{ marginTop: 8 }} />
          <Button title="Cancel" onPress={() => setShowAddModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </View>
      </Modal>

      <Modal visible={!!previewPhotoUrl} transparent animationType="fade" onRequestClose={() => setPreviewPhotoUrl(null)}>
        <Pressable accessibilityRole="button" style={styles.photoPreviewBackdrop} onPress={() => setPreviewPhotoUrl(null)}>
          {previewPhotoUrl && <SignedImage uri={previewPhotoUrl} style={styles.photoPreviewImage} resizeMode="contain" />}
          <Pressable accessibilityRole="button" onPress={() => setPreviewPhotoUrl(null)} style={styles.photoPreviewClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  /* ── Header summary ── */
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10, marginBottom: 16 },
  ringPct: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  ringCaption: { fontSize: 10.5, fontWeight: '700', color: 'rgba(255,255,255,0.65)', marginTop: -1 },
  statGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statChip: { width: '47.5%', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10 },
  statValue: { fontSize: 17, fontWeight: '900' },
  statLabel: { flex: 1, fontSize: 10.5, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  filterScroll: { marginBottom: 0 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingLeft: 14, paddingRight: 8, borderRadius: 20, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.12)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.78)' },
  filterTextActive: { color: colors.primary },
  filterCount: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  filterCountActive: { backgroundColor: colors.primary + '1A' },
  filterCountText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  filterCountTextActive: { color: colors.primary },

  /* ── Task cards ── */
  content: { padding: 16 },
  taskCard: { marginBottom: 12, borderRadius: 22, padding: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  taskCardDone: { opacity: 0.68 },
  taskCardOverdue: { borderColor: colors.danger + '55', backgroundColor: '#FFFBFB' },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkCircleComplete: { backgroundColor: colors.success, borderColor: colors.success },
  checkCirclePending: { backgroundColor: '#FEF3E2' },
  taskTitle: { fontSize: 16.5, fontWeight: '800', color: colors.text, marginBottom: 4, letterSpacing: -0.2 },
  taskTitleDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  rejectedHint: { fontSize: 11, color: colors.danger, fontWeight: '600', marginTop: 4 },
  taskDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11.5, fontWeight: '800' },
  pillNeutral: { backgroundColor: colors.background },
  pillPoints: { backgroundColor: '#FEF3C7' },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dueDate: { fontSize: 12.5, color: colors.textSecondary, fontWeight: '600' },
  taskRight: { alignItems: 'flex-end', gap: 12, marginLeft: 8 },
  assignees: { flexDirection: 'row' },
  assigneeRing: { borderRadius: 16, borderWidth: 2, borderColor: colors.card, overflow: 'hidden' },
  deleteBtn: { padding: 4 },

  /* ── Empty state ── */
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIconWrap: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 20, letterSpacing: -0.3 },
  emptyDesc: { fontSize: 14.5, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32, lineHeight: 21 },
  emptyCta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 999, ...shadows.md },
  emptyCtaText: { fontSize: 14.5, fontWeight: '800', color: '#fff' },

  /* ── Add-task sheet ── */
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 20, letterSpacing: -0.4 },
  taskInput: { backgroundColor: colors.card, borderRadius: 16, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 22, ...shadows.sm },
  modalLabel: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  priorityChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  priorityText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'capitalize' },
  assignScroll: { marginBottom: 24, maxHeight: 82 },
  assignScrollContent: { alignItems: 'flex-start' },
  assignChip: { alignItems: 'center', marginRight: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent' },
  assignChipActive: { borderColor: colors.primary, backgroundColor: '#E8EEF9' },
  assignName: { fontSize: 11, color: colors.textSecondary, marginTop: 4, fontWeight: '600' },
  approveToggleRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: colors.border },
  approveToggleTitle: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 3 },
  approveToggleDesc: { fontSize: 11, color: colors.textSecondary, lineHeight: 15 },

  /* ── Review / approval box ── */
  reviewBox: { backgroundColor: '#FEF3E2', borderRadius: 14, padding: 12, marginTop: 10, gap: 10 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#B85C00' },
  reviewThumb: { width: 40, height: 40, borderRadius: 8 },
  reviewActions: { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.success, borderRadius: 12, paddingVertical: 9 },
  approveBtnText: { fontSize: 12.5, fontWeight: '800', color: '#fff' },
  rejectBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 9, borderWidth: 1.5, borderColor: colors.danger },
  rejectBtnText: { fontSize: 12.5, fontWeight: '800', color: colors.danger },

  /* ── Photo preview modal ── */
  photoPreviewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  photoPreviewImage: { width: '92%', height: '70%' },
  photoPreviewClose: { position: 'absolute', top: 60, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
});
