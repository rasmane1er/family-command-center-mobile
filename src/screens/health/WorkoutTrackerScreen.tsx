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
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useWorkoutStore, WorkoutType } from '../../store/useWorkoutStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useNavigation } from '@react-navigation/native';

const WORKOUT_CONFIG: Record<WorkoutType, { icon: string; color: string; label: string }> = {
  cardio:   { icon: 'flame',       color: '#E74C3C', label: 'Cardio' },
  strength: { icon: 'barbell',     color: '#2980B9', label: 'Strength' },
  yoga:     { icon: 'leaf',        color: '#27AE60', label: 'Yoga' },
  sports:   { icon: 'basketball',  color: '#F5A623', label: 'Sports' },
  walking:  { icon: 'walk',        color: '#16A085', label: 'Walking' },
  cycling:  { icon: 'bicycle',     color: '#8E44AD', label: 'Cycling' },
  swimming: { icon: 'water',       color: '#2980B9', label: 'Swimming' },
  other:    { icon: 'fitness',     color: '#7F8C8D', label: 'Other' },
};

const WORKOUT_TYPES = Object.keys(WORKOUT_CONFIG) as WorkoutType[];

function getLastSevenDays(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 86400000).toISOString().split('T')[0]);
  }
  return days;
}

export function WorkoutTrackerScreen({ navigation: navProp }: any) {
  const { colors } = useTheme();
  const navHook = useNavigation<any>();
  const navigation = navProp ?? navHook;
  const insets = useSafeAreaInsets();
  const { workouts, addWorkout, deleteWorkout, getWeeklyCount, getTotalMinutes, seedDemoData } = useWorkoutStore();
  const members = useFamilyStore((s) => s.members);

  if (workouts.length === 0) seedDemoData();

  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id ?? 'member-1');
  const [showModal, setShowModal] = useState(false);

  // Modal state
  const [modalMemberId, setModalMemberId] = useState<string>(members[0]?.id ?? 'member-1');
  const [modalType, setModalType] = useState<WorkoutType>('cardio');
  const [modalTitle, setModalTitle] = useState('');
  const [modalDate, setModalDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalDuration, setModalDuration] = useState('');
  const [modalCalories, setModalCalories] = useState('');
  const [modalDistance, setModalDistance] = useState('');
  const [modalDistUnit, setModalDistUnit] = useState<'miles' | 'km'>('miles');
  const [modalNotes, setModalNotes] = useState('');

  const memberWorkouts = workouts
    .filter((w) => w.memberId === selectedMemberId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const last7Days = getLastSevenDays();

  // Family totals this week
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const familyWeekWorkouts = workouts.filter((w) => w.date >= weekAgo);
  const familyWeekCount = familyWeekWorkouts.length;
  const familyWeekMinutes = familyWeekWorkouts.reduce((s, w) => s + w.durationMinutes, 0);

  // Selected member stats
  const memberWeekCount = getWeeklyCount(selectedMemberId);
  const memberWeekWorkouts = workouts.filter(
    (w) => w.memberId === selectedMemberId && w.date >= weekAgo
  );
  const memberWeekMinutes = memberWeekWorkouts.reduce((s, w) => s + w.durationMinutes, 0);
  const memberWeekCalories = memberWeekWorkouts.reduce((s, w) => s + (w.caloriesBurned ?? 0), 0);
  const memberAvgDuration =
    memberWeekCount > 0 ? Math.round(memberWeekMinutes / memberWeekCount) : 0;

  // Leaderboard
  const leaderboard = members
    .map((m) => ({ member: m, count: getWeeklyCount(m.id), minutes: getTotalMinutes(m.id) }))
    .sort((a, b) => b.count - a.count || b.minutes - a.minutes);

  const handleAddWorkout = () => {
    if (!modalTitle.trim()) {
      Alert.alert('Missing Info', 'Please enter a workout title.');
      return;
    }
    const dur = parseInt(modalDuration);
    if (!dur || dur <= 0) {
      Alert.alert('Missing Info', 'Please enter a valid duration in minutes.');
      return;
    }
    addWorkout({
      familyId: 'demo-family',
      memberId: modalMemberId,
      date: modalDate,
      type: modalType,
      title: modalTitle.trim(),
      durationMinutes: dur,
      caloriesBurned: modalCalories ? parseInt(modalCalories) : undefined,
      distance: modalDistance ? parseFloat(modalDistance) : undefined,
      distanceUnit: modalDistance ? modalDistUnit : undefined,
      notes: modalNotes.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    setModalTitle('');
    setModalDuration('');
    setModalCalories('');
    setModalDistance('');
    setModalNotes('');
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Workout', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteWorkout(id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const s = makeStyles(colors);

  const screenHeader = (
    <View>
      <PremiumHeader
        title="Workout Tracker"
        onBack={() => navigation.goBack()}
        colors={['#BF360C', '#D84315', '#E64A19']}
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
            <Text style={s.headerStatValue}>{familyWeekCount}</Text>
            <Text style={s.headerStatLabel}>Family Workouts</Text>
          </View>
          <View style={s.headerStatDivider} />
          <View style={s.headerStatBlock}>
            <Text style={s.headerStatValue}>{familyWeekMinutes}</Text>
            <Text style={s.headerStatLabel}>Total Minutes</Text>
          </View>
          <View style={s.headerStatDivider} />
          <View style={s.headerStatBlock}>
            <Text style={s.headerStatValue}>🔥</Text>
            <Text style={s.headerStatLabel}>This Week</Text>
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
          const count = getWeeklyCount(m.id);
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
              <Text style={[s.memberTabCount, isActive && s.memberTabCountActive]}>
                {count} workouts
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#BF360C', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={s.addBtn}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, marginLeft: 8 }}>Workout Tracker</Text>
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
        {/* Weekly Activity Grid */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Weekly Activity</Text>
          <Card style={s.gridCard} variant="elevated">
            <View style={s.dayGrid}>
              {last7Days.map((date) => {
                const didWorkout = workouts.some(
                  (w) => w.memberId === selectedMemberId && w.date === date
                );
                const dayLabel = format(new Date(date + 'T12:00:00'), 'EEE');
                return (
                  <View key={date} style={s.dayCol}>
                    <View
                      style={[
                        s.dayDot,
                        { backgroundColor: didWorkout ? '#27AE60' : colors.border },
                      ]}
                    />
                    <Text style={s.dayLabel}>{dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </View>

        {/* Stats Row */}
        <View style={s.section}>
          <View style={s.statsRow}>
            <Card style={s.statCard} variant="elevated">
              <Text style={s.statValue}>{memberWeekCount}</Text>
              <Text style={s.statLabel}>Workouts</Text>
            </Card>
            <Card style={s.statCard} variant="elevated">
              <Text style={s.statValue}>{memberWeekMinutes}</Text>
              <Text style={s.statLabel}>Minutes</Text>
            </Card>
            <Card style={s.statCard} variant="elevated">
              <Text style={s.statValue}>{memberAvgDuration}</Text>
              <Text style={s.statLabel}>Avg Min</Text>
            </Card>
            <Card style={s.statCard} variant="elevated">
              <Text style={s.statValue}>{memberWeekCalories}</Text>
              <Text style={s.statLabel}>Calories</Text>
            </Card>
          </View>
        </View>

        {/* Recent Workouts */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recent Workouts</Text>
          {memberWorkouts.length === 0 && (
            <Card style={s.emptyCard} variant="elevated">
              <Text style={s.emptyText}>No workouts logged yet. Tap + to add one!</Text>
            </Card>
          )}
          {memberWorkouts.slice(0, 10).map((w) => {
            const wc = WORKOUT_CONFIG[w.type];
            return (
              <Card key={w.id} style={s.workoutCard} variant="elevated">
                <View style={s.workoutRow}>
                  <View style={[s.workoutIconWrap, { backgroundColor: wc.color + '20' }]}>
                    <Ionicons name={wc.icon as any} size={22} color={wc.color} />
                  </View>
                  <View style={s.workoutInfo}>
                    <Text style={s.workoutTitle}>{w.title}</Text>
                    <Text style={s.workoutDate}>
                      {format(new Date(w.date + 'T12:00:00'), 'EEE, MMM d')}
                    </Text>
                    <View style={s.workoutMeta}>
                      <Badge label={`${w.durationMinutes} min`} variant="neutral" size="sm" />
                      {w.caloriesBurned ? (
                        <Badge label={`${w.caloriesBurned} cal`} variant="warning" size="sm" />
                      ) : null}
                      {w.distance ? (
                        <Badge
                          label={`${w.distance} ${w.distanceUnit ?? 'mi'}`}
                          variant="info"
                          size="sm"
                        />
                      ) : null}
                    </View>
                    {w.notes ? <Text style={s.workoutNotes}>{w.notes}</Text> : null}
                  </View>
                  <Pressable
                    onPress={() => handleDelete(w.id, w.title)}
                    style={s.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>

        {/* Family Leaderboard */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Family Leaderboard</Text>
          <Card style={s.leaderboardCard} variant="elevated">
            {leaderboard.map((entry, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <View
                  key={entry.member.id}
                  style={[s.leaderRow, i < leaderboard.length - 1 && s.leaderRowBorder]}
                >
                  <Text style={s.leaderMedal}>{medals[i] ?? `${i + 1}.`}</Text>
                  <View style={[s.leaderDot, { backgroundColor: entry.member.avatarColor }]} />
                  <Text style={s.leaderName}>{entry.member.name.split(' ')[0]}</Text>
                  <View style={s.leaderRight}>
                    <Text style={s.leaderCount}>{entry.count} workouts</Text>
                    <Text style={s.leaderMinutes}>{entry.minutes} min total</Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add Workout Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Log Workout</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            <Text style={s.fieldLabel}>Family Member</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.modalMemberScroll}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setModalMemberId(m.id)}
                  style={[
                    s.modalMemberChip,
                    modalMemberId === m.id && {
                      backgroundColor: m.avatarColor + '30',
                      borderColor: m.avatarColor,
                    },
                  ]}
                >
                  <View style={[s.memberDot, { backgroundColor: m.avatarColor }]} />
                  <Text
                    style={[
                      s.modalMemberName,
                      modalMemberId === m.id && { color: m.avatarColor },
                    ]}
                  >
                    {m.name.split(' ')[0]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.fieldLabel}>Workout Type</Text>
            <View style={s.typeGrid}>
              {WORKOUT_TYPES.map((type) => {
                const wc = WORKOUT_CONFIG[type];
                const isActive = type === modalType;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setModalType(type)}
                    style={[
                      s.typeChip,
                      isActive && { backgroundColor: wc.color + '25', borderColor: wc.color },
                    ]}
                  >
                    <Ionicons name={wc.icon as any} size={18} color={isActive ? wc.color : colors.textMuted} />
                    <Text style={[s.typeChipLabel, isActive && { color: wc.color }]}>
                      {wc.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.fieldLabel}>Title</Text>
            <TextInput
              style={s.textInput}
              value={modalTitle}
              onChangeText={setModalTitle}
              placeholder="e.g. Morning Run, Leg Day..."
              placeholderTextColor={colors.textMuted}
            />

            <Text style={s.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={s.textInput}
              value={modalDate}
              onChangeText={setModalDate}
              placeholder="2026-06-23"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={s.fieldLabel}>Duration (minutes)</Text>
            <TextInput
              style={s.textInput}
              value={modalDuration}
              onChangeText={setModalDuration}
              placeholder="e.g. 45"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={s.fieldLabel}>Calories Burned (optional)</Text>
            <TextInput
              style={s.textInput}
              value={modalCalories}
              onChangeText={setModalCalories}
              placeholder="e.g. 300"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={s.fieldLabel}>Distance (optional)</Text>
            <View style={s.distanceRow}>
              <TextInput
                style={[s.textInput, { flex: 1, marginRight: 10 }]}
                value={modalDistance}
                onChangeText={setModalDistance}
                placeholder="e.g. 3.1"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
              <View style={s.unitToggle}>
                {(['miles', 'km'] as const).map((unit) => (
                  <Pressable
                    key={unit}
                    onPress={() => setModalDistUnit(unit)}
                    style={[
                      s.unitBtn,
                      modalDistUnit === unit && s.unitBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        s.unitBtnText,
                        modalDistUnit === unit && s.unitBtnTextActive,
                      ]}
                    >
                      {unit}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Text style={s.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[s.textInput, s.textInputMultiline]}
              value={modalNotes}
              onChangeText={setModalNotes}
              placeholder="How did it feel? Any personal records?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Pressable style={s.saveBtn} onPress={handleAddWorkout}>
              <LinearGradient
                colors={['#BF360C', '#E64A19']}
                style={s.saveBtnGradient}
              >
                <Ionicons name="flame" size={18} color="#fff" />
                <Text style={s.saveBtnText}>Save Workout</Text>
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
      fontSize: 18,
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
    memberScrollView: {
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      maxHeight: 80,
    },
    memberScrollContent: {
      paddingHorizontal: 16,
      paddingVertical: 12,
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
      backgroundColor: '#BF360C',
      borderColor: '#E64A19',
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
    memberTabCount: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 2,
    },
    memberTabCountActive: {
      color: 'rgba(255,255,255,0.8)',
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
    gridCard: {
      padding: 16,
    },
    dayGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    dayCol: {
      alignItems: 'center',
      gap: 6,
    },
    dayDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    dayLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    statCard: {
      flex: 1,
      padding: 12,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 4,
      textAlign: 'center',
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
    workoutCard: {
      padding: 14,
      marginBottom: 10,
    },
    workoutRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    workoutIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    workoutInfo: {
      flex: 1,
    },
    workoutTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    workoutDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
      marginBottom: 6,
    },
    workoutMeta: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },
    workoutNotes: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 6,
      fontStyle: 'italic',
    },
    deleteBtn: {
      padding: 4,
    },
    leaderboardCard: {
      padding: 16,
    },
    leaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 10,
    },
    leaderRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    leaderMedal: {
      fontSize: 18,
      width: 28,
      textAlign: 'center',
    },
    leaderDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    leaderName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    leaderRight: {
      alignItems: 'flex-end',
    },
    leaderCount: {
      fontSize: 13,
      fontWeight: '700',
      color: '#E64A19',
    },
    leaderMinutes: {
      fontSize: 11,
      color: colors.textMuted,
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
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    typeChipLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
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
    distanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    unitToggle: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: 'hidden',
    },
    unitBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.card,
    },
    unitBtnActive: {
      backgroundColor: '#E64A19',
    },
    unitBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    unitBtnTextActive: {
      color: '#fff',
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
