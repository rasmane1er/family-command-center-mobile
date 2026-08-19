import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { useTabBarInset } from '../../hooks/useTabBarInset';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  useVolunteerStore,
  VolunteerCause,
  VolunteerLog,
} from '../../store/useVolunteerStore';

type MainTab = 'log' | 'members' | 'impact';

const CAUSES: { value: VolunteerCause; label: string; color: string }[] = [
  { value: 'education', label: 'Education', color: '#2196F3' },
  { value: 'environment', label: 'Environment', color: '#4CAF50' },
  { value: 'animals', label: 'Animals', color: '#9C27B0' },
  { value: 'elderly', label: 'Elderly', color: '#FF9800' },
  { value: 'food-bank', label: 'Food Bank', color: '#FFC107' },
  { value: 'religious', label: 'Religious', color: '#607D8B' },
  { value: 'sports-coaching', label: 'Sports', color: '#00BCD4' },
  { value: 'community', label: 'Community', color: '#009688' },
  { value: 'health', label: 'Health', color: '#F44336' },
  { value: 'arts', label: 'Arts', color: '#E91E63' },
  { value: 'other', label: 'Other', color: '#9E9E9E' },
];

const MEMBERS = [
  { id: 'mom', name: 'Mom', color: '#FF6B6B' },
  { id: 'dad', name: 'Dad', color: '#4ECDC4' },
  { id: 'emma', name: 'Emma', color: '#45B7D1' },
];

function getCauseColor(cause: VolunteerCause): string {
  return CAUSES.find((c) => c.value === cause)?.color ?? '#9E9E9E';
}

function getCauseLabel(cause: VolunteerCause): string {
  return CAUSES.find((c) => c.value === cause)?.label ?? cause;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const CURRENT_YEAR = new Date().getFullYear();

export function VolunteerTrackerScreen({ navigation: _navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const store = useVolunteerStore();

  const [activeTab, setActiveTab] = useState<MainTab>('log');

  // Add Log modal
  const [showAddLog, setShowAddLog] = useState(false);
  const [logMemberId, setLogMemberId] = useState('mom');
  const [logMemberName, setLogMemberName] = useState('Mom');
  const [logOrg, setLogOrg] = useState('');
  const [logCause, setLogCause] = useState<VolunteerCause>('community');
  const [logDate, setLogDate] = useState('');
  const [logHours, setLogHours] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [logSupervisor, setLogSupervisor] = useState('');
  const [logVerified, setLogVerified] = useState(false);

  // Set Goal modal
  const [showSetGoal, setShowSetGoal] = useState(false);
  const [goalMemberId, setGoalMemberId] = useState('mom');
  const [goalMemberName, setGoalMemberName] = useState('Mom');
  const [goalHours, setGoalHours] = useState('');

  const allLogs = [...store.logs].sort((a, b) => b.date.localeCompare(a.date));
  const totalFamilyHoursThisYear = MEMBERS.reduce(
    (sum, m) => sum + store.getTotalHours(m.id, CURRENT_YEAR),
    0,
  );
  const totalFamilyAllTime = MEMBERS.reduce(
    (sum, m) => sum + store.getAllTimeHours(m.id),
    0,
  );

  const resetLogForm = () => {
    setLogMemberId('mom'); setLogMemberName('Mom'); setLogOrg(''); setLogCause('community');
    setLogDate(''); setLogHours(''); setLogDesc(''); setLogSupervisor(''); setLogVerified(false);
  };

  const handleAddLog = () => {
    if (!logOrg.trim() || !logHours.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    store.addLog({
      memberId: logMemberId,
      memberName: logMemberName,
      organizationName: logOrg.trim(),
      cause: logCause,
      date: logDate.trim() || today,
      hours: parseFloat(logHours) || 0,
      description: logDesc.trim(),
      supervisor: logSupervisor.trim(),
      verified: logVerified,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetLogForm();
    setShowAddLog(false);
  };

  const handleSetGoal = () => {
    if (!goalHours.trim()) return;
    store.setGoal({
      memberId: goalMemberId,
      memberName: goalMemberName,
      yearlyHoursGoal: parseFloat(goalHours) || 0,
      year: CURRENT_YEAR,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoalHours('');
    setShowSetGoal(false);
  };

  const handleDeleteLog = (log: VolunteerLog) => {
    Alert.alert('Remove Log', `Delete "${log.organizationName}" entry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          store.removeLog(log.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  // Impact tab data
  const causeTotals: Record<string, number> = {};
  for (const log of store.logs) {
    causeTotals[log.cause] = (causeTotals[log.cause] ?? 0) + log.hours;
  }
  const topCauses = Object.entries(causeTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const orgSet = new Set(store.logs.map((l) => l.organizationName));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#E65100', '#F57C00']}
        style={{ paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Volunteer Tracker</Text>
            <Text style={styles.headerSubtitle}>Community service hours</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeNum}>{totalFamilyHoursThisYear}</Text>
            <Text style={styles.headerBadgeLabel}>hrs this year</Text>
          </View>
        </View>
        <View style={styles.tabRow}>
          {(['log', 'members', 'impact'] as MainTab[]).map((t) => (
            <Pressable accessibilityRole="button" key={t} onPress={() => setActiveTab(t)} style={{ ...styles.tabPill, ...(activeTab === t ? styles.tabPillActive : {}) }}>
              <Text style={{ ...styles.tabPillText, ...(activeTab === t ? styles.tabPillTextActive : {}) }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ─── Log Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'log' && (
          <>
            {allLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name={'heart-outline' as any} size={56} color={colors.textMuted} />
                <Text style={styles.emptyText}>No volunteer logs yet</Text>
                <Text style={styles.emptySubText}>Tap + to log service hours</Text>
              </View>
            ) : (
              allLogs.map((log) => {
                const memberColor = MEMBERS.find((m) => m.id === log.memberId)?.color ?? colors.textMuted;
                const causeColor = getCauseColor(log.cause);
                return (
                  <Card key={log.id} style={styles.logCard}>
                    <View style={styles.logHeader}>
                      <View style={[styles.memberAvatar, { backgroundColor: memberColor }]}>
                        <Text style={styles.memberAvatarText}>{log.memberName.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.logOrg}>{log.organizationName}</Text>
                        <Text style={styles.logMeta}>{log.memberName} · {formatDate(log.date)}</Text>
                      </View>
                      <View style={styles.logRight}>
                        <Text style={styles.logHours}>{log.hours}h</Text>
                        {log.verified && (
                          <Ionicons name={'checkmark-circle' as any} size={16} color={colors.success} />
                        )}
                      </View>
                    </View>
                    <View style={styles.logFooter}>
                      <View style={[styles.causeBadge, { backgroundColor: causeColor + '20' }]}>
                        <Text style={[styles.causeBadgeText, { color: causeColor }]}>{getCauseLabel(log.cause)}</Text>
                      </View>
                      {log.description ? <Text style={styles.logDesc} numberOfLines={1}>{log.description}</Text> : null}
                      <Pressable accessibilityRole="button" onPress={() => handleDeleteLog(log)} hitSlop={8} style={{ marginLeft: 'auto' as any }}>
                        <Ionicons name={'trash-outline' as any} size={15} color={colors.danger} />
                      </Pressable>
                    </View>
                  </Card>
                );
              })
            )}
          </>
        )}

        {/* ─── By Member Tab ───────────────────────────────────────────────── */}
        {activeTab === 'members' && (
          <>
            <Pressable accessibilityRole="button" onPress={() => setShowSetGoal(true)} style={styles.setGoalBtn}>
              <Ionicons name={'flag-outline' as any} size={16} color={colors.primary} />
              <Text style={styles.setGoalText}>Set Annual Goal</Text>
            </Pressable>
            {MEMBERS.map((member) => {
              const hoursThisYear = store.getTotalHours(member.id, CURRENT_YEAR);
              const allTimeHours = store.getAllTimeHours(member.id);
              const goal = store.goals.find((g) => g.memberId === member.id && g.year === CURRENT_YEAR);
              const goalHoursVal = goal?.yearlyHoursGoal ?? 0;
              const pct = goalHoursVal > 0 ? Math.min(hoursThisYear / goalHoursVal, 1) : 0;
              const byOrg = store.getHoursByOrg(member.id);
              const topOrgs = Object.entries(byOrg).sort((a, b) => b[1] - a[1]).slice(0, 2);

              return (
                <Card key={member.id} style={styles.memberCard}>
                  <View style={styles.memberCardHeader}>
                    <View style={[styles.memberAvatarLg, { backgroundColor: member.color }]}>
                      <Text style={styles.memberAvatarLgText}>{member.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberAllTime}>{allTimeHours} hrs all-time</Text>
                    </View>
                    <View style={styles.memberHoursBox}>
                      <Text style={[styles.memberHoursNum, { color: member.color }]}>{hoursThisYear}</Text>
                      <Text style={styles.memberHoursLabel}>hrs / {goalHoursVal || '?'}</Text>
                    </View>
                  </View>
                  {goalHoursVal > 0 && (
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${pct * 100}%` as any, backgroundColor: member.color }]} />
                    </View>
                  )}
                  {topOrgs.length > 0 && (
                    <View style={styles.topOrgsRow}>
                      {topOrgs.map(([org, hrs]) => (
                        <View key={org} style={styles.orgChip}>
                          <Text style={styles.orgChipText} numberOfLines={1}>{org}</Text>
                          <Text style={styles.orgChipHrs}>{hrs}h</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              );
            })}
          </>
        )}

        {/* ─── Impact Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'impact' && (
          <>
            <View style={styles.impactRow}>
              <Card style={styles.impactStatCard}>
                <Text style={styles.impactNum}>{totalFamilyAllTime}</Text>
                <Text style={styles.impactLabel}>All-time{'\n'}hours</Text>
              </Card>
              <Card style={styles.impactStatCard}>
                <Text style={styles.impactNum}>{totalFamilyHoursThisYear}</Text>
                <Text style={styles.impactLabel}>This year</Text>
              </Card>
              <Card style={styles.impactStatCard}>
                <Text style={styles.impactNum}>{orgSet.size}</Text>
                <Text style={styles.impactLabel}>Orgs served</Text>
              </Card>
            </View>
            <Text style={styles.sectionTitle}>Top Causes</Text>
            {topCauses.map(([cause, hrs], i) => {
              const causeColor = getCauseColor(cause as VolunteerCause);
              const maxHrs = topCauses[0]?.[1] ?? 1;
              const pct = hrs / maxHrs;
              return (
                <Card key={cause} style={styles.causeCard}>
                  <View style={styles.causeCardRow}>
                    <Text style={styles.causeRank}>#{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={styles.causeLabelRow}>
                        <View style={[styles.causeDot, { backgroundColor: causeColor }]} />
                        <Text style={styles.causeName}>{getCauseLabel(cause as VolunteerCause)}</Text>
                      </View>
                      <View style={styles.causeBarBg}>
                        <View style={[styles.causeBarFill, { width: `${pct * 100}%` as any, backgroundColor: causeColor }]} />
                      </View>
                    </View>
                    <Text style={styles.causeHrs}>{hrs}h</Text>
                  </View>
                </Card>
              );
            })}
            {topCauses.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name={'bar-chart-outline' as any} size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>No data yet</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable accessibilityRole="button" onPress={() => setShowAddLog(true)} style={[styles.fab, { bottom: tabBarInset }]}>
        <LinearGradient colors={['#E65100', '#F57C00']} style={styles.fabGradient}>
          <Ionicons name={'add' as any} size={28} color="#fff" />
        </LinearGradient>
      </Pressable>

      {/* Add Log Modal */}
      <Modal visible={showAddLog} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddLog(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Log Volunteer Hours</Text>
            <Text style={styles.fieldLabel}>Family Member</Text>
            <View style={styles.optionRow}>
              {MEMBERS.map((m) => (
                <Pressable accessibilityRole="button" key={m.id} onPress={() => { setLogMemberId(m.id); setLogMemberName(m.name); }} style={{ ...styles.optionChip, ...(logMemberId === m.id ? { backgroundColor: m.color } : {}) }}>
                  <Text style={{ ...styles.optionChipText, ...(logMemberId === m.id ? { color: '#fff' } : {}) }}>{m.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Organization *</Text>
            <TextInput accessibilityLabel="Organization name" style={styles.input} value={logOrg} onChangeText={setLogOrg} placeholder="Organization name" />
            <Text style={styles.fieldLabel}>Cause</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CAUSES.map((c) => (
                <Pressable accessibilityRole="button" key={c.value} onPress={() => setLogCause(c.value)} style={{ ...styles.optionChip, ...(logCause === c.value ? { backgroundColor: c.color } : {}), marginRight: 8 }}>
                  <Text style={{ ...styles.optionChipText, ...(logCause === c.value ? { color: '#fff' } : {}) }}>{c.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput accessibilityLabel="2026-07-27" style={styles.input} value={logDate} onChangeText={setLogDate} placeholder="2026-07-27" />
            <Text style={styles.fieldLabel}>Hours *</Text>
            <TextInput accessibilityLabel="3.5" style={styles.input} value={logHours} onChangeText={setLogHours} placeholder="3.5" keyboardType="decimal-pad" />
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput accessibilityLabel="What did you do?" style={{ ...styles.input, height: 72 }} value={logDesc} onChangeText={setLogDesc} placeholder="What did you do?" multiline />
            <Text style={styles.fieldLabel}>Supervisor / Contact</Text>
            <TextInput accessibilityLabel="Name of supervisor" style={styles.input} value={logSupervisor} onChangeText={setLogSupervisor} placeholder="Name of supervisor" />
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Officially Verified</Text>
              <Switch value={logVerified} onValueChange={setLogVerified} trackColor={{ true: colors.success }} />
            </View>
            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="ghost" onPress={() => { resetLogForm(); setShowAddLog(false); }} />
              <Button title="Log Hours" onPress={handleAddLog} disabled={!logOrg.trim() || !logHours.trim()} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Set Goal Modal */}
      <Modal visible={showSetGoal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSetGoal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ ...styles.modal, padding: 20 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Set Annual Goal</Text>
            <Text style={styles.fieldLabel}>Family Member</Text>
            <View style={styles.optionRow}>
              {MEMBERS.map((m) => (
                <Pressable accessibilityRole="button" key={m.id} onPress={() => { setGoalMemberId(m.id); setGoalMemberName(m.name); }} style={{ ...styles.optionChip, ...(goalMemberId === m.id ? { backgroundColor: m.color } : {}) }}>
                  <Text style={{ ...styles.optionChipText, ...(goalMemberId === m.id ? { color: '#fff' } : {}) }}>{m.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Annual Hours Goal for {CURRENT_YEAR}</Text>
            <TextInput accessibilityLabel="50" style={styles.input} value={goalHours} onChangeText={setGoalHours} placeholder="50" keyboardType="number-pad" />
            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="ghost" onPress={() => { setGoalHours(''); setShowSetGoal(false); }} />
              <Button title="Save Goal" onPress={handleSetGoal} disabled={!goalHours.trim()} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 110 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 2 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  headerBadgeNum: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerBadgeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabPill: { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  tabPillActive: { backgroundColor: '#fff' },
  tabPillText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  tabPillTextActive: { color: '#E65100' },
  logCard: { marginBottom: 10, ...shadows.sm },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  logOrg: { fontSize: 15, fontWeight: '700', color: colors.text },
  logMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  logRight: { alignItems: 'flex-end', gap: 4 },
  logHours: { fontSize: 18, fontWeight: '700', color: colors.primary },
  logFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8, flexWrap: 'wrap' },
  causeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  causeBadgeText: { fontSize: 12, fontWeight: '600' },
  logDesc: { fontSize: 12, color: colors.textMuted, flex: 1 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.textSecondary, marginTop: 12 },
  emptySubText: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  setGoalBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginBottom: 12, padding: 8, backgroundColor: colors.card, borderRadius: 10, ...shadows.sm },
  setGoalText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  memberCard: { marginBottom: 12, ...shadows.sm },
  memberCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberAvatarLg: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  memberAvatarLgText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  memberName: { fontSize: 16, fontWeight: '700', color: colors.text },
  memberAllTime: { fontSize: 12, color: colors.textSecondary },
  memberHoursBox: { alignItems: 'flex-end' },
  memberHoursNum: { fontSize: 22, fontWeight: '800' },
  memberHoursLabel: { fontSize: 11, color: colors.textMuted },
  progressBarBg: { height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 12, marginBottom: 8 },
  progressBarFill: { height: 6, borderRadius: 3 },
  topOrgsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  orgChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0F4FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  orgChipText: { fontSize: 12, fontWeight: '600', color: colors.primary, maxWidth: 120 },
  orgChipHrs: { fontSize: 12, color: colors.textSecondary },
  impactRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  impactStatCard: { flex: 1, alignItems: 'center', paddingVertical: 16, ...shadows.sm },
  impactNum: { fontSize: 28, fontWeight: '800', color: '#E65100' },
  impactLabel: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  causeCard: { marginBottom: 10, ...shadows.sm },
  causeCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  causeRank: { fontSize: 13, fontWeight: '700', color: colors.textMuted, width: 24 },
  causeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  causeDot: { width: 8, height: 8, borderRadius: 4 },
  causeName: { fontSize: 14, fontWeight: '600', color: colors.text },
  causeBarBg: { height: 6, backgroundColor: colors.border, borderRadius: 3 },
  causeBarFill: { height: 6, borderRadius: 3 },
  causeHrs: { fontSize: 16, fontWeight: '700', color: colors.text, minWidth: 36, textAlign: 'right' },
  fab: { position: 'absolute', right: 20 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  modal: { flex: 1, backgroundColor: colors.background },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 4 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.border },
  optionChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, justifyContent: 'flex-end' },
});
