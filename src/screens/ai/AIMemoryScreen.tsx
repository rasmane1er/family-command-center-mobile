import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { MemoryType } from '../../types';

const TYPE_CONFIG: Record<MemoryType, { icon: string; color: string; label: string }> = {
  preference: { icon: 'heart', color: '#E74C3C', label: 'Preference' },
  habit: { icon: 'repeat', color: '#2980B9', label: 'Habit' },
  milestone: { icon: 'trophy', color: '#F5A623', label: 'Milestone' },
  insight: { icon: 'bulb', color: '#8E44AD', label: 'AI Insight' },
  conflict: { icon: 'alert-circle', color: '#E67E22', label: 'Conflict' },
  health: { icon: 'heart-half', color: '#27AE60', label: 'Health' },
};

const FILTER_TABS: { key: 'all' | MemoryType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'milestone', label: 'Milestones' },
  { key: 'preference', label: 'Prefs' },
  { key: 'habit', label: 'Habits' },
  { key: 'insight', label: 'Insights' },
];

export function AIMemoryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | MemoryType>('all');
  const [search, setSearch] = useState('');
  const { memories, pinMemory, seedDemoData } = useMemoryStore();
  const members = useFamilyStore((s) => s.members);

  if (memories.length === 0) seedDemoData();

  const getMemberName = (id?: string) => members.find((m) => m.id === id)?.name;

  const filtered = memories
    .filter((m) => filter === 'all' || m.type === filter)
    .filter((m) =>
      search === '' ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.content.toLowerCase().includes(search.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  const pinned = filtered.filter((m) => m.isPinned);
  const unpinned = filtered.filter((m) => !m.isPinned);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#2D1B69', '#6A1B9A']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>AI Memory Engine</Text>
            <Text style={styles.headerSub}>{memories.length} memories stored</Text>
          </View>
          <Pressable style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search memories, tags..."
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={[styles.filterChip, filter === tab.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filter === tab.key && styles.filterChipTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {pinned.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="pin" size={14} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Pinned</Text>
            </View>
            {pinned.map((mem) => {
              const cfg = TYPE_CONFIG[mem.type];
              return (
                <Card key={mem.id} style={styles.memoryCard} variant="elevated">
                  <View style={styles.memoryHeader}>
                    <View style={[styles.typeIcon, { backgroundColor: cfg.color + '20' }]}>
                      <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.memoryTitle}>{mem.title}</Text>
                      {getMemberName(mem.memberId) && (
                        <Text style={styles.memoryMember}>{getMemberName(mem.memberId)}</Text>
                      )}
                    </View>
                    <Pressable onPress={() => pinMemory(mem.id)}>
                      <Ionicons name="pin" size={18} color={colors.secondary} />
                    </Pressable>
                  </View>
                  <Text style={styles.memoryContent} numberOfLines={3}>{mem.content}</Text>
                  <View style={styles.memoryFooter}>
                    <View style={styles.tagsRow}>
                      {mem.tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={styles.tag}><Text style={styles.tagText}>#{tag}</Text></View>
                      ))}
                    </View>
                    <Badge
                      label={cfg.label}
                      variant={mem.sentiment === 'positive' ? 'success' : mem.sentiment === 'negative' ? 'danger' : 'neutral'}
                      size="sm"
                    />
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {unpinned.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="albums" size={14} color={colors.textSecondary} />
              <Text style={styles.sectionTitle}>All Memories</Text>
            </View>
            {unpinned.map((mem) => {
              const cfg = TYPE_CONFIG[mem.type];
              return (
                <Card key={mem.id} style={styles.memoryCard} variant="elevated">
                  <View style={styles.memoryHeader}>
                    <View style={[styles.typeIcon, { backgroundColor: cfg.color + '20' }]}>
                      <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.memoryTitle}>{mem.title}</Text>
                      {getMemberName(mem.memberId) && (
                        <Text style={styles.memoryMember}>{getMemberName(mem.memberId)}</Text>
                      )}
                    </View>
                    <Pressable onPress={() => pinMemory(mem.id)}>
                      <Ionicons name="pin-outline" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  <Text style={styles.memoryContent} numberOfLines={2}>{mem.content}</Text>
                  <View style={styles.memoryFooter}>
                    <View style={styles.tagsRow}>
                      {mem.tags.slice(0, 2).map((tag) => (
                        <View key={tag} style={styles.tag}><Text style={styles.tagText}>#{tag}</Text></View>
                      ))}
                    </View>
                    <Badge label={cfg.label} variant="neutral" size="sm" />
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="albums-outline" size={60} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No memories found</Text>
            <Text style={styles.emptyDesc}>The AI Memory Engine learns from your family's conversations, habits, and milestones.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  back: { marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#fff' },
  filterScroll: { marginBottom: 4 },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8 },
  filterChipActive: { backgroundColor: '#fff' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  filterChipTextActive: { color: '#6A1B9A' },
  content: { padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  memoryCard: { marginBottom: 10, borderRadius: 14 },
  memoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  typeIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  memoryTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  memoryMember: { fontSize: 11, color: colors.primary, fontWeight: '600', marginTop: 2 },
  memoryContent: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 10 },
  memoryFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tagsRow: { flexDirection: 'row', gap: 6 },
  tag: { backgroundColor: colors.background, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8 },
  tagText: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});
