import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Button } from '../../components/common/Button';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { MemberRole, FamilyMember } from '../../types';

const MEMBER_ROLES: MemberRole[] = ['parent', 'child', 'guardian', 'grandparent', 'caregiver'];
const AVATAR_COLORS = ['#E74C3C', '#E67E22', '#F1C40F', '#27AE60', '#2980B9', '#9B59B6', '#E91E63', '#00BCD4', '#FF6B6B', '#45B7D1'];
const generateId = () => Math.random().toString(36).substring(2, 11);

const { width } = Dimensions.get('window');

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

function getLevelProgress(points: number, level: number): number {
  const current = levelThresholds[level - 1] || 0;
  const next = levelThresholds[level] || levelThresholds[levelThresholds.length - 1];
  return (points - current) / (next - current);
}

export function FamilyProfilesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('profiles');
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<MemberRole>('child');
  const [newColor, setNewColor] = useState('#2980B9');

  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);
  const tasks = useFamilyStore((s) => s.tasks);
  const addMember = useFamilyStore((s) => s.addMember);

  const handleAddMember = () => {
    if (!newName.trim()) return;
    const member: FamilyMember = {
      id: generateId(),
      familyId: 'demo-family',
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
    setNewName(''); setNewRole('child'); setNewColor('#2980B9');
    setShowModal(false);
  };

  const getCompletedTasks = (memberId: string) =>
    tasks.filter((t) => t.status === 'completed' && t.completedBy === memberId).length;

  const getPendingTasks = (memberId: string) =>
    tasks.filter((t) => t.status === 'pending' && t.assignedTo?.includes(memberId)).length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0F2952', '#1E4A8A']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>{family?.name ?? 'My Family'}</Text>
            {family?.motto && <Text style={styles.headerMotto}>"{family.motto}"</Text>}
          </View>
          <Pressable onPress={() => setShowModal(true)} style={styles.addBtn}>
            <Ionicons name="person-add-outline" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
          {NAV_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => {
                if (tab.key === 'calendar') navigation.navigate('Calendar');
                else if (tab.key === 'tasks') navigation.navigate('Tasks');
                else if (tab.key === 'school') navigation.navigate('SchoolCenter');
                else setActiveTab(tab.key);
              }}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            >
              <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? colors.primary : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {/* Family summary */}
        <View style={styles.familySummaryRow}>
          {[
            { icon: 'people', label: 'Members', value: members.length },
            { icon: 'star', label: 'Total Points', value: members.reduce((s, m) => s + m.points, 0).toLocaleString() },
            { icon: 'trophy', label: 'Health Score', value: `${family?.healthScore ?? 72}/100` },
          ].map((item, i) => (
            <View key={i} style={[styles.summaryCard, shadows.sm]}>
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              <Text style={styles.summaryValue}>{item.value}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Member cards */}
        {members.map((member) => (
          <Card key={member.id} style={styles.memberCard} onPress={() => {}} variant="elevated">
            <View style={styles.memberHeader}>
              <Avatar name={member.name} color={member.avatarColor} size={56} showBadge badgeColor={statusColors[member.status as keyof typeof statusColors]} />
              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  {member.isAdmin && (
                    <Badge label="Admin" variant="primary" size="sm" style={{ marginLeft: 8 }} />
                  )}
                </View>
                <Text style={styles.memberRole}>{member.role.charAt(0).toUpperCase() + member.role.slice(1)}</Text>
                <View style={styles.memberStatus}>
                  <View style={[styles.statusDot, { backgroundColor: statusColors[member.status as keyof typeof statusColors] }]} />
                  <Text style={styles.statusText}>{member.status.charAt(0).toUpperCase() + member.status.slice(1)}</Text>
                </View>
              </View>
              <View style={styles.memberPoints}>
                <Text style={styles.pointsValue}>{member.points.toLocaleString()}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
            </View>

            {/* Level progress */}
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

            {/* Task stats */}
            <View style={styles.memberStats}>
              {[
                { icon: 'checkmark-done-circle', label: 'Completed', value: getCompletedTasks(member.id), color: colors.success },
                { icon: 'time', label: 'Pending', value: getPendingTasks(member.id), color: colors.warning },
                { icon: 'star', label: 'Level', value: member.level, color: colors.secondary },
              ].map((stat, i) => (
                <View key={i} style={styles.memberStat}>
                  <Ionicons name={stat.icon as any} size={16} color={stat.color} />
                  <Text style={[styles.memberStatValue, { color: stat.color }]}>{stat.value}</Text>
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
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Family Member</Text>

          {newName.trim() && (
            <View style={styles.previewRow}>
              <Avatar name={newName} color={newColor} size={56} />
              <Text style={styles.previewName}>{newName}</Text>
            </View>
          )}

          <Text style={styles.modalLabel}>Full Name *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Alex Johnson" value={newName} onChangeText={setNewName} placeholderTextColor={colors.textMuted} autoFocus />

          <Text style={styles.modalLabel}>Role</Text>
          <View style={styles.roleGrid}>
            {MEMBER_ROLES.map((role) => (
              <Pressable key={role} onPress={() => setNewRole(role)} style={[styles.roleChip, newRole === role && styles.roleChipActive]}>
                <Text style={[styles.roleChipText, newRole === role && styles.roleChipTextActive]}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Avatar Color</Text>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map((c) => (
              <Pressable key={c} onPress={() => setNewColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, newColor === c && styles.colorSwatchSelected]} />
            ))}
          </View>

          <Button title="Add Member" onPress={handleAddMember} fullWidth size="lg" disabled={!newName.trim()} style={{ marginTop: 8 }} />
          <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerMotto: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginTop: 4 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  tabScroll: { marginBottom: 0 },
  tabContent: { paddingBottom: 0, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderTopLeftRadius: 10, borderTopRightRadius: 10, marginRight: 4 },
  tabActive: { backgroundColor: colors.background },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  tabTextActive: { color: colors.primary },
  content: { padding: 16 },
  familySummaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 6, marginBottom: 2 },
  summaryLabel: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  memberCard: { marginBottom: 12, borderRadius: 18 },
  memberHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  memberInfo: { flex: 1, marginLeft: 14 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  memberName: { fontSize: 18, fontWeight: '700', color: colors.text },
  memberRole: { fontSize: 13, color: colors.textSecondary, marginBottom: 5 },
  memberStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: colors.textSecondary },
  memberPoints: { alignItems: 'flex-end' },
  pointsValue: { fontSize: 22, fontWeight: '800', color: colors.secondary },
  pointsLabel: { fontSize: 11, color: colors.textMuted },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  levelBadge: { backgroundColor: '#E8EEF9', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  levelText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  levelNext: { fontSize: 11, color: colors.textMuted, marginLeft: 8 },
  memberStats: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
  memberStat: { flex: 1, alignItems: 'center', gap: 4 },
  memberStatValue: { fontSize: 18, fontWeight: '700' },
  memberStatLabel: { fontSize: 10, color: colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 20 },
  previewRow: { alignItems: 'center', marginBottom: 20, gap: 10 },
  previewName: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  roleChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  roleChipTextActive: { color: '#fff' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },
});
