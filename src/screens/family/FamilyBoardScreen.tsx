import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal,
  KeyboardAvoidingView, Platform, Alert, Switch, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useFamilyBoardStore, BoardPost, PostPriority, PostCategory } from '../../store/useFamilyBoardStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';

type FilterType = 'all' | 'pinned' | 'announcement' | 'reminder' | 'rule';

const PRIORITY_COLORS: Record<PostPriority, string> = {
  urgent: '#E74C3C',
  high: '#F5A623',
  normal: '#2980B9',
  low: '#CBD5E1',
};

const CATEGORY_CONFIG: Record<PostCategory, { label: string; color: string; icon: string }> = {
  announcement: { label: 'Announcement', color: '#2980B9', icon: '📢' },
  reminder: { label: 'Reminder', color: '#F5A623', icon: '⏰' },
  rule: { label: 'Rule', color: '#8E44AD', icon: '📋' },
  celebration: { label: 'Celebration', color: '#27AE60', icon: '🎉' },
  info: { label: 'Info', color: '#7F8C8D', icon: 'ℹ️' },
  question: { label: 'Question', color: '#16A085', icon: '❓' },
};

const PRIORITY_LABELS: Record<PostPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

const PRIORITIES: PostPriority[] = ['urgent', 'high', 'normal', 'low'];
const CATEGORIES: PostCategory[] = ['announcement', 'reminder', 'rule', 'celebration', 'info', 'question'];
const EXPIRE_OPTIONS = [
  { label: 'Never', value: null },
  { label: 'Today', value: 0 },
  { label: '3 Days', value: 3 },
  { label: '1 Week', value: 7 },
  { label: '1 Month', value: 30 },
];
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🎉', '🙏'];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins} minutes ago`;
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function getReactionSummary(reactions: { memberId: string; emoji: string }[]): { emoji: string; count: number }[] {
  const map: Record<string, number> = {};
  reactions.forEach((r) => {
    map[r.emoji] = (map[r.emoji] || 0) + 1;
  });
  return Object.entries(map).map(([emoji, count]) => ({ emoji, count }));
}

function PostCard({
  post,
  onPress,
}: {
  post: BoardPost;
  onPress: () => void;
}) {
  const cfg = CATEGORY_CONFIG[post.category];
  const reactionSummary = getReactionSummary(post.reactions);
  const priorityColor = PRIORITY_COLORS[post.priority];

  return (
    <Pressable onPress={onPress} style={styles.postCardWrapper}>
      <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />
      <View style={[styles.postCardInner, post.isPinned && styles.postCardPinned]}>
        <View style={styles.postTopRow}>
          <View style={[styles.catBadge, { backgroundColor: cfg.color + '20' }]}>
            <Text style={styles.catBadgeIcon}>{cfg.icon}</Text>
            <Text style={[styles.catBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          {post.isPinned && (
            <View style={styles.pinnedIndicator}>
              <Text style={styles.pinnedText}>📌 Pinned</Text>
            </View>
          )}
          <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
        </View>

        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postContent} numberOfLines={2}>{post.content}</Text>

        {reactionSummary.length > 0 && (
          <View style={styles.reactionsRow}>
            {reactionSummary.map(({ emoji, count }) => (
              <View key={emoji} style={styles.reactionChip}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text style={styles.reactionCount}>{count}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

function PostDetailModal({
  post,
  visible,
  onClose,
  onReact,
  onDelete,
  onTogglePin,
}: {
  post: BoardPost | null;
  visible: boolean;
  onClose: () => void;
  onReact: (postId: string, memberId: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const { t } = useTranslation('family');
  const members = useFamilyStore((s) => s.members);
  const me = members[0];

  if (!post) return null;

  const cfg = CATEGORY_CONFIG[post.category];
  const reactionSummary = getReactionSummary(post.reactions);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.detailModal}>
        <View style={styles.detailHeader}>
          <Pressable onPress={onClose} style={styles.detailCloseBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.detailHeaderTitle}>Post Details</Text>
          <Pressable onPress={() => onTogglePin(post.id)}>
            <Ionicons name={post.isPinned ? 'pin' : 'pin-outline'} size={22} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.detailContent}>
          <View style={[styles.detailCatRow]}>
            <View style={[styles.catBadge, { backgroundColor: cfg.color + '20' }]}>
              <Text style={styles.catBadgeIcon}>{cfg.icon}</Text>
              <Text style={[styles.catBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[post.priority] + '20' }]}>
              <Text style={[styles.priorityBadgeText, { color: PRIORITY_COLORS[post.priority] }]}>
                {PRIORITY_LABELS[post.priority]}
              </Text>
            </View>
          </View>

          <Text style={styles.detailTitle}>{post.title}</Text>
          <Text style={styles.detailContent2}>{post.content}</Text>
          <Text style={styles.detailTime}>{timeAgo(post.createdAt)}</Text>

          {reactionSummary.length > 0 && (
            <View style={styles.detailReactionsRow}>
              {reactionSummary.map(({ emoji, count }) => (
                <View key={emoji} style={styles.reactionChip}>
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text style={styles.reactionCount}>{count}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.detailSectionTitle}>React</Text>
          <View style={styles.emojiGrid}>
            {REACTION_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onReact(post.id, me?.id || 'member-1', emoji);
                }}
                style={styles.emojiBtn}
              >
                <Text style={styles.emojiBtnText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => {
              Alert.alert(t('common.deleteTitle'), 'Remove this post from the board?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete', style: 'destructive', onPress: () => {
                    onDelete(post.id);
                    onClose();
                  }
                },
              ]);
            }}
            style={styles.deletePostBtn}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deletePostText}>Delete Post</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function AddPostModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (p: Omit<BoardPost, 'id' | 'createdAt' | 'reactions'>) => void;
}) {
  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);
  const [authorId, setAuthorId] = useState('');
  const [category, setCategory] = useState<PostCategory>('announcement');
  const [priority, setPriority] = useState<PostPriority>('normal');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [expireOption, setExpireOption] = useState<null | number>(null);

  const handleAdd = () => {
    if (!title.trim() || !content.trim()) return;
    let expiresAt: string | undefined;
    if (expireOption !== null) {
      const d = new Date();
      d.setDate(d.getDate() + expireOption);
      expiresAt = d.toISOString();
    }
    onAdd({
      familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
      authorId: effectiveAuthorId,
      category,
      priority,
      title: title.trim(),
      content: content.trim(),
      isPinned,
      expiresAt,
    });
    setTitle(''); setContent(''); setIsPinned(false);
    setCategory('announcement'); setPriority('normal'); setExpireOption(null);
    onClose();
  };

  const effectiveAuthorId = authorId || members[0]?.id || '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Post</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Author</Text>
            <View style={styles.chipRow}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setAuthorId(m.id)}
                  style={[styles.chip, effectiveAuthorId === m.id && styles.chipActive]}
                >
                  <View style={[styles.memberDot, { backgroundColor: m.avatarColor }]} />
                  <Text style={[styles.chipText, effectiveAuthorId === m.id && styles.chipActiveText]}>{m.name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((c) => {
                const cfg = CATEGORY_CONFIG[c];
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.categoryBtn, category === c && { backgroundColor: cfg.color + '20', borderColor: cfg.color }]}
                  >
                    <Text style={styles.categoryBtnIcon}>{cfg.icon}</Text>
                    <Text style={[styles.categoryBtnText, category === c && { color: cfg.color }]}>{cfg.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[styles.chip, priority === p && { backgroundColor: PRIORITY_COLORS[p] + '20', borderColor: PRIORITY_COLORS[p] }]}
                >
                  <Text style={[styles.chipText, priority === p && { color: PRIORITY_COLORS[p] }]}>
                    {PRIORITY_LABELS[p]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Post title"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Content *</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              value={content}
              onChangeText={setContent}
              placeholder="What do you want to share with the family?"
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Pin to top</Text>
              <Switch
                value={isPinned}
                onValueChange={setIsPinned}
                trackColor={{ false: colors.border, true: '#1B2838' }}
              />
            </View>

            <Text style={styles.fieldLabel}>Expires In</Text>
            <View style={styles.chipRow}>
              {EXPIRE_OPTIONS.map((opt) => (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => setExpireOption(opt.value)}
                  style={[styles.chip, expireOption === opt.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, expireOption === opt.value && styles.chipActiveText]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleAdd}
              disabled={!title.trim() || !content.trim()}
              style={[styles.submitBtn, (!title.trim() || !content.trim()) && { opacity: 0.4 }]}
            >
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Post to Board</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function FamilyBoardScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const { posts, addPost, togglePin, addReaction, deletePost, getActivePosts, fetchFromServer, hydratePosts, isHydrating, isLoaded } = useFamilyBoardStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BoardPost | null>(null);

  useEffect(() => {
    fetchFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  const activePosts = useMemo(() => getActivePosts(), [posts]);

  const filtered = useMemo(() => {
    let list = activePosts;
    if (filter === 'pinned') list = list.filter((p) => p.isPinned);
    else if (filter === 'announcement') list = list.filter((p) => p.category === 'announcement');
    else if (filter === 'reminder') list = list.filter((p) => p.category === 'reminder');
    else if (filter === 'rule') list = list.filter((p) => p.category === 'rule');
    // Pinned first
    return [...list.filter((p) => p.isPinned), ...list.filter((p) => !p.isPinned)];
  }, [activePosts, filter]);

  const pinnedCount = activePosts.filter((p) => p.isPinned).length;

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pinned', label: `📌 Pinned (${pinnedCount})` },
    { key: 'announcement', label: 'Announcements' },
    { key: 'reminder', label: 'Reminders' },
    { key: 'rule', label: 'Rules' },
  ];

  const screenHeader = (
        <LinearGradient
          colors={['#0D1B2A', '#1B2838', '#162447']}
          style={[styles.header, { paddingTop: insets.top + 6 }]}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Family Board</Text>
              <Text style={styles.headerSub}>Announcements & Updates</Text>
            </View>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAdd(true); }}
              style={styles.addBtn}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersBar}>
            {FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
    </LinearGradient>
  );
  const screenCompact = (
    <LinearGradient
      colors={['#0D1B2A', '#162447']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>Family Board</Text>
      <View />
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
            refreshControl={<RefreshControl refreshing={isHydrating} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
        {activePosts.length === 0 && isLoaded && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 60 }}>📋</Text>
            <Text style={styles.emptyTitle}>Board is Empty</Text>
            <Text style={styles.emptyDesc}>Post announcements, reminders, and updates for the whole family</Text>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAdd(true); }}
              style={styles.demoBtn}
            >
              <Text style={styles.demoBtnText}>Add First Post</Text>
            </Pressable>
          </View>
        )}

        {filtered.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPost(post);
            }}
          />
        ))}

        {filtered.length === 0 && activePosts.length > 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>🔍</Text>
            <Text style={styles.emptyTitle}>No posts match this filter</Text>
          </View>
        )}
          </ScrollView>
        )}
      </CollapsibleHeader>

      <PostDetailModal
        post={selectedPost}
        visible={selectedPost !== null}
        onClose={() => setSelectedPost(null)}
        onReact={(postId, memberId, emoji) => {
          addReaction(postId, memberId, emoji);
          // Update the selectedPost reference so modal rerenders
          const updated = useFamilyBoardStore.getState().posts.find((p) => p.id === postId);
          if (updated) setSelectedPost({ ...updated });
        }}
        onDelete={(id) => { deletePost(id); setSelectedPost(null); }}
        onTogglePin={(id) => {
          togglePin(id);
          const updated = useFamilyBoardStore.getState().posts.find((p) => p.id === id);
          if (updated) setSelectedPost({ ...updated });
        }}
      />

      <AddPostModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={(p) => {
          addPost(p);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,marginBottom: 44,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 ,marginBottom: 44},
  addBtn: {
    width: 38, height: 38, borderRadius: 10,marginBottom: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  filtersBar: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)',
  },
  filterChipActive: { backgroundColor: '#fff' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  filterChipTextActive: { color: '#162447' },
  content: { padding: 16 },
  postCardWrapper: {
    flexDirection: 'row', marginBottom: 12,
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: colors.card, ...shadows.card,
  },
  priorityBar: { width: 5 },
  postCardInner: { flex: 1, padding: 14 },
  postCardPinned: { backgroundColor: '#F8F9FF' },
  postTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8,
  },
  catBadgeIcon: { fontSize: 11 },
  catBadgeText: { fontSize: 11, fontWeight: '700' },
  pinnedIndicator: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pinnedText: { fontSize: 11, fontWeight: '700', color: '#4338CA' },
  timeAgo: { fontSize: 11, color: colors.textMuted, marginLeft: 'auto' },
  postTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 5, lineHeight: 22 },
  postContent: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  reactionsRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.background, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  demoBtn: { backgroundColor: '#1B2838', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  demoBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Detail modal
  detailModal: { flex: 1, backgroundColor: colors.background },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailCloseBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  detailHeaderTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  detailCatRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  priorityBadge: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  priorityBadgeText: { fontSize: 11, fontWeight: '700' },
  detailTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 10 },
  detailContent2: { fontSize: 15, color: colors.text, lineHeight: 24, marginBottom: 10 },
  detailTime: { fontSize: 12, color: colors.textMuted, marginBottom: 16 },
  detailReactionsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  detailSectionTitle: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  emojiGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  emojiBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  emojiBtnText: { fontSize: 20 },
  deletePostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1, borderColor: colors.dangerLight,
    backgroundColor: colors.dangerLight,
  },
  deletePostText: { fontSize: 14, fontWeight: '600', color: colors.danger },
  // Add post modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalContent: { padding: 20, paddingBottom: 40 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 20, backgroundColor: colors.border,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: '#E8EEF9', borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipActiveText: { color: colors.primary },
  memberDot: { width: 10, height: 10, borderRadius: 5 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: colors.border,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  categoryBtnIcon: { fontSize: 14 },
  categoryBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 20, paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1B2838', borderRadius: 14,
    paddingVertical: 16, marginTop: 24,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  detailContent: { padding: 20 },
});
