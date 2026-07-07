import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, subDays } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useMoodStore, MoodLevel } from '../../store/useMoodStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useTranslation } from 'react-i18next';

const MOOD_CONFIG: Record<MoodLevel, { emoji: string; label: string; color: string; bg: string }> = {
  1: { emoji: '😔', label: 'Rough Day', color: '#E74C3C', bg: '#FDEDEC' },
  2: { emoji: '😕', label: 'Feeling Low', color: '#E67E22', bg: '#FEF0E2' },
  3: { emoji: '😐', label: 'Okay', color: '#F5A623', bg: '#FEF3E2' },
  4: { emoji: '🙂', label: 'Pretty Good', color: '#27AE60', bg: '#D5F5E3' },
  5: { emoji: '😄', label: 'Amazing!', color: '#2980B9', bg: '#EBF5FB' },
};

const MOOD_TIPS: Record<MoodLevel, string> = {
  1: 'Everyone has tough days. Consider sharing how you feel with the family tonight.',
  2: 'A short walk or calling a friend can help shift the mood.',
  3: 'A neutral day is perfectly fine. Keep going!',
  4: 'Great energy! This is a good time to tackle something meaningful.',
  5: "Fantastic! Your positive energy lifts the whole family. Share what's working!",
};

function getWeekDates(): string[] {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    dates.push(subDays(new Date(), i).toISOString().split('T')[0]);
  }
  return dates;
}

export function MoodTrackerScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const members = useFamilyStore((s) => s.members);
  const { entries, addMoodEntry, deleteMoodEntry, getTodayMood, getMemberHistory } = useMoodStore();

  const weekDates = getWeekDates();
  const today = new Date().toISOString().split('T')[0];
  const activeMember = selectedMember
    ? members.find((m) => m.id === selectedMember)
    : members[0];

  const todayMood = activeMember ? getTodayMood(activeMember.id) : undefined;
  const history = activeMember ? getMemberHistory(activeMember.id, 7) : [];

  const familyAvgToday = () => {
    const todayEntries = entries.filter((e) => e.date === today);
    if (todayEntries.length === 0) return null;
    return todayEntries.reduce((s, e) => s + e.level, 0) / todayEntries.length;
  };

  const avg = familyAvgToday();

  const handleSetMood = (level: MoodLevel) => {
    if (!activeMember) return;
    addMoodEntry({ memberId: activeMember.id, level, date: today });
    setIsUpdating(false);
  };

  const getDateEntry = (memberId: string, date: string) => entries.find((e) => e.memberId === memberId && e.date === date);

  const screenHeader = (
    <LinearGradient colors={['#E91E63', '#AD1457']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Family Mood Tracker</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.familyMoodRow}>
        <View style={styles.familyMoodLeft}>
          <Text style={styles.familyMoodLabel}>FAMILY MOOD TODAY</Text>
          <Text style={styles.familyMoodEmoji}>
            {avg !== null ? MOOD_CONFIG[Math.round(avg) as MoodLevel]?.emoji : '❓'}
          </Text>
          <Text style={styles.familyMoodValue}>
            {avg !== null ? `${avg.toFixed(1)}/5.0` : 'Not checked in'}
          </Text>
        </View>
        <View style={styles.familyMoodRight}>
          {members.map((m) => {
            const todayE = getTodayMood(m.id);
            return (
              <View key={m.id} style={styles.memberMoodRow}>
                <Text style={styles.memberMoodName}>{m.name.split(' ')[0]}</Text>
                <Text style={styles.memberMoodEmoji}>
                  {todayE ? MOOD_CONFIG[todayE.level].emoji : '—'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#E91E63', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>Family Mood Tracker</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const memberBar = (
    <View style={styles.memberBar}>
      {members.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => setSelectedMember(m.id)}
          style={[styles.memberChip, selectedMember === m.id || (!selectedMember && m.id === members[0]?.id) ? styles.memberChipActive : {}]}
        >
          <Avatar name={m.name} color={m.avatarColor} size={32} />
          <Text style={styles.memberChipName}>{m.name.split(' ')[0]}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <>
      <StatusBar style="light" />
      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <>
            {memberBar}
            <ScrollView
              onScroll={onScroll}
              onScrollEndDrag={onScrollEndDrag}
              onMomentumScrollEnd={onMomentumScrollEnd}
              scrollEventThrottle={scrollEventThrottle}
              contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
            >
        {/* Today's check-in */}
        <Text style={styles.sectionTitle}>
          {activeMember?.name.split(' ')[0]}'s Check-in Today
        </Text>
        {todayMood && !isUpdating ? (
          <Card variant="elevated" style={{ ...styles.checkedCard, backgroundColor: MOOD_CONFIG[todayMood.level].bg }}>
            <Text style={styles.checkedEmoji}>{MOOD_CONFIG[todayMood.level].emoji}</Text>
            <Text style={[styles.checkedLabel, { color: MOOD_CONFIG[todayMood.level].color }]}>
              {MOOD_CONFIG[todayMood.level].label}
            </Text>
            <Text style={styles.checkedTip}>{MOOD_TIPS[todayMood.level]}</Text>
            <Pressable onPress={() => setIsUpdating(true)} style={styles.updateBtn}>
              <Text style={[styles.updateBtnText, { color: MOOD_CONFIG[todayMood.level].color }]}>Update mood</Text>
            </Pressable>
          </Card>
        ) : (
          <Card variant="elevated" style={styles.checkInCard}>
            <Text style={styles.checkInQuestion}>
              How is {activeMember?.name.split(' ')[0]} feeling today?
            </Text>
            <View style={styles.moodButtons}>
              {([1, 2, 3, 4, 5] as MoodLevel[]).map((level) => (
                <Pressable key={level} onPress={() => handleSetMood(level)} style={styles.moodBtn}>
                  <Text style={styles.moodBtnEmoji}>{MOOD_CONFIG[level].emoji}</Text>
                  <Text style={styles.moodBtnLabel}>{MOOD_CONFIG[level].label}</Text>
                </Pressable>
              ))}
            </View>
            {isUpdating && (
              <Pressable onPress={() => setIsUpdating(false)} style={{ marginTop: 12, alignSelf: 'center' }}>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>Cancel</Text>
              </Pressable>
            )}
          </Card>
        )}

        {/* 7-day history */}
        <Text style={styles.sectionTitle}>7-Day History</Text>
        <Card variant="elevated" style={styles.historyCard}>
          <View style={styles.historyRow}>
            {weekDates.map((date) => {
              const entry = getDateEntry(activeMember?.id || '', date);
              const isToday = date === today;
              const cfg = entry ? MOOD_CONFIG[entry.level] : null;
              return (
                <Pressable
                  key={date}
                  style={styles.historyDay}
                  onLongPress={() => {
                    if (!entry) return;
                    Alert.alert('Delete Mood Entry', `Remove the mood logged for ${format(new Date(date + 'T12:00:00'), 'EEEE')}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteMoodEntry(entry.id) },
                    ]);
                  }}
                >
                  <Text style={[styles.historyDate, isToday && styles.historyDateToday]}>
                    {format(new Date(date + 'T12:00:00'), 'EEE')}
                  </Text>
                  <View style={[styles.historyDot, cfg ? { backgroundColor: cfg.bg, borderColor: cfg.color } : styles.historyDotEmpty]}>
                    <Text style={styles.historyEmoji}>{cfg?.emoji || '—'}</Text>
                  </View>
                  <Text style={styles.historyNum}>{entry?.level || ''}</Text>
                </Pressable>
              );
            })}
          </View>
          {history.length > 0 && (
            <View style={styles.avgRow}>
              <Text style={styles.avgLabel}>7-day average mood:</Text>
              <Text style={styles.avgValue}>
                {(history.reduce((s, e) => s + e.level, 0) / history.length).toFixed(1)}/5.0
              </Text>
            </View>
          )}
        </Card>

        {/* Family heatmap */}
        <Text style={styles.sectionTitle}>Family Mood Heatmap</Text>
        <Card variant="elevated" style={styles.heatmapCard}>
          <View style={styles.heatHeader}>
            <View style={{ width: 60 }} />
            {weekDates.map((date) => (
              <Text key={date} style={styles.heatDateLabel}>
                {format(new Date(date + 'T12:00:00'), 'EEE').charAt(0)}
              </Text>
            ))}
          </View>
          {members.map((m) => (
            <View key={m.id} style={styles.heatRow}>
              <Text style={styles.heatMemberName}>{m.name.split(' ')[0]}</Text>
              {weekDates.map((date) => {
                const e = getDateEntry(m.id, date);
                const cfg = e ? MOOD_CONFIG[e.level] : null;
                return (
                  <View key={date} style={[styles.heatCell, cfg ? { backgroundColor: cfg.color + '40' } : styles.heatCellEmpty]}>
                    {e && <Text style={styles.heatEmoji}>{cfg?.emoji}</Text>}
                  </View>
                );
              })}
            </View>
          ))}
        </Card>

        <Card variant="elevated" style={styles.insightCard}>
          <Ionicons name="bulb" size={18} color={colors.secondary} />
          <Text style={styles.insightTitle}>AI Mood Insight</Text>
          <Text style={styles.insightText}>
            Your family's average mood this week is <Text style={styles.insightBold}>3.8/5</Text>. Marcus and Sarah tend to be happiest on weekends. Consider planning a fun family activity for next Saturday!
          </Text>
        </Card>
            </ScrollView>
          </>
        )}
      </CollapsibleHeader>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  familyMoodRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  familyMoodLeft: { alignItems: 'center', paddingRight: 20, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' },
  familyMoodLabel: { fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 6 },
  familyMoodEmoji: { fontSize: 42 },
  familyMoodValue: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 4 },
  familyMoodRight: { flex: 1, gap: 6 },
  memberMoodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberMoodName: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  memberMoodEmoji: { fontSize: 18 },
  memberBar: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  memberChip: { alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  memberChipActive: { backgroundColor: '#FCE4EC' },
  memberChipName: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 10 },
  checkedCard: { borderRadius: 16, alignItems: 'center', padding: 24 },
  checkedEmoji: { fontSize: 48, marginBottom: 8 },
  checkedLabel: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  checkedTip: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  updateBtn: { paddingVertical: 6, paddingHorizontal: 16 },
  updateBtnText: { fontSize: 13, fontWeight: '700' },
  checkInCard: { borderRadius: 16, padding: 20 },
  checkInQuestion: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 20 },
  moodButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  moodBtn: { alignItems: 'center', gap: 6 },
  moodBtnEmoji: { fontSize: 34 },
  moodBtnLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', textAlign: 'center', width: 54 },
  historyCard: { borderRadius: 16 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  historyDay: { alignItems: 'center', gap: 6 },
  historyDate: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  historyDateToday: { color: '#E91E63', fontWeight: '800' },
  historyDot: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  historyDotEmpty: { backgroundColor: colors.background, borderColor: colors.border },
  historyEmoji: { fontSize: 16 },
  historyNum: { fontSize: 10, color: colors.textMuted },
  avgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  avgLabel: { fontSize: 13, color: colors.textSecondary },
  avgValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  heatmapCard: { borderRadius: 16, padding: 16 },
  heatHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  heatDateLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  heatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  heatMemberName: { width: 60, fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  heatCell: { flex: 1, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  heatCellEmpty: { backgroundColor: colors.background },
  heatEmoji: { fontSize: 14 },
  insightCard: { borderRadius: 16, marginTop: 12, backgroundColor: '#FEF3E2' },
  insightTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 6, marginBottom: 6 },
  insightText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  insightBold: { fontWeight: '700', color: colors.text },
});
