import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';

import { useJoinRequestsStore } from '../../store/useJoinRequestsStore';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useAIStore } from '../../store/useAIStore';
import { useAppStore } from '../../store/useAppStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useNotificationsStore } from '../../store/useNotificationsStore';
import { useGuardianStore } from '../../store/useGuardianStore';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { getVisibleTasks, getVisibleEvents } from '../../utils/roleVisibility';
import { getAllowedNotificationTypes } from '../../utils/roleFilters';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const SCORE_COLOR = (score: number) =>
  score >= 80 ? colors.success : score >= 60 ? colors.warning : colors.danger;

const PRIORITY_CONFIG = {
  urgent: { color: '#E74C3C', bg: '#FDEDEC', label: 'Urgent' },
  high:   { color: '#E67E22', bg: '#FEF0E7', label: 'High' },
  medium: { color: '#F39C12', bg: '#FEF9E7', label: 'Medium' },
  low:    { color: '#27AE60', bg: '#D5F5E3', label: 'Low' },
};

function useFadeSlide(delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY, delay]);
  return { opacity, transform: [{ translateY }] };
}

export function DashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const family   = useFamilyStore((s) => s.family);
  const members  = useFamilyStore((s) => s.members);
  const tasks    = useFamilyStore((s) => s.tasks);
  const events   = useFamilyStore((s) => s.events);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const activeMember   = members.find((m) => m.id === activeMemberId);

  const isParent     = activeMember?.role === 'parent' || activeMember?.role === 'guardian' || activeMember?.isAdmin === true;
  const isChild      = activeMember?.role === 'child';
  const isGrandparent = activeMember?.role === 'grandparent';

  const healthScore = useAppStore((s) => s.healthScore);
  const { monthlyIncome, monthlyExpenses, monthlySavings, bills } = useFinanceStore();
  const insights      = useAIStore((s) => s.insights);
  const notifications = useNotificationsStore((s) => s.notifications);
  const seedNotifications = useNotificationsStore((s) => s.seedDemoData);
  const joinRequests  = useJoinRequestsStore((s) => s.requests);
  const sosAlerts     = useGuardianStore((s) => s.sosAlerts);
  const guardianDevices = useGuardianStore((s) => s.devices);

  const pendingJoinRequestsCount = joinRequests.filter((r) => r.status === 'pending').length;
  const activeSOS = sosAlerts.filter((a) => !a.isResolved);
  const pairedDevices = guardianDevices.filter((d) => d.isPaired);

  useEffect(() => {
    if (notifications.length === 0) seedNotifications();
  }, [notifications.length, seedNotifications]);

  const visibleTasks  = getVisibleTasks(tasks, activeMember);
  const visibleEvents = getVisibleEvents(events, activeMember);

  const pendingTasks   = visibleTasks.filter((t) => t.status === 'pending').length;
  const overdueTasks   = visibleTasks.filter((t) => t.status === 'overdue').length;
  const overdueBills   = bills.filter((b) => b.status === 'overdue').length;
  const dueSoonBills   = bills.filter((b) => b.status === 'due_soon').length;

  const todayEvents = visibleEvents.filter((e) => {
    const d = new Date(e.startDate);
    return d.toDateString() === new Date().toDateString();
  });

  const allowedTypes = getAllowedNotificationTypes(activeMember?.role);
  const visibleNotifications = notifications.filter((n) => allowedTypes.includes(n.type));
  const unreadCount = visibleNotifications.filter((n) => !n.isRead).length + (isParent ? pendingJoinRequestsCount : 0);

  const roleLabel = activeMember
    ? activeMember.role.charAt(0).toUpperCase() + activeMember.role.slice(1)
    : 'Family';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 5)  return { text: 'Good night',    emoji: '🌙' };
    if (h < 12) return { text: 'Good morning',  emoji: '☀️' };
    if (h < 17) return { text: 'Good afternoon', emoji: '👋' };
    return           { text: 'Good evening',    emoji: '🌆' };
  };
  const greet = greeting();

  // Focus card: most important thing right now
  const focusTask = visibleTasks.find((t) => t.priority === 'urgent' && t.status === 'pending')
    || visibleTasks.find((t) => t.priority === 'high' && t.status === 'pending');
  const focusEvent = todayEvents[0];

  const quickStats = useMemo(() => {
    if (isChild) return [
      { icon: 'school',         label: 'Homework',   value: `${pendingTasks}`, sub: 'pending',    color: '#4ECDC4', grad: ['#E8F8F7','#D0F4F1'] as const, urgent: pendingTasks > 3 },
      { icon: 'trophy',         label: 'Points',     value: `${activeMember?.points?.toLocaleString() ?? 0}`, sub: 'earned', color: '#F5A623', grad: ['#FEF3E2','#FDE8C0'] as const, urgent: false },
      { icon: 'calendar',       label: 'Events',     value: `${todayEvents.length}`, sub: 'today',    color: '#2980B9', grad: ['#EBF5FB','#D6EAF8'] as const, urgent: false },
      { icon: 'star',           label: 'Level',      value: `${activeMember?.level ?? 1}`,   sub: 'current',  color: '#8E44AD', grad: ['#F5EEF8','#E8DAEF'] as const, urgent: false },
    ];

    if (isGrandparent) return [
      { icon: 'gift',           label: 'Birthdays',  value: `${todayEvents.length}`, sub: 'upcoming',  color: '#AD1457', grad: ['#FCE4EC','#F8BBD0'] as const, urgent: false },
      { icon: 'calendar',       label: 'Events',     value: `${todayEvents.length}`, sub: 'today',    color: '#F5A623', grad: ['#FEF3E2','#FDE8C0'] as const, urgent: false },
      { icon: 'people',         label: 'Members',    value: `${members.length}`,     sub: 'in family', color: '#2980B9', grad: ['#EBF5FB','#D6EAF8'] as const, urgent: false },
      { icon: 'heart',          label: 'Health',     value: `${healthScore.overall}`, sub: '/ 100',   color: SCORE_COLOR(healthScore.overall), grad: ['#E8EEF9','#D5E2F5'] as const, urgent: false },
    ];

    return [
      { icon: 'checkbox',       label: 'Tasks',      value: `${pendingTasks}`, sub: overdueTasks > 0 ? `${overdueTasks} overdue` : 'pending', color: '#4ECDC4', grad: ['#E8F8F7','#D0F4F1'] as const, urgent: overdueTasks > 0 },
      { icon: 'calendar',       label: 'Today',      value: `${todayEvents.length}`, sub: 'events',   color: '#F5A623', grad: ['#FEF3E2','#FDE8C0'] as const, urgent: false },
      { icon: 'receipt',        label: 'Bills',      value: overdueBills > 0 ? `${overdueBills}` : dueSoonBills > 0 ? `${dueSoonBills}` : '✓', sub: overdueBills > 0 ? 'overdue!' : dueSoonBills > 0 ? 'due soon' : 'on track', color: overdueBills > 0 ? colors.danger : dueSoonBills > 0 ? colors.warning : colors.success, grad: overdueBills > 0 ? ['#FDEDEC','#FADBD8'] as const : ['#D5F5E3','#ABEBC6'] as const, urgent: overdueBills > 0 },
      { icon: 'trending-up',    label: 'Saved',      value: `$${Math.max(0, monthlySavings).toFixed(0)}`, sub: 'this month', color: '#27AE60', grad: ['#D5F5E3','#ABEBC6'] as const, urgent: false },
    ];
  }, [isChild, isGrandparent, activeMember, pendingTasks, overdueTasks, todayEvents.length, members.length, healthScore.overall, overdueBills, dueSoonBills, monthlySavings]);

  const shortcuts = useMemo(() => {
    if (isChild) return [
      { label: 'My Tasks',    icon: 'checkbox-outline',  color: '#4ECDC4', bg: '#E8F8F7', route: 'Family',     screen: 'Tasks' },
      { label: 'Rewards',     icon: 'trophy-outline',    color: '#F5A623', bg: '#FEF3E2', route: 'Operations', screen: 'Rewards' },
      { label: 'Homework',    icon: 'school-outline',    color: '#2980B9', bg: '#EBF5FB', route: 'Family',     screen: 'HomeworkTracker' },
      { label: 'Calendar',    icon: 'calendar-outline',  color: '#8E44AD', bg: '#F5EEF8', route: 'Family',     screen: 'Calendar' },
    ];
    if (isGrandparent) return [
      { label: 'Birthdays',   icon: 'gift-outline',      color: '#AD1457', bg: '#FCE4EC', route: 'Family',  screen: 'BirthdayTracker' },
      { label: 'Timeline',    icon: 'time-outline',      color: '#2980B9', bg: '#EBF5FB', route: 'Family',  screen: 'FamilyTimeline' },
      { label: 'Board',       icon: 'megaphone-outline', color: '#F5A623', bg: '#FEF3E2', route: 'Family',  screen: 'FamilyBoard' },
      { label: 'Calendar',    icon: 'calendar-outline',  color: '#27AE60', bg: '#D5F5E3', route: 'Family',  screen: 'Calendar' },
    ];
    return [
      { label: `Approvals${pendingJoinRequestsCount > 0 ? ` (${pendingJoinRequestsCount})` : ''}`, icon: 'person-add-outline', color: '#E74C3C', bg: '#FDEDEC', route: 'Family', screen: 'JoinRequests' },
      { label: 'Finance',     icon: 'wallet-outline',    color: '#27AE60', bg: '#D5F5E3', route: 'Finance',    screen: null },
      { label: `Tasks${pendingTasks > 0 ? ` (${pendingTasks})` : ''}`, icon: 'checkbox-outline', color: '#4ECDC4', bg: '#E8F8F7', route: 'Family', screen: 'Tasks' },
      { label: 'Guardian',    icon: 'shield-checkmark-outline', color: '#8E44AD', bg: '#F5EEF8', route: 'Family', screen: 'GuardianDashboard' },
    ];
  }, [isChild, isGrandparent, pendingJoinRequestsCount, pendingTasks]);

  const navigate = (route: string, screen: string | null) => {
    if (!screen) { navigation.navigate(route); return; }
    navigation.navigate(route, { screen });
  };

  const anim0 = useFadeSlide(0);
  const anim1 = useFadeSlide(100);
  const anim2 = useFadeSlide(180);
  const anim3 = useFadeSlide(260);
  const anim4 = useFadeSlide(340);
  const anim5 = useFadeSlide(420);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── HEADER ────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#0A1628', '#0F2952', '#1A3F7A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          {/* Decorative orbs */}
          <View style={styles.orb1} />
          <View style={styles.orb2} />
          <View style={styles.orb3} />

          <Animated.View style={anim0}>
            {/* Top bar */}
            <View style={styles.topBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greetText}>{greet.emoji} {greet.text},</Text>
                <Text style={styles.familyTitle} numberOfLines={1}>
                  {family?.name ?? 'My Family'}
                </Text>
                <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>
              </View>

              <View style={styles.headerBtns}>
                <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('Search')}>
                  <Ionicons name="search" size={19} color="rgba(255,255,255,0.85)" />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
                  <Ionicons name="notifications" size={20} color="#fff" />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
                  <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.85)" />
                </Pressable>
              </View>
            </View>

            {/* Active profile pill */}
            {activeMember && (
              <Pressable
                style={styles.profilePill}
                onPress={() => navigation.navigate('Family', { screen: 'ProfileSwitcher' })}
              >
                <Avatar name={activeMember.name} color={activeMember.avatarColor} size={26} />
                <Text style={styles.profilePillName}>{activeMember.name}</Text>
                <View style={styles.profilePillRole}>
                  <Text style={styles.profilePillRoleText}>{roleLabel}</Text>
                </View>
                <Ionicons name="swap-horizontal" size={13} color="rgba(255,255,255,0.6)" style={{ marginLeft: 4 }} />
              </Pressable>
            )}

            {/* SOS Alert Banner */}
            {activeSOS.length > 0 && (
              <Pressable
                style={styles.sosBanner}
                onPress={() => navigation.navigate('Family', { screen: 'SOSAlerts' })}
              >
                <View style={styles.sosPulse} />
                <Ionicons name="warning" size={18} color="#fff" />
                <Text style={styles.sosText}>
                  🚨 {activeSOS.length} active SOS alert{activeSOS.length > 1 ? 's' : ''} — tap to respond
                </Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}

            {/* Health Score Card */}
            <View style={styles.healthCard}>
              <View style={styles.healthLeft}>
                <Text style={styles.healthLabel}>FAMILY HEALTH</Text>
                <Text style={[styles.healthScore, { color: SCORE_COLOR(healthScore.overall) }]}>
                  {healthScore.overall}
                  <Text style={styles.healthMax}>/100</Text>
                </Text>
                <View style={styles.healthTrend}>
                  <Ionicons name="trending-up" size={13} color={colors.success} />
                  <Text style={styles.healthTrendText}>+4 this week</Text>
                </View>
              </View>
              <View style={styles.healthDivider} />
              <View style={styles.healthRight}>
                {[
                  { label: 'Finance',   value: healthScore.financial, icon: 'wallet-outline' },
                  { label: 'Tasks',     value: healthScore.tasks,     icon: 'checkmark-circle-outline' },
                  { label: 'Goals',     value: healthScore.goals,     icon: 'flag-outline' },
                  { label: 'Wellness',  value: healthScore.health,    icon: 'heart-outline' },
                ].map((item) => (
                  <View key={item.label} style={styles.healthSubItem}>
                    <View style={styles.healthSubRow}>
                      <Ionicons name={item.icon as any} size={11} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.healthSubLabel}>{item.label}</Text>
                      <Text style={[styles.healthSubVal, { color: SCORE_COLOR(item.value) }]}>{item.value}</Text>
                    </View>
                    <View style={styles.healthBar}>
                      <View style={[styles.healthBarFill, { width: `${item.value}%`, backgroundColor: SCORE_COLOR(item.value) }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Members Row */}
            <View style={styles.membersHeader}>
              <Text style={styles.membersTitle}>Family Members</Text>
              <Pressable onPress={() => navigation.navigate('Family', { screen: 'FamilyProfiles' })}>
                <Text style={styles.membersManage}>Manage →</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  style={styles.memberChip}
                  onPress={() => navigation.navigate('Family', { screen: 'MemberDetails', params: { memberId: m.id } })}
                >
                  <View style={styles.memberAvatarWrap}>
                    <Avatar name={m.name} color={m.avatarColor} size={46} />
                    <View style={[styles.statusDot, { backgroundColor: m.status === 'active' ? colors.success : colors.warning }]} />
                  </View>
                  <Text style={styles.memberName}>{m.name.split(' ')[0]}</Text>
                  <Text style={styles.memberPts}>{m.points >= 1000 ? `${(m.points/1000).toFixed(1)}k` : m.points} pts</Text>
                </Pressable>
              ))}
              {isParent && (
                <Pressable
                  style={styles.memberChip}
                  onPress={() => navigation.navigate('Family', { screen: 'FamilyProfiles', params: { openInviteOptions: true } })}
                >
                  <View style={styles.addMemberCircle}>
                    <Ionicons name="add" size={24} color="rgba(255,255,255,0.8)" />
                  </View>
                  <Text style={styles.memberName}>Invite</Text>
                  <Text style={styles.memberPts}> </Text>
                </Pressable>
              )}
            </ScrollView>
          </Animated.View>
        </LinearGradient>

        <View style={styles.body}>

          {/* ── QUICK STATS ──────────────────────────────────────── */}
          <Animated.View style={[styles.statsGrid, anim1]}>
            {quickStats.map((stat) => (
              <Pressable key={stat.label} style={[styles.statCard, shadows.card]}>
                <LinearGradient colors={stat.grad} style={styles.statGrad}>
                  <View style={styles.statTop}>
                    <View style={[styles.statIconCircle, { backgroundColor: stat.color + '20' }]}>
                      <Ionicons name={stat.icon as any} size={18} color={stat.color} />
                    </View>
                    {stat.urgent && <View style={styles.urgentDot} />}
                  </View>
                  <Text style={[styles.statValue, { color: stat.urgent ? colors.danger : colors.text }]}>
                    {stat.value}
                  </Text>
                  <Text style={styles.statSub}>{stat.sub}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </Animated.View>

          {/* ── SHORTCUTS ────────────────────────────────────────── */}
          <Animated.View style={anim1}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              {shortcuts.map((s) => (
                <Pressable
                  key={s.label}
                  style={[styles.shortcutChip, { backgroundColor: s.bg }, shadows.sm]}
                  onPress={() => navigate(s.route, s.screen)}
                >
                  <View style={[styles.shortcutIcon, { backgroundColor: s.color + '18' }]}>
                    <Ionicons name={s.icon as any} size={20} color={s.color} />
                  </View>
                  <Text style={[styles.shortcutLabel, { color: s.color }]}>{s.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>

          {/* ── TODAY'S FOCUS ─────────────────────────────────────── */}
          {(focusTask || focusEvent) && (
            <Animated.View style={anim2}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Focus</Text>
              </View>
              {focusTask && (
                <Pressable
                  style={[styles.focusCard, shadows.md]}
                  onPress={() => navigate('Family', 'Tasks')}
                >
                  <LinearGradient
                    colors={[PRIORITY_CONFIG[focusTask.priority].color + 'EE', PRIORITY_CONFIG[focusTask.priority].color + 'CC']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.focusGrad}
                  >
                    <View style={styles.focusLeft}>
                      <View style={styles.focusBadge}>
                        <Text style={styles.focusBadgeText}>
                          {PRIORITY_CONFIG[focusTask.priority].label.toUpperCase()} PRIORITY
                        </Text>
                      </View>
                      <Text style={styles.focusTitle} numberOfLines={2}>{focusTask.title}</Text>
                      {focusTask.dueDate && (
                        <View style={styles.focusMeta}>
                          <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
                          <Text style={styles.focusMetaText}>
                            Due {format(new Date(focusTask.dueDate), 'MMM d')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.focusRight}>
                      <View style={styles.focusIconCircle}>
                        <Ionicons name="flash" size={28} color="#fff" />
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              )}
              {!focusTask && focusEvent && (
                <Pressable
                  style={[styles.focusCard, shadows.md]}
                  onPress={() => navigate('Family', 'Calendar')}
                >
                  <LinearGradient
                    colors={[focusEvent.color, focusEvent.color + 'BB']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.focusGrad}
                  >
                    <View style={styles.focusLeft}>
                      <View style={styles.focusBadge}>
                        <Text style={styles.focusBadgeText}>NEXT UP</Text>
                      </View>
                      <Text style={styles.focusTitle} numberOfLines={2}>{focusEvent.title}</Text>
                      <View style={styles.focusMeta}>
                        <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.focusMetaText}>
                          {focusEvent.allDay ? 'All Day' : format(new Date(focusEvent.startDate), 'h:mm a')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.focusRight}>
                      <View style={styles.focusIconCircle}>
                        <Ionicons name="calendar" size={28} color="#fff" />
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              )}
            </Animated.View>
          )}

          {/* ── AI INSIGHTS ──────────────────────────────────────── */}
          {insights.filter((i) => !i.isRead).length > 0 && (
            <Animated.View style={anim2}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>AI Insights</Text>
                <Pressable onPress={() => navigation.navigate('AI Assistant')}>
                  <Text style={styles.seeAll}>View all →</Text>
                </Pressable>
              </View>
              {insights.filter((i) => !i.isRead).slice(0, 2).map((insight) => {
                const isHigh = insight.priority === 'high';
                const isMed  = insight.priority === 'medium';
                const iconColor = isHigh ? colors.danger : isMed ? colors.warning : colors.primary;
                const iconBg    = isHigh ? colors.dangerLight : isMed ? colors.warningLight : '#E8EEF9';
                const iconName  = insight.type === 'financial' ? 'wallet' : insight.type === 'alert' ? 'warning' : insight.type === 'task' ? 'list' : 'bulb';
                return (
                  <Pressable key={insight.id} style={[styles.insightCard, shadows.card]}>
                    <View style={[styles.insightIconBox, { backgroundColor: iconBg }]}>
                      <Ionicons name={iconName as any} size={18} color={iconColor} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.insightTitle}>{insight.title}</Text>
                      <Text style={styles.insightBody} numberOfLines={2}>{insight.summary}</Text>
                    </View>
                    {isHigh && <View style={styles.insightUrgentBar} />}
                    <Ionicons name="chevron-forward" size={15} color={colors.textMuted} style={{ marginLeft: 8 }} />
                  </Pressable>
                );
              })}
            </Animated.View>
          )}

          {/* ── FINANCE OVERVIEW (parent only) ───────────────────── */}
          {isParent && (
            <Animated.View style={anim3}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Finance Overview</Text>
                <Pressable onPress={() => navigation.navigate('Finance')}>
                  <Text style={styles.seeAll}>See all →</Text>
                </Pressable>
              </View>
              <Pressable
                style={[styles.financeCard, shadows.md]}
                onPress={() => navigation.navigate('Finance')}
              >
                <LinearGradient colors={['#0A1628', '#0F2952', '#163F7A']} style={styles.financeGrad}>
                  <View style={styles.financeRow}>
                    {[
                      { label: 'Income',   value: `$${monthlyIncome.toLocaleString()}`,           icon: 'arrow-down-circle', color: '#4EECD0' },
                      { label: 'Expenses', value: `$${monthlyExpenses.toLocaleString()}`,          icon: 'arrow-up-circle',   color: '#FF8080' },
                      { label: 'Saved',    value: `$${Math.max(0, monthlySavings).toLocaleString()}`, icon: 'save',          color: '#FFD166' },
                    ].map((item, i) => (
                      <View key={item.label} style={[styles.finItem, i < 2 && styles.finItemBorder]}>
                        <View style={[styles.finIconCircle, { backgroundColor: item.color + '25' }]}>
                          <Ionicons name={item.icon as any} size={18} color={item.color} />
                        </View>
                        <Text style={styles.finValue}>{item.value}</Text>
                        <Text style={styles.finLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.finFooter}>
                    <View>
                      <Text style={styles.finFooterLabel}>Savings Rate</Text>
                      <Text style={styles.finFooterVal}>
                        {monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0}% of income
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <ProgressBar
                        progress={monthlyIncome > 0 ? Math.min(1, monthlySavings / monthlyIncome) : 0}
                        color="#4EECD0"
                        backgroundColor="rgba(255,255,255,0.12)"
                        height={7}
                      />
                    </View>
                  </View>
                  {overdueBills > 0 && (
                    <View style={styles.finAlert}>
                      <Ionicons name="warning-outline" size={14} color="#FF8080" />
                      <Text style={styles.finAlertText}>{overdueBills} bill{overdueBills > 1 ? 's' : ''} overdue — tap to review</Text>
                    </View>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}

          {/* ── GUARDIAN STATUS (parent only, if devices paired) ─── */}
          {isParent && pairedDevices.length > 0 && (
            <Animated.View style={anim3}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Guardian Status</Text>
                <Pressable onPress={() => navigation.navigate('Family', { screen: 'GuardianDashboard' })}>
                  <Text style={styles.seeAll}>View all →</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {pairedDevices.slice(0, 4).map((device) => {
                  const member = members.find((m) => m.id === device.memberId);
                  const statusColor =
                    device.status === 'online' ? colors.success :
                    device.status === 'school_mode' ? '#2980B9' :
                    device.status === 'bedtime' ? '#8E44AD' : colors.textMuted;
                  return (
                    <Pressable
                      key={device.id}
                      style={[styles.guardianChip, shadows.sm]}
                      onPress={() => navigation.navigate('Family', { screen: 'GuardianDashboard' })}
                    >
                      {member && <Avatar name={member.name} color={member.avatarColor} size={36} />}
                      <Text style={styles.guardianChipName}>{device.deviceName}</Text>
                      <View style={[styles.guardianStatusPill, { backgroundColor: statusColor + '20' }]}>
                        <View style={[styles.guardianDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.guardianStatusText, { color: statusColor }]}>
                          {device.status.replace('_', ' ')}
                        </Text>
                      </View>
                      <Text style={styles.guardianBattery}>🔋 {device.batteryLevel}%</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          )}

          {/* ── TODAY'S SCHEDULE ─────────────────────────────────── */}
          <Animated.View style={anim4}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{isChild ? 'My Schedule' : "Today's Schedule"}</Text>
              <Pressable onPress={() => navigation.navigate('Family', { screen: 'Calendar' })}>
                <Text style={styles.seeAll}>Calendar →</Text>
              </Pressable>
            </View>

            {todayEvents.length > 0 ? (
              todayEvents.slice(0, 3).map((event) => (
                <Pressable
                  key={event.id}
                  style={[styles.eventCard, shadows.card]}
                  onPress={() => navigate('Family', 'Calendar')}
                >
                  <View style={[styles.eventAccent, { backgroundColor: event.color }]} />
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <View style={styles.eventMeta}>
                      <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.eventTime}>
                        {event.allDay ? 'All Day' : format(new Date(event.startDate), 'h:mm a')}
                      </Text>
                      {event.location && (
                        <>
                          <Text style={styles.eventMetaDot}>·</Text>
                          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                          <Text style={styles.eventTime} numberOfLines={1}>{event.location}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.eventAvatars}>
                    {event.attendees.slice(0, 3).map((id, idx) => {
                      const m = members.find((mem) => mem.id === id);
                      if (!m) return null;
                      return (
                        <Avatar key={id} name={m.name} color={m.avatarColor} size={26}
                          style={{ marginLeft: idx > 0 ? -8 : 0, zIndex: 3 - idx, borderWidth: 1.5, borderColor: '#fff' as any }} />
                      );
                    })}
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={[styles.emptyState, shadows.card]}>
                <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Free day ahead!</Text>
                <Text style={styles.emptyBody}>No events scheduled for today.</Text>
              </View>
            )}
          </Animated.View>

          {/* ── PRIORITY TASKS ───────────────────────────────────── */}
          <Animated.View style={anim4}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{isChild ? 'My Tasks' : 'Priority Tasks'}</Text>
              <Pressable onPress={() => navigate('Family', 'Tasks')}>
                <Text style={styles.seeAll}>View all →</Text>
              </Pressable>
            </View>

            {visibleTasks
              .filter((t) => t.status === 'pending' || t.status === 'overdue')
              .sort((a, b) => {
                const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
                return order[a.priority] - order[b.priority];
              })
              .slice(0, 3)
              .map((task) => {
                const cfg = PRIORITY_CONFIG[task.priority];
                const assignee = members.find((m) => task.assignedTo?.includes(m.id));
                return (
                  <Pressable
                    key={task.id}
                    style={[styles.taskCard, shadows.card]}
                    onPress={() => navigate('Family', 'Tasks')}
                  >
                    <View style={[styles.taskPriorityBar, { backgroundColor: cfg.color }]} />
                    <View style={styles.taskBody}>
                      <View style={styles.taskTop}>
                        <View style={[styles.taskCheck, { borderColor: cfg.color }]}>
                          <Ionicons name="checkmark" size={12} color="transparent" />
                        </View>
                        <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                        {assignee && (
                          <Avatar name={assignee.name} color={assignee.avatarColor} size={28} />
                        )}
                      </View>
                      <View style={styles.taskBottom}>
                        <View style={[styles.priorityPill, { backgroundColor: cfg.bg }]}>
                          <Text style={[styles.priorityPillText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                        {task.dueDate && (
                          <View style={styles.taskDueRow}>
                            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                            <Text style={styles.taskDue}>Due {format(new Date(task.dueDate), 'MMM d')}</Text>
                          </View>
                        )}
                        {task.points > 0 && (
                          <View style={styles.taskPointsPill}>
                            <Text style={styles.taskPointsText}>+{task.points}pts</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}

            {visibleTasks.filter((t) => t.status === 'pending').length === 0 && (
              <View style={[styles.emptyState, shadows.card]}>
                <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
                <Text style={styles.emptyTitle}>All caught up! 🎉</Text>
                <Text style={styles.emptyBody}>No pending tasks right now.</Text>
              </View>
            )}
          </Animated.View>

          {/* ── WEEKLY REPORT BANNER ─────────────────────────────── */}
          <Animated.View style={anim5}>
            <Pressable
              style={[styles.reportBanner, shadows.md]}
              onPress={() => navigation.navigate('WeeklyReport')}
            >
              <LinearGradient colors={['#0A1628', '#1A3F7A']} style={styles.reportGrad}>
                <View style={styles.reportLeft}>
                  <View style={styles.reportIconCircle}>
                    <Ionicons name="bar-chart" size={22} color="#F5A623" />
                  </View>
                  <View>
                    <Text style={styles.reportTitle}>Weekly Report Ready</Text>
                    <Text style={styles.reportSub}>
                      {isChild ? 'Your task & reward progress' : `Family Health Score +4 pts · ${format(new Date(), 'MMM d')}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.reportArrow}>
                  <Ionicons name="arrow-forward" size={18} color="#F5A623" />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 28, overflow: 'hidden' },
  orb1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#F5A623', opacity: 0.04, top: -120, right: -80 },
  orb2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#00D4AA', opacity: 0.05, bottom: -60, left: -60 },
  orb3: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#4ECDC4', opacity: 0.04, top: 40, right: 80 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  greetText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginBottom: 2 },
  familyTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  dateText: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },

  headerBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#0A1628', paddingHorizontal: 3 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  profilePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 7 },
  profilePillName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  profilePillRole: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  profilePillRoleText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

  sosBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C0392B', borderRadius: 14, padding: 12, marginBottom: 14, gap: 8, position: 'relative', overflow: 'hidden' },
  sosPulse: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#FF6B6B' },
  sosText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700' },

  healthCard: { backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 20, padding: 16, flexDirection: 'row', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  healthLeft: { alignItems: 'center', paddingRight: 16 },
  healthLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.45)', letterSpacing: 1.2, marginBottom: 4 },
  healthScore: { fontSize: 54, fontWeight: '800', lineHeight: 60 },
  healthMax: { fontSize: 18, fontWeight: '400', color: 'rgba(255,255,255,0.4)' },
  healthTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  healthTrendText: { fontSize: 11, color: colors.success, fontWeight: '600' },
  healthDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 16 },
  healthRight: { flex: 1, justifyContent: 'space-between' },
  healthSubItem: { marginBottom: 7 },
  healthSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  healthSubLabel: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  healthSubVal: { fontSize: 11, fontWeight: '700' },
  healthBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  healthBarFill: { height: 4, borderRadius: 2 },

  membersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  membersTitle: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  membersManage: { fontSize: 12, color: colors.secondary, fontWeight: '600' },
  memberChip: { alignItems: 'center', marginRight: 18 },
  memberAvatarWrap: { position: 'relative' },
  statusDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: '#0F2952' },
  memberName: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 7 },
  memberPts: { fontSize: 10, color: colors.secondary, fontWeight: '500', marginTop: 1 },
  addMemberCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', borderStyle: 'dashed' },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 8 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4, marginTop: 8 },
  statCard: { width: CARD_WIDTH, borderRadius: 16, overflow: 'hidden' },
  statGrad: { padding: 14 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statIconCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  urgentDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  statSub: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginBottom: 2 },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

  shortcutChip: { alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginRight: 10, minWidth: 80, gap: 6 },
  shortcutIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { fontSize: 12, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  focusCard: { borderRadius: 18, overflow: 'hidden', marginBottom: 4 },
  focusGrad: { flexDirection: 'row', padding: 18, alignItems: 'center' },
  focusLeft: { flex: 1 },
  focusBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  focusBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  focusTitle: { fontSize: 17, fontWeight: '800', color: '#fff', lineHeight: 23, marginBottom: 8 },
  focusMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  focusMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  focusRight: { marginLeft: 12 },
  focusIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  insightCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10 },
  insightIconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3 },
  insightBody: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  insightUrgentBar: { width: 3, height: '100%' as any, backgroundColor: colors.danger, borderRadius: 2, marginLeft: 4 },

  financeCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 4 },
  financeGrad: { borderRadius: 20 },
  financeRow: { flexDirection: 'row', paddingTop: 18, paddingHorizontal: 4 },
  finItem: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  finItemBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' },
  finIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  finValue: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 3 },
  finLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  finFooter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', marginTop: 4 },
  finFooterLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 },
  finFooterVal: { fontSize: 13, color: '#4EECD0', fontWeight: '700' },
  finAlert: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,128,128,0.12)', marginHorizontal: 12, marginBottom: 12, borderRadius: 10, padding: 10 },
  finAlertText: { fontSize: 12, color: '#FF8080', fontWeight: '600' },

  guardianChip: { backgroundColor: colors.card, borderRadius: 16, padding: 14, marginRight: 10, alignItems: 'center', minWidth: 110 },
  guardianChipName: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 6, textAlign: 'center' },
  guardianStatusPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4, marginBottom: 4 },
  guardianDot: { width: 6, height: 6, borderRadius: 3 },
  guardianStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  guardianBattery: { fontSize: 11, color: colors.textMuted },

  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  eventAccent: { width: 4, alignSelf: 'stretch' },
  eventBody: { flex: 1, padding: 14 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 5 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventMetaDot: { color: colors.textMuted, fontSize: 12 },
  eventTime: { fontSize: 12, color: colors.textMuted },
  eventAvatars: { flexDirection: 'row', alignItems: 'center', paddingRight: 14 },

  taskCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  taskPriorityBar: { width: 4, alignSelf: 'stretch' },
  taskBody: { flex: 1, padding: 14 },
  taskTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  taskCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  taskBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorityPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  priorityPillText: { fontSize: 11, fontWeight: '700' },
  taskDueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  taskDue: { fontSize: 11, color: colors.textMuted },
  taskPointsPill: { marginLeft: 'auto' as any, backgroundColor: '#FEF3E2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  taskPointsText: { fontSize: 11, color: '#F5A623', fontWeight: '700' },

  emptyState: { backgroundColor: colors.card, borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 12, marginBottom: 4 },
  emptyBody: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },

  reportBanner: { marginTop: 8, marginBottom: 8, borderRadius: 18, overflow: 'hidden' },
  reportGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
  reportLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  reportIconCircle: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(245,166,35,0.15)', alignItems: 'center', justifyContent: 'center' },
  reportTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 3 },
  reportSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  reportArrow: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(245,166,35,0.15)', alignItems: 'center', justifyContent: 'center' },
});
