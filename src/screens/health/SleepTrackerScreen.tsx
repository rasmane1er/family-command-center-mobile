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
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useSleepStore, SleepQuality } from '../../store/useSleepStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const QUALITY_CONFIG: Record<SleepQuality, { emoji: string; labelKey: string; color: string }> = {
  1: { emoji: '😩', labelKey: 'qualityTerrible', color: '#E74C3C' },
  2: { emoji: '😔', labelKey: 'qualityPoor', color: '#E67E22' },
  3: { emoji: '😐', labelKey: 'qualityFair', color: '#F5A623' },
  4: { emoji: '😊', labelKey: 'qualityGood', color: '#A8D5A2' },
  5: { emoji: '😄', labelKey: 'qualityExcellent', color: '#27AE60' },
};

const RECOMMENDED: Record<string, { range: string; labelKey: string }> = {
  'member-1': { range: '7–9 hrs', labelKey: 'ageAdult' },
  'member-2': { range: '7–9 hrs', labelKey: 'ageAdult' },
  'member-3': { range: '8–10 hrs', labelKey: 'ageTeen' },
  'member-4': { range: '9–12 hrs', labelKey: 'ageChild' },
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

const SLEEP_TIP_KEYS: Record<string, string[]> = {
  'member-1': ['member1Tip1', 'member1Tip2', 'member1Tip3'],
  'member-2': ['member2Tip1', 'member2Tip2', 'member2Tip3'],
  'member-3': ['member3Tip1', 'member3Tip2', 'member3Tip3'],
  'member-4': ['member4Tip1', 'member4Tip2', 'member4Tip3'],
};

export function SleepTrackerScreen({ navigation: navProp }: any) {
  const { colors } = useTheme();
  const navHook = useNavigation<any>();
  const navigation = navProp ?? navHook;
  const { t } = useTranslation('health');
  const insets = useSafeAreaInsets();
  const { logs, addLog, deleteLog, getAverageSleep } = useSleepStore();
  const members = useFamilyStore((s) => s.members);

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

  const tipKeys = SLEEP_TIP_KEYS[selectedMemberId] ?? SLEEP_TIP_KEYS['member-1'];
  const tips = tipKeys.map((key) => t(`health.screens.sleepTracker.${key}`));
  const recommended = RECOMMENDED[selectedMemberId] ?? { range: '7–9 hrs', labelKey: 'ageAdult' };

  const handleAddLog = () => {
    const duration = calcDuration(modalBedtime, modalWakeTime);
    if (duration <= 0) {
      Alert.alert(t('health.screens.sleepTracker.invalidTimesTitle'), t('health.screens.sleepTracker.invalidTimesMsg'));
      return;
    }
    addLog({
      familyId: useAuthStore.getState().familyId ?? '',
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
    Alert.alert(t('health.screens.sleepTracker.deleteLogTitle'), t('health.screens.sleepTracker.deleteLogMsg'), [
      { text: t('health.screens.sleepTracker.cancel'), style: 'cancel' },
      {
        text: t('health.screens.sleepTracker.delete'),
        style: 'destructive',
        onPress: () => {
          deleteLog(id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const maxBarDuration = 12;
  const s = makeStyles(colors);

  const screenHeader = (
    <View>
      <PremiumHeader
        title={t('sleep.title')}
        onBack={() => navigation.goBack()}
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        rightAction={
          <Pressable
            onPress={() => {
              setModalMemberId(selectedMemberId);
              setShowModal(true);
            }}
            style={s.addBtn}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        }
      >
        <View style={s.headerStats}>
          <View style={s.headerStatBlock}>
            <Text style={s.headerStatValue}>{familyAvg.toFixed(1)}h</Text>
            <Text style={s.headerStatLabel}>{t('health.screens.sleepTracker.familyAvgSleep')}</Text>
          </View>
          <View style={s.headerStatDivider} />
          <View style={s.headerStatBlock}>
            <Text style={s.headerTrendEmoji}>{getTrendEmoji(familyAvg)}</Text>
            <Text style={s.headerStatLabel}>{t('health.screens.sleepTracker.weeklyTrend')}</Text>
          </View>
          <View style={s.headerStatDivider} />
          <View style={s.headerStatBlock}>
            <Text style={s.headerStatValue}>{recommended.range}</Text>
            <Text style={s.headerStatLabel}>{t('health.screens.sleepTracker.ageRec', { label: t(`health.screens.sleepTracker.${recommended.labelKey}`) })}</Text>
          </View>
        </View>
      </PremiumHeader>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.memberScrollView}
        contentContainerStyle={s.memberScrollContent}
      >
        {members.map((m) => {
          const avg = getAverageSleep(m.id);
          const isActive = m.id === selectedMemberId;
          return (
            <Pressable
              key={m.id}
              onPress={() => setSelectedMemberId(m.id)}
              style={[s.memberTab, isActive && s.memberTabActive]}
            >
              <View style={[s.memberDot, { backgroundColor: m.avatarColor }]} />
              <Text style={[s.memberTabName, isActive && s.memberTabNameActive]}>
                {m.name.split(' ')[0]}
              </Text>
              <Text style={[s.memberTabAvg, isActive && s.memberTabAvgActive]}>
                {avg > 0 ? t('health.screens.sleepTracker.avgSuffix', { avg: avg.toFixed(1) }) : t('health.screens.sleepTracker.noData')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#1A1A2E', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={s.addBtn}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, marginLeft: 8 }}>{t('sleep.title')}</Text>
      <Pressable onPress={() => { setModalMemberId(selectedMemberId); setShowModal(true); }} style={s.addBtn}>
        <Ionicons name="add" size={22} color="#fff" />
      </Pressable>
    </View>
  );

  return (
    <View style={s.container}>

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: contentPaddingTop }}>
        {/* 7-Night Bar Chart */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('health.screens.sleepTracker.sectionLast7Nights')}</Text>
          <Card style={s.chartCard} variant="elevated">
            {last7Days.map((date, i) => {
              const log = last7Logs[i];
              const dur = log?.durationHours ?? 0;
              const barWidth = dur > 0 ? Math.min((dur / maxBarDuration) * 100, 100) : 0;
              const qColor = log ? QUALITY_CONFIG[log.quality].color : colors.border;
              const dayLabel = format(new Date(date + 'T12:00:00'), 'EEE');
              return (
                <View key={date} style={s.barRow}>
                  <Text style={s.barDayLabel}>{dayLabel}</Text>
                  <View style={s.barTrack}>
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
                  <Text style={s.barDurLabel}>
                    {dur > 0 ? `${dur}h` : '—'}
                  </Text>
                </View>
              );
            })}
          </Card>
        </View>

        {/* Weekly Summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('health.screens.sleepTracker.sectionWeeklySummary')}</Text>
          <Card style={s.summaryCard} variant="elevated">
            <View style={s.summaryGrid}>
              <View style={s.summaryStat}>
                <Text style={s.summaryValue}>{avgDuration > 0 ? avgDuration.toFixed(1) : '—'}</Text>
                <Text style={s.summaryLabel}>{t('health.screens.sleepTracker.avgHours')}</Text>
              </View>
              <View style={s.summaryStat}>
                <Text style={s.summaryValue}>
                  {avgQuality > 0 ? '⭐'.repeat(Math.round(avgQuality)) : '—'}
                </Text>
                <Text style={s.summaryLabel}>{t('health.screens.sleepTracker.avgQuality')}</Text>
              </View>
              <View style={s.summaryStat}>
                <Text style={s.summaryValue}>
                  {bestLog ? `${bestLog.durationHours}h` : '—'}
                </Text>
                <Text style={s.summaryLabel}>{t('health.screens.sleepTracker.bestNight')}</Text>
              </View>
              <View style={s.summaryStat}>
                <Text style={s.summaryValue}>
                  {worstLog ? `${worstLog.durationHours}h` : '—'}
                </Text>
                <Text style={s.summaryLabel}>{t('health.screens.sleepTracker.worstNight')}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Sleep Insights */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('health.screens.sleepTracker.sectionSleepInsights')}</Text>
          {tips.map((tip, i) => (
            <Card key={i} style={s.tipCard} variant="elevated">
              <View style={s.tipRow}>
                <View style={[s.tipIconWrap, { backgroundColor: '#1A1A2E' + '20' }]}>
                  <Ionicons name="moon" size={16} color="#7B8FD4" />
                </View>
                <Text style={s.tipText}>{tip}</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Recent Logs */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('health.screens.sleepTracker.sectionRecentLogs')}</Text>
          {memberLogs.length === 0 && (
            <Card style={s.emptyCard} variant="elevated">
              <Text style={s.emptyText}>{t('health.screens.sleepTracker.emptyLogs')}</Text>
            </Card>
          )}
          {memberLogs.slice(0, 10).map((log) => {
            const qc = QUALITY_CONFIG[log.quality];
            return (
              <Card key={log.id} style={s.logCard} variant="elevated">
                <View style={s.logRow}>
                  <View style={s.logLeft}>
                    <Text style={s.logEmoji}>{qc.emoji}</Text>
                    <View>
                      <Text style={s.logDate}>
                        {format(new Date(log.date + 'T12:00:00'), 'EEE, MMM d')}
                      </Text>
                      <Text style={s.logTime}>
                        {log.bedtime} → {log.wakeTime}
                      </Text>
                      {log.notes ? (
                        <Text style={s.logNotes}>{log.notes}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={s.logRight}>
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
                    <Text style={[s.logQualityLabel, { color: qc.color }]}>{t(`health.screens.sleepTracker.${qc.labelKey}`)}</Text>
                    <Pressable onPress={() => handleDelete(log.id)} style={s.deleteBtn}>
                      <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add Sleep Log Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t('health.screens.sleepTracker.logSleepTitle')}</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            <Text style={s.fieldLabel}>{t('health.screens.sleepTracker.familyMemberLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.modalMemberScroll}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setModalMemberId(m.id)}
                  style={[
                    s.modalMemberChip,
                    modalMemberId === m.id && { backgroundColor: m.avatarColor + '30', borderColor: m.avatarColor },
                  ]}
                >
                  <View style={[s.memberDot, { backgroundColor: m.avatarColor }]} />
                  <Text style={[s.modalMemberName, modalMemberId === m.id && { color: m.avatarColor }]}>
                    {m.name.split(' ')[0]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.fieldLabel}>{t('health.screens.sleepTracker.dateLabel')}</Text>
            <TextInput
              style={s.textInput}
              value={modalDate}
              onChangeText={setModalDate}
              placeholder={t('health.screens.sleepTracker.datePlaceholder')}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={s.fieldLabel}>{t('health.screens.sleepTracker.bedtimeLabel')}</Text>
            <TextInput
              style={s.textInput}
              value={modalBedtime}
              onChangeText={setModalBedtime}
              placeholder={t('health.screens.sleepTracker.bedtimePlaceholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={s.fieldLabel}>{t('health.screens.sleepTracker.wakeTimeLabel')}</Text>
            <TextInput
              style={s.textInput}
              value={modalWakeTime}
              onChangeText={setModalWakeTime}
              placeholder={t('health.screens.sleepTracker.wakeTimePlaceholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />

            {calcDuration(modalBedtime, modalWakeTime) > 0 && (
              <View style={s.durationPreview}>
                <Ionicons name="time-outline" size={16} color="#7B8FD4" />
                <Text style={s.durationPreviewText}>
                  {t('health.screens.sleepTracker.durationPreview', { hours: calcDuration(modalBedtime, modalWakeTime).toFixed(1) })}
                </Text>
              </View>
            )}

            <Text style={s.fieldLabel}>{t('health.screens.sleepTracker.sleepQualityLabel')}</Text>
            <View style={s.qualityRow}>
              {([1, 2, 3, 4, 5] as SleepQuality[]).map((q) => {
                const qc = QUALITY_CONFIG[q];
                return (
                  <Pressable
                    key={q}
                    onPress={() => setModalQuality(q)}
                    style={[
                      s.qualityBtn,
                      modalQuality === q && { backgroundColor: qc.color + '20', borderColor: qc.color },
                    ]}
                  >
                    <Text style={s.qualityEmoji}>{qc.emoji}</Text>
                    <Text style={[s.qualityLabel, modalQuality === q && { color: qc.color }]}>
                      {t(`health.screens.sleepTracker.${qc.labelKey}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.fieldLabel}>{t('health.screens.sleepTracker.notesLabel')}</Text>
            <TextInput
              style={[s.textInput, s.textInputMultiline]}
              value={modalNotes}
              onChangeText={setModalNotes}
              placeholder={t('health.screens.sleepTracker.notesPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Pressable style={s.saveBtn} onPress={handleAddLog}>
              <LinearGradient
                colors={['#1A1A2E', '#0F3460']}
                style={s.saveBtnGradient}
              >
                <Ionicons name="moon" size={18} color="#fff" />
                <Text style={s.saveBtnText}>{t('health.screens.sleepTracker.saveSleepLog')}</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      fontSize: 18,
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
      fontSize: 20,
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
}
