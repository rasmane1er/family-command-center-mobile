import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Badge } from '../../components/common/Badge';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAIStore } from '../../store/useAIStore';
import { useAutomationStore } from '../../store/useAutomationStore';
import { useWealthStore } from '../../store/useWealthStore';

const { width } = Dimensions.get('window');

const WIDGET_COLORS = {
  tasks: '#2980B9',
  finance: '#27AE60',
  calendar: '#E74C3C',
  health: '#E91E63',
  weather: '#F5A623',
  ai: '#8E44AD',
};

export function CommandWallScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const family = useFamilyStore((s) => s.family);
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
const activeMember = members.find((m) => m.id === activeMemberId);

const isParent =
  activeMember?.role === 'parent' ||
  activeMember?.role === 'guardian';

const isChild = activeMember?.role === 'child';
const isGrandparent = activeMember?.role === 'grandparent';
  const tasks = useFamilyStore((s) => s.tasks);
  const events = useFamilyStore((s) => s.events);
  const bills = useFinanceStore((s) => s.bills);
  const insights = useAIStore((s) => s.insights);
  const { rules, listings, conflicts } = useAutomationStore();
  const { reputationScores, getTotalNetWorth, seedDemoData: seedWealth } = useWealthStore();

  if (reputationScores.length === 0) seedWealth();

  const today = new Date();
  const visibleTasks =
  isChild && activeMember
    ? tasks.filter((task) => task.assignedTo?.includes(activeMember.id))
    : tasks;

const pendingTasks = visibleTasks.filter((t) => t.status === 'pending').length;
  const overdueTasks = tasks.filter((t) => t.status === 'overdue').length;
  const upcomingBills = bills.filter((b) => b.status === 'upcoming' || b.status === 'due_soon').length;
  const visibleEvents =
  isChild && activeMember
    ? events.filter((event) => event.attendees?.includes(activeMember.id))
    : events;

const todayEvents = visibleEvents.filter(
  (e) => new Date(e.startDate).toDateString() === today.toDateString()
);
  const topInsight = insights.filter((i) => !i.isRead)[0];
  const openConflicts = conflicts.filter((c) => c.status !== 'resolved').length;
  const activeAutomations = rules.filter((r) => r.isActive).length;
  const netWorth = getTotalNetWorth();
  const availableListings = listings.filter((l) => l.isAvailable).length;

  const topMember = [...reputationScores].sort((a, b) => b.overall - a.overall)[0];
  const topMemberInfo = members.find((m) => m.id === topMember?.memberId);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0D1B2A', '#0F2952', '#1E4A8A']} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Command Wall</Text>
            <Text style={styles.headerSub}>{format(today, 'EEEE, MMMM d')}</Text>
          </View>
          <View style={styles.aiDot}>
            <Ionicons name="sparkles" size={14} color={colors.secondary} />
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        {/* AI Briefing Banner */}
        {topInsight && (
          <LinearGradient colors={[colors.primary + 'CC', colors.primary]} style={styles.briefingBanner}>
            <Ionicons name="sparkles" size={18} color={colors.secondary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.briefingTitle}>{topInsight.title}</Text>
              <Text style={styles.briefingText} numberOfLines={2}>{topInsight.summary}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        )}

        {/* Quick Stats Row */}
        <View style={styles.quickStats}>
          <View style={styles.qStat}>
            <Ionicons name="checkbox-outline" size={18} color={WIDGET_COLORS.tasks} />
            <Text style={[styles.qStatVal, { color: WIDGET_COLORS.tasks }]}>{pendingTasks}</Text>
            <Text style={styles.qStatLabel}>Tasks</Text>
          </View>
          <View style={styles.qStat}>
            <Ionicons name="calendar-outline" size={18} color={WIDGET_COLORS.calendar} />
            <Text style={[styles.qStatVal, { color: WIDGET_COLORS.calendar }]}>{todayEvents.length}</Text>
            <Text style={styles.qStatLabel}>Events</Text>
          </View>
          <View style={styles.qStat}>
            <Ionicons name="receipt-outline" size={18} color={WIDGET_COLORS.finance} />
            <Text style={[styles.qStatVal, { color: WIDGET_COLORS.finance }]}>{upcomingBills}</Text>
            <Text style={styles.qStatLabel}>Bills</Text>
          </View>
          <View style={styles.qStat}>
            <Ionicons name="flash-outline" size={18} color={WIDGET_COLORS.ai} />
            <Text style={[styles.qStatVal, { color: WIDGET_COLORS.ai }]}>{activeAutomations}</Text>
            <Text style={styles.qStatLabel}>Automations</Text>
          </View>
        </View>

        {/* Member Status Grid */}
        <Text style={styles.sectionTitle}>Family Status</Text>
        <View style={styles.memberGrid}>
          {members.map((m) => {
            const score = reputationScores.find((s) => s.memberId === m.id);
            return (
              <Card key={m.id} style={styles.memberWidget} variant="elevated">
                <View style={[styles.memberAvatar, { backgroundColor: m.avatarColor + '20' }]}>
                  <Text style={[styles.memberInitial, { color: m.avatarColor }]}>{m.name.charAt(0)}</Text>
                </View>
                <Text style={styles.memberName}>{m.name.split(' ')[0]}</Text>
                <View style={[styles.statusDot, { backgroundColor: m.status === 'active' ? colors.success : m.status === 'work' || m.status === 'school' ? colors.warning : colors.textMuted }]} />
                <Text style={styles.memberStatus}>{m.status}</Text>
                {score && <Text style={styles.memberScore}>{score.overall} pts</Text>}
              </Card>
            );
          })}
        </View>

        {/* Today's Events */}
        {todayEvents.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {todayEvents.slice(0, 3).map((e) => (
              <Card key={e.id} style={styles.eventCard} variant="elevated">
                <View style={[styles.eventDot, { backgroundColor: e.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{e.title}</Text>
                  <Text style={styles.eventTime}>{format(new Date(e.startDate), 'h:mm a')} {e.location ? `• ${e.location}` : ''}</Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Widgets Grid */}
        <Text style={styles.sectionTitle}>Live Widgets</Text>
        <View style={styles.widgetsGrid}>
          <Pressable onPress={() => navigation.navigate('Finance')} style={[styles.widget, styles.widgetLarge, { backgroundColor: WIDGET_COLORS.finance + '12' }]}>
            <Ionicons name="trending-up" size={22} color={WIDGET_COLORS.finance} />
            <Text style={[styles.widgetVal, { color: WIDGET_COLORS.finance }]}>${netWorth > 0 ? (netWorth / 1000).toFixed(0) + 'k' : '0'}</Text>
            <Text style={styles.widgetLabel}>Net Worth</Text>
          </Pressable>

          <View style={[styles.widget, { backgroundColor: WIDGET_COLORS.tasks + '12' }]}>
            <Ionicons name="warning" size={20} color={overdueTasks > 0 ? colors.danger : WIDGET_COLORS.tasks} />
            <Text style={[styles.widgetVal, { color: overdueTasks > 0 ? colors.danger : WIDGET_COLORS.tasks }]}>{overdueTasks}</Text>
            <Text style={styles.widgetLabel}>Overdue</Text>
          </View>

          <View style={[styles.widget, { backgroundColor: '#E74C3C12' }]}>
            <Ionicons name="alert-circle" size={20} color={openConflicts > 0 ? colors.danger : colors.success} />
            <Text style={[styles.widgetVal, { color: openConflicts > 0 ? colors.danger : colors.success }]}>{openConflicts}</Text>
            <Text style={styles.widgetLabel}>Conflicts</Text>
          </View>

          <View style={[styles.widget, { backgroundColor: colors.secondary + '12' }]}>
            <Ionicons name="storefront" size={20} color={colors.secondary} />
            <Text style={[styles.widgetVal, { color: colors.secondary }]}>{availableListings}</Text>
            <Text style={styles.widgetLabel}>Marketplace</Text>
          </View>
        </View>

        {/* Top Performer */}
        {topMemberInfo && topMember && (
          <>
            <Text style={styles.sectionTitle}>This Week's Star</Text>
            <Card style={styles.starCard} variant="elevated">
              <LinearGradient colors={[colors.secondary + '20', colors.secondary + '05']} style={styles.starGradient}>
                <Text style={styles.starEmoji}>🏆</Text>
                <View style={[styles.starAvatar, { backgroundColor: topMemberInfo.avatarColor + '20' }]}>
                  <Text style={[styles.starInitial, { color: topMemberInfo.avatarColor }]}>{topMemberInfo.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.starName}>{topMemberInfo.name}</Text>
                  <Text style={styles.starScore}>{topMember.overall} reputation score • {topMember.weeklyPoints} points this week</Text>
                </View>
              </LinearGradient>
            </Card>
          </>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {
  (
    isChild
      ? [
          { label: 'My Homework', icon: 'school', color: '#2980B9', tab: 'Family', screen: 'HomeworkTracker' },
          { label: 'My Rewards', icon: 'trophy', color: '#F5A623', tab: 'Operations', screen: 'Rewards' },
          { label: 'My Tasks', icon: 'checkbox', color: '#27AE60', tab: 'Family', screen: 'Tasks' },
          { label: 'Family Board', icon: 'people', color: '#8E44AD', tab: 'Family', screen: 'FamilyBoard' },
        ]
      : isGrandparent
        ? [
            { label: 'Birthdays', icon: 'gift', color: '#E91E63', tab: 'Family', screen: 'BirthdayTracker' },
            { label: 'Timeline', icon: 'time', color: '#2980B9', tab: 'Family', screen: 'FamilyTimeline' },
            { label: 'Family Board', icon: 'people', color: '#8E44AD', tab: 'Family', screen: 'FamilyBoard' },
            { label: 'Events', icon: 'calendar', color: '#27AE60', tab: 'Family', screen: 'Calendar' },
          ]
        : [
            { label: 'AI Assistant', icon: 'sparkles', color: '#8E44AD', tab: 'AI Assistant', screen: null },
            { label: 'Add Task', icon: 'add-circle', color: '#2980B9', tab: 'Family', screen: null },
            { label: 'View Budget', icon: 'wallet', color: '#27AE60', tab: 'Finance', screen: null },
            { label: 'Emergency', icon: 'alert-circle', color: '#E74C3C', tab: 'Operations', screen: 'Emergency' },
          ]
         ).map((action, i) => (
            <Pressable key={i} onPress={() =>
  navigation.navigate(
    action.tab,
    action.screen
      ? { screen: action.screen, params: { memberId: activeMember?.id, role: activeMember?.role } }
      : undefined,
  )
} style={[styles.actionBtn, { backgroundColor: action.color + '15' }]}>
              <Ionicons name={action.icon as any} size={24} color={action.color} />
              <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  back: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  aiDot: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  briefingBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 16 },
  briefingTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 },
  briefingText: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  quickStats: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16, justifyContent: 'space-around', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  qStat: { alignItems: 'center', gap: 4 },
  qStatVal: { fontSize: 22, fontWeight: '800' },
  qStatLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  memberGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  memberWidget: { width: (width - 52) / 4, borderRadius: 12, alignItems: 'center', padding: 10, gap: 4 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontSize: 15, fontWeight: '800' },
  memberName: { fontSize: 10, fontWeight: '700', color: colors.text },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  memberStatus: { fontSize: 9, color: colors.textMuted },
  memberScore: { fontSize: 10, fontWeight: '700', color: colors.secondary },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, borderRadius: 12 },
  eventDot: { width: 10, height: 10, borderRadius: 5 },
  eventTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  eventTime: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  widgetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  widget: { width: (width - 52) / 2, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  widgetLarge: { width: (width - 52) / 2 },
  widgetVal: { fontSize: 28, fontWeight: '900' },
  widgetLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  starCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  starGradient: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  starEmoji: { fontSize: 28 },
  starAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  starInitial: { fontSize: 18, fontWeight: '800' },
  starName: { fontSize: 15, fontWeight: '700', color: colors.text },
  starScore: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { width: (width - 52) / 2, borderRadius: 14, padding: 16, alignItems: 'center', gap: 8 },
  actionLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
