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
import { Avatar } from '../../components/common/Avatar';

interface Achievement {
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

const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', title: 'Task Master', desc: 'Complete 10 tasks in a row without missing one', icon: 'checkmark-circle', color: '#2980B9', bg: '#EBF5FB', category: 'Tasks', progress: 10, goal: 10, unlocked: true, points: 100, memberId: 'member-3' },
  { id: 'a2', title: 'Budget Hero', desc: 'Stay under budget for 3 consecutive months', icon: 'wallet', color: '#27AE60', bg: '#D5F5E3', category: 'Finance', progress: 2, goal: 3, unlocked: false, points: 150 },
  { id: 'a3', title: 'Savings Champion', desc: 'Save $10,000 in family savings', icon: 'trophy', color: '#F5A623', bg: '#FEF3E2', category: 'Finance', progress: 7800, goal: 10000, unlocked: false, points: 200 },
  { id: 'a4', title: 'Health Warrior', desc: 'Log health metrics for 30 days straight', icon: 'heart', color: '#E74C3C', bg: '#FDEDEC', category: 'Health', progress: 14, goal: 30, unlocked: false, points: 120, memberId: 'member-1' },
  { id: 'a5', title: 'Legacy Builder', desc: 'Add 10 memories to the Legacy Vault', icon: 'library', color: '#7B2D8B', bg: '#F3E5F5', category: 'Family', progress: 6, goal: 10, unlocked: false, points: 80 },
  { id: 'a6', title: 'Communication Champion', desc: 'Hold 4 weekly family meetings', icon: 'people', color: '#16A085', bg: '#D1F2EB', category: 'Family', progress: 3, goal: 4, unlocked: false, points: 100 },
  { id: 'a7', title: 'Habit Streak King', desc: 'Maintain any habit for 30 days', icon: 'flame', color: '#E67E22', bg: '#FEF0E2', category: 'Habits', progress: 21, goal: 30, unlocked: false, points: 180 },
  { id: 'a8', title: 'Debt Slayer', desc: 'Pay off one debt completely', icon: 'cut', color: '#8E44AD', bg: '#F5EEF8', category: 'Finance', progress: 1, goal: 1, unlocked: true, points: 200 },
  { id: 'a9', title: 'Emergency Ready', desc: 'Complete your emergency kit checklist', icon: 'shield-checkmark', color: '#E74C3C', bg: '#FDEDEC', category: 'Safety', progress: 8, goal: 12, unlocked: false, points: 100 },
  { id: 'a10', title: 'Family Fitness Buff', desc: 'Exercise together 20 times this month', icon: 'fitness', color: '#27AE60', bg: '#D5F5E3', category: 'Health', progress: 13, goal: 20, unlocked: false, points: 130 },
  { id: 'a11', title: 'Pantry Pro', desc: 'Keep pantry stocked with zero waste for 2 weeks', icon: 'nutrition', color: '#E67E22', bg: '#FEF0E2', category: 'Operations', progress: 9, goal: 14, unlocked: false, points: 90 },
  { id: 'a12', title: 'Memory Maker', desc: 'Record 5 family milestones', icon: 'camera', color: '#F5A623', bg: '#FEF3E2', category: 'Family', progress: 5, goal: 5, unlocked: true, points: 75 },
];

const CATEGORIES = ['All', 'Tasks', 'Finance', 'Health', 'Family', 'Habits', 'Safety', 'Operations'];

export function AchievementsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'all' | 'unlocked' | 'progress'>('all');
  const [category, setCategory] = useState('All');
  const members = useFamilyStore((s) => s.members);

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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Achievements</Text>
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
          <Pressable key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'all' ? 'All' : t === 'unlocked' ? '🏆 Unlocked' : '🔄 In Progress'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.categoryBar}>
        {CATEGORIES.map((c) => (
          <Pressable key={c} onPress={() => setCategory(c)} style={[styles.catChip, category === c && styles.catChipActive]}>
            <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
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
  statValue: { fontSize: 26, fontWeight: '800', color: '#fff' },
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
