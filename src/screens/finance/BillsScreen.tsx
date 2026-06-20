import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, differenceInDays } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useFinanceStore } from '../../store/useFinanceStore';

const statusBadge = { upcoming: 'neutral', due_soon: 'warning', overdue: 'danger', paid: 'success' } as const;
const statusLabels = { upcoming: 'Upcoming', due_soon: 'Due Soon', overdue: 'OVERDUE', paid: 'Paid' };

export function BillsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');
  const { bills, markBillPaid } = useFinanceStore();

  const totalDue = bills.filter((b) => b.status !== 'paid').reduce((sum, b) => sum + b.amount, 0);
  const overdueBills = bills.filter((b) => b.status === 'overdue');

  const filtered = filter === 'All' ? bills : bills.filter((b) => b.status === filter.toLowerCase().replace(' ', '_'));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#1E4A8A']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Bills</Text>
          <Pressable style={styles.addBtn}>
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
                <View style={[styles.billIcon, { backgroundColor: bill.status === 'overdue' ? colors.dangerLight : bill.status === 'paid' ? colors.successLight : '#E8EEF9' }]}>
                  <Ionicons name={(bill.icon || 'receipt-outline') as any} size={22} color={bill.status === 'overdue' ? colors.danger : bill.status === 'paid' ? colors.success : colors.primary} />
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
                      `Due ${format(new Date(bill.dueDate), 'MMM d, yyyy')}`
                    }
                  </Text>
                </View>
              </View>
              {bill.status !== 'paid' && (
                <View style={styles.billActions}>
                  <Button title="Mark Paid" onPress={() => markBillPaid(bill.id)} variant="success" size="sm" />
                  {!bill.isAutoPay && <Button title="Set Auto-Pay" onPress={() => {}} variant="outline" size="sm" style={{ marginLeft: 8 }} />}
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
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
  billActions: { flexDirection: 'row', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
});
