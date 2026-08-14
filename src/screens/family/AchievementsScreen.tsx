import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useWealthStore } from '../../store/useWealthStore';
import { useHealthStore } from '../../store/useHealthStore';
import { useLegacyStore } from '../../store/useLegacyStore';
import { useHabitsStore } from '../../store/useHabitsStore';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useTimelineStore } from '../../store/useTimelineStore';
import { useFamilyMeetingsStore } from '../../store/useFamilyMeetingsStore';
import { Avatar } from '../../components/common/Avatar';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
  bg: string;
  category: string;
  progress: number;
  goal: number;
  unlocked: boolean;
  points: number;
  memberId?: string;
}

// Achievement definitions (title/desc/points/category/icon) are static —
// like any game's trophy list — but progress/unlocked/memberId used to be
// hardcoded fake VALUES (e.g. "member-3" hardcoded as Task Master with a
// perfect 10/10, regardless of who's actually in this family or what they
// actually did). Those are now computed from real store data below.
export function useRealAchievements(): Achievement[] {
  const tasks = useFamilyStore((s) => s.tasks);
  const members = useFamilyStore((s) => s.members);
  const budgets = useFinanceStore((s) => s.budgets);
  const wealthEntries = useWealthStore((s) => s.entries);
  const healthRecords = useHealthStore((s) => s.records);
  const legacyItems = useLegacyStore((s) => s.items);
  const habits = useHabitsStore((s) => s.habits);
  const debts = useFinanceStore((s) => s.debts);
  const pantryItems = useOperationsStore((s) => s.pantryItems);
  const timelineEntries = useTimelineStore((s) => s.entries);
  const meetings = useFamilyMeetingsStore((s) => s.meetings);

  // Task Master — real completed-task count per member (a true "streak
  // without missing" isn't derivable from completion timestamps alone, so
  // total completions is the closest honest, real proxy).
  const completedByMember = members.map((m) => ({
    member: m,
    count: tasks.filter((t) => t.status === 'completed' && t.assignedTo?.includes(m.id)).length,
  })).sort((a, b) => b.count - a.count);
  const taskLeader = completedByMember[0];

  // Health Warrior — distinct days with a health record in the last 30
  // days, per member.
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const healthByMember = members.map((m) => ({
    member: m,
    days: new Set(healthRecords.filter((r) => r.memberId === m.id && new Date(r.date).getTime() >= thirtyDaysAgo).map((r) => r.date)).size,
  })).sort((a, b) => b.days - a.days);
  const healthLeader = healthByMember[0];

  const savingsTotal = wealthEntries.filter((e) => e.category === 'savings').reduce((s, e) => s + e.currentValue, 0);
  const budgetsUnderLimit = budgets.filter((b) => b.spent <= b.monthlyLimit).length;
  const longestHabitStreak = habits.reduce((max, h) => Math.max(max, h.longestStreak), 0);
  const paidOffDebts = debts.filter((d) => d.balance === 0 && d.originalBalance > 0).length;
  const readyMembers = members.filter((m) => !!(m.allergies || m.bloodType || m.doctorName)).length;
  const exerciseThisMonth = healthRecords.filter((r) => r.metric === 'exercise' && new Date(r.date).getMonth() === new Date().getMonth() && new Date(r.date).getFullYear() === new Date().getFullYear()).length;
  const pantryStocked = pantryItems.filter((p) => !(p.minQuantity !== undefined && p.quantity <= p.minQuantity)).length;

  return [
    { id: 'a1', title: 'Task Master', desc: 'Complete tasks — real per-member completion count', icon: 'checkmark-circle', color: '#2980B9', bg: '#EBF5FB', category: 'Tasks', progress: Math.min(taskLeader?.count ?? 0, 10), goal: 10, unlocked: (taskLeader?.count ?? 0) >= 10, points: 100, memberId: (taskLeader?.count ?? 0) > 0 ? taskLeader?.member.id : undefined },
    { id: 'a2', title: 'Budget Hero', desc: 'Keep every budget category under its limit this month', icon: 'wallet', color: '#27AE60', bg: '#D5F5E3', category: 'Finance', progress: budgetsUnderLimit, goal: Math.max(1, budgets.length), unlocked: budgets.length > 0 && budgetsUnderLimit === budgets.length, points: 150 },
    { id: 'a3', title: 'Savings Champion', desc: 'Save $10,000 in family savings', icon: 'trophy', color: '#F5A623', bg: '#FEF3E2', category: 'Finance', progress: Math.min(savingsTotal, 10000), goal: 10000, unlocked: savingsTotal >= 10000, points: 200 },
    { id: 'a4', title: 'Health Warrior', desc: 'Log health metrics on 30 distinct days', icon: 'heart', color: '#E74C3C', bg: '#FDEDEC', category: 'Health', progress: Math.min(healthLeader?.days ?? 0, 30), goal: 30, unlocked: (healthLeader?.days ?? 0) >= 30, points: 120, memberId: (healthLeader?.days ?? 0) > 0 ? healthLeader?.member.id : undefined },
    { id: 'a5', title: 'Legacy Builder', desc: 'Add 10 memories to the Legacy Vault', icon: 'library', color: '#7B2D8B', bg: '#F3E5F5', category: 'Family', progress: Math.min(legacyItems.length, 10), goal: 10, unlocked: legacyItems.length >= 10, points: 80 },
    { id: 'a6', title: 'Communication Champion', desc: 'Hold 4 family meetings', icon: 'people', color: '#16A085', bg: '#D1F2EB', category: 'Family', progress: Math.min(meetings.length, 4), goal: 4, unlocked: meetings.length >= 4, points: 100 },
    { id: 'a7', title: 'Habit Streak King', desc: 'Maintain any habit for 30 days', icon: 'flame', color: '#E67E22', bg: '#FEF0E2', category: 'Habits', progress: Math.min(longestHabitStreak, 30), goal: 30, unlocked: longestHabitStreak >= 30, points: 180 },
    { id: 'a8', title: 'Debt Slayer', desc: 'Pay off one debt completely', icon: 'cut', color: '#8E44AD', bg: '#F5EEF8', category: 'Finance', progress: Math.min(paidOffDebts, 1), goal: 1, unlocked: paidOffDebts >= 1, points: 200 },
    { id: 'a9', title: 'Emergency Ready', desc: 'Have emergency medical info on file for every family member', icon: 'shield-checkmark', color: '#E74C3C', bg: '#FDEDEC', category: 'Safety', progress: readyMembers, goal: Math.max(1, members.length), unlocked: members.length > 0 && readyMembers === members.length, points: 100 },
    { id: 'a10', title: 'Family Fitness Buff', desc: 'Log 20 exercise entries this month', icon: 'fitness', color: '#27AE60', bg: '#D5F5E3', category: 'Health', progress: Math.min(exerciseThisMonth, 20), goal: 20, unlocked: exerciseThisMonth >= 20, points: 130 },
    { id: 'a11', title: 'Pantry Pro', desc: 'Keep every pantry item above its minimum quantity', icon: 'nutrition', color: '#E67E22', bg: '#FEF0E2', category: 'Operations', progress: pantryStocked, goal: Math.max(1, pantryItems.length), unlocked: pantryItems.length > 0 && pantryStocked === pantryItems.length, points: 90 },
    { id: 'a12', title: 'Memory Maker', desc: 'Record 5 family milestones', icon: 'camera', color: '#F5A623', bg: '#FEF3E2', category: 'Family', progress: Math.min(timelineEntries.length, 5), goal: 5, unlocked: timelineEntries.length >= 5, points: 75 },
  ];
}

const CATEGORIES = ['All', 'Tasks', 'Finance', 'Health', 'Family', 'Habits', 'Safety', 'Operations'];

export function AchievementsScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'all' | 'unlocked' | 'progress'>('all');
  const [category, setCategory] = useState('All');
  const members = useFamilyStore((s) => s.members);
  const ACHIEVEMENTS = useRealAchievements();

  const filtered = ACHIEVEMENTS.filter((a) => {
    if (activeTab === 'unlocked') return a.unlocked;
    if (activeTab === 'progress') return !a.unlocked;
    return true;
  }).filter((a) => category === 'All' || a.category === category);

  const totalPoints = ACHIEVEMENTS.filter((a) => a.unlocked).reduce((s, a) => s + a.points, 0);
  const unlockedCount = ACHIEVEMENTS.filter((a) => a.unlocked).length;
  const totalCount = ACHIEVEMENTS.length;

  const memberAchievements = members.map((m) => ({
    member: m,
    count: ACHIEVEMENTS.filter((a) => a.unlocked && a.memberId === m.id).length,
    points: ACHIEVEMENTS.filter((a) => a.unlocked && a.memberId === m.id).reduce((s, a) => s + a.points, 0),
  })).sort((a, b) => b.points - a.points);

  const screenHeader = (
    <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerTop}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('achievements.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{unlockedCount}/{totalCount}</Text>
          <Text style={styles.statLabel}>Unlocked</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
          <Text style={styles.statValue}>{totalPoints}</Text>
          <Text style={styles.statLabel}>Points Earned</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{Math.round((unlockedCount / totalCount) * 100)}%</Text>
          <Text style={styles.statLabel}>Completion</Text>
        </View>
      </View>

      <ProgressBar progress={unlockedCount / totalCount} color={colors.secondary} height={6} />
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{t('achievements.title')}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>{totalPoints} pts</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
            contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
          >
            {/* Leaderboard */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leaderboard} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
              {memberAchievements.map((ma, i) => (
                <View key={ma.member.id} style={styles.leaderCard}>
                  <Text style={styles.leaderRank}>{['🥇', '🥈', '🥉', '4️⃣'][i] || `${i + 1}`}</Text>
                  <Avatar name={ma.member.name} color={ma.member.avatarColor} size={36} />
                  <Text style={styles.leaderName}>{ma.member.name.split(' ')[0]}</Text>
                  <Text style={styles.leaderPts}>{ma.points} pts</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.tabs}>
              {(['all', 'unlocked', 'progress'] as const).map((t) => (
                <Pressable accessibilityRole="button" key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && styles.tabActive]}>
                  <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                    {t === 'all' ? 'All' : t === 'unlocked' ? '🏆 Unlocked' : '🔄 In Progress'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.categoryBar}>
              {CATEGORIES.map((c) => (
                <Pressable accessibilityRole="button" key={c} onPress={() => setCategory(c)} style={[styles.catChip, category === c && styles.catChipActive]}>
                  <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.grid}>
              {filtered.map((a) => {
                const member = a.memberId ? members.find((m) => m.id === a.memberId) : null;
                return (
                  <Card key={a.id} style={{ ...styles.achievCard, ...(a.unlocked ? styles.achievCardUnlocked : {}) }} variant="elevated">
                    <View style={[styles.achievIconWrap, { backgroundColor: a.unlocked ? a.bg : '#F5F5F5' }]}>
                      <Ionicons name={a.icon as any} size={28} color={a.unlocked ? a.color : '#BDBDBD'} />
                      {a.unlocked && (
                        <View style={styles.unlockedBadge}>
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.achievTitle, !a.unlocked && styles.achievTitleLocked]}>{a.title}</Text>
                    <Text style={styles.achievDesc} numberOfLines={2}>{a.desc}</Text>
                    {!a.unlocked && (
                      <View style={{ marginTop: 8 }}>
                        <ProgressBar progress={a.progress / a.goal} color={a.color} height={4} />
                        <Text style={styles.achievProgress}>{a.progress}/{a.goal}</Text>
                      </View>
                    )}
                    <View style={styles.achievFooter}>
                      <View style={[styles.achievPoints, { backgroundColor: a.unlocked ? a.bg : '#F5F5F5' }]}>
                        <Ionicons name="star" size={10} color={a.unlocked ? a.color : '#BDBDBD'} />
                        <Text style={[styles.achievPtsText, { color: a.unlocked ? a.color : '#BDBDBD' }]}>{a.points} pts</Text>
                      </View>
                      {member && (
                        <Avatar name={member.name} color={member.avatarColor} size={20} />
                      )}
                    </View>
                  </Card>
                );
              })}
            </View>

            {filtered.length === 0 && (
              <View style={styles.empty}>
                <Text style={{ fontSize: 48 }}>{activeTab === 'unlocked' ? '🏆' : '🎯'}</Text>
                <Text style={styles.emptyTitle}>No achievements {activeTab === 'unlocked' ? 'unlocked' : 'in progress'}</Text>
                <Text style={styles.emptyDesc}>Complete tasks, meet goals, and build habits to unlock achievements!</Text>
              </View>
            )}
          </ScrollView>
        )}
      </CollapsibleHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' },
  statsRow: { flexDirection: 'row', marginBottom: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  leaderboard: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card, maxHeight: 90 },
  leaderCard: { alignItems: 'center', gap: 4, paddingVertical: 4 },
  leaderRank: { fontSize: 16 },
  leaderName: { fontSize: 11, fontWeight: '700', color: colors.text },
  leaderPts: { fontSize: 10, color: colors.textMuted },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  categoryBar: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  catChip: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  catChipTextActive: { color: '#fff' },
  content: { padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  achievCard: { width: '47%', borderRadius: 16, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 16 },
  achievCardUnlocked: { borderWidth: 1.5, borderColor: colors.secondary + '40' },
  achievIconWrap: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10, position: 'relative' },
  unlockedBadge: { position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  achievTitle: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 4 },
  achievTitleLocked: { color: colors.textSecondary },
  achievDesc: { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 16 },
  achievProgress: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  achievFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, width: '100%' },
  achievPoints: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 7 },
  achievPtsText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
});
