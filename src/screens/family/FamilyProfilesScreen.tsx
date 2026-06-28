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
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import type { FamilyMember, MemberRole } from '../../types';

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

const NAV_TABS = [
  { key: 'profiles', label: 'Members', icon: 'people-outline' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar-outline' },
  { key: 'tasks', label: 'Tasks', icon: 'checkmark-circle-outline' },
  { key: 'school', label: 'School', icon: 'school-outline' },
];

const statusColors = {
  active: colors.success,
  away: colors.warning,
  school: '#45B7D1',
  work: '#F5A623',
  sleeping: '#94A3B8',
};

const levelThresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000, 15000];

const generateId = () => Math.random().toString(36).substring(2, 11);

function getLevelProgress(points: number, level: number): number {
  const current = levelThresholds[level - 1] || 0;
  const next = levelThresholds[level] || levelThresholds[levelThresholds.length - 1];

  if (next <= current) return 1;

  return Math.min(1, Math.max(0, (points - current) / (next - current)));
}

export function FamilyProfilesScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('profiles');
  const [showModal, setShowModal] = useState(false);
  const [showInviteOptions, setShowInviteOptions] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<MemberRole>('child');
  const [newColor, setNewColor] = useState('#2980B9');

  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);

const activeMember = members.find(
  (member) => member.id === activeMemberId
);
  const family = useFamilyStore((s) => s.family);
  const tasks = useFamilyStore((s) => s.tasks);
  const addMember = useFamilyStore((s) => s.addMember);
  const requests = useJoinRequestsStore((s) => s.requests);

  const pendingRequestsCount = requests.filter(
  (request) => request.status === 'pending'
).length;

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
    const message = `Join my Family Command Center: ${inviteLink}`;

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
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
      ],
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
    tasks.filter((task) => task.status === 'pending' && task.assignedTo?.includes(memberId)).length;

  const handleTabPress = (tabKey: string) => {
    if (tabKey === 'calendar') navigation.navigate('Calendar');
    else if (tabKey === 'tasks') navigation.navigate('Tasks');
    else if (tabKey === 'school') navigation.navigate('SchoolCenter');
    else setActiveTab(tabKey);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#0F2952', '#1E4A8A']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {family?.name ?? 'My Family'}
            </Text>
            {family?.motto && <Text style={styles.headerMotto}>"{family.motto}"</Text>}
            {activeMember && (
  <Pressable
    style={styles.activeProfileBadge}
    onPress={() => navigation.navigate('ProfileSwitcher')}
  >
    <Avatar
      name={activeMember.name}
      color={activeMember.avatarColor}
      size={28}
    />
    <Text style={styles.activeProfileName}>
      {activeMember.name}
    </Text>
    <Ionicons name="chevron-down" size={14} color="#fff" />
  </Pressable>
)}
          </View>

          <Pressable onPress={openAddMemberModal} style={styles.addBtn}>
            <Ionicons name="person-add-outline" size={22} color="#fff" />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabContent}
        >
          {NAV_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => handleTabPress(tab.key)}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.key ? colors.primary : 'rgba(255,255,255,0.7)'}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        <View style={styles.familySummaryRow}>
          {[
            { icon: 'people', label: 'Members', value: members.length },
            {
              icon: 'star',
              label: 'Total Points',
              value: members.reduce((sum, member) => sum + member.points, 0).toLocaleString(),
            },
            {
              icon: 'trophy',
              label: 'Health Score',
              value: `${family?.healthScore ?? 72}/100`,
            },
          ].map((item) => (
            <View key={item.label} style={[styles.summaryCard, shadows.sm]}>
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              <Text style={styles.summaryValue}>{item.value}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {members.map((member) => (
          <Card
            key={member.id}
            style={styles.memberCard}
            onPress={() => openMemberDetails(member.id)}
            variant="elevated"
          >
            <View style={styles.memberHeader}>
              <Avatar
                name={member.name}
                color={member.avatarColor}
                size={56}
                showBadge
                badgeColor={statusColors[member.status as keyof typeof statusColors] ?? colors.textMuted}
              />

              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {member.name}
                  </Text>
                  {member.isAdmin && (
                    <Badge label="Admin" variant="primary" size="sm" style={{ marginLeft: 8 }} />
                  )}
                </View>

                <Text style={styles.memberRole}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Text>

                <View style={styles.memberStatus}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          statusColors[member.status as keyof typeof statusColors] ?? colors.textMuted,
                      },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.memberPoints}>
                <Text style={styles.pointsValue}>{member.points.toLocaleString()}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
            </View>

            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>Lv {member.level}</Text>
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <ProgressBar
                  progress={getLevelProgress(member.points, member.level)}
                  color={member.avatarColor}
                  height={6}
                />
              </View>

              <Text style={styles.levelNext}>→ Lv {member.level + 1}</Text>
            </View>

            <View style={styles.memberStats}>
              {[
                {
                  icon: 'checkmark-done-circle',
                  label: 'Completed',
                  value: getCompletedTasks(member.id),
                  color: colors.success,
                },
                {
                  icon: 'time',
                  label: 'Pending',
                  value: getPendingTasks(member.id),
                  color: colors.warning,
                },
                {
                  icon: 'star',
                  label: 'Level',
                  value: member.level,
                  color: colors.secondary,
                },
              ].map((stat) => (
                <View key={stat.label} style={styles.memberStat}>
                  <Ionicons name={stat.icon as any} size={16} color={stat.color} />
                  <Text style={[styles.memberStatValue, { color: stat.color }]}>
                    {stat.value}
                  </Text>
                  <Text style={styles.memberStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        ))}

        {members.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={60} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No family members yet</Text>
            <Text style={styles.emptyDesc}>Add family members to get started</Text>
          </View>
        )}

        {/* Family Guardian — only visible to parents and guardians */}
        {(activeMember?.role === 'parent' || activeMember?.role === 'guardian' || activeMember?.isAdmin) && (
          <Pressable
            onPress={() => navigation.navigate('GuardianDashboard')}
            style={[styles.guardianCard, shadows.md]}
          >
            <View style={styles.guardianCardLeft}>
              <View style={styles.guardianIcon}>
                <Ionicons name="shield-checkmark" size={28} color="#fff" />
              </View>
              <View style={styles.guardianText}>
                <Text style={styles.guardianTitle}>Family Guardian</Text>
                <Text style={styles.guardianDesc}>Parental controls, screen time & location</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </Pressable>
        )}

        <Text style={styles.featureSectionTitle}>Family Features</Text>

        <View style={styles.featureGrid}>
          {[
            {
              key: 'GiftPlanner',
              icon: 'gift',
              label: 'Gift Planner',
              color: '#C2185B',
              bg: '#FCE4EC',
              desc: 'Track gifts & occasions',
            },
            {
              key: 'FamilyGoals',
              icon: 'flag',
              label: 'Family Goals',
              color: '#283593',
              bg: '#E8EAF6',
              desc: 'Shared milestones',
            },
            {
              key: 'BucketList',
              icon: 'sparkles',
              label: 'Bucket List',
              color: '#6A1B9A',
              bg: '#F3E5F5',
              desc: 'Dreams & adventures',
            },
            {
              key: 'ChoreRotation',
              icon: 'refresh-circle',
              label: 'Chores',
              color: '#0E6655',
              bg: '#D1F2EB',
              desc: 'Rotate household tasks',
            },
            {
              key: 'Allowance',
              icon: 'cash',
              label: 'Allowance',
              color: '#F57C00',
              bg: '#FFF8E1',
              desc: 'Kids money management',
            },
            {
              key: 'FamilyMeeting',
              icon: 'people-circle',
              label: 'Meetings',
              color: '#1565C0',
              bg: '#E3F2FD',
              desc: 'Family discussions',
            },
            {
              key: 'HomeworkTracker',
              icon: 'book',
              label: 'Homework',
              color: '#283593',
              bg: '#E8EAF6',
              desc: 'Assignments & grades',
            },
            {
              key: 'ActivitiesTracker',
              icon: 'football',
              label: 'Activities',
              color: '#00695C',
              bg: '#E0F2F1',
              desc: 'Sports & lessons',
            },
            {
              key: 'BirthdayTracker',
              icon: 'gift',
              label: 'Birthdays',
              color: '#AD1457',
              bg: '#FCE4EC',
              desc: 'Countdown & wishes',
            },
            {
              key: 'FamilyBoard',
              icon: 'megaphone',
              label: 'Family Board',
              color: '#1B2838',
              bg: '#ECEFF1',
              desc: 'Announcements',
            },
          ].map((feature) => (
            <Pressable
              key={feature.key}
              onPress={() => navigation.navigate(feature.key)}
              style={[styles.featureCard, shadows.sm]}
            >
              <View style={[styles.featureIcon, { backgroundColor: feature.bg }]}>
                <Ionicons name={feature.icon as any} size={26} color={feature.color} />
              </View>
              <Text style={styles.featureLabel}>{feature.label}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Modal
  visible={showInviteOptions}
  animationType="slide"
  transparent
  onRequestClose={() => setShowInviteOptions(false)}
>
  <View style={styles.inviteOverlay}>
    <View style={styles.inviteCard}>
      <Text style={styles.modalTitle}>Invite Family</Text>
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

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>Invite Family Member</Text>
          <Text style={styles.modalSubtitle}>
            Add someone to your household profile and assign their role.
          </Text>

          {newName.trim() && (
            <View style={styles.previewRow}>
              <Avatar name={newName} color={newColor} size={56} />
              <Text style={styles.previewName}>{newName}</Text>
            </View>
          )}

          <Text style={styles.modalLabel}>Full Name *</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. Alex Johnson"
            value={newName}
            onChangeText={setNewName}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <Text style={styles.modalLabel}>Role</Text>
          <View style={styles.roleGrid}>
            {MEMBER_ROLES.map((role) => (
              <Pressable
                key={role}
                onPress={() => setNewRole(role)}
                style={[styles.roleChip, newRole === role && styles.roleChipActive]}
              >
                <Text style={[styles.roleChipText, newRole === role && styles.roleChipTextActive]}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Avatar Color</Text>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => setNewColor(color)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  newColor === color && styles.colorSwatchSelected,
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 0,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },

  headerTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },

  headerMotto: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    marginTop: 4,
  },

  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabScroll: { marginBottom: 0 },

  tabContent: {
    paddingBottom: 0,
    gap: 8,
  },

  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginRight: 4,
  },

  tabActive: {
    backgroundColor: colors.background,
  },

  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },

  tabTextActive: {
    color: colors.primary,
  },

  content: {
    padding: 16,
  },

  familySummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
    marginBottom: 2,
  },

  summaryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  memberCard: {
    marginBottom: 12,
    borderRadius: 18,
  },

  memberHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  memberInfo: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },

  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },

  memberName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },

  memberRole: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 5,
  },

  memberStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  memberPoints: {
    alignItems: 'flex-end',
  },

  pointsValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.secondary,
  },

  pointsLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },

  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  levelBadge: {
    backgroundColor: '#E8EEF9',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  levelText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  levelNext: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 8,
  },

  memberStats: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },

  memberStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },

  memberStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  memberStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },

  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },

  featureSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
  },

  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },

  featureCard: {
    width: (width - 42) / 3,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },

  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  featureLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },

  featureDesc: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
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
activeProfileBadge: {
  marginTop: 12,
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'flex-start',
  backgroundColor: 'rgba(255,255,255,0.14)',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 20,
},

activeProfileName: {
  color: '#fff',
  fontSize: 13,
  fontWeight: '700',
  marginHorizontal: 8,
},

  guardianCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F2952',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },

  guardianCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },

  guardianIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  guardianText: {
    flex: 1,
  },

  guardianTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },

  guardianDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
  },
});