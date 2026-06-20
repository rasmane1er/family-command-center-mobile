import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAppStore } from '../../store/useAppStore';

const { width } = Dimensions.get('window');

const WEEK_HIGHLIGHTS = [
  { icon: 'trophy', color: '#F5A623', text: "Aiden completed 10 tasks in a row — a new family record!" },
  { icon: 'trending-up', color: '#27AE60', text: "Savings rate hit 18.2% — highest in 3 months!" },
  { icon: 'heart', color: '#E74C3C', text: "Family Health Score improved by 4 points to 78/100." },
];

const WEEKLY_SCORES = [
  { week: 'W1', score: 68 },
  { week: 'W2', score: 72 },
  { week: 'W3', score: 74 },
  { week: 'W4', score: 78 },
];

const BUDGET_BREAKDOWN = [
  { category: 'Groceries', spent: 342, budget: 500, color: '#27AE60' },
  { category: 'Dining Out', spent: 128, budget: 150, color: '#F5A623' },
  { category: 'Transport', spent: 180, budget: 300, color: '#2980B9' },
  { category: 'Entertainment', spent: 95, budget: 100, color: '#E74C3C' },
  { category: 'Utilities', spent: 210, budget: 280, color: '#8E44AD' },
];

const MEMBER_SPOTLIGHTS = [
  { memberId: 'member-1', name: 'Sarah', highlight: 'Completed the grocery run and meal prep for the whole week', icon: '⭐', points: '+120' },
  { memberId: 'member-3', name: 'Aiden', highlight: 'Perfect homework streak — 7 days with no reminders needed!', icon: '🔥', points: '+95' },
];

const AI_RECOMMENDATIONS = [
  { icon: 'bulb', color: '#F5A623', title: 'Cut Streaming Services', desc: 'You have 4 active subscriptions. Cancel 1-2 to save ~$45/month toward Hawaii.' },
  { icon: 'car', color: '#2980B9', title: 'Schedule Car Service', desc: "Camry oil change is 3 weeks overdue. Book this week to avoid engine wear." },
  { icon: 'people', color: '#8E44AD', title: 'Family Meeting Suggested', desc: 'It\'s been 2 weeks since the last family meeting. Schedule one to align on summer plans.' },
];

export function WeeklyReportScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [weekOffset, setWeekOffset] = useState(0);
  const members = useFamilyStore((s) => s.members);
  const tasks = useFamilyStore((s) => s.tasks);
  const healthScore = useAppStore((s) => s.healthScore);
  const { monthlyIncome, monthlyExpenses } = useFinanceStore();

  const now = new Date();
  const weekStart = startOfWeek(subWeeks(now, weekOffset));
  const weekEnd = endOfWeek(subWeeks(now, weekOffset));
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const taskCompletionRate = tasks.length > 0 ? completedTasks / tasks.length : 0;
  const savingsRate = monthlyIncome > 0 ? Math.max(0, (monthlyIncome - monthlyExpenses) / monthlyIncome) : 0;

  const maxScore = Math.max(...WEEKLY_SCORES.map((s) => s.score));
  const barWidth = (width - 80) / WEEKLY_SCORES.length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0D1B2A', '#0F2952', '#1E4A8A']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Weekly Family Report</Text>
            <Text style={styles.headerSub}>
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </Text>
          </View>
          <View style={styles.weekNav}>
            <Pressable onPress={() => setWeekOffset(weekOffset + 1)} style={styles.weekBtn}>
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <Pressable onPress={() => setWeekOffset(Math.max(0, weekOffset - 1))} style={styles.weekBtn}>
              <Ionicons name="chevron-forward" size={18} color={weekOffset === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)'} />
            </Pressable>
          </View>
        </View>

        <View style={styles.scoreHero}>
          <View style={styles.scoreCenter}>
            <Text style={styles.scoreLabel}>FAMILY HEALTH SCORE</Text>
            <Text style={styles.scoreValue}>{healthScore.overall}</Text>
            <View style={styles.scoreTrend}>
              <Ionicons name="arrow-up" size={14} color="#4EECD0" />
              <Text style={styles.scoreTrendText}>+4 from last week</Text>
            </View>
          </View>
          <View style={styles.scoreStats}>
            {[
              { label: 'Tasks Done', value: `${completedTasks}`, icon: 'checkmark-circle' },
              { label: 'Pending', value: `${pendingTasks}`, icon: 'time' },
              { label: 'Savings', value: `${Math.round(savingsRate * 100)}%`, icon: 'wallet' },
              { label: 'Members', value: `${members.length}`, icon: 'people' },
            ].map((s) => (
              <View key={s.label} style={styles.scoreStat}>
                <Ionicons name={s.icon as any} size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.scoreStatValue}>{s.value}</Text>
                <Text style={styles.scoreStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {/* Score Trend Chart */}
        <Text style={styles.sectionTitle}>Health Score Trend (4 weeks)</Text>
        <Card variant="elevated" style={styles.chartCard}>
          <View style={styles.barChart}>
            {WEEKLY_SCORES.map((s, i) => (
              <View key={s.week} style={[styles.barCol, { width: barWidth }]}>
                <Text style={styles.barValue}>{s.score}</Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, {
                    height: `${(s.score / maxScore) * 100}%`,
                    backgroundColor: i === WEEKLY_SCORES.length - 1 ? colors.secondary : colors.primary,
                  }]} />
                </View>
                <Text style={styles.barLabel}>{s.week}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Highlights */}
        <Text style={styles.sectionTitle}>This Week's Highlights</Text>
        {WEEK_HIGHLIGHTS.map((h, i) => (
          <Card key={i} variant="elevated" style={styles.highlightCard}>
            <View style={styles.highlightRow}>
              <View style={[styles.highlightIcon, { backgroundColor: h.color + '20' }]}>
                <Ionicons name={h.icon as any} size={20} color={h.color} />
              </View>
              <Text style={styles.highlightText}>{h.text}</Text>
            </View>
          </Card>
        ))}

        {/* Budget Breakdown */}
        <Text style={styles.sectionTitle}>Budget This Week</Text>
        <Card variant="elevated" style={styles.budgetCard}>
          {BUDGET_BREAKDOWN.map((b) => (
            <View key={b.category} style={styles.budgetRow}>
              <View style={styles.budgetLeft}>
                <View style={[styles.budgetDot, { backgroundColor: b.color }]} />
                <Text style={styles.budgetCategory}>{b.category}</Text>
              </View>
              <View style={styles.budgetRight}>
                <Text style={styles.budgetAmount}>${b.spent}<Text style={styles.budgetTotal}>/${b.budget}</Text></Text>
                <View style={{ width: 80 }}>
                  <ProgressBar progress={b.spent / b.budget} color={b.spent / b.budget > 0.9 ? colors.danger : b.color} height={4} />
                </View>
              </View>
            </View>
          ))}
        </Card>

        {/* Task Completion */}
        <Text style={styles.sectionTitle}>Task Completion Rate</Text>
        <Card variant="elevated" style={styles.taskCard}>
          <View style={styles.taskCenter}>
            <View style={styles.taskCircle}>
              <Text style={styles.taskPct}>{Math.round(taskCompletionRate * 100)}%</Text>
              <Text style={styles.taskPctLabel}>Complete</Text>
            </View>
            <View style={styles.taskStats}>
              <View style={styles.taskStat}>
                <View style={[styles.taskStatDot, { backgroundColor: colors.success }]} />
                <Text style={styles.taskStatText}>{completedTasks} completed</Text>
              </View>
              <View style={styles.taskStat}>
                <View style={[styles.taskStatDot, { backgroundColor: colors.warning }]} />
                <Text style={styles.taskStatText}>{pendingTasks} pending</Text>
              </View>
              <View style={styles.taskStat}>
                <View style={[styles.taskStatDot, { backgroundColor: colors.danger }]} />
                <Text style={styles.taskStatText}>{tasks.filter((t) => t.status === 'overdue').length} overdue</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Member Spotlights */}
        <Text style={styles.sectionTitle}>Member Spotlights</Text>
        {MEMBER_SPOTLIGHTS.map((m) => {
          const member = members.find((mem) => mem.id === m.memberId) || { avatarColor: colors.primary };
          return (
            <Card key={m.memberId} variant="elevated" style={styles.spotCard}>
              <View style={styles.spotRow}>
                <View style={[styles.spotAvatar, { backgroundColor: (member as any).avatarColor + '30' }]}>
                  <Text style={styles.spotEmoji}>{m.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.spotHeader}>
                    <Text style={styles.spotName}>{m.name}</Text>
                    <View style={styles.spotPoints}>
                      <Ionicons name="star" size={12} color={colors.secondary} />
                      <Text style={styles.spotPtsText}>{m.points} pts</Text>
                    </View>
                  </View>
                  <Text style={styles.spotHighlight}>{m.highlight}</Text>
                </View>
              </View>
            </Card>
          );
        })}

        {/* AI Recommendations */}
        <Text style={styles.sectionTitle}>AI Recommendations for Next Week</Text>
        {AI_RECOMMENDATIONS.map((r, i) => (
          <Card key={i} variant="elevated" style={styles.recCard}>
            <View style={styles.recRow}>
              <View style={[styles.recIcon, { backgroundColor: r.color + '20' }]}>
                <Ionicons name={r.icon as any} size={18} color={r.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.recTitle}>{r.title}</Text>
                <Text style={styles.recDesc}>{r.desc}</Text>
              </View>
            </View>
          </Card>
        ))}

        <Pressable style={styles.shareBtn}>
          <Ionicons name="share-outline" size={18} color="#fff" />
          <Text style={styles.shareBtnText}>Share Weekly Report</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  back: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  weekNav: { flexDirection: 'row', gap: 4 },
  weekBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  scoreHero: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  scoreCenter: { alignItems: 'center', paddingRight: 20, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)', marginRight: 16 },
  scoreLabel: { fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 4 },
  scoreValue: { fontSize: 48, fontWeight: '800', color: '#4EECD0' },
  scoreTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  scoreTrendText: { fontSize: 11, color: '#4EECD0', fontWeight: '600' },
  scoreStats: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  scoreStat: { alignItems: 'center', width: '42%' },
  scoreStatValue: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 4 },
  scoreStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 12 },
  chartCard: { borderRadius: 16, marginBottom: 4 },
  barChart: { flexDirection: 'row', height: 120, alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 8 },
  barCol: { alignItems: 'center', gap: 4 },
  barValue: { fontSize: 11, fontWeight: '700', color: colors.text },
  barBg: { width: 28, height: 80, backgroundColor: colors.background, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 11, color: colors.textMuted },
  highlightCard: { marginBottom: 8, borderRadius: 12 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  highlightIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  highlightText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  budgetCard: { borderRadius: 16, marginBottom: 4 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  budgetLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  budgetDot: { width: 10, height: 10, borderRadius: 5 },
  budgetCategory: { fontSize: 14, color: colors.text, fontWeight: '500' },
  budgetRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  budgetAmount: { fontSize: 13, fontWeight: '700', color: colors.text },
  budgetTotal: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
  taskCard: { borderRadius: 16, marginBottom: 4 },
  taskCenter: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  taskCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  taskPct: { fontSize: 24, fontWeight: '800', color: '#fff' },
  taskPctLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  taskStats: { flex: 1, gap: 10 },
  taskStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskStatDot: { width: 8, height: 8, borderRadius: 4 },
  taskStatText: { fontSize: 14, color: colors.text },
  spotCard: { marginBottom: 10, borderRadius: 14 },
  spotRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  spotAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  spotEmoji: { fontSize: 22 },
  spotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  spotName: { fontSize: 16, fontWeight: '700', color: colors.text },
  spotPoints: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3E2', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  spotPtsText: { fontSize: 12, fontWeight: '700', color: colors.secondary },
  spotHighlight: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  recCard: { marginBottom: 10, borderRadius: 14 },
  recRow: { flexDirection: 'row', alignItems: 'flex-start' },
  recIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  recDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, marginTop: 12 },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
