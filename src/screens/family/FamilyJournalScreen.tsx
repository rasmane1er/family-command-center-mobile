import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, Pressable, Alert, Modal, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { format, formatDistanceToNow } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useJournalStore, JournalEntry, MOOD_LABELS, MOOD_EMOJIS } from '../../store/useJournalStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useTranslation } from 'react-i18next';

const MOOD_COLORS: Record<number, string> = {
  1: '#E74C3C', 2: '#E67E22', 3: '#F5A623', 4: '#27AE60', 5: '#2980B9',
};

const REACTION_OPTIONS = ['❤️', '😂', '😢', '🎉', '🔥', '👏', '💪', '🙏'];

function JournalDetailModal({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const members = useFamilyStore((s) => s.members);
  const { addReaction, removeReaction } = useJournalStore();
  const currentMemberId = members[0]?.id ?? '';

  const getMember = (id: string) => members.find((m) => m.id === id);
  const author = getMember(entry.authorId);
  const myReaction = entry.reactions.find((r) => r.memberId === currentMemberId);

  const handleReaction = (emoji: string) => {
    if (myReaction?.emoji === emoji) {
      removeReaction(entry.id, currentMemberId);
    } else {
      addReaction(entry.id, currentMemberId, emoji);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const reactionCounts = entry.reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={[styles.detailContent, { paddingBottom: 100 }]}>
        <LinearGradient colors={['#B7410E', MOOD_COLORS[entry.mood]]} style={[styles.detailHeader, { paddingTop: insets.top + 6 }]}>
          <Pressable onPress={onClose} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.detailEmoji}>{entry.emoji}</Text>
          <Text style={styles.detailTitle}>{entry.title}</Text>
          <View style={styles.detailMeta}>
            <View style={[styles.moodPill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.moodPillText}>{MOOD_EMOJIS[entry.mood]} {MOOD_LABELS[entry.mood]}</Text>
            </View>
            <Text style={styles.detailDate}>{format(new Date(entry.date), 'EEEE, MMMM d, yyyy')}</Text>
          </View>
          {author && (
            <View style={styles.authorRow}>
              <View style={[styles.authorAvatar, { backgroundColor: author.avatarColor + '30' }]}>
                <Text style={[styles.authorInitial, { color: author.avatarColor }]}>{author.name.charAt(0)}</Text>
              </View>
              <Text style={styles.authorName}>{author.name}</Text>
            </View>
          )}
        </LinearGradient>
        <Card style={styles.contentCard} variant="elevated">
          <Text style={styles.entryContent}>{entry.content}</Text>
        </Card>

        {entry.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {entry.tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.reactTitle}>{t('family.screens.familyJournal.reactions')}</Text>
        <View style={styles.reactPicker}>
          {REACTION_OPTIONS.map((emoji) => {
            const count = reactionCounts[emoji] ?? 0;
            const isMine = myReaction?.emoji === emoji;
            return (
              <Pressable
                key={emoji}
                onPress={() => handleReaction(emoji)}
                style={[styles.reactBtn, isMine && styles.reactBtnActive]}
              >
                <Text style={{ fontSize: 18 }}>{emoji}</Text>
                {count > 0 && <Text style={styles.reactCount}>{count}</Text>}
              </Pressable>
            );
          })}
        </View>

        {entry.reactions.length > 0 && (
          <View style={styles.reactSummary}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <View key={emoji} style={styles.reactSummaryItem}>
                <Text style={{ fontSize: 16 }}>{emoji}</Text>
                <Text style={styles.reactSummaryCount}>{count}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export function FamilyJournalScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newEmoji, setNewEmoji] = useState('✨');
  const [newMood, setNewMood] = useState<1 | 2 | 3 | 4 | 5>(4);

  const { entries, addEntry, deleteEntry, fetchFromServer, isLoaded } = useJournalStore();
  const members = useFamilyStore((s) => s.members);

  useEffect(() => {
    fetchFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMember = (id: string) => members.find((m) => m.id === id);
  const currentMember = members[0];

  const filters = [
    { key: 'all', label: t('family.screens.familyJournal.filterAll') },
    ...members.map((m) => ({ key: m.id, label: m.name.split(' ')[0] })),
    { key: 'mood-5', label: `🤩 ${t('family.screens.familyJournal.filterAmazing')}` },
  ];

  const filtered = useMemo(() => {
    if (filter === 'all') return entries;
    if (filter === 'mood-5') return entries.filter((e) => e.mood === 5);
    return entries.filter((e) => e.authorId === filter);
  }, [entries, filter]);

  const handleAdd = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    addEntry({
      date: new Date().toISOString().split('T')[0],
      title: newTitle.trim(),
      content: newContent.trim(),
      emoji: newEmoji,
      authorId: currentMember?.id ?? 'member-1',
      mood: newMood,
      isPrivate: false,
      tags: [],
    });
    setNewTitle('');
    setNewContent('');
    setNewEmoji('✨');
    setNewMood(4);
    setShowAdd(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (selectedEntry) {
    const liveEntry = entries.find((e) => e.id === selectedEntry.id) ?? selectedEntry;
    return <JournalDetailModal entry={liveEntry} onClose={() => setSelectedEntry(null)} />;
  }

  const screenHeader = (
    <LinearGradient colors={['#7D3C98', '#B7410E']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('journal.title')}</Text>
          <Text style={styles.headerSub}>{t('family.screens.familyJournal.headerSub', { count: entries.length })}</Text>
        </View>
        <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn}>
          <Ionicons name="create" size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {filters.map((f) => (
          <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterChip, filter === f.key && styles.filterChipActive]}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#7D3C98', '#B7410E']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('journal.title')}</Text>
      <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn}>
        <Ionicons name="create" size={20} color="#fff" />
      </Pressable>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <FlatList
        data={filtered}
        keyExtractor={(entry) => entry.id}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }, filtered.length === 0 && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 56 }}>📖</Text>
            <Text style={styles.emptyTitle}>{t('family.screens.familyJournal.emptyTitle')}</Text>
            <Text style={styles.emptyDesc}>{t('family.screens.familyJournal.emptyDesc')}</Text>
          </View>
        }
        renderItem={({ item: entry }) => {
          const author = getMember(entry.authorId);
          const reactionCount = entry.reactions.length;

          return (
            <Pressable
              onPress={() => setSelectedEntry(entry)}
              onLongPress={() => Alert.alert(
                t('family.screens.familyJournal.deleteEntryTitle'),
                t('family.screens.familyJournal.deleteEntryMessage', { title: entry.title }),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('common.delete'), style: 'destructive', onPress: () => deleteEntry(entry.id) },
                ]
              )}
            >
              <Card style={styles.entryCard} variant="elevated">
                <View style={[styles.moodBar, { backgroundColor: MOOD_COLORS[entry.mood] }]} />
                <View style={styles.entryTop}>
                  <Text style={styles.entryEmoji}>{entry.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryTitle}>{entry.title}</Text>
                    <Text style={styles.entryDate}>
                      {formatDistanceToNow(new Date(entry.date), { addSuffix: true })}
                      {' · '}
                      {format(new Date(entry.date), 'MMM d')}
                    </Text>
                  </View>
                  <View style={styles.moodChip}>
                    <Text style={{ fontSize: 14 }}>{MOOD_EMOJIS[entry.mood]}</Text>
                  </View>
                </View>

                <Text style={styles.entryPreview} numberOfLines={3}>{entry.content}</Text>

                <View style={styles.entryFooter}>
                  {author && (
                    <View style={styles.authorBadge}>
                      <View style={[styles.authorDot, { backgroundColor: author.avatarColor }]} />
                      <Text style={styles.authorBadgeName}>{author.name.split(' ')[0]}</Text>
                    </View>
                  )}
                  {reactionCount > 0 && (
                    <View style={styles.reactionSummary}>
                      <Text style={styles.reactionSummaryText}>{entry.reactions.slice(0, 3).map((r) => r.emoji).join('')}</Text>
                      <Text style={styles.reactionCount}>{reactionCount}</Text>
                    </View>
                  )}
                  {entry.tags.slice(0, 2).map((tag) => (
                    <View key={tag} style={styles.tagChipSm}>
                      <Text style={styles.tagTextSm}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
        )}
      </CollapsibleHeader>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('journal.addEntry')}</Text>
            <Pressable onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalLabel}>{t('family.screens.familyJournal.howAreYouFeeling')}</Text>
            <View style={styles.moodRow}>
              {([1, 2, 3, 4, 5] as const).map((m) => (
                <Pressable key={m} onPress={() => setNewMood(m)} style={[styles.moodBtn, newMood === m && { borderColor: MOOD_COLORS[m], backgroundColor: MOOD_COLORS[m] + '15' }]}>
                  <Text style={{ fontSize: 18 }}>{MOOD_EMOJIS[m]}</Text>
                  <Text style={[styles.moodLabel, newMood === m && { color: MOOD_COLORS[m] }]}>{MOOD_LABELS[m]}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>{t('family.screens.familyJournal.pickEmoji')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
              {['✨', '🎉', '❤️', '😊', '💪', '🌟', '🏆', '🌺', '⚽', '🍿', '🌱', '📚', '🎹', '✈️', '🎂'].map((e) => (
                <Pressable key={e} onPress={() => setNewEmoji(e)} style={[styles.emojiBtn, newEmoji === e && styles.emojiBtnActive]}>
                  <Text style={{ fontSize: 18 }}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>{t('family.screens.familyJournal.titleLabel')}</Text>
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder={t('family.screens.familyJournal.titlePlaceholder')}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>{t('family.screens.familyJournal.writeItDown')}</Text>
            <TextInput
              style={[styles.modalInput, { height: 160, textAlignVertical: 'top' }]}
              value={newContent}
              onChangeText={setNewContent}
              placeholder={t('family.screens.familyJournal.contentPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Pressable style={styles.saveBtn} onPress={handleAdd}>
              <Ionicons name="create" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>{t('family.screens.familyJournal.saveEntry')}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  back: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  filterTextActive: { color: '#7D3C98' },
  content: { padding: 16 },
  entryCard: { marginBottom: 12, borderRadius: 16, paddingLeft: 4, overflow: 'hidden' },
  moodBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  entryTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingLeft: 10 },
  entryEmoji: { fontSize: 32, marginRight: 10 },
  entryTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
  entryDate: { fontSize: 11, color: colors.textMuted },
  moodChip: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  entryPreview: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, paddingLeft: 10, marginBottom: 10 },
  entryFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 10 },
  authorBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  authorDot: { width: 8, height: 8, borderRadius: 4 },
  authorBadgeName: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  reactionSummary: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.background, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 7 },
  reactionSummaryText: { fontSize: 12 },
  reactionCount: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
  tagChipSm: { backgroundColor: '#F3E5F5', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 },
  tagTextSm: { fontSize: 10, color: '#7D3C98', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  detailHeader: { paddingHorizontal: 20, paddingBottom: 8 },
  detailEmoji: { fontSize: 44, marginBottom: 8, marginTop: 4 },
  detailTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 8 },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  moodPill: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  moodPillText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  detailDate: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  authorInitial: { fontSize: 12, fontWeight: '800' },
  authorName: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  detailContent: { padding: 16 },
  contentCard: { borderRadius: 16, marginBottom: 16 },
  entryContent: { fontSize: 15, color: colors.text, lineHeight: 24 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tagChip: { backgroundColor: '#F3E5F5', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 10 },
  tagText: { fontSize: 12, color: '#7D3C98', fontWeight: '600' },
  reactTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 },
  reactPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  reactBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  reactBtnActive: { borderColor: '#B7410E', backgroundColor: '#B7410E10' },
  reactCount: { position: 'absolute', top: 4, right: 4, fontSize: 9, fontWeight: '800', color: colors.text },
  reactSummary: { flexDirection: 'row', gap: 12 },
  reactSummaryItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reactSummaryCount: { fontSize: 13, fontWeight: '700', color: colors.text },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalContent: { padding: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  moodRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  moodBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, gap: 4 },
  moodLabel: { fontSize: 9, fontWeight: '700', color: colors.textMuted },
  emojiBtn: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 2, borderColor: 'transparent' },
  emojiBtnActive: { borderColor: '#7D3C98', backgroundColor: '#7D3C9810' },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  saveBtn: { backgroundColor: '#7D3C98', borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
