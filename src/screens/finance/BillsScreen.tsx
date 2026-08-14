import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, Switch, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getDetectedBills } from '../../services/autoFillService';
import type { DetectedBill } from '../../services/autoFillService';
import type { Bill } from '../../types';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { usePlaidAutoData } from '../../hooks/usePlaidAutoData';
import { useDetectionFilter } from '../../hooks/useDetectionFilter';
import { normalizeMerchantKey } from '../../utils/merchantKey';

const statusBadge = { upcoming: 'neutral', due_soon: 'warning', overdue: 'danger', paid: 'success' } as const;
const statusLabels = { upcoming: 'Upcoming', due_soon: 'Due Soon', overdue: 'OVERDUE', paid: 'Paid' };

const CATEGORIES = ['Housing', 'Utilities', 'Insurance', 'Internet', 'Phone', 'Health', 'Education', 'Subscriptions', 'Other'];
const CATEGORY_ICONS: Record<string, string> = {
  Housing: 'home', Utilities: 'flash', Insurance: 'shield-checkmark', Internet: 'wifi',
  Phone: 'phone-portrait', Health: 'medical', Education: 'school', Subscriptions: 'reload', Other: 'receipt',
};

import { generateId } from '../../utils/generateId';

export function BillsScreen({ navigation, route }: any) {
  const { t } = useTranslation('finance');
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [filter, setFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const { bills, markBillPaid, deleteBill, addBill, updateBill, fetchBills } = useFinanceStore();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    fetchBills().finally(() => setRefreshing(false));
  };

  // Detected bills state
  const [detectedBills, setDetectedBills] = useState<DetectedBill[]>([]);
  const [detectedLoading, setDetectedLoading] = useState(false);
  const [detectedExpanded, setDetectedExpanded] = useState(true);

  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  // Modal form state
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDays, setNewDueDays] = useState('14');
  const [newCategory, setNewCategory] = useState('Utilities');
  const [newIsAutoPay, setNewIsAutoPay] = useState(false);

  const totalDue = bills.filter((b) => b.status !== 'paid').reduce((sum, b) => sum + b.amount, 0);
  const overdueBills = bills.filter((b) => b.status === 'overdue');
  const filtered = filter === 'All' ? bills : bills.filter((b) => b.status === filter.toLowerCase().replace(' ', '_'));

  usePlaidAutoData(() => {
    setDetectedLoading(true);
    getDetectedBills()
      .then((res) => setDetectedBills(res.bills))
      .catch(() => {/* silent */ })
      .finally(() => setDetectedLoading(false));
  });

  // Reactive against the live `bills` list, so confirming a suggestion
  // (which creates a real Bill via addBill) hides it here on the very next
  // render — no explicit dismiss needed. This screen previously had no
  // dismiss/dedupe mechanism at all.
  const existingBillKeys = bills.flatMap((b) =>
    b.sourceMerchantKey ? [b.sourceMerchantKey, normalizeMerchantKey(b.name)] : [normalizeMerchantKey(b.name)]
  );
  const { visible: visibleDetectedBills, dismiss: dismissDetectedBill } = useDetectionFilter(
    'bill',
    detectedBills,
    (d) => d.merchantKey,
    existingBillKeys,
  );

  const handleAddBill = () => {
    const amount = parseFloat(newAmount);
    if (!newName.trim() || isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Input', 'Please enter a bill name and valid amount.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editingBill) {
      const dueDate = new Date(Date.now() + parseInt(newDueDays || '14') * 86400000).toISOString();
      updateBill(editingBill.id, { name: newName.trim(), amount, dueDate, category: newCategory, isAutoPay: newIsAutoPay, isRecurring: editingBill.isRecurring });
      setEditingBill(null);
      resetModal();
      setShowAddModal(false);
      return;
    }
    const dueDate = new Date(Date.now() + parseInt(newDueDays || '14') * 86400000).toISOString();
    const daysUntil = parseInt(newDueDays || '14');
    const status: Bill['status'] = daysUntil < 0 ? 'overdue' : daysUntil <= 5 ? 'due_soon' : 'upcoming';
    const newBill: Bill = {
      id: generateId(),
      familyId: useAuthStore.getState().familyId ?? '',
      name: newName.trim(),
      amount,
      dueDate,
      category: newCategory,
      status,
      isAutoPay: newIsAutoPay,
      isRecurring: true,
      recurrence: 'monthly',
      icon: CATEGORY_ICONS[newCategory] ?? 'receipt',
    };
    addBill(newBill);
    resetModal();
    setShowAddModal(false);
  };

  const resetModal = () => {
    setNewName('');
    setNewAmount('');
    setNewDueDays('14');
    setNewCategory('Utilities');
    setNewIsAutoPay(false);
  };

  const handleAddDetectedBill = (detected: DetectedBill) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const dueDate = new Date(detected.nextDueDate).toISOString();
    const daysUntil = differenceInDays(new Date(detected.nextDueDate), new Date());
    const status: Bill['status'] = daysUntil < 0 ? 'overdue' : daysUntil <= 5 ? 'due_soon' : 'upcoming';
    const newBill: Bill = {
      id: generateId(),
      familyId: useAuthStore.getState().familyId ?? '',
      name: detected.merchantName,
      amount: detected.amount,
      dueDate,
      category: detected.category,
      status,
      isAutoPay: false,
      isRecurring: true,
      recurrence: 'monthly',
      icon: CATEGORY_ICONS[detected.category] ?? 'receipt',
      source: 'plaid_detected',
      sourceMerchantKey: detected.merchantKey,
    };
    addBill(newBill);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const prefillFromDetected = (detected: DetectedBill) => {
    setNewName(detected.merchantName);
    setNewAmount(String(detected.amount));
    setNewCategory(detected.category);
    const daysUntil = differenceInDays(new Date(detected.nextDueDate), new Date());
    setNewDueDays(String(Math.max(0, daysUntil)));
  };

  const handleEditBill = (bill: Bill) => {
    const daysUntil = differenceInDays(new Date(bill.dueDate), new Date());
    setEditingBill(bill);
    setNewName(bill.name);
    setNewAmount(String(bill.amount));
    setNewDueDays(String(Math.max(0, daysUntil)));
    setNewCategory(bill.category);
    setNewIsAutoPay(bill.isAutoPay);
    setShowAddModal(true);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(`Delete "${name}"?`, 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); deleteBill(id); } },
    ]);
  };

  const s = makeStyles(colors);

  const screenHeader = (
      <PremiumHeader
        title={t('bills.title')}
        onBack={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()}
        colors={['#0F2952', '#1E4A8A']}
        rightAction={
          <Pressable accessibilityRole="button" onPress={() => setShowAddModal(true)} style={s.addBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        }
      >
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryValue}>${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            <Text style={s.summaryLabel}>Total Due</Text>
          </View>
          <View style={[s.summaryCard, overdueBills.length > 0 && s.summaryCardDanger]}>
            <Text style={[s.summaryValue, overdueBills.length > 0 && { color: colors.danger }]}>{overdueBills.length}</Text>
            <Text style={s.summaryLabel}>Overdue</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryValue}>{bills.filter((b) => b.isAutoPay).length}</Text>
            <Text style={s.summaryLabel}>Auto-Pay</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
          {['All', 'Overdue', 'Due Soon', 'Upcoming', 'Paid'].map((f) => (
            <Pressable accessibilityRole="button" key={f} onPress={() => setFilter(f)} style={[s.filterChip, filter === f && s.filterChipActive]}>
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </PremiumHeader>
  );
  const screenCompact = (
    <LinearGradient
      colors={['#0F2952', '#1E4A8A']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>Bills</Text>
      <View />
    </LinearGradient>
  );

  return (
    <View style={s.container}>


      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView
            contentContainerStyle={[s.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onScroll={onScroll} onScrollEndDrag={onScrollEndDrag} onMomentumScrollEnd={onMomentumScrollEnd} scrollEventThrottle={scrollEventThrottle}>
        {/* Smart Detection Banner */}
        {(detectedLoading || visibleDetectedBills.length > 0) && (
          <View style={s.smartBanner}>
            <Pressable accessibilityRole="button" style={s.smartBannerHeader} onPress={() => setDetectedExpanded((v) => !v)}>
              <View style={s.smartBannerLeft}>
                <Ionicons name="sparkles" size={16} color="#4A90D9" />
                <Text style={s.smartBannerTitle}>Smart Detection</Text>
                {!detectedLoading && (
                  <View style={s.countBadge}>
                    <Text style={s.countBadgeText}>{visibleDetectedBills.length}</Text>
                  </View>
                )}
              </View>
              {detectedLoading
                ? <ActivityIndicator size="small" color="#4A90D9" />
                : <Ionicons name={detectedExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#4A90D9" />}
            </Pressable>
            {detectedExpanded && !detectedLoading && visibleDetectedBills.map((d) => (
              <View key={d.merchantKey} style={s.detectedRow}>
                <View style={s.detectedIcon}>
                  <Ionicons name={(CATEGORY_ICONS[d.category] ?? 'receipt') as any} size={18} color="#4A90D9" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.detectedName}>{d.merchantName}</Text>
                  <Text style={s.detectedMeta}>
                    Due {d.nextDueDate} · {d.category}
                  </Text>
                </View>
                <Text style={s.detectedAmount}>${d.amount.toFixed(2)}</Text>
                <Pressable accessibilityRole="button"
                  style={s.dismissDetectedBtn}
                  onPress={() => { dismissDetectedBill(d.merchantKey); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </Pressable>
                <Pressable accessibilityRole="button" style={s.addDetectedBtn} onPress={() => handleAddDetectedBill(d)}>
                  <Ionicons name="add" size={14} color="#fff" />
                  <Text style={s.addDetectedBtnText}>Add</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {overdueBills.length > 0 && filter === 'All' && (
          <View style={s.overdueAlert}>
            <Ionicons name="warning" size={20} color={colors.danger} />
            <Text style={s.overdueAlertText}>
              {overdueBills.length} bill{overdueBills.length > 1 ? 's' : ''} overdue! Pay now to avoid late fees.
            </Text>
          </View>
        )}

        {filtered.map((bill) => {
          const daysUntil = differenceInDays(new Date(bill.dueDate), new Date());
          return (
            <Card key={bill.id} style={s.billCard} variant="elevated">
              <View style={s.billRow}>
                <View style={[s.billIcon, {
                  backgroundColor: bill.status === 'overdue' ? colors.dangerLight
                    : bill.status === 'paid' ? colors.successLight : '#E8EEF9',
                }]}>
                  <Ionicons
                    name={(bill.icon || 'receipt-outline') as any}
                    size={22}
                    color={bill.status === 'overdue' ? colors.danger : bill.status === 'paid' ? colors.success : colors.primary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={s.billHeader}>
                    <Text style={s.billName}>{bill.name}</Text>
                    <Text style={s.billAmount}>${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                  </View>
                  <View style={s.billMeta}>
                    <Badge label={statusLabels[bill.status as keyof typeof statusLabels]} variant={statusBadge[bill.status as keyof typeof statusBadge]} size="sm" dot />
                    {bill.isAutoPay && <Badge label="Auto-Pay" variant="success" size="sm" />}
                  </View>
                  <Text style={[s.billDue, bill.status === 'overdue' && { color: colors.danger }]}>
                    {bill.status === 'paid' ? 'Paid' :
                      daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                        daysUntil === 0 ? 'Due TODAY!' :
                          daysUntil === 1 ? 'Due tomorrow' :
                            `Due ${format(new Date(bill.dueDate), 'MMM d, yyyy')}`}
                  </Text>
                </View>
              </View>
              {bill.status !== 'paid' && (
                <View style={s.billActions}>
                  <Button title="Mark Paid" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); markBillPaid(bill.id); }} variant="success" size="sm" />
                  <Pressable accessibilityRole="button" onPress={() => handleEditBill(bill)} style={s.editBtn}>
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => handleDelete(bill.id, bill.name)} style={s.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="receipt-outline" size={56} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No bills here</Text>
            <Text style={s.emptyDesc}>Tap + to add a new bill.</Text>
          </View>
        )}
          </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add Bill Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <ScrollView style={s.modalSheet} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingBill ? 'Edit Bill' : 'Add Bill'}</Text>
              <Pressable accessibilityRole="button" onPress={() => { resetModal(); setEditingBill(null); setShowAddModal(false); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Import from detected section */}
            {visibleDetectedBills.length > 0 && (
              <View style={s.importSection}>
                <Text style={s.importSectionTitle}>
                  <Ionicons name="sparkles" size={13} color="#4A90D9" /> Import from detected
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {visibleDetectedBills.map((d) => (
                    <Pressable accessibilityRole="button" key={d.merchantKey} style={s.importChip} onPress={() => prefillFromDetected(d)}>
                      <Text style={s.importChipName}>{d.merchantName}</Text>
                      <Text style={s.importChipAmount}>${d.amount.toFixed(2)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={s.modalLabel}>Bill Name</Text>
            <TextInput accessibilityLabel="e.g. Electric Bill"
              style={s.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Electric Bill"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={s.modalLabel}>Amount ($)</Text>
            <TextInput accessibilityLabel="0.00"
              style={s.modalInput}
              value={newAmount}
              onChangeText={setNewAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={s.modalLabel}>Due in (days)</Text>
            <TextInput accessibilityLabel="14"
              style={s.modalInput}
              value={newDueDays}
              onChangeText={setNewDueDays}
              placeholder="14"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={s.modalLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CATEGORIES.map((c) => (
                <Pressable accessibilityRole="button"
                  key={c}
                  onPress={() => setNewCategory(c)}
                  style={[s.catChip, newCategory === c && s.catChipActive]}
                >
                  <Ionicons name={(CATEGORY_ICONS[c] ?? 'receipt') as any} size={14} color={newCategory === c ? '#fff' : colors.textSecondary} />
                  <Text style={[s.catChipText, newCategory === c && s.catChipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={s.autoPayRow}>
              <View>
                <Text style={s.autoPayLabel}>Auto-Pay</Text>
                <Text style={s.autoPaySub}>Automatically paid each month</Text>
              </View>
              <Switch
                value={newIsAutoPay}
                onValueChange={setNewIsAutoPay}
                trackColor={{ false: colors.border, true: colors.success + '60' }}
                thumbColor={newIsAutoPay ? colors.success : colors.border}
              />
            </View>

            <Pressable accessibilityRole="button"
              onPress={handleAddBill}
              style={[s.modalSubmit, (!newName.trim() || !newAmount) && s.modalSubmitDisabled]}
            >
              <Ionicons name={editingBill ? 'checkmark-circle' : 'add-circle'} size={18} color="#fff" />
              <Text style={s.modalSubmitText}>{editingBill ? 'Save Changes' : 'Add Bill'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    summaryCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, alignItems: 'center' },
    summaryCardDanger: { backgroundColor: 'rgba(231,76,60,0.2)' },
    summaryValue: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 3 },
    summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
    filterScroll: { marginBottom: 0 },
    filterChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
    filterChipActive: { backgroundColor: '#fff' },
    filterText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
    filterTextActive: { color: colors.primary },
    content: { padding: 16 },
    // Smart Detection banner
    smartBanner: { backgroundColor: '#EBF3FD', borderRadius: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#4A90D9', overflow: 'hidden' },
    smartBannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
    smartBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    smartBannerTitle: { fontSize: 13, fontWeight: '700', color: '#4A90D9' },
    countBadge: { backgroundColor: '#4A90D9', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    countBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
    detectedRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, gap: 0 },
    detectedIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#D6E8F9', alignItems: 'center', justifyContent: 'center' },
    detectedName: { fontSize: 14, fontWeight: '700', color: colors.text },
    detectedMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    detectedAmount: { fontSize: 15, fontWeight: '800', color: colors.text, marginRight: 10, marginLeft: 8 },
    addDetectedBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#4A90D9', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
    addDetectedBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    dismissDetectedBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
    overdueAlert: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.dangerLight, borderRadius: 12, padding: 14, marginBottom: 16 },
    overdueAlertText: { flex: 1, fontSize: 13, color: colors.danger, fontWeight: '600' },
    billCard: { marginBottom: 12, borderRadius: 16 },
    billRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    billIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    billName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
    billAmount: { fontSize: 18, fontWeight: '800', color: colors.text },
    billMeta: { flexDirection: 'row', gap: 6, marginBottom: 5 },
    billDue: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    billActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
    editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight ?? '#E8EEF9', alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 14 },
    emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    // Import section
    importSection: { backgroundColor: '#EBF3FD', borderRadius: 12, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#4A90D9' },
    importSectionTitle: { fontSize: 12, fontWeight: '700', color: '#4A90D9' },
    importChip: { borderRadius: 10, borderWidth: 1.5, borderColor: '#4A90D9', paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, backgroundColor: '#fff', alignItems: 'center' },
    importChipName: { fontSize: 12, fontWeight: '700', color: colors.text },
    importChipAmount: { fontSize: 11, color: '#4A90D9', fontWeight: '600', marginTop: 2 },
    modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: colors.text, marginBottom: 16 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8 },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    catChipTextActive: { color: '#fff' },
    autoPayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 20 },
    autoPayLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    autoPaySub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    modalSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14 },
    modalSubmitDisabled: { opacity: 0.5 },
    modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}
