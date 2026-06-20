import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useLegacyStore } from '../../store/useLegacyStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { LegacyItemType } from '../../types';

const TYPE_CONFIG: Record<LegacyItemType, { icon: string; color: string; label: string }> = {
  story: { icon: 'book', color: '#8E44AD', label: 'Story' },
  photo: { icon: 'camera', color: '#2980B9', label: 'Photo' },
  letter: { icon: 'mail', color: '#E74C3C', label: 'Letter' },
  video: { icon: 'videocam', color: '#E67E22', label: 'Video' },
  document: { icon: 'document-text', color: '#7F8C8D', label: 'Document' },
  milestone: { icon: 'trophy', color: '#F5A623', label: 'Milestone' },
  tradition: { icon: 'heart', color: '#E74C3C', label: 'Tradition' },
  recipe: { icon: 'restaurant', color: '#27AE60', label: 'Recipe' },
};

const FILTER_TYPES: { key: 'all' | LegacyItemType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'story', label: 'Stories' },
  { key: 'milestone', label: 'Milestones' },
  { key: 'tradition', label: 'Traditions' },
  { key: 'letter', label: 'Letters' },
  { key: 'recipe', label: 'Recipes' },
];

export function LegacyVaultScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | LegacyItemType>('all');
  const { items, toggleFeatured, addReaction, seedDemoData } = useLegacyStore();
  const members = useFamilyStore((s) => s.members);

  if (items.length === 0) seedDemoData();

  const getMemberName = (id?: string) => members.find((m) => m.id === id)?.name ?? 'Family';

  const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter);
  const featured = items.filter((i) => i.isFeatured);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#4A1942', '#7B2D8B']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Legacy Vault</Text>
            <Text style={styles.headerSub}>Family stories • Traditions • Milestones</Text>
          </View>
          <Pressable style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="library" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.statVal}>{items.length} Memories</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="star" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.statVal}>{featured.length} Featured</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="heart" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.statVal}>{items.reduce((s, i) => s + i.reactions.length, 0)} Reactions</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {FILTER_TYPES.map((ft) => (
            <Pressable
              key={ft.key}
              onPress={() => setFilter(ft.key)}
              style={[styles.filterChip, filter === ft.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === ft.key && styles.filterTextActive]}>{ft.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {filter === 'all' && featured.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Featured</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
              {featured.map((item) => {
                const cfg = TYPE_CONFIG[item.type];
                return (
                  <Pressable key={item.id} style={[styles.featuredCard, { backgroundColor: cfg.color + '15', borderColor: cfg.color + '40' }]}>
                    <Ionicons name={cfg.icon as any} size={28} color={cfg.color} />
                    <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.featuredAuthor}>{getMemberName(item.memberId)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        <Text style={styles.sectionTitle}>{filter === 'all' ? 'All Entries' : FILTER_TYPES.find((f) => f.key === filter)?.label}</Text>
        {filtered.map((item) => {
          const cfg = TYPE_CONFIG[item.type];
          return (
            <Card key={item.id} style={styles.itemCard} variant="elevated">
              <View style={styles.itemHeader}>
                <View style={[styles.typeIcon, { backgroundColor: cfg.color + '15' }]}>
                  <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemMeta}>{getMemberName(item.memberId)} {item.date ? `• ${new Date(item.date).getFullYear()}` : ''}</Text>
                </View>
                <Pressable onPress={() => toggleFeatured(item.id)}>
                  <Ionicons name={item.isFeatured ? 'star' : 'star-outline'} size={20} color={item.isFeatured ? colors.secondary : colors.textMuted} />
                </Pressable>
              </View>
              <Text style={styles.itemContent} numberOfLines={3}>{item.content}</Text>
              <View style={styles.itemFooter}>
                <View style={styles.reactionsRow}>
                  {item.reactions.slice(0, 4).map((r, i) => (
                    <Text key={i} style={styles.reactionEmoji}>{r.emoji}</Text>
                  ))}
                  {item.reactions.length > 0 && (
                    <Text style={styles.reactionCount}>{item.reactions.length}</Text>
                  )}
                  <Pressable
                    onPress={() => addReaction(item.id, 'member-1', '❤️')}
                    style={styles.addReactionBtn}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
                <Badge label={cfg.label} variant="neutral" size="sm" />
              </View>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="library-outline" size={60} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyDesc}>Start preserving your family's legacy by adding stories, traditions, and milestones.</Text>
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
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 20 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statVal: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8 },
  filterChipActive: { backgroundColor: '#fff' },
  filterText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  filterTextActive: { color: '#7B2D8B' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 4 },
  featuredScroll: { marginBottom: 20 },
  featuredCard: { width: 140, borderRadius: 16, padding: 14, marginRight: 10, borderWidth: 1, alignItems: 'flex-start', justifyContent: 'flex-end', minHeight: 120 },
  featuredTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 4 },
  featuredAuthor: { fontSize: 11, color: colors.textSecondary },
  itemCard: { marginBottom: 10, borderRadius: 14 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  itemContent: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 10 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reactionsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reactionEmoji: { fontSize: 16 },
  reactionCount: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  addReactionBtn: { marginLeft: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});
