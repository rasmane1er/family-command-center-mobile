import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTimelineStore } from '../../store/useTimelineStore';
import { useMemoryStore } from '../../store/useMemoryStore';

// Deterministic pseudo-random from today's date — same pick all day,
// different pick each day, no state or effect needed.
function dailyIndex(len: number): number {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  // LCG-style hash
  const h = ((seed ^ (seed >>> 16)) * 0x45d9f3b) & 0x7fffffff;
  return h % len;
}

const TYPE_COLORS: Record<string, string> = {
  milestone:   '#8b5cf6',
  achievement: '#f59e0b',
  memory:      '#3b82f6',
  goal:        '#10b981',
  streak:      '#ec4899',
  event:       '#06b6d4',
  family:      '#6366f1',
};

export function MemoryOfTheDayCard({ onPress }: { onPress?: () => void }) {
  const entries  = useTimelineStore((s) => s.entries);
  const memories = useMemoryStore((s) => s.memories);

  // Prefer highlight / milestone entries, then anything
  const pool = [
    ...entries.filter((e) => e.isHighlight),
    ...entries.filter((e) => e.type === 'milestone' || e.type === 'achievement' || e.type === 'memory'),
    ...entries,
  ];
  // Deduplicate by id
  const seen = new Set<string>();
  const unique = pool.filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });

  // Fall back to AI memory insights if timeline is empty
  const aiPool = memories.filter((m) => m.sentiment === 'positive' || m.type === 'milestone');

  if (unique.length === 0 && aiPool.length === 0) {
    return (
      <Pressable style={styles.emptyCard} onPress={onPress}>
        <Text style={styles.emptyEmoji}>📸</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.emptyTitle}>Start your Family Timeline</Text>
          <Text style={styles.emptySubtitle}>Add milestones, achievements and memories to see them here every day.</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
      </Pressable>
    );
  }

  if (unique.length > 0) {
    const entry = unique[dailyIndex(unique.length)];
    const color = TYPE_COLORS[entry.type] ?? '#6366f1';
    const when  = new Date(entry.date);
    const yearsAgo = new Date().getFullYear() - when.getFullYear();
    const dateLabel = yearsAgo > 0
      ? `${yearsAgo} year${yearsAgo > 1 ? 's' : ''} ago · ${when.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`
      : when.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

    return (
      <Pressable style={styles.card} onPress={onPress}>
        <View style={[styles.accent, { backgroundColor: color }]} />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.label}>Memory of the Day</Text>
            <Text style={styles.badge}>{entry.emoji}</Text>
          </View>
          <Text style={styles.title}>{entry.title}</Text>
          {!!entry.description && (
            <Text style={styles.description} numberOfLines={2}>{entry.description}</Text>
          )}
          <Text style={[styles.date, { color }]}>{dateLabel}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ alignSelf: 'center' }} />
      </Pressable>
    );
  }

  // AI memory fallback
  const mem = aiPool[dailyIndex(aiPool.length)];
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.accent, { backgroundColor: '#6366f1' }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.label}>Memory of the Day</Text>
          <Text style={styles.badge}>✨</Text>
        </View>
        <Text style={styles.title}>{mem.title}</Text>
        {!!mem.content && (
          <Text style={styles.description} numberOfLines={2}>{mem.content}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ alignSelf: 'center' }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  accent: { width: 5 },
  content: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  badge: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b', lineHeight: 20 },
  description: { fontSize: 13, color: '#64748b', marginTop: 3, lineHeight: 18 },
  date: { fontSize: 12, fontWeight: '600', marginTop: 6 },

  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 28 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#475569' },
  emptySubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2, lineHeight: 16 },
});
