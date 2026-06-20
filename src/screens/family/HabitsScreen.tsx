import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { useHabitsStore } from '../../store/useHabitsStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const HABIT_ICONS = ['fitness-outline', 'book-outline', 'water-outline', 'bed-outline', 'restaurant-outline', 'walk-outline', 'heart-outline', 'star-outline', 'musical-notes-outline', 'bicycle-outline'];
const HABIT_COLORS = ['#E74C3C', '#E67E22', '#F1C40F', '#27AE60', '#2980B9', '#9B59B6', '#E91E63', '#00BCD4'];

const MOOD_EMOJIS: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getLastSevenDays(): string[] {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export function HabitsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'family' | 'personal'>('family');
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIcon, setNewIcon] = useState('star-outline');
  const [newColor, setNewColor] = useState('#2980B9');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly'>('daily');
  const [newMemberId, setNewMemberId] = useState<string | null>(null);

  const { habits, completeHabit, uncompleteHabit, deleteHabit, addHabit, isCompletedToday, seedDemoData } = useHabitsStore();
  const members = useFamilyStore((s) => s.members);
  const today = new Date().toISOString().split('T')[0];
  const lastSeven = getLastSevenDays();

  if (habits.length === 0) seedDemoData();

  const familyHabits = habits.filter((h) => !h.memberId);
  const personalHabits = habits.filter((h) => h.memberId);
  const displayed = tab === 'family' ? familyHabits : personalHabits;

  const totalStreak = familyHabits.reduce((s, h) => s + h.streak, 0);
  const completedToday = habits.filter((h) => isCompletedToday(h.id)).length;
  const avgStreak = habits.length > 0 ? Math.round(habits.reduce((s, h) => s + h.streak, 0) / habits.length) : 0;

  const handleToggle = (id: string) => {
    const completed = isCompletedToday(id);
    if (completed) {
      uncompleteHabit(id, today);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      completeHabit(id, today);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Habit', `Remove "${title}" from your habits?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteHabit(id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
    ]);
  };

  const handleAddHabit = () => {
    if (!newTitle.trim()) return;
    addHabit({
      title: newTitle.trim(),
      description: newDesc.trim() || 'Build this healthy habit',
      icon: newIcon,
      color: newColor,
      frequency: newFrequency,
      memberId: newMemberId || undefined,
      points: newFrequency === 'daily' ? 10 : 25,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewTitle('');
    setNewDesc('');
    setNewIcon('star-outline');
    setNewColor('#2980B9');
    setNewFrequency('daily');
    setNewMemberId(null);
    setShowModal(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#E67E22', '#D35400']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Family Habits</Text>
          <Pressable onPress={() => setShowModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedToday}/{habits.length}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={styles.statValue}>{avgStreak}</Text>
            <Text style={styles.statLabel}>Avg Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalStreak}</Text>
            <Text style={styles.statLabel}>Total Days</Text>
          </View>
        </View>

        <View style={styles.todayRow}>
          <Text style={styles.todayLabel}>Today — {format(new Date(), 'EEEE, MMM d')}</Text>
          <Text style={styles.todayProgress}>{Math.round((completedToday / Math.max(habits.length, 1)) * 100)}% done</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(completedToday / Math.max(habits.length, 1)) * 100}%` }]} />
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['family', 'personal'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'family' ? '👨‍👩‍👧‍👦 Family Habits' : '👤 Personal'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {displayed.map((habit) => {
          const done = isCompletedToday(habit.id);
          const member = habit.memberId ? members.find((m) => m.id === habit.memberId) : null;

          return (
            <Card key={habit.id} style={{ ...styles.habitCard, ...(done ? styles.habitCardDone : {}) }} variant="elevated">
              <View style={styles.habitTop}>
                <Pressable onPress={() => handleToggle(habit.id)} style={[styles.habitIcon, { backgroundColor: done ? habit.color : habit.color + '20' }]}>
                  <Ionicons name={habit.icon as any} size={22} color={done ? '#fff' : habit.color} />
                </Pressable>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.habitTitleRow}>
                    <Text style={styles.habitTitle}>{habit.title}</Text>
                    {habit.streak >= 7 && <Text style={styles.fireEmoji}>🔥</Text>}
                  </View>
                  <Text style={styles.habitDesc}>{habit.description}</Text>
                </View>
                <Pressable onPress={() => handleDelete(habit.id, habit.title)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* 7-day history */}
              <View style={styles.historyRow}>
                {lastSeven.map((dateStr, i) => {
                  const completed = habit.completedDates.includes(dateStr);
                  const isToday = dateStr === today;
                  return (
                    <View key={dateStr} style={styles.historyDay}>
                      <Text style={[styles.historyDayLabel, isToday && styles.historyDayLabelToday]}>
                        {DAYS[new Date(dateStr + 'T12:00:00').getDay()]}
                      </Text>
                      <Pressable
                        onPress={() => isToday ? handleToggle(habit.id) : undefined}
                        style={[
                          styles.historyDot,
                          completed ? { backgroundColor: habit.color } : styles.historyDotEmpty,
                          isToday && styles.historyDotToday,
                        ]}
                      >
                        {completed && <Ionicons name="checkmark" size={10} color="#fff" />}
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <View style={styles.habitFooter}>
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={12} color={habit.streak >= 7 ? '#E67E22' : colors.textMuted} />
                  <Text style={[styles.streakText, { color: habit.streak >= 7 ? '#E67E22' : colors.textMuted }]}>
                    {habit.streak} day streak
                  </Text>
                </View>
                <View style={styles.habitRight}>
                  {member && (
                    <Text style={[styles.memberTag, { color: member.avatarColor, backgroundColor: member.avatarColor + '20' }]}>
                      {member.name.split(' ')[0]}
                    </Text>
                  )}
                  <View style={styles.pointsBadge}>
                    <Ionicons name="star" size={11} color={colors.secondary} />
                    <Text style={styles.pointsText}>{habit.points} pts</Text>
                  </View>
                </View>
              </View>
            </Card>
          );
        })}

        {displayed.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 56 }}>🌱</Text>
            <Text style={styles.emptyTitle}>No {tab} habits yet</Text>
            <Text style={styles.emptyDesc}>Start building healthy habits for your family. Tap + to add your first habit!</Text>
          </View>
        )}

        <Card variant="elevated" style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Habit Science</Text>
          <Text style={styles.tipText}>• It takes 21 days to form a new habit, 66 days for it to become automatic.</Text>
          <Text style={styles.tipText}>• Family habits are 73% more likely to stick than solo habits.</Text>
          <Text style={styles.tipText}>• Habit streaks release dopamine — celebrate every milestone!</Text>
        </Card>
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Habit</Text>

          <TextInput
            style={styles.modalInput}
            placeholder="Habit name..."
            value={newTitle}
            onChangeText={setNewTitle}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          <TextInput
            style={styles.modalInput}
            placeholder="Description (optional)"
            value={newDesc}
            onChangeText={setNewDesc}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Frequency</Text>
          <View style={styles.freqRow}>
            {(['daily', 'weekly'] as const).map((f) => (
              <Pressable key={f} onPress={() => setNewFrequency(f)} style={[styles.freqChip, newFrequency === f && styles.freqChipActive]}>
                <Text style={[styles.freqChipText, newFrequency === f && styles.freqChipTextActive]}>
                  {f === 'daily' ? '📅 Daily' : '📆 Weekly'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {HABIT_ICONS.map((icon) => (
              <Pressable key={icon} onPress={() => setNewIcon(icon)} style={[styles.iconPick, newIcon === icon && { backgroundColor: newColor + '30', borderColor: newColor }]}>
                <Ionicons name={icon as any} size={24} color={newIcon === icon ? newColor : colors.textMuted} />
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Color</Text>
          <View style={styles.colorRow}>
            {HABIT_COLORS.map((c) => (
              <Pressable key={c} onPress={() => setNewColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, newColor === c && styles.colorSwatchSelected]} />
            ))}
          </View>

          <Text style={styles.modalLabel}>Assign To (Personal)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            <Pressable onPress={() => setNewMemberId(null)} style={[styles.assignChip, !newMemberId && styles.assignChipActive]}>
              <Text style={styles.assignChipLabel}>Family</Text>
            </Pressable>
            {members.map((m) => (
              <Pressable key={m.id} onPress={() => setNewMemberId(m.id)} style={[styles.assignChip, newMemberId === m.id && styles.assignChipActive]}>
                <Avatar name={m.name} color={m.avatarColor} size={28} />
                <Text style={styles.assignChipLabel}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Button title="Add Habit" onPress={handleAddHabit} fullWidth size="lg" disabled={!newTitle.trim()} />
          <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', marginBottom: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 26, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  todayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  todayLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  todayProgress: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#E67E22' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#E67E22' },
  content: { padding: 16 },
  habitCard: { marginBottom: 14, borderRadius: 16 },
  habitCardDone: { opacity: 0.8 },
  habitTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  habitIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  habitTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  habitTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  fireEmoji: { fontSize: 16 },
  habitDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  deleteBtn: { padding: 4 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  historyDay: { alignItems: 'center', gap: 5 },
  historyDayLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  historyDayLabelToday: { color: colors.primary, fontWeight: '800' },
  historyDot: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  historyDotEmpty: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border },
  historyDotToday: { borderWidth: 2, borderColor: colors.primary },
  habitFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { fontSize: 12, fontWeight: '600' },
  habitRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberTag: { fontSize: 11, fontWeight: '700', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pointsText: { fontSize: 12, color: colors.secondary, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  tipsCard: { borderRadius: 16, marginTop: 12 },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  tipText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 4 },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 14, ...shadows.sm },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  freqRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  freqChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center' },
  freqChipActive: { backgroundColor: '#E67E2220', borderColor: '#E67E22' },
  freqChipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  freqChipTextActive: { color: '#E67E22' },
  iconPick: { width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  colorSwatch: { width: 34, height: 34, borderRadius: 17 },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },
  assignChip: { alignItems: 'center', marginRight: 12, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', gap: 4 },
  assignChipActive: { borderColor: colors.primary, backgroundColor: '#E8EEF9' },
  assignChipLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
});
