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
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { useTranslation } from 'react-i18next';
import { useJoinRequestsStore } from '../../store/useJoinRequestsStore';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useAIStore } from '../../store/useAIStore';
import { useAppStore } from '../../store/useAppStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useNotificationsStore } from '../../store/useNotificationsStore';
import { useTheme } from '../../theme/ThemeContext';
import { shadows } from '../../theme/spacing';
import { getVisibleTasks, getVisibleEvents } from '../../utils/roleVisibility';
import { getAllowedNotificationTypes } from '../../utils/roleFilters';

const { width } = Dimensions.get('window');

// SCORE_COLOR is used inside the component where colors is available from useTheme

function HealthRing({ score, color, size = 96 }: { score: number; color: string; size?: number }) {
  const strokeWidth = 9;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(Math.max(score / 100, 0), 1);
  const dash = progress * circumference;
  const gap = circumference - dash;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Defs>
        <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.5" />
        </SvgGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx={cx} cy={cy} r={r}
        stroke="url(#ringGrad)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function DashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const SCORE_COLOR = (score: number) =>
    score >= 80 ? colors.success : score >= 60 ? colors.warning : colors.danger;

  const family = useFamilyStore((s) => s.family);
  const members = useFamilyStore((s) => s.members);
  const tasks = useFamilyStore((s) => s.tasks);
  const events = useFamilyStore((s) => s.events);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const activeMember = members.find((member) => member.id === activeMemberId);

  const isParent =
    activeMember?.role === 'parent' ||
    activeMember?.role === 'guardian' ||
    activeMember?.isAdmin === true;

  const isChild = activeMember?.role === 'child';
  const isGrandparent = activeMember?.role === 'grandparent';

  const healthScore = useAppStore((s) => s.healthScore);
  const { monthlyIncome, monthlyExpenses, monthlySavings, bills } = useFinanceStore();

  const insights = useAIStore((s) => s.insights);
  const notifications = useNotificationsStore((s) => s.notifications);
  const seedNotifications = useNotificationsStore((s) => s.seedDemoData);
  const joinRequests = useJoinRequestsStore((s) => s.requests);

  const pendingJoinRequestsCount = joinRequests.filter(
    (request) => request.status === 'pending'
  ).length;

  useEffect(() => {
    if (notifications.length === 0) seedNotifications();
  }, [notifications.length, seedNotifications]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const visibleTasks = getVisibleTasks(tasks, activeMember);
  const visibleEvents = getVisibleEvents(events, activeMember);

  const pendingTasks = visibleTasks.filter((t) => t.status === 'pending').length;
  const activeMemberPendingTasks = visibleTasks.filter((t) => t.status === 'pending').length;
  const overdueTasks = visibleTasks.filter((t) => t.status === 'overdue').length;

  const todayEvents = visibleEvents.filter((event) => {
    const eventDate = new Date(event.startDate);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  });

  const overdueBills = bills.filter((bill) => bill.status === 'overdue').length;

  const allowedTypes = getAllowedNotificationTypes(activeMember?.role);

  const visibleNotifications = notifications.filter((notification) =>
    allowedTypes.includes(notification.type)
  );

  const unreadNotifications =
    visibleNotifications.filter((n) => !n.isRead).length +
    (isParent ? pendingJoinRequestsCount : 0);

  const roleLabel = activeMember
    ? activeMember.role.charAt(0).toUpperCase() + activeMember.role.slice(1)
    : 'Family';

  const quickStats = useMemo(() => {
    if (isChild) {
      return [
        {
          icon: 'school',
          label: 'Homework',
          value: `${activeMemberPendingTasks} pending`,
          color: '#4ECDC4',
          bg: '#E8F8F7',
          urgent: activeMemberPendingTasks > 3,
          route: 'HomeworkTracker',
        },
        {
          icon: 'trophy',
          label: 'My Points',
          value: `${activeMember?.points?.toLocaleString() ?? 0} pts`,
          color: '#F5A623',
          bg: '#FEF3E2',
          urgent: false,
          route: 'OperationsRewards',
        },
        {
          icon: 'calendar',
          label: 'My Events',
          value: `${todayEvents.length} today`,
          color: '#2980B9',
          bg: '#EBF5FB',
          urgent: false,
          route: 'Calendar',
        },
        {
          icon: 'star',
          label: 'Level',
          value: `Level ${activeMember?.level ?? 1}`,
          color: '#8E44AD',
          bg: '#F5EEF8',
          urgent: false,
          route: 'OperationsRewards',
        },
      ];
    }

    if (isGrandparent) {
      return [
        {
          icon: 'gift',
          label: 'Birthdays',
          value: `${todayEvents.length} upcoming`,
          color: '#AD1457',
          bg: '#FCE4EC',
          urgent: false,
          route: 'BirthdayTracker',
        },
        {
          icon: 'calendar',
          label: 'Family Events',
          value: `${todayEvents.length} today`,
          color: '#F5A623',
          bg: '#FEF3E2',
          urgent: false,
          route: 'Calendar',
        },
        {
          icon: 'people',
          label: 'Members',
          value: `${members.length} family`,
          color: '#2980B9',
          bg: '#EBF5FB',
          urgent: false,
          route: 'FamilyProfiles',
        },
        {
          icon: 'heart',
          label: 'Family Score',
          value: `${healthScore.overall}/100`,
          color: SCORE_COLOR(healthScore.overall),
          bg: '#E8EEF9',
          urgent: false,
          route: 'WeeklyReport',
        },
      ];
    }

    return [
      {
        icon: 'checkmark-done',
        label: 'Tasks',
        value: `${pendingTasks} pending`,
        color: '#4ECDC4',
        bg: '#E8F8F7',
        urgent: overdueTasks > 0,
        route: 'Tasks',
      },
      {
        icon: 'calendar',
        label: "Today's Events",
        value: `${todayEvents.length} events`,
        color: '#F5A623',
        bg: '#FEF3E2',
        urgent: false,
        route: 'Calendar',
      },
      {
        icon: 'receipt',
        label: t('finance.bills'),
        value: overdueBills > 0 ? `${overdueBills} overdue!` : 'On track',
        color: overdueBills > 0 ? colors.danger : colors.success,
        bg: overdueBills > 0 ? colors.dangerLight : colors.successLight,
        urgent: overdueBills > 0,
        route: 'Bills',
      },
      {
        icon: 'trending-up',
        label: 'Monthly Savings',
        value: `$${monthlySavings.toFixed(0)}`,
        color: '#27AE60',
        bg: '#D5F5E3',
        urgent: false,
        route: 'Budgeting',
      },
    ];
  }, [
    isChild,
    isGrandparent,
    activeMember,
    activeMemberPendingTasks,
    todayEvents.length,
    members.length,
    healthScore.overall,
    pendingTasks,
    overdueTasks,
    overdueBills,
    monthlySavings,
  ]);

  const roleActions = useMemo(() => {
    if (isChild) {
      return [
        { label: `My Tasks (${activeMemberPendingTasks})`, icon: 'checkbox-outline', route: 'Tasks' },
        { label: 'Rewards', icon: 'trophy-outline', route: 'OperationsRewards' },
        { label: 'Homework', icon: 'school-outline', route: 'HomeworkTracker' },
      ];
    }

    if (isGrandparent) {
      return [
        { label: 'Birthdays', icon: 'gift-outline', route: 'BirthdayTracker' },
        { label: 'Timeline', icon: 'time-outline', route: 'FamilyTimeline' },
        { label: 'Family Board', icon: 'megaphone-outline', route: 'FamilyBoard' },
      ];
    }

    return [
      { label: `Approvals (${pendingJoinRequestsCount})`, icon: 'person-add-outline', route: 'JoinRequests' },
      { label: 'Bills', icon: 'receipt-outline', route: 'Finance' },
      { label: `Tasks (${pendingTasks})`, icon: 'checkbox-outline', route: 'Tasks' },
    ];
  }, [isChild, isGrandparent, activeMemberPendingTasks, pendingJoinRequestsCount, pendingTasks]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const openMemberDetails = (memberId: string) => {
    navigation.navigate('Family', {
      screen: 'MemberDetails',
      params: { memberId },
    });
  };

  const openInviteMember = () => {
    navigation.navigate('Family', {
      screen: 'FamilyProfiles',
      params: { openInviteOptions: true },
    });
  };

  const openFamilyMembers = () => {
    navigation.navigate('Family', {
      screen: 'FamilyProfiles',
    });
  };

  const handleRoleActionPress = (route: string) => {
    // Top-level MainNavigator screens
    if (route === 'WeeklyReport') {
      navigation.navigate('WeeklyReport');
      return;
    }

    // Finance tab screens
    if (route === 'Finance') {
      navigation.navigate('Finance');
      return;
    }
    if (route === 'Bills') {
      navigation.navigate('Finance', { screen: 'Bills' } as any);
      return;
    }
    if (route === 'Budgeting') {
      navigation.navigate('Finance', { screen: 'Budgeting' } as any);
      return;
    }

    if (route === 'AIAssistant') {
      navigation.navigate('AI Assistant', { screen: 'AIAssistant' });
      return;
    }

    // Operations tab screens
    if (route === 'OperationsRewards') {
      navigation.navigate('Operations', {
        screen: 'Rewards',
        params: {
          memberId: activeMember?.id,
          role: activeMember?.role,
          source: 'dashboard',
        },
      });
      return;
    }

    // All other routes live inside the Family tab navigator
    navigation.navigate('Family', {
      screen: route,
      params: {
        memberId: activeMember?.id,
        role: activeMember?.role,
        source: 'dashboard',
      },
    });
  };

  const dynStyles = makeStyles(colors);

  return (
    <View style={dynStyles.container}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[dynStyles.scrollContent, { paddingBottom: 100 }]}
      >
        <LinearGradient
          colors={['#0D1B2A', '#0F2952', '#1E4A8A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[dynStyles.header, { paddingTop: insets.top + 16 }]}
        >
          {/* decorative blobs — isolated so overflow:hidden doesn't clip icons */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={dynStyles.headerCircle1} />
            <View style={dynStyles.headerCircle2} />
          </View>

          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={dynStyles.headerTop}>
              <View style={dynStyles.headerTextBlock}>
                <Text style={dynStyles.greeting}>{greeting()},</Text>
                <Text style={dynStyles.familyName} numberOfLines={1} ellipsizeMode="tail">
                  {family?.name ?? 'My Family'} 👋
                </Text>
                <Text style={dynStyles.date}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</Text>

                {activeMember && (
                  <Pressable
                    style={dynStyles.activeProfileBadge}
                    onPress={() =>
                      navigation.navigate('Family', {
                        screen: 'ProfileSwitcher',
                      })
                    }
                  >
                    <Avatar name={activeMember.name} color={activeMember.avatarColor} size={24} />
                    <Text style={dynStyles.activeProfileName}>
                      {activeMember.name} • {roleLabel}
                    </Text>
                    <Ionicons name="chevron-down" size={13} color="#fff" />
                  </Pressable>
                )}
              </View>

              <View style={dynStyles.headerActions}>
                <Pressable style={dynStyles.headerIconBtn} onPress={() => navigation.navigate('Search')}>
                  <Ionicons name="search" size={20} color="rgba(255,255,255,0.9)" />
                </Pressable>

                <Pressable
                  style={dynStyles.headerIconBtn}
                  onPress={() => navigation.navigate('Notifications')}
                >
                  <Ionicons name="notifications" size={21} color="#fff" />
                  {unreadNotifications > 0 && (
                    <View style={dynStyles.notifDot}>
                      <Text style={dynStyles.notifCount}>
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </Text>
                    </View>
                  )}
                </Pressable>

                <Pressable style={dynStyles.headerIconBtn} onPress={() => navigation.navigate('Settings')}>
                  <Ionicons name="settings-outline" size={21} color="rgba(255,255,255,0.9)" />
                </Pressable>
              </View>
            </View>

            <View style={dynStyles.roleBanner}>
              <Ionicons
                name={
                  isChild
                    ? 'school-outline'
                    : isGrandparent
                      ? 'heart-outline'
                      : 'shield-checkmark-outline'
                }
                size={16}
                color={colors.secondary}
              />
              <Text style={dynStyles.roleBannerText}>
                {isChild
                  ? 'Child dashboard: chores, homework, rewards, and events.'
                  : isGrandparent
                    ? 'Grandparent dashboard: family moments, birthdays, and updates.'
                    : 'Parent dashboard: bills, tasks, calendar, approvals, and household health.'}
              </Text>
            </View>

            <View style={dynStyles.healthScoreCard}>
              <View style={dynStyles.healthScoreLeft}>
                <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                  <HealthRing score={healthScore.overall} color={SCORE_COLOR(healthScore.overall)} size={96} />
                  <View style={dynStyles.healthRingInner}>
                    <Text style={[dynStyles.healthScoreValue, { color: SCORE_COLOR(healthScore.overall) }]}>
                      {healthScore.overall}
                    </Text>
                  </View>
                </View>
                <Text style={dynStyles.healthScoreLabel}>HEALTH SCORE</Text>
                <View style={dynStyles.healthScoreTrend}>
                  <Ionicons name="trending-up" size={13} color={colors.success} />
                  <Text style={dynStyles.healthScoreTrendText}>+4 pts</Text>
                </View>
              </View>

              <View style={dynStyles.healthScoreRight}>
                {[
                  { label: 'Finance', value: healthScore.financial, icon: 'wallet' },
                  { label: 'Tasks', value: healthScore.tasks, icon: 'checkmark-circle' },
                  { label: 'Goals', value: healthScore.goals, icon: 'flag' },
                  { label: 'Wellness', value: healthScore.health, icon: 'heart' },
                ].map((item) => (
                  <View key={item.label} style={dynStyles.healthSubItem}>
                    <View style={dynStyles.healthSubRow}>
                      <Ionicons name={item.icon as any} size={12} color="rgba(255,255,255,0.7)" />
                      <Text style={dynStyles.healthSubLabel}>{item.label}</Text>
                      <Text style={[dynStyles.healthSubPct, { color: SCORE_COLOR(item.value) }]}>{item.value}</Text>
                    </View>
                    <View style={dynStyles.healthSubBar}>
                      <View
                        style={[
                          dynStyles.healthSubFill,
                          { width: `${item.value}%`, backgroundColor: SCORE_COLOR(item.value) },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={dynStyles.membersRow}>
              <Text style={dynStyles.membersLabel}>Family Members</Text>
              <Pressable onPress={openFamilyMembers}>
                <Text style={dynStyles.membersViewAll}>Manage</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dynStyles.membersScroll}>
              {members.map((member) => (
                <Pressable
                  key={member.id}
                  style={dynStyles.memberChip}
                  onPress={() => openMemberDetails(member.id)}
                >
                  <Avatar
                    name={member.name}
                    color={member.avatarColor}
                    size={44}
                    showBadge
                    badgeColor={member.status === 'active' ? colors.success : colors.warning}
                  />
                  <Text style={dynStyles.memberChipName}>{member.name.split(' ')[0]}</Text>
                  <Text style={dynStyles.memberChipPoints}>{member.points.toLocaleString()} pts</Text>
                </Pressable>
              ))}

              {isParent && (
                <Pressable style={dynStyles.addMemberChip} onPress={openInviteMember}>
                  <View style={dynStyles.addMemberIcon}>
                    <Ionicons name="add" size={22} color={colors.primary} />
                  </View>
                  <Text style={dynStyles.addMemberText}>Invite</Text>
                </Pressable>
              )}
            </ScrollView>
          </Animated.View>
        </LinearGradient>

        <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 16, marginTop: 4 }}>
          <View style={dynStyles.quickStats}>
            {quickStats.map((stat) => (
              <Pressable
                key={stat.label}
                style={[dynStyles.statCard, shadows.sm]}
                onPress={() => stat.route && handleRoleActionPress(stat.route)}
                android_ripple={{ color: stat.color + '22' }}
              >
                <View style={[dynStyles.statIconCircle, { backgroundColor: stat.bg }]}>
                  <Ionicons name={stat.icon as any} size={18} color={stat.color} />
                </View>
                <Text style={[dynStyles.statValue, { color: stat.urgent ? colors.danger : colors.text }]}>
                  {stat.value}
                </Text>
                <Text style={dynStyles.statLabel}>{stat.label}</Text>
                {stat.urgent && (
                  <View style={dynStyles.urgentPill}>
                    <Text style={dynStyles.urgentPillText}>!</Text>
                  </View>
                )}
                <View style={dynStyles.statChevron}>
                  <Ionicons name="chevron-forward" size={12} color={stat.color} />
                </View>
              </Pressable>
            ))}
          </View>

          <View style={dynStyles.roleActions}>
            {roleActions.map((action, idx) => (
              <Pressable
                key={action.label}
                style={[dynStyles.roleActionBtn, shadows.sm]}
                onPress={() => handleRoleActionPress(action.route)}
              >
                {idx === 0 ? (
                  <LinearGradient colors={['#0F2952', '#1E4A8A']} style={dynStyles.roleActionGrad}>
                    <Ionicons name={action.icon as any} size={19} color="#fff" />
                    <Text style={[dynStyles.roleActionText, { color: '#fff' }]} numberOfLines={1}>{action.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={dynStyles.roleActionInner}>
                    <Ionicons name={action.icon as any} size={19} color={colors.primary} />
                    <Text style={dynStyles.roleActionText} numberOfLines={1}>{action.label}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {insights
            .filter((insight) => !insight.isRead)
            .slice(0, 2)
            .map((insight) => (
              <Card key={insight.id} style={dynStyles.insightCard} onPress={() => navigation.navigate('AI Assistant', { screen: 'AIAssistant' } as any)} variant="elevated">
                <View style={dynStyles.insightRow}>
                  <View
                    style={[
                      dynStyles.insightIcon,
                      {
                        backgroundColor:
                          insight.priority === 'high'
                            ? colors.dangerLight
                            : insight.priority === 'medium'
                              ? colors.warningLight
                              : '#E8EEF9',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        insight.type === 'financial'
                          ? 'wallet'
                          : insight.type === 'alert'
                            ? 'warning'
                            : insight.type === 'task'
                              ? 'list'
                              : 'bulb'
                      }
                      size={18}
                      color={
                        insight.priority === 'high'
                          ? colors.danger
                          : insight.priority === 'medium'
                            ? colors.warning
                            : colors.primary
                      }
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={dynStyles.insightTitle}>{insight.title}</Text>
                    <Text style={dynStyles.insightSummary} numberOfLines={2}>
                      {insight.summary}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </Card>
            ))}

          {isParent && (
            <>
              <View style={dynStyles.sectionHeader}>
                <Text style={dynStyles.sectionTitle}>Finance Overview</Text>
                <Pressable onPress={() => navigation.navigate('Finance')}>
                  <Text style={dynStyles.seeAll}>See All</Text>
                </Pressable>
              </View>

              <Card variant="elevated" style={dynStyles.financeCard} padding={0} onPress={() => navigation.navigate('Finance')}>
                <LinearGradient colors={['#0F2952', '#1E4A8A']} style={dynStyles.financeGradient}>
                  <View style={dynStyles.financeRow}>
                    {[
                      {
                        label: 'Monthly Income',
                        value: `$${monthlyIncome.toLocaleString()}`,
                        icon: 'arrow-down-circle',
                        color: '#4EECD0',
                      },
                      {
                        label: 'Expenses',
                        value: `$${monthlyExpenses.toLocaleString()}`,
                        icon: 'arrow-up-circle',
                        color: '#FF8080',
                      },
                      {
                        label: 'Saved',
                        value: `$${Math.max(0, monthlySavings).toLocaleString()}`,
                        icon: 'save',
                        color: '#FFD166',
                      },
                    ].map((item, index) => (
                      <View
                        key={item.label}
                        style={[dynStyles.financeItem, index < 2 && dynStyles.financeItemBorder]}
                      >
                        <Ionicons name={item.icon as any} size={20} color={item.color} />
                        <Text style={dynStyles.financeValue}>{item.value}</Text>
                        <Text style={dynStyles.financeLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={dynStyles.savingsRateRow}>
                    <Text style={dynStyles.savingsRateLabel}>Savings Rate</Text>
                    <Text style={dynStyles.savingsRateValue}>
                      {monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0}%
                    </Text>
                  </View>

                  <ProgressBar
                    progress={monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0}
                    color={colors.accentLight}
                    backgroundColor="rgba(255,255,255,0.1)"
                    height={6}
                    style={{ marginHorizontal: 16, marginBottom: 16 }}
                  />
                </LinearGradient>
              </Card>
            </>
          )}

          <View style={dynStyles.sectionHeader}>
            <Text style={dynStyles.sectionTitle}>{isChild ? 'My Schedule' : "Today's Schedule"}</Text>
            <Pressable onPress={() => navigation.navigate('Family', { screen: 'Calendar' })}>
              <Text style={dynStyles.seeAll}>Calendar</Text>
            </Pressable>
          </View>

          {todayEvents.length > 0 ? (
            todayEvents.slice(0, 3).map((event) => (
              <Card key={event.id} style={dynStyles.eventCard} onPress={() => navigation.navigate('Family', { screen: 'Calendar' })} variant="elevated" padding={0}>
                <View style={dynStyles.eventRow}>
                  <View style={[dynStyles.eventColorStrip, { backgroundColor: event.color ?? colors.primary }]} />
                  <View style={{ flex: 1, paddingVertical: 14, paddingLeft: 14 }}>
                    <Text style={dynStyles.eventTitle}>{event.title}</Text>
                    <View style={dynStyles.eventMeta}>
                      <View style={[dynStyles.eventTimePill, { backgroundColor: (event.color ?? colors.primary) + '18' }]}>
                        <Ionicons name="time-outline" size={11} color={event.color ?? colors.primary} />
                        <Text style={[dynStyles.eventTime, { color: event.color ?? colors.primary }]}>
                          {event.allDay ? 'All Day' : format(new Date(event.startDate), 'h:mm a')}
                        </Text>
                      </View>
                      {event.location && (
                        <Text style={dynStyles.eventLocation} numberOfLines={1}>
                          📍 {event.location}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={dynStyles.eventRight}>
                    <View style={dynStyles.eventAttendees}>
                      {event.attendees.slice(0, 3).map((id, index) => {
                        const member = members.find((m) => m.id === id);
                        if (!member) return null;
                        return (
                          <Avatar
                            key={id}
                            name={member.name}
                            color={member.avatarColor}
                            size={24}
                            style={{ marginLeft: index > 0 ? -7 : 0, zIndex: 3 - index }}
                          />
                        );
                      })}
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginTop: 6 }} />
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Card style={dynStyles.emptyCard} padding={20} onPress={() => navigation.navigate('Family', { screen: 'Calendar' })}>
              <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
              <Text style={dynStyles.emptyText}>No events today — enjoy the free time!</Text>
              <Text style={dynStyles.emptyAction}>Add Event →</Text>
            </Card>
          )}

          <View style={dynStyles.sectionHeader}>
            <Text style={dynStyles.sectionTitle}>{isChild ? 'My Priority Tasks' : 'Priority Tasks'}</Text>
            <Pressable onPress={() => navigation.navigate('Family', { screen: 'Tasks', params: { memberId: activeMember?.id, role: activeMember?.role, source: 'dashboard' } })}>
              <Text style={dynStyles.seeAll}>View All</Text>
            </Pressable>
          </View>

          {visibleTasks
            .filter((task) => task.status === 'pending')
            .sort((a, b) => {
              const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            })
            .slice(0, 3)
            .map((task: any) => {
              const assignee = members.find((member) => task.assignedTo?.includes(member.id));
              const prioColor =
                task.priority === 'urgent' || task.priority === 'high'
                  ? colors.danger
                  : task.priority === 'medium'
                    ? colors.warning
                    : colors.success;

              return (
                <Card key={task.id} style={dynStyles.taskCard} onPress={() => navigation.navigate('Family', { screen: 'Tasks', params: { memberId: activeMember?.id, role: activeMember?.role, source: 'dashboard' } })} variant="elevated" padding={0}>
                  <View style={dynStyles.taskRow}>
                    <View style={[dynStyles.taskPriorityStrip, { backgroundColor: prioColor }]} />
                    <View style={dynStyles.taskCheckWrap}>
                      <Pressable style={[dynStyles.taskCheck, { borderColor: prioColor }]}>
                        <Ionicons name="checkmark" size={14} color="transparent" />
                      </Pressable>
                    </View>
                    <View style={{ flex: 1, paddingVertical: 14, paddingRight: 14 }}>
                      <Text style={dynStyles.taskTitle}>{task.title}</Text>
                      <View style={dynStyles.taskMeta}>
                        <View style={[dynStyles.taskPrioBadge, { backgroundColor: prioColor + '20' }]}>
                          <Text style={[dynStyles.taskPrioBadgeText, { color: prioColor }]}>
                            {task.priority.toUpperCase()}
                          </Text>
                        </View>
                        {task.dueDate && (
                          <Text style={dynStyles.taskDue}>
                            Due {format(new Date(task.dueDate), 'MMM d')}
                          </Text>
                        )}
                      </View>
                    </View>
                    {assignee && (
                      <View style={{ paddingRight: 14 }}>
                        <Avatar name={assignee.name} color={assignee.avatarColor} size={30} />
                      </View>
                    )}
                  </View>
                </Card>
              );
            })}

          <Pressable onPress={() => navigation.navigate('WeeklyReport')} style={dynStyles.reportBanner}>
            <LinearGradient colors={['#0F2952', '#1E4A8A']} style={dynStyles.reportBannerGrad}>
              <View style={dynStyles.reportBannerLeft}>
                <Ionicons name="bar-chart" size={20} color={colors.secondary} />
                <View>
                  <Text style={dynStyles.reportBannerTitle}>Weekly Report Ready</Text>
                  <Text style={dynStyles.reportBannerSub}>
                    {isChild
                      ? 'Your weekly task and reward progress is ready'
                      : 'Family Health Score +4 pts this week'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: import('../../theme/ThemeContext').ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {},
    header: { paddingHorizontal: 20, paddingBottom: 28 },
    headerCircle1: {
      position: 'absolute',
      width: 250,
      height: 250,
      borderRadius: 125,
      backgroundColor: '#F5A623',
      opacity: 0.05,
      top: -100,
      right: -60,
    },
    headerCircle2: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: '#00D4AA',
      opacity: 0.08,
      bottom: -40,
      left: -40,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
      gap: 10,
    },
    headerTextBlock: { flex: 1, minWidth: 0, paddingRight: 4 },
    greeting: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500', letterSpacing: 0.3 },
    familyName: { fontSize: 26, fontWeight: '900', color: '#fff', marginVertical: 2, flexShrink: 1, letterSpacing: -0.5 },
    date: { fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.2 },
    activeProfileBadge: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.14)',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 18,
    },
    activeProfileName: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
      marginHorizontal: 7,
    },
    roleBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(255,255,255,0.09)',
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    roleBannerText: {
      flex: 1,
      fontSize: 12,
      color: 'rgba(255,255,255,0.78)',
      fontWeight: '600',
      lineHeight: 17,
    },
    headerActions: { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 4, flexShrink: 0 },
    headerIconBtn: {
      width: 39,
      height: 39,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.11)',
      borderRadius: 13,
      position: 'relative',
    },
    notifDot: {
      position: 'absolute',
      top: -5,
      right: -5,
      minWidth: 17,
      height: 17,
      borderRadius: 9,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#0F2952',
      paddingHorizontal: 3,
    },
    notifCount: { fontSize: 9, fontWeight: '800', color: '#fff' },
    healthScoreCard: {
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderRadius: 22,
      padding: 18,
      flexDirection: 'row',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.11)',
      alignItems: 'center',
    },
    healthScoreLeft: {
      alignItems: 'center',
      paddingRight: 18,
      borderRightWidth: 1,
      borderRightColor: 'rgba(255,255,255,0.13)',
      marginRight: 16,
    },
    healthRingInner: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      width: 96,
      height: 96,
    },
    healthScoreLabel: {
      fontSize: 8,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.45)',
      letterSpacing: 1.3,
      marginTop: 6,
    },
    healthScoreValue: { fontSize: 26, fontWeight: '900', lineHeight: 30 },
    healthScoreMax: { fontSize: 14, fontWeight: '400', color: 'rgba(255,255,255,0.5)' },
    healthScoreTrend: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
    healthScoreTrendText: { fontSize: 10, color: colors.success, fontWeight: '700' },
    healthScoreRight: { flex: 1, justifyContent: 'space-between', gap: 8 },
    healthSubItem: {},
    healthSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
    healthSubLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', flex: 1 },
    healthSubPct: { fontSize: 10, fontWeight: '800' },
    healthSubBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
    healthSubFill: { height: 3, borderRadius: 2 },
    membersRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    membersLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
    membersViewAll: { fontSize: 12, color: colors.secondary, fontWeight: '600' },
    membersScroll: { marginBottom: 4 },
    memberChip: { alignItems: 'center', marginRight: 16 },
    memberChipName: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 6 },
    memberChipPoints: { fontSize: 10, color: colors.secondary, fontWeight: '500', marginTop: 2 },
    addMemberChip: { alignItems: 'center', marginRight: 16 },
    addMemberIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.2)',
      borderStyle: 'dashed',
    },
    addMemberText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 },
    quickStats: { flexDirection: 'row', gap: 10, marginVertical: 16, flexWrap: 'wrap' },
    statCard: {
      flex: 1,
      minWidth: (width - 52) / 2 - 5,
      borderRadius: 16,
      padding: 14,
      alignItems: 'flex-start',
      position: 'relative',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.04)',
    },
    statIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    statValue: { fontSize: 17, fontWeight: '800', marginBottom: 2, color: colors.text },
    statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
    urgentPill: {
      position: 'absolute',
      top: 10,
      right: 24,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    urgentPillText: { fontSize: 10, fontWeight: '900', color: '#fff' },
    statChevron: { position: 'absolute', bottom: 10, right: 10 },
    roleActions: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    roleActionBtn: {
      flex: 1,
      borderRadius: 16,
      overflow: 'hidden',
      minHeight: 72,
    },
    roleActionGrad: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 14,
      paddingHorizontal: 8,
      minHeight: 72,
    },
    roleActionInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      backgroundColor: colors.card,
      paddingVertical: 14,
      paddingHorizontal: 8,
      minHeight: 72,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.06)',
      borderRadius: 16,
    },
    roleActionText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    insightCard: { marginBottom: 10, borderRadius: 16, borderLeftWidth: 3, borderLeftColor: colors.primary },
    insightRow: { flexDirection: 'row', alignItems: 'center' },
    insightIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    insightTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 3 },
    insightSummary: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    seeAll: { fontSize: 12, color: colors.primary, fontWeight: '700', backgroundColor: '#E8EEF9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
    financeCard: { borderRadius: 22, overflow: 'hidden', marginBottom: 4 },
    financeGradient: { borderRadius: 22, padding: 0 },
    financeRow: { flexDirection: 'row', paddingTop: 22, paddingHorizontal: 8 },
    financeItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
    financeItemBorder: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,255,255,0.2)' },
    financeValue: { fontSize: 19, fontWeight: '800', color: '#fff', marginTop: 7, marginBottom: 4, letterSpacing: -0.5 },
    financeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', textAlign: 'center', letterSpacing: 0.3 },
    savingsRateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
    savingsRateLabel: { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
    savingsRateValue: { fontSize: 13, color: colors.accentLight, fontWeight: '800' },
    eventCard: { marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
    eventRow: { flexDirection: 'row', alignItems: 'center' },
    eventColorStrip: { width: 4, alignSelf: 'stretch' },
    eventTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 },
    eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    eventTimePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    eventTime: { fontSize: 11, fontWeight: '700' },
    eventLocation: { fontSize: 11, color: colors.textMuted, flex: 1 },
    eventRight: { alignItems: 'center', paddingRight: 14 },
    eventAttendees: { flexDirection: 'row', alignItems: 'center' },
    emptyCard: { alignItems: 'center', backgroundColor: colors.card },
    emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 10, textAlign: 'center' },
    emptyAction: { fontSize: 13, color: colors.primary, fontWeight: '700', marginTop: 8 },
    taskCard: { marginBottom: 10, borderRadius: 14, overflow: 'hidden' },
    taskRow: { flexDirection: 'row', alignItems: 'center' },
    taskPriorityStrip: { width: 4, alignSelf: 'stretch' },
    taskCheckWrap: { paddingHorizontal: 12, paddingVertical: 14 },
    taskCheck: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    taskTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 },
    taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    taskPrioBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    taskPrioBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    taskDue: { fontSize: 11, color: colors.textSecondary },
    reportBanner: { marginVertical: 16, borderRadius: 16, overflow: 'hidden' },
    reportBannerGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    reportBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    reportBannerTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
    reportBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  });
}