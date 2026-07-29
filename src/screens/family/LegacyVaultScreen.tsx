import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Pressable, Alert, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useLegacyStore } from '../../store/useLegacyStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { LegacyItemType } from '../../types';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';

const ADD_TYPES: LegacyItemType[] = ['story', 'milestone', 'tradition', 'letter', 'recipe'];

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
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | LegacyItemType>('all');
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<LegacyItemType>('story');
  const [newMemberId, setNewMemberId] = useState<string | null>(null);

  const { items, toggleFeatured, addReaction, addItem, deleteItem } = useLegacyStore();
  const members = useFamilyStore((s) => s.members);

  const handleAddItem = () => {
    if (!newTitle.trim()) return;
    addItem({
      familyId: useAuthStore.getState().familyId ?? '',
      memberId: newMemberId || undefined,
      type: newType,
      title: newTitle.trim(),
      content: newContent.trim() || 'Added to the family legacy vault.',
      tags: [],
      isPrivate: false,
      isFeatured: false,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewTitle(''); setNewContent(''); setNewType('story'); setNewMemberId(null);
    setShowModal(false);
  };

  const getMemberName = (id?: string) => members.find((m) => m.id === id)?.name ?? 'Family';

  const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter);
  const featured = items.filter((i) => i.isFeatured);

  const screenHeader = (
    <LinearGradient colors={['#4A1942', '#7B2D8B']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('legacyVault.title')}</Text>
          <Text style={styles.headerSub}>Family stories • Traditions • Milestones</Text>
        </View>
        <Pressable onPress={() => setShowModal(true)} style={styles.addBtn}>
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
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#4A1942', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('legacyVault.title')}</Text>
      <Pressable onPress={() => setShowModal(true)} style={styles.addBtn}>
        <Ionicons name="add" size={24} color="#fff" />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
          onScroll={onScroll}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={scrollEventThrottle}
          ListHeaderComponent={
            <>
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
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="library-outline" size={60} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptyDesc}>Start preserving your family's legacy by adding stories, traditions, and milestones.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cfg = TYPE_CONFIG[item.type];
            return (
              <Card style={styles.itemCard} variant="elevated">
                <View style={styles.itemHeader}>
                  <View style={[styles.typeIcon, { backgroundColor: cfg.color + '15' }]}>
                    <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemMeta}>{getMemberName(item.memberId)} {item.date ? `• ${new Date(item.date).getFullYear()}` : ''}</Text>
                  </View>
                  <Pressable onPress={() => toggleFeatured(item.id)} style={{ marginRight: 12 }}>
                    <Ionicons name={item.isFeatured ? 'star' : 'star-outline'} size={20} color={item.isFeatured ? colors.secondary : colors.textMuted} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Alert.alert('Delete Entry', `Remove "${item.title}" from the vault?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteItem(item.id) },
                      ]);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
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
          }}
        />
        )}
      </CollapsibleHeader>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add to Legacy Vault</Text>

          <Text style={styles.modalLabel}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {ADD_TYPES.map((t) => {
              const cfg = TYPE_CONFIG[t];
              return (
                <Pressable key={t} onPress={() => setNewType(t)} style={[styles.typeChip, newType === t && { backgroundColor: cfg.color + '20', borderColor: cfg.color }]}>
                  <Ionicons name={cfg.icon as any} size={16} color={newType === t ? cfg.color : colors.textSecondary} />
                  <Text style={[styles.typeChipText, newType === t && { color: cfg.color }]}>{cfg.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.modalLabel}>Title *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Grandma's Apple Pie Recipe" value={newTitle} onChangeText={setNewTitle} placeholderTextColor={colors.textMuted} autoFocus />

          <Text style={styles.modalLabel}>Story / Content</Text>
          <TextInput
            style={[styles.modalInput, styles.modalTextarea]}
            placeholder="Write the story, memory, or tradition here..."
            value={newContent}
            onChangeText={setNewContent}
            multiline
            numberOfLines={5}
            placeholderTextColor={colors.textMuted}
            textAlignVertical="top"
          />

          <Text style={styles.modalLabel}>About</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            <Pressable onPress={() => setNewMemberId(null)} style={[styles.memberChip, !newMemberId && styles.memberChipActive]}>
              <Text style={styles.memberChipName}>Family</Text>
            </Pressable>
            {members.map((m) => (
              <Pressable key={m.id} onPress={() => setNewMemberId(m.id)} style={[styles.memberChip, newMemberId === m.id && styles.memberChipActive]}>
                <Avatar name={m.name} color={m.avatarColor} size={28} />
                <Text style={styles.memberChipName}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Button title="Save to Vault" onPress={handleAddItem} fullWidth size="lg" disabled={!newTitle.trim()} />
          <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  back: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
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
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  modalTextarea: { height: 120, textAlignVertical: 'top' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  typeChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  memberChip: { alignItems: 'center', marginRight: 12, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', gap: 4 },
  memberChipActive: { borderColor: '#7B2D8B', backgroundColor: '#F5E6FA' },
  memberChipName: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
});
