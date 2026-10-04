import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/useAuthStore';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useJoinRequestsStore } from '../../store/useJoinRequestsStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { ProgressRing } from '../../components/dashboard/ProgressRing';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useGuardianStore } from '../../store/useGuardianStore';
import { useFinancialHealth } from '../../hooks/useFinancialHealth';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { shadows } from '../../theme/spacing';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import type { FamilyMember, MemberRole } from '../../types';
import { defaultPermissionsForRole } from '../../types';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

const MEMBER_ROLES: MemberRole[] = ['parent', 'child', 'guardian', 'grandparent', 'caregiver'];

const AVATAR_COLORS = [
  '#E74C3C',
  '#E67E22',
  '#F1C40F',
  '#27AE60',
  '#2980B9',
  '#9B59B6',
  '#E91E63',
  '#00BCD4',
  '#FF6B6B',
  '#45B7D1',
];

// statusColors is computed inside the component using dynamic colors

const levelThresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000, 15000];

import { generateId } from '../../utils/generateId';

function getLevelProgress(points: number, level: number): number {
  const current = levelThresholds[level - 1] || 0;
  const next = levelThresholds[level] || levelThresholds[levelThresholds.length - 1];
  if (next <= current) return 1;
  return Math.min(1, Math.max(0, (points - current) / (next - current)));
}

const QUICK_NAV = [
  {
    key: 'Calendar',
    icon: 'calendar',
    label: 'Calendar',
    desc: 'Events & schedules',
    iconBg: '#E3F2FD',
    iconColor: '#1565C0',
  },
  {
    key: 'Tasks',
    icon: 'checkmark-circle',
    label: 'Tasks',
    desc: 'To-dos & chores',
    iconBg: '#E8F5E9',
    iconColor: '#2E7D32',
  },
  {
    key: 'SchoolCenter',
    icon: 'school',
    label: 'School',
    desc: 'Grades & homework',
    iconBg: '#FFF8E1',
    iconColor: '#F57C00',
  },
  {
    key: 'FamilyBoard',
    icon: 'megaphone',
    label: 'Family Board',
    desc: 'Announcements',
    iconBg: '#F3E5F5',
    iconColor: '#6A1B9A',
  },
  {
    key: 'HomeworkTracker',
    icon: 'book',
    label: 'Homework',
    desc: 'Assignments & due dates',
    iconBg: '#E8EAF6',
    iconColor: '#283593',
  },
  {
    key: 'GiftPlanner',
    icon: 'gift',
    label: 'Gift Planner',
    desc: 'Track occasions',
    iconBg: '#FCE4EC',
    iconColor: '#C2185B',
  },
  {
    key: 'FamilyGoals',
    icon: 'flag',
    label: 'Goals',
    desc: 'Shared milestones',
    iconBg: '#E8EAF6',
    iconColor: '#283593',
  },
  {
    key: 'Allowance',
    icon: 'cash',
    label: 'Allowance',
    desc: 'Money management',
    iconBg: '#FFF8E1',
    iconColor: '#F57C00',
  },
  {
    key: 'FamilyConnect',
    icon: 'people-circle',
    label: 'Family Connect',
    desc: 'Trusted households',
    iconBg: '#E3F2FD',
    iconColor: '#0F2952',
  },
  {
    key: 'CoParenting',
    icon: 'swap-horizontal',
    label: 'Co-Parenting',
    desc: 'Shared child info',
    iconBg: '#F3E5F5',
    iconColor: '#6A1B9A',
  },
  {
    key: 'ReadingTracker',
    icon: 'book',
    label: 'Reading',
    desc: 'Books & goals',
    iconBg: '#EDE7F6',
    iconColor: '#4A148C',
  },
  {
    key: 'VolunteerTracker',
    icon: 'heart-circle',
    label: 'Volunteer',
    desc: 'Service hours',
    iconBg: '#FFF3E0',
    iconColor: '#E65100',
  },
];

export function FamilyProfilesScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation('family');

  // Membership status, not live presence — MemberStatus mirrors the
  // backend's account lifecycle (ACTIVE/INACTIVE/PENDING) exactly. There's
  // no real "away/school/work/sleeping" data anywhere in the app; an
  // earlier version of this map claimed there was, which meant every real
  // synced member fell through to the muted fallback color below.
  const statusColors: Record<string, string> = {
    ACTIVE: colors.success,
    INACTIVE: colors.textMuted,
    PENDING: colors.warning,
  };

  const [showModal, setShowModal] = useState(false);
  const [showInviteOptions, setShowInviteOptions] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<MemberRole>('child');
  const [newColor, setNewColor] = useState('#2980B9');

  const members = useFamilyStore((s) => s.members);
  const guardianDevices = useGuardianStore((s) => s.devices.length);
  const guardianZones = useGuardianStore((s) => s.geofenceZones.length);
  const guardianOpenSos = useGuardianStore((s) => s.sosAlerts.filter((a) => !a.isResolved).length);
  const guardianPending = useGuardianStore((s) => s.approvalRequests.filter((r) => r.status === 'pending').length);
  const isLoaded = useFamilyStore((s) => s.isLoaded);
  const fetchFromServer = useFamilyStore((s) => s.fetchFromServer);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const activeMember = members.find((member) => member.id === activeMemberId);
  const canManageMembers =
    activeMember?.role === 'parent' ||
    activeMember?.role === 'guardian' ||
    activeMember?.isAdmin === true;
  const family = useFamilyStore((s) => s.family);
  const tasks = useFamilyStore((s) => s.tasks);
  const events = useFamilyStore((s) => s.events);
  const addMember = useFamilyStore((s) => s.addMember);
  const requests = useJoinRequestsStore((s) => s.requests);
  const familyHealth = useFinancialHealth();

  const pendingRequestsCount = requests.filter((request) => request.status === 'pending').length;

  const todayEvents = events.filter((event) => {
    const eventDate = new Date(event.startDate);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  }).length;
  const totalPoints = members.reduce((sum, m) => sum + m.points, 0);
  const healthScore = familyHealth.overall;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;

  useEffect(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  useEffect(() => {
    if (route?.params?.openInviteOptions) {
      setNewName('');
      setNewRole('child');
      setNewColor('#2980B9');
      setShowInviteOptions(true);
      navigation.setParams?.({ openInviteOptions: false });
    }
    if (route?.params?.joinedFamilyId) {
      Alert.alert(
        t('family.screens.familyProfiles.joinRequestSentTitle'),
        t('family.screens.familyProfiles.joinRequestSentMsg', { familyName: route.params.joinedFamilyName })
      );
      navigation.setParams?.({
        joinedFamilyId: undefined,
        joinedFamilyName: undefined,
      });
    }
  }, [
    route?.params?.openInviteOptions,
    route?.params?.joinedFamilyId,
    route?.params?.joinedFamilyName,
    navigation,
  ]);

  const openAddMemberModal = () => {
    setNewName('');
    setNewRole('child');
    setNewColor('#2980B9');
    setShowInviteOptions(true);
  };

  const handleAddMember = () => {
    if (!newName.trim()) return;
    const member: FamilyMember = {
      id: generateId(),
      familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
      name: newName.trim(),
      role: newRole,
      avatarColor: newColor,
      status: 'ACTIVE',
      points: 0,
      level: 1,
      isAdmin: false,
      isLocalProfile: true,
      linkedUserId: null,
      isPinProtected: false,
      permissions: defaultPermissionsForRole(newRole),
      inviteStatus: 'none',
      createdAt: new Date().toISOString(),
    };
    addMember(member);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewName('');
    setNewRole('child');
    setNewColor('#2980B9');
    setShowModal(false);
  };

  const handleCopyInvite = async () => {
    const inviteLink = `familycommand://join/${family?.id}`;
    await Clipboard.setStringAsync(inviteLink);
    Alert.alert(t('family.screens.familyProfiles.copiedTitle'), t('family.screens.familyProfiles.copiedMsg'));
  };

  const handleShareInvite = async () => {
    try {
      const inviteLink = `https://myfamilycommandcenter.com/join/${useAuthStore.getState().familyId ?? family?.id ?? ''}`;
      await Clipboard.setStringAsync(inviteLink);
      Alert.alert(
        t('family.screens.familyProfiles.inviteLinkReadyTitle'),
        t('family.screens.familyProfiles.inviteLinkReadyMsg'),
        [{ text: t('family.screens.familyProfiles.okButton') }]
      );
    } catch {
      Alert.alert(t('family.screens.familyProfiles.inviteErrorTitle'), t('family.screens.familyProfiles.inviteErrorMsg'));
    }
  };

  const handleImportContacts = async () => {
    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(t('family.screens.familyProfiles.permissionNeededTitle'), t('family.screens.familyProfiles.permissionNeededMsg'));
        return;
      }
      const result = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        pageSize: 50,
      });
      const contacts = result.data.filter((contact) => contact.name);
      Alert.alert(
        t('family.screens.familyProfiles.contactsReadyTitle'),
        t('family.screens.familyProfiles.contactsReadyMsg', { count: contacts.length })
      );
    } catch (error) {
      console.log('Import contacts error:', error);
      Alert.alert(t('family.screens.familyProfiles.importFailedTitle'), t('family.screens.familyProfiles.importFailedMsg'));
    }
  };

  const openMemberDetails = (memberId: string) => {
    navigation.navigate('MemberDetails', { memberId });
  };

  const getCompletedTasks = (memberId: string) =>
    tasks.filter((task) => task.status === 'completed' && task.completedBy === memberId).length;

  const getPendingTasks = (memberId: string) =>
    tasks.filter(
      (task) => task.status === 'pending' && task.assignedTo?.includes(memberId)
    ).length;

  const { contentWidth, gridColumns } = useResponsiveLayout();
  const quickNavColumns = gridColumns(2, 150, 10);
  const dynStyles = makeStyles(colors, quickNavColumns, contentWidth);

  const familyToday = format(new Date(), 'EEEE, MMM d');
  const familyHour = new Date().getHours();
  const familyGreeting = familyHour < 12 ? 'Good morning' : familyHour < 17 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    { icon: 'checkmark-done-circle', value: pendingTasks, label: t('family.screens.familyProfiles.statTasks'), color: '#34D399' },
    { icon: 'calendar', value: todayEvents, label: t('family.screens.familyProfiles.statEventsToday'), color: '#60A5FA' },
    { icon: 'trophy', value: healthScore, label: t('family.screens.familyProfiles.statFamilyScore'), color: '#FBBF24' },
  ];

  const screenHeader = (
    <LinearGradient
      colors={['#0A1628', '#0D2D52', '#0E3D6E', '#0B4F82']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[dynStyles.header, { paddingTop: insets.top + 10 }]}
    >
      {/* Decorative orbs */}
      <View style={dynStyles.orbTopRight} pointerEvents="none" />
      <View style={dynStyles.orbBottomLeft} pointerEvents="none" />

      {/* Top row */}
      <View style={dynStyles.headerTop}>
        {route?.params?.source === 'dashboard' && (
          <Pressable accessibilityRole="button" onPress={() => navigation.getParent()?.navigate('Home')} style={dynStyles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
        )}
        <View style={dynStyles.headerLeft}>
          <Text style={dynStyles.headerGreeting}>{familyGreeting}</Text>
          <Text style={dynStyles.headerTitle}>{t('family.title')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Text style={dynStyles.headerSubtitle}>
              {t('family.screens.familyProfiles.memberCount', { count: members.length })}
              {family?.name ? ` · ${family.name}` : ''}
            </Text>
          </View>
          <View style={dynStyles.datePill}>
            <Ionicons name="calendar-outline" size={10} color="rgba(255,255,255,0.6)" />
            <Text style={dynStyles.datePillText}>{familyToday}</Text>
          </View>
        </View>
        <View style={dynStyles.headerActions}>
          {activeMember && (
            <Pressable accessibilityRole="button" style={dynStyles.activeProfilePill} onPress={() => navigation.navigate('ProfileSwitcher')}>
              <Avatar name={activeMember.name} color={activeMember.avatarColor} size={26} />
              <Ionicons name="chevron-down" size={13} color="rgba(255,255,255,0.8)" style={{ marginLeft: 6 }} />
            </Pressable>
          )}
          {canManageMembers && (
            <Pressable accessibilityRole="button" onPress={openAddMemberModal} style={dynStyles.addBtn}>
              <Ionicons name="person-add-outline" size={20} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={dynStyles.headerDivider} />

      {/* Stat cards */}
      <View style={dynStyles.statsRow}>
        {statCards.map((stat) => (
          <LinearGradient
            key={stat.label}
            colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.06)']}
            style={dynStyles.statCard}
          >
            <View style={[dynStyles.statIconWrap, { backgroundColor: stat.color + '28' }]}>
              <Ionicons name={stat.icon as any} size={15} color={stat.color} />
            </View>
            <Text style={[dynStyles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={dynStyles.statLabel}>{stat.label}</Text>
          </LinearGradient>
        ))}
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#0A1628', '#0E3D6E']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {route?.params?.source === 'dashboard' && (
          <Pressable accessibilityRole="button" onPress={() => navigation.getParent()?.navigate('Home')} style={dynStyles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
        )}
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="people" size={14} color="#fff" />
        </View>
        <Text style={[dynStyles.headerTitle, { fontSize: 17 }]}>{t('family.title')}</Text>
      </View>
      {canManageMembers && (
        <Pressable accessibilityRole="button" onPress={openAddMemberModal} style={dynStyles.addBtn}>
          <Ionicons name="person-add-outline" size={20} color="#fff" />
        </Pressable>
      )}
    </LinearGradient>
  );

  return (
    <View style={dynStyles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[dynStyles.content, { paddingBottom: insets.bottom + 100, paddingTop: contentPaddingTop }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── MEMBER CARDS — horizontal scroll ── */}
        <Text style={dynStyles.sectionTitle}>{t('family.members')}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={dynStyles.membersScroll}
        >
          {members.map((member) => {
            const isActive = member.id === activeMemberId;
            const statusColor =
              statusColors[member.status as keyof typeof statusColors] ?? colors.textMuted;
            const progress = getLevelProgress(member.points, member.level);

            return (
              <Pressable accessibilityRole="button"
                key={member.id}
                onPress={() => openMemberDetails(member.id)}
                style={[dynStyles.memberAvatarCard, isActive && dynStyles.memberAvatarCardActive]}
              >
                {isActive && (
                  <LinearGradient
                    colors={['#1E4A8A', '#0F2952']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}

                {/* Status dot */}
                <View style={[dynStyles.memberStatusDotOuter, { borderColor: isActive ? '#1E4A8A' : '#F0F3F9' }]}>
                  <View style={[dynStyles.memberStatusDot, { backgroundColor: statusColor }]} />
                </View>

                {/* Avatar, ringed by level progress */}
                <ProgressRing
                  size={70}
                  strokeWidth={4}
                  progress={progress}
                  color={isActive ? '#5EEAD4' : member.avatarColor}
                  trackColor={isActive ? 'rgba(255,255,255,0.22)' : member.avatarColor + '26'}
                >
                  <Avatar
                    name={member.name}
                    color={member.avatarColor}
                    size={56}
                  />
                </ProgressRing>

                {/* Name */}
                <Text
                  style={[dynStyles.memberCardName, isActive && dynStyles.memberCardNameActive]}
                  numberOfLines={1}
                >
                  {member.name}
                </Text>

                {/* Role badge */}
                <View
                  style={[
                    dynStyles.roleBadge,
                    { backgroundColor: isActive ? 'rgba(255,255,255,0.18)' : '#E8EEF9' },
                  ]}
                >
                  <Text style={[dynStyles.roleBadgeText, isActive && dynStyles.roleBadgeTextActive]}>
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Text>
                </View>

                {/* Points & level */}
                <View style={dynStyles.memberCardStats}>
                  <View style={[dynStyles.memberChip, isActive && dynStyles.memberChipActive]}>
                    <Ionicons name="star" size={11} color={isActive ? '#FDE68A' : '#F5A623'} />
                    <Text style={[dynStyles.memberCardPoints, isActive && dynStyles.memberCardPointsActive]}>
                      {t('family.screens.familyProfiles.pointsSuffix', { points: member.points.toLocaleString() })}
                    </Text>
                  </View>
                  <Text style={[dynStyles.memberCardLevel, isActive && dynStyles.memberCardLevelActive]}>
                    {t('family.screens.familyProfiles.levelPrefix', { level: member.level })}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {/* Add member card — only visible to parents/guardians */}
          {canManageMembers && (
            <Pressable accessibilityRole="button" onPress={openAddMemberModal} style={dynStyles.addMemberCard}>
              <View style={dynStyles.addMemberIcon}>
                <Ionicons name="person-add-outline" size={24} color="#1E4A8A" />
              </View>
              <Text style={dynStyles.addMemberLabel}>{t('family.screens.familyProfiles.addMemberLabel')}</Text>
            </Pressable>
          )}
        </ScrollView>

        {members.length === 0 && (
          <View style={dynStyles.emptyState}>
            {!isLoaded ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="people-outline" size={60} color={colors.textMuted} />
                <Text style={dynStyles.emptyTitle}>{t('family.screens.familyProfiles.emptyStateTitle')}</Text>
                <Text style={dynStyles.emptyDesc}>{t('family.screens.familyProfiles.emptyStateDesc')}</Text>
              </>
            )}
          </View>
        )}

        {/* ── FAMILY HEALTH SCORE ── */}
        <View style={dynStyles.healthCard}>
          <View style={dynStyles.healthCardTop}>
            <View style={dynStyles.healthCardLeft}>
              <View style={dynStyles.healthIconWrap}>
                <Ionicons name="heart" size={22} color="#E53935" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dynStyles.healthTitle}>{t('family.screens.familyProfiles.healthCardTitle')}</Text>
                <Text style={dynStyles.healthSubtitle}>{t('family.screens.familyProfiles.healthCardSubtitle')}</Text>
              </View>
            </View>
            <ProgressRing
              size={78}
              strokeWidth={8}
              progress={healthScore / 100}
              color={healthScore >= 80 ? '#27AE60' : healthScore >= 60 ? '#F5A623' : '#F97316'}
              trackColor="#E8EEF9"
            >
              <Text style={dynStyles.healthScore}>{healthScore}</Text>
              <Text style={dynStyles.healthScoreMax}>/100</Text>
            </ProgressRing>
          </View>
        </View>

        {/* ── FAMILY GUARDIAN (parents/guardians only) ── */}
        {(activeMember?.role === 'parent' ||
          activeMember?.role === 'guardian' ||
          activeMember?.isAdmin) && (
          <Pressable accessibilityRole="button"
            onPress={() => navigation.navigate('GuardianDashboard')}
            style={dynStyles.guardianCard}
          >
            <LinearGradient
              colors={['#1B1446', '#3B1E8A', '#7C3AED']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={dynStyles.guardianRing1} pointerEvents="none" />
            <View style={dynStyles.guardianRing2} pointerEvents="none" />
            <View style={dynStyles.guardianRing3} pointerEvents="none" />
            <View style={dynStyles.guardianGlowSmall} pointerEvents="none" />

            <View style={dynStyles.guardianTopRow}>
              <View style={dynStyles.guardianShieldRing}>
                <LinearGradient colors={['#5EEAD4', '#22D3EE']} style={dynStyles.guardianIcon}>
                  <Ionicons name="location" size={28} color="#1B1446" />
                </LinearGradient>
                <View style={dynStyles.guardianIconBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#fff" />
                </View>
              </View>
              <View style={dynStyles.guardianText}>
                <View
                  style={[
                    dynStyles.guardianStatusPill,
                    { backgroundColor: guardianOpenSos > 0 ? 'rgba(248,113,113,0.22)' : 'rgba(52,211,153,0.22)' },
                  ]}
                >
                  <View style={[dynStyles.guardianStatusDot, { backgroundColor: guardianOpenSos > 0 ? '#F87171' : '#34D399' }]} />
                  <Text style={[dynStyles.guardianStatusText, { color: guardianOpenSos > 0 ? '#FCA5A5' : '#6EE7B7' }]}>
                    {guardianOpenSos > 0
                      ? t('family.screens.familyProfiles.guardianStatusAlert', { count: guardianOpenSos, defaultValue: '{{count}} SOS active' })
                      : t('family.screens.familyProfiles.guardianStatusSafe', { defaultValue: 'All clear' })}
                  </Text>
                </View>
                <Text style={dynStyles.guardianTitle}>{t('family.screens.familyProfiles.guardianCardTitle')}</Text>
                <Text style={dynStyles.guardianDesc}>{t('family.screens.familyProfiles.guardianCardDesc')}</Text>
              </View>
              <View style={dynStyles.guardianArrow}>
                <Ionicons name="arrow-forward" size={18} color="#0B1F3F" />
              </View>
            </View>

            <View style={dynStyles.guardianStats}>
              {[
                { icon: 'phone-portrait', color: '#2563EB', value: guardianDevices, label: t('family.screens.familyProfiles.guardianStatDevices', { defaultValue: 'Devices' }) },
                { icon: 'navigate-circle', color: '#EA580C', value: guardianZones, label: t('family.screens.familyProfiles.guardianStatZones', { defaultValue: 'Safe zones' }) },
                { icon: 'hand-left', color: '#7C3AED', value: guardianPending, label: t('family.screens.familyProfiles.guardianStatApprovals', { defaultValue: 'Approvals' }) },
              ].map((stat) => (
                <View key={stat.label} style={dynStyles.guardianStat}>
                  <View style={[dynStyles.guardianStatIcon, { backgroundColor: stat.color + '1A' }]}>
                    <Ionicons name={stat.icon as any} size={17} color={stat.color} />
                  </View>
                  <View>
                    <Text style={dynStyles.guardianStatValue}>{stat.value}</Text>
                    <Text style={dynStyles.guardianStatLabel} numberOfLines={1}>{stat.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Pressable>
        )}

        {/* ── QUICK NAV TILES ── */}
        <Text style={dynStyles.sectionTitle}>{t('family.quickNav')}</Text>

        <View style={dynStyles.quickNavGrid}>
          {QUICK_NAV.map((item) => (
            <Pressable accessibilityRole="button"
              key={item.key}
              onPress={() => navigation.navigate(item.key)}
              style={dynStyles.quickNavTile}
            >
              <View style={[dynStyles.quickNavIcon, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
              </View>
              <View style={dynStyles.quickNavText}>
                <Text style={dynStyles.quickNavLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={dynStyles.quickNavDesc} numberOfLines={2}>{item.desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
        )}
      </CollapsibleHeader>

      {/* ── INVITE OPTIONS MODAL ── */}
      <Modal
        visible={showInviteOptions}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInviteOptions(false)}
      >
        <View style={dynStyles.inviteOverlay}>
          <View style={dynStyles.inviteCard}>
            <Text style={dynStyles.modalTitle}>{t('family.screens.familyProfiles.inviteModalTitle')}</Text>
            <Button
              title={t('family.screens.familyProfiles.switchProfileButton')}
              onPress={() => {
                setShowInviteOptions(false);
                navigation.navigate('ProfileSwitcher');
              }}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title={t('family.screens.familyProfiles.showQrInviteButton')}
              onPress={() => {
                setShowInviteOptions(false);
                navigation.navigate('FamilyInviteQR');
              }}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title={t('family.screens.familyProfiles.scanQrInviteButton')}
              onPress={() => {
                setShowInviteOptions(false);
                navigation.navigate('JoinFamily');
              }}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title={t('family.screens.familyProfiles.viewJoinRequestsButton', { count: pendingRequestsCount })}
              onPress={() => {
                setShowInviteOptions(false);
                navigation.navigate('JoinRequests');
              }}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title={t('family.screens.familyProfiles.copyInviteLinkButton')}
              onPress={handleShareInvite}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title={t('family.screens.familyProfiles.copyJoinCodeButton')}
              onPress={handleCopyInvite}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title={t('family.screens.familyProfiles.importContactsButton')}
              onPress={handleImportContacts}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title={t('family.screens.familyProfiles.addManuallyButton')}
              onPress={() => {
                setShowInviteOptions(false);
                setShowModal(true);
              }}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title={t('family.screens.familyProfiles.cancelButton')}
              variant="ghost"
              onPress={() => setShowInviteOptions(false)}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* ── ADD MEMBER MODAL ── */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <ScrollView style={dynStyles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={dynStyles.modalHandle} />

          <Text style={dynStyles.modalTitle}>{t('family.screens.familyProfiles.addMemberModalTitle')}</Text>
          <Text style={dynStyles.modalSubtitle}>
            {t('family.screens.familyProfiles.addMemberModalSubtitle')}
          </Text>

          {newName.trim() && (
            <View style={dynStyles.previewRow}>
              <Avatar name={newName} color={newColor} size={56} />
              <Text style={dynStyles.previewName}>{newName}</Text>
            </View>
          )}

          <Text style={dynStyles.modalLabel}>{t('family.screens.familyProfiles.fullNameLabel')}</Text>
          <TextInput accessibilityLabel={t('family.screens.familyProfiles.fullNamePlaceholder')}
            style={dynStyles.modalInput}
            placeholder={t('family.screens.familyProfiles.fullNamePlaceholder')}
            value={newName}
            onChangeText={setNewName}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <Text style={dynStyles.modalLabel}>{t('family.screens.familyProfiles.roleLabel')}</Text>
          <View style={dynStyles.roleGrid}>
            {MEMBER_ROLES.map((role) => (
              <Pressable accessibilityRole="button"
                key={role}
                onPress={() => setNewRole(role)}
                style={[dynStyles.roleChip, newRole === role && dynStyles.roleChipActive]}
              >
                <Text style={[dynStyles.roleChipText, newRole === role && dynStyles.roleChipTextActive]}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={dynStyles.modalLabel}>{t('family.screens.familyProfiles.avatarColorLabel')}</Text>
          <View style={dynStyles.colorRow}>
            {AVATAR_COLORS.map((color) => (
              <Pressable accessibilityRole="button"
                key={color}
                onPress={() => setNewColor(color)}
                style={[
                  dynStyles.colorSwatch,
                  { backgroundColor: color },
                  newColor === color && dynStyles.colorSwatchSelected,
                ]}
              />
            ))}
          </View>

          <Button
            title="Add Member"
            onPress={handleAddMember}
            fullWidth
            size="lg"
            disabled={!newName.trim()}
            style={{ marginTop: 8 }}
          />
          <Button
            title="Cancel"
            onPress={() => setShowModal(false)}
            variant="ghost"
            fullWidth
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#0F2952',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
};

function makeStyles(
  colors: import('../../theme/ThemeContext').ThemeColors,
  quickNavColumns: number,
  contentWidth: number
) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── HEADER ──
  header: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    overflow: 'hidden',
  },

  orbTopRight: {
    position: 'absolute', top: -60, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(56,130,255,0.18)',
  },

  orbBottomLeft: {
    position: 'absolute', bottom: -30, left: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(99,179,255,0.10)',
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },

  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 4,
  },

  headerLeft: { flex: 1, minWidth: 0 },

  headerGreeting: {
    fontSize: 12, fontWeight: '600',
    color: 'rgba(255,255,255,0.55)', letterSpacing: 0.2, marginBottom: 2,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    lineHeight: 28,
  },

  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },

  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'flex-start',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 9, paddingVertical: 4, marginTop: 7,
  },

  datePillText: {
    fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.7)', letterSpacing: 0.2,
  },

  headerDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 12,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  activeProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  addBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },

  // Stats row inside header
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },

  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },

  statIconWrap: {
    width: 28, height: 28, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },

  statLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // ── CONTENT ──
  content: {
    padding: 16,
    width: '100%',
    maxWidth: contentWidth,
    alignSelf: 'center',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.4,
    marginBottom: 12,
    marginTop: 22,
  },

  // ── MEMBER AVATAR CARDS (horizontal scroll) ──
  membersScroll: {
    paddingRight: 16,
    gap: 12,
  },

  memberAvatarCard: {
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4EAF2',
    ...CARD_SHADOW,
  },

  memberAvatarCardActive: {
    borderWidth: 2,
    borderColor: '#1E4A8A',
  },

  memberStatusDotOuter: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    zIndex: 1,
  },

  memberStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  memberCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2952',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
    maxWidth: '100%',
    letterSpacing: -0.2,
  },

  memberCardNameActive: {
    color: '#fff',
  },

  roleBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 12,
  },

  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E4A8A',
    textTransform: 'capitalize',
  },

  roleBadgeTextActive: {
    color: 'rgba(255,255,255,0.9)',
  },

  memberCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  memberChipActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  memberCardPoints: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },

  memberCardPointsActive: {
    color: 'rgba(255,255,255,0.9)',
  },

  memberCardLevel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },

  memberCardLevelActive: {
    color: 'rgba(255,255,255,0.7)',
  },

  memberCardProgress: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(30,74,138,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },

  memberCardProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  addMemberCard: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#D6E0F0',
    borderStyle: 'dashed',
    ...CARD_SHADOW,
  },

  addMemberIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addMemberLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E4A8A',
    textAlign: 'center',
  },

  // ── EMPTY STATE ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 14,
  },

  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
  },

  // ── HEALTH CARD ──
  healthCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E4EAF2',
    ...CARD_SHADOW,
  },

  healthCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },

  healthCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  healthIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FEECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  healthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2952',
  },

  healthSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },

  healthScore: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F2952',
    letterSpacing: -0.6,
  },

  healthScoreMax: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: -2,
  },

  healthBarTrack: {
    height: 10,
    backgroundColor: '#E8EEF9',
    borderRadius: 5,
    overflow: 'hidden',
  },

  healthBarFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#1E4A8A',
  },

  healthTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  healthTickLabel: {
    fontSize: 9,
    color: '#94A3B8',
  },

  // ── GUARDIAN CARD ──
  guardianCard: {
    borderRadius: 28,
    padding: 18,
    marginTop: 20,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },

  guardianTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  // Concentric "radar" rings anchored top-right
  guardianRing1: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.16)', right: -20, top: -30,
  },
  guardianRing2: {
    position: 'absolute', width: 210, height: 210, borderRadius: 105,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.11)', right: -65, top: -75,
  },
  guardianRing3: {
    position: 'absolute', width: 310, height: 310, borderRadius: 155,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.07)', right: -115, top: -125,
  },

  guardianGlowSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#22D3EE',
    opacity: 0.16,
    left: -50,
    bottom: -70,
  },

  guardianShieldRing: {
    width: 68,
    height: 68,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  guardianIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  guardianIconBadge: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#2A1670',
    alignItems: 'center',
    justifyContent: 'center',
  },

  guardianText: { flex: 1 },

  guardianStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6,
  },

  guardianStatusDot: { width: 7, height: 7, borderRadius: 4 },

  guardianStatusText: { fontSize: 11, fontWeight: '800' },

  guardianTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
  },

  guardianDesc: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.74)',
    marginTop: 3,
    fontWeight: '600',
  },

  guardianArrow: {
    width: 38,
    height: 38,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  guardianStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },

  guardianStat: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: 18,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },

  guardianStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  guardianStatValue: { fontSize: 22, fontWeight: '900', color: '#0F1E36', letterSpacing: -0.5 },

  guardianStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },

  // ── QUICK NAV TILES ──
  quickNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  quickNavTile: {
    width: (contentWidth - 32 - (quickNavColumns - 1) * 12) / quickNavColumns,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 14,
    minHeight: 124,
    borderWidth: 1,
    borderColor: '#E4EAF2',
    ...CARD_SHADOW,
  },

  quickNavIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  quickNavText: {
    alignSelf: 'stretch',
  },

  quickNavLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2952',
    letterSpacing: -0.2,
  },

  quickNavDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '600',
    lineHeight: 16,
  },

  // ── MODALS ──
  inviteOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  inviteCard: {
    width: '88%',
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
  },

  modal: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
  },

  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },

  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
  },

  previewRow: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },

  previewName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },

  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  modalInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 16,
    ...shadows.sm,
  },

  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  roleChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },

  roleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  roleChipTextActive: {
    color: '#fff',
  },

  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    flexWrap: 'wrap',
  },

  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: colors.text,
  },
  });
}
