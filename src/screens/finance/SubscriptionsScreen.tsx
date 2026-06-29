import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, addMonths } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { getDetectedSubscriptions, confirmSubscription } from '../../services/subscriptionDetectionService';
import type { DetectedSubscription } from '../../services/subscriptionDetectionService';
import type { Subscription } from '../../types';

const SUB_CATEGORIES = ['Entertainment', 'Music', 'Software', 'News', 'Fitness', 'Education', 'Gaming', 'Other'];
const SUB_ICONS: Record<string, string> = {
  Entertainment: 'tv-outline',
  Music: 'musical-notes-outline',
  Software: 'code-slash-outline',
  News: 'newspaper-outline',
  Fitness: 'fitness-outline',
  Education: 'school-outline',
  Gaming: 'game-controller-outline',
  Other: 'apps-outline',
};
const SUB_COLORS: Record<string, string> = {
  Entertainment: '#E74C3C',
  Music: '#9B59B6',
  Software: '#2980B9',
  News: '#E67E22',
  Fitness: '#27AE60',
  Education: '#16A085',
  Gaming: '#8E44AD',
  Other: '#7F8C8D',
};
const BILLING_CYCLES = ['monthly', 'quarterly', 'annual'] as const;
const generateId = () => Math.random().toString(36).substring(2, 11);

export function SubscriptionsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { subscriptions, addSubscription, deleteSubscription, updateSubscription } = useFinanceStore();
  const members = useFamilyStore((s) => s.members);

  const [detected, setDetected] = useState<DetectedSubscription[]>([]);
  const [loadingDetected, setLoadingDetected] = useState(true);
  const [dismissedMerchants, setDismissedMerchants] = useState<Set<string>>(new Set());

  useEffect(() => {
    getDetectedSubscriptions()
      .then((res) => setDetected(res.subscriptions))
      .catch(() => setDetected([]))
      .finally(() => setLoadingDetected(false));
  }, []);

  const visibleDetected = detected.filter((d) => !dismissedMerchants.has(d.merchantName));

  const handleConfirmDetected = (d: DetectedSubscription) => {
    confirmSubscription(d);
    setDismissedMerchants((prev) => new Set([...prev, d.merchantName]));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDismissDetected = (merchantName: string) => {
    setDismissedMerchants((prev) => new Set([...prev, merchantName]));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCycle, setNewCycle] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [newCategory, setNewCategory] = useState('Entertainment');
  const [newSharedMembers, setNewSharedMembers] = useState<string[]>([]);

  const active = subscriptions.filter((s) => s.isActive);
  const totalMonthly = active.reduce((sum, s) => sum + (s.billingCycle === 'annual' ? s.amount / 12 : s.billingCycle === 'quarterly' ? s.amount / 3 : s.amount), 0);
  const totalAnnual = totalMonthly * 12;

  const grouped = active.reduce((acc, sub) => {
    const cat = sub.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(sub);
    return acc;
  }, {} as Record<string, typeof active>);

  const toggleMember = (id: string) => {
    setNewSharedMembers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleAdd = () => {
    const amount = parseFloat(newAmount);
    if (!newName.trim() || isNaN(amount) || amount <= 0) return;
    const nextBillingDate = addMonths(new Date(), newCycle === 'monthly' ? 1 : newCycle === 'quarterly' ? 3 : 12);
    const sub: Subscription = {
      id: generateId(),
      familyId: 'demo-family',
      name: newName.trim(),
      amount,
      billingCycle: newCycle,
      nextBillingDate: nextBillingDate.toISOString(),
      category: newCategory,
      isActive: true,
      sharedMembers: newSharedMembers,
      icon: SUB_ICONS[newCategory] || 'apps-outline',
      color: SUB_COLORS[newCategory] || colors.primary,
    };
    addSubscription(sub);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewName(''); setNewAmount(''); setNewCycle('monthly'); setNewCategory('Entertainment'); setNewSharedMembers([]);
    setShowModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Subscription', `Permanently remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteSubscription(id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#8E44AD', '#9B59B6']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Subscriptions</Text>
          <Pressable onPress={() => setShowModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>${totalMonthly.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Per Month</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>${totalAnnual.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Per Year</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{active.length}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>

        {(loadingDetected || visibleDetected.length > 0) && (
          <View style={styles.detectedSection}>
            <View style={styles.detectedHeader}>
              <View style={styles.detectedTitleRow}>
                <Ionicons name="flash" size={16} color="#8B5CF6" />
                <Text style={styles.detectedTitle}>Smart Detection</Text>
                {visibleDetected.length > 0 && (
                  <View style={styles.detectedBadge}>
                    <Text style={styles.detectedBadgeText}>{visibleDetected.length}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.detectedSubtitle}>Recurring charges found in your transactions</Text>
            </View>

            {loadingDetected ? (
              <View style={styles.detectedLoading}>
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text style={styles.detectedLoadingText}>Analyzing transactions…</Text>
              </View>
            ) : visibleDetected.length === 0 ? (
              <View style={styles.detectedEmpty}>
                <Ionicons name="checkmark-circle" size={32} color="#27AE60" />
                <Text style={styles.detectedEmptyText}>All caught up!</Text>
              </View>
            ) : (
              visibleDetected.map((d) => (
                <View key={d.merchantName} style={styles.detectedCard}>
                  <View style={styles.detectedCardLeft}>
                    <View style={styles.detectedIconWrap}>
                      <Ionicons name="repeat" size={20} color="#8B5CF6" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.detectedMerchant}>{d.merchantName}</Text>
                      <Text style={styles.detectedMeta}>{d.occurrences} charges found · next {d.nextExpectedDate}</Text>
                      <View style={styles.detectedFreqRow}>
                        <View style={styles.detectedFreqBadge}>
                          <Text style={styles.detectedFreqText}>{d.frequency}</Text>
                        </View>
                        <Text style={styles.detectedCategory}>{d.category}</Text>
                      </View>
                    </View>
                    <View style={styles.detectedRight}>
                      <Text style={styles.detectedAmount}>${d.amount.toFixed(2)}</Text>
                      <Text style={styles.detectedAmountLabel}>/{d.frequency === 'monthly' ? 'mo' : d.frequency === 'weekly' ? 'wk' : 'qtr'}</Text>
                    </View>
                  </View>
                  <View style={styles.detectedActions}>
                    <Pressable onPress={() => handleDismissDetected(d.merchantName)} style={styles.detectedDismiss}>
                      <Ionicons name="close" size={18} color={colors.textMuted} />
                    </Pressable>
                    <Pressable onPress={() => handleConfirmDetected(d)} style={styles.detectedAddBtn}>
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={styles.detectedAddText}>Add</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={styles.aiInsight}>
          <Ionicons name="bulb" size={18} color={colors.secondary} />
          <Text style={styles.aiInsightText}>
            You're spending ${totalAnnual.toFixed(0)}/year on subscriptions. Consider if you use all of them — canceling 2 unused ones could save ~$600/year.
          </Text>
        </View>

        {Object.entries(grouped).map(([category, subs]) => (
          <View key={category}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {subs.map((sub) => {
              const monthlyAmount = sub.billingCycle === 'annual' ? sub.amount / 12 : sub.billingCycle === 'quarterly' ? sub.amount / 3 : sub.amount;
              const subscribedMembers = members.filter((m) => sub.sharedMembers.includes(m.id));
              return (
                <Card key={sub.id} style={styles.subCard} variant="elevated">
                  <View style={styles.subRow}>
                    <View style={[styles.subIcon, { backgroundColor: (sub.color || colors.primary) + '22' }]}>
                      <Ionicons name={(sub.icon || 'apps-outline') as any} size={24} color={sub.color || colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <View style={styles.subHeader}>
                        <Text style={styles.subName}>{sub.name}</Text>
                        <View style={styles.subPrice}>
                          <Text style={styles.subAmount}>${sub.amount}</Text>
                          <Text style={styles.subCycle}>/{sub.billingCycle === 'monthly' ? 'mo' : sub.billingCycle === 'annual' ? 'yr' : 'qtr'}</Text>
                        </View>
                      </View>
                      {sub.billingCycle !== 'monthly' && (
                        <Text style={styles.subMonthly}>${monthlyAmount.toFixed(2)}/month equivalent</Text>
                      )}
                      <Text style={styles.subNextBilling}>
                        Next billing: {format(new Date(sub.nextBillingDate), 'MMM d, yyyy')}
                      </Text>
                      {subscribedMembers.length > 0 && (
                        <View style={styles.subMembers}>
                          {subscribedMembers.slice(0, 4).map((m, i) => (
                            <Avatar key={m.id} name={m.name} color={m.avatarColor} size={24} style={{ marginLeft: i > 0 ? -6 : 0 }} />
                          ))}
                          <Text style={styles.subMembersText}>{subscribedMembers.length} members</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.subActions}>
                    <Pressable
                      onPress={() => { updateSubscription(sub.id, { isActive: false }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={styles.cancelBtn}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={colors.warning} />
                      <Text style={styles.cancelText}>Pause</Text>
                    </Pressable>
                    <Badge label={sub.billingCycle} variant="primary" size="sm" />
                    <Pressable onPress={() => handleDelete(sub.id, sub.name)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        ))}

        {active.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No active subscriptions</Text>
            <Text style={styles.emptyDesc}>Tap + to track your family subscriptions</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Subscription</Text>

          <Text style={styles.modalLabel}>Name *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Netflix, Spotify..." value={newName} onChangeText={setNewName} placeholderTextColor={colors.textMuted} autoFocus />

          <Text style={styles.modalLabel}>Amount *</Text>
          <TextInput style={styles.modalInput} placeholder="0.00" value={newAmount} onChangeText={setNewAmount} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Billing Cycle</Text>
          <View style={styles.cycleRow}>
            {BILLING_CYCLES.map((c) => (
              <Pressable key={c} onPress={() => setNewCycle(c)} style={[styles.cycleChip, newCycle === c && styles.cycleChipActive]}>
                <Text style={[styles.cycleChipText, newCycle === c && styles.cycleChipTextActive]}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Category</Text>
          <View style={styles.catGrid}>
            {SUB_CATEGORIES.map((cat) => (
              <Pressable key={cat} onPress={() => setNewCategory(cat)} style={[styles.catGridItem, newCategory === cat && { backgroundColor: (SUB_COLORS[cat] || colors.primary) + '20', borderColor: SUB_COLORS[cat] || colors.primary }]}>
                <Ionicons name={(SUB_ICONS[cat] || 'apps-outline') as any} size={20} color={newCategory === cat ? (SUB_COLORS[cat] || colors.primary) : colors.textSecondary} />
                <Text style={[styles.catGridText, newCategory === cat && { color: SUB_COLORS[cat] || colors.primary }]}>{cat}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Shared With</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {members.map((m) => (
              <Pressable key={m.id} onPress={() => toggleMember(m.id)} style={[styles.memberChip, newSharedMembers.includes(m.id) && styles.memberChipActive]}>
                <Avatar name={m.name} color={m.avatarColor} size={30} />
                <Text style={styles.memberChipName}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Button title="Add Subscription" onPress={handleAdd} fullWidth size="lg" disabled={!newName.trim() || !newAmount.trim()} />
          <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  summaryCard: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 3 },
  summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  content: { padding: 16 },
  aiInsight: { flexDirection: 'row', gap: 10, backgroundColor: '#FEF3E2', borderRadius: 12, padding: 14, marginBottom: 20, alignItems: 'flex-start' },
  aiInsightText: { flex: 1, fontSize: 13, color: '#8B5E00', lineHeight: 20 },
  categoryTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  subCard: { marginBottom: 10, borderRadius: 16 },
  subRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  subIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  subName: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 },
  subPrice: { flexDirection: 'row', alignItems: 'baseline' },
  subAmount: { fontSize: 18, fontWeight: '800', color: colors.text },
  subCycle: { fontSize: 13, color: colors.textSecondary },
  subMonthly: { fontSize: 12, color: colors.textSecondary, marginBottom: 3 },
  subNextBilling: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  subMembers: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subMembersText: { fontSize: 11, color: colors.textSecondary },
  subActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cancelText: { fontSize: 13, color: colors.warning, fontWeight: '600' },
  deleteBtn: { padding: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  cycleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  cycleChip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center' },
  cycleChipActive: { backgroundColor: '#9B59B620', borderColor: '#9B59B6' },
  cycleChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  cycleChipTextActive: { color: '#9B59B6' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catGridItem: { width: '46%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  catGridText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  memberChip: { alignItems: 'center', marginRight: 12, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', gap: 4 },
  memberChipActive: { borderColor: '#9B59B6', backgroundColor: '#F3E5F5' },
  memberChipName: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },

  detectedSection: { backgroundColor: '#F5F3FF', borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#DDD6FE' },
  detectedHeader: { marginBottom: 12 },
  detectedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  detectedTitle: { fontSize: 15, fontWeight: '800', color: '#5B21B6' },
  detectedBadge: { backgroundColor: '#8B5CF6', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  detectedBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  detectedSubtitle: { fontSize: 12, color: '#6D28D9' },
  detectedLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  detectedLoadingText: { fontSize: 13, color: '#6D28D9' },
  detectedEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  detectedEmptyText: { fontSize: 14, fontWeight: '600', color: '#27AE60' },
  detectedCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, ...shadows.sm },
  detectedCardLeft: { flexDirection: 'row', alignItems: 'flex-start' },
  detectedIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  detectedMerchant: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  detectedMeta: { fontSize: 11, color: colors.textMuted, marginBottom: 5 },
  detectedFreqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detectedFreqBadge: { backgroundColor: '#EDE9FE', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 },
  detectedFreqText: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  detectedCategory: { fontSize: 11, color: colors.textSecondary },
  detectedRight: { alignItems: 'flex-end', marginLeft: 8 },
  detectedAmount: { fontSize: 17, fontWeight: '800', color: colors.text },
  detectedAmountLabel: { fontSize: 11, color: colors.textSecondary },
  detectedActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 10 },
  detectedDismiss: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  detectedAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8B5CF6', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14 },
  detectedAddText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
