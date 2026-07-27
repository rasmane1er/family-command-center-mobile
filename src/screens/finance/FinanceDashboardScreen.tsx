import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Button } from '../../components/common/Button';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { AccountType } from '../../types';

const { width } = Dimensions.get('window');
const generateId = () => Math.random().toString(36).substring(2, 11);

const ACCOUNT_TYPES: AccountType[] = ['checking', 'savings', 'investment', 'credit', 'cash'];
const GOAL_COLORS = ['#2980B9', '#27AE60', '#F5A623', '#E74C3C', '#8E44AD', '#16A085'];
const GOAL_ICONS = ['home', 'car', 'school', 'airplane', 'gift', 'medkit', 'business', 'trophy'];

const NAV_TABS = [
  { key: 'overview', label: 'Overview', icon: 'pie-chart-outline' },
  { key: 'budget', label: 'Budget', icon: 'calculator-outline' },
  { key: 'bills', label: 'Bills', icon: 'receipt-outline' },
  { key: 'subs', label: 'Subscriptions', icon: 'reload-outline' },
  { key: 'assets', label: 'Assets', icon: 'briefcase-outline' },
];

export function FinanceDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('checking');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccInstitution, setNewAccInstitution] = useState('');
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalColor, setNewGoalColor] = useState('#2980B9');
  const [newGoalIcon, setNewGoalIcon] = useState('trophy');
  const { accounts, transactions, budgets, bills, subscriptions, financialGoals, totalNetWorth, monthlyIncome, monthlyExpenses, monthlySavings, addAccount, addFinancialGoal } = useFinanceStore();

  const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;
  const overdueBills = bills.filter((b) => b.status === 'overdue');
  const dueSoonBills = bills.filter((b) => b.status === 'due_soon');
  const totalSubscriptions = subscriptions.filter((s) => s.isActive).reduce((sum, s) => sum + (s.billingCycle === 'annual' ? s.amount / 12 : s.amount), 0);

  const handleAddAccount = () => {
    if (!newAccName.trim()) return;
    addAccount({
      id: generateId(),
      familyId: 'demo-family',
      name: newAccName.trim(),
      type: newAccType,
      balance: parseFloat(newAccBalance) || 0,
      institution: newAccInstitution.trim() || undefined,
      lastUpdated: new Date().toISOString(),
      isShared: true,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewAccName(''); setNewAccType('checking'); setNewAccBalance(''); setNewAccInstitution('');
    setShowAccountModal(false);
  };

  const handleAddGoal = () => {
    if (!newGoalName.trim() || !newGoalTarget.trim()) return;
    addFinancialGoal({
      id: generateId(),
      familyId: 'demo-family',
      name: newGoalName.trim(),
      targetAmount: parseFloat(newGoalTarget) || 0,
      savedAmount: 0,
      category: 'Savings',
      color: newGoalColor,
      icon: newGoalIcon,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewGoalName(''); setNewGoalTarget(''); setNewGoalColor('#2980B9'); setNewGoalIcon('trophy');
    setShowGoalModal(false);
  };

  const handleTabPress = (key: string) => {
    if (key === 'budget') navigation.navigate('Budgeting');
    else if (key === 'bills') navigation.navigate('Bills');
    else if (key === 'subs') navigation.navigate('Subscriptions');
    else if (key === 'assets') navigation.navigate('Assets');
    else setActiveTab(key);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0D1B2A', '#0F2952']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerLabel}>Net Worth</Text>
            <Text style={styles.netWorth}>${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <View style={styles.netWorthTrend}>
              <Ionicons name="trending-up" size={14} color={colors.success} />
              <Text style={styles.trendText}>+$1,240 this month</Text>
            </View>
          </View>
          <View style={styles.alertBadges}>
            {overdueBills.length > 0 && (
              <Pressable onPress={() => navigation.navigate('Bills')} style={styles.alertBadge}>
                <Ionicons name="warning" size={14} color="#fff" />
                <Text style={styles.alertBadgeText}>{overdueBills.length} overdue</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Monthly summary */}
        <View style={styles.monthlySummary}>
          {[
            { label: 'Income', value: `$${monthlyIncome.toLocaleString()}`, icon: 'arrow-down', color: '#4EECD0' },
            { label: 'Expenses', value: `$${monthlyExpenses.toLocaleString()}`, icon: 'arrow-up', color: '#FF8080' },
            { label: 'Savings', value: `${savingsRate}%`, icon: 'save', color: colors.secondary },
          ].map((item, i) => (
            <View key={i} style={[styles.summaryItem, i < 2 && styles.summaryItemBorder]}>
              <View style={styles.summaryIconRow}>
                <Ionicons name={item.icon as any} size={14} color={item.color} />
                <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
              </View>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {NAV_TABS.map((tab) => (
            <Pressable key={tab.key} onPress={() => handleTabPress(tab.key)} style={[styles.tab, activeTab === tab.key && styles.tabActive]}>
              <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? colors.primary : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {/* Accounts */}
        <Text style={styles.sectionTitle}>Accounts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll} contentContainerStyle={styles.accountsContent}>
          {accounts.map((acc) => (
            <LinearGradient
              key={acc.id}
              colors={acc.type === 'checking' ? ['#0F2952', '#1E4A8A'] : acc.type === 'savings' ? ['#27AE60', '#1ABC9C'] : acc.type === 'investment' ? ['#8E44AD', '#9B59B6'] : ['#E74C3C', '#C0392B']}
              style={styles.accountCard}
            >
              <Ionicons name={acc.type === 'checking' ? 'card' : acc.type === 'savings' ? 'save' : acc.type === 'investment' ? 'trending-up' : 'card-outline'} size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.accountName}>{acc.name}</Text>
              <Text style={styles.accountBalance}>${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              <Text style={styles.accountType}>{acc.type.charAt(0).toUpperCase() + acc.type.slice(1)}</Text>
            </LinearGradient>
          ))}
          <Pressable onPress={() => setShowAccountModal(true)} style={styles.addAccountCard}>
            <Ionicons name="add-circle-outline" size={28} color={colors.textMuted} />
            <Text style={styles.addAccountText}>Add Account</Text>
          </Pressable>
        </ScrollView>

        {/* Budget Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Budget Status</Text>
          <Pressable onPress={() => navigation.navigate('Budgeting')}>
            <Text style={styles.seeAll}>View All</Text>
          </Pressable>
        </View>
        {budgets.slice(0, 4).map((budget) => (
          <Card key={budget.id} style={styles.budgetCard} variant="elevated">
            <View style={styles.budgetRow}>
              <View style={[styles.budgetIcon, { backgroundColor: budget.color + '20' }]}>
                <Ionicons name={budget.icon as any} size={20} color={budget.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.budgetHeader}>
                  <Text style={styles.budgetCategory}>{budget.category}</Text>
                  <Text style={styles.budgetAmount}>
                    <Text style={{ color: budget.spent > budget.monthlyLimit ? colors.danger : colors.text }}>
                      ${budget.spent.toFixed(0)}
                    </Text>
                    <Text style={styles.budgetLimit}> / ${budget.monthlyLimit}</Text>
                  </Text>
                </View>
                <ProgressBar
                  progress={budget.spent / budget.monthlyLimit}
                  color={budget.spent / budget.monthlyLimit > 0.9 ? colors.danger : budget.spent / budget.monthlyLimit > 0.7 ? colors.warning : colors.success}
                  height={6}
                  style={{ marginTop: 8 }}
                />
                <Text style={styles.budgetRemaining}>
                  ${(budget.monthlyLimit - budget.spent).toFixed(0)} remaining
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {/* Financial Goals */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Financial Goals</Text>
          <Pressable onPress={() => setShowGoalModal(true)}><Text style={styles.seeAll}>Add Goal</Text></Pressable>
        </View>
        {financialGoals.map((goal) => (
          <Card key={goal.id} style={styles.goalCard} variant="elevated">
            <View style={styles.goalRow}>
              <View style={[styles.goalIcon, { backgroundColor: goal.color + '20' }]}>
                <Ionicons name={goal.icon as any} size={22} color={goal.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.goalName}>{goal.name}</Text>
                <View style={styles.goalProgress}>
                  <Text style={styles.goalSaved}>${goal.savedAmount.toLocaleString()}</Text>
                  <Text style={styles.goalTarget}> of ${goal.targetAmount.toLocaleString()}</Text>
                </View>
                <ProgressBar progress={goal.savedAmount / goal.targetAmount} color={goal.color} height={8} style={{ marginTop: 8 }} />
                <View style={styles.goalMeta}>
                  <Text style={styles.goalPct}>{Math.round((goal.savedAmount / goal.targetAmount) * 100)}% complete</Text>
                  {goal.deadline && <Text style={styles.goalDeadline}>by {format(new Date(goal.deadline), 'MMM yyyy')}</Text>}
                </View>
              </View>
            </View>
          </Card>
        ))}

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Pressable><Text style={styles.seeAll}>See All</Text></Pressable>
        </View>
        {transactions.slice(0, 6).map((tx) => (
          <Card key={tx.id} style={styles.txCard} variant="elevated">
            <View style={styles.txRow}>
              <View style={[styles.txIcon, { backgroundColor: tx.type === 'income' ? colors.successLight : tx.type === 'expense' ? colors.dangerLight : '#E8EEF9' }]}>
                <Ionicons
                  name={tx.type === 'income' ? 'arrow-down-circle' : tx.type === 'expense' ? 'arrow-up-circle' : 'swap-horizontal'}
                  size={20}
                  color={tx.type === 'income' ? colors.success : tx.type === 'expense' ? colors.danger : colors.primary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.txDesc}>{tx.description}</Text>
                <View style={styles.txMeta}>
                  <Badge label={tx.category} variant="neutral" size="sm" />
                  <Text style={styles.txDate}>{format(new Date(tx.date), 'MMM d')}</Text>
                </View>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === 'income' ? colors.success : tx.type === 'expense' ? colors.danger : colors.text }]}>
                {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''} ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </Card>
        ))}

        {/* Finance Tools */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Finance Tools</Text>
        </View>
        <View style={styles.toolsGrid}>
          {[
            { key: 'WealthBuilder', icon: 'trending-up', label: 'Wealth Builder', color: '#16A085', bg: '#D1F2EB', desc: 'Portfolio & investments' },
            { key: 'InsuranceManager', icon: 'shield-checkmark', label: 'Insurance', color: '#0D47A1', bg: '#E3F2FD', desc: 'All policies tracked' },
            { key: 'Subscriptions', icon: 'reload', label: 'Subscriptions', color: '#6A1B9A', bg: '#F3E5F5', desc: 'Monthly recurring' },
            { key: 'Assets', icon: 'briefcase', label: 'Assets', color: '#E65100', bg: '#FFF3E0', desc: 'Net worth tracker' },
            { key: 'DebtPayoff', icon: 'trending-down', label: 'Debt Payoff', color: '#B71C1C', bg: '#FFEBEE', desc: 'Payoff strategies' },
            { key: 'UtilityTracker', icon: 'flash', label: 'Utilities', color: '#006064', bg: '#E0F7FA', desc: 'Electric, water, gas' },
            { key: 'TaxOrganizer', icon: 'document-text', label: 'Tax Organizer', color: '#1A237E', bg: '#E8EAF6', desc: 'Docs & deductions' },
          ].map((tool) => (
            <Pressable key={tool.key} onPress={() => navigation.navigate(tool.key)} style={[styles.toolCard, shadows.sm]}>
              <View style={[styles.toolIcon, { backgroundColor: tool.bg }]}>
                <Ionicons name={tool.icon as any} size={24} color={tool.color} />
              </View>
              <Text style={styles.toolLabel}>{tool.label}</Text>
              <Text style={styles.toolDesc}>{tool.desc}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Add Account Modal */}
      <Modal visible={showAccountModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAccountModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Account</Text>

          <Text style={styles.modalLabel}>Account Name *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Chase Checking" value={newAccName} onChangeText={setNewAccName} placeholderTextColor={colors.textMuted} autoFocus />

          <Text style={styles.modalLabel}>Account Type</Text>
          <View style={styles.typeGrid}>
            {ACCOUNT_TYPES.map((t) => (
              <Pressable key={t} onPress={() => setNewAccType(t)} style={[styles.typeChip, newAccType === t && styles.typeChipActive]}>
                <Text style={[styles.typeChipText, newAccType === t && styles.typeChipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Current Balance ($)</Text>
          <TextInput style={styles.modalInput} placeholder="0.00" value={newAccBalance} onChangeText={setNewAccBalance} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Institution (optional)</Text>
          <TextInput style={[styles.modalInput, { marginBottom: 24 }]} placeholder="e.g. Chase, Fidelity" value={newAccInstitution} onChangeText={setNewAccInstitution} placeholderTextColor={colors.textMuted} />

          <Button title="Add Account" onPress={handleAddAccount} fullWidth size="lg" disabled={!newAccName.trim()} />
          <Button title="Cancel" onPress={() => setShowAccountModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>

      {/* Add Goal Modal */}
      <Modal visible={showGoalModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGoalModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Financial Goal</Text>

          <Text style={styles.modalLabel}>Goal Name *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Emergency Fund" value={newGoalName} onChangeText={setNewGoalName} placeholderTextColor={colors.textMuted} autoFocus />

          <Text style={styles.modalLabel}>Target Amount ($) *</Text>
          <TextInput style={styles.modalInput} placeholder="10000" value={newGoalTarget} onChangeText={setNewGoalTarget} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Icon</Text>
          <View style={styles.iconGrid}>
            {GOAL_ICONS.map((icon) => (
              <Pressable key={icon} onPress={() => setNewGoalIcon(icon)} style={[styles.iconBtn, newGoalIcon === icon && { backgroundColor: newGoalColor, borderColor: 'transparent' }]}>
                <Ionicons name={icon as any} size={22} color={newGoalIcon === icon ? '#fff' : colors.textSecondary} />
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Color</Text>
          <View style={[styles.colorRow, { marginBottom: 24 }]}>
            {GOAL_COLORS.map((c) => (
              <Pressable key={c} onPress={() => setNewGoalColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, newGoalColor === c && styles.colorSwatchSelected]} />
            ))}
          </View>

          <Button title="Add Goal" onPress={handleAddGoal} fullWidth size="lg" disabled={!newGoalName.trim() || !newGoalTarget.trim()} />
          <Button title="Cancel" onPress={() => setShowGoalModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 4 },
  netWorth: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  netWorthTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  trendText: { fontSize: 13, color: colors.success, fontWeight: '600' },
  alertBadges: { gap: 8 },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.danger, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  alertBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  monthlySummary: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryItemBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' },
  summaryIconRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  summaryValue: { fontSize: 17, fontWeight: '700' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  tabScroll: { marginBottom: 0 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderTopLeftRadius: 10, borderTopRightRadius: 10, marginRight: 4 },
  tabActive: { backgroundColor: colors.background },
  tabText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: colors.primary },
  content: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  accountsScroll: { marginBottom: 20, marginHorizontal: -16 },
  accountsContent: { paddingHorizontal: 16, gap: 12 },
  accountCard: { width: 180, borderRadius: 16, padding: 18, ...shadows.md },
  accountName: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 10, marginBottom: 6 },
  accountBalance: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  accountType: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 },
  addAccountCard: { width: 120, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  addAccountText: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  budgetCard: { marginBottom: 10, borderRadius: 14 },
  budgetRow: { flexDirection: 'row', alignItems: 'center' },
  budgetIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetCategory: { fontSize: 15, fontWeight: '600', color: colors.text },
  budgetAmount: { fontSize: 15, fontWeight: '700', color: colors.text },
  budgetLimit: { fontSize: 13, color: colors.textSecondary, fontWeight: '400' },
  budgetRemaining: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  goalCard: { marginBottom: 12, borderRadius: 16 },
  goalRow: { flexDirection: 'row', alignItems: 'flex-start' },
  goalIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  goalName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  goalProgress: { flexDirection: 'row', alignItems: 'baseline' },
  goalSaved: { fontSize: 18, fontWeight: '800', color: colors.text },
  goalTarget: { fontSize: 14, color: colors.textSecondary },
  goalMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  goalPct: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  goalDeadline: { fontSize: 12, color: colors.textMuted },
  txCard: { marginBottom: 8, borderRadius: 14 },
  txRow: { flexDirection: 'row', alignItems: 'center' },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 5 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txDate: { fontSize: 12, color: colors.textSecondary },
  txAmount: { fontSize: 16, fontWeight: '700' },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#fff' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  iconBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  toolCard: { width: (width - 42) / 2, backgroundColor: colors.card, borderRadius: 14, padding: 14 },
  toolIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  toolLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  toolDesc: { fontSize: 11, color: colors.textMuted },
});
