import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, Alert,
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
import { ProgressBar } from '../../components/common/ProgressBar';
import { useFamilyGoalsStore, FamilyGoal, GoalCategory, GoalMilestone } from '../../store/useFamilyGoalsStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const generateId = () => Math.random().toString(36).substring(2, 11);

const CATEGORY_COLORS: Record<GoalCategory, string> = {
  health: '#E74C3C',
  finance: '#27AE60',
  education: '#F5A623',
  travel: '#2980B9',
  home: '#8E44AD',
  relationships: '#E91E63',
  career: '#16A085',
  fun: '#F5A623',
  other: '#95A5A6',
};

const CATEGORY_ICONS: Record<GoalCategory, string> = {
  health: 'heart',
  finance: 'wallet',
  education: 'school',
  travel: 'airplane',
  home: 'home',
  relationships: 'people',
  career: 'briefcase',
  fun: 'happy',
  other: 'ellipsis-horizontal',
};

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  health: 'Health',
  finance: 'Finance',
  education: 'Education',
  travel: 'Travel',
  home: 'Home',
  relationships: 'Relationships',
  career: 'Career',
  fun: 'Fun',
  other: 'Other',
};

const ALL_CATEGORIES: GoalCategory[] = ['health', 'finance', 'education', 'travel', 'home', 'relationships', 'career', 'fun', 'other'];
const PRIORITY_COLORS = { low: colors.textMuted, medium: colors.warning, high: colors.danger };
const COLOR_PALETTE = ['#E74C3C', '#27AE60', '#F5A623', '#2980B9', '#8E44AD', '#E91E63', '#16A085', '#95A5A6'];
const ICON_OPTIONS = ['airplane', 'car', 'school', 'fitness', 'home', 'heart'];

export function FamilyGoalsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { goals, addGoal, updateGoal, deleteGoal, toggleMilestone, completeGoal, seedDemoData } = useFamilyGoalsStore();
  const members = useFamilyStore((s) => s.members);

  const [activeTab, setActiveTab] = useState<'Active' | 'Completed' | 'By Category'>('Active');
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<GoalCategory>('travel');
  const [newColor, setNewColor] = useState('#2980B9');
  const [newIcon, setNewIcon] = useState('airplane');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newMembersInvolved, setNewMembersInvolved] = useState<string[]>([]);
  const [newMilestones, setNewMilestones] = useState<GoalMilestone[]>([]);
  const [milestoneInput, setMilestoneInput] = useState('');

  const activeGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);
  const avgProgress = activeGoals.length > 0 ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length) : 0;

  const resetModal = () => {
    setNewTitle('');
    setNewDescription('');
    setNewCategory('travel');
    setNewColor('#2980B9');
    setNewIcon('airplane');
    setNewTargetDate('');
    setNewPriority('medium');
    setNewMembersInvolved([]);
    setNewMilestones([]);
    setMilestoneInput('');
  };

  const handleAdd = () => {
    if (!newTitle.trim()) {
      Alert.alert('Missing Info', 'Please enter a goal title.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addGoal({
      familyId: 'demo-family',
      title: newTitle.trim(),
      description: newDescription || undefined,
      category: newCategory,
      targetDate: newTargetDate || undefined,
      progress: 0,
      milestones: newMilestones,
      membersInvolved: newMembersInvolved,
      priority: newPriority,
      isCompleted: false,
      color: newColor,
      icon: newIcon,
    });
    resetModal();
    setShowAddModal(false);
  };

  const addMilestone = () => {
    if (!milestoneInput.trim()) return;
    setNewMilestones((prev) => [...prev, { id: generateId(), text: milestoneInput.trim(), isDone: false }]);
    setMilestoneInput('');
  };

  const removeMilestone = (id: string) => {
    setNewMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleMember = (id: string) => {
    setNewMembersInvolved((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(`Delete "${title}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteGoal(id);
        }
      },
    ]);
  };

  const handleComplete = (goal: FamilyGoal) => {
    Alert.alert('Complete Goal?', `Mark "${goal.title}" as completed?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete!', onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          completeGoal(goal.id);
        }
      },
    ]);
  };

  const tabs = ['Active', 'Completed', 'By Category'] as const;

  const categoryGoals = selectedCategory === 'all'
    ? activeGoals
    : activeGoals.filter((g) => g.category === selectedCategory);

  const GoalCard = ({ goal, showComplete = false }: { goal: FamilyGoal; showComplete?: boolean }) => {
    const involvedMembers = goal.membersInvolved
      .map((id) => members.find((m) => m.id === id))
      .filter(Boolean);

    return (
      <Card style={styles.goalCard} variant="elevated">
        {/* Goal header */}
        <View style={styles.goalHeader}>
          <View style={[styles.goalIconCircle, { backgroundColor: goal.color + '20' }]}>
            <Ionicons name={goal.icon as any} size={22} color={goal.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.goalTitleRow}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Pressable onPress={() => handleDelete(goal.id, goal.title)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
              </Pressable>
            </View>
            <View style={styles.goalMetaRow}>
              <Badge
                label={CATEGORY_LABELS[goal.category]}
                variant="info"
                size="sm"
              />
              <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[goal.priority] }]} />
              {goal.targetDate && (
                <Text style={styles.targetDate}>Target: {goal.targetDate}</Text>
              )}
            </View>
          </View>
        </View>

        {goal.description ? (
          <Text style={styles.goalDesc}>{goal.description}</Text>
        ) : null}

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <ProgressBar progress={goal.progress / 100} color={goal.color} height={8} />
          <Text style={[styles.progressLabel, { color: goal.color }]}>{goal.progress}%</Text>
        </View>

        {/* Members */}
        {involvedMembers.length > 0 && (
          <View style={styles.membersRow}>
            {involvedMembers.map((m) => m && (
              <View key={m.id} style={[styles.memberAvatar, { backgroundColor: m.avatarColor }]}>
                <Text style={styles.memberAvatarText}>{m.name[0]}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Milestones */}
        {goal.milestones.length > 0 && (
          <View style={styles.milestonesSection}>
            <Text style={styles.milestonesTitle}>Milestones</Text>
            {goal.milestones.map((milestone) => (
              <Pressable
                key={milestone.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleMilestone(goal.id, milestone.id);
                }}
                style={styles.milestoneRow}
              >
                <View style={[styles.milestoneCheckbox, milestone.isDone && { backgroundColor: goal.color, borderColor: goal.color }]}>
                  {milestone.isDone && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={[styles.milestoneText, milestone.isDone && styles.milestoneDone]}>
                  {milestone.text}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Complete button when 100% */}
        {goal.progress >= 100 && !goal.isCompleted && showComplete && (
          <Pressable onPress={() => handleComplete(goal)} style={[styles.completeBtn, { backgroundColor: goal.color }]}>
            <Ionicons name="trophy" size={16} color="#fff" />
            <Text style={styles.completeBtnText}>Mark as Complete!</Text>
          </Pressable>
        )}

        {/* Completed badge */}
        {goal.isCompleted && (
          <View style={styles.completedBadgeRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.completedBadgeText}>Goal Completed!</Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1A237E', '#283593']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Family Goals</Text>
          <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{activeGoals.length}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{avgProgress}%</Text>
            <Text style={styles.summaryLabel}>Avg Progress</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{completedGoals.length}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {goals.length === 0 && (
          <Pressable onPress={seedDemoData} style={styles.seedBtn}>
            <Ionicons name="flask" size={18} color="#283593" />
            <Text style={[styles.seedBtnText, { color: '#283593' }]}>Load Demo Data</Text>
          </Pressable>
        )}

        {/* ACTIVE TAB */}
        {activeTab === 'Active' && (
          <>
            {activeGoals.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="flag-outline" size={52} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No active goals</Text>
                <Text style={styles.emptyDesc}>Tap + to add your first family goal.</Text>
              </View>
            ) : (
              [...activeGoals]
                .sort((a, b) => {
                  const pOrder = { high: 0, medium: 1, low: 2 };
                  return pOrder[a.priority] - pOrder[b.priority];
                })
                .map((goal) => <GoalCard key={goal.id} goal={goal} showComplete />)
            )}
          </>
        )}

        {/* COMPLETED TAB */}
        {activeTab === 'Completed' && (
          <>
            {completedGoals.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={52} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No completed goals yet</Text>
                <Text style={styles.emptyDesc}>Keep working — your completed goals will appear here!</Text>
              </View>
            ) : (
              completedGoals.map((goal) => (
                <View key={goal.id}>
                  <GoalCard goal={goal} />
                </View>
              ))
            )}
          </>
        )}

        {/* BY CATEGORY TAB */}
        {activeTab === 'By Category' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <Pressable
                onPress={() => setSelectedCategory('all')}
                style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryChipText, selectedCategory === 'all' && styles.categoryChipTextActive]}>All</Text>
              </Pressable>
              {ALL_CATEGORIES.map((cat) => {
                const count = activeGoals.filter((g) => g.category === cat).length;
                if (count === 0) return null;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat && { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] },
                    ]}
                  >
                    <Ionicons name={CATEGORY_ICONS[cat] as any} size={14} color={selectedCategory === cat ? '#fff' : CATEGORY_COLORS[cat]} />
                    <Text style={[styles.categoryChipText, selectedCategory === cat && { color: '#fff' }]}>
                      {CATEGORY_LABELS[cat]} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {categoryGoals.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="flag-outline" size={52} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No goals in this category</Text>
              </View>
            ) : (
              categoryGoals.map((goal) => <GoalCard key={goal.id} goal={goal} showComplete />)
            )}
          </>
        )}
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Family Goal</Text>
            <Pressable onPress={() => { resetModal(); setShowAddModal(false); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalLabel}>Title *</Text>
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Hawaii Family Vacation"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, { height: 70 }]}
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="What does success look like?"
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {ALL_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => { setNewCategory(cat); setNewColor(CATEGORY_COLORS[cat]); }}
                  style={[styles.categoryGridItem, newCategory === cat && { borderColor: CATEGORY_COLORS[cat], backgroundColor: CATEGORY_COLORS[cat] + '15' }]}
                >
                  <Ionicons name={CATEGORY_ICONS[cat] as any} size={20} color={newCategory === cat ? CATEGORY_COLORS[cat] : colors.textMuted} />
                  <Text style={[styles.categoryGridLabel, newCategory === cat && { color: CATEGORY_COLORS[cat] }]}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Icon</Text>
            <View style={styles.iconRow}>
              {ICON_OPTIONS.map((icon) => (
                <Pressable
                  key={icon}
                  onPress={() => setNewIcon(icon)}
                  style={[styles.iconOption, newIcon === icon && { backgroundColor: newColor + '20', borderColor: newColor }]}
                >
                  <Ionicons name={icon as any} size={22} color={newIcon === icon ? newColor : colors.textMuted} />
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Color</Text>
            <View style={styles.colorPicker}>
              {COLOR_PALETTE.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setNewColor(c)}
                  style={[styles.colorSwatch, { backgroundColor: c }, newColor === c && styles.colorSwatchActive]}
                />
              ))}
            </View>

            <Text style={styles.modalLabel}>Target Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={newTargetDate}
              onChangeText={setNewTargetDate}
              placeholder="2025-12-31"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Priority</Text>
            <View style={styles.chipRow}>
              {(['low', 'medium', 'high'] as const).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setNewPriority(p)}
                  style={[styles.chip, newPriority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }]}
                >
                  <Text style={[styles.chipText, newPriority === p && { color: '#fff' }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Members Involved</Text>
            {members.map((m) => (
              <Pressable key={m.id} onPress={() => toggleMember(m.id)} style={styles.memberRow}>
                <View style={[styles.memberAvatar, { backgroundColor: m.avatarColor }]}>
                  <Text style={styles.memberAvatarText}>{m.name[0]}</Text>
                </View>
                <Text style={styles.memberName}>{m.name}</Text>
                <View style={[styles.checkbox, newMembersInvolved.includes(m.id) && { backgroundColor: newColor, borderColor: newColor }]}>
                  {newMembersInvolved.includes(m.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </Pressable>
            ))}

            <Text style={styles.modalLabel}>Milestones</Text>
            <View style={styles.milestoneInputRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                value={milestoneInput}
                onChangeText={setMilestoneInput}
                placeholder="Add a milestone..."
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={addMilestone}
              />
              <Pressable onPress={addMilestone} style={[styles.milestoneAddBtn, { backgroundColor: newColor }]}>
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            </View>
            {newMilestones.map((m) => (
              <View key={m.id} style={styles.milestoneListRow}>
                <Ionicons name="remove-circle-outline" size={18} color={colors.textMuted} />
                <Text style={styles.milestoneListText}>{m.text}</Text>
                <Pressable onPress={() => removeMilestone(m.id)}>
                  <Ionicons name="close" size={16} color={colors.danger} />
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={handleAdd}
              style={[styles.submitBtn, { backgroundColor: newColor }, !newTitle.trim() && styles.submitBtnDisabled]}
            >
              <Ionicons name="flag" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Add Goal</Text>
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 2 },
  tabRow: { flexDirection: 'row', marginBottom: 0 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#fff' },
  tabText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: '#fff' },
  content: { padding: 16 },
  seedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 16, ...shadows.sm },
  seedBtnText: { fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 14 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  // Goal card
  goalCard: { marginBottom: 12 },
  goalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  goalIconCircle: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  goalTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  deleteBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  goalMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  targetDate: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  goalDesc: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  progressLabel: { fontSize: 13, fontWeight: '700', width: 38, textAlign: 'right' },
  membersRow: { flexDirection: 'row', gap: -8, marginBottom: 10 },
  memberAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  memberAvatarText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  milestonesSection: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 },
  milestonesTitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  milestoneCheckbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  milestoneText: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '500' },
  milestoneDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 11, marginTop: 10 },
  completeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  completedBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  completedBadgeText: { fontSize: 13, fontWeight: '700', color: colors.success },
  // By category tab
  categoryScroll: { marginBottom: 16 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12, marginRight: 8 },
  categoryChipActive: { backgroundColor: '#283593', borderColor: '#283593' },
  categoryChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  categoryChipTextActive: { color: '#fff' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.card },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalScroll: { flex: 1, padding: 20 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: colors.text, marginBottom: 16, backgroundColor: colors.background },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryGridItem: { width: '30%', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', gap: 4 },
  categoryGridLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  iconRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  iconOption: { width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  colorPicker: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  colorSwatchActive: { borderWidth: 3, borderColor: colors.text },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  memberName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  milestoneInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  milestoneAddBtn: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  milestoneListRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 2 },
  milestoneListText: { flex: 1, fontSize: 13, color: colors.text },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, marginTop: 16 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
