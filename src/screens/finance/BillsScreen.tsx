import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, Switch, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, differenceInDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { Bill } from '../../types';

const statusBadge = { upcoming: 'neutral', due_soon: 'warning', overdue: 'danger', paid: 'success' } as const;
const statusLabels = { upcoming: 'Upcoming', due_soon: 'Due Soon', overdue: 'OVERDUE', paid: 'Paid' };

const CATEGORIES = ['Housing', 'Utilities', 'Insurance', 'Internet', 'Phone', 'Health', 'Education', 'Subscriptions', 'Other'];
const CATEGORY_ICONS: Record<string, string> = {
  Housing: 'home', Utilities: 'flash', Insurance: 'shield-checkmark', Internet: 'wifi',
  Phone: 'phone-portrait', Health: 'medical', Education: 'school', Subscriptions: 'reload', Other: 'receipt',
};

const generateId = () => Math.random().toString(36).substring(2, 11);

export function BillsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const { bills, markBillPaid, deleteBill, addBill } = useFinanceStore();

  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDays, setNewDueDays] = useState('14');
  const [newCategory, setNewCategory] = useState('Utilities');
  const [newIsAutoPay, setNewIsAutoPay] = useState(false);

  const totalDue = bills.filter((b) => b.status !== 'paid').reduce((sum, b) => sum + b.amount, 0);
  const overdueBills = bills.filter((b) => b.status === 'overdue');
  const filtered = filter === 'All' ? bills : bills.filter((b) => b.status === filter.toLowerCase().replace(' ', '_'));

  const handleAddBill = () => {
    const amount = parseFloat(newAmount);
    if (!newName.trim() || isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Input', 'Please enter a bill name and valid amount.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const dueDate = new Date(Date.now() + parseInt(newDueDays || '14') * 86400000).toISOString();
    const daysUntil = parseInt(newDueDays || '14');
    const status: Bill['status'] = daysUntil < 0 ? 'overdue' : daysUntil <= 5 ? 'due_soon' : 'upcoming';
    const newBill: Bill = {
      id: generateId(),
      familyId: 'family-1',
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
    setNewName('');
    setNewAmount('');
    setNewDueDays('14');
    setNewCategory('Utilities');
    setNewIsAutoPay(false);
    setShowAddModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(`Delete "${name}"?`, 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); deleteBill(id); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#1E4A8A']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Bills</Text>
          <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.summaryLabel}>Total Due</Text>
          </View>
          <View style={[styles.summaryCard, overdueBills.length > 0 && styles.summaryCardDanger]}>
            <Text style={[styles.summaryValue, overdueBills.length > 0 && { color: colors.danger }]}>{overdueBills.length}</Text>
            <Text style={styles.summaryLabel}>Overdue</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{bills.filter((b) => b.isAutoPay).length}</Text>
            <Text style={styles.summaryLabel}>Auto-Pay</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['All', 'Overdue', 'Due Soon', 'Upcoming', 'Paid'].map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {overdueBills.length > 0 && filter === 'All' && (
          <View style={styles.overdueAlert}>
            <Ionicons name="warning" size={20} color={colors.danger} />
            <Text style={styles.overdueAlertText}>
              {overdueBills.length} bill{overdueBills.length > 1 ? 's' : ''} overdue! Pay now to avoid late fees.
            </Text>
          </View>
        )}

        {filtered.map((bill) => {
          const daysUntil = differenceInDays(new Date(bill.dueDate), new Date());
          return (
            <Card key={bill.id} style={styles.billCard} variant="elevated">
              <View style={styles.billRow}>
                <View style={[styles.billIcon, {
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
                  <View style={styles.billHeader}>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billAmount}>${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                  </View>
                  <View style={styles.billMeta}>
                    <Badge label={statusLabels[bill.status as keyof typeof statusLabels]} variant={statusBadge[bill.status as keyof typeof statusBadge]} size="sm" dot />
                    {bill.isAutoPay && <Badge label="Auto-Pay" variant="success" size="sm" />}
                  </View>
                  <Text style={[styles.billDue, bill.status === 'overdue' && { color: colors.danger }]}>
                    {bill.status === 'paid' ? 'Paid' :
                      daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                        daysUntil === 0 ? 'Due TODAY!' :
                          daysUntil === 1 ? 'Due tomorrow' :
                            `Due ${format(new Date(bill.dueDate), 'MMM d, yyyy')}`}
                  </Text>
                </View>
              </View>
              {bill.status !== 'paid' && (
                <View style={styles.billActions}>
                  <Button title="Mark Paid" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); markBillPaid(bill.id); }} variant="success" size="sm" />
                  <Pressable onPress={() => handleDelete(bill.id, bill.name)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No bills here</Text>
            <Text style={styles.emptyDesc}>Tap + to add a new bill.</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Bill Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Bill</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Bill Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Electric Bill"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Amount ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={newAmount}
              onChangeText={setNewAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Due in (days)</Text>
            <TextInput
              style={styles.modalInput}
              value={newDueDays}
              onChangeText={setNewDueDays}
              placeholder="14"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setNewCategory(c)}
                  style={[styles.catChip, newCategory === c && styles.catChipActive]}
                >
                  <Ionicons name={(CATEGORY_ICONS[c] ?? 'receipt') as any} size={14} color={newCategory === c ? '#fff' : colors.textSecondary} />
                  <Text style={[styles.catChipText, newCategory === c && styles.catChipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.autoPayRow}>
              <View>
                <Text style={styles.autoPayLabel}>Auto-Pay</Text>
                <Text style={styles.autoPaySub}>Automatically paid each month</Text>
              </View>
              <Switch
                value={newIsAutoPay}
                onValueChange={setNewIsAutoPay}
                trackColor={{ false: colors.border, true: colors.success + '60' }}
                thumbColor={newIsAutoPay ? colors.success : colors.border}
              />
            </View>

            <Pressable
              onPress={handleAddBill}
              style={[styles.modalSubmit, (!newName.trim() || !newAmount) && styles.modalSubmitDisabled]}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.modalSubmitText}>Add Bill</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
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
  deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 14 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
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
