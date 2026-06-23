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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useSleepStore, SleepQuality } from '../../store/useSleepStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const QUALITY_CONFIG: Record<SleepQuality, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😩', label: 'Terrible', color: '#E74C3C' },
  2: { emoji: '😔', label: 'Poor', color: '#E67E22' },
  3: { emoji: '😐', label: 'Fair', color: '#F5A623' },
  4: { emoji: '😊', label: 'Good', color: '#A8D5A2' },
  5: { emoji: '😄', label: 'Excellent', color: '#27AE60' },
};

const RECOMMENDED: Record<string, { range: string; label: string }> = {
  'member-1': { range: '7–9 hrs', label: 'Adult' },
  'member-2': { range: '7–9 hrs', label: 'Adult' },
  'member-3': { range: '8–10 hrs', label: 'Teen' },
  'member-4': { range: '9–12 hrs', label: 'Child' },
};

function calcDuration(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  if (isNaN(bh) || isNaN(bm) || isNaN(wh) || isNaN(wm)) return 0;
  let bedMins = bh * 60 + bm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= bedMins) wakeMins += 24 * 60;
  return Math.round(((wakeMins - bedMins) / 60) * 10) / 10;
}

function getLastSevenDays(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 86400000).toISOString().split('T')[0]);
  }
  return days;
}

function getTrendEmoji(avg: number): string {
  if (avg >= 8) return '😴';
  if (avg >= 6) return '😌';
  return '😩';
}

const SLEEP_TIPS: Record<string, string[]> = {
  'member-1': [
    'Adults need 7–9 hrs. Try to go to bed before 11 PM for best recovery.',
    'Avoid screens 30 minutes before bedtime to improve sleep quality.',
    'Consistent wake times — even on weekends — anchor your sleep cycle.',
  ],
  'member-2': [
    'Adults benefit from a cool bedroom (65–68°F) for deeper sleep.',
    'Limit caffeine after 2 PM to avoid disrupting your sleep onset.',
    'A short relaxation routine before bed can improve overall sleep quality.',
  ],
  'member-3': [
    'Teens need 8–10 hrs. Prioritize sleep during school weeks.',
    'Blue light from phones after 9 PM can delay your natural sleep by 1–2 hrs.',
    'Getting sunlight in the morning helps set a healthy sleep-wake rhythm.',
  ],
  'member-4': [
    'Children need 9–12 hrs for healthy growth and brain development.',
    'A consistent bedtime routine builds healthy sleep habits for life.',
    'Limit exciting activities in the hour before bedtime for easier wind-down.',
  ],
};

export function SleepTrackerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { logs, addLog, deleteLog, getAverageSleep, seedDemoData } = useSleepStore();
  const members = useFamilyStore((s) => s.members);

  if (logs.length === 0) seedDemoData();

  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    members[0]?.id ?? 'member-1'
  );
  const [showModal, setShowModal] = useState(false);

  // Modal state
  const [modalMemberId, setModalMemberId] = useState<string>(members[0]?.id ?? 'member-1');
  const [modalDate, setModalDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalBedtime, setModalBedtime] = useState('22:30');
  const [modalWakeTime, setModalWakeTime] = useState('06:30');
  const [modalQuality, setModalQuality] = useState<SleepQuality>(3);
  const [modalNotes, setModalNotes] = useState('');

  const activeMember = members.find((m) => m.id === selectedMemberId) ?? members[0];
  const memberLogs = logs
    .filter((l) => l.memberId === selectedMemberId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const last7Days = getLastSevenDays();
  const last7Logs = last7Days.map((date) =>
    memberLogs.find((l) => l.date === date) ?? null
  );

  const avgDuration = getAverageSleep(selectedMemberId);
  const familyAvg =
    members.length > 0
      ? members.reduce((s, m) => s + getAverageSleep(m.id), 0) / members.length
      : 0;

  const validLogs = last7Logs.filter(Boolean);
  const avgQuality =
    validLogs.length > 0
      ? validLogs.reduce((s, l) => s + (l?.quality ?? 0), 0) / validLogs.length
      : 0;
  const bestLog = validLogs.reduce(
    (best, l) => (!best || (l?.durationHours ?? 0) > (best?.durationHours ?? 0) ? l : best),
    null as (typeof validLogs)[0]
  );
  const worstLog = validLogs.reduce(
    (worst, l) =>
      !worst || (l?.durationHours ?? 99) < (worst?.durationHours ?? 99) ? l : worst,
    null as (typeof validLogs)[0]
  );

  const tips = SLEEP_TIPS[selectedMemberId] ?? SLEEP_TIPS['member-1'];
  const recommended = RECOMMENDED[selectedMemberId] ?? { range: '7–9 hrs', label: 'Adult' };

  const handleAddLog = () => {
    const duration = calcDuration(modalBedtime, modalWakeTime);
    if (duration <= 0) {
      Alert.alert('Invalid Times', 'Please enter valid bedtime and wake time in HH:MM format.');
      return;
    }
    addLog({
      familyId: 'demo-family',
      memberId: modalMemberId,
      date: modalDate,
      bedtime: modalBedtime,
      wakeTime: modalWakeTime,
      durationHours: duration,
      quality: modalQuality,
      notes: modalNotes.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    setModalNotes('');
    setModalQuality(3);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Log', 'Remove this sleep log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteLog(id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const maxBarDuration = 12;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={{ paddingTop: insets.top + 12, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Sleep Tracker</Text>
          <Pressable
            onPress={() => {
              setModalMemberId(selectedMemberId);
              setShowModal(true);
            }}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.headerStats}>
          <View style={styles.headerStatBlock}>
            <Text style={styles.headerStatValue}>{familyAvg.toFixed(1)}h</Text>
            <Text style={styles.headerStatLabel}>Family Avg Sleep</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStatBlock}>
            <Text style={styles.headerTrendEmoji}>{getTrendEmoji(familyAvg)}</Text>
            <Text style={styles.headerStatLabel}>Weekly Trend</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStatBlock}>
            <Text style={styles.headerStatValue}>{recommended.range}</Text>
            <Text style={styles.headerStatLabel}>{recommended.label} Rec.</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Member Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.memberScrollView}
        contentContainerStyle={styles.memberScrollContent}
      >
        {members.map((m) => {
          const avg = getAverageSleep(m.id);
          const isActive = m.id === selectedMemberId;
          return (
            <Pressable
              key={m.id}
              onPress={() => setSelectedMemberId(m.id)}
              style={[styles.memberTab, isActive && styles.memberTabActive]}
            >
              <View style={[styles.memberDot, { backgroundColor: m.avatarColor }]} />
              <Text style={[styles.memberTabName, isActive && styles.memberTabNameActive]}>
                {m.name.split(' ')[0]}
              </Text>
              <Text style={[styles.memberTabAvg, isActive && styles.memberTabAvgActive]}>
                {avg > 0 ? `${avg.toFixed(1)}h avg` : 'No data'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 7-Night Bar Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last 7 Nights</Text>
          <Card style={styles.chartCard} variant="elevated">
            {last7Days.map((date, i) => {
              const log = last7Logs[i];
              const dur = log?.durationHours ?? 0;
              const barWidth = dur > 0 ? Math.min((dur / maxBarDuration) * 100, 100) : 0;
              const qColor = log ? QUALITY_CONFIG[log.quality].color : colors.border;
              const dayLabel = format(new Date(date + 'T12:00:00'), 'EEE');
              return (
                <View key={date} style={styles.barRow}>
                  <Text style={styles.barDayLabel}>{dayLabel}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={{
                        width: `${barWidth}%`,
                        height: 18,
                        backgroundColor: qColor,
                        borderRadius: 4,
                        minWidth: dur > 0 ? 4 : 0,
                      }}
                    />
                  </View>
                  <Text style={styles.barDurLabel}>
                    {dur > 0 ? `${dur}h` : '—'}
                  </Text>
                </View>
              );
            })}
          </Card>
        </View>

        {/* Weekly Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Summary</Text>
          <Card style={styles.summaryCard} variant="elevated">
            <View style={styles.summaryGrid}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{avgDuration > 0 ? avgDuration.toFixed(1) : '—'}</Text>
                <Text style={styles.summaryLabel}>Avg Hours</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>
                  {avgQuality > 0 ? '⭐'.repeat(Math.round(avgQuality)) : '—'}
                </Text>
                <Text style={styles.summaryLabel}>Avg Quality</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>
                  {bestLog ? `${bestLog.durationHours}h` : '—'}
                </Text>
                <Text style={styles.summaryLabel}>Best Night</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>
                  {worstLog ? `${worstLog.durationHours}h` : '—'}
                </Text>
                <Text style={styles.summaryLabel}>Worst Night</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Sleep Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep Insights</Text>
          {tips.map((tip, i) => (
            <Card key={i} style={styles.tipCard} variant="elevated">
              <View style={styles.tipRow}>
                <View style={[styles.tipIconWrap, { backgroundColor: '#1A1A2E' + '20' }]}>
                  <Ionicons name="moon" size={16} color="#7B8FD4" />
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Recent Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Logs</Text>
          {memberLogs.length === 0 && (
            <Card style={styles.emptyCard} variant="elevated">
              <Text style={styles.emptyText}>No sleep logs yet. Tap + to add one!</Text>
            </Card>
          )}
          {memberLogs.slice(0, 10).map((log) => {
            const qc = QUALITY_CONFIG[log.quality];
            return (
              <Card key={log.id} style={styles.logCard} variant="elevated">
                <View style={styles.logRow}>
                  <View style={styles.logLeft}>
                    <Text style={styles.logEmoji}>{qc.emoji}</Text>
                    <View>
                      <Text style={styles.logDate}>
                        {format(new Date(log.date + 'T12:00:00'), 'EEE, MMM d')}
                      </Text>
                      <Text style={styles.logTime}>
                        {log.bedtime} → {log.wakeTime}
                      </Text>
                      {log.notes ? (
                        <Text style={styles.logNotes}>{log.notes}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.logRight}>
                    <Badge
                      label={`${log.durationHours}h`}
                      variant={
                        log.durationHours >= 8
                          ? 'success'
                          : log.durationHours >= 6
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    />
                    <Text style={[styles.logQualityLabel, { color: qc.color }]}>{qc.label}</Text>
                    <Pressable onPress={() => handleDelete(log.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {/* Add Sleep Log Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Sleep</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.fieldLabel}>Family Member</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalMemberScroll}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setModalMemberId(m.id)}
                  style={[
                    styles.modalMemberChip,
                    modalMemberId === m.id && { backgroundColor: m.avatarColor + '30', borderColor: m.avatarColor },
                  ]}
                >
                  <View style={[styles.memberDot, { backgroundColor: m.avatarColor }]} />
                  <Text style={[styles.modalMemberName, modalMemberId === m.id && { color: m.avatarColor }]}>
                    {m.name.split(' ')[0]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              value={modalDate}
              onChangeText={setModalDate}
              placeholder="2026-06-23"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Bedtime (HH:MM)</Text>
            <TextInput
              style={styles.textInput}
              value={modalBedtime}
              onChangeText={setModalBedtime}
              placeholder="22:30"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.fieldLabel}>Wake Time (HH:MM)</Text>
            <TextInput
              style={styles.textInput}
              value={modalWakeTime}
              onChangeText={setModalWakeTime}
              placeholder="06:30"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />

            {calcDuration(modalBedtime, modalWakeTime) > 0 && (
              <View style={styles.durationPreview}>
                <Ionicons name="time-outline" size={16} color="#7B8FD4" />
                <Text style={styles.durationPreviewText}>
                  Duration: {calcDuration(modalBedtime, modalWakeTime).toFixed(1)} hours
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Sleep Quality</Text>
            <View style={styles.qualityRow}>
              {([1, 2, 3, 4, 5] as SleepQuality[]).map((q) => {
                const qc = QUALITY_CONFIG[q];
                return (
                  <Pressable
                    key={q}
                    onPress={() => setModalQuality(q)}
                    style={[
                      styles.qualityBtn,
                      modalQuality === q && { backgroundColor: qc.color + '20', borderColor: qc.color },
                    ]}
                  >
                    <Text style={styles.qualityEmoji}>{qc.emoji}</Text>
                    <Text style={[styles.qualityLabel, modalQuality === q && { color: qc.color }]}>
                      {qc.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              value={modalNotes}
              onChangeText={setModalNotes}
              placeholder="How did you sleep? Any disturbances?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Pressable style={styles.saveBtn} onPress={handleAddLog}>
              <LinearGradient
                colors={['#1A1A2E', '#0F3460']}
                style={styles.saveBtnGradient}
              >
                <Ionicons name="moon" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save Sleep Log</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  headerStatBlock: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    textAlign: 'center',
  },
  headerStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
  },
  headerTrendEmoji: {
    fontSize: 22,
  },
  memberScrollView: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 80,
  },
  memberScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  memberTab: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: 8,
  },
  memberTabActive: {
    backgroundColor: '#1A1A2E',
    borderColor: '#0F3460',
  },
  memberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  memberTabName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  memberTabNameActive: {
    color: '#fff',
  },
  memberTabAvg: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  memberTabAvgActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  chartCard: {
    padding: 16,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barDayLabel: {
    width: 32,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 18,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barDurLabel: {
    width: 32,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  summaryCard: {
    padding: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStat: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  tipCard: {
    padding: 12,
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7B8FD420',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  logCard: {
    padding: 14,
    marginBottom: 10,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  logEmoji: {
    fontSize: 24,
  },
  logDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  logTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logNotes: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  logRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  logQualityLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
    marginTop: 2,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 60,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalMemberScroll: {
    marginBottom: 4,
  },
  modalMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginRight: 8,
  },
  modalMemberName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  durationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 10,
    backgroundColor: '#7B8FD415',
    borderRadius: 8,
  },
  durationPreviewText: {
    fontSize: 13,
    color: '#7B8FD4',
    fontWeight: '600',
  },
  qualityRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  qualityBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minWidth: 60,
  },
  qualityEmoji: {
    fontSize: 20,
  },
  qualityLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 4,
  },
  saveBtn: {
    marginTop: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
