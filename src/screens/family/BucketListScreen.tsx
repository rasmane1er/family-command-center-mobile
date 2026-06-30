import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useBucketListStore, BucketCategory, BucketItem } from '../../store/useBucketListStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const CATEGORY_CONFIG: Record<BucketCategory, { color: string; icon: string; label: string }> = {
  travel:      { color: '#2980B9', icon: 'airplane',             label: 'Travel' },
  experience:  { color: '#E91E63', icon: 'star',                 label: 'Experience' },
  achievement: { color: '#F5A623', icon: 'trophy',               label: 'Achievement' },
  learn:       { color: '#27AE60', icon: 'school',               label: 'Learn' },
  give:        { color: '#E74C3C', icon: 'heart',                label: 'Give' },
  adventure:   { color: '#E67E22', icon: 'compass',              label: 'Adventure' },
  food:        { color: '#8E44AD', icon: 'restaurant',           label: 'Food' },
  other:       { color: '#7F8C8D', icon: 'ellipsis-horizontal',  label: 'Other' },
};

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as BucketCategory[];

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    variant: 'neutral' as const,  color: colors.textMuted },
  medium: { label: 'Medium', variant: 'warning' as const,  color: colors.warning },
  high:   { label: 'High',   variant: 'danger' as const,   color: colors.danger },
};

const EMOJI_OPTIONS = [
  '🌌','🏄','🗺️','🤝','🏃','🍳','🏰','🌍',
  '🎸','🏔️','🎨','🌊','⛷️','🎭','🏕️','🦁',
  '🚀','🎪','🌺','🏆',
];

type TabType = 'dreams' | 'completed' | 'category';

export function BucketListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { items, addItem, completeItem, deleteItem } = useBucketListStore();
  const members = useFamilyStore((s) => s.members);

  // Seed if empty
  const { seedDemoData } = useBucketListStore();
  if (items.length === 0) seedDemoData();

  const [activeTab, setActiveTab] = useState<TabType>('dreams');
  const [selectedCategory, setSelectedCategory] = useState<BucketCategory | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Modal state
  const [modalEmoji, setModalEmoji] = useState('🌍');
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalCategory, setModalCategory] = useState<BucketCategory>('experience');
  const [modalYear, setModalYear] = useState('');
  const [modalCost, setModalCost] = useState('');
  const [modalPriority, setModalPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [modalMembers, setModalMembers] = useState<string[]>([]);

  const dreamItems = items.filter((i) => !i.isCompleted);
  const completedItems = items.filter((i) => i.isCompleted);
  const totalCost = dreamItems.reduce((s, i) => s + (i.estimatedCost ?? 0), 0);
  const completionPct = items.length > 0 ? completedItems.length / items.length : 0;

  const categoryItems = selectedCategory
    ? dreamItems.filter((i) => i.category === selectedCategory)
    : dreamItems;

  const categoryCounts: Record<BucketCategory, number> = {} as any;
  CATEGORIES.forEach((c) => {
    categoryCounts[c] = dreamItems.filter((i) => i.category === c).length;
  });

  const handleComplete = (item: BucketItem) => {
    Alert.alert(
      'Mark as Done! 🎉',
      `Congratulations! Did your family really complete "${item.title}"?`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, we did it! 🎉',
          onPress: () => {
            completeItem(item.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('🎉 Amazing!', `"${item.title}" is now a family achievement!`);
          },
        },
      ]
    );
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Item', `Remove "${title}" from the bucket list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteItem(id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const handleAddItem = () => {
    if (!modalTitle.trim()) {
      Alert.alert('Missing Info', 'Please enter a title for your bucket list item.');
      return;
    }
    addItem({
      familyId: 'demo-family',
      title: modalTitle.trim(),
      description: modalDesc.trim() || undefined,
      category: modalCategory,
      targetYear: modalYear ? parseInt(modalYear) : undefined,
      estimatedCost: modalCost ? parseFloat(modalCost) : undefined,
      membersInterested: modalMembers.length > 0 ? modalMembers : members.map((m) => m.id),
      priority: modalPriority,
      isCompleted: false,
      emoji: modalEmoji,
      notes: undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    setModalTitle('');
    setModalDesc('');
    setModalYear('');
    setModalCost('');
    setModalMembers([]);
    setModalEmoji('🌍');
    setModalCategory('experience');
    setModalPriority('medium');
  };

  const toggleModalMember = (id: string) => {
    setModalMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const renderDreamCard = (item: BucketItem) => {
    const cc = CATEGORY_CONFIG[item.category];
    const pc = PRIORITY_CONFIG[item.priority];
    const interestedMembers = members.filter((m) => item.membersInterested.includes(m.id));
    return (
      <Card key={item.id} style={styles.dreamCard} variant="elevated">
        <View style={styles.dreamCardTop}>
          <Text style={styles.dreamEmoji}>{item.emoji}</Text>
          <View style={styles.dreamCardInfo}>
            <Text style={styles.dreamTitle}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.dreamDesc}>{item.description}</Text>
            ) : null}
            <View style={styles.dreamBadgeRow}>
              <View style={[styles.categoryBadge, { backgroundColor: cc.color + '20' }]}>
                <Ionicons name={cc.icon as any} size={11} color={cc.color} />
                <Text style={[styles.categoryBadgeText, { color: cc.color }]}>{cc.label}</Text>
              </View>
              <Badge label={pc.label} variant={pc.variant} size="sm" />
            </View>
            <View style={styles.dreamMeta}>
              {item.targetYear ? (
                <View style={styles.dreamMetaChip}>
                  <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                  <Text style={styles.dreamMetaText}>{item.targetYear}</Text>
                </View>
              ) : null}
              {item.estimatedCost !== undefined ? (
                <View style={styles.dreamMetaChip}>
                  <Ionicons name="cash-outline" size={11} color={colors.textMuted} />
                  <Text style={styles.dreamMetaText}>
                    ${item.estimatedCost.toLocaleString()}
                  </Text>
                </View>
              ) : null}
            </View>
            {interestedMembers.length > 0 && (
              <View style={styles.avatarRow}>
                {interestedMembers.slice(0, 5).map((m) => (
                  <View
                    key={m.id}
                    style={[styles.avatarChip, { backgroundColor: m.avatarColor + '30', borderColor: m.avatarColor }]}
                  >
                    <Text style={[styles.avatarInitial, { color: m.avatarColor }]}>
                      {m.name.charAt(0)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={styles.dreamCardActions}>
          <Pressable
            style={styles.completeBtn}
            onPress={() => handleComplete(item)}
          >
            <LinearGradient
              colors={['#27AE60', '#1ABC9C']}
              style={styles.completeBtnGradient}
            >
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.completeBtnText}>Mark as Done! 🎉</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => handleDelete(item.id, item.title)}
            style={styles.deleteIconBtn}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </Pressable>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#4A148C', '#6A1B9A', '#7B1FA2']}
        style={{ paddingTop: insets.top + 6, paddingBottom: 8, paddingHorizontal: 20 }}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Family Bucket List</Text>
          <Pressable onPress={() => setShowModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.headerStats}>
          <View style={styles.headerStatBlock}>
            <Text style={styles.headerStatValue}>{items.length}</Text>
            <Text style={styles.headerStatLabel}>Total Dreams</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStatBlock}>
            <Text style={styles.headerStatValue}>{completedItems.length}</Text>
            <Text style={styles.headerStatLabel}>Completed</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStatBlock}>
            <Text style={styles.headerStatValue}>${(totalCost / 1000).toFixed(0)}K</Text>
            <Text style={styles.headerStatLabel}>Est. Cost</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStatBlock}>
            <Text style={styles.headerStatValue}>{Math.round(completionPct * 100)}%</Text>
            <Text style={styles.headerStatLabel}>Done</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['dreams', 'completed', 'category'] as TabType[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'dreams' ? 'Dream List' : tab === 'completed' ? 'Completed' : 'By Category'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Dream List Tab */}
        {activeTab === 'dreams' && (
          <View style={styles.section}>
            {dreamItems.length === 0 ? (
              <Card style={styles.emptyCard} variant="elevated">
                <Text style={styles.emptyEmoji}>✨</Text>
                <Text style={styles.emptyTitle}>No dreams yet!</Text>
                <Text style={styles.emptyText}>Tap + to start your family bucket list.</Text>
              </Card>
            ) : (
              dreamItems.map(renderDreamCard)
            )}
          </View>
        )}

        {/* Completed Tab */}
        {activeTab === 'completed' && (
          <View style={styles.section}>
            {completedItems.length === 0 ? (
              <Card style={styles.emptyCard} variant="elevated">
                <Text style={styles.emptyEmoji}>🏆</Text>
                <Text style={styles.emptyTitle}>Nothing completed yet</Text>
                <Text style={styles.emptyText}>Keep dreaming and doing! Completed items will appear here.</Text>
              </Card>
            ) : (
              completedItems.map((item) => (
                <Card key={item.id} style={styles.completedCard} variant="elevated">
                  <View style={styles.completedRow}>
                    <Text style={styles.completedEmoji}>{item.emoji}</Text>
                    <View style={styles.completedInfo}>
                      <View style={styles.completedCheckRow}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                        <Text style={styles.completedTitle}>{item.title}</Text>
                      </View>
                      {item.completedDate ? (
                        <Text style={styles.completedDate}>
                          Achieved {format(new Date(item.completedDate), 'MMMM d, yyyy')}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {/* By Category Tab */}
        {activeTab === 'category' && (
          <View>
            <View style={[styles.section, { paddingBottom: 4 }]}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => {
                  const cc = CATEGORY_CONFIG[cat];
                  const count = categoryCounts[cat];
                  const isSelected = selectedCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() =>
                        setSelectedCategory(isSelected ? null : cat)
                      }
                      style={[
                        styles.categoryGridBtn,
                        { borderColor: isSelected ? cc.color : colors.border },
                        isSelected && { backgroundColor: cc.color + '15' },
                      ]}
                    >
                      <View style={[styles.categoryGridIcon, { backgroundColor: cc.color + '20' }]}>
                        <Ionicons name={cc.icon as any} size={20} color={cc.color} />
                      </View>
                      <Text style={[styles.categoryGridLabel, isSelected && { color: cc.color }]}>
                        {cc.label}
                      </Text>
                      <Text style={styles.categoryGridCount}>{count}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {selectedCategory
                  ? `${CATEGORY_CONFIG[selectedCategory].label} (${categoryItems.length})`
                  : `All Dreams (${dreamItems.length})`}
              </Text>
              {categoryItems.length === 0 ? (
                <Card style={styles.emptyCard} variant="elevated">
                  <Text style={styles.emptyText}>No items in this category yet.</Text>
                </Card>
              ) : (
                categoryItems.map(renderDreamCard)
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Dream</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.fieldLabel}>Choose an Emoji</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => setModalEmoji(e)}
                  style={[
                    styles.emojiBtn,
                    modalEmoji === e && styles.emojiBtnActive,
                  ]}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={modalTitle}
              onChangeText={setModalTitle}
              placeholder="What's the dream?"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              value={modalDesc}
              onChangeText={setModalDesc}
              placeholder="Tell us more about this dream..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => {
                const cc = CATEGORY_CONFIG[cat];
                const isActive = modalCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setModalCategory(cat)}
                    style={[
                      styles.chip,
                      isActive && { backgroundColor: cc.color + '20', borderColor: cc.color },
                    ]}
                  >
                    <Ionicons name={cc.icon as any} size={14} color={isActive ? cc.color : colors.textMuted} />
                    <Text style={[styles.chipText, isActive && { color: cc.color }]}>{cc.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Target Year (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={modalYear}
              onChangeText={setModalYear}
              placeholder="e.g. 2026"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>Estimated Cost ($)</Text>
            <TextInput
              style={styles.textInput}
              value={modalCost}
              onChangeText={setModalCost}
              placeholder="e.g. 5000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.chipRow}>
              {(['low', 'medium', 'high'] as const).map((p) => {
                const pc = PRIORITY_CONFIG[p];
                return (
                  <Pressable
                    key={p}
                    onPress={() => setModalPriority(p)}
                    style={[
                      styles.chip,
                      modalPriority === p && { backgroundColor: pc.color + '20', borderColor: pc.color },
                    ]}
                  >
                    <Text style={[styles.chipText, modalPriority === p && { color: pc.color }]}>
                      {pc.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Who's Interested?</Text>
            <View style={styles.memberSelectRow}>
              {members.map((m) => {
                const isSelected = modalMembers.includes(m.id);
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => toggleModalMember(m.id)}
                    style={[
                      styles.memberSelectChip,
                      isSelected && { backgroundColor: m.avatarColor + '30', borderColor: m.avatarColor },
                    ]}
                  >
                    <View style={[styles.memberSelectDot, { backgroundColor: m.avatarColor }]} />
                    <Text style={[styles.memberSelectName, isSelected && { color: m.avatarColor }]}>
                      {m.name.split(' ')[0]}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={12} color={m.avatarColor} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.saveBtn} onPress={handleAddItem}>
              <LinearGradient
                colors={['#4A148C', '#7B1FA2']}
                style={styles.saveBtnGradient}
              >
                <Text style={styles.saveBtnEmoji}>{modalEmoji}</Text>
                <Text style={styles.saveBtnText}>Add to Bucket List</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  headerStatBlock: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    textAlign: 'center',
  },
  headerStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#7B1FA2',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: '#7B1FA2',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  emptyCard: {
    padding: 36,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  dreamCard: {
    padding: 16,
    marginBottom: 12,
  },
  dreamCardTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dreamEmoji: {
    fontSize: 36,
  },
  dreamCardInfo: {
    flex: 1,
  },
  dreamTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  dreamDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  dreamBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dreamMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  dreamMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dreamMetaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  avatarChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 10,
    fontWeight: '700',
  },
  dreamCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completeBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  completeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  deleteIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dangerLight,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCard: {
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  completedEmoji: {
    fontSize: 32,
  },
  completedInfo: {
    flex: 1,
  },
  completedCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  completedDate: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  categoryGridBtn: {
    width: '47%',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    ...shadows.sm,
  },
  categoryGridIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryGridLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  categoryGridCount: {
    fontSize: 11,
    color: colors.textMuted,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 60,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBtnActive: {
    borderColor: '#7B1FA2',
    backgroundColor: '#7B1FA220',
  },
  emojiText: {
    fontSize: 18,
  },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  memberSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  memberSelectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  memberSelectName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  saveBtn: {
    marginTop: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveBtnEmoji: {
    fontSize: 18,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
