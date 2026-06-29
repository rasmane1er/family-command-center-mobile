import React, { useEffect, useState } from 'react';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';
import {
  Dimensions,
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
import { useFamilyStore } from '../../store/useFamilyStore';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { shadows } from '../../theme/spacing';
import type { FamilyMember, MemberRole } from '../../types';
import { defaultPermissionsForRole } from '../../types';

const { width } = Dimensions.get('window');

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

const generateId = () => Math.random().toString(36).substring(2, 11);

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
];

export function FamilyProfilesScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const statusColors = {
    active: colors.success,
    away: colors.warning,
    school: '#45B7D1',
    work: '#F5A623',
    sleeping: '#94A3B8',
  };

  const [showModal, setShowModal] = useState(false);
  const [showInviteOptions, setShowInviteOptions] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<MemberRole>('child');
  const [newColor, setNewColor] = useState('#2980B9');

  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const activeMember = members.find((member) => member.id === activeMemberId);
  const family = useFamilyStore((s) => s.family);
  const tasks = useFamilyStore((s) => s.tasks);
  const addMember = useFamilyStore((s) => s.addMember);
  const requests = useJoinRequestsStore((s) => s.requests);

  const pendingRequestsCount = requests.filter((request) => request.status === 'pending').length;

  const todayEvents = 0; // placeholder — no events store in scope
  const totalPoints = members.reduce((sum, m) => sum + m.points, 0);
  const healthScore = family?.healthScore ?? 72;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;

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
        'Join Request Sent',
        `Your request to join ${route.params.joinedFamilyName} has been created.`
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
      familyId: family?.id ?? 'demo-family',
      name: newName.trim(),
      role: newRole,
      avatarColor: newColor,
      status: 'active',
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
    Alert.alert('Copied', 'Invite link copied to clipboard');
  };

  const handleShareInvite = async () => {
    try {
      const inviteLink = `https://familycommandcenter.app/join/${family?.id ?? 'demo-family'}`;
      await Clipboard.setStringAsync(inviteLink);
      Alert.alert(
        'Invite Link Ready',
        'The invite link was copied. Paste it into Messages, WhatsApp, email, or any app to invite someone.',
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Invite Error', 'Could not create invite link.');
    }
  };

  const handleImportContacts = async () => {
    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow Contacts access to import family members.');
        return;
      }
      const result = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        pageSize: 50,
      });
      const contacts = result.data.filter((contact) => contact.name);
      Alert.alert(
        'Contacts Ready',
        `${contacts.length} contacts found. Next we will build the contact picker screen.`
      );
    } catch (error) {
      console.log('Import contacts error:', error);
      Alert.alert('Import Failed', 'Contacts could not be loaded on this device.');
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

  const dynStyles = makeStyles(colors);

  return (
    <View style={dynStyles.container}>
      <StatusBar style="light" />

      {/* ── HEADER ── */}
      <LinearGradient
        colors={['#0F2952', '#1E4A8A']}
        style={[dynStyles.header, { paddingTop: insets.top + 16 }]}
      >
        {/* Top row */}
        <View style={dynStyles.headerTop}>
          {route?.params?.source === 'dashboard' && (
            <Pressable onPress={() => navigation.getParent()?.navigate('Home')} style={dynStyles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
          )}
          <View style={dynStyles.headerLeft}>
            <Text style={dynStyles.headerTitle}>{t('family.title')}</Text>
            <Text style={dynStyles.headerSubtitle}>
              {members.length} {members.length === 1 ? 'member' : 'members'}
              {family?.name ? ` · ${family.name}` : ''}
            </Text>
          </View>
          <View style={dynStyles.headerActions}>
            {activeMember && (
              <Pressable
                style={dynStyles.activeProfilePill}
                onPress={() => navigation.navigate('ProfileSwitcher')}
              >
                <Avatar name={activeMember.name} color={activeMember.avatarColor} size={26} />
                <Ionicons name="chevron-down" size={13} color="rgba(255,255,255,0.8)" style={{ marginLeft: 6 }} />
              </Pressable>
            )}
            <Pressable onPress={openAddMemberModal} style={dynStyles.addBtn}>
              <Ionicons name="person-add-outline" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Stats row */}
        <View style={dynStyles.statsRow}>
          {[
            { icon: 'checkmark-done-circle', value: pendingTasks, label: 'Tasks' },
            { icon: 'calendar', value: todayEvents, label: 'Events Today' },
            { icon: 'trophy', value: `${healthScore}`, label: 'Family Score' },
          ].map((stat) => (
            <View key={stat.label} style={dynStyles.statPill}>
              <Ionicons name={stat.icon as any} size={14} color="rgba(255,255,255,0.75)" />
              <Text style={dynStyles.statValue}>{stat.value}</Text>
              <Text style={dynStyles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[dynStyles.content, { paddingBottom: insets.bottom + 100 }]}
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
              <Pressable
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

                {/* Avatar */}
                <Avatar
                  name={member.name}
                  color={member.avatarColor}
                  size={56}
                />

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
                  <Text style={[dynStyles.memberCardPoints, isActive && dynStyles.memberCardPointsActive]}>
                    {member.points.toLocaleString()} pts
                  </Text>
                  <Text style={[dynStyles.memberCardLevel, isActive && dynStyles.memberCardLevelActive]}>
                    Lv {member.level}
                  </Text>
                </View>

                {/* Mini progress */}
                <View style={dynStyles.memberCardProgress}>
                  <View
                    style={[
                      dynStyles.memberCardProgressFill,
                      {
                        width: `${Math.round(progress * 100)}%` as any,
                        backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : member.avatarColor,
                      },
                    ]}
                  />
                </View>
              </Pressable>
            );
          })}

          {/* Add member card */}
          <Pressable onPress={openAddMemberModal} style={dynStyles.addMemberCard}>
            <View style={dynStyles.addMemberIcon}>
              <Ionicons name="person-add-outline" size={24} color="#1E4A8A" />
            </View>
            <Text style={dynStyles.addMemberLabel}>Add Member</Text>
          </Pressable>
        </ScrollView>

        {members.length === 0 && (
          <View style={dynStyles.emptyState}>
            <Ionicons name="people-outline" size={60} color={colors.textMuted} />
            <Text style={dynStyles.emptyTitle}>No family members yet</Text>
            <Text style={dynStyles.emptyDesc}>Add family members to get started</Text>
          </View>
        )}

        {/* ── FAMILY HEALTH SCORE ── */}
        <View style={dynStyles.healthCard}>
          <View style={dynStyles.healthCardTop}>
            <View style={dynStyles.healthCardLeft}>
              <View style={dynStyles.healthIconWrap}>
                <Ionicons name="heart" size={20} color="#E53935" />
              </View>
              <View>
                <Text style={dynStyles.healthTitle}>Family Health Score</Text>
                <Text style={dynStyles.healthSubtitle}>Based on tasks, goals & activity</Text>
              </View>
            </View>
            <Text style={dynStyles.healthScore}>{healthScore}/100</Text>
          </View>
          <View style={dynStyles.healthBarTrack}>
            <View
              style={[
                dynStyles.healthBarFill,
                { width: `${healthScore}%` as any },
              ]}
            />
          </View>
          <View style={dynStyles.healthTicks}>
            <Text style={dynStyles.healthTickLabel}>0</Text>
            <Text style={dynStyles.healthTickLabel}>25</Text>
            <Text style={dynStyles.healthTickLabel}>50</Text>
            <Text style={dynStyles.healthTickLabel}>75</Text>
            <Text style={dynStyles.healthTickLabel}>100</Text>
          </View>
        </View>

        {/* ── FAMILY GUARDIAN (parents/guardians only) ── */}
        {(activeMember?.role === 'parent' ||
          activeMember?.role === 'guardian' ||
          activeMember?.isAdmin) && (
          <Pressable
            onPress={() => navigation.navigate('GuardianDashboard')}
            style={dynStyles.guardianCard}
          >
            <LinearGradient
              colors={['#0F2952', '#1B3A6B']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <View style={dynStyles.guardianCardLeft}>
              <View style={dynStyles.guardianIcon}>
                <Ionicons name="shield-checkmark" size={26} color="#fff" />
              </View>
              <View style={dynStyles.guardianText}>
                <Text style={dynStyles.guardianTitle}>Family Guardian</Text>
                <Text style={dynStyles.guardianDesc}>Parental controls, screen time & location</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>
        )}

        {/* ── QUICK NAV TILES ── */}
        <Text style={dynStyles.sectionTitle}>{t('family.quickNav')}</Text>

        <View style={dynStyles.quickNavGrid}>
          {QUICK_NAV.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => navigation.navigate(item.key)}
              style={dynStyles.quickNavTile}
            >
              <View style={[dynStyles.quickNavIcon, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
              </View>
              <View style={dynStyles.quickNavText}>
                <Text style={dynStyles.quickNavLabel}>{item.label}</Text>
                <Text style={dynStyles.quickNavDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* ── INVITE OPTIONS MODAL ── */}
      <Modal
        visible={showInviteOptions}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInviteOptions(false)}
      >
        <View style={dynStyles.inviteOverlay}>
          <View style={dynStyles.inviteCard}>
            <Text style={dynStyles.modalTitle}>Invite Family</Text>
            <Button
              title="Switch Active Profile"
              onPress={() => {
                setShowInviteOptions(false);
                navigation.navigate('ProfileSwitcher');
              }}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title="Show QR Invite Code"
              onPress={() => {
                setShowInviteOptions(false);
                navigation.navigate('FamilyInviteQR');
              }}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title="Scan QR Invite"
              onPress={() => {
                setShowInviteOptions(false);
                navigation.navigate('JoinFamily');
              }}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title={`View Join Requests (${pendingRequestsCount})`}
              onPress={() => {
                setShowInviteOptions(false);
                navigation.navigate('JoinRequests');
              }}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title="Copy Invite Link"
              onPress={handleShareInvite}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title="Copy Family Join Code"
              onPress={handleCopyInvite}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title="Import Contacts"
              onPress={handleImportContacts}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title="Add Manually"
              onPress={() => {
                setShowInviteOptions(false);
                setShowModal(true);
              }}
              fullWidth
              style={{ marginBottom: 12 }}
            />
            <Button
              title="Cancel"
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

          <Text style={dynStyles.modalTitle}>Invite Family Member</Text>
          <Text style={dynStyles.modalSubtitle}>
            Add someone to your household profile and assign their role.
          </Text>

          {newName.trim() && (
            <View style={dynStyles.previewRow}>
              <Avatar name={newName} color={newColor} size={56} />
              <Text style={dynStyles.previewName}>{newName}</Text>
            </View>
          )}

          <Text style={dynStyles.modalLabel}>Full Name *</Text>
          <TextInput
            style={dynStyles.modalInput}
            placeholder="e.g. Alex Johnson"
            value={newName}
            onChangeText={setNewName}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <Text style={dynStyles.modalLabel}>Role</Text>
          <View style={dynStyles.roleGrid}>
            {MEMBER_ROLES.map((role) => (
              <Pressable
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

          <Text style={dynStyles.modalLabel}>Avatar Color</Text>
          <View style={dynStyles.colorRow}>
            {AVATAR_COLORS.map((color) => (
              <Pressable
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

function makeStyles(colors: import('../../theme/ThemeContext').ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── HEADER ──
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },

  headerLeft: { flex: 1, minWidth: 0 },

  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  activeProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats row inside header
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 3,
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
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
    marginTop: 20,
  },

  // ── MEMBER AVATAR CARDS (horizontal scroll) ──
  membersScroll: {
    paddingRight: 16,
    gap: 12,
  },

  memberAvatarCard: {
    width: 110,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    overflow: 'hidden',
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
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2952',
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'center',
  },

  memberCardNameActive: {
    color: '#fff',
  },

  roleBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
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
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },

  memberCardPoints: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E4A8A',
  },

  memberCardPointsActive: {
    color: 'rgba(255,255,255,0.9)',
  },

  memberCardLevel: {
    fontSize: 10,
    fontWeight: '700',
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
    width: 90,
    backgroundColor: '#fff',
    borderRadius: 18,
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
    borderRadius: 18,
    padding: 18,
    marginTop: 8,
    ...CARD_SHADOW,
  },

  healthCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  healthCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  healthIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  healthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2952',
  },

  healthSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  healthScore: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F2952',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },

  guardianCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },

  guardianIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  guardianText: { flex: 1 },

  guardianTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },

  guardianDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
  },

  // ── QUICK NAV TILES ──
  quickNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  quickNavTile: {
    width: (width - 42) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...CARD_SHADOW,
  },

  quickNavIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  quickNavText: {
    flex: 1,
    minWidth: 0,
  },

  quickNavLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2952',
  },

  quickNavDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
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
    fontSize: 24,
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
