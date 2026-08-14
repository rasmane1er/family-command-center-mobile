import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Switch,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import {
  useHomeMaintenanceStore,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceTask,
} from '../../store/useHomeMaintenanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useTranslation } from 'react-i18next';

const CATEGORIES: { value: MaintenanceCategory; label: string; icon: string }[] = [
  { value: 'plumbing', label: 'Plumbing', icon: 'water' },
  { value: 'electrical', label: 'Electrical', icon: 'flash' },
  { value: 'hvac', label: 'HVAC', icon: 'thermometer' },
  { value: 'appliances', label: 'Appliances', icon: 'tv' },
  { value: 'exterior', label: 'Exterior', icon: 'home' },
  { value: 'lawn', label: 'Lawn', icon: 'leaf' },
  { value: 'cleaning', label: 'Cleaning', icon: 'sparkles' },
  { value: 'painting', label: 'Painting', icon: 'color-palette' },
  { value: 'flooring', label: 'Flooring', icon: 'grid' },
  { value: 'other', label: 'Other', icon: 'construct' },
];

const PRIORITIES: { value: MaintenancePriority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: '#E74C3C' },
  { value: 'high', label: 'High', color: '#F5A623' },
  { value: 'medium', label: 'Medium', color: '#2980B9' },
  { value: 'low', label: 'Low', color: '#27AE60' },
];

const INTERVALS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannual', label: 'Biannual' },
  { value: 'annual', label: 'Annual' },
] as const;

const STATUSES: { value: MaintenanceStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'done', label: 'Done' },
];

function getPriorityColor(priority: MaintenancePriority): string {
  return PRIORITIES.find((p) => p.value === priority)?.color ?? colors.textMuted;
}

function getPriorityBadgeVariant(priority: MaintenancePriority): 'danger' | 'warning' | 'info' | 'success' {
  switch (priority) {
    case 'urgent': return 'danger';
    case 'high': return 'warning';
    case 'medium': return 'info';
    case 'low': return 'success';
  }
}

function getStatusBadgeVariant(status: MaintenanceStatus): 'danger' | 'warning' | 'neutral' | 'success' {
  switch (status) {
    case 'pending': return 'warning';
    case 'in_progress': return 'danger';
    case 'scheduled': return 'neutral';
    case 'done': return 'success';
  }
}

function getCategoryIcon(category: MaintenanceCategory): string {
  return CATEGORIES.find((c) => c.value === category)?.icon ?? 'construct';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

const PRIORITY_ORDER: Record<MaintenancePriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const SEASONAL_SUGGESTIONS: Record<number, string[]> = {
  0: ['HVAC Filter Change', 'Check smoke detectors', 'Weatherstripping inspection'],
  1: ['HVAC Filter Change', 'Check smoke detectors', 'Weatherstripping inspection'],
  2: ['HVAC Filter Change', 'Check smoke detectors', 'Weatherstripping inspection'],
  3: ['Gutter cleaning', 'AC service', 'Exterior paint inspection'],
  4: ['Gutter cleaning', 'AC service', 'Exterior paint inspection'],
  5: ['Gutter cleaning', 'AC service', 'Exterior paint inspection'],
  6: ['Deck/patio inspection', 'Irrigation check', 'Window cleaning'],
  7: ['Deck/patio inspection', 'Irrigation check', 'Window cleaning'],
  8: ['Deck/patio inspection', 'Irrigation check', 'Window cleaning'],
  9: ['Furnace inspection', 'Chimney sweep', 'Leaf gutter cleaning'],
  10: ['Furnace inspection', 'Chimney sweep', 'Leaf gutter cleaning'],
  11: ['Furnace inspection', 'Chimney sweep', 'Leaf gutter cleaning'],
};

const SEASON_LABELS: Record<number, string> = {
  0: 'Winter', 1: 'Winter', 2: 'Winter',
  3: 'Spring', 4: 'Spring', 5: 'Spring',
  6: 'Summer', 7: 'Summer', 8: 'Summer',
  9: 'Fall', 10: 'Fall', 11: 'Fall',
};

export function HomeMaintenanceScreen({ navigation }: any) {
  const { t } = useTranslation('ops');
  const insets = useSafeAreaInsets();
  const { tasks, addTask, updateTask, deleteTask, completeTask, isLoaded, fetchFromServer } = useHomeMaintenanceStore();

  useEffect(() => {
    if (!isLoaded) fetchFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const family = useFamilyStore((s) => s.family);

  const [activeTab, setActiveTab] = useState<'pending' | 'done' | 'recurring'>('pending');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<MaintenanceCategory>('other');
  const [formPriority, setFormPriority] = useState<MaintenancePriority>('medium');
  const [formDueDate, setFormDueDate] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formContractor, setFormContractor] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formRecurring, setFormRecurring] = useState(false);
  const [formInterval, setFormInterval] = useState<'monthly' | 'quarterly' | 'biannual' | 'annual'>('quarterly');

  const pendingTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const doneTasks = tasks.filter((t) => t.status === 'done').sort((a, b) => (b.completedDate ?? '').localeCompare(a.completedDate ?? ''));
  const recurringTasks = tasks.filter((t) => t.isRecurring);
  const urgentCount = pendingTasks.filter((t) => t.priority === 'urgent').length;
  const totalEstCost = pendingTasks.reduce((sum, t) => sum + (t.estimatedCost ?? 0), 0);

  const resetForm = () => {
    setFormTitle(''); setFormCategory('other'); setFormPriority('medium');
    setFormDueDate(''); setFormCost(''); setFormContractor(''); setFormNotes('');
    setFormRecurring(false); setFormInterval('quarterly');
  };

  const handleAdd = () => {
    if (!formTitle.trim()) return;
    addTask({
      familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
      title: formTitle.trim(),
      category: formCategory,
      priority: formPriority,
      status: 'pending',
      dueDate: formDueDate.trim() || undefined,
      estimatedCost: formCost ? parseFloat(formCost) : undefined,
      contractor: formContractor.trim() || undefined,
      notes: formNotes.trim() || undefined,
      isRecurring: formRecurring,
      recurringInterval: formRecurring ? formInterval : undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetForm();
    setShowAddModal(false);
  };

  const handleComplete = (task: MaintenanceTask) => {
    completeTask(task.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (task: MaintenanceTask) => {
    Alert.alert(t('common.deleteTitle'), `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          deleteTask(task.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const renderTaskCard = (task: MaintenanceTask, showActions = true) => {
    const overdue = isOverdue(task.dueDate);
    const catIcon = getCategoryIcon(task.category);
    const priorityColor = getPriorityColor(task.priority);

    return (
      <Card key={task.id} style={styles.taskCard} variant="elevated">
        <View style={styles.taskHeader}>
          <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />
          <View style={[styles.catIconBg, { backgroundColor: priorityColor + '18' }]}>
            <Ionicons name={catIcon as any} size={20} color={priorityColor} />
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <View style={styles.taskBadges}>
              <Badge label={task.priority.toUpperCase()} variant={getPriorityBadgeVariant(task.priority)} size="sm" />
              <Badge label={task.status.replace('_', ' ')} variant={getStatusBadgeVariant(task.status)} size="sm" />
              {task.isRecurring && <Badge label="Recurring" variant="neutral" size="sm" />}
            </View>
          </View>
          {showActions && (
            <Pressable accessibilityRole="button" onPress={() => handleDelete(task)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          )}
        </View>

        <View style={styles.taskMeta}>
          {task.dueDate ? (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={overdue ? colors.danger : colors.textMuted} />
              <Text style={[styles.metaText, overdue && styles.overdueText]}>
                {overdue ? 'Overdue: ' : 'Due: '}{formatDate(task.dueDate)}
              </Text>
            </View>
          ) : null}
          {task.estimatedCost !== undefined ? (
            <View style={styles.metaRow}>
              <Ionicons name="cash-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>Est. ${task.estimatedCost}</Text>
            </View>
          ) : null}
          {task.contractor ? (
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{task.contractor}</Text>
            </View>
          ) : null}
          {task.notes ? (
            <Text style={styles.taskNotes}>{task.notes}</Text>
          ) : null}
        </View>

        {showActions && (
          <View style={styles.taskActions}>
            <Button
              title="Mark Done"
              onPress={() => handleComplete(task)}
              variant="success"
              size="sm"
              leftIcon={<Ionicons name="checkmark" size={14} color="#fff" />}
            />
          </View>
        )}
      </Card>
    );
  };

  const renderDoneCard = (task: MaintenanceTask) => (
    <Card key={task.id} style={{ ...styles.taskCard, ...styles.doneCard } as ViewStyle} variant="default">
      <View style={styles.taskHeader}>
        <View style={[styles.catIconBg, { backgroundColor: colors.success + '15' }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        </View>
        <View style={styles.taskInfo}>
          <Text style={[styles.taskTitle, styles.doneText]}>{task.title}</Text>
          <View style={styles.taskBadges}>
            <Badge label="Completed" variant="success" size="sm" />
            {task.isRecurring && <Badge label="Recurring" variant="neutral" size="sm" />}
          </View>
        </View>
      </View>
      <View style={styles.taskMeta}>
        {task.completedDate ? (
          <View style={styles.metaRow}>
            <Ionicons name="checkmark-done-outline" size={14} color={colors.success} />
            <Text style={styles.metaText}>Completed: {formatDate(task.completedDate)}</Text>
          </View>
        ) : null}
        {task.actualCost !== undefined ? (
          <View style={styles.metaRow}>
            <Ionicons name="cash-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>Actual cost: ${task.actualCost}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );

  const renderRecurringCard = (task: MaintenanceTask) => (
    <Card key={task.id} style={styles.taskCard} variant="elevated">
      <View style={styles.taskHeader}>
        <View style={[styles.catIconBg, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={getCategoryIcon(task.category) as any} size={20} color={colors.primary} />
        </View>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={styles.taskBadges}>
            <Badge label={task.recurringInterval ?? 'recurring'} variant="neutral" size="sm" />
            <Badge label={task.status.replace('_', ' ')} variant={getStatusBadgeVariant(task.status)} size="sm" />
          </View>
        </View>
      </View>
      <View style={styles.taskMeta}>
        {task.dueDate ? (
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>Next due: {formatDate(task.dueDate)}</Text>
          </View>
        ) : null}
        {task.estimatedCost !== undefined ? (
          <View style={styles.metaRow}>
            <Ionicons name="cash-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>Est. ${task.estimatedCost} per occurrence</Text>
          </View>
        ) : null}
        {task.contractor ? (
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{task.contractor}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );

  const screenHeader = (
    <LinearGradient colors={['#37474F', '#546E7A']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerTop}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('ops.homeMaintenance')}</Text>
        <Pressable accessibilityRole="button" onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.headerStats}>
        <View style={styles.headerStat}>
          <Text style={styles.headerStatNum}>{pendingTasks.length}</Text>
          <Text style={styles.headerStatLabel}>Pending</Text>
        </View>
        <View style={styles.headerStatDivider} />
        <View style={styles.headerStat}>
          <Text style={styles.headerStatNum}>{urgentCount}</Text>
          <Text style={styles.headerStatLabel}>Urgent</Text>
        </View>
        <View style={styles.headerStatDivider} />
        <View style={styles.headerStat}>
          <Text style={styles.headerStatNum}>${totalEstCost}</Text>
          <Text style={styles.headerStatLabel}>Est. Cost</Text>
        </View>
      </View>
    
    <View style={styles.tabs}>
            {(['pending', 'done', 'recurring'] as const).map((tab) => (
              <Pressable accessibilityRole="button"
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
</LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#37474F', '#546E7A']}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('ops.homeMaintenance')}</Text>
      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>{pendingTasks.length} pending</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100, paddingTop: contentPaddingTop }}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
      >
        {activeTab === 'pending' && (
          <>
            {(() => {
              const month = new Date().getMonth();
              const suggestions = SEASONAL_SUGGESTIONS[month] ?? [];
              const season = SEASON_LABELS[month] ?? '';
              return (
                <View style={styles.seasonalSection}>
                  <Text style={styles.seasonalTitle}>🍂 {season} Suggestions</Text>
                  <View style={styles.seasonalChips}>
                    {suggestions.map((s) => (
                      <Pressable accessibilityRole="button"
                        key={s}
                        onPress={() => {
                          setFormTitle(s);
                          setShowAddModal(true);
                        }}
                        style={styles.seasonalChip}
                      >
                        <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                        <Text style={styles.seasonalChipText}>{s}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })()}
            {pendingTasks.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="home-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No pending tasks</Text>
                <Text style={styles.emptyDesc}>Your home is in great shape!</Text>
              </View>
            )}
            {pendingTasks.map((t) => renderTaskCard(t))}
          </>
        )}

        {activeTab === 'done' && (
          <>
            {doneTasks.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-done-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No completed tasks</Text>
                <Text style={styles.emptyDesc}>Completed tasks will appear here</Text>
              </View>
            )}
            {doneTasks.map((t) => renderDoneCard(t))}
          </>
        )}

        {activeTab === 'recurring' && (
          <>
            {recurringTasks.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="repeat-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No recurring tasks</Text>
                <Text style={styles.emptyDesc}>Add recurring maintenance to stay on top of your home</Text>
              </View>
            )}
            {recurringTasks.map((t) => renderRecurringCard(t))}
          </>
        )}
      </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add Task Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Maintenance Task</Text>

          <Text style={styles.modalLabel}>Title *</Text>
          <TextInput accessibilityLabel="e.g. Replace HVAC filter" style={styles.modalInput} placeholder="e.g. Replace HVAC filter" value={formTitle} onChangeText={setFormTitle} placeholderTextColor={colors.textMuted} autoFocus />

          <Text style={styles.modalLabel}>Category</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((c) => (
              <Pressable accessibilityRole="button"
                key={c.value}
                onPress={() => setFormCategory(c.value)}
                style={[styles.catChip, formCategory === c.value && styles.catChipActive]}
              >
                <Ionicons name={c.icon as any} size={18} color={formCategory === c.value ? colors.primary : colors.textSecondary} />
                <Text style={[styles.catChipLabel, formCategory === c.value && styles.catChipLabelActive]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => (
              <Pressable accessibilityRole="button"
                key={p.value}
                onPress={() => setFormPriority(p.value)}
                style={[styles.priorityChip, formPriority === p.value && { borderColor: p.color, backgroundColor: p.color + '18' }]}
              >
                <Text style={[styles.priorityChipLabel, formPriority === p.value && { color: p.color }]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Due Date (YYYY-MM-DD)</Text>
          <TextInput accessibilityLabel="2024-07-01" style={styles.modalInput} placeholder="2024-07-01" value={formDueDate} onChangeText={setFormDueDate} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Estimated Cost ($)</Text>
          <TextInput accessibilityLabel="e.g. 200" style={styles.modalInput} placeholder="e.g. 200" value={formCost} onChangeText={setFormCost} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Contractor / Service Provider</Text>
          <TextInput accessibilityLabel="e.g. Bob's Plumbing (555-0199)" style={styles.modalInput} placeholder="e.g. Bob's Plumbing (555-0199)" value={formContractor} onChangeText={setFormContractor} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Notes</Text>
          <TextInput accessibilityLabel="Any additional notes..." style={[styles.modalInput, styles.modalTextarea]} placeholder="Any additional notes..." value={formNotes} onChangeText={setFormNotes} multiline numberOfLines={3} placeholderTextColor={colors.textMuted} />

          <View style={styles.recurringRow}>
            <View>
              <Text style={styles.recurringLabel}>Recurring Task</Text>
              <Text style={styles.recurringSubLabel}>Repeats on a schedule</Text>
            </View>
            <Switch value={formRecurring} onValueChange={setFormRecurring} trackColor={{ true: colors.primary }} />
          </View>

          {formRecurring && (
            <>
              <Text style={styles.modalLabel}>Interval</Text>
              <View style={styles.intervalRow}>
                {INTERVALS.map((i) => (
                  <Pressable accessibilityRole="button"
                    key={i.value}
                    onPress={() => setFormInterval(i.value)}
                    style={[styles.intervalChip, formInterval === i.value && styles.intervalChipActive]}
                  >
                    <Text style={[styles.intervalChipLabel, formInterval === i.value && styles.intervalChipLabelActive]}>{i.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Button title="Add Task" onPress={handleAdd} fullWidth size="lg" disabled={!formTitle.trim()} style={{ marginTop: 8 }} />
          <Button title="Cancel" onPress={() => { resetForm(); setShowAddModal(false); }} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  seasonalSection: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  seasonalTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  seasonalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seasonalChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.primary + '12', borderWidth: 1, borderColor: colors.primary + '40' },
  seasonalChipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  headerStat: {
    alignItems: 'center',
    flex: 1,
  },
  headerStatNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  headerStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#546E7A',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: '#546E7A',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  taskCard: {
    marginBottom: 12,
    paddingLeft: 8,
    overflow: 'hidden',
  },
  doneCard: {
    opacity: 0.8,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  priorityBar: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: -8,
    top: -16,
    bottom: -16,
    borderRadius: 2,
  },
  catIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  doneText: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  taskBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  deleteBtn: {
    padding: 8,
  },
  taskMeta: {
    marginTop: 12,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  overdueText: {
    color: colors.danger,
    fontWeight: '600',
  },
  taskNotes: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  taskActions: {
    marginTop: 12,
    flexDirection: 'row',
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  modalTextarea: {
    height: 80,
    textAlignVertical: 'top',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  catChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  catChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  catChipLabelActive: {
    color: colors.primary,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  priorityChip: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
  },
  priorityChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recurringLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  recurringSubLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  intervalRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  intervalChip: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  intervalChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  intervalChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  intervalChipLabelActive: {
    color: colors.primary,
  },
});
