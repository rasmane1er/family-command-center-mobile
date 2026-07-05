import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, Alert, Switch, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useGiftStore, GiftOccasion, GiftStatus, GiftPriority, GiftIdea } from '../../store/useGiftStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const generateId = () => Math.random().toString(36).substring(2, 11);

const OCCASION_EMOJIS: Record<GiftOccasion, string> = {
  birthday: '🎂',
  christmas: '🎄',
  anniversary: '💑',
  graduation: '🎓',
  mothers_day: '🌸',
  fathers_day: '👔',
  valentines: '💝',
  other: '🎁',
};

const STATUS_COLORS: Record<GiftStatus, string> = {
  idea: '#7F8C8D',
  purchased: '#F5A623',
  wrapped: '#2980B9',
  given: '#27AE60',
};

const STATUS_VARIANTS: Record<GiftStatus, 'neutral' | 'warning' | 'info' | 'success'> = {
  idea: 'neutral',
  purchased: 'warning',
  wrapped: 'info',
  given: 'success',
};

const STATUS_LABELS: Record<GiftStatus, string> = {
  idea: 'Idea',
  purchased: 'Purchased',
  wrapped: 'Wrapped',
  given: 'Given',
};

const STATUS_NEXT: Record<GiftStatus, GiftStatus | null> = {
  idea: 'purchased',
  purchased: 'wrapped',
  wrapped: 'given',
  given: null,
};

const PRIORITY_COLORS: Record<GiftPriority, string> = {
  low: colors.textMuted,
  medium: colors.warning,
  high: colors.danger,
};

const PRIORITIES: GiftPriority[] = ['low', 'medium', 'high'];
const OCCASIONS: GiftOccasion[] = ['birthday', 'christmas', 'anniversary', 'graduation', 'mothers_day', 'fathers_day', 'valentines', 'other'];
const ALL_STATUSES: GiftStatus[] = ['idea', 'purchased', 'wrapped', 'given'];

const OCCASION_LABEL_KEYS: Record<GiftOccasion, string> = {
  birthday: 'occasionBirthday',
  christmas: 'occasionChristmas',
  anniversary: 'occasionAnniversary',
  graduation: 'occasionGraduation',
  mothers_day: 'occasionMothersDay',
  fathers_day: 'occasionFathersDay',
  valentines: 'occasionValentines',
  other: 'occasionOther',
};

export function GiftPlannerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('family');
  const { gifts, addGift, updateStatus, deleteGift, hydrateGifts, isHydrating } = useGiftStore();
  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);

  useEffect(() => {
    hydrateGifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeTab, setActiveTab] = useState<'By Person' | 'By Occasion' | 'Budget'>('By Person');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id ?? '');
  const [selectedOccasion, setSelectedOccasion] = useState<GiftOccasion | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal state
  const [newForMemberId, setNewForMemberId] = useState(members[0]?.id ?? '');
  const [newOccasion, setNewOccasion] = useState<GiftOccasion>('birthday');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newPriority, setNewPriority] = useState<GiftPriority>('medium');
  const [newIsSurprise, setNewIsSurprise] = useState(true);
  const [newNotes, setNewNotes] = useState('');
  const [newPurchasedBy, setNewPurchasedBy] = useState('');

  const totalBudget = gifts.reduce((sum, g) => sum + (g.estimatedPrice ?? 0), 0);
  const purchased = gifts.filter((g) => g.status === 'purchased' || g.status === 'wrapped' || g.status === 'given');
  const ideas = gifts.filter((g) => g.status === 'idea');

  const resetModal = () => {
    setNewForMemberId(members[0]?.id ?? '');
    setNewOccasion('birthday');
    setNewTitle('');
    setNewDescription('');
    setNewPrice('');
    setNewPriority('medium');
    setNewIsSurprise(true);
    setNewNotes('');
    setNewPurchasedBy('');
  };

  const handleAdd = () => {
    if (!newTitle.trim()) {
      Alert.alert('Missing Info', 'Please enter a gift title.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addGift({
      familyId: family?.id ?? 'demo-family',
      forMemberId: newForMemberId,
      occasion: newOccasion,
      title: newTitle.trim(),
      description: newDescription || undefined,
      estimatedPrice: newPrice ? parseFloat(newPrice) : undefined,
      priority: newPriority,
      status: 'idea',
      purchasedBy: newPurchasedBy || undefined,
      notes: newNotes || undefined,
      isSurprise: newIsSurprise,
    });
    resetModal();
    setShowAddModal(false);
  };

  const handleStatusAdvance = (gift: GiftIdea) => {
    const next = STATUS_NEXT[gift.status];
    if (!next) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateStatus(gift.id, next);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(t('common.deleteTitle'), 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteGift(id);
        }
      },
    ]);
  };

  const tabs = ['By Person', 'By Occasion', 'Budget'] as const;

  // By Person
  const memberGifts = gifts.filter((g) => g.forMemberId === selectedMemberId);

  // By Occasion
  const groupedByOccasion = OCCASIONS.reduce((acc, occ) => {
    const oGifts = gifts.filter((g) => g.occasion === occ);
    if (oGifts.length > 0) acc[occ] = oGifts;
    return acc;
  }, {} as Record<GiftOccasion, GiftIdea[]>);

  // Budget
  const memberBudgets = members.map((m) => {
    const mGifts = gifts.filter((g) => g.forMemberId === m.id);
    const total = mGifts.reduce((sum, g) => sum + (g.estimatedPrice ?? 0), 0);
    const spent = mGifts.filter((g) => g.status !== 'idea').reduce((sum, g) => sum + (g.estimatedPrice ?? 0), 0);
    return { member: m, total, spent, gifts: mGifts };
  }).filter((x) => x.gifts.length > 0);

  const GiftCard = ({ gift }: { gift: GiftIdea }) => {
    const buyer = members.find((m) => m.id === gift.purchasedBy);
    const nextStatus = STATUS_NEXT[gift.status];

    return (
      <Card style={styles.giftCard} variant="elevated">
        <View style={styles.giftCardTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.giftTitleRow}>
              <Text style={styles.giftTitle}>{gift.title}</Text>
              {gift.isSurprise && <Ionicons name="lock-closed" size={13} color={colors.textMuted} />}
            </View>
            {gift.description ? <Text style={styles.giftDesc}>{gift.description}</Text> : null}
            <View style={styles.giftBadgeRow}>
              <Badge label={STATUS_LABELS[gift.status]} variant={STATUS_VARIANTS[gift.status]} size="sm" />
              <Badge label={`${OCCASION_EMOJIS[gift.occasion]} ${t(`family.screens.giftPlanner.${OCCASION_LABEL_KEYS[gift.occasion]}`)}`} variant="neutral" size="sm" />
              <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[gift.priority] }]} />
            </View>
          </View>
          {gift.estimatedPrice !== undefined && (
            <Text style={styles.giftPrice}>${gift.estimatedPrice}</Text>
          )}
        </View>

        {buyer && (
          <Text style={styles.giftBuyer}>Purchased by {buyer.name}</Text>
        )}

        <View style={styles.giftActions}>
          {nextStatus && (
            <Pressable onPress={() => handleStatusAdvance(gift)} style={[styles.statusBtn, { backgroundColor: STATUS_COLORS[nextStatus] + '20' }]}>
              <Text style={[styles.statusBtnText, { color: STATUS_COLORS[nextStatus] }]}>
                Mark as {STATUS_LABELS[nextStatus]}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={STATUS_COLORS[nextStatus]} />
            </Pressable>
          )}
          <Pressable onPress={() => handleDelete(gift.id, gift.title)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
          </Pressable>
        </View>
      </Card>
    );
  };

  const screenHeader = (
    <LinearGradient colors={['#880E4F', '#C2185B']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Gift Planner</Text>
        <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>${totalBudget.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Total Budget</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{purchased.length}</Text>
          <Text style={styles.summaryLabel}>Purchased</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{ideas.length}</Text>
          <Text style={styles.summaryLabel}>Ideas</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#880E4F', '#C2185B']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>Gift Planner</Text>
      <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
        <Ionicons name="add" size={26} color="#fff" />
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
        refreshControl={<RefreshControl refreshing={isHydrating} onRefresh={hydrateGifts} tintColor={colors.primary} />}
      >
        {/* BY PERSON TAB */}
        {activeTab === 'By Person' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberTabScroll}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setSelectedMemberId(m.id)}
                  style={[styles.memberTab, selectedMemberId === m.id && styles.memberTabActive]}
                >
                  <View style={[styles.memberTabAvatar, { backgroundColor: m.avatarColor }]}>
                    <Text style={styles.memberTabAvatarText}>{m.name[0]}</Text>
                  </View>
                  <Text style={[styles.memberTabName, selectedMemberId === m.id && { color: '#C2185B', fontWeight: '700' }]}>{m.name}</Text>
                  {gifts.filter((g) => g.forMemberId === m.id).length > 0 && (
                    <View style={styles.memberTabBadge}>
                      <Text style={styles.memberTabBadgeText}>{gifts.filter((g) => g.forMemberId === m.id).length}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>

            {memberGifts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🎁</Text>
                <Text style={styles.emptyTitle}>No gifts yet</Text>
                <Text style={styles.emptyDesc}>Tap + to add a gift idea.</Text>
              </View>
            ) : (
              memberGifts.map((gift) => <GiftCard key={gift.id} gift={gift} />)
            )}
          </>
        )}

        {/* BY OCCASION TAB */}
        {activeTab === 'By Occasion' && (
          <>
            {Object.keys(groupedByOccasion).length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🎉</Text>
                <Text style={styles.emptyTitle}>No gifts yet</Text>
              </View>
            ) : (
              (Object.entries(groupedByOccasion) as [GiftOccasion, GiftIdea[]][]).map(([occ, oGifts]) => (
                <View key={occ} style={styles.occasionSection}>
                  <Text style={styles.occasionHeader}>
                    {OCCASION_EMOJIS[occ]} {t(`family.screens.giftPlanner.${OCCASION_LABEL_KEYS[occ]}`)}
                    <Text style={styles.occasionCount}> ({oGifts.length})</Text>
                  </Text>
                  {oGifts.map((gift) => <GiftCard key={gift.id} gift={gift} />)}
                </View>
              ))
            )}
          </>
        )}

        {/* BUDGET TAB */}
        {activeTab === 'Budget' && (
          <>
            <Card style={styles.budgetSummaryCard} variant="elevated">
              <Text style={styles.budgetTitle}>Total Gift Budget</Text>
              <Text style={styles.budgetTotal}>${totalBudget.toFixed(2)}</Text>
              <View style={styles.budgetSubRow}>
                <View style={styles.budgetSubItem}>
                  <Text style={styles.budgetSubValue}>${purchased.reduce((s, g) => s + (g.estimatedPrice ?? 0), 0).toFixed(0)}</Text>
                  <Text style={styles.budgetSubLabel}>Spent</Text>
                </View>
                <View style={styles.budgetSubItem}>
                  <Text style={styles.budgetSubValue}>${ideas.reduce((s, g) => s + (g.estimatedPrice ?? 0), 0).toFixed(0)}</Text>
                  <Text style={styles.budgetSubLabel}>Planned</Text>
                </View>
                <View style={styles.budgetSubItem}>
                  <Text style={styles.budgetSubValue}>{gifts.length}</Text>
                  <Text style={styles.budgetSubLabel}>Total Gifts</Text>
                </View>
              </View>
            </Card>

            {memberBudgets.map(({ member, total, spent, gifts: mGifts }) => (
              <Card key={member.id} style={styles.budgetMemberCard} variant="elevated">
                <View style={styles.budgetMemberHeader}>
                  <View style={[styles.budgetMemberAvatar, { backgroundColor: member.avatarColor }]}>
                    <Text style={styles.budgetMemberAvatarText}>{member.name[0]}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.budgetMemberName}>{member.name}</Text>
                    <Text style={styles.budgetMemberCount}>{mGifts.length} gift{mGifts.length !== 1 ? 's' : ''}</Text>
                  </View>
                  <Text style={styles.budgetMemberTotal}>${total.toFixed(0)}</Text>
                </View>
                <View style={styles.budgetBarRow}>
                  <View style={styles.budgetBarTrack}>
                    <View style={[styles.budgetBarFill, {
                      width: total > 0 ? `${Math.min((spent / total) * 100, 100)}%` as any : '0%',
                      backgroundColor: '#C2185B',
                    }]} />
                  </View>
                  <Text style={styles.budgetBarLabel}>{total > 0 ? Math.round((spent / total) * 100) : 0}% purchased</Text>
                </View>
                <View style={styles.budgetStatusRow}>
                  {ALL_STATUSES.map((s) => {
                    const cnt = mGifts.filter((g) => g.status === s).length;
                    if (cnt === 0) return null;
                    return (
                      <View key={s} style={[styles.budgetStatusChip, { backgroundColor: STATUS_COLORS[s] + '20' }]}>
                        <Text style={[styles.budgetStatusChipText, { color: STATUS_COLORS[s] }]}>{STATUS_LABELS[s]}: {cnt}</Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add Gift Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Gift Idea</Text>
            <Pressable onPress={() => { resetModal(); setShowAddModal(false); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalLabel}>For</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setNewForMemberId(m.id)}
                  style={[styles.modalMemberChip, newForMemberId === m.id && styles.modalMemberChipActive]}
                >
                  <View style={[styles.modalMemberAvatar, { backgroundColor: m.avatarColor }]}>
                    <Text style={styles.modalMemberAvatarText}>{m.name[0]}</Text>
                  </View>
                  <Text style={[styles.modalMemberName, newForMemberId === m.id && { color: '#C2185B', fontWeight: '700' }]}>{m.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Occasion</Text>
            <View style={styles.occasionGrid}>
              {OCCASIONS.map((occ) => (
                <Pressable
                  key={occ}
                  onPress={() => setNewOccasion(occ)}
                  style={[styles.occasionGridItem, newOccasion === occ && styles.occasionGridItemActive]}
                >
                  <Text style={styles.occasionGridEmoji}>{OCCASION_EMOJIS[occ]}</Text>
                  <Text style={[styles.occasionGridLabel, newOccasion === occ && { color: '#C2185B' }]}>
                    {t(`family.screens.giftPlanner.${OCCASION_LABEL_KEYS[occ]}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Gift Title *</Text>
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Wireless headphones"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, { height: 70 }]}
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="Optional note about this gift"
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Text style={styles.modalLabel}>Estimated Price ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={newPrice}
              onChangeText={setNewPrice}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Priority</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map((p) => (
                <Pressable key={p} onPress={() => setNewPriority(p)} style={[styles.chip, newPriority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }]}>
                  <Text style={[styles.chipText, newPriority === p && { color: '#fff' }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Purchased By</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <Pressable
                onPress={() => setNewPurchasedBy('')}
                style={[styles.chip, !newPurchasedBy && styles.chipActive]}
              >
                <Text style={[styles.chipText, !newPurchasedBy && styles.chipTextActive]}>None</Text>
              </Pressable>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setNewPurchasedBy(m.id)}
                  style={[styles.chip, { marginLeft: 8 }, newPurchasedBy === m.id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, newPurchasedBy === m.id && styles.chipTextActive]}>{m.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.surpriseRow}>
              <View>
                <Text style={styles.surpriseLabel}>Is a Surprise?</Text>
                <Text style={styles.surpriseSub}>Hide from the recipient</Text>
              </View>
              <Switch
                value={newIsSurprise}
                onValueChange={setNewIsSurprise}
                trackColor={{ false: colors.border, true: '#C2185B60' }}
                thumbColor={newIsSurprise ? '#C2185B' : colors.border}
              />
            </View>

            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              value={newNotes}
              onChangeText={setNewNotes}
              placeholder="Optional notes"
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Pressable
              onPress={handleAdd}
              style={[styles.submitBtn, !newTitle.trim() && styles.submitBtnDisabled]}
            >
              <Text style={styles.submitBtnText}>Add Gift Idea 🎁</Text>
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 2 },
  tabRow: { flexDirection: 'row', marginBottom: 0 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#fff' },
  tabText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: '#fff' },
  content: { padding: 16 },
  seedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 16,marginTop: 16, ...shadows.sm },
  seedBtnText: { fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  // Member tabs
  memberTabScroll: { marginBottom: 16 },
  memberTab: { alignItems: 'center', marginRight: 16, paddingVertical: 8 },
  memberTabActive: {},
  memberTabAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  memberTabAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  memberTabName: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  memberTabBadge: { position: 'absolute', top: 0, right: -4, backgroundColor: '#C2185B', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  memberTabBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  // Gift card
  giftCard: { marginBottom: 10 },
  giftCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  giftTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  giftTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  giftDesc: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  giftBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  giftPrice: { fontSize: 18, fontWeight: '800', color: colors.text, marginLeft: 8 },
  giftBuyer: { fontSize: 11, color: colors.textMuted, marginBottom: 8 },
  giftActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  statusBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  statusBtnText: { fontSize: 12, fontWeight: '700' },
  deleteBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  // By occasion
  occasionSection: { marginBottom: 16 },
  occasionHeader: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 10 },
  occasionCount: { fontSize: 14, fontWeight: '400', color: colors.textSecondary },
  // Budget
  budgetSummaryCard: { marginBottom: 12 },
  budgetTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  budgetTotal: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 12 },
  budgetSubRow: { flexDirection: 'row', gap: 12 },
  budgetSubItem: { flex: 1, alignItems: 'center', backgroundColor: colors.background, borderRadius: 10, padding: 10 },
  budgetSubValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  budgetSubLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  budgetMemberCard: { marginBottom: 10 },
  budgetMemberHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  budgetMemberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  budgetMemberAvatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  budgetMemberName: { fontSize: 15, fontWeight: '700', color: colors.text },
  budgetMemberCount: { fontSize: 11, color: colors.textMuted },
  budgetMemberTotal: { fontSize: 18, fontWeight: '800', color: colors.text },
  budgetBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  budgetBarTrack: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  budgetBarFill: { height: 8, borderRadius: 4 },
  budgetBarLabel: { fontSize: 11, color: colors.textSecondary, width: 80, textAlign: 'right' },
  budgetStatusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  budgetStatusChip: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8 },
  budgetStatusChipText: { fontSize: 11, fontWeight: '600' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.card },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalScroll: { flex: 1, padding: 20 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: colors.text, marginBottom: 16, backgroundColor: colors.background },
  occasionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  occasionGridItem: { width: '22%', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', gap: 3 },
  occasionGridItemActive: { borderColor: '#C2185B', backgroundColor: '#C2185B15' },
  occasionGridEmoji: { fontSize: 20 },
  occasionGridLabel: { fontSize: 9, fontWeight: '600', color: colors.textMuted },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: '#C2185B', borderColor: '#C2185B' },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  modalMemberChip: { alignItems: 'center', marginRight: 16, paddingVertical: 6 },
  modalMemberChipActive: {},
  modalMemberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  modalMemberAvatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  modalMemberName: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  surpriseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 16 },
  surpriseLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  surpriseSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#C2185B', borderRadius: 14, paddingVertical: 15, marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
