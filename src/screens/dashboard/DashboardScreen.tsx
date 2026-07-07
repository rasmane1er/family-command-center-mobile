import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';

import { useJoinRequestsStore } from '../../store/useJoinRequestsStore';
import { useAppStore } from '../../store/useAppStore';
import { useFinancialHealth } from '../../hooks/useFinancialHealth';
import { useSubscription } from '../../hooks/useSubscription';
import { usePurchases } from '../../hooks/usePurchases';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useAIStore } from '../../store/useAIStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useNotificationsStore } from '../../store/useNotificationsStore';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { shadows } from '../../theme/spacing';
import { getVisibleTasks, getVisibleEvents } from '../../utils/roleVisibility';
import { getAllowedNotificationTypes } from '../../utils/roleFilters';

const { width } = Dimensions.get('window');

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
  const activeMember = members.find((member) => member.id === activeMemberId);
  const fetchFamilyFromServer = useFamilyStore((s) => s.fetchFromServer);
  const hydrateEvents = useFamilyStore((s) => s.hydrateEvents);

  // Home is often the very first screen opened after launch — nothing else
  // may have hydrated family/members/tasks/events yet, so this dashboard
  // would otherwise show whatever was last cached locally (or nothing) until
  // the user happened to visit another tab that hydrates them.
  useEffect(() => {
    fetchFamilyFromServer();
    hydrateEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              : bill.amount ? t('dashboard.screens.main.paymentNeededWithAmount', { amount: `$${Number(bill.amount).toLocaleString()}` }) : t('dashboard.screens.main.paymentNeeded'),
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

  const dynStyles = makeStyles(colors);

  return (
    <View style={dynStyles.container}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[dynStyles.scrollContent, { paddingBottom: 132 + insets.bottom }]}
      >
        <LinearGradient
          colors={[COMMAND_COLORS.navy900, COMMAND_COLORS.navy800, COMMAND_COLORS.navy700]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[dynStyles.header, { paddingTop: insets.top + 12 }]}
        >
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={dynStyles.headerGlowGold} />
            <View style={dynStyles.headerGlowTeal} />
          </View>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={dynStyles.headerTop}>
              <View style={dynStyles.headerIdentity}>
                <Text style={dynStyles.eyebrow}>{t('dashboard.screens.main.eyebrow')}</Text>
                <Text style={dynStyles.greeting}>{greeting()}</Text>
                <Text style={dynStyles.familyName} numberOfLines={1} ellipsizeMode="tail">
                  {family?.name ?? t('dashboard.screens.main.defaultFamilyName')}
                </Text>
                <Text style={dynStyles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>

                {activeMember && (
                  <Pressable
                    style={dynStyles.activeProfileBadge}
                    onPress={() =>
                      navigation.navigate('Family', {
                        screen: 'ProfileSwitcher',
                        params: { source: 'dashboard' },
                        initial: false,
                      })
                    }
                  >
                    <Avatar name={activeMember.name} color={activeMember.avatarColor} size={24} />
                    <Text style={dynStyles.activeProfileName} numberOfLines={1}>
                      {activeMember.name} • {roleLabel}
                    </Text>
                    <Ionicons name="chevron-down" size={13} color="#fff" />
                  </Pressable>
                )}
              </View>

              <View style={dynStyles.headerActions}>
                <Pressable style={dynStyles.headerIconBtn} onPress={() => navigation.navigate('Search')}>
                  <Ionicons name="search-outline" size={20} color="#fff" />
                </Pressable>

                <Pressable style={dynStyles.headerIconBtn} onPress={() => navigation.navigate('Notifications')}>
                  <Ionicons name="notifications-outline" size={20} color="#fff" />
                  {unreadNotifications > 0 && (
                    <View style={dynStyles.notifDot}>
                      <Text style={dynStyles.notifCount}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable style={dynStyles.headerIconBtn} onPress={() => navigation.navigate('Settings')}>
                  <Ionicons name="settings-outline" size={20} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={dynStyles.smartStatusCard}>
              <View style={[dynStyles.statusIcon, { backgroundColor: operationalStatus.tone + '22' }]}> 
                <Ionicons name={operationalStatus.icon as any} size={18} color={operationalStatus.tone} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dynStyles.statusLabel}>{operationalStatus.label}</Text>
                <Text style={dynStyles.statusMessage}>{operationalStatus.message}</Text>
              </View>
              <Text style={dynStyles.statusScore}>{healthScore.overall}</Text>
            </View>

            <View style={dynStyles.smartBar}>
              <View style={dynStyles.smartBarItem}>
                <Text style={dynStyles.smartBarValue}>{pendingTasks}</Text>
                <Text style={dynStyles.smartBarLabel}>{t('dashboard.screens.main.pendingLabel')}</Text>
              </View>
              <View style={dynStyles.smartBarDivider} />
              <View style={dynStyles.smartBarItem}>
                <Text style={[dynStyles.smartBarValue, overdueTasks > 0 && { color: COMMAND_COLORS.orange }]}>{overdueTasks}</Text>
                <Text style={dynStyles.smartBarLabel}>{t('dashboard.screens.main.urgentLabel')}</Text>
              </View>
              <View style={dynStyles.smartBarDivider} />
              <View style={dynStyles.smartBarItem}>
                <Text style={[dynStyles.smartBarValue, { color: monthlySavings < 0 ? COMMAND_COLORS.red : COMMAND_COLORS.teal }]}>${Math.abs(monthlySavings).toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
                <Text style={dynStyles.smartBarLabel}>{monthlySavings < 0 ? t('dashboard.screens.main.deficitLabel') : t('dashboard.screens.main.savedLabel')}</Text>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={dynStyles.kpiGrid}>
            {kpiCards.map((item) => (
              <Pressable
                key={item.label}
                style={[dynStyles.kpiCard, shadows.sm]}
                onPress={() => handleRoleActionPress(item.route)}
              >
                <View style={[dynStyles.kpiIcon, { backgroundColor: item.tone + '16' }]}> 
                  <Ionicons name={item.icon as any} size={18} color={item.tone} />
                </View>
                <Text style={dynStyles.kpiValue}>{item.value}</Text>
                <Text style={dynStyles.kpiLabel}>{item.label}</Text>
                <Text style={[dynStyles.kpiDetail, { color: item.tone }]}>{item.detail}</Text>
              </Pressable>
            ))}
          </View>

          <View style={dynStyles.sectionHeader}>
            <View>
              <Text style={dynStyles.sectionTitle}>{t('dashboard.screens.main.actionCenterTitle')}</Text>
              <Text style={dynStyles.sectionSubtitle}>{t('dashboard.screens.main.actionCenterSubtitle')}</Text>
            </View>
            <Pressable onPress={() => handleRoleActionPress('Tasks')} style={dynStyles.sectionButton}>
              <Text style={dynStyles.sectionButtonText}>{t('dashboard.screens.main.review')}</Text>
            </Pressable>
          </View>

          <View style={dynStyles.actionStack}>
            {actionItems.map((item) => (
              <Pressable key={item.id} onPress={() => handleRoleActionPress(item.route)} style={dynStyles.actionCard}>
                <View style={[dynStyles.actionIcon, { backgroundColor: item.tone + '16' }]}> 
                  <Ionicons name={item.icon as any} size={18} color={item.tone} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={dynStyles.actionTitle}>{item.title}</Text>
                  <Text style={dynStyles.actionSubtitle} numberOfLines={2}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>

          <View style={dynStyles.sectionHeader}>
            <View>
              <Text style={dynStyles.sectionTitle}>{isChild ? t('dashboard.screens.main.myTimeline') : t('dashboard.screens.main.todayTimeline')}</Text>
              <Text style={dynStyles.sectionSubtitle}>{t('dashboard.screens.main.timelineSubtitle')}</Text>
            </View>
            <Pressable onPress={() => handleRoleActionPress('Calendar')} style={dynStyles.sectionButton}>
              <Text style={dynStyles.sectionButtonText}>{t('dashboard.screens.main.calendarButton')}</Text>
            </Pressable>
          </View>

          <View style={dynStyles.timelinePanel}>
            {timelineItems.length > 0 ? (
              timelineItems.map((event, index) => (
                <Pressable key={event.id} onPress={() => handleRoleActionPress('Calendar')} style={dynStyles.timelineRow}>
                  <View style={dynStyles.timelineLeft}>
                    <Text style={dynStyles.timelineTime}>{event.allDay ? t('dashboard.screens.main.allDay') : format(new Date(event.startDate), 'h:mm a')}</Text>
                    {index < timelineItems.length - 1 && <View style={dynStyles.timelineLine} />}
                  </View>
                  <View style={dynStyles.timelineDotWrap}>
                    <View style={[dynStyles.timelineDot, { backgroundColor: event.color ?? COMMAND_COLORS.gold }]} />
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
              <Pressable style={dynStyles.emptyPanel} onPress={() => handleRoleActionPress('Calendar')}>
                <Ionicons name="calendar-clear-outline" size={28} color={colors.textMuted} />
                <Text style={dynStyles.emptyTitle}>{t('dashboard.screens.main.noScheduledEventsTitle')}</Text>
                <Text style={dynStyles.emptyText}>{t('dashboard.screens.main.noScheduledEventsDesc')}</Text>
              </Pressable>
            )}
          </View>

          <View style={dynStyles.sectionHeader}>
            <View>
              <Text style={dynStyles.sectionTitle}>{t('dashboard.screens.main.familyStatusBoardTitle')}</Text>
              <Text style={dynStyles.sectionSubtitle}>{t('dashboard.screens.main.familyStatusBoardSubtitle')}</Text>
            </View>
            <Pressable onPress={openFamilyMembers} style={dynStyles.sectionButton}>
              <Text style={dynStyles.sectionButtonText}>{t('dashboard.screens.main.manageButton')}</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dynStyles.memberBoardScroll}>
            {members.map((member) => {
              const memberTasks = visibleTasks.filter((task: any) => task.assignedTo?.includes(member.id) && task.status === 'pending').length;
              return (
                <Pressable key={member.id} style={dynStyles.memberStatusCard} onPress={() => openMemberDetails(member.id)}>
                  <View style={dynStyles.memberTopRow}>
                    <Avatar
                      name={member.name}
                      color={member.avatarColor}
                      size={44}
                      showBadge
                      badgeColor={member.status === 'active' ? colors.success : colors.warning}
                    />
                    <View style={[dynStyles.memberRolePill, { backgroundColor: colors.primary + '12' }]}> 
                      <Text style={[dynStyles.memberRoleText, { color: colors.primary }]}>{member.role}</Text>
                    </View>
                  </View>
                  <Text style={dynStyles.memberName} numberOfLines={1}>{member.name}</Text>
                  <Text style={dynStyles.memberStatusText}>{t('dashboard.screens.main.pendingTaskCount', { count: memberTasks })}</Text>
                  <View style={dynStyles.memberFooter}>
                    <Ionicons name="trophy-outline" size={13} color={COMMAND_COLORS.gold} />
                    <Text style={dynStyles.memberPoints}>{member.points?.toLocaleString?.() ?? 0} pts</Text>
                  </View>
                </Pressable>
              );
            })}

            {isParent && (
              <Pressable style={dynStyles.inviteCard} onPress={openInviteMember}>
                <View style={dynStyles.inviteIcon}>
                  <Ionicons name="add" size={22} color={colors.primary} />
                </View>
                <Text style={dynStyles.inviteTitle}>{t('dashboard.screens.main.inviteTitle')}</Text>
                <Text style={dynStyles.inviteSubtitle}>{t('dashboard.screens.main.inviteSubtitle')}</Text>
              </Pressable>
            )}
          </ScrollView>

          {isParent && (
            <>
              <View style={dynStyles.sectionHeader}>
                <View>
                  <Text style={dynStyles.sectionTitle}>{t('dashboard.screens.main.financeSnapshotTitle')}</Text>
                  <Text style={dynStyles.sectionSubtitle}>{t('dashboard.screens.main.financeSnapshotSubtitle')}</Text>
                </View>
                <Pressable onPress={() => handleRoleActionPress('Finance')} style={dynStyles.sectionButton}>
                  <Text style={dynStyles.sectionButtonText}>{t('dashboard.screens.main.openButton')}</Text>
                </Pressable>
              </View>

              <Pressable
                style={dynStyles.financeCard}
                onPress={() => (hasFinanceAccess ? handleRoleActionPress('Finance') : showPaywall('premium'))}
              >
                <LinearGradient colors={[COMMAND_COLORS.navy800, COMMAND_COLORS.navy700]} style={dynStyles.financeGradient}>
                  <View style={dynStyles.financeTopRow}>
                    <View>
                      <Text style={dynStyles.financeTitle}>{t('dashboard.screens.main.monthlyCashFlow')}</Text>
                      <Text style={dynStyles.financeSubtitle}>{t('dashboard.screens.main.savingsRatePercent', { rate: savingsRate })}</Text>
                    </View>
                    <View style={[dynStyles.financeBadge, { backgroundColor: monthlySavings < 0 ? COMMAND_COLORS.red + '22' : COMMAND_COLORS.teal + '22' }]}>
                      <Text style={[dynStyles.financeBadgeText, { color: monthlySavings < 0 ? COMMAND_COLORS.red : COMMAND_COLORS.teal }]}>
                        {monthlySavings < 0 ? t('dashboard.screens.main.deficitBadge') : t('dashboard.screens.main.positiveBadge')}
                      </Text>
                    </View>
                  </View>

                  <View style={dynStyles.financeMetricRow}>
                    <View style={dynStyles.financeMetric}>
                      <Text style={dynStyles.financeMetricLabel}>{t('dashboard.screens.main.incomeLabel')}</Text>
                      <Text style={dynStyles.financeMetricValue}>{maskAmount(monthlyIncome)}</Text>
                    </View>
                    <View style={dynStyles.financeMetric}>
                      <Text style={dynStyles.financeMetricLabel}>{t('dashboard.screens.main.expensesLabel')}</Text>
                      <Text style={dynStyles.financeMetricValue}>{maskAmount(monthlyExpenses)}</Text>
                    </View>
                    <View style={dynStyles.financeMetric}>
                      <Text style={dynStyles.financeMetricLabel}>{t('dashboard.screens.main.savingsLabel')}</Text>
                      <Text style={dynStyles.financeMetricValue}>{maskAmount(monthlySavings)}</Text>
                    </View>
                  </View>

                  <View style={dynStyles.progressLabelRow}>
                    <Text style={dynStyles.progressLabel}>{t('dashboard.screens.main.expenseLoadLabel')}</Text>
                    <Text style={dynStyles.progressValue}>{Math.round(expenseRate * 100)}%</Text>
                  </View>
                  <ProgressBar
                    progress={expenseRate}
                    color={expenseRate > 0.85 ? COMMAND_COLORS.orange : COMMAND_COLORS.teal}
                    backgroundColor="rgba(255,255,255,0.12)"
                    height={7}
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

          <View style={dynStyles.sectionHeader}>
            <View>
              <Text style={dynStyles.sectionTitle}>{t('dashboard.screens.main.commanderAiTitle')}</Text>
              <Text style={dynStyles.sectionSubtitle}>{t('dashboard.screens.main.commanderAiSubtitle')}</Text>
            </View>
            <Pressable onPress={() => handleRoleActionPress('AIAssistant')} style={dynStyles.sectionButton}>
              <Text style={dynStyles.sectionButtonText}>{t('dashboard.screens.main.askAiButton')}</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => handleRoleActionPress('AIAssistant')} style={dynStyles.aiCard}>
            <LinearGradient colors={[COMMAND_COLORS.navy900, COMMAND_COLORS.navy700]} style={dynStyles.aiGradient}>
              <View style={dynStyles.aiTopRow}>
                <View style={dynStyles.aiIconWrap}>
                  <Ionicons name="sparkles-outline" size={20} color={COMMAND_COLORS.gold} />
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
                <Ionicons name="arrow-forward" size={16} color={COMMAND_COLORS.gold} />
              </View>
            </LinearGradient>
          </Pressable>

          <View style={dynStyles.sectionHeader}>
            <View>
              <Text style={dynStyles.sectionTitle}>{t('dashboard.screens.main.weeklyProgressTitle')}</Text>
              <Text style={dynStyles.sectionSubtitle}>{t('dashboard.screens.main.weeklyProgressSubtitle')}</Text>
            </View>
            <Pressable onPress={() => handleRoleActionPress('WeeklyReport')} style={dynStyles.sectionButton}>
              <Text style={dynStyles.sectionButtonText}>{t('dashboard.screens.main.reportButton')}</Text>
            </Pressable>
          </View>

          <View style={dynStyles.progressCard}>
            {[
              { label: t('dashboard.screens.main.progressFinance'), value: healthScore.financial, color: SCORE_COLOR(healthScore.financial) },
              { label: t('dashboard.screens.main.progressTasks'), value: healthScore.tasks, color: SCORE_COLOR(healthScore.tasks) },
              { label: t('dashboard.screens.main.progressGoals'), value: healthScore.goals, color: SCORE_COLOR(healthScore.goals) },
              { label: t('dashboard.screens.main.progressWellness'), value: healthScore.health, color: SCORE_COLOR(healthScore.health) },
            ].map((item) => (
              <View key={item.label} style={dynStyles.progressItem}>
                <View style={dynStyles.progressLabelRowLight}>
                  <Text style={dynStyles.progressItemLabel}>{item.label}</Text>
                  <Text style={[dynStyles.progressItemValue, { color: item.color }]}>{item.value}%</Text>
                </View>
                <ProgressBar progress={item.value / 100} color={item.color} backgroundColor={colors.border} height={6} />
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
            <Pressable key={item.label} style={dynStyles.fabMenuItem} onPress={() => handleQuickAction(item.route)}>
              <Text style={dynStyles.fabMenuLabel}>{item.label}</Text>
              <View style={dynStyles.fabMiniIcon}>
                <Ionicons name={item.icon as any} size={17} color="#fff" />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable style={[dynStyles.fab, { bottom: 24 + insets.bottom }]} onPress={() => setFabOpen((prev) => !prev)}>
        <Ionicons name={fabOpen ? 'close' : 'add'} size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

function makeStyles(colors: import('../../theme/ThemeContext').ThemeColors) {
  const cardWidth = (width - 48) / 2;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 132,
    },
    header: {
      paddingHorizontal: 18,
      paddingBottom: 22,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: 'hidden',
    },
    headerGlowGold: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: COMMAND_COLORS.gold,
      opacity: 0.08,
      right: -90,
      top: -120,
    },
    headerGlowTeal: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: COMMAND_COLORS.teal,
      opacity: 0.08,
      left: -70,
      bottom: -80,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 16,
    },
    headerIdentity: {
      flex: 1,
      minWidth: 0,
    },
    eyebrow: {
      color: COMMAND_COLORS.gold,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.3,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    greeting: {
      color: 'rgba(255,255,255,0.64)',
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    familyName: {
      color: '#fff',
      fontSize: 25,
      lineHeight: 30,
      fontWeight: '900',
      letterSpacing: -0.8,
      marginTop: 2,
    },
    dateText: {
      color: 'rgba(255,255,255,0.52)',
      fontSize: 12,
      fontWeight: '600',
      marginTop: 3,
    },
    activeProfileBadge: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 7,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      maxWidth: '95%',
    },
    activeProfileName: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
      flexShrink: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    headerIconBtn: {
      width: 39,
      height: 39,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.11)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    notifDot: {
      position: 'absolute',
      top: -6,
      right: -6,
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
    smartStatusCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: 'rgba(255,255,255,0.09)',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      padding: 14,
      marginBottom: 12,
    },
    statusIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusLabel: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: -0.2,
      marginBottom: 2,
    },
    statusMessage: {
      color: 'rgba(255,255,255,0.62)',
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 17,
    },
    statusScore: {
      color: COMMAND_COLORS.gold,
      fontSize: 26,
      fontWeight: '900',
      letterSpacing: -1,
    },
    smartBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(0,0,0,0.18)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.09)',
      paddingVertical: 11,
      paddingHorizontal: 8,
    },
    smartBarItem: {
      flex: 1,
      alignItems: 'center',
    },
    smartBarValue: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    smartBarLabel: {
      color: 'rgba(255,255,255,0.48)',
      fontSize: 10,
      fontWeight: '700',
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    smartBarDivider: {
      width: 1,
      height: 28,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingHorizontal: 18,
      marginTop: 18,
    },
    kpiCard: {
      width: cardWidth,
      minHeight: 130,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      justifyContent: 'space-between',
    },
    kpiIcon: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    kpiValue: {
      color: colors.text,
      fontSize: 23,
      fontWeight: '900',
      letterSpacing: -0.8,
    },
    kpiLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 2,
    },
    kpiDetail: {
      fontSize: 11,
      fontWeight: '900',
      marginTop: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      marginTop: 26,
      marginBottom: 12,
      gap: 12,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    sectionSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 3,
      lineHeight: 16,
    },
    sectionButton: {
      backgroundColor: colors.primary + '12',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      flexShrink: 0,
    },
    sectionButtonText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '900',
    },
    actionStack: {
      paddingHorizontal: 18,
      gap: 10,
    },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: -0.2,
    },
    actionSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 17,
      marginTop: 2,
    },
    timelinePanel: {
      marginHorizontal: 18,
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 4,
      overflow: 'hidden',
    },
    timelineRow: {
      flexDirection: 'row',
      minHeight: 72,
      paddingHorizontal: 14,
    },
    timelineLeft: {
      width: 66,
      alignItems: 'flex-start',
      paddingTop: 17,
    },
    timelineTime: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '900',
    },
    timelineLine: {
      position: 'absolute',
      top: 40,
      left: 72,
      width: 1,
      height: 46,
      backgroundColor: colors.border,
    },
    timelineDotWrap: {
      width: 20,
      alignItems: 'center',
      paddingTop: 22,
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    timelineContent: {
      flex: 1,
      paddingVertical: 16,
      paddingLeft: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    timelineTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: -0.2,
    },
    timelineMeta: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    emptyPanel: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 26,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '900',
      marginTop: 10,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
      marginTop: 4,
    },
    memberBoardScroll: {
      paddingHorizontal: 18,
      gap: 12,
    },
    memberStatusCard: {
      width: 168,
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginRight: 12,
    },
    memberTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    memberRolePill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    memberRoleText: {
      fontSize: 9,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    memberName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: -0.2,
    },
    memberStatusText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    memberFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 14,
    },
    memberPoints: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    inviteCard: {
      width: 132,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.border,
      padding: 14,
      marginRight: 18,
    },
    inviteIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '12',
      marginBottom: 10,
    },
    inviteTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
    },
    inviteSubtitle: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 3,
    },
    financeCard: {
      marginHorizontal: 18,
      borderRadius: 24,
      overflow: 'hidden',
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
    financeGradient: {
      padding: 18,
      borderRadius: 24,
    },
    financeTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 18,
    },
    financeTitle: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    financeSubtitle: {
      color: 'rgba(255,255,255,0.58)',
      fontSize: 12,
      fontWeight: '700',
      marginTop: 4,
    },
    financeBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    financeBadgeText: {
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    financeMetricRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    financeMetric: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 11,
    },
    financeMetricLabel: {
      color: 'rgba(255,255,255,0.52)',
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    financeMetricValue: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '900',
      marginTop: 6,
      letterSpacing: -0.4,
    },
    progressLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    progressLabel: {
      color: 'rgba(255,255,255,0.62)',
      fontSize: 12,
      fontWeight: '800',
    },
    progressValue: {
      color: COMMAND_COLORS.gold,
      fontSize: 12,
      fontWeight: '900',
    },
    aiCard: {
      marginHorizontal: 18,
      borderRadius: 24,
      overflow: 'hidden',
    },
    aiGradient: {
      borderRadius: 24,
      padding: 18,
    },
    aiTopRow: {
      flexDirection: 'row',
      gap: 13,
      alignItems: 'flex-start',
    },
    aiIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(198,166,100,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(198,166,100,0.18)',
    },
    aiTitle: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    aiText: {
      color: 'rgba(255,255,255,0.66)',
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 19,
      marginTop: 5,
    },
    aiActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.1)',
    },
    aiActionText: {
      color: COMMAND_COLORS.gold,
      fontSize: 13,
      fontWeight: '900',
    },
    progressCard: {
      marginHorizontal: 18,
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 14,
    },
    progressItem: {
      gap: 7,
    },
    progressLabelRowLight: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressItemLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    progressItemValue: {
      fontSize: 12,
      fontWeight: '900',
    },
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
