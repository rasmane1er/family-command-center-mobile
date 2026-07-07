import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Button } from '../../components/common/Button';
import { useAutomationStore } from '../../store/useAutomationStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { TimeBlockCategory } from '../../types';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const CATEGORY_CONFIG: Record<string, { color: string; icon: string }> = {
  work: { color: '#2980B9', icon: 'briefcase' },
  family: { color: '#E74C3C', icon: 'heart' },
  'self-care': { color: '#8E44AD', icon: 'flower' },
  chores: { color: '#27AE60', icon: 'home' },
  sleep: { color: '#1A252F', icon: 'moon' },
  leisure: { color: '#F5A623', icon: 'game-controller' },
  school: { color: '#16A085', icon: 'school' },
  fitness: { color: '#E67E22', icon: 'fitness' },
};

const FAMILY_IDEAL = [
  { category: 'work', hoursPerWeek: 40, label: 'Work/School' },
  { category: 'family', hoursPerWeek: 21, label: 'Family Time' },
  { category: 'sleep', hoursPerWeek: 56, label: 'Sleep' },
  { category: 'self-care', hoursPerWeek: 7, label: 'Self-Care' },
  { category: 'fitness', hoursPerWeek: 5, label: 'Fitness' },
  { category: 'chores', hoursPerWeek: 5, label: 'Household' },
];

function blockHours(b: { startTime: string; endTime: string }): number {
  const start = parseInt(b.startTime.split(':')[0], 10);
  const end = parseInt(b.endTime.split(':')[0], 10);
  return Math.max(0, end - start);
}

export function TimeEconomyScreen({ navigation }: any) {
  const { t } = useTranslation('ops');
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'insights'>('overview');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TimeBlockCategory>('family');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('10:00');
  const [newMemberIdModal, setNewMemberIdModal] = useState('');
  const { timeBlocks, addTimeBlock } = useAutomationStore();
  const members = useFamilyStore((s) => s.members);
  const familyId = useFamilyStore((s) => s.family?.id) ?? useAuthStore.getState().familyId ?? '';

  const activeMemberId = selectedMember ?? members[0]?.id ?? '';

  // Real family-wide hours per category, from actual scheduled blocks —
  // used both for the allocation bars below and for the insights tab.
  const familyHoursByCategory: Record<string, number> = {};
  timeBlocks.forEach((b) => {
    familyHoursByCategory[b.category] = (familyHoursByCategory[b.category] ?? 0) + blockHours(b);
  });

  // Real insights, computed from actual per-member and family-wide hours —
  // replaces a previous hardcoded list that named invented members
  // ("Marcus is spending only 14 hrs/week...") regardless of who's
  // actually in this family or what their real schedule looks like.
  const timeInsights: { icon: string; color: string; text: string; label: string }[] = [];

  FAMILY_IDEAL.forEach((ideal) => {
    const actual = familyHoursByCategory[ideal.category] ?? 0;
    const gapPct = ideal.hoursPerWeek > 0 ? ((ideal.hoursPerWeek - actual) / ideal.hoursPerWeek) * 100 : 0;
    if (gapPct >= 30) {
      timeInsights.push({
        icon: 'trending-down', color: '#E74C3C', label: 'Alert',
        text: `Family ${ideal.label.toLowerCase()} is at ${actual}h this week, well below the ${ideal.hoursPerWeek}h target.`,
      });
    } else if (actual >= ideal.hoursPerWeek) {
      timeInsights.push({
        icon: 'trending-up', color: '#27AE60', label: 'Win',
        text: `Family ${ideal.label.toLowerCase()} is at ${actual}h this week — meeting or beating the ${ideal.hoursPerWeek}h target!`,
      });
    }
  });

  members.forEach((m) => {
    const mBlocks = timeBlocks.filter((b) => b.memberId === m.id);
    const familyTime = mBlocks.filter((b) => b.category === 'family').reduce((s, b) => s + blockHours(b), 0);
    const idealFamily = FAMILY_IDEAL.find((f) => f.category === 'family')?.hoursPerWeek ?? 0;
    if (mBlocks.length > 0 && idealFamily > 0 && familyTime < idealFamily * 0.5) {
      timeInsights.push({
        icon: 'alert-circle', color: '#F5A623', label: 'Opportunity',
        text: `${m.name} has only ${familyTime}h of scheduled family time — consider adding more.`,
      });
    }
  });

  const handleAddBlock = () => {
    if (!newTitle.trim()) { Alert.alert(t('common.validationTitle'), t('common.validationMsg')); return; }
    const memberId = newMemberIdModal || members[0]?.id || '';
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTimeBlock({
      familyId,
      memberId,
      category: newCategory,
      title: newTitle.trim(),
      startTime: newStart,
      endTime: newEnd,
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
      color: CATEGORY_CONFIG[newCategory]?.color ?? colors.primary,
    });
    setShowModal(false);
    setNewTitle(''); setNewCategory('family'); setNewStart('09:00'); setNewEnd('10:00');
  };
  const memberBlocks = timeBlocks.filter((b) => b.memberId === activeMemberId);

  const categoryTotals = memberBlocks.reduce((acc, b) => {
    const start = parseInt(b.startTime.split(':')[0]);
    const end = parseInt(b.endTime.split(':')[0]);
    acc[b.category] = (acc[b.category] ?? 0) + (end - start);
    return acc;
  }, {} as Record<string, number>);

  const totalHours = Object.values(categoryTotals).reduce((s, v) => s + v, 0);

  const screenHeader = (
    <LinearGradient colors={['#004D40', '#00796B']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('timeEconomy.title')}</Text>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNewMemberIdModal(activeMemberId); setShowModal(true); }} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.timeCircle}>
        <Text style={styles.timeVal}>168</Text>
        <Text style={styles.timeLabel}>Hours per week</Text>
        <Text style={styles.timeSub}>How is your family spending them?</Text>
      </View>
    
    <View style={styles.tabs}>
            {(['overview', 'schedule', 'insights'] as const).map((tab) => (
              <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
</LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#004D40', '#00796B']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('timeEconomy.title')}</Text>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>168h</Text>
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
        {activeTab === 'overview' && (
          <>
            <Text style={styles.sectionTitle}>Family Time Allocation (Actual vs. Target)</Text>
            {FAMILY_IDEAL.map((item) => {
              const cfg = CATEGORY_CONFIG[item.category];
              const actual = familyHoursByCategory[item.category] ?? 0;
              return (
                <View key={item.category} style={styles.allocRow}>
                  <View style={[styles.allocIcon, { backgroundColor: cfg.color + '15' }]}>
                    <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                  </View>
                  <Text style={styles.allocLabel}>{item.label}</Text>
                  <View style={styles.allocBar}>
                    <ProgressBar progress={Math.min(1, actual / item.hoursPerWeek)} color={cfg.color} height={8} />
                  </View>
                  <Text style={styles.allocHours}>{actual}h / {item.hoursPerWeek}h</Text>
                </View>
              );
            })}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Member Breakdown</Text>
            {members.map((m) => {
              const mBlocks = timeBlocks.filter((b) => b.memberId === m.id);
              const mTotal = mBlocks.reduce((s, b) => s + blockHours(b), 0);
              return (
                <Card key={m.id} style={styles.memberCard} variant="elevated">
                  <View style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { backgroundColor: m.avatarColor + '20' }]}>
                      <Text style={[styles.memberInitial, { color: m.avatarColor }]}>{m.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      <Text style={styles.memberRole}>{m.role} • {mBlocks.length} scheduled blocks</Text>
                    </View>
                    <Text style={styles.memberHours}>{mTotal}h today</Text>
                  </View>
                  <View style={styles.categoryBubbles}>
                    {Object.entries(CATEGORY_CONFIG).slice(0, 5).map(([cat, cfg]) => (
                      <View key={cat} style={[styles.categoryBubble, { backgroundColor: cfg.color + '15' }]}>
                        <Ionicons name={cfg.icon as any} size={10} color={cfg.color} />
                      </View>
                    ))}
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {activeTab === 'schedule' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setSelectedMember(m.id)}
                  style={[styles.memberTab, activeMemberId === m.id && { borderBottomColor: m.avatarColor, borderBottomWidth: 2.5 }]}
                >
                  <Text style={[styles.memberTabText, activeMemberId === m.id && { color: m.avatarColor }]}>{m.name.split(' ')[0]}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {memberBlocks.map((block) => {
              const cfg = CATEGORY_CONFIG[block.category] ?? { color: '#95A5A6', icon: 'time' };
              return (
                <Card key={block.id} style={styles.blockCard} variant="elevated">
                  <View style={[styles.blockColorBar, { backgroundColor: cfg.color }]} />
                  <View style={styles.blockContent}>
                    <View style={[styles.blockIcon, { backgroundColor: cfg.color + '15' }]}>
                      <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.blockTitle}>{block.title}</Text>
                      <Text style={styles.blockTime}>{block.startTime} – {block.endTime}</Text>
                    </View>
                    {block.isRecurring && (
                      <View style={styles.recurBadge}>
                        <Ionicons name="repeat" size={12} color={cfg.color} />
                        <Text style={[styles.recurText, { color: cfg.color }]}>Daily</Text>
                      </View>
                    )}
                  </View>
                </Card>
              );
            })}

            {memberBlocks.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={60} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No blocks scheduled</Text>
                <Text style={styles.emptyDesc}>Add time blocks to track how this member spends their day.</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'insights' && timeInsights.length === 0 && (
          <Text style={styles.emptyInsightsText}>
            Schedule a few time blocks to see personalized insights here.
          </Text>
        )}

        {activeTab === 'insights' && timeInsights.map((ins, i) => (
          <Card key={i} style={styles.insightCard} variant="elevated">
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, { backgroundColor: ins.color + '15' }]}>
                <Ionicons name={ins.icon as any} size={20} color={ins.color} />
              </View>
              <Text style={[styles.insightLabel, { color: ins.color }]}>{ins.label}</Text>
            </View>
            <Text style={styles.insightText}>{ins.text}</Text>
          </Card>
        ))}
      </ScrollView>
        )}
      </CollapsibleHeader>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Time Block</Text>

          <Text style={styles.modalLabel}>Member</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {members.map((m) => (
              <Pressable key={m.id} onPress={() => setNewMemberIdModal(m.id)} style={[styles.memberChip, newMemberIdModal === m.id && { borderColor: m.avatarColor, backgroundColor: m.avatarColor + '15' }]}>
                <View style={[styles.memberDot, { backgroundColor: m.avatarColor }]} />
                <Text style={[styles.memberChipText, newMemberIdModal === m.id && { color: m.avatarColor }]}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Category</Text>
          <View style={styles.catGrid}>
            {(Object.keys(CATEGORY_CONFIG) as TimeBlockCategory[]).map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              return (
                <Pressable key={cat} onPress={() => setNewCategory(cat)} style={[styles.catChip, newCategory === cat && { backgroundColor: cfg.color, borderColor: cfg.color }]}>
                  <Ionicons name={cfg.icon as any} size={13} color={newCategory === cat ? '#fff' : cfg.color} />
                  <Text style={[styles.catChipText, newCategory === cat && { color: '#fff' }]}>{cat}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.modalLabel}>Title</Text>
          <TextInput style={styles.modalInput} value={newTitle} onChangeText={setNewTitle} placeholder="What activity is this?" placeholderTextColor={colors.textMuted} />

          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>Start Time</Text>
              <TextInput style={styles.modalInput} value={newStart} onChangeText={setNewStart} placeholder="09:00" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={{ width: 16 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>End Time</Text>
              <TextInput style={styles.modalInput} value={newEnd} onChangeText={setNewEnd} placeholder="10:00" placeholderTextColor={colors.textMuted} />
            </View>
          </View>

          <Button title="Add Block" onPress={handleAddBlock} />
          <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  timeCircle: { alignItems: 'center' },
  timeVal: { fontSize: 56, fontWeight: '900', color: '#fff', lineHeight: 60 },
  timeLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  timeSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#00796B' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#00796B' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  emptyInsightsText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 24, lineHeight: 19 },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  allocIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  allocLabel: { width: 80, fontSize: 12, fontWeight: '600', color: colors.text },
  allocBar: { flex: 1 },
  allocHours: { width: 30, fontSize: 12, fontWeight: '700', color: colors.textSecondary, textAlign: 'right' },
  memberCard: { marginBottom: 10, borderRadius: 14 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontSize: 16, fontWeight: '800' },
  memberName: { fontSize: 14, fontWeight: '700', color: colors.text },
  memberRole: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  memberHours: { fontSize: 16, fontWeight: '800', color: colors.primary },
  categoryBubbles: { flexDirection: 'row', gap: 6 },
  categoryBubble: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  memberTab: { paddingVertical: 8, paddingHorizontal: 14, marginRight: 4 },
  memberTabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  blockCard: { flexDirection: 'row', marginBottom: 8, borderRadius: 12, overflow: 'hidden', padding: 0 },
  blockColorBar: { width: 4 },
  blockContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
  blockIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  blockTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  blockTime: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  recurBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.background, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 7 },
  recurText: { fontSize: 10, fontWeight: '700' },
  insightCard: { marginBottom: 10, borderRadius: 14 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  insightIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  insightLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  insightText: { fontSize: 13, color: colors.text, lineHeight: 19 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  catChipText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, marginRight: 8 },
  memberChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  memberDot: { width: 8, height: 8, borderRadius: 4 },
  timeRow: { flexDirection: 'row' },
});
