import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, formatDistanceToNow, isSameMonth } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { useTimelineStore, TimelineEntry, TimelineType } from '../../store/useTimelineStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const TYPE_CONFIG: Record<TimelineType, { icon: string; color: string; label: string }> = {
  achievement: { icon: 'trophy',           color: '#F5A623', label: 'Achievement' },
  milestone:   { icon: 'flag',             color: '#8E44AD', label: 'Milestone'   },
  memory:      { icon: 'heart',            color: '#E91E63', label: 'Memory'      },
  event:       { icon: 'calendar',         color: '#2980B9', label: 'Event'       },
  goal:        { icon: 'checkmark-circle', color: '#27AE60', label: 'Goal'        },
  streak:      { icon: 'flame',            color: '#E67E22', label: 'Streak'      },
  family:      { icon: 'people',           color: '#0F2952', label: 'Family'      },
};

const TYPE_FILTERS: { key: TimelineType | 'all' | 'highlights'; label: string; emoji: string }[] = [
  { key: 'all',         label: 'All',        emoji: '📖' },
  { key: 'highlights',  label: 'Highlights', emoji: '⭐' },
  { key: 'achievement', label: 'Wins',       emoji: '🏆' },
  { key: 'milestone',   label: 'Milestones', emoji: '🚩' },
  { key: 'memory',      label: 'Memories',   emoji: '💝' },
  { key: 'goal',        label: 'Goals',      emoji: '✅' },
  { key: 'streak',      label: 'Streaks',    emoji: '🔥' },
  { key: 'family',      label: 'Family',     emoji: '👨‍👩‍👧‍👦' },
];

function MonthHeader({ date }: { date: string }) {
  return (
    <View style={styles.monthHeader}>
      <View style={styles.monthDivider} />
      <Text style={styles.monthLabel}>{format(new Date(date + 'T12:00:00'), 'MMMM yyyy')}</Text>
      <View style={styles.monthDivider} />
    </View>
  );
}

export function FamilyTimelineScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<TimelineType | 'all' | 'highlights'>('all');
  const { entries, deleteEntry, seedDemoData } = useTimelineStore();
  const members = useFamilyStore((s) => s.members);

  if (entries.length === 0) seedDemoData();

  const getMember = (id?: string) => members.find((m) => m.id === id);

  const filtered = useMemo(() => {
    if (filter === 'all') return entries;
    if (filter === 'highlights') return entries.filter((e) => e.isHighlight);
    return entries.filter((e) => e.type === filter);
  }, [entries, filter]);

  const handleDelete = (entry: TimelineEntry) => {
    Alert.alert('Delete Entry', `Remove "${entry.title}" from your family timeline?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(entry.id) },
    ]);
  };

  const highlights = entries.filter((e) => e.isHighlight).length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#4A0072', '#7B2D8B']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Family Story</Text>
            <Text style={styles.headerSub}>{entries.length} moments · {highlights} highlights</Text>
          </View>
          <Pressable style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TYPE_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            >
              <Text style={styles.filterEmoji}>{f.emoji}</Text>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 56 }}>📖</Text>
            <Text style={styles.emptyTitle}>No moments yet</Text>
            <Text style={styles.emptyDesc}>Your family story is waiting to be written. Tap + to add your first moment!</Text>
          </View>
        )}

        {filtered.map((entry, idx) => {
          const cfg = TYPE_CONFIG[entry.type];
          const member = getMember(entry.memberId);
          const prevEntry = filtered[idx - 1];
          const showMonthHeader =
            idx === 0 ||
            !isSameMonth(new Date(entry.date + 'T12:00:00'), new Date(prevEntry.date + 'T12:00:00'));

          return (
            <React.Fragment key={entry.id}>
              {showMonthHeader && <MonthHeader date={entry.date} />}
              <View style={styles.entryRow}>
                {/* Timeline line + dot */}
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { backgroundColor: cfg.color }, entry.isHighlight && styles.timelineDotHighlight]}>
                    <Ionicons name={cfg.icon as any} size={entry.isHighlight ? 14 : 12} color="#fff" />
                  </View>
                  {idx < filtered.length - 1 && <View style={styles.timelineLine} />}
                </View>

                {/* Entry card */}
                <Pressable onLongPress={() => handleDelete(entry)} style={{ flex: 1 }}>
                  <Card
                    style={entry.isHighlight ? { ...styles.entryCard, ...styles.entryCardHighlight, borderLeftColor: cfg.color } : styles.entryCard}
                    variant="elevated"
                  >
                    {entry.isHighlight && (
                      <View style={[styles.highlightBadge, { backgroundColor: cfg.color }]}>
                        <Ionicons name="star" size={10} color="#fff" />
                        <Text style={styles.highlightText}>HIGHLIGHT</Text>
                      </View>
                    )}
                    <View style={styles.entryTop}>
                      <Text style={styles.entryEmoji}>{entry.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.entryTitle}>{entry.title}</Text>
                        <View style={styles.entryMeta}>
                          <View style={[styles.typeBadge, { backgroundColor: cfg.color + '15' }]}>
                            <Text style={[styles.typeText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                          {member && (
                            <View style={styles.memberBadge}>
                              <View style={[styles.memberDot, { backgroundColor: member.avatarColor }]} />
                              <Text style={styles.memberText}>{member.name.split(' ')[0]}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <Text style={styles.entryDesc}>{entry.description}</Text>
                    <Text style={styles.entryDate}>
                      {formatDistanceToNow(new Date(entry.date + 'T12:00:00'), { addSuffix: true })}
                      {' · '}
                      {format(new Date(entry.date + 'T12:00:00'), 'MMM d, yyyy')}
                    </Text>
                  </Card>
                </Pressable>
              </View>
            </React.Fragment>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  back: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12 },
  filterChipActive: { backgroundColor: '#fff' },
  filterEmoji: { fontSize: 12 },
  filterText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  filterTextActive: { color: '#4A0072' },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  monthDivider: { flex: 1, height: 1, backgroundColor: colors.border },
  monthLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  entryRow: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  timelineLeft: { alignItems: 'center', paddingTop: 14 },
  timelineDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineDotHighlight: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#FFD166' },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  entryCard: { borderRadius: 16, flex: 1 },
  entryCardHighlight: { borderLeftWidth: 4, borderLeftColor: '#F5A623' },
  highlightBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8, marginBottom: 10 },
  highlightText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  entryTop: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  entryEmoji: { fontSize: 32 },
  entryTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6, lineHeight: 20 },
  entryMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  typeBadge: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  typeText: { fontSize: 10, fontWeight: '700' },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberDot: { width: 8, height: 8, borderRadius: 4 },
  memberText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  entryDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 8 },
  entryDate: { fontSize: 11, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
});
