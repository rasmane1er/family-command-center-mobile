import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Avatar } from '../../components/common/Avatar';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAIStore } from '../../store/useAIStore';
import { useHabitsStore } from '../../store/useHabitsStore';
import { useFinancialHealth } from '../../hooks/useFinancialHealth';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export function WeeklyReportScreen({ navigation: navProp }: any) {
  const navHook = useNavigation<any>();
  const navigation = navProp ?? navHook;
  const { t } = useTranslation('dashboard');
  const insets = useSafeAreaInsets();
  const [weekOffset, setWeekOffset] = useState(0);

  const members = useFamilyStore((s) => s.members);
  const tasks = useFamilyStore((s) => s.tasks);
  const healthScore = useFinancialHealth();
  const { budgets, bills, monthlyIncome, monthlyExpenses } = useFinanceStore();
  const insights = useAIStore((s) => s.insights);
  const { habits, isCompletedToday } = useHabitsStore();

  const now = new Date();
  const weekStart = startOfWeek(subWeeks(now, weekOffset));
  const weekEnd = endOfWeek(subWeeks(now, weekOffset));

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const overdueTasks = tasks.filter((t) => t.status === 'overdue').length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const savingsRate = monthlyIncome > 0 ? Math.max(0, (monthlyIncome - monthlyExpenses) / monthlyIncome) : 0;

  const overdueBills = bills.filter((b) => b.status === 'overdue').length;
  const dueSoonBills = bills.filter((b) => b.status === 'due_soon').length;

  const memberPerformance = useMemo(() =>
    members.map((m) => {
      const memberTasks = tasks.filter((t) => t.assignedTo?.includes(m.id));
      const done = memberTasks.filter((t) => t.status === 'completed').length;
      return { member: m, done, total: memberTasks.length };
    }).sort((a, b) => b.done - a.done),
    [members, tasks]
  );

  const topPerformer = memberPerformance[0];

  const aiRecs = insights.filter((i) => i.type === 'tip' || i.type === 'goal').slice(0, 3);
  const financialInsights = insights.filter((i) => i.type === 'financial').slice(0, 2);

  const WEEKLY_SCORES = [
    { week: 'W1', score: Math.max(40, healthScore.overall - 10) },
    { week: 'W2', score: Math.max(40, healthScore.overall - 6) },
    { week: 'W3', score: Math.max(40, healthScore.overall - 3) },
    { week: 'W4', score: healthScore.overall },
  ];
  const maxScore = Math.max(...WEEKLY_SCORES.map((s) => s.score));
  const barWidth = (width - 80) / WEEKLY_SCORES.length;

  const budgetHighlights = budgets
    .map((b) => ({ ...b, pct: b.monthlyLimit > 0 ? b.spent / b.monthlyLimit : 0 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const screenHeader = (
    <LinearGradient colors={['#0D1B2A', '#0F2952', '#1E4A8A']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('dashboard.screens.weeklyReport.headerTitle')}</Text>
          <Text style={styles.headerSub}>
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </Text>
        </View>
        <View style={styles.weekNav}>
          <Pressable accessibilityRole="button" onPress={() => setWeekOffset(weekOffset + 1)} style={styles.weekBtn}>
            <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setWeekOffset(Math.max(0, weekOffset - 1))} style={styles.weekBtn}>
            <Ionicons name="chevron-forward" size={18} color={weekOffset === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)'} />
          </Pressable>
        </View>
      </View>

      <View style={styles.scoreHero}>
        <View style={styles.scoreCenter}>
          <Text style={styles.scoreLabel}>{t('weeklyReport.familyScore')}</Text>
          <Text style={styles.scoreValue}>{healthScore.overall}</Text>
          <View style={styles.scoreTrend}>
            <Ionicons name="arrow-up" size={14} color="#4EECD0" />
            <Text style={styles.scoreTrendText}>{t('dashboard.screens.weeklyReport.scoreTrend', { points: Math.max(1, Math.round(healthScore.overall * 0.05)) })}</Text>
          </View>
        </View>
        <View style={styles.scoreStats}>
          {[
            { label: t('dashboard.screens.weeklyReport.scoreStatTasksDone'), value: `${completedTasks}`, icon: 'checkmark-circle' },
            { label: t('dashboard.screens.weeklyReport.scoreStatPending'), value: `${pendingTasks}`, icon: 'time' },
            { label: t('dashboard.screens.weeklyReport.scoreStatSavings'), value: `${Math.round(savingsRate * 100)}%`, icon: 'wallet' },
            { label: t('dashboard.screens.weeklyReport.scoreStatMembers'), value: `${members.length}`, icon: 'people' },
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
  );

  const screenCompact = (
    <LinearGradient
      colors={['#0D1B2A', '#1E4A8A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        paddingTop: insets.top,
        paddingBottom: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', flex: 1 }}>Weekly Report</Text>
      <View style={{ backgroundColor: '#4EECD0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ color: '#0D1B2A', fontSize: 12, fontWeight: '800' }}>{healthScore.overall}</Text>
      </View>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
          >
        {/* Score Trend Chart */}
        <Text style={styles.sectionTitle}>Health Score Trend</Text>
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

        {/* Financial Alerts */}
        {(overdueBills > 0 || dueSoonBills > 0) && (
          <>
            <Text style={styles.sectionTitle}>{t('weeklyReport.financialAlerts')}</Text>
            {overdueBills > 0 && (
              <Card variant="elevated" style={{ ...styles.alertCard, borderLeftColor: colors.danger }}>
                <View style={styles.alertRow}>
                  <View style={[styles.alertIcon, { backgroundColor: colors.dangerLight }]}>
                    <Ionicons name="warning" size={20} color={colors.danger} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.alertTitle}>{overdueBills} Overdue {overdueBills === 1 ? 'Bill' : 'Bills'}</Text>
                    <Text style={styles.alertDesc}>
                      {bills.filter((b) => b.status === 'overdue').map((b) => b.name).join(', ')} — pay now to avoid fees
                    </Text>
                  </View>
                </View>
              </Card>
            )}
            {dueSoonBills > 0 && (
              <Card variant="elevated" style={{ ...styles.alertCard, borderLeftColor: colors.warning }}>
                <View style={styles.alertRow}>
                  <View style={[styles.alertIcon, { backgroundColor: colors.warningLight }]}>
                    <Ionicons name="time" size={20} color={colors.warning} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.alertTitle}>{dueSoonBills} Bills Due Soon</Text>
                    <Text style={styles.alertDesc}>
                      {bills.filter((b) => b.status === 'due_soon').map((b) => b.name).join(', ')}
                    </Text>
                  </View>
                </View>
              </Card>
            )}
          </>
        )}

        {/* Budget Breakdown from real store */}
        <Text style={styles.sectionTitle}>{t('weeklyReport.budgetPeriod')}</Text>
        <Card variant="elevated" style={styles.budgetCard}>
          {budgetHighlights.map((b) => (
            <View key={b.id} style={styles.budgetRow}>
              <View style={styles.budgetLeft}>
                <View style={[styles.budgetDot, { backgroundColor: b.color }]} />
                <Text style={styles.budgetCategory}>{b.category}</Text>
              </View>
              <View style={styles.budgetRight}>
                <Text style={styles.budgetAmount}>
                  ${b.spent.toFixed(0)}<Text style={styles.budgetTotal}>/${b.monthlyLimit}</Text>
                </Text>
                <View style={{ width: 80 }}>
                  <ProgressBar
                    progress={Math.min(1, b.pct)}
                    color={b.pct > 1 ? colors.danger : b.pct > 0.9 ? colors.warning : b.color}
                    height={4}
                  />
                </View>
              </View>
            </View>
          ))}
          {budgetHighlights.length === 0 && (
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 8 }}>No budget data — load demo data in Settings</Text>
          )}
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
                <Text style={styles.taskStatText}>{overdueTasks} overdue</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Member Performance */}
        <Text style={styles.sectionTitle}>Member Performance</Text>
        {memberPerformance.map(({ member, done, total }, idx) => (
          <Card key={member.id} variant="elevated" style={styles.memberCard}>
            <View style={styles.memberRow}>
              <View style={styles.memberRank}>
                <Text style={styles.rankNum}>#{idx + 1}</Text>
              </View>
              <Avatar name={member.name} color={member.avatarColor} size={40} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberSub}>{done}/{total} tasks completed</Text>
                <ProgressBar
                  progress={total > 0 ? done / total : 0}
                  color={member.avatarColor}
                  height={5}
                  style={{ marginTop: 6 }}
                />
              </View>
              {idx === 0 && <Text style={styles.starEmoji}>⭐</Text>}
            </View>
          </Card>
        ))}

        {/* AI Insights from real store */}
        {aiRecs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('weeklyReport.aiRecommendations')}</Text>
            {aiRecs.map((insight, i) => (
              <Card key={insight.id} variant="elevated" style={styles.recCard}>
                <View style={styles.recRow}>
                  <View style={[styles.recIcon, {
                    backgroundColor: insight.priority === 'high' ? colors.dangerLight : insight.priority === 'medium' ? colors.warningLight : '#E8EEF9',
                  }]}>
                    <Ionicons
                      name={insight.type === 'financial' ? 'wallet' : insight.type === 'alert' ? 'warning' : 'bulb'}
                      size={18}
                      color={insight.priority === 'high' ? colors.danger : insight.priority === 'medium' ? colors.warning : colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.recTitle}>{insight.title}</Text>
                    <Text style={styles.recDesc}>{insight.summary}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Sub-scores breakdown */}
        <Text style={styles.sectionTitle}>Score Breakdown</Text>
        <Card variant="elevated" style={styles.subScoreCard}>
          {[
            { label: 'Finance', value: healthScore.financial, icon: 'wallet', color: '#27AE60' },
            { label: 'Tasks', value: healthScore.tasks, icon: 'checkmark-circle', color: '#2980B9' },
            { label: 'Goals', value: healthScore.goals, icon: 'flag', color: '#E67E22' },
            { label: 'Wellness', value: healthScore.health, icon: 'heart', color: '#E91E63' },
          ].map((item, i, arr) => (
            <View key={item.label} style={[styles.subScoreRow, i < arr.length - 1 && styles.subScoreBorder]}>
              <View style={[styles.subScoreIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.subScoreHeader}>
                  <Text style={styles.subScoreLabel}>{item.label}</Text>
                  <Text style={[styles.subScoreVal, { color: item.value >= 80 ? colors.success : item.value >= 60 ? colors.warning : colors.danger }]}>
                    {item.value}/100
                  </Text>
                </View>
                <ProgressBar
                  progress={item.value / 100}
                  color={item.value >= 80 ? colors.success : item.value >= 60 ? colors.warning : colors.danger}
                  height={6}
                  style={{ marginTop: 6 }}
                />
              </View>
            </View>
          ))}
        </Card>

        <Pressable accessibilityRole="button"
          onPress={() => Alert.alert('Share Weekly Report', `Family Health Score: ${healthScore.overall}/100\nTasks Completed: ${completedTasks}\nSavings Rate: ${Math.round(savingsRate * 100)}%\n\nShare this week's family report with members?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Share', onPress: () => Alert.alert('Shared!', 'Weekly report has been shared with your family.') },
          ])}
          style={styles.shareBtn}
        >
          <Ionicons name="share-outline" size={18} color="#fff" />
          <Text style={styles.shareBtnText}>Share Weekly Report</Text>
        </Pressable>
          </ScrollView>
        )}
      </CollapsibleHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
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
  alertCard: { marginBottom: 8, borderRadius: 12, borderLeftWidth: 4 },
  alertRow: { flexDirection: 'row', alignItems: 'center' },
  alertIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3 },
  alertDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
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
  taskPct: { fontSize: 20, fontWeight: '800', color: '#fff' },
  taskPctLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  taskStats: { flex: 1, gap: 10 },
  taskStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskStatDot: { width: 8, height: 8, borderRadius: 4 },
  taskStatText: { fontSize: 14, color: colors.text },
  memberCard: { marginBottom: 10, borderRadius: 14 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberRank: { width: 28, alignItems: 'center' },
  rankNum: { fontSize: 14, fontWeight: '800', color: colors.textMuted },
  memberName: { fontSize: 15, fontWeight: '700', color: colors.text },
  memberSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  starEmoji: { fontSize: 18 },
  recCard: { marginBottom: 10, borderRadius: 14 },
  recRow: { flexDirection: 'row', alignItems: 'flex-start' },
  recIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  recDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  subScoreCard: { borderRadius: 16, marginBottom: 4 },
  subScoreRow: { paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  subScoreBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  subScoreIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  subScoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subScoreLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  subScoreVal: { fontSize: 14, fontWeight: '800' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, marginTop: 12 },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
