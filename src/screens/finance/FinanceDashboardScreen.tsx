import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useFinanceStore } from '../../store/useFinanceStore';

const { width } = Dimensions.get('window');

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
  const { accounts, transactions, budgets, bills, subscriptions, financialGoals, totalNetWorth, monthlyIncome, monthlyExpenses, monthlySavings } = useFinanceStore();

  const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;
  const overdueBills = bills.filter((b) => b.status === 'overdue');
  const dueSoonBills = bills.filter((b) => b.status === 'due_soon');
  const totalSubscriptions = subscriptions.filter((s) => s.isActive).reduce((sum, s) => sum + (s.billingCycle === 'annual' ? s.amount / 12 : s.amount), 0);

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
          <Pressable style={styles.addAccountCard}>
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
          <Pressable><Text style={styles.seeAll}>Add Goal</Text></Pressable>
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
          <Card key={tx.id} style={styles.txCard} onPress={() => {}} variant="elevated">
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
      </ScrollView>
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
});
