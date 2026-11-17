import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, Modal, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { format } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useMoodStore, MoodLevel } from '../../store/useMoodStore';
import { useHabitsStore } from '../../store/useHabitsStore';

const PARENT_PIN = '1234'; // Default PIN — parents change this in family settings

const REWARD_SHOP = [
  { id: 'r1', emoji: '🎮', label: '30 min screen time', cost: 200 },
  { id: 'r2', emoji: '🍕', label: 'Pick dinner tonight', cost: 300 },
  { id: 'r3', emoji: '🎬', label: 'Movie night pick', cost: 400 },
  { id: 'r4', emoji: '🛍️', label: '$5 treat budget', cost: 500 },
  { id: 'r5', emoji: '🌙', label: 'Stay up 30 min late', cost: 350 },
  { id: 'r6', emoji: '🎲', label: 'Game night pick', cost: 250 },
];

const MOOD_CONFIG: Record<MoodLevel, { emoji: string; label: string; color: string; bg: string }> = {
  1: { emoji: '😔', label: 'Not great', color: '#E74C3C', bg: '#FDEDEC' },
  2: { emoji: '😕', label: 'A bit low',  color: '#E67E22', bg: '#FEF0E2' },
  3: { emoji: '😐', label: 'Okay',       color: '#F5A623', bg: '#FEF3E2' },
  4: { emoji: '🙂', label: 'Pretty good',color: '#27AE60', bg: '#D5F5E3' },
  5: { emoji: '😄', label: 'Amazing!',   color: '#2980B9', bg: '#EBF5FB' },
};

const QUEST_COLORS = ['#E74C3C', '#E67E22', '#F5A623', '#27AE60', '#2980B9', '#8E44AD'];
const XP_PER_TASK = 50;
const XP_PER_HABIT = 30;

function PointsBurst({ show }: { show: boolean }) {
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
      <Text style={styles.burstText}>+{XP_PER_TASK} XP! 🎉</Text>
    </Animated.View>
  );
}

export function KidsModeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const members = useFamilyStore((s) => s.members);
  const tasks = useFamilyStore((s) => s.tasks);
  const completeTask = useFamilyStore((s) => s.updateTask);
  const { getTodayMood, addMoodEntry, seedDemoData: seedMood } = useMoodStore();
  const { habits, isCompletedToday, completeHabit, uncompleteHabit, seedDemoData: seedHabits } = useHabitsStore();
  const [selectedKid, setSelectedKid] = useState<string | null>(null);
  const [showBurst, setShowBurst] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showRewardShop, setShowRewardShop] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const handleExitKidsMode = () => setShowPinModal(true);

  const handlePinSubmit = () => {
    if (pinInput === PARENT_PIN) {
      setShowPinModal(false);
      setPinInput('');
      setPinError(false);
      navigation.goBack();
    } else {
      setPinError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPinInput('');
    }
  };

  const speakTask = (title: string) => {
    Speech.stop();
    Speech.speak(`Your task is: ${title}`, { language: 'en-US', pitch: 1.1, rate: 0.9 });
  };

  const handleRedeemReward = (reward: typeof REWARD_SHOP[0]) => {
    if (!activeKid) return;
    if ((activeKid.points || 0) < reward.cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Not enough XP!', `You need ${reward.cost - (activeKid.points || 0)} more XP for "${reward.label}". Keep completing quests!`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('🎉 Reward Unlocked!', `Ask a parent to give you: ${reward.emoji} ${reward.label}`);
  };

  const kids = members.filter((m) => m.role === 'child');
  const activeKid = selectedKid ? members.find((m) => m.id === selectedKid) : (kids[0] || members[0]);

  if (!getTodayMood(activeKid?.id || '')) seedMood();
  if (habits.length === 0) seedHabits();

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

  const handleCompleteTask = (taskId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeTask(taskId, { status: 'completed' });
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

  const GRADIENT_COLORS: [string, string] = activeKid
    ? [activeKid.avatarColor, activeKid.avatarColor + 'CC']
    : ['#2980B9', '#8E44AD'];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENT_COLORS} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={handleExitKidsMode} style={styles.back}>
            <Ionicons name="lock-closed" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Kids Mode 🎮</Text>
          <Pressable onPress={() => setShowRewardShop(!showRewardShop)} style={styles.shopBtn}>
            <Text style={styles.shopBtnText}>🛍️ Shop</Text>
          </Pressable>
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
            <Avatar name={activeKid.name} color="#fff" size={64} />
            <View style={{ flex: 1 }}>
              <Text style={styles.playerName}>{activeKid.name.split(' ')[0]}</Text>
              <View style={styles.levelRow}>
                <View style={styles.levelBadge}>
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

      <PointsBurst show={showBurst} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
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
          <Text style={styles.sectionTitle}>⚔️ Daily Quests</Text>
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
          return (
            <Pressable key={task.id} onPress={() => handleCompleteTask(task.id)} style={styles.questCard}>
              <LinearGradient colors={[questColor + '15', questColor + '08']} style={styles.questGrad}>
                <View style={[styles.questIcon, { backgroundColor: questColor + '20' }]}>
                  <Ionicons
                    name={task.category === 'chores' ? 'home' : task.category === 'school' ? 'school' : task.category === 'health' ? 'fitness' : 'checkbox'}
                    size={22}
                    color={questColor}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.questTitle}>{task.title}</Text>
                  {task.dueDate && (
                    <Text style={styles.questDue}>Due {format(new Date(task.dueDate), 'MMM d')}</Text>
                  )}
                </View>
                <Pressable onPress={(e) => { e.stopPropagation(); speakTask(task.title); }} style={styles.speakBtn}>
                  <Ionicons name="volume-medium-outline" size={18} color={questColor} />
                </Pressable>
                <View style={styles.questReward}>
                  <Text style={styles.questXP}>+{XP_PER_TASK}</Text>
                  <Text style={styles.questXPLabel}>XP</Text>
                </View>
                <View style={[styles.questCheck, { borderColor: questColor }]}>
                  <Ionicons name="checkmark" size={16} color={questColor} />
                </View>
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
              <Text style={styles.sectionTitle}>🔥 Habit Challenges</Text>
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

        {/* Achievement teaser */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏅 Trophies</Text>
          <Pressable onPress={() => navigation.navigate('Achievements')}>
            <Text style={styles.seeAll}>View All</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {[
            { emoji: '⭐', title: 'Task Master', desc: 'Complete 10 tasks', unlocked: true },
            { emoji: '🔥', title: 'Streak Legend', desc: '7-day habit streak', unlocked: true },
            { emoji: '💪', title: 'Early Bird', desc: 'Check in by 8am', unlocked: false },
            { emoji: '🎯', title: 'Perfect Week', desc: 'All tasks done in a week', unlocked: false },
          ].map((ach) => (
            <View key={ach.title} style={[styles.achCard, !ach.unlocked && styles.achCardLocked]}>
              <Text style={[styles.achEmoji, !ach.unlocked && styles.achLocked]}>{ach.emoji}</Text>
              <Text style={[styles.achTitle, !ach.unlocked && styles.achLockedText]}>{ach.title}</Text>
              <Text style={styles.achDesc} numberOfLines={2}>{ach.desc}</Text>
              {ach.unlocked && (
                <View style={styles.achUnlocked}>
                  <Ionicons name="checkmark-circle" size={12} color="#27AE60" />
                  <Text style={styles.achUnlockedText}>Unlocked!</Text>
                </View>
              )}
              {!ach.unlocked && (
                <View style={styles.achLockIcon}>
                  <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Reward Shop */}
        {showRewardShop && (
          <View style={styles.rewardShop}>
            <View style={styles.rewardShopHeader}>
              <Text style={styles.rewardShopTitle}>🛍️ Reward Shop</Text>
              <Text style={styles.rewardShopXP}>You have {activeKid?.points || 0} XP</Text>
            </View>
            <View style={styles.rewardGrid}>
              {REWARD_SHOP.map((r) => {
                const canAfford = (activeKid?.points || 0) >= r.cost;
                return (
                  <Pressable key={r.id} onPress={() => handleRedeemReward(r)} style={[styles.rewardCard, !canAfford && styles.rewardCardLocked]}>
                    <Text style={styles.rewardEmoji}>{r.emoji}</Text>
                    <Text style={styles.rewardLabel}>{r.label}</Text>
                    <View style={[styles.rewardCost, canAfford && styles.rewardCostAffordable]}>
                      <Text style={[styles.rewardCostText, canAfford && styles.rewardCostTextAffordable]}>{r.cost} XP</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Parent PIN Modal */}
      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => { setShowPinModal(false); setPinInput(''); setPinError(false); }}>
        <View style={styles.pinOverlay}>
          <View style={styles.pinModal}>
            <Ionicons name="lock-closed" size={36} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.pinTitle}>Parent PIN Required</Text>
            <Text style={styles.pinSub}>Enter the 4-digit PIN to exit Kids Mode</Text>
            <TextInput
              style={[styles.pinInput, pinError && styles.pinInputError]}
              value={pinInput}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
              autoFocus
              onChangeText={(t) => { setPinInput(t); setPinError(false); if (t.length === 4) setTimeout(handlePinSubmit, 100); }}
            />
            {pinError && <Text style={styles.pinError}>Incorrect PIN. Try again.</Text>}
            <View style={styles.pinBtns}>
              <Pressable onPress={() => { setShowPinModal(false); setPinInput(''); setPinError(false); }} style={styles.pinCancelBtn}>
                <Text style={styles.pinCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handlePinSubmit} style={styles.pinConfirmBtn}>
                <Text style={styles.pinConfirmText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  shopBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10 },
  shopBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  speakBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  rewardShop: { backgroundColor: colors.card, borderRadius: 20, margin: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  rewardShopHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  rewardShopTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  rewardShopXP: { fontSize: 13, fontWeight: '700', color: colors.secondary, backgroundColor: '#FEF3E2', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10 },
  rewardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rewardCard: { width: '47%', backgroundColor: colors.background, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  rewardCardLocked: { opacity: 0.55 },
  rewardEmoji: { fontSize: 28, marginBottom: 6 },
  rewardLabel: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 8, lineHeight: 16 },
  rewardCost: { backgroundColor: colors.border, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10 },
  rewardCostAffordable: { backgroundColor: '#D5F5E3' },
  rewardCostText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  rewardCostTextAffordable: { color: '#1A6B3C' },
  pinOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  pinModal: { backgroundColor: colors.card, borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', maxWidth: 340 },
  pinTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 6 },
  pinSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  pinInput: { width: 160, textAlign: 'center', fontSize: 28, letterSpacing: 12, borderBottomWidth: 2, borderBottomColor: colors.primary, paddingVertical: 8, color: colors.text, marginBottom: 8 },
  pinInputError: { borderBottomColor: colors.danger },
  pinError: { fontSize: 13, color: colors.danger, fontWeight: '600', marginBottom: 12 },
  pinBtns: { flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' },
  pinCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  pinCancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  pinConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  pinConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  kidChip: { alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  kidChipActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  kidChipName: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  playerCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, padding: 14 },
  playerName: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 6 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  levelBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8 },
  levelText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  xpText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  xpBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 4 },
  xpFill: { height: 6, backgroundColor: '#FFD166', borderRadius: 3 },
  xpNext: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  streakBadge: { alignItems: 'center' },
  streakEmoji: { fontSize: 24 },
  streakCount: { fontSize: 22, fontWeight: '800', color: '#fff' },
  streakLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  burst: { position: 'absolute', top: '40%', left: '30%', right: '30%', zIndex: 100, backgroundColor: '#FFD166', borderRadius: 16, padding: 12, alignItems: 'center' },
  burstText: { fontSize: 18, fontWeight: '800', color: '#333' },
  content: { padding: 16 },
  moodCard: { borderRadius: 18, marginBottom: 16 },
  moodQuestion: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-around' },
  moodBtn: { alignItems: 'center', gap: 4 },
  moodEmoji: { fontSize: 34 },
  moodLabel: { fontSize: 9, color: colors.textSecondary, fontWeight: '600', textAlign: 'center', width: 50 },
  moodCheckedRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  moodCheckedLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  moodCheckedValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  moodXP: { marginLeft: 'auto', fontSize: 14, fontWeight: '800', color: '#27AE60', backgroundColor: '#D5F5E3', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  sectionSub: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  noQuestsCard: { borderRadius: 18, alignItems: 'center', paddingVertical: 32, marginBottom: 8 },
  noQuestsTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 12, marginBottom: 4 },
  noQuestsSub: { fontSize: 14, color: colors.textSecondary },
  questCard: { borderRadius: 16, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  questGrad: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  questIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  questTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  questDue: { fontSize: 12, color: colors.textSecondary },
  questReward: { alignItems: 'center', marginHorizontal: 8 },
  questXP: { fontSize: 18, fontWeight: '800', color: '#F5A623' },
  questXPLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '700' },
  questCheck: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  completedBanner: { backgroundColor: '#D5F5E3', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#A9DFBF' },
  completedText: { fontSize: 13, fontWeight: '700', color: '#1A6B3C', textAlign: 'center' },
  habitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  habitCard: { width: '47%', backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  habitCardDone: { borderWidth: 2 },
  habitIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  habitTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8, lineHeight: 18 },
  habitFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  habitStreak: { fontSize: 12, fontWeight: '700' },
  achCard: { width: 120, backgroundColor: colors.card, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  achCardLocked: { opacity: 0.6 },
  achEmoji: { fontSize: 30, marginBottom: 6 },
  achTitle: { fontSize: 11, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 3 },
  achDesc: { fontSize: 9, color: colors.textSecondary, textAlign: 'center', lineHeight: 13 },
  achLocked: { opacity: 0.4 },
  achLockedText: { color: colors.textMuted },
  achUnlocked: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  achUnlockedText: { fontSize: 9, color: '#27AE60', fontWeight: '700' },
  achLockIcon: { marginTop: 6 },
});
