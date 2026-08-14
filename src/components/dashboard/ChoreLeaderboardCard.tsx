import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { useFamilyStore } from '../../store/useFamilyStore';

interface LeaderEntry {
  id: string;
  name: string;
  role: string;
  avatarColor: string | null;
  points: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function ChoreLeaderboardCard({ onPress }: { onPress?: () => void }) {
  const familyId = useAuthStore((s) => s.familyId);
  // Optimistic local list — members already in store have live points
  const localMembers = useFamilyStore((s) => s.members);

  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    setLoading(true);
    apiRequest<{ leaderboard: LeaderEntry[] }>(`/family/${familyId}/leaderboard`)
      .then((res) => setLeaders(res.leaderboard))
      .catch(() => {
        // Fallback: build from local store if API fails
        const sorted = [...localMembers]
          .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
          .map((m) => ({ id: m.id, name: m.name, role: m.role, avatarColor: m.avatarColor ?? null, points: m.points ?? 0 }));
        setLeaders(sorted);
      })
      .finally(() => setLoading(false));
  }, [familyId]);

  const top = leaders.slice(0, 5);
  const hasPoints = top.some((l) => l.points > 0);

  return (
    <Pressable accessibilityRole="button" style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🏆</Text>
          <Text style={styles.headerTitle}>Points Leaderboard</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
      </View>

      {loading && (
        <ActivityIndicator size="small" color="#6366f1" style={{ marginTop: 12 }} />
      )}

      {!loading && !hasPoints && (
        <Text style={styles.empty}>Complete chores and tasks to earn points!</Text>
      )}

      {!loading && hasPoints && top.map((entry, i) => (
        <View key={entry.id} style={styles.row}>
          <Text style={styles.medal}>{MEDALS[i] ?? `#${i + 1}`}</Text>
          <View style={[styles.avatar, { backgroundColor: entry.avatarColor ?? '#6366f1' }]}>
            <Text style={styles.avatarText}>{entry.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{entry.name}</Text>
            <Text style={styles.role}>{entry.role}</Text>
          </View>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsNum}>{entry.points}</Text>
            <Text style={styles.pointsLabel}>pts</Text>
          </View>
        </View>
      ))}
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
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { fontSize: 18 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },

  empty: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 8 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  medal: { fontSize: 18, width: 26, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  role: { fontSize: 11, color: '#94a3b8', textTransform: 'capitalize', marginTop: 1 },
  pointsBadge: { alignItems: 'flex-end' },
  pointsNum: { fontSize: 17, fontWeight: '800', color: '#6366f1' },
  pointsLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
});
