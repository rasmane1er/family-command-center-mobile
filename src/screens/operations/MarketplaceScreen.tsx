import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useAutomationStore } from '../../store/useAutomationStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { ListingCategory } from '../../types';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';

const generateId = () => Math.random().toString(36).substring(2, 11);
const LISTING_CATEGORIES: ListingCategory[] = ['chores', 'skills', 'items', 'favors', 'lessons'];
const LISTING_ICONS: Record<ListingCategory, string> = {
  chores: 'home',
  skills: 'school',
  items: 'bag',
  favors: 'heart',
  lessons: 'book',
};

const CATEGORY_CONFIG: Record<string, { color: string; icon: string }> = {
  chores: { color: '#27AE60', icon: 'home' },
  skills: { color: '#2980B9', icon: 'school' },
  items: { color: '#F5A623', icon: 'bag' },
  favors: { color: '#E74C3C', icon: 'heart' },
  lessons: { color: '#8E44AD', icon: 'book' },
};

export function MarketplaceScreen({ navigation }: any) {
  const { t } = useTranslation('ops');
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | string>('all');
  const [activeTab, setActiveTab] = useState<'available' | 'claimed' | 'history'>('available');
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<ListingCategory>('chores');
  const [newPoints, setNewPoints] = useState('50');
  const { listings, claimListing, deleteListing, addListing, repairOrphanedClaims, fetchFromServer } = useAutomationStore();
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const family = useFamilyStore((s) => s.family);
  const tasks = useFamilyStore((s) => s.tasks);
  const currentMemberId = activeMemberId ?? members[0]?.id ?? 'member-1';

  useEffect(() => {
    // Backfills a real linked Task for any listing claimed before
    // claimListing() started creating one — otherwise those are stuck
    // showing "Claimed" with an "Open in Tasks" button that has nothing to
    // open. Cheap no-op once there's nothing left to repair. Runs after
    // fetchFromServer so it operates on real listings pulled from the
    // backend, not just whatever was cached locally.
    fetchFromServer().then(() => repairOrphanedClaims());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "a family member" instead of "Unknown" — this fires constantly on a
  // fresh account before real family members are set up, and "Unknown"
  // reads like something broke rather than just "not filled in yet."
  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name ?? 'a family member';

  // A claimed listing's real status lives entirely on its linked Task —
  // nothing here is a second copy that could drift out of sync.
  const getLinkedTask = (listing: (typeof listings)[number]) =>
    listing.taskId ? tasks.find((t) => t.id === listing.taskId) : undefined;

  const available = listings.filter((l) => l.isAvailable);
  const claimed = listings.filter((l) => !l.isAvailable && getLinkedTask(l)?.status !== 'completed');
  const completed = listings.filter((l) => !l.isAvailable && getLinkedTask(l)?.status === 'completed');

  const displayList = activeTab === 'available' ? available : activeTab === 'claimed' ? claimed : completed;

  const handleClaim = (id: string, title: string, value: number) => {
    Alert.alert(
      `Claim "${title}"?`,
      `This task is worth ${value} points. It'll show up in your Tasks — complete it there (with photo proof if needed) to earn your reward!`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Claim!', onPress: () => claimListing(id, currentMemberId) },
      ]
    );
  };

  // Only removes the listing from the marketplace view — the real task
  // record (photo proof, approval, points already paid out) stays put in
  // Tasks either way, since deleting the listing isn't the same as undoing
  // the work that was actually done.
  const handleDeleteListing = (id: string, title: string) => {
    Alert.alert(
      `Remove "${title}"?`,
      "This clears it from your marketplace view. It won't affect the points already awarded or its task history.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteListing(id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  };

  // Completion happens entirely in Tasks/Kids Mode now — same photo-proof
  // submission and parent "Needs Review" queue as any other task. This just
  // jumps you there instead of duplicating that flow here.
  //
  // Jumping into a sibling tab's nested stack (navigation.navigate('Family',
  // { screen: 'Tasks' }) or via navigation.getParent()) turned out to be
  // unreliable from this screen's specific nesting depth (Tab -> Operations
  // stack -> Marketplace) — rather than keep guessing at the right
  // incantation for crossing navigators, TasksScreen is now also registered
  // directly inside OperationsNavigator's own stack (see
  // OperationsNavigator.tsx), so this is a plain, same-stack, unambiguous
  // navigate() with nothing to bubble or resolve.
  const goToTasks = () => navigation.navigate('Tasks');

  const totalPoints = listings.filter((l) => l.isAvailable).reduce((s, l) => s + l.pointsValue, 0);

  const MIN_POINTS = 5;
  const MAX_POINTS = 1000;

  const handlePost = () => {
    if (!newTitle.trim()) { Alert.alert(t('common.validationTitle'), t('common.validationMsg')); return; }
    const pts = parseInt(newPoints, 10);
    if (!Number.isFinite(pts) || pts < MIN_POINTS || pts > MAX_POINTS) {
      Alert.alert('Invalid Points', `Points must be between ${MIN_POINTS} and ${MAX_POINTS}.`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addListing({
      familyId: useAuthStore.getState().familyId ?? '',
      createdBy: currentMemberId,
      title: newTitle.trim(),
      description: newDesc.trim() || 'Help needed with this task',
      category: newCategory,
      pointsValue: pts,
      isAvailable: true,
      icon: LISTING_ICONS[newCategory],
      tags: [newCategory],
    });
    setShowModal(false);
    setNewTitle(''); setNewDesc(''); setNewCategory('chores'); setNewPoints('50');
  };

  const screenHeader = (
    <LinearGradient colors={['#E65100', '#F57C00']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Family Marketplace</Text>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowModal(true); }} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.marketStats}>
        <View style={styles.mStat}>
          <Text style={styles.mStatVal}>{available.length}</Text>
          <Text style={styles.mStatLabel}>Available</Text>
        </View>
        <View style={styles.mStat}>
          <Text style={styles.mStatVal}>{totalPoints}</Text>
          <Text style={styles.mStatLabel}>Points Available</Text>
        </View>
        <View style={styles.mStat}>
          <Text style={styles.mStatVal}>{completed.length}</Text>
          <Text style={styles.mStatLabel}>Completed</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
        {['all', 'chores', 'skills', 'lessons', 'favors'].map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setFilter(cat)}
            style={[styles.filterChip, filter === cat && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === cat && styles.filterTextActive]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    
    <View style={styles.tabs}>
            {(['available', 'claimed', 'history'] as const).map((tab) => (
              <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'available' ? `Available (${available.length})` : tab === 'claimed' ? `In Progress (${claimed.length})` : `Done (${completed.length})`}
                </Text>
              </Pressable>
            ))}
          </View>
</LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#E65100', '#F57C00']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>Family Marketplace</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{totalPoints} pts</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
          >
        {displayList
          .filter((l) => filter === 'all' || l.category === filter)
          .map((listing) => {
            const cfg = CATEGORY_CONFIG[listing.category] ?? { color: '#95A5A6', icon: 'ellipsis-horizontal' };
            return (
              <Card key={listing.id} style={styles.listingCard} variant="elevated">
                <View style={styles.listingHeader}>
                  <View style={[styles.listingIcon, { backgroundColor: cfg.color + '15' }]}>
                    <Ionicons name={listing.icon as any} size={24} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.listingTitle}>{listing.title}</Text>
                    <Text style={styles.listingDesc}>{listing.description}</Text>
                    <Text style={styles.listingCreator}>Posted by {getMemberName(listing.createdBy)}</Text>
                  </View>
                  <View style={styles.pointsBlock}>
                    <Ionicons name="star" size={14} color={colors.secondary} />
                    <Text style={styles.pointsVal}>{listing.pointsValue}</Text>
                    <Text style={styles.pointsLabel}>pts</Text>
                  </View>
                </View>

                <View style={styles.tagsRow}>
                  {listing.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                  <Badge label={listing.category} variant="neutral" size="sm" />
                </View>

                {listing.isAvailable && (
                  <Pressable
                    onPress={() => handleClaim(listing.id, listing.title, listing.pointsValue)}
                    style={[styles.claimBtn, { backgroundColor: cfg.color }]}
                  >
                    <Ionicons name="hand-left" size={14} color="#fff" />
                    <Text style={styles.claimBtnText}>Claim This Task</Text>
                  </Pressable>
                )}

                {(() => {
                  if (!listing.claimedBy) return null;
                  const linkedTask = getLinkedTask(listing);
                  const taskStatus = linkedTask?.status;

                  if (taskStatus === 'completed') {
                    return (
                      <View style={styles.completedBanner}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                        <Text style={styles.completedText}>Completed by {getMemberName(listing.claimedBy)} — points awarded</Text>
                        <Pressable onPress={() => handleDeleteListing(listing.id, listing.title)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    );
                  }

                  if (taskStatus === 'pending_approval') {
                    return (
                      <View style={styles.claimedBanner}>
                        <Ionicons name="hourglass-outline" size={14} color={colors.warning} />
                        <Text style={styles.claimedText}>{getMemberName(listing.claimedBy)} submitted this — awaiting parent approval</Text>
                        <Pressable onPress={goToTasks} style={styles.doneBtn}>
                          <Text style={styles.doneBtnText}>Review</Text>
                        </Pressable>
                      </View>
                    );
                  }

                  // Claimed, still in progress — completion happens in
                  // Tasks/Kids Mode (photo proof + approval), not here.
                  return (
                    <View style={styles.claimedBanner}>
                      <Ionicons name="person" size={14} color={colors.warning} />
                      <Text style={styles.claimedText}>Claimed by {getMemberName(listing.claimedBy)}</Text>
                      <Pressable onPress={goToTasks} style={styles.doneBtn}>
                        <Text style={styles.doneBtnText}>Open in Tasks</Text>
                      </Pressable>
                    </View>
                  );
                })()}
              </Card>
            );
          })}

        {displayList.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={60} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyDesc}>Post tasks, skills, or favors to earn points as a family.</Text>
          </View>
        )}
          </ScrollView>
        )}
      </CollapsibleHeader>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Post to Marketplace</Text>

          <Text style={styles.modalLabel}>Category</Text>
          <View style={styles.catGrid}>
            {LISTING_CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              return (
                <Pressable key={cat} onPress={() => setNewCategory(cat)} style={[styles.catChip, newCategory === cat && { backgroundColor: cfg.color, borderColor: cfg.color }]}>
                  <Ionicons name={cfg.icon as any} size={14} color={newCategory === cat ? '#fff' : cfg.color} />
                  <Text style={[styles.catChipText, newCategory === cat && { color: '#fff' }]}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.modalLabel}>Title</Text>
          <TextInput style={styles.modalInput} value={newTitle} onChangeText={setNewTitle} placeholder="What needs to be done?" placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Description</Text>
          <TextInput style={[styles.modalInput, styles.modalTextarea]} value={newDesc} onChangeText={setNewDesc} placeholder="Add details about this task..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />

          <Text style={styles.modalLabel}>Points Value ({MIN_POINTS}–{MAX_POINTS})</Text>
          <TextInput style={styles.modalInput} value={newPoints} onChangeText={setNewPoints} placeholder="50" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

          <Button title="Post Task" onPress={handlePost} />
          <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" style={{ marginTop: 8 }} />
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  marketStats: { flexDirection: 'row', justifyContent: 'space-around' },
  mStat: { alignItems: 'center' },
  mStatVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
  mStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8 },
  filterChipActive: { backgroundColor: '#fff' },
  filterText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  filterTextActive: { color: '#F57C00' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#F57C00' },
  tabText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#F57C00' },
  content: { padding: 16 },
  listingCard: { marginBottom: 12, borderRadius: 14 },
  listingHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  listingIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  listingTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  listingDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  listingCreator: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  pointsBlock: { alignItems: 'center' },
  pointsVal: { fontSize: 20, fontWeight: '800', color: colors.secondary },
  pointsLabel: { fontSize: 10, color: colors.textMuted },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: { backgroundColor: colors.background, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  tagText: { fontSize: 11, color: colors.textMuted },
  claimBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 10 },
  claimBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  claimedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warning + '15', borderRadius: 10, padding: 10 },
  claimedText: { flex: 1, fontSize: 12, color: colors.text },
  doneBtn: { backgroundColor: colors.success, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  doneBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  completedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.success + '10', borderRadius: 10, padding: 10 },
  completedText: { flex: 1, fontSize: 12, color: colors.success, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  modalTextarea: { minHeight: 70, textAlignVertical: 'top' as const },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  catChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
});
