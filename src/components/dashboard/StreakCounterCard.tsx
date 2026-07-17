import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useHabitsStore } from '../../store/useHabitsStore';
import { useFamilyStore } from '../../store/useFamilyStore';

export function StreakCounterCard({ onPress }: { onPress?: () => void }) {
  const habits = useHabitsStore((s) => s.habits);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);

  // Best active streak across all habits belonging to this member (or all family habits)
  const myHabits = activeMemberId
    ? habits.filter((h) => !h.memberId || h.memberId === activeMemberId)
    : habits;

  if (myHabits.length === 0) return null;

  const best = myHabits.reduce(
    (acc, h) => (h.streak > acc.streak ? h : acc),
    myHabits[0],
  );
  const totalActive = myHabits.filter((h) => h.streak > 0).length;
  const longestEver = myHabits.reduce((a, h) => Math.max(a, h.longestStreak), 0);

  const flameColor = best.streak >= 14 ? '#ef4444' : best.streak >= 7 ? '#f97316' : '#fbbf24';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Flame + streak count */}
      <View style={[styles.flameBadge, { backgroundColor: flameColor + '18' }]}>
        <Text style={styles.flameEmoji}>🔥</Text>
        <Text style={[styles.streakNum, { color: flameColor }]}>{best.streak}</Text>
        <Text style={[styles.streakLabel, { color: flameColor }]}>day streak</Text>
      </View>

      <View style={styles.divider} />

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{totalActive}</Text>
          <Text style={styles.statLabel}>active{'\n'}habits</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={styles.statNum}>{longestEver}</Text>
          <Text style={styles.statLabel}>best{'\n'}ever</Text>
        </View>
        <View style={styles.statSep} />
        <View style={[styles.stat, { flex: 2 }]}>
          <Text style={styles.statNum} numberOfLines={1}>{best.title}</Text>
          <Text style={styles.statLabel}>top habit</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  flameBadge: {
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 70,
  },
  flameEmoji: { fontSize: 22 },
  streakNum: { fontSize: 26, fontWeight: '900', lineHeight: 30 },
  streakLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  divider: { width: 1, height: 48, backgroundColor: '#f1f5f9' },

  statsRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  statLabel: { fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 2, lineHeight: 14 },
  statSep: { width: 1, height: 36, backgroundColor: '#f1f5f9' },
});
