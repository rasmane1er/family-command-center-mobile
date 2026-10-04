import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';

import { useJoinRequestsStore } from '../../store/useJoinRequestsStore';
import { useAppStore } from '../../store/useAppStore';
import { useFinancialHealth } from '../../hooks/useFinancialHealth';
import { useSubscription } from '../../hooks/useSubscription';
import { usePurchases } from '../../hooks/usePurchases';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useAIStore } from '../../store/useAIStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationsStore } from '../../store/useNotificationsStore';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { shadows } from '../../theme/spacing';
import { getVisibleTasks, getVisibleEvents } from '../../utils/roleVisibility';
import { getAllowedNotificationTypes } from '../../utils/roleFilters';
import { DailyBriefCard } from '../../components/dashboard/DailyBriefCard';
import { ProgressRing } from '../../components/dashboard/ProgressRing';

import { MemoryOfTheDayCard } from '../../components/dashboard/MemoryOfTheDayCard';
import { ChoreLeaderboardCard } from '../../components/dashboard/ChoreLeaderboardCard';
import { StreakCounterCard } from '../../components/dashboard/StreakCounterCard';

const COMMAND_COLORS = {
  navy900: '#081120',
  navy800: '#0E1E36',
  navy700: '#142B4D',
  gold: '#C6A664',
  teal: '#00C2A8',
  orange: '#F97316',
  red: '#DC2626',
  blue: '#2563EB',
  slate: '#64748B',
};

export function DashboardScreen({ navigation }: any) {
  const { t } = useTranslation('dashboard');
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { contentWidth, gridColumns } = useResponsiveLayout();
  const kpiColumns = gridColumns(2, 150, 12);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const [fabOpen, setFabOpen] = useState(false);

  const SCORE_COLOR = (score: number) =>
    score >= 80 ? colors.success : score >= 60 ? colors.warning : colors.danger;

  const family = useFamilyStore((s) => s.family);
  const members = useFamilyStore((s) => s.members);
  const tasks = useFamilyStore((s) => s.tasks);
  const events = useFamilyStore((s) => s.events);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const authUser = useAuthStore((s) => s.user);
  const activeMember = members.find((member) => member.id === activeMemberId);
  const fetchFamilyFromServer = useFamilyStore((s) => s.fetchFromServer);
  const hydrateEvents = useFamilyStore((s) => s.hydrateEvents);

  const isFamilyLoaded = useFamilyStore((s) => s.isLoaded);
  const familyId = useAuthStore((s) => s.familyId);


  // Home is often the very first screen opened after launch — nothing else
  // may have hydrated family/members/tasks/events yet. Only fetch when we
  // have a confirmed backend session (familyId set) to avoid a 401 on first
  // mount before the token is persisted.
  useEffect(() => {
    if (familyId && (!isFamilyLoaded || members.length === 0)) {
      fetchFamilyFromServer();
    }
    hydrateEvents();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  const isParent =
    activeMember?.role === 'parent' ||
    activeMember?.role === 'guardian' ||
    activeMember?.isAdmin === true;

  const isChild = activeMember?.role === 'child';
  const isGrandparent = activeMember?.role === 'grandparent';

  const { isAtLeast } = useSubscription();
  const hasFinanceAccess = isAtLeast('premium');
  const { showPaywall } = usePurchases();

  const healthScore = useFinancialHealth();
  const { monthlyIncome, monthlyExpenses, monthlySavings, bills } = useFinanceStore();
  const hideBalances = useAppStore((s) => s.settings.hideBalances);
  // Masks the actual figures whenever they shouldn't be legible — either the
  // user's own privacy toggle, or not having premium access. The visual
  // blur/lock overlay below is a nice presentation on top of this, but this
  // is what actually guarantees the numbers aren't readable: expo-blur's
  // Android blur is experimental and off by default, so relying on the blur
  // alone left real numbers fully legible under a barely-there tint on
  // Android even though the exact same code hid them properly on iOS.
  const maskAmount = (n: number) => (hideBalances || !hasFinanceAccess ? '••••' : `$${n.toLocaleString()}`);

  const insights = useAIStore((s) => s.insights);
  const notifications = useNotificationsStore((s) => s.notifications);
  const joinRequests = useJoinRequestsStore((s) => s.requests);

  const pendingJoinRequestsCount = joinRequests.filter(
    (request) => request.status === 'pending'
  ).length;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 520,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

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
    : t('dashboard.screens.main.familyFallback');

  const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;
  const expenseRate = monthlyIncome > 0 ? Math.min(monthlyExpenses / monthlyIncome, 1) : 0;

  const operationalStatus = useMemo(() => {
    if (overdueBills > 0 || overdueTasks > 0) {
      return {
        label: t('dashboard.screens.main.statusAttentionNeeded'),
        tone: COMMAND_COLORS.orange,
        icon: 'warning-outline',
        message: t('dashboard.screens.main.priorityItemsMessage', { count: overdueTasks + overdueBills }),
      };
    }

    if (healthScore.overall >= 80 && monthlySavings >= 0) {
      return {
        label: t('dashboard.screens.main.statusHouseholdStable'),
        tone: COMMAND_COLORS.teal,
        icon: 'shield-checkmark-outline',
        message: t('dashboard.screens.main.statusMessageNoIssues'),
      };
    }

    return {
      label: t('dashboard.screens.main.statusMonitorClosely'),
      tone: COMMAND_COLORS.gold,
      icon: 'pulse-outline',
      message: t('dashboard.screens.main.statusMessageReviewWeek'),
    };
  }, [healthScore.overall, monthlySavings, overdueBills, overdueTasks, t]);

  const kpiCards = useMemo(() => {
    if (isChild) {
      return [
        {
          label: t('dashboard.screens.main.kpiMyTasks'),
          value: `${activeMemberPendingTasks}`,
          detail: t('dashboard.screens.main.kpiPending'),
          icon: 'checkbox-outline',
          tone: COMMAND_COLORS.teal,
          route: 'Tasks',
        },
        {
          label: t('dashboard.screens.main.kpiPoints'),
          value: `${activeMember?.points?.toLocaleString() ?? 0}`,
          detail: t('dashboard.screens.main.kpiEarned'),
          icon: 'trophy-outline',
          tone: COMMAND_COLORS.gold,
          route: 'OperationsRewards',
        },
        {
          label: t('dashboard.screens.main.kpiEvents'),
          value: `${todayEvents.length}`,
          detail: t('dashboard.screens.main.kpiToday'),
          icon: 'calendar-outline',
          tone: COMMAND_COLORS.blue,
          route: 'Calendar',
        },
        {
          label: t('dashboard.screens.main.kpiLevel'),
          value: `${activeMember?.level ?? 1}`,
          detail: t('dashboard.screens.main.kpiCurrent'),
          icon: 'star-outline',
          tone: '#8B5CF6',
          route: 'OperationsRewards',
        },
      ];
    }

    if (isGrandparent) {
      return [
        {
          label: t('dashboard.screens.main.kpiFamilyScore'),
          value: `${healthScore.overall}`,
          detail: t('dashboard.screens.main.kpiOverall'),
          icon: 'heart-outline',
          tone: SCORE_COLOR(healthScore.overall),
          route: 'WeeklyReport',
        },
        {
          label: t('dashboard.screens.main.kpiEvents'),
          value: `${todayEvents.length}`,
          detail: t('dashboard.screens.main.kpiToday'),
          icon: 'calendar-outline',
          tone: COMMAND_COLORS.gold,
          route: 'Calendar',
        },
        {
          label: t('dashboard.screens.main.kpiMembers'),
          value: `${members.length}`,
          detail: t('dashboard.screens.main.kpiFamily'),
          icon: 'people-outline',
          tone: COMMAND_COLORS.blue,
          route: 'FamilyProfiles',
        },
        {
          label: t('dashboard.screens.main.kpiUpdates'),
          value: `${unreadNotifications}`,
          detail: t('dashboard.screens.main.kpiUnread'),
          icon: 'notifications-outline',
          tone: COMMAND_COLORS.teal,
          route: 'Notifications',
        },
      ];
    }

    return [
      {
        label: t('dashboard.screens.main.kpiHouseholdScore'),
        value: `${healthScore.overall}`,
        detail: t('dashboard.screens.main.kpiGrade', { grade: healthScore.grade }),
        icon: 'shield-checkmark-outline',
        tone: SCORE_COLOR(healthScore.overall),
        route: 'WeeklyReport',
      },
      {
        label: t('dashboard.screens.main.kpiOpenTasks'),
        value: `${pendingTasks}`,
        detail: overdueTasks > 0 ? t('dashboard.screens.main.kpiUrgentCount', { count: overdueTasks }) : t('dashboard.screens.main.kpiOnTrack'),
        icon: 'checkbox-outline',
        tone: overdueTasks > 0 ? COMMAND_COLORS.orange : COMMAND_COLORS.teal,
        route: 'Tasks',
      },
      {
        label: t('dashboard.screens.main.kpiBudgetStatus'),
        value: monthlyIncome > 0 ? `${savingsRate}%` : '—',
        detail: monthlySavings < 0 ? t('dashboard.screens.main.kpiNegative') : t('dashboard.screens.main.kpiSavingsRate'),
        icon: 'wallet-outline',
        tone: monthlySavings < 0 ? COMMAND_COLORS.red : COMMAND_COLORS.gold,
        route: 'Budgeting',
      },
      {
        label: t('dashboard.screens.main.kpiTodayLabel'),
        value: `${todayEvents.length}`,
        detail: t('dashboard.screens.main.kpiEventsDetail'),
        icon: 'calendar-outline',
        tone: COMMAND_COLORS.blue,
        route: 'Calendar',
      },
    ];
  }, [
    SCORE_COLOR,
    activeMember,
    activeMemberPendingTasks,
    healthScore.grade,
    healthScore.overall,
    isChild,
    isGrandparent,
    members.length,
    monthlyIncome,
    monthlySavings,
    overdueTasks,
    pendingTasks,
    savingsRate,
    todayEvents.length,
    unreadNotifications,
    t,
  ]);

  const actionItems = useMemo(() => {
    const urgentTasks = visibleTasks
      .filter((task) => task.status === 'overdue' || task.priority === 'urgent' || task.priority === 'high')
      .slice(0, 3)
      .map((task: any) => ({
        id: `task-${task.id}`,
        title: task.title,
        subtitle: task.dueDate ? t('dashboard.screens.main.dueDatePrefix', { date: format(new Date(task.dueDate), 'MMM d') }) : t('dashboard.screens.main.priorityTask'),
        icon: 'alert-circle-outline',
        tone: task.priority === 'urgent' || task.status === 'overdue' ? COMMAND_COLORS.red : COMMAND_COLORS.orange,
        route: 'Tasks',
      }));

    const urgentBills = isParent
      ? bills
          .filter((bill) => bill.status === 'overdue')
          .slice(0, 2)
          .map((bill: any) => ({
            id: `bill-${bill.id}`,
            title: bill.name ?? t('dashboard.screens.main.overdueBillFallback'),
            // Finance is a Premium feature — the urgency ("you have an overdue
            // bill") stays visible as a conversion hook, but the exact figure
            // doesn't, to stay consistent with Finance being paywalled.
            subtitle: !hasFinanceAccess
              ? t('dashboard.screens.main.upgradeToViewSubtitle')
              : bill.amount
                ? t('dashboard.screens.main.paymentNeededWithAmount', { amount: hideBalances ? '••••' : `$${Number(bill.amount).toLocaleString()}` })
                : t('dashboard.screens.main.paymentNeeded'),
            icon: 'receipt-outline',
            tone: COMMAND_COLORS.red,
            route: 'Bills',
          }))
      : [];

    const aiInsights = insights
      .filter((insight) => !insight.isRead)
      .slice(0, 1)
      .map((insight: any) => ({
        id: `insight-${insight.id}`,
        title: insight.title,
        subtitle: insight.summary,
        icon: 'sparkles-outline',
        tone: insight.priority === 'high' ? COMMAND_COLORS.orange : COMMAND_COLORS.gold,
        route: 'AIAssistant',
      }));

    const approvals = isParent && pendingJoinRequestsCount > 0
      ? [
          {
            id: 'join-requests',
            title: t('dashboard.screens.main.joinRequestsTitle', { count: pendingJoinRequestsCount }),
            subtitle: t('dashboard.screens.main.joinRequestsSubtitle'),
            icon: 'person-add-outline',
            tone: COMMAND_COLORS.blue,
            route: 'JoinRequests',
          },
        ]
      : [];

    const combined = [...urgentBills, ...approvals, ...urgentTasks, ...aiInsights];

    if (combined.length > 0) return combined.slice(0, 5);

    return [
      {
        id: 'clear',
        title: t('dashboard.screens.main.noUrgentActionsTitle'),
        subtitle: t('dashboard.screens.main.noUrgentActionsSubtitle'),
        icon: 'checkmark-circle-outline',
        tone: COMMAND_COLORS.teal,
        route: 'WeeklyReport',
      },
    ];
  }, [bills, insights, isParent, hasFinanceAccess, pendingJoinRequestsCount, visibleTasks, t]);

  const timelineItems = useMemo(() => {
    return todayEvents
      .slice()
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);
  }, [todayEvents]);

  const featuredInsight = insights.find((insight) => !insight.isRead) ?? insights[0];

  const greeting = () => {
    const hour = new Date().getHours();
    const period = hour < 12 ? t('dashboard.morning') : hour < 17 ? t('dashboard.afternoon') : t('dashboard.evening');
    return t('dashboard.greeting', { period });
  };

  const openMemberDetails = (memberId: string) => {
    navigation.navigate('Family', {
      screen: 'MemberDetails',
      params: { memberId, source: 'dashboard' },
      initial: false,
    });
  };

  const openInviteMember = () => {
    navigation.navigate('Family', {
      screen: 'FamilyProfiles',
      params: { openInviteOptions: true, source: 'dashboard' },
    });
  };

  const openFamilyMembers = () => {
    navigation.navigate('Family', {
      screen: 'FamilyProfiles',
      params: { source: 'dashboard' },
    });
  };

  const handleRoleActionPress = (route: string) => {
    if (route === 'WeeklyReport') {
      navigation.navigate('WeeklyReport');
      return;
    }

    if (route === 'Notifications') {
      navigation.navigate('Notifications');
      return;
    }

    if (route === 'Search') {
      navigation.navigate('Search');
      return;
    }

    if (route === 'Settings') {
      navigation.navigate('Settings');
      return;
    }

    if (route === 'Finance') {
      navigation.navigate('Finance');
      return;
    }

    if (route === 'Bills') {
      navigation.navigate('Finance', { screen: 'Bills', params: { source: 'dashboard' }, initial: false } as any);
      return;
    }

    if (route === 'Budgeting') {
      navigation.navigate('Finance', { screen: 'Budgeting', params: { source: 'dashboard' }, initial: false } as any);
      return;
    }

    if (route === 'AIAssistant') {
      navigation.navigate('AI Assistant', { screen: 'AIAssistant' });
      return;
    }

    if (route === 'OperationsRewards') {
      navigation.navigate('Family', {
        screen: 'Rewards',
        params: {
          memberId: activeMember?.id,
          role: activeMember?.role,
          source: 'dashboard',
        },
        initial: false,
      });
      return;
    }

    navigation.navigate('Family', {
      screen: route,
      initial: false,
      params: {
        memberId: activeMember?.id,
        role: activeMember?.role,
        source: 'dashboard',
      },
    });
  };

  const handleQuickAction = (route: string) => {
    setFabOpen(false);
    handleRoleActionPress(route);
  };

  // The household/family score already has its own hero card, so its KPI tile
  // (the one routing to the weekly report) would just repeat it.
  const snapshotCards = kpiCards.filter((item) => item.route !== 'WeeklyReport');
  const snapshotColumns = snapshotCards.length === 3 ? 3 : kpiColumns;

  const dynStyles = makeStyles(colors, snapshotColumns, contentWidth);

  const pressable = (base: any) => ({ pressed }: { pressed: boolean }) => [
    base,
    pressed && dynStyles.pressed,
  ];

  const heroMembers = members.slice(0, 5);
  const extraMembers = Math.max(0, members.length - heroMembers.length);

  const quickActions = [
    { key: 'task', label: t('dashboard.screens.main.fabAddTask'), icon: 'checkmark-done', route: 'Tasks', gradient: ['#14B8A6', '#0D9488'] as const },
    { key: 'event', label: t('dashboard.screens.main.fabAddEvent'), icon: 'calendar', route: 'Calendar', gradient: ['#3B82F6', '#2563EB'] as const },
    ...(isParent
      ? [{ key: 'expense', label: t('dashboard.screens.main.fabAddExpense'), icon: 'wallet', route: 'Budgeting', gradient: ['#F59E0B', '#D97706'] as const }]
      : []),
    { key: 'ai', label: t('dashboard.screens.main.fabAskAi'), icon: 'sparkles', route: 'AIAssistant', gradient: ['#8B5CF6', '#6D28D9'] as const },
  ];

  const progressRings = [
    { label: t('dashboard.screens.main.progressFinance'), value: healthScore.financial },
    { label: t('dashboard.screens.main.progressTasks'), value: healthScore.tasks },
    { label: t('dashboard.screens.main.progressGoals'), value: healthScore.goals },
    { label: t('dashboard.screens.main.progressWellness'), value: healthScore.health },
  ];

  return (
    <View style={dynStyles.container}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[dynStyles.scrollContent, { paddingBottom: 132 + insets.bottom }]}
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={[dynStyles.hero, { paddingTop: insets.top + 10 }]}>
          <Image
            source={require('../../assets/images/family-hero.png')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="right"
          />
          <LinearGradient
            colors={['rgba(8,17,32,0.97)', 'rgba(12,26,48,0.84)', 'rgba(14,30,54,0.3)']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(8,17,32,0.25)', 'rgba(8,17,32,0)', 'rgba(8,17,32,0.7)']}
            style={StyleSheet.absoluteFill}
          />

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={dynStyles.heroTop}>
              <Text style={dynStyles.eyebrow}>{t('dashboard.screens.main.eyebrow')}</Text>
              <View style={dynStyles.headerActions}>
                <Pressable accessibilityRole="button" style={pressable(dynStyles.headerIconBtn)} onPress={() => navigation.navigate('Search')}>
                  <Ionicons name="search" size={19} color="#fff" />
                </Pressable>
                <Pressable accessibilityRole="button" style={pressable(dynStyles.headerIconBtn)} onPress={() => navigation.navigate('Notifications')}>
                  <Ionicons name="notifications" size={19} color="#fff" />
                  {unreadNotifications > 0 && (
                    <View style={dynStyles.notifDot}>
                      <Text style={dynStyles.notifCount}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable accessibilityRole="button" style={pressable(dynStyles.headerIconBtn)} onPress={() => navigation.navigate('Settings')}>
                  <Ionicons name="settings" size={19} color="#fff" />
                </Pressable>
              </View>
            </View>

            <Text style={dynStyles.greeting}>{greeting()}</Text>
            <Text style={dynStyles.familyName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {family?.name ?? t('dashboard.screens.main.defaultFamilyName')}
            </Text>
            <Text style={dynStyles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>

            <View style={dynStyles.heroBottom}>
              {(activeMember || authUser) && (
                <Pressable
                  accessibilityRole="button"
                  style={pressable(dynStyles.activeProfileBadge)}
                  onPress={() =>
                    navigation.navigate('Family', {
                      screen: 'ProfileSwitcher',
                      params: { source: 'dashboard' },
                      initial: false,
                    })
                  }
                >
                  <Avatar
                    name={activeMember?.name ?? authUser?.displayName ?? 'Me'}
                    color={activeMember?.avatarColor ?? authUser?.avatarColor ?? '#4A8FD9'}
                    size={24}
                  />
                  <Text style={dynStyles.activeProfileName} numberOfLines={1}>
                    {activeMember?.name ?? authUser?.displayName ?? 'Me'} • {activeMember ? roleLabel : 'Parent'}
                  </Text>
                  <Ionicons name="chevron-down" size={13} color="#fff" />
                </Pressable>
              )}

              {heroMembers.length > 0 && (
                <Pressable accessibilityRole="button" onPress={openFamilyMembers} style={dynStyles.avatarStack}>
                  {heroMembers.map((member, index) => (
                    <View key={member.id} style={[dynStyles.stackItem, { marginLeft: index === 0 ? 0 : -10, zIndex: 10 - index }]}>
                      <Avatar name={member.name} color={member.avatarColor} size={30} imageUri={member.avatar} />
                    </View>
                  ))}
                  {extraMembers > 0 && (
                    <View style={[dynStyles.stackItem, dynStyles.stackMore, { marginLeft: -10 }]}>
                      <Text style={dynStyles.stackMoreText}>+{extraMembers}</Text>
                    </View>
                  )}
                </Pressable>
              )}
            </View>
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* ── Household health (overlaps the hero) ───────────────────── */}
          <Pressable
            accessibilityRole="button"
            onPress={() => handleRoleActionPress('WeeklyReport')}
            style={pressable([dynStyles.healthCard, shadows.md])}
          >
            <View style={dynStyles.healthTop}>
              <ProgressRing
                size={92}
                strokeWidth={9}
                progress={healthScore.overall / 100}
                color={operationalStatus.tone}
                trackColor={colors.border}
              >
                <Text style={dynStyles.ringValue}>{healthScore.overall}</Text>
                <Text style={dynStyles.ringCaption}>/100</Text>
              </ProgressRing>

              <View style={{ flex: 1 }}>
                <View style={[dynStyles.statusPill, { backgroundColor: operationalStatus.tone + '1F' }]}>
                  <Ionicons name={operationalStatus.icon as any} size={13} color={operationalStatus.tone} />
                  <Text style={[dynStyles.statusPillText, { color: operationalStatus.tone }]}>{operationalStatus.label}</Text>
                </View>
                <Text style={dynStyles.statusMessage}>{operationalStatus.message}</Text>
              </View>
            </View>

            <View style={dynStyles.healthStats}>
              <View style={dynStyles.healthStat}>
                <Text style={dynStyles.healthStatValue}>{pendingTasks}</Text>
                <Text style={dynStyles.healthStatLabel}>{t('dashboard.screens.main.pendingLabel')}</Text>
              </View>
              <View style={dynStyles.healthDivider} />
              <View style={dynStyles.healthStat}>
                <Text style={[dynStyles.healthStatValue, overdueTasks > 0 && { color: COMMAND_COLORS.orange }]}>{overdueTasks}</Text>
                <Text style={dynStyles.healthStatLabel}>{t('dashboard.screens.main.urgentLabel')}</Text>
              </View>
              <View style={dynStyles.healthDivider} />
              <View style={dynStyles.healthStat}>
                <Text style={[dynStyles.healthStatValue, { color: monthlySavings < 0 ? COMMAND_COLORS.red : COMMAND_COLORS.teal }]}>
                  {hideBalances ? '••••' : `$${Math.abs(monthlySavings).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                </Text>
                <Text style={dynStyles.healthStatLabel}>{monthlySavings < 0 ? t('dashboard.screens.main.deficitLabel') : t('dashboard.screens.main.savedLabel')}</Text>
              </View>
            </View>
          </Pressable>

          {/* ── Quick actions ──────────────────────────────────────────── */}
          <View style={dynStyles.quickRow}>
            {quickActions.map((action) => (
              <Pressable
                accessibilityRole="button"
                key={action.key}
                style={pressable(dynStyles.quickTile)}
                onPress={() => handleQuickAction(action.route)}
              >
                <LinearGradient colors={action.gradient} style={dynStyles.quickIcon}>
                  <Ionicons name={action.icon as any} size={22} color="#fff" />
                </LinearGradient>
                <Text style={dynStyles.quickLabel} numberOfLines={2}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* ── Family circle ──────────────────────────────────────────── */}
          <SectionHeader
            s={dynStyles}
            accent={colors.primary}
            title={t('dashboard.screens.main.familyStatusBoardTitle')}
            subtitle={t('dashboard.screens.main.familyStatusBoardSubtitle')}
            action={t('dashboard.screens.main.manageButton')}
            onAction={openFamilyMembers}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dynStyles.memberBoardScroll}>
            {members.map((member) => {
              const memberTasks = visibleTasks.filter((task: any) => task.assignedTo?.includes(member.id) && task.status === 'pending').length;
              return (
                <Pressable accessibilityRole="button" key={member.id} style={pressable(dynStyles.memberStatusCard)} onPress={() => openMemberDetails(member.id)}>
                  <LinearGradient
                    colors={[member.avatarColor + '2E', member.avatarColor + '00']}
                    style={dynStyles.memberWash}
                    pointerEvents="none"
                  />
                  <Avatar
                    name={member.name}
                    color={member.avatarColor}
                    size={58}
                    imageUri={member.avatar}
                    showBadge
                    badgeColor={member.status === 'ACTIVE' ? colors.success : colors.warning}
                  />
                  <Text style={dynStyles.memberName} numberOfLines={1}>{member.name}</Text>
                  <View style={[dynStyles.memberRolePill, { backgroundColor: member.avatarColor + '22' }]}>
                    <Text style={[dynStyles.memberRoleText, { color: colors.text }]}>{member.role}</Text>
                  </View>
                  <View style={dynStyles.memberStatsRow}>
                    <View style={dynStyles.memberChip}>
                      <Ionicons name="checkmark-circle" size={13} color={COMMAND_COLORS.teal} />
                      <Text style={dynStyles.memberChipText}>{memberTasks}</Text>
                    </View>
                    <View style={dynStyles.memberChip}>
                      <Ionicons name="star" size={12} color="#F5A623" />
                      <Text style={dynStyles.memberChipText}>{member.points?.toLocaleString?.() ?? 0}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}

            {isParent && (
              <Pressable accessibilityRole="button" style={pressable(dynStyles.inviteCard)} onPress={openInviteMember}>
                <View style={dynStyles.inviteIcon}>
                  <Ionicons name="person-add" size={20} color={colors.primary} />
                </View>
                <Text style={dynStyles.inviteTitle}>{t('dashboard.screens.main.inviteTitle')}</Text>
                <Text style={dynStyles.inviteSubtitle} numberOfLines={2}>{t('dashboard.screens.main.inviteSubtitle')}</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* ── Today's snapshot ───────────────────────────────────────── */}
          <View style={dynStyles.kpiGrid}>
            {snapshotCards.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.label}
                style={pressable([dynStyles.kpiCard, shadows.sm])}
                onPress={() => handleRoleActionPress(item.route)}
              >
                <View style={dynStyles.kpiTop}>
                  <View style={[dynStyles.kpiIcon, { backgroundColor: item.tone + '1A' }]}>
                    <Ionicons name={item.icon.replace('-outline', '') as any} size={18} color={item.tone} />
                  </View>
                  <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                </View>
                <Text style={dynStyles.kpiValue}>{item.value}</Text>
                <Text style={dynStyles.kpiLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={[dynStyles.kpiDetail, { color: item.tone }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{item.detail}</Text>
              </Pressable>
            ))}
          </View>

          <DailyBriefCard />

          {/* ── Action center ──────────────────────────────────────────── */}
          <SectionHeader
            s={dynStyles}
            accent={colors.primary}
            title={t('dashboard.screens.main.actionCenterTitle')}
            subtitle={t('dashboard.screens.main.actionCenterSubtitle')}
            action={t('dashboard.screens.main.review')}
            onAction={() => handleRoleActionPress('Tasks')}
          />

          <View style={dynStyles.actionStack}>
            {actionItems.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.id}
                onPress={() => handleRoleActionPress(item.route)}
                style={pressable([dynStyles.actionCard, { backgroundColor: item.tone + '0D', borderColor: item.tone + '33' }])}
              >
                <View style={[dynStyles.actionIcon, { backgroundColor: item.tone + '24' }]}>
                  <Ionicons name={item.icon.replace('-outline', '') as any} size={19} color={item.tone} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={dynStyles.actionTitle}>{item.title}</Text>
                  <Text style={dynStyles.actionSubtitle} numberOfLines={2}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>

          {/* ── Timeline ───────────────────────────────────────────────── */}
          <SectionHeader
            s={dynStyles}
            accent={colors.primary}
            title={isChild ? t('dashboard.screens.main.myTimeline') : t('dashboard.screens.main.todayTimeline')}
            subtitle={t('dashboard.screens.main.timelineSubtitle')}
            action={t('dashboard.screens.main.calendarButton')}
            onAction={() => handleRoleActionPress('Calendar')}
          />

          <View style={[dynStyles.timelinePanel, shadows.sm]}>
            {timelineItems.length > 0 ? (
              timelineItems.map((event, index) => (
                <Pressable accessibilityRole="button" key={event.id} onPress={() => handleRoleActionPress('Calendar')} style={pressable(dynStyles.timelineRow)}>
                  <Text style={dynStyles.timelineTime}>{event.allDay ? t('dashboard.screens.main.allDay') : format(new Date(event.startDate), 'h:mm a')}</Text>
                  <View style={dynStyles.timelineRail}>
                    <View style={[dynStyles.timelineDot, { backgroundColor: event.color ?? COMMAND_COLORS.gold }]} />
                    {index < timelineItems.length - 1 && <View style={dynStyles.timelineLine} />}
                  </View>
                  <View style={dynStyles.timelineContent}>
                    <Text style={dynStyles.timelineTitle}>{event.title}</Text>
                    <Text style={dynStyles.timelineMeta} numberOfLines={1}>
                      {event.location ? event.location : t('dashboard.screens.main.attendeeCount', { count: event.attendees?.length ?? 0 })}
                    </Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <Pressable accessibilityRole="button" style={dynStyles.emptyPanel} onPress={() => handleRoleActionPress('Calendar')}>
                <View style={dynStyles.emptyIcon}>
                  <Ionicons name="calendar-clear" size={26} color={colors.primary} />
                </View>
                <Text style={dynStyles.emptyTitle}>{t('dashboard.screens.main.noScheduledEventsTitle')}</Text>
                <Text style={dynStyles.emptyText}>{t('dashboard.screens.main.noScheduledEventsDesc')}</Text>
              </Pressable>
            )}
          </View>

          {/* ── Finance snapshot ───────────────────────────────────────── */}
          {isParent && (
            <>
              <SectionHeader
            s={dynStyles}
            accent={colors.primary}
                title={t('dashboard.screens.main.financeSnapshotTitle')}
                subtitle={t('dashboard.screens.main.financeSnapshotSubtitle')}
                action={t('dashboard.screens.main.openButton')}
                onAction={() => handleRoleActionPress('Finance')}
              />

              <Pressable
                accessibilityRole="button"
                style={pressable([dynStyles.financeCard, shadows.md])}
                onPress={() => (hasFinanceAccess ? handleRoleActionPress('Finance') : showPaywall('premium'))}
              >
                <LinearGradient
                  colors={['#0B1F3F', '#12376B', '#0E6B72']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={dynStyles.financeGradient}
                >
                  <View style={dynStyles.financeTopRow}>
                    <View>
                      <Text style={dynStyles.financeTitle}>{t('dashboard.screens.main.monthlyCashFlow')}</Text>
                      <Text style={dynStyles.financeSubtitle}>{t('dashboard.screens.main.savingsRatePercent', { rate: savingsRate })}</Text>
                    </View>
                    <View style={[dynStyles.financeBadge, { backgroundColor: monthlySavings < 0 ? COMMAND_COLORS.red + '33' : COMMAND_COLORS.teal + '33' }]}>
                      <Text style={[dynStyles.financeBadgeText, { color: monthlySavings < 0 ? '#FCA5A5' : '#5EEAD4' }]}>
                        {monthlySavings < 0 ? t('dashboard.screens.main.deficitBadge') : t('dashboard.screens.main.positiveBadge')}
                      </Text>
                    </View>
                  </View>

                  <View style={dynStyles.financeMetricRow}>
                    <View style={dynStyles.financeMetric}>
                      <Text style={dynStyles.financeMetricLabel}>{t('dashboard.screens.main.incomeLabel')}</Text>
                      <Text style={dynStyles.financeMetricValue} numberOfLines={1} adjustsFontSizeToFit>{maskAmount(monthlyIncome)}</Text>
                    </View>
                    <View style={dynStyles.financeMetric}>
                      <Text style={dynStyles.financeMetricLabel}>{t('dashboard.screens.main.expensesLabel')}</Text>
                      <Text style={dynStyles.financeMetricValue} numberOfLines={1} adjustsFontSizeToFit>{maskAmount(monthlyExpenses)}</Text>
                    </View>
                    <View style={dynStyles.financeMetric}>
                      <Text style={dynStyles.financeMetricLabel}>{t('dashboard.screens.main.savingsLabel')}</Text>
                      <Text style={dynStyles.financeMetricValue} numberOfLines={1} adjustsFontSizeToFit>{maskAmount(monthlySavings)}</Text>
                    </View>
                  </View>

                  <View style={dynStyles.progressLabelRow}>
                    <Text style={dynStyles.progressLabel}>{t('dashboard.screens.main.expenseLoadLabel')}</Text>
                    <Text style={dynStyles.progressValue}>{Math.round(expenseRate * 100)}%</Text>
                  </View>
                  <ProgressBar
                    progress={expenseRate}
                    color={expenseRate > 0.85 ? COMMAND_COLORS.orange : '#2DD4BF'}
                    backgroundColor="rgba(255,255,255,0.14)"
                    height={8}
                  />
                </LinearGradient>

                {!hasFinanceAccess && (
                  <>
                    {/* Solid scrim first — expo-blur's Android blur is
                        experimental/opt-in and renders as a near-invisible
                        tint by default, so the BlurView alone isn't enough
                        contrast on Android to read as "locked" the way it
                        does on iOS. */}
                    <View style={dynStyles.financeLockScrim} />
                    <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={dynStyles.financeLockOverlay} pointerEvents="none">
                      <View style={dynStyles.financeLockIconCircle}>
                        <Ionicons name="lock-closed" size={18} color="#fff" />
                      </View>
                      <Text style={dynStyles.financeLockText}>{t('dashboard.screens.main.upgradeToPremium')}</Text>
                    </View>
                  </>
                )}
              </Pressable>
            </>
          )}

          {/* ── Commander AI ───────────────────────────────────────────── */}
          <SectionHeader
            s={dynStyles}
            accent={colors.primary}
            title={t('dashboard.screens.main.commanderAiTitle')}
            subtitle={t('dashboard.screens.main.commanderAiSubtitle')}
            action={t('dashboard.screens.main.askAiButton')}
            onAction={() => handleRoleActionPress('AIAssistant')}
          />

          <Pressable accessibilityRole="button" onPress={() => handleRoleActionPress('AIAssistant')} style={pressable([dynStyles.aiCard, shadows.md])}>
            <LinearGradient colors={['#1D2F6F', '#4C2A9B', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={dynStyles.aiGradient}>
              <View style={dynStyles.aiGlow} pointerEvents="none" />
              <View style={dynStyles.aiTopRow}>
                <View style={dynStyles.aiIconWrap}>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={dynStyles.aiTitle}>{featuredInsight?.title ?? t('dashboard.screens.main.aiDefaultTitle')}</Text>
                  <Text style={dynStyles.aiText} numberOfLines={3}>
                    {featuredInsight?.summary ??
                      (isParent
                        ? t('dashboard.screens.main.aiParentText')
                        : isChild
                          ? t('dashboard.screens.main.aiChildText')
                          : t('dashboard.screens.main.aiOtherText'))}
                  </Text>
                </View>
              </View>
              <View style={dynStyles.aiActionRow}>
                <Text style={dynStyles.aiActionText}>{t('dashboard.screens.main.openCommanderAi')}</Text>
                <Ionicons name="arrow-forward" size={15} color="#4C2A9B" />
              </View>
            </LinearGradient>
          </Pressable>

          <MemoryOfTheDayCard onPress={() => navigation.navigate('Family', { screen: 'FamilyTimeline', initial: false } as never)} />

          <StreakCounterCard onPress={() => navigation.navigate('Family', { screen: 'Habits', initial: false } as never)} />
          <ChoreLeaderboardCard onPress={() => navigation.navigate('Family', { screen: 'Tasks', initial: false } as never)} />

          {/* ── Weekly progress ────────────────────────────────────────── */}
          <SectionHeader
            s={dynStyles}
            accent={colors.primary}
            title={t('dashboard.screens.main.weeklyProgressTitle')}
            subtitle={t('dashboard.screens.main.weeklyProgressSubtitle')}
            action={t('dashboard.screens.main.reportButton')}
            onAction={() => handleRoleActionPress('WeeklyReport')}
          />

          <View style={[dynStyles.progressCard, shadows.sm]}>
            {progressRings.map((item) => (
              <View key={item.label} style={dynStyles.ringItem}>
                <ProgressRing
                  size={64}
                  strokeWidth={7}
                  progress={item.value / 100}
                  color={SCORE_COLOR(item.value)}
                  trackColor={colors.border}
                >
                  <Text style={[dynStyles.ringSmallValue, { color: SCORE_COLOR(item.value) }]}>{item.value}%</Text>
                </ProgressRing>
                <Text style={dynStyles.ringLabel} numberOfLines={1}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {fabOpen && (
        <View style={[dynStyles.fabMenu, { bottom: 92 + insets.bottom }]}>
          {[
            { label: t('dashboard.screens.main.fabAddTask'), icon: 'checkbox-outline', route: 'Tasks' },
            { label: t('dashboard.screens.main.fabAddEvent'), icon: 'calendar-outline', route: 'Calendar' },
            ...(isParent ? [{ label: t('dashboard.screens.main.fabAddExpense'), icon: 'wallet-outline', route: 'Budgeting' }] : []),
            { label: t('dashboard.screens.main.fabAskAi'), icon: 'sparkles-outline', route: 'AIAssistant' },
          ].map((item) => (
            <Pressable accessibilityRole="button" key={item.label} style={dynStyles.fabMenuItem} onPress={() => handleQuickAction(item.route)}>
              <Text style={dynStyles.fabMenuLabel}>{item.label}</Text>
              <View style={dynStyles.fabMiniIcon}>
                <Ionicons name={item.icon as any} size={17} color="#fff" />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable accessibilityRole="button" style={[dynStyles.fab, { bottom: 24 + insets.bottom }]} onPress={() => setFabOpen((prev) => !prev)}>
        <Ionicons name={fabOpen ? 'close' : 'add'} size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

function SectionHeader({
  s,
  accent,
  title,
  subtitle,
  action,
  onAction,
}: {
  s: ReturnType<typeof makeStyles>;
  accent: string;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {!!action && (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [s.sectionButton, pressed && s.pressed]}
          hitSlop={8}
        >
          <Text style={s.sectionButtonText}>{action}</Text>
          <Ionicons name="chevron-forward" size={13} color={accent} />
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(colors: import('../../theme/ThemeContext').ThemeColors, kpiColumns: number, contentWidth: number) {
  // 36 = the kpiGrid's paddingHorizontal (18 * 2); gaps between columns are
  // 12pt each, and there's one fewer gap than there are columns.
  const cardWidth = (contentWidth - 36 - (kpiColumns - 1) * 12) / kpiColumns;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 132,
      // Centers and caps content width on tablets instead of stretching
      // every card/row edge-to-edge across a 13" iPad — see
      // useResponsiveLayout's MAX_CONTENT_WIDTH.
      width: '100%',
      maxWidth: contentWidth,
      alignSelf: 'center',
    },
    pressed: {
      opacity: 0.92,
      transform: [{ scale: 0.985 }],
    },

    // ── Hero ──────────────────────────────────────────────────────────
    hero: {
      paddingHorizontal: 18,
      paddingBottom: 66,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      overflow: 'hidden',
      backgroundColor: COMMAND_COLORS.navy900,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
      gap: 8,
    },
    eyebrow: {
      color: COMMAND_COLORS.gold,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.3,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    headerIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    notifDot: {
      position: 'absolute',
      top: -5,
      right: -5,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: COMMAND_COLORS.red,
      borderWidth: 2,
      borderColor: COMMAND_COLORS.navy800,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    notifCount: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '900',
    },
    greeting: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    familyName: {
      color: '#fff',
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '900',
      letterSpacing: -0.8,
      marginTop: 2,
    },
    dateText: {
      color: 'rgba(255,255,255,0.66)',
      fontSize: 12.5,
      fontWeight: '600',
      marginTop: 4,
    },
    heroBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 16,
    },
    activeProfileBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      flexShrink: 1,
    },
    activeProfileName: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
      flexShrink: 1,
    },
    avatarStack: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stackItem: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 2,
      borderColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: '#fff',
    },
    stackMore: {
      backgroundColor: 'rgba(255,255,255,0.28)',
      borderColor: 'rgba(255,255,255,0.6)',
    },
    stackMoreText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '800',
    },

    // ── Household health card ─────────────────────────────────────────
    healthCard: {
      marginHorizontal: 18,
      marginTop: -46,
      backgroundColor: colors.card,
      borderRadius: 26,
      padding: 18,
    },
    healthTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    ringValue: {
      fontSize: 28,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -1,
    },
    ringCaption: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      marginTop: -2,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    statusPillText: {
      fontSize: 12.5,
      fontWeight: '800',
    },
    statusMessage: {
      fontSize: 13.5,
      lineHeight: 19,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 8,
    },
    healthStats: {
      flexDirection: 'row',
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    healthStat: {
      flex: 1,
      alignItems: 'center',
    },
    healthStatValue: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.4,
    },
    healthStatLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 2,
    },
    healthDivider: {
      width: 1,
      height: 30,
      alignSelf: 'center',
      backgroundColor: colors.border,
    },

    // ── Quick actions ─────────────────────────────────────────────────
    quickRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 18,
      marginTop: 18,
    },
    quickTile: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    quickIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLabel: {
      fontSize: 11.5,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },

    // ── Section headers ───────────────────────────────────────────────
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 18,
      marginTop: 26,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 19,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.4,
    },
    sectionSubtitle: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },
    sectionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.primary + '14',
    },
    sectionButtonText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: colors.primary,
    },

    // ── Family circle ─────────────────────────────────────────────────
    memberBoardScroll: {
      paddingHorizontal: 18,
      paddingBottom: 6,
      gap: 12,
    },
    memberStatusCard: {
      width: 138,
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 14,
      alignItems: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    memberWash: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 84,
    },
    memberName: {
      marginTop: 10,
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      maxWidth: '100%',
    },
    memberRolePill: {
      marginTop: 6,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
    },
    memberRoleText: {
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    memberStatsRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 12,
    },
    memberChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    memberChipText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
    },
    inviteCard: {
      width: 138,
      borderRadius: 24,
      padding: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.border,
    },
    inviteIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.primary + '14',
      alignItems: 'center',
      justifyContent: 'center',
    },
    inviteTitle: {
      marginTop: 10,
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    inviteSubtitle: {
      marginTop: 2,
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
    },

    // ── Today's snapshot ──────────────────────────────────────────────
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingHorizontal: 18,
      marginTop: 22,
    },
    kpiCard: {
      width: cardWidth,
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    kpiTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    kpiIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kpiValue: {
      fontSize: 28,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -1,
      marginTop: 12,
    },
    kpiLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 1,
    },
    kpiDetail: {
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 6,
    },

    // ── Action center ─────────────────────────────────────────────────
    actionStack: {
      paddingHorizontal: 18,
      gap: 10,
    },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 20,
      borderWidth: 1,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionTitle: {
      fontSize: 14.5,
      fontWeight: '800',
      color: colors.text,
    },
    actionSubtitle: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },

    // ── Timeline ──────────────────────────────────────────────────────
    timelinePanel: {
      marginHorizontal: 18,
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timelineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 8,
      gap: 10,
    },
    timelineTime: {
      width: 62,
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
      marginTop: 2,
    },
    timelineRail: {
      width: 14,
      alignItems: 'center',
      alignSelf: 'stretch',
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 3,
    },
    timelineLine: {
      flex: 1,
      width: 2,
      minHeight: 24,
      marginTop: 4,
      borderRadius: 1,
      backgroundColor: colors.border,
    },
    timelineContent: {
      flex: 1,
    },
    timelineTitle: {
      fontSize: 14.5,
      fontWeight: '800',
      color: colors.text,
    },
    timelineMeta: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyPanel: {
      alignItems: 'center',
      paddingVertical: 26,
      gap: 6,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary + '12',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    emptyText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 24,
    },

    // ── Finance snapshot ──────────────────────────────────────────────
    financeCard: {
      marginHorizontal: 18,
      borderRadius: 26,
      overflow: 'hidden',
    },
    financeGradient: {
      padding: 18,
    },
    financeTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    financeTitle: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '900',
    },
    financeSubtitle: {
      color: 'rgba(255,255,255,0.68)',
      fontSize: 12.5,
      fontWeight: '600',
      marginTop: 2,
    },
    financeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    financeBadgeText: {
      fontSize: 11.5,
      fontWeight: '900',
    },
    financeMetricRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    financeMetric: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      padding: 10,
    },
    financeMetricLabel: {
      color: 'rgba(255,255,255,0.64)',
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    financeMetricValue: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '900',
      marginTop: 4,
    },
    progressLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    progressLabel: {
      color: 'rgba(255,255,255,0.72)',
      fontSize: 12,
      fontWeight: '700',
    },
    progressValue: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '900',
    },
    financeLockScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(13,33,55,0.82)',
    },
    financeLockOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    financeLockIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    financeLockText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },

    // ── Commander AI ──────────────────────────────────────────────────
    aiCard: {
      marginHorizontal: 18,
      borderRadius: 26,
      overflow: 'hidden',
    },
    aiGradient: {
      padding: 18,
      overflow: 'hidden',
    },
    aiGlow: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: '#fff',
      opacity: 0.08,
      right: -50,
      top: -60,
    },
    aiTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    aiIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiTitle: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '900',
    },
    aiText: {
      color: 'rgba(255,255,255,0.84)',
      fontSize: 13.5,
      lineHeight: 19,
      fontWeight: '600',
      marginTop: 4,
    },
    aiActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      marginTop: 16,
      backgroundColor: '#fff',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
    },
    aiActionText: {
      color: '#4C2A9B',
      fontSize: 13,
      fontWeight: '900',
    },

    // ── Weekly progress ───────────────────────────────────────────────
    progressCard: {
      marginHorizontal: 18,
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 16,
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
    },
    ringItem: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
    },
    ringSmallValue: {
      fontSize: 14,
      fontWeight: '900',
    },
    ringLabel: {
      fontSize: 11.5,
      fontWeight: '800',
      color: colors.textSecondary,
    },

    // ── Floating action button ────────────────────────────────────────
    fab: {
      position: 'absolute',
      right: 22,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: COMMAND_COLORS.gold,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.22,
      shadowRadius: 18,
      elevation: 12,
    },
    fabMenu: {
      position: 'absolute',
      right: 22,
      gap: 10,
      alignItems: 'flex-end',
    },
    fabMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    fabMenuLabel: {
      color: '#fff',
      backgroundColor: COMMAND_COLORS.navy800,
      borderRadius: 999,
      overflow: 'hidden',
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 12,
      fontWeight: '900',
    },
    fabMiniIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COMMAND_COLORS.navy700,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
