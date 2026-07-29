import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useTabBarInset } from '../../hooks/useTabBarInset';
import { Button } from '../../components/common/Button';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { balanceFreshness, FRESHNESS_LABEL, FRESHNESS_COLOR } from '../../utils/accountFreshness';
import type { AccountType, AccountTransactionType, RecurringFrequency } from '../../types';

const PRIMARY = '#1E3A5F';
const DANGER = '#EF4444';
const SUCCESS = '#10B981';
const BG = '#F5F7FA';
const CARD = '#fff';
const TEXT = '#1A1A2E';
const SUBTEXT = '#6B7280';
const BORDER = '#E5E7EB';

// Matches ACCOUNT_GRADIENTS/ACCOUNT_ICONS in FinanceDashboardScreen so an
// account's color identity is consistent between the card and its detail page.
const ACCOUNT_GRADIENTS: Record<AccountType, readonly [string, string, string]> = {
  checking:   ['#0C1E3E', '#1040A0', '#1E6ECC'],
  savings:    ['#063D28', '#0D6B3A', '#13A05A'],
  investment: ['#2D0A6B', '#5B21B6', '#7C3AED'],
  credit:     ['#5C0A0A', '#9B1C1C', '#DC2626'],
  cash:       ['#4A2800', '#92550A', '#D97706'],
};
const ACCOUNT_ICONS: Record<AccountType, keyof typeof Ionicons.glyphMap> = {
  checking: 'card', savings: 'save', investment: 'trending-up', credit: 'card-outline', cash: 'cash',
};

const TX_TYPES: AccountTransactionType[] = ['INCOME', 'EXPENSE'];
const FREQUENCIES: RecurringFrequency[] = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY'];

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Props {
  navigation: { goBack: () => void };
  route: { params?: { accountId?: string } };
}

export function AccountDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const accountId = route.params?.accountId ?? '';

  const {
    accounts, accountTransactions, recurringTransactions,
    fetchAccountLedger, addAccountTransaction, deleteAccountTransaction,
    addRecurringTransaction, deleteRecurringTransaction, confirmRecurringTransaction, skipRecurringTransaction,
    confirmAccountBalance,
  } = useFinanceStore();

  const account = accounts.find((a) => a.id === accountId);
  const transactions = accountTransactions[accountId] ?? [];
  const recurring = recurringTransactions[accountId] ?? [];

  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [txType, setTxType] = useState<AccountTransactionType>('EXPENSE');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txMerchant, setTxMerchant] = useState('');
  const [txPending, setTxPending] = useState(false);
  const [recName, setRecName] = useState('');
  const [recType, setRecType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [recAmount, setRecAmount] = useState('');
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>('MONTHLY');

  useEffect(() => {
    if (accountId) fetchAccountLedger(accountId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const { pendingExpenseTotal, availableEstimate } = useMemo(() => {
    const pending = transactions
      .filter((t) => t.status === 'PENDING' && t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    return { pendingExpenseTotal: pending, availableEstimate: (account?.balance ?? 0) - pending };
  }, [transactions, account?.balance]);

  const hasUnconfirmedActivity = transactions.some((t) => t.status === 'PENDING')
    || recurring.some((r) => r.isActive && new Date(r.nextDueDate) <= new Date());

  const freshness = account
    ? balanceFreshness(account.type, account.lastVerifiedAt ?? account.openingBalanceDate, hasUnconfirmedActivity)
    : 'current';

  if (!account) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Account not found.</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const gradient = ACCOUNT_GRADIENTS[account.type];
  const color = gradient[2];

  const resetTxForm = () => {
    setTxType('EXPENSE'); setTxAmount(''); setTxCategory(''); setTxMerchant(''); setTxPending(false);
  };

  const handleAddTransaction = async () => {
    const amount = parseFloat(txAmount);
    if (!amount || amount <= 0) return;
    try {
      await addAccountTransaction(accountId, {
        type: txType,
        amount,
        date: new Date().toISOString(),
        status: txPending ? 'PENDING' : 'CLEARED',
        category: txCategory.trim() || undefined,
        merchant: txMerchant.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetTxForm();
      setShowAddTx(false);
    } catch {
      Alert.alert('Could not add transaction', 'Please try again.');
    }
  };

  const handleDeleteTransaction = (id: string, label: string) => {
    Alert.alert('Remove transaction?', `Remove "${label}" from ${account.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteAccountTransaction(accountId, id).catch(() => {});
        },
      },
    ]);
  };

  const handleAddRecurring = async () => {
    const amount = parseFloat(recAmount);
    if (!recName.trim() || !amount || amount <= 0) return;
    try {
      await addRecurringTransaction(accountId, {
        name: recName.trim(), type: recType, amount, frequency: recFrequency,
        startDate: new Date().toISOString(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRecName(''); setRecAmount(''); setRecType('EXPENSE'); setRecFrequency('MONTHLY');
      setShowAddRecurring(false);
    } catch {
      Alert.alert('Could not add recurring transaction', 'Please try again.');
    }
  };

  const handleConfirmRecurring = (id: string, name: string) => {
    Alert.alert(`Did "${name}" happen?`, undefined, [
      { text: 'Skip', onPress: () => skipRecurringTransaction(accountId, id).catch(() => {}) },
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', style: 'default',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          confirmRecurringTransaction(accountId, id).catch(() => {});
        },
      },
    ]);
  };

  const handleDeleteRecurring = (id: string, name: string) => {
    Alert.alert('Remove recurring item?', `Stop tracking "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteRecurringTransaction(accountId, id).catch(() => {}) },
    ]);
  };

  const handleConfirmBalance = () => {
    Alert.prompt(
      `Confirm ${account.name} Balance`,
      `App calculates $${formatMoney(account.balance)}. What does your bank actually show?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async (raw) => {
            const actual = parseFloat(raw ?? '');
            if (isNaN(actual)) { Alert.alert('Invalid amount'); return; }
            try {
              await confirmAccountBalance(accountId, actual);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert('Could not confirm balance', 'Please try again.');
            }
          },
        },
      ],
      'plain-text',
      String(account.balance.toFixed(2)),
      'decimal-pad',
    );
  };

  const screenHeader = (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{account.name}</Text>
        <View style={styles.addBtn}>
          <Ionicons name={ACCOUNT_ICONS[account.type]} size={20} color="#fff" />
        </View>
      </View>

      <View style={styles.freshnessRow}>
        <View style={[styles.freshnessDot, { backgroundColor: FRESHNESS_COLOR[freshness] }]} />
        <Text style={styles.weekLabel}>
          {FRESHNESS_LABEL[freshness]}
          {account.lastVerifiedAt ? ` · Verified ${formatDate(account.lastVerifiedAt)}` : ' · Never verified'}
        </Text>
      </View>

      <Text style={styles.headerBalance}>${formatMoney(account.balance)}</Text>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{account.name}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>${formatMoney(account.balance)}</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop + 16, paddingBottom: tabBarInset + 80 }]}
        onScroll={onScroll} onScrollEndDrag={onScrollEndDrag} onMomentumScrollEnd={onMomentumScrollEnd} scrollEventThrottle={scrollEventThrottle}
      >
        {/* Ledger summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Balance Breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Cleared balance</Text>
            <Text style={styles.breakdownVal}>${formatMoney(account.balance)}</Text>
          </View>
          {pendingExpenseTotal > 0 && (
            <>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Pending expenses</Text>
                <Text style={[styles.breakdownVal, { color: DANGER }]}>-${formatMoney(pendingExpenseTotal)}</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownRowFinal]}>
                <Text style={[styles.breakdownLabel, { fontWeight: '700' }]}>Available estimate</Text>
                <Text style={[styles.breakdownVal, { fontWeight: '800' }]}>${formatMoney(availableEstimate)}</Text>
              </View>
            </>
          )}
          <Button title="Confirm Balance" onPress={handleConfirmBalance} variant="outline" size="sm" style={{ marginTop: 12 }} />
        </View>

        {/* Recurring transactions */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Recurring</Text>
            <Pressable onPress={() => setShowAddRecurring(true)}>
              <Ionicons name="add-circle-outline" size={20} color={color} />
            </Pressable>
          </View>
          {recurring.length === 0 && <Text style={styles.emptyText}>No recurring items yet.</Text>}
          {recurring.map((r) => {
            const due = r.isActive && new Date(r.nextDueDate) <= new Date();
            return (
              <Pressable key={r.id} style={styles.recRow} onLongPress={() => handleDeleteRecurring(r.id, r.name)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recName}>{r.name}</Text>
                  <Text style={styles.recMeta}>
                    {r.frequency.toLowerCase()} • {due ? 'expected now' : `next ${formatDate(r.nextDueDate)}`}
                  </Text>
                </View>
                <Text style={[styles.recAmount, { color: r.type === 'INCOME' ? SUCCESS : DANGER }]}>
                  {r.type === 'INCOME' ? '+' : '-'}${formatMoney(r.amount)}
                </Text>
                {due && (
                  <Pressable style={[styles.confirmChip, { backgroundColor: color }]} onPress={() => handleConfirmRecurring(r.id, r.name)}>
                    <Text style={styles.confirmChipText}>Confirm</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Transaction ledger */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Transactions</Text>
          {transactions.length === 0 && <Text style={styles.emptyText}>No transactions logged yet.</Text>}
          {transactions.map((t) => (
            <Pressable
              key={t.id}
              style={styles.txRow}
              onLongPress={() => handleDeleteTransaction(t.id, t.merchant || t.category || t.type)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.txLabel}>{t.merchant || t.category || t.type.charAt(0) + t.type.slice(1).toLowerCase()}</Text>
                <Text style={styles.txMeta}>
                  {formatDate(t.date)}
                  {t.status === 'PENDING' && '  •  Pending'}
                  {t.status === 'SKIPPED' && '  •  Skipped'}
                </Text>
              </View>
              <Text style={[
                styles.txAmount,
                { color: t.status === 'SKIPPED' ? SUBTEXT : t.type === 'INCOME' ? SUCCESS : DANGER },
              ]}>
                {t.type === 'INCOME' ? '+' : '-'}${formatMoney(t.amount)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
        )}
      </CollapsibleHeader>

      {/* FAB */}
      <Pressable onPress={() => setShowAddTx(true)} style={[styles.fab, { bottom: tabBarInset, backgroundColor: color }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Add Transaction modal */}
      <Modal visible={showAddTx} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddTx(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.modalTitle}>Add Transaction</Text>
            <View style={styles.typeRow}>
              {TX_TYPES.map((t) => (
                <Pressable key={t} onPress={() => setTxType(t)} style={[styles.typeChip, txType === t && { backgroundColor: color, borderColor: color }]}>
                  <Text style={[styles.typeChipText, txType === t && { color: '#fff' }]}>{t === 'INCOME' ? 'Income' : 'Expense'}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.modalLabel}>Amount ($)</Text>
            <TextInput style={styles.modalInput} placeholder="0.00" value={txAmount} onChangeText={setTxAmount} keyboardType="decimal-pad" placeholderTextColor={SUBTEXT} />
            <Text style={styles.modalLabel}>Merchant</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. Whole Foods" value={txMerchant} onChangeText={setTxMerchant} placeholderTextColor={SUBTEXT} />
            <Text style={styles.modalLabel}>Category</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. Groceries" value={txCategory} onChangeText={setTxCategory} placeholderTextColor={SUBTEXT} />
            <Pressable style={styles.pendingToggle} onPress={() => setTxPending((v) => !v)}>
              <Ionicons name={txPending ? 'checkbox' : 'square-outline'} size={20} color={color} />
              <Text style={styles.pendingToggleText}>Still pending (hasn't cleared yet)</Text>
            </Pressable>
            <Button title="Add Transaction" onPress={handleAddTransaction} fullWidth size="lg" disabled={!txAmount || parseFloat(txAmount) <= 0} />
            <Button title="Cancel" onPress={() => setShowAddTx(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Recurring modal */}
      <Modal visible={showAddRecurring} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddRecurring(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.modalTitle}>Add Recurring Transaction</Text>
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. Paycheck, Rent" value={recName} onChangeText={setRecName} placeholderTextColor={SUBTEXT} />
            <View style={styles.typeRow}>
              {(['INCOME', 'EXPENSE'] as const).map((t) => (
                <Pressable key={t} onPress={() => setRecType(t)} style={[styles.typeChip, recType === t && { backgroundColor: color, borderColor: color }]}>
                  <Text style={[styles.typeChipText, recType === t && { color: '#fff' }]}>{t === 'INCOME' ? 'Income' : 'Expense'}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.modalLabel}>Amount ($)</Text>
            <TextInput style={styles.modalInput} placeholder="0.00" value={recAmount} onChangeText={setRecAmount} keyboardType="decimal-pad" placeholderTextColor={SUBTEXT} />
            <Text style={styles.modalLabel}>Frequency</Text>
            <View style={styles.typeRow}>
              {FREQUENCIES.map((f) => (
                <Pressable key={f} onPress={() => setRecFrequency(f)} style={[styles.typeChip, recFrequency === f && { backgroundColor: color, borderColor: color }]}>
                  <Text style={[styles.typeChipText, recFrequency === f && { color: '#fff' }]}>{f.charAt(0) + f.slice(1).toLowerCase()}</Text>
                </Pressable>
              ))}
            </View>
            <Button title="Add Recurring Item" onPress={handleAddRecurring} fullWidth size="lg" disabled={!recName.trim() || !recAmount || parseFloat(recAmount) <= 0} />
            <Button title="Cancel" onPress={() => setShowAddRecurring(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: TEXT },
  backLink: { fontSize: 14, color: PRIMARY, marginTop: 12 },

  header: { width: '100%', paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  freshnessRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  freshnessDot: { width: 7, height: 7, borderRadius: 3.5 },
  weekLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerBalance: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },

  content: { padding: 16 },
  card: { backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: SUBTEXT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  emptyText: { fontSize: 13, color: SUBTEXT, fontStyle: 'italic' },

  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  breakdownRowFinal: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4, paddingTop: 10 },
  breakdownLabel: { fontSize: 14, color: TEXT },
  breakdownVal: { fontSize: 14, color: TEXT, fontWeight: '600' },

  recRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: BORDER },
  recName: { fontSize: 14, fontWeight: '600', color: TEXT },
  recMeta: { fontSize: 12, color: SUBTEXT, marginTop: 2 },
  recAmount: { fontSize: 14, fontWeight: '700', marginRight: 8 },
  confirmChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  confirmChipText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: BORDER },
  txLabel: { fontSize: 14, fontWeight: '600', color: TEXT },
  txMeta: { fontSize: 12, color: SUBTEXT, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },

  fab: { position: 'absolute', right: 20, width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },

  modal: { flex: 1, backgroundColor: BG },
  modalTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: SUBTEXT, marginBottom: 6, marginTop: 12 },
  modalInput: { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: TEXT, borderWidth: 1, borderColor: BORDER },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  typeChipText: { fontSize: 13, fontWeight: '600', color: TEXT },
  pendingToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 20 },
  pendingToggleText: { fontSize: 13, color: TEXT },
});
