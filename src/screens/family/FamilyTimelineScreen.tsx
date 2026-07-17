import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, formatDistanceToNow, isSameMonth } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { useTimelineStore, TimelineEntry, TimelineType } from '../../store/useTimelineStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const ENTRY_TYPES: TimelineType[] = ['achievement', 'milestone', 'memory', 'event', 'goal', 'family'];
const QUICK_EMOJIS = ['🏆', '🎉', '❤️', '🌟', '🎂', '🏠', '✈️', '🎓', '👶', '💑', '🌱', '🔥'];

const TYPE_CONFIG: Record<TimelineType, { icon: string; color: string; labelKey: string }> = {
  achievement: { icon: 'trophy',           color: '#F5A623', labelKey: 'typeAchievement' },
  milestone:   { icon: 'flag',             color: '#8E44AD', labelKey: 'typeMilestone'   },
  memory:      { icon: 'heart',            color: '#E91E63', labelKey: 'typeMemory'      },
  event:       { icon: 'calendar',         color: '#2980B9', labelKey: 'typeEvent'       },
  goal:        { icon: 'checkmark-circle', color: '#27AE60', labelKey: 'typeGoal'        },
  streak:      { icon: 'flame',            color: '#E67E22', labelKey: 'typeStreak'      },
  family:      { icon: 'people',           color: '#0F2952', labelKey: 'typeFamily'      },
};

const TYPE_FILTERS: { key: TimelineType | 'all' | 'highlights'; labelKey: string; emoji: string }[] = [
  { key: 'all',         labelKey: 'filterAll',        emoji: '📖' },
  { key: 'highlights',  labelKey: 'filterHighlights', emoji: '⭐' },
  { key: 'achievement', labelKey: 'filterWins',       emoji: '🏆' },
  { key: 'milestone',   labelKey: 'filterMilestones', emoji: '🚩' },
  { key: 'memory',      labelKey: 'filterMemories',   emoji: '💝' },
  { key: 'goal',        labelKey: 'filterGoals',      emoji: '✅' },
  { key: 'streak',      labelKey: 'filterStreaks',    emoji: '🔥' },
  { key: 'family',      labelKey: 'filterFamily',     emoji: '👨‍👩‍👧‍👦' },
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
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<TimelineType | 'all' | 'highlights'>('all');
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<TimelineType>('memory');
  const [newEmoji, setNewEmoji] = useState('❤️');
  const [newMemberId, setNewMemberId] = useState<string | null>(null);
  const [newHighlight, setNewHighlight] = useState(false);

  const { entries, deleteEntry, addEntry } = useTimelineStore();
  const members = useFamilyStore((s) => s.members);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const cfg = TYPE_CONFIG[newType];
    addEntry({
      date: new Date().toISOString().split('T')[0],
      type: newType,
      title: newTitle.trim(),
      description: newDesc.trim() || t('family.screens.familyTimeline.defaultDescription'),
      memberId: newMemberId || undefined,
      emoji: newEmoji,
      color: cfg.color,
      isHighlight: newHighlight,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewTitle(''); setNewDesc(''); setNewType('memory'); setNewEmoji('❤️');
    setNewMemberId(null); setNewHighlight(false);
    setShowModal(false);
  };

  const getMember = (id?: string) => members.find((m) => m.id === id);

  const filtered = useMemo(() => {
    if (filter === 'all') return entries;
    if (filter === 'highlights') return entries.filter((e) => e.isHighlight);
    return entries.filter((e) => e.type === filter);
  }, [entries, filter]);

  const handleDelete = (entry: TimelineEntry) => {
    Alert.alert(
      t('family.screens.familyTimeline.deleteEntryTitle'),
      t('family.screens.familyTimeline.deleteEntryMsg', { title: entry.title }),
      [
        { text: t('family.screens.familyTimeline.cancel'), style: 'cancel' },
        { text: t('family.screens.familyTimeline.delete'), style: 'destructive', onPress: () => deleteEntry(entry.id) },
      ],
    );
  };

  const highlights = entries.filter((e) => e.isHighlight).length;

  const screenHeader = (
    <LinearGradient colors={['#4A0072', '#7B2D8B']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.getParent()?.navigate("Home")} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('family.screens.familyTimeline.headerTitle')}</Text>
          <Text style={styles.headerSub}>{t('family.screens.familyTimeline.headerSub', { count: entries.length, highlights })}</Text>
        </View>
        <Pressable onPress={() => setShowModal(true)} style={styles.addBtn}>
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
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{t(`family.screens.familyTimeline.${f.labelKey}`)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#4A0072', '#7B2D8B']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.getParent()?.navigate("Home")} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('family.screens.familyTimeline.headerTitle')}</Text>
      <Pressable onPress={() => setShowModal(true)} style={styles.addBtn}>
        <Ionicons name="add" size={22} color="#fff" />
      </Pressable>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 56 }}>📖</Text>
            <Text style={styles.emptyTitle}>{t('family.screens.familyTimeline.emptyTitle')}</Text>
            <Text style={styles.emptyDesc}>{t('family.screens.familyTimeline.emptyDesc')}</Text>
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
                        <Text style={styles.highlightText}>{t('family.screens.familyTimeline.highlightBadge')}</Text>
                      </View>
                    )}
                    <View style={styles.entryTop}>
                      <Text style={styles.entryEmoji}>{entry.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.entryTitle}>{entry.title}</Text>
                        <View style={styles.entryMeta}>
                          <View style={[styles.typeBadge, { backgroundColor: cfg.color + '15' }]}>
                            <Text style={[styles.typeText, { color: cfg.color }]}>{t(`family.screens.familyTimeline.${cfg.labelKey}`)}</Text>
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
        )}
      </CollapsibleHeader>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{t('family.screens.familyTimeline.modalTitle')}</Text>

          <Text style={styles.modalLabel}>{t('family.screens.familyTimeline.modalLabelType')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {ENTRY_TYPES.map((entryType) => {
              const cfg = TYPE_CONFIG[entryType];
              return (
                <Pressable key={entryType} onPress={() => setNewType(entryType)} style={[styles.typeChip, newType === entryType && { backgroundColor: cfg.color + '20', borderColor: cfg.color }]}>
                  <Ionicons name={cfg.icon as any} size={14} color={newType === entryType ? cfg.color : colors.textSecondary} />
                  <Text style={[styles.typeChipText, newType === entryType && { color: cfg.color }]}>{t(`family.screens.familyTimeline.${cfg.labelKey}`)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.modalLabel}>Emoji</Text>
          <View style={styles.emojiGrid}>
            {QUICK_EMOJIS.map((e) => (
              <Pressable key={e} onPress={() => setNewEmoji(e)} style={[styles.emojiBtn, newEmoji === e && styles.emojiBtnActive]}>
                <Text style={styles.emojiText}>{e}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Title *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Aiden's First Home Run" value={newTitle} onChangeText={setNewTitle} placeholderTextColor={colors.textMuted} autoFocus />

          <Text style={styles.modalLabel}>Description</Text>
          <TextInput
            style={[styles.modalInput, styles.modalTextarea]}
            placeholder="Describe this moment..."
            value={newDesc}
            onChangeText={setNewDesc}
            multiline
            numberOfLines={4}
            placeholderTextColor={colors.textMuted}
            textAlignVertical="top"
          />

          <Text style={styles.modalLabel}>About</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
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

          <View style={styles.highlightRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.highlightLabel}>Mark as Highlight</Text>
              <Text style={styles.highlightDesc}>Featured moments are shown with a gold star</Text>
            </View>
            <Switch value={newHighlight} onValueChange={setNewHighlight} trackColor={{ true: '#F5A623' }} />
          </View>

          <Button title="Add to Timeline" onPress={handleAdd} fullWidth size="lg" disabled={!newTitle.trim()} style={{ marginTop: 8 }} />
          <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
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
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  modalTextarea: { minHeight: 80, textAlignVertical: 'top' as const },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  emojiBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border },
  emojiBtnActive: { borderColor: '#4A0072', backgroundColor: '#F3E5F5' },
  emojiText: { fontSize: 18 },
  typeChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, marginRight: 8 },
  typeChipActive: { backgroundColor: '#4A0072', borderColor: '#4A0072' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#fff' },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, marginRight: 8 },
  memberChipActive: { borderColor: '#4A0072', backgroundColor: '#F3E5F5' },
  memberChipName: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  highlightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 24 },
  highlightLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  highlightDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
