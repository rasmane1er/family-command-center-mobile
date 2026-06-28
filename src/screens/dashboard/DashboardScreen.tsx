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
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { getVisibleTasks, getVisibleEvents } from '../../utils/roleVisibility';
import { getAllowedNotificationTypes } from '../../utils/roleFilters';

const { width } = Dimensions.get('window');

const SCORE_COLOR = (score: number) =>
  score >= 80 ? colors.success : score >= 60 ? colors.warning : colors.danger;

export function DashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
        },
        {
          icon: 'trophy',
          label: 'My Points',
          value: `${activeMember?.points?.toLocaleString() ?? 0} pts`,
          color: '#F5A623',
          bg: '#FEF3E2',
          urgent: false,
        },
        {
          icon: 'calendar',
          label: 'My Events',
          value: `${todayEvents.length} today`,
          color: '#2980B9',
          bg: '#EBF5FB',
          urgent: false,
        },
        {
          icon: 'star',
          label: 'Level',
          value: `Level ${activeMember?.level ?? 1}`,
          color: '#8E44AD',
          bg: '#F5EEF8',
          urgent: false,
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
        },
        {
          icon: 'calendar',
          label: 'Family Events',
          value: `${todayEvents.length} today`,
          color: '#F5A623',
          bg: '#FEF3E2',
          urgent: false,
        },
        {
          icon: 'people',
          label: 'Members',
          value: `${members.length} family`,
          color: '#2980B9',
          bg: '#EBF5FB',
          urgent: false,
        },
        {
          icon: 'heart',
          label: 'Family Score',
          value: `${healthScore.overall}/100`,
          color: SCORE_COLOR(healthScore.overall),
          bg: '#E8EEF9',
          urgent: false,
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
      },
      {
        icon: 'calendar',
        label: "Today's Events",
        value: `${todayEvents.length} events`,
        color: '#F5A623',
        bg: '#FEF3E2',
        urgent: false,
      },
      {
        icon: 'receipt',
        label: 'Bills',
        value: overdueBills > 0 ? `${overdueBills} overdue!` : 'On track',
        color: overdueBills > 0 ? colors.danger : colors.success,
        bg: overdueBills > 0 ? colors.dangerLight : colors.successLight,
        urgent: overdueBills > 0,
      },
      {
        icon: 'trending-up',
        label: 'Monthly Savings',
        value: `$${monthlySavings.toFixed(0)}`,
        color: '#27AE60',
        bg: '#D5F5E3',
        urgent: false,
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
    if (route === 'Finance') {
      navigation.navigate('Finance');
      return;
    }

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

    navigation.navigate('Family', {
      screen: route,
      params: {
        memberId: activeMember?.id,
        role: activeMember?.role,
        source: 'dashboard',
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
      >
        <LinearGradient
          colors={['#0D1B2A', '#0F2952', '#1E4A8A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerCircle1} />
          <View style={styles.headerCircle2} />

          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.headerTop}>
              <View style={styles.headerTextBlock}>
                <Text style={styles.greeting}>{greeting()},</Text>
                <Text style={styles.familyName} numberOfLines={1} ellipsizeMode="tail">
                  {family?.name ?? 'My Family'} 👋
                </Text>
                <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</Text>

                {activeMember && (
                  <Pressable
                    style={styles.activeProfileBadge}
                    onPress={() =>
                      navigation.navigate('Family', {
                        screen: 'ProfileSwitcher',
                      })
                    }
                  >
                    <Avatar name={activeMember.name} color={activeMember.avatarColor} size={24} />
                    <Text style={styles.activeProfileName}>
                      {activeMember.name} • {roleLabel}
                    </Text>
                    <Ionicons name="chevron-down" size={13} color="#fff" />
                  </Pressable>
                )}
              </View>

              <View style={styles.headerActions}>
                <Pressable style={styles.headerIconBtn} onPress={() => navigation.navigate('Search')}>
                  <Ionicons name="search" size={20} color="rgba(255,255,255,0.9)" />
                </Pressable>

                <Pressable
                  style={styles.headerIconBtn}
                  onPress={() => navigation.navigate('Notifications')}
                >
                  <Ionicons name="notifications" size={21} color="#fff" />
                  {unreadNotifications > 0 && (
                    <View style={styles.notifDot}>
                      <Text style={styles.notifCount}>
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </Text>
                    </View>
                  )}
                </Pressable>

                <Pressable style={styles.headerIconBtn} onPress={() => navigation.navigate('Settings')}>
                  <Ionicons name="settings-outline" size={21} color="rgba(255,255,255,0.9)" />
                </Pressable>
              </View>
            </View>

            <View style={styles.roleBanner}>
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
              <Text style={styles.roleBannerText}>
                {isChild
                  ? 'Child dashboard: chores, homework, rewards, and events.'
                  : isGrandparent
                    ? 'Grandparent dashboard: family moments, birthdays, and updates.'
                    : 'Parent dashboard: bills, tasks, calendar, approvals, and household health.'}
              </Text>
            </View>

            <View style={styles.healthScoreCard}>
              <View style={styles.healthScoreLeft}>
                <Text style={styles.healthScoreLabel}>FAMILY HEALTH SCORE</Text>
                <Text style={[styles.healthScoreValue, { color: SCORE_COLOR(healthScore.overall) }]}>
                  {healthScore.overall}
                  <Text style={styles.healthScoreMax}>/100</Text>
                </Text>

                <View style={styles.healthScoreTrend}>
                  <Ionicons name="trending-up" size={14} color={colors.success} />
                  <Text style={styles.healthScoreTrendText}>+4 this week</Text>
                </View>
              </View>

              <View style={styles.healthScoreRight}>
                {[
                  { label: 'Finance', value: healthScore.financial, icon: 'wallet' },
                  { label: 'Tasks', value: healthScore.tasks, icon: 'checkmark-circle' },
                  { label: 'Goals', value: healthScore.goals, icon: 'flag' },
                  { label: 'Wellness', value: healthScore.health, icon: 'heart' },
                ].map((item) => (
                  <View key={item.label} style={styles.healthSubItem}>
                    <View style={styles.healthSubRow}>
                      <Ionicons name={item.icon as any} size={12} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.healthSubLabel}>{item.label}</Text>
                    </View>

                    <View style={styles.healthSubBar}>
                      <View
                        style={[
                          styles.healthSubFill,
                          {
                            width: `${item.value}%`,
                            backgroundColor: SCORE_COLOR(item.value),
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.membersRow}>
              <Text style={styles.membersLabel}>Family Members</Text>
              <Pressable onPress={openFamilyMembers}>
                <Text style={styles.membersViewAll}>Manage</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
              {members.map((member) => (
                <Pressable
                  key={member.id}
                  style={styles.memberChip}
                  onPress={() => openMemberDetails(member.id)}
                >
                  <Avatar
                    name={member.name}
                    color={member.avatarColor}
                    size={44}
                    showBadge
                    badgeColor={member.status === 'active' ? colors.success : colors.warning}
                  />
                  <Text style={styles.memberChipName}>{member.name.split(' ')[0]}</Text>
                  <Text style={styles.memberChipPoints}>{member.points.toLocaleString()} pts</Text>
                </Pressable>
              ))}

              {isParent && (
                <Pressable style={styles.addMemberChip} onPress={openInviteMember}>
                  <View style={styles.addMemberIcon}>
                    <Ionicons name="add" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.addMemberText}>Invite</Text>
                </Pressable>
              )}
            </ScrollView>
          </Animated.View>
        </LinearGradient>

        <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 16, marginTop: 4 }}>
          <View style={styles.quickStats}>
            {quickStats.map((stat) => (
              <Pressable
                key={stat.label}
                style={[styles.statCard, { backgroundColor: stat.bg }, shadows.sm]}
              >
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                <Text style={[styles.statValue, { color: stat.urgent ? colors.danger : colors.text }]}>
                  {stat.value}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
                {stat.urgent && <View style={styles.urgentDot} />}
              </Pressable>
            ))}
          </View>

          <View style={styles.roleActions}>
            {roleActions.map((action) => (
              <Pressable
                key={action.label}
                style={styles.roleActionBtn}
                onPress={() => handleRoleActionPress(action.route)}
              >
                <Ionicons name={action.icon as any} size={20} color={colors.primary} />
                <Text style={styles.roleActionText}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

          {insights
            .filter((insight) => !insight.isRead)
            .slice(0, 2)
            .map((insight) => (
              <Card key={insight.id} style={styles.insightCard} onPress={() => {}} variant="elevated">
                <View style={styles.insightRow}>
                  <View
                    style={[
                      styles.insightIcon,
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
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightSummary} numberOfLines={2}>
                      {insight.summary}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </Card>
            ))}

          {isParent && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Finance Overview</Text>
                <Pressable>
                  <Text style={styles.seeAll}>See All</Text>
                </Pressable>
              </View>

              <Card variant="elevated" style={styles.financeCard} padding={0}>
                <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.financeGradient}>
                  <View style={styles.financeRow}>
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
                        style={[styles.financeItem, index < 2 && styles.financeItemBorder]}
                      >
                        <Ionicons name={item.icon as any} size={20} color={item.color} />
                        <Text style={styles.financeValue}>{item.value}</Text>
                        <Text style={styles.financeLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.savingsRateRow}>
                    <Text style={styles.savingsRateLabel}>Savings Rate</Text>
                    <Text style={styles.savingsRateValue}>
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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isChild ? 'My Schedule' : "Today's Schedule"}</Text>
            <Pressable>
              <Text style={styles.seeAll}>Calendar</Text>
            </Pressable>
          </View>

          {todayEvents.length > 0 ? (
            todayEvents.slice(0, 3).map((event) => (
              <Card key={event.id} style={styles.eventCard} onPress={() => {}} variant="elevated">
                <View style={styles.eventRow}>
                  <View style={[styles.eventColorBar, { backgroundColor: event.color }]} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <View style={styles.eventMeta}>
                      <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.eventTime}>
                        {event.allDay ? 'All Day' : format(new Date(event.startDate), 'h:mm a')}
                      </Text>
                      {event.location && (
                        <>
                          <Ionicons
                            name="location-outline"
                            size={13}
                            color={colors.textMuted}
                            style={{ marginLeft: 8 }}
                          />
                          <Text style={styles.eventTime}>{event.location}</Text>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.eventAttendees}>
                    {event.attendees.slice(0, 3).map((id, index) => {
                      const member = members.find((m) => m.id === id);
                      if (!member) return null;

                      return (
                        <Avatar
                          key={id}
                          name={member.name}
                          color={member.avatarColor}
                          size={26}
                          style={{
                            marginLeft: index > 0 ? -8 : 0,
                            zIndex: 3 - index,
                          }}
                        />
                      );
                    })}
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard} padding={20}>
              <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>No events today — enjoy the free time!</Text>
            </Card>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isChild ? 'My Priority Tasks' : 'Priority Tasks'}</Text>
            <Pressable>
              <Text style={styles.seeAll}>View All</Text>
            </Pressable>
          </View>

          {visibleTasks
            .filter((task) => task.status === 'pending')
            .sort((a, b) => {
              const priorityOrder: Record<string, number> = {
                urgent: 0,
                high: 1,
                medium: 2,
                low: 3,
              };

              return priorityOrder[a.priority] - priorityOrder[b.priority];
            })
            .slice(0, 3)
            .map((task) => {
              const assignee = members.find((member) => task.assignedTo?.includes(member.id));

              return (
                <Card key={task.id} style={styles.taskCard} onPress={() => {}} variant="elevated">
                  <View style={styles.taskRow}>
                    <Pressable
                      style={[
                        styles.taskCheck,
                        {
                          borderColor:
                            task.priority === 'urgent' || task.priority === 'high'
                              ? colors.danger
                              : task.priority === 'medium'
                                ? colors.warning
                                : colors.border,
                        },
                      ]}
                    >
                      <Ionicons name="checkmark" size={14} color="transparent" />
                    </Pressable>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <View style={styles.taskMeta}>
                        <Badge
                          label={task.priority}
                          variant={
                            task.priority === 'urgent' || task.priority === 'high'
                              ? 'danger'
                              : task.priority === 'medium'
                                ? 'warning'
                                : 'neutral'
                          }
                          size="sm"
                        />

                        {task.dueDate && (
                          <Text style={styles.taskDue}>
                            Due {format(new Date(task.dueDate), 'MMM d')}
                          </Text>
                        )}
                      </View>
                    </View>

                    {assignee && <Avatar name={assignee.name} color={assignee.avatarColor} size={30} />}
                  </View>
                </Card>
              );
            })}

          <Pressable onPress={() => navigation.navigate('WeeklyReport')} style={styles.reportBanner}>
            <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.reportBannerGrad}>
              <View style={styles.reportBannerLeft}>
                <Ionicons name="bar-chart" size={20} color={colors.secondary} />
                <View>
                  <Text style={styles.reportBannerTitle}>Weekly Report Ready</Text>
                  <Text style={styles.reportBannerSub}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {},
  header: { paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden' },
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
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  familyName: { fontSize: 23, fontWeight: '800', color: '#fff', marginVertical: 2, flexShrink: 1 },
  date: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
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
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    paddingHorizontal: 4,
  },
  notifCount: { fontSize: 9, fontWeight: '800', color: '#fff' },
  healthScoreCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  healthScoreLeft: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.15)',
    marginRight: 18,
  },
  healthScoreLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  healthScoreValue: { fontSize: 52, fontWeight: '800', lineHeight: 58 },
  healthScoreMax: { fontSize: 20, fontWeight: '400', color: 'rgba(255,255,255,0.5)' },
  healthScoreTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  healthScoreTrendText: { fontSize: 11, color: colors.success, fontWeight: '600' },
  healthScoreRight: { flex: 1, justifyContent: 'space-between' },
  healthSubItem: { marginBottom: 6 },
  healthSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  healthSubLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  healthSubBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
  healthSubFill: { height: 4, borderRadius: 2 },
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
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    position: 'relative',
  },
  statValue: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 2 },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  urgentDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  roleActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  roleActionBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    ...shadows.sm,
  },
  roleActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  insightCard: { marginBottom: 10, borderRadius: 14 },
  insightRow: { flexDirection: 'row', alignItems: 'center' },
  insightIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3 },
  insightSummary: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  financeCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 4 },
  financeGradient: { borderRadius: 20, padding: 0 },
  financeRow: { flexDirection: 'row', paddingTop: 20, paddingHorizontal: 8 },
  financeItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  financeItemBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' },
  financeValue: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 6, marginBottom: 4 },
  financeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  savingsRateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  savingsRateLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  savingsRateValue: { fontSize: 12, color: colors.accentLight, fontWeight: '700' },
  eventCard: { marginBottom: 10, borderRadius: 14 },
  eventRow: { flexDirection: 'row', alignItems: 'center' },
  eventColorBar: { width: 4, height: 44, borderRadius: 2 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventTime: { fontSize: 12, color: colors.textSecondary },
  eventAttendees: { flexDirection: 'row', alignItems: 'center' },
  emptyCard: { alignItems: 'center', backgroundColor: colors.card },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 10, textAlign: 'center' },
  taskCard: { marginBottom: 10, borderRadius: 14 },
  taskRow: { flexDirection: 'row', alignItems: 'center' },
  taskCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 6 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskDue: { fontSize: 12, color: colors.textSecondary },
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