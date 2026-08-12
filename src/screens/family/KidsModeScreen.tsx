import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useMoodStore, MoodLevel } from '../../store/useMoodStore';
import { useHabitsStore } from '../../store/useHabitsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useGuardianStore } from '../../store/useGuardianStore';
import { useRealAchievements } from './AchievementsScreen';
import { pickTaskCompletionPhoto } from '../../utils/pickTaskPhoto';
import { generateId } from '../../utils/generateId';
import type { Task } from '../../types';
import { useTranslation } from 'react-i18next';

const MOOD_CONFIG: Record<MoodLevel, { emoji: string; label: string; color: string; bg: string }> = {
  1: { emoji: '😔', label: 'Not great', color: '#E74C3C', bg: '#FDEDEC' },
  2: { emoji: '😕', label: 'A bit low',  color: '#E67E22', bg: '#FEF0E2' },
  3: { emoji: '😐', label: 'Okay',       color: '#F5A623', bg: '#FEF3E2' },
  4: { emoji: '🙂', label: 'Pretty good',color: '#27AE60', bg: '#D5F5E3' },
  5: { emoji: '😄', label: 'Amazing!',   color: '#2980B9', bg: '#EBF5FB' },
};

const QUEST_COLORS = ['#E74C3C', '#E67E22', '#F5A623', '#27AE60', '#2980B9', '#8E44AD'];
const XP_PER_TASK = 50;

function PointsBurst({ show, points }: { show: boolean; points: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (show) {
      Animated.sequence([
        Animated.spring(anim, { toValue: 1, useNativeDriver: true }),
        Animated.delay(800),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [show]);
  if (!show) return null;
  return (
    <Animated.View
      style={[styles.burst, { opacity: anim, transform: [{ scale: anim }] }]}
      pointerEvents="none"
    >
      <Text style={styles.burstText}>+{points} XP! 🎉</Text>
    </Animated.View>
  );
}

// Small, deliberately unobtrusive — a single confirm tap away from firing a
// real alert to every parent with a push token (see useGuardianStore.addSOSAlert
// -> POST /guardian/sos), so it needs to be reachable but never accidental.
function SOSButton({ onPress, sending }: { onPress: () => void; sending: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={sending} style={styles.sosBtn} hitSlop={6}>
      <Ionicons name={sending ? 'hourglass-outline' : 'alert-circle-outline'} size={20} color="#fff" />
    </Pressable>
  );
}

export function KidsModeScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const members = useFamilyStore((s) => s.members);
  const tasks = useFamilyStore((s) => s.tasks);
  // Previously aliased to updateTask and patched { status: 'completed' }
  // directly — that bypassed completeTask's point-awarding entirely, so
  // "completing" a quest here never actually added to activeKid.points
  // even though the UI showed a "+50 XP!" burst every time. Using the
  // real actions now, same as TasksScreen.tsx, so there's one path that
  // decides what a completed task is worth.
  const completeTask = useFamilyStore((s) => s.completeTask);
  const submitTaskForApproval = useFamilyStore((s) => s.submitTaskForApproval);
  const { getTodayMood, addMoodEntry } = useMoodStore();
  const { habits, isCompletedToday, completeHabit, uncompleteHabit } = useHabitsStore();
  const familyId = useAuthStore((s) => s.familyId);
  const thisDeviceId = useGuardianStore((s) => s.thisDeviceId);
  const addSOSAlert = useGuardianStore((s) => s.addSOSAlert);
  const achievements = useRealAchievements();
  const [selectedKid, setSelectedKid] = useState<string | null>(null);
  const [showBurst, setShowBurst] = useState(false);
  const [burstPoints, setBurstPoints] = useState(XP_PER_TASK);
  const [sendingSOS, setSendingSOS] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const kids = members.filter((m) => m.role === 'child');
  const activeKid = selectedKid ? members.find((m) => m.id === selectedKid) : (kids[0] || members[0]);

  const canGoBack = typeof navigation?.canGoBack === 'function' && navigation.canGoBack();

  const myTasks = tasks.filter(
    (t) => activeKid && t.assignedTo?.includes(activeKid.id) && t.status !== 'completed'
  ).slice(0, 6);

  const myHabits = habits.filter((h) => h.memberId === activeKid?.id || !h.memberId).slice(0, 4);

  const completedTasksToday = tasks.filter(
    (t) => activeKid && t.assignedTo?.includes(activeKid.id) && t.status === 'completed'
  ).length;

  const todayMood = activeKid ? getTodayMood(activeKid.id) : undefined;
  const xp = (activeKid?.points || 0);
  const level = Math.floor(xp / 500) + 1;
  const xpProgress = (xp % 500) / 500;

  // Real trophies (same computation AchievementsScreen uses — unlocked ones
  // first, capped to what fits a horizontal teaser row) instead of a
  // hardcoded, always-the-same-4 placeholder list.
  const trophies = [...achievements]
    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked))
    .slice(0, 6);

  const handleQuestPress = async (task: Task) => {
    if (!activeKid || task.status === 'pending_approval') return;

    if (task.requiresApproval) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photoUrl = await pickTaskCompletionPhoto();
      submitTaskForApproval(task.id, activeKid.id, photoUrl ?? undefined);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeTask(task.id, activeKid.id);
    setBurstPoints(task.points);
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 1200);
  };

  const handleHabitToggle = (habitId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isCompletedToday(habitId)) {
      uncompleteHabit(habitId, today);
    } else {
      completeHabit(habitId, today);
    }
  };

  const handleMood = (level: MoodLevel) => {
    if (!activeKid) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addMoodEntry({ memberId: activeKid.id, level, date: today });
  };

  const handleSOSPress = () => {
    if (!activeKid || !familyId || sendingSOS) return;
    Alert.alert(
      'Send SOS?',
      `This will immediately alert every parent that ${activeKid.name.split(' ')[0]} needs help.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setSendingSOS(true);
            addSOSAlert({
              id: generateId(),
              familyId,
              memberId: activeKid.id,
              // Falls back to a placeholder when this device isn't the
              // kid's own registered device (e.g. a shared family tablet) —
              // the backend resolves who the alert is for from memberId,
              // not deviceId, so this is safe (see POST /guardian/sos).
              deviceId: thisDeviceId ?? `kidsmode-${activeKid.id}`,
              isResolved: false,
              createdAt: new Date().toISOString(),
            });
            setTimeout(() => {
              setSendingSOS(false);
              Alert.alert('Help is on the way', 'Your parents have been notified.');
            }, 600);
          },
        },
      ],
    );
  };

  const GRADIENT_COLORS: [string, string] = activeKid
    ? [activeKid.avatarColor, activeKid.avatarColor + 'CC']
    : ['#2980B9', '#8E44AD'];

  const cornerButton = canGoBack ? (
    <Pressable onPress={() => navigation.goBack()} style={styles.cornerBtn}>
      <Ionicons name="arrow-back" size={24} color="#fff" />
    </Pressable>
  ) : (
    <View style={styles.cornerBtn} />
  );

  const screenHeader = (
    <LinearGradient colors={GRADIENT_COLORS} style={{ paddingTop: insets.top + 6, paddingHorizontal: 20, paddingBottom: 24 }}>
      <View style={styles.headerRow}>
        {cornerButton}
        <Text style={styles.headerTitle}>Kids Mode</Text>
        <Text style={styles.headerEmoji}>🎮</Text>
        <View style={{ flex: 1 }} />
        <SOSButton onPress={handleSOSPress} sending={sendingSOS} />
      </View>

      {/* Kid selector */}
      {kids.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginBottom: 16 }}>
          {kids.map((kid) => (
            <Pressable
              key={kid.id}
              onPress={() => setSelectedKid(kid.id)}
              style={[styles.kidChip, (selectedKid === kid.id || (!selectedKid && kid.id === kids[0]?.id)) && styles.kidChipActive]}
            >
              <Avatar name={kid.name} color={kid.avatarColor} size={36} />
              <Text style={styles.kidChipName}>{kid.name.split(' ')[0]}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Player card */}
      {activeKid && (
        <View style={styles.playerCard}>
          <View style={styles.avatarRing}>
            <Avatar name={activeKid.name} color="#fff" size={64} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.playerName}>{activeKid.name.split(' ')[0]}</Text>
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Ionicons name="star" size={11} color="#FFD166" />
                <Text style={styles.levelText}>LVL {level}</Text>
              </View>
              <Text style={styles.xpText}>{xp.toLocaleString()} XP</Text>
            </View>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${xpProgress * 100}%` }]} />
            </View>
            <Text style={styles.xpNext}>{500 - (xp % 500)} XP to Level {level + 1}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakCount}>{completedTasksToday}</Text>
            <Text style={styles.streakLabel}>today</Text>
          </View>
        </View>
      )}
    </LinearGradient>
  );

  const screenCompact = (
    <View style={{ backgroundColor: GRADIENT_COLORS[0], paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
      {cornerButton}
      <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>Kids Mode 🎮</Text>
      <SOSButton onPress={handleSOSPress} sending={sendingSOS} />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <PointsBurst show={showBurst} points={burstPoints} />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={scrollEventThrottle}
        >
        {/* Mood check-in */}
        {!todayMood && (
          <Card variant="elevated" style={styles.moodCard}>
            <Text style={styles.moodQuestion}>How are you feeling today, {activeKid?.name.split(' ')[0]}? 👋</Text>
            <View style={styles.moodRow}>
              {([1, 2, 3, 4, 5] as MoodLevel[]).map((l) => (
                <Pressable key={l} onPress={() => handleMood(l)} style={styles.moodBtn}>
                  <Text style={styles.moodEmoji}>{MOOD_CONFIG[l].emoji}</Text>
                  <Text style={styles.moodLabel}>{MOOD_CONFIG[l].label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        )}

        {todayMood && (
          <Card variant="elevated" style={{ ...styles.moodCard, backgroundColor: MOOD_CONFIG[todayMood.level].bg }}>
            <View style={styles.moodCheckedRow}>
              <Text style={{ fontSize: 36 }}>{MOOD_CONFIG[todayMood.level].emoji}</Text>
              <View>
                <Text style={styles.moodCheckedLabel}>Mood checked in!</Text>
                <Text style={[styles.moodCheckedValue, { color: MOOD_CONFIG[todayMood.level].color }]}>
                  {MOOD_CONFIG[todayMood.level].label}
                </Text>
              </View>
              <Text style={styles.moodXP}>+15 XP</Text>
            </View>
          </Card>
        )}

        {/* Daily Quests */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionAccent, { backgroundColor: '#8E44AD' }]} />
            <Text style={styles.sectionTitle}>⚔️ Daily Quests</Text>
          </View>
          <Text style={styles.sectionSub}>{completedTasksToday}/{myTasks.length + completedTasksToday} done</Text>
        </View>

        {myTasks.length === 0 && completedTasksToday === 0 && (
          <Card variant="elevated" style={styles.noQuestsCard}>
            <Text style={{ fontSize: 40 }}>🎉</Text>
            <Text style={styles.noQuestsTitle}>All quests complete!</Text>
            <Text style={styles.noQuestsSub}>You're a legend today!</Text>
          </Card>
        )}

        {myTasks.map((task, i) => {
          const questColor = QUEST_COLORS[i % QUEST_COLORS.length];
          const awaitingApproval = task.status === 'pending_approval';
          return (
            <Pressable key={task.id} onPress={() => handleQuestPress(task)} disabled={awaitingApproval} style={styles.questCard}>
              <LinearGradient colors={awaitingApproval ? ['#F5A62315', '#F5A62308'] : [questColor + '15', questColor + '08']} style={styles.questGrad}>
                <View style={[styles.questIcon, { backgroundColor: (awaitingApproval ? '#F5A623' : questColor) + '20' }]}>
                  <Ionicons
                    name={awaitingApproval ? 'hourglass-outline' : task.category === 'chores' ? 'home' : task.category === 'school' ? 'school' : task.category === 'health' ? 'fitness' : 'checkbox'}
                    size={22}
                    color={awaitingApproval ? '#F5A623' : questColor}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.questTitle}>{task.title}</Text>
                  {awaitingApproval ? (
                    <Text style={styles.questWaiting}>Waiting for a parent to approve</Text>
                  ) : task.dueDate ? (
                    <Text style={styles.questDue}>Due {format(new Date(task.dueDate), 'MMM d')}</Text>
                  ) : null}
                </View>
                <View style={styles.questReward}>
                  <Text style={styles.questXP}>+{task.points}</Text>
                  <Text style={styles.questXPLabel}>XP</Text>
                </View>
                {!awaitingApproval && (
                  <View style={[styles.questCheck, { borderColor: questColor }]}>
                    <Ionicons name="checkmark" size={16} color={questColor} />
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          );
        })}

        {completedTasksToday > 0 && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>🏆 {completedTasksToday} quest{completedTasksToday !== 1 ? 's' : ''} conquered today!</Text>
          </View>
        )}

        {/* Habit challenges */}
        {myHabits.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionAccent, { backgroundColor: '#E67E22' }]} />
                <Text style={styles.sectionTitle}>🔥 Habit Challenges</Text>
              </View>
              <Text style={styles.sectionSub}>{myHabits.filter((h) => isCompletedToday(h.id)).length}/{myHabits.length} done</Text>
            </View>
            <View style={styles.habitsGrid}>
              {myHabits.map((habit) => {
                const done = isCompletedToday(habit.id);
                return (
                  <Pressable
                    key={habit.id}
                    onPress={() => handleHabitToggle(habit.id)}
                    style={[styles.habitCard, done && { ...styles.habitCardDone, backgroundColor: habit.color + '20', borderColor: habit.color }]}
                  >
                    <View style={[styles.habitIcon, { backgroundColor: done ? habit.color : habit.color + '15' }]}>
                      <Ionicons name={habit.icon as any} size={22} color={done ? '#fff' : habit.color} />
                    </View>
                    <Text style={styles.habitTitle} numberOfLines={2}>{habit.title}</Text>
                    <View style={styles.habitFooter}>
                      <Text style={[styles.habitStreak, { color: habit.streak >= 7 ? '#E67E22' : colors.textMuted }]}>
                        🔥{habit.streak}d
                      </Text>
                      {done && <Ionicons name="checkmark-circle" size={16} color={habit.color} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Trophies */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionAccent, { backgroundColor: '#F5A623' }]} />
            <Text style={styles.sectionTitle}>🏅 Trophies</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Achievements')}>
            <Text style={styles.seeAll}>View All</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {trophies.map((ach) => (
            <View key={ach.id} style={[styles.achCard, !ach.unlocked && styles.achCardLocked]}>
              <View style={[styles.achIconWrap, { backgroundColor: ach.unlocked ? ach.bg : colors.border }]}>
                <Ionicons name={ach.icon as any} size={24} color={ach.unlocked ? ach.color : colors.textMuted} />
              </View>
              <Text style={[styles.achTitle, !ach.unlocked && styles.achLockedText]} numberOfLines={1}>{ach.title}</Text>
              <Text style={styles.achDesc} numberOfLines={2}>{ach.desc}</Text>
              {ach.unlocked ? (
                <View style={styles.achUnlocked}>
                  <Ionicons name="checkmark-circle" size={12} color="#27AE60" />
                  <Text style={styles.achUnlockedText}>Unlocked!</Text>
                </View>
              ) : (
                <View style={styles.achLockIcon}>
                  <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
                </View>
              )}
            </View>
          ))}
        </ScrollView>
        </ScrollView>
        )}
      </CollapsibleHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  cornerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  sosBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(231,76,60,0.35)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerEmoji: { fontSize: 18, marginLeft: 4 },
  kidChip: { alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  kidChipActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  kidChipName: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  playerCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  avatarRing: { borderRadius: 36, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', padding: 2 },
  playerName: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 6 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8 },
  levelText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  xpText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  xpBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 4, overflow: 'hidden' },
  xpFill: { height: 6, backgroundColor: '#FFD166', borderRadius: 3 },
  xpNext: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  streakBadge: { alignItems: 'center' },
  streakEmoji: { fontSize: 20 },
  streakCount: { fontSize: 18, fontWeight: '800', color: '#fff' },
  streakLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  burst: { position: 'absolute', top: '40%', left: '30%', right: '30%', zIndex: 100, backgroundColor: '#FFD166', borderRadius: 16, padding: 12, alignItems: 'center', ...shadows.lg },
  burstText: { fontSize: 18, fontWeight: '800', color: '#333' },
  content: { padding: 16 },
  moodCard: { borderRadius: 18, marginBottom: 16, ...shadows.card },
  moodQuestion: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-around' },
  moodBtn: { alignItems: 'center', gap: 4 },
  moodEmoji: { fontSize: 34 },
  moodLabel: { fontSize: 9, color: colors.textSecondary, fontWeight: '600', textAlign: 'center', width: 50 },
  moodCheckedRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  moodCheckedLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  moodCheckedValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  moodXP: { marginLeft: 'auto', fontSize: 14, fontWeight: '800', color: '#27AE60', backgroundColor: '#D5F5E3', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  sectionSub: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  noQuestsCard: { borderRadius: 18, alignItems: 'center', paddingVertical: 32, marginBottom: 8, ...shadows.card },
  noQuestsTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 12, marginBottom: 4 },
  noQuestsSub: { fontSize: 14, color: colors.textSecondary },
  questCard: { borderRadius: 16, marginBottom: 10, overflow: 'hidden', backgroundColor: colors.card, ...shadows.card },
  questGrad: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  questIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  questTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  questDue: { fontSize: 12, color: colors.textSecondary },
  questWaiting: { fontSize: 12, color: '#B85C00', fontWeight: '600' },
  questReward: { alignItems: 'center', marginHorizontal: 8 },
  questXP: { fontSize: 18, fontWeight: '800', color: '#F5A623' },
  questXPLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '700' },
  questCheck: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  completedBanner: { backgroundColor: '#D5F5E3', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#A9DFBF' },
  completedText: { fontSize: 13, fontWeight: '700', color: '#1A6B3C', textAlign: 'center' },
  habitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  habitCard: { width: '47%', backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  habitCardDone: { borderWidth: 2 },
  habitIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  habitTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8, lineHeight: 18 },
  habitFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  habitStreak: { fontSize: 12, fontWeight: '700' },
  achCard: { width: 128, backgroundColor: colors.card, borderRadius: 16, padding: 12, alignItems: 'center', ...shadows.card },
  achCardLocked: { opacity: 0.6 },
  achIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  achTitle: { fontSize: 11, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 3 },
  achDesc: { fontSize: 9, color: colors.textSecondary, textAlign: 'center', lineHeight: 13 },
  achLockedText: { color: colors.textMuted },
  achUnlocked: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  achUnlockedText: { fontSize: 9, color: '#27AE60', fontWeight: '700' },
  achLockIcon: { marginTop: 6 },
});
