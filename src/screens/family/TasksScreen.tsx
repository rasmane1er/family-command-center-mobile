import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { Task, TaskPriority } from '../../types';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pickTaskCompletionPhoto } from '../../utils/pickTaskPhoto';
import { useTranslation } from 'react-i18next';

const FILTERS = ['All', 'Pending', 'Needs Review', 'Completed', 'Overdue'];
const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

const priorityColors = {
  urgent: colors.danger,
  high: '#FF6B6B',
  medium: colors.warning,
  low: colors.success,
};

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

  const handleTaskPress = async (task: Task, assigneeId: string) => {
    if (task.status === 'completed' || task.status === 'pending_approval') return;
    if (task.requiresApproval) {
      const photoUrl = await pickTaskCompletionPhoto();
      submitTaskForApproval(task.id, assigneeId, photoUrl ?? undefined);
    } else {
      completeTask(task.id, assigneeId);
    }
  };

  const handleReject = (task: Task) => {
    Alert.alert('Send back to pending?', `"${task.title}" will go back to your kid's list so they can redo it.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send Back', style: 'destructive', onPress: () => rejectTask(task.id) },
    ]);
  };

  const stats = {
    total: visibleTasks.length,
    completed: visibleTasks.filter((t) => t.status === 'completed').length,
    pending: visibleTasks.filter((t) => t.status === 'pending').length,
    overdue: visibleTasks.filter((t) => t.status === 'overdue').length,
  };

  const screenHeader = (
        <PremiumHeader
          title={t('tasks.title')}
          onBack={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()}
          rightAction={
            <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
              <Ionicons name="add" size={26} color="#fff" />
            </Pressable>
          }
        >
          <View style={styles.statsRow}>
            {[
              { label: 'Total', value: stats.total, color: 'rgba(255,255,255,0.8)' },
              { label: t('tasks.completed'), value: stats.completed, color: colors.success },
              { label: t('tasks.pending'), value: stats.pending, color: colors.secondary },
              { label: t('tasks.overdue'), value: stats.overdue, color: colors.danger },
            ].map((s, i) => (
              <View key={i} style={styles.statChip}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {FILTERS.map((f) => (
              <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}>
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
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
      <Pressable onPress={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()} style={{ padding: 8, marginRight: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
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
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
          >
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No tasks here!</Text>
            <Text style={styles.emptyDesc}>{filter === 'Completed' ? 'Complete some tasks to see them here.' : 'All caught up! Add new tasks above.'}</Text>
          </View>
        ) : (
          filteredTasks.map((task) => {
            const assignees = members.filter((m) => task.assignedTo?.includes(m.id));
            const assigneeId = assignees[0]?.id || members[0]?.id || '';
            const isPendingApproval = task.status === 'pending_approval';
            const isDone = task.status === 'completed';
            return (
              <Card key={task.id} style={styles.taskCard} variant="elevated">
                <View style={styles.taskRow}>
                  <Pressable
                    onPress={() => handleTaskPress(task, assigneeId)}
                    disabled={isPendingApproval}
                    style={[
                      styles.checkCircle,
                      isDone && styles.checkCircleComplete,
                      isPendingApproval && styles.checkCirclePending,
                      { borderColor: isPendingApproval ? '#F5A623' : priorityColors[task.priority] },
                    ]}
                  >
                    {isDone && <Ionicons name="checkmark" size={16} color="#fff" />}
                    {isPendingApproval && <Ionicons name="hourglass-outline" size={14} color="#F5A623" />}
                  </Pressable>

                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                      {task.title}
                    </Text>
                    {task.description && (
                      <Text style={styles.taskDesc} numberOfLines={1}>{task.description}</Text>
                    )}
                    <View style={styles.taskMeta}>
                      <Badge
                        label={task.priority}
                        variant={task.priority === 'urgent' || task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'neutral'}
                        dot
                      />
                      <Badge label={task.category} variant="neutral" size="sm" style={{ marginLeft: 6 }} />
                      <Text style={styles.taskPoints}>+{task.points} pts</Text>
                    </View>
                    {task.dueDate && (
                      <View style={styles.dueDateRow}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.dueDate}>Due {format(new Date(task.dueDate), 'MMM d, yyyy')}</Text>
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
                            <Pressable onPress={() => setPreviewPhotoUrl(task.completionPhotoUrl ?? null)}>
                              <Image source={{ uri: task.completionPhotoUrl }} style={styles.reviewThumb} />
                            </Pressable>
                          )}
                        </View>
                        {role !== 'child' && (
                          <View style={styles.reviewActions}>
                            <Pressable onPress={() => approveTask(task.id)} style={styles.approveBtn}>
                              <Ionicons name="checkmark" size={14} color="#fff" />
                              <Text style={styles.approveBtnText}>Approve</Text>
                            </Pressable>
                            <Pressable onPress={() => handleReject(task)} style={styles.rejectBtn}>
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
                          <Avatar key={a.id} name={a.name} color={a.avatarColor} size={28} style={{ marginLeft: i > 0 ? -8 : 0 }} />
                        ))}
                      </View>
                    )}
                    <Pressable onPress={() => deleteTask(task.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })
        )}
          </ScrollView>
        )}
      </CollapsibleHeader>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add New Task</Text>

          <TextInput
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
              <Pressable key={p} onPress={() => setNewTaskPriority(p)} style={[styles.priorityChip, newTaskPriority === p && { backgroundColor: priorityColors[p], borderColor: priorityColors[p] }]}>
                <Text style={[styles.priorityText, newTaskPriority === p && { color: '#fff' }]}>{p}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Assign To</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {members.map((m) => (
              <Pressable key={m.id} onPress={() => setSelectedMember(selectedMember === m.id ? null : m.id)} style={[styles.assignChip, selectedMember === m.id && styles.assignChipActive]}>
                <Avatar name={m.name} color={m.avatarColor} size={32} />
                <Text style={styles.assignName}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable onPress={() => setNewTaskRequiresApproval((v) => !v)} style={styles.approveToggleRow}>
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
        <Pressable style={styles.photoPreviewBackdrop} onPress={() => setPreviewPhotoUrl(null)}>
          {previewPhotoUrl && <Image source={{ uri: previewPhotoUrl }} style={styles.photoPreviewImage} resizeMode="contain" />}
          <Pressable onPress={() => setPreviewPhotoUrl(null)} style={styles.photoPreviewClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  filterScroll: { marginBottom: 0 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  filterTextActive: { color: colors.primary },
  content: { padding: 16 },
  taskCard: { marginBottom: 10, borderRadius: 16 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkCircleComplete: { backgroundColor: colors.success, borderColor: colors.success },
  checkCirclePending: { backgroundColor: '#FEF3E2' },
  taskTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 5 },
  taskTitleDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  rejectedHint: { fontSize: 11, color: colors.danger, fontWeight: '600', marginTop: 2, marginBottom: 4 },
  taskDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  taskPoints: { fontSize: 11, color: colors.success, fontWeight: '700', marginLeft: 4 },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueDate: { fontSize: 12, color: colors.textSecondary },
  taskRight: { alignItems: 'flex-end', gap: 10 },
  assignees: { flexDirection: 'row' },
  deleteBtn: { padding: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 15, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  taskInput: { backgroundColor: colors.card, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 20, ...shadows.sm },
  modalLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  priorityChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center' },
  priorityText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
  assignChip: { alignItems: 'center', marginRight: 12, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent' },
  assignChipActive: { borderColor: colors.primary, backgroundColor: '#E8EEF9' },
  assignName: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  approveToggleRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: colors.border },
  approveToggleTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 3 },
  approveToggleDesc: { fontSize: 11, color: colors.textSecondary, lineHeight: 15 },

  /* ── Review / approval box ── */
  reviewBox: { backgroundColor: '#FEF3E2', borderRadius: 12, padding: 10, marginTop: 8, gap: 8 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#B85C00' },
  reviewThumb: { width: 40, height: 40, borderRadius: 8 },
  reviewActions: { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.success, borderRadius: 10, paddingVertical: 8 },
  approveBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  rejectBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 8, borderWidth: 1.5, borderColor: colors.danger },
  rejectBtnText: { fontSize: 12, fontWeight: '700', color: colors.danger },

  /* ── Photo preview modal ── */
  photoPreviewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  photoPreviewImage: { width: '92%', height: '70%' },
  photoPreviewClose: { position: 'absolute', top: 60, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
});
