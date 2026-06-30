import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Modal, TextInput, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Button } from '../../components/common/Button';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useFinancialHealth } from '../../hooks/useFinancialHealth';
import { getAccounts } from '../../services/plaidService';
import type { AccountType, PlaidAccount } from '../../types';

const { width } = Dimensions.get('window');
const generateId = () => Math.random().toString(36).substring(2, 11);
const CARD_W = width * 0.72;
const TOOL_W = (width - 52) / 3;

const ACCOUNT_TYPES: AccountType[] = ['checking', 'savings', 'investment', 'credit', 'cash'];
const GOAL_COLORS = ['#2980B9', '#27AE60', '#F5A623', '#E74C3C', '#8E44AD', '#16A085'];
const GOAL_ICONS = ['home', 'car', 'school', 'airplane', 'gift', 'medkit', 'business', 'trophy'];

const ACCOUNT_GRADIENTS: Record<string, readonly [string, string, string]> = {
  checking:   ['#0C1E3E', '#1040A0', '#1E6ECC'],
  savings:    ['#063D28', '#0D6B3A', '#13A05A'],
  investment: ['#2D0A6B', '#5B21B6', '#7C3AED'],
  credit:     ['#5C0A0A', '#9B1C1C', '#DC2626'],
  cash:       ['#4A2800', '#92550A', '#D97706'],
};

const ACCOUNT_ICONS: Record<string, string> = {
  checking: 'card', savings: 'save', investment: 'trending-up', credit: 'card-outline', cash: 'cash',
};

const NAV_TABS = [
  { key: 'overview', label: 'Overview', icon: 'pie-chart' },
  { key: 'budget',   label: 'Budget',   icon: 'calculator' },
  { key: 'bills',    label: 'Bills',    icon: 'receipt' },
  { key: 'subs',     label: 'Subs',     icon: 'reload' },
  { key: 'assets',   label: 'Assets',   icon: 'briefcase' },
];

const FINANCE_TOOLS = [
  { key: 'WealthBuilder',    icon: 'trending-up',      label: 'Wealth',       color: '#059669', bg: '#ECFDF5' },
  { key: 'InsuranceManager', icon: 'shield-checkmark', label: 'Insurance',    color: '#2563EB', bg: '#EFF6FF' },
  { key: 'Subscriptions',    icon: 'reload',           label: 'Subscriptions', color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'Assets',           icon: 'briefcase',        label: 'Assets',       color: '#D97706', bg: '#FFFBEB' },
  { key: 'DebtPayoff',       icon: 'trending-down',    label: 'Debt',         color: '#DC2626', bg: '#FEF2F2' },
  { key: 'UtilityTracker',   icon: 'flash',            label: 'Utilities',    color: '#0891B2', bg: '#ECFEFF' },
  { key: 'ConnectBank',      icon: 'link',             label: 'Connect Bank', color: '#10B981', bg: '#ECFDF5' },
  { key: 'Transactions',     icon: 'list-outline',     label: 'Transactions', color: '#6366F1', bg: '#EEF2FF' },
  { key: 'SpendingInsights', icon: 'pie-chart-outline', label: 'Insights',    color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'ReceiptScanner',   icon: 'camera-outline',   label: 'Scan Receipt', color: '#8B5CF6', bg: '#F5F3FF' },
];

/* ── Mini arc ring for budget % ── */
function BudgetRing({ ratio, color, size = 44 }: { ratio: number; color: string; size?: number }) {
  const sw = 4;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(ratio, 1) * circ;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="#E4EAF2" strokeWidth={sw} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </Svg>
  );
}

export function FinanceDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('overview');
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);
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

  const {
    accounts, transactions, budgets, bills, subscriptions, financialGoals,
    totalNetWorth, monthlyIncome, monthlyExpenses, monthlySavings,
    addAccount, addFinancialGoal,
  } = useFinanceStore();

  useEffect(() => {
    getAccounts().then((res) => setPlaidAccounts(res.accounts)).catch(() => {});
  }, []);

  const plaidNetWorth = plaidAccounts.reduce((sum, acc) => {
    if (acc.accountType === 'credit') return sum - acc.balance;
    return sum + acc.balance;
  }, 0);

  const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;
  const overdueBills = bills.filter((b) => b.status === 'overdue');
  const fh = useFinancialHealth();

  const handleAddAccount = () => {
    if (!newAccName.trim()) return;
    addAccount({
      id: generateId(), familyId: 'demo-family', name: newAccName.trim(),
      type: newAccType, balance: parseFloat(newAccBalance) || 0,
      institution: newAccInstitution.trim() || undefined,
      lastUpdated: new Date().toISOString(), isShared: true,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewAccName(''); setNewAccType('checking'); setNewAccBalance(''); setNewAccInstitution('');
    setShowAccountModal(false);
  };

  const handleAddGoal = () => {
    if (!newGoalName.trim() || !newGoalTarget.trim()) return;
    addFinancialGoal({
      id: generateId(), familyId: 'demo-family', name: newGoalName.trim(),
      targetAmount: parseFloat(newGoalTarget) || 0, savedAmount: 0,
      category: 'Savings', color: newGoalColor, icon: newGoalIcon,
      isCompleted: false, createdAt: new Date().toISOString(),
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* ══════════ HEADER ══════════ */}
      <LinearGradient
        colors={['#040D1A', '#0A1E3D', '#0F2952']}
        start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 6 }]}
      >
        {/* Decorative glows */}
        <View style={s.glow1} />
        <View style={s.glow2} />

        {/* Top row */}
        <View style={s.headerTopRow}>
          <View>
            <Text style={s.netWorthLabel}>TOTAL NET WORTH</Text>
            <Text style={s.netWorthValue}>
              ${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <View style={s.trendRow}>
              <View style={s.trendPill}>
                <Ionicons name="arrow-up" size={11} color="#34D399" />
                <Text style={s.trendPillText}>+2.4% this month</Text>
              </View>
              <Text style={s.trendAmount}>+$1,240</Text>
            </View>
          </View>
          {overdueBills.length > 0 && (
            <Pressable onPress={() => navigation.navigate('Bills')} style={s.urgentPill}>
              <Ionicons name="warning" size={12} color="#fff" />
              <Text style={s.urgentPillText}>{overdueBills.length} overdue</Text>
            </Pressable>
          )}
        </View>

        {/* Stats strip */}
        <View style={s.statsStrip}>
          {[
            { label: 'Income',   value: `$${monthlyIncome.toLocaleString()}`,   color: '#34D399', icon: 'arrow-down-circle' },
            { label: 'Expenses', value: `$${monthlyExpenses.toLocaleString()}`,  color: '#F87171', icon: 'arrow-up-circle' },
            { label: 'Saved',    value: `${savingsRate}%`,                       color: '#A78BFA', icon: 'shield-checkmark' },
          ].map((item, i) => (
            <View key={i} style={[s.statItem, i < 2 && s.statBorder]}>
              <View style={[s.statIconBg, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={14} color={item.color} />
              </View>
              <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Tab pill row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabPills}
          contentContainerStyle={{ gap: 6, paddingRight: 16 }}>
          {NAV_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable key={tab.key} onPress={() => handleTabPress(tab.key)}
                style={[s.tabPill, active && s.tabPillActive]}>
                <Ionicons name={tab.icon as any} size={13}
                  color={active ? colors.primary : 'rgba(255,255,255,0.5)'} />
                <Text style={[s.tabPillText, active && s.tabPillTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* ══════════ SCROLL BODY ══════════ */}
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* ── PLAID BANK ACCOUNTS ── */}
        {plaidAccounts.length > 0 && (
          <>
            <View style={s.sectionRow}>
              <View style={s.sectionLeft}>
                <View style={s.sectionDot} />
                <Text style={s.sectionTitle}>Bank Accounts</Text>
              </View>
              <Text style={s.netWorthSmall}>
                Net: ${plaidNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <FlatList
              data={plaidAccounts}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.plaidAccountId}
              style={s.plaidScroll}
              contentContainerStyle={s.plaidContent}
              renderItem={({ item: acc }) => (
                <View style={s.plaidCard}>
                  <View style={s.plaidCardTop}>
                    <Ionicons name="wallet-outline" size={20} color="#4A90D9" />
                    <View style={[s.plaidTypeBadge]}>
                      <Text style={s.plaidTypeBadgeText}>{acc.accountType.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={s.plaidCardName} numberOfLines={1}>{acc.name}</Text>
                  {acc.mask && <Text style={s.plaidCardMask}>••••{acc.mask}</Text>}
                  <Text style={[s.plaidCardBalance, acc.accountType === 'credit' && { color: '#EF4444' }]}>
                    ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              )}
            />
          </>
        )}
        {plaidAccounts.length === 0 && (
          <Pressable onPress={() => navigation.navigate('ConnectBank')} style={s.connectPrompt}>
            <Ionicons name="link" size={20} color="#10B981" />
            <Text style={s.connectPromptText}>Connect your bank to see live balances</Text>
            <Ionicons name="chevron-forward" size={16} color="#10B981" />
          </Pressable>
        )}

        {/* ── ACCOUNTS ── */}
        <View style={s.sectionRow}>
          <View style={s.sectionLeft}>
            <View style={s.sectionDot} />
            <Text style={s.sectionTitle}>Accounts</Text>
          </View>
          <Pressable onPress={() => setShowAccountModal(true)} style={s.addBtn}>
            <Ionicons name="add" size={14} color={colors.primary} />
            <Text style={s.addBtnText}>Add</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={s.cardsScroll} contentContainerStyle={s.cardsContent}>
          {accounts.map((acc) => {
            const grad = ACCOUNT_GRADIENTS[acc.type] ?? ACCOUNT_GRADIENTS.checking;
            return (
              <LinearGradient key={acc.id} colors={grad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.accountCard}>
                {/* Shimmer stripe */}
                <View style={s.cardShimmer} />
                {/* Top row */}
                <View style={s.cardTopRow}>
                  <View style={s.cardChip}>
                    <Text style={s.cardChipText}>{acc.type.toUpperCase()}</Text>
                  </View>
                  <View style={s.cardIconWrap}>
                    <Ionicons name={(ACCOUNT_ICONS[acc.type] ?? 'card') as any} size={18} color="rgba(255,255,255,0.9)" />
                  </View>
                </View>
                {/* Name + institution */}
                <Text style={s.cardName}>{acc.name}</Text>
                {acc.institution ? <Text style={s.cardBank}>{acc.institution}</Text> : null}
                {/* Bottom row */}
                <View style={s.cardBottomRow}>
                  <View>
                    <Text style={s.cardBalLabel}>BALANCE</Text>
                    <Text style={s.cardBalance}>
                      ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  {/* Contactless symbol */}
                  <View style={s.contactless}>
                    {[0, 1, 2].map((i) => (
                      <View key={i} style={[s.contactlessArc, {
                        width: 8 + i * 6, height: 8 + i * 6,
                        borderRadius: (8 + i * 6) / 2,
                        opacity: 0.3 + i * 0.25,
                      }]} />
                    ))}
                  </View>
                </View>
                {/* Card number dots */}
                <Text style={s.cardDots}>•••• •••• •••• 4242</Text>
              </LinearGradient>
            );
          })}

          {/* Add card */}
          <Pressable onPress={() => setShowAccountModal(true)} style={s.addCard}>
            <LinearGradient colors={['#F0F3F9', '#E4EAF2']} style={s.addCardInner}>
              <View style={s.addCardIcon}>
                <Ionicons name="add" size={28} color={colors.primary} />
              </View>
              <Text style={s.addCardText}>New{'\n'}Account</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>

        {/* ── BUDGET STATUS ── */}
        <View style={s.sectionRow}>
          <View style={s.sectionLeft}>
            <View style={s.sectionDot} />
            <Text style={s.sectionTitle}>Budget Status</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Budgeting')}>
            <Text style={s.seeAll}>View All →</Text>
          </Pressable>
        </View>
        {budgets.slice(0, 4).map((budget) => {
          const ratio = budget.monthlyLimit > 0 ? budget.spent / budget.monthlyLimit : 0;
          const pct = Math.round(ratio * 100);
          const barColor = ratio > 0.9 ? '#EF4444' : ratio > 0.7 ? '#F59E0B' : '#10B981';
          return (
            <View key={budget.id} style={s.budgetRow}>
              <View style={[s.budgetStrip, { backgroundColor: budget.color }]} />
              <View style={s.budgetBody}>
                <View style={[s.budgetIconWrap, { backgroundColor: budget.color + '18' }]}>
                  <Ionicons name={budget.icon as any} size={20} color={budget.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={s.budgetTopRow}>
                    <Text style={s.budgetName}>{budget.category}</Text>
                    <Text style={s.budgetAmt}>
                      <Text style={{ color: ratio > 0.9 ? '#EF4444' : s.budgetAmt.color }}>${budget.spent.toFixed(0)}</Text>
                      <Text style={s.budgetOf}> / ${budget.monthlyLimit}</Text>
                    </Text>
                  </View>
                  <View style={s.budgetBarRow}>
                    <ProgressBar progress={ratio} color={barColor} height={7} style={{ flex: 1, borderRadius: 4 }} />
                    <View style={[s.pctBadge, { backgroundColor: barColor + '1A' }]}>
                      <Text style={[s.pctBadgeText, { color: barColor }]}>{pct}%</Text>
                    </View>
                  </View>
                  <Text style={s.budgetLeft}>${(budget.monthlyLimit - budget.spent).toFixed(0)} remaining</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* ── FINANCIAL HEALTH ── */}
        <View style={s.sectionRow}>
          <View style={s.sectionLeft}>
            <View style={s.sectionDot} />
            <Text style={s.sectionTitle}>Financial Health</Text>
          </View>
          <View style={[s.gradeChip, {
            backgroundColor:
              fh.grade === 'A' ? '#D5F5E3' : fh.grade === 'B' ? '#D6EAF8' :
              fh.grade === 'C' ? '#FEF9E7' : fh.grade === 'D' ? '#FDEBD0' : '#FDEDEC',
          }]}>
            <Text style={[s.gradeText, {
              color:
                fh.grade === 'A' ? '#1E8449' : fh.grade === 'B' ? '#1A5276' :
                fh.grade === 'C' ? '#9A7D0A' : fh.grade === 'D' ? '#A04000' : '#922B21',
            }]}>Grade {fh.grade}</Text>
          </View>
        </View>

        {/* Score ring + breakdown */}
        <View style={s.healthCard}>
          {/* Left: ring */}
          <View style={s.healthLeft}>
            <View style={s.healthRingWrap}>
              <BudgetRing ratio={fh.financial / 100} color={
                fh.financial >= 75 ? '#27AE60' : fh.financial >= 50 ? '#F5A623' : '#E74C3C'
              } size={80} />
              <View style={s.healthRingCenter}>
                <Text style={[s.healthRingScore, {
                  color: fh.financial >= 75 ? '#27AE60' : fh.financial >= 50 ? '#F5A623' : '#E74C3C',
                }]}>{fh.financial}</Text>
              </View>
            </View>
            <Text style={s.healthScoreLabel}>Financial</Text>
          </View>

          {/* Right: 4 sub-bars */}
          <View style={s.healthRight}>
            {[
              { label: 'Savings Rate',    value: fh.breakdown.savingsRate,      suffix: '%',  good: 20 },
              { label: 'Budget Control',  value: fh.breakdown.budgetAdherence,  suffix: '%',  good: 80 },
              { label: 'Bills On Time',   value: fh.breakdown.billsOnTime,      suffix: '%',  good: 90 },
              { label: 'Goal Progress',   value: fh.breakdown.goalProgress,     suffix: '%',  good: 50 },
            ].map((item) => {
              const color = item.value >= item.good ? '#27AE60' : item.value >= item.good * 0.6 ? '#F5A623' : '#E74C3C';
              return (
                <View key={item.label} style={s.healthSubRow}>
                  <Text style={s.healthSubLabel}>{item.label}</Text>
                  <View style={s.healthSubBar}>
                    <View style={[s.healthSubFill, { width: `${Math.min(100, item.value)}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[s.healthSubValue, { color }]}>{item.value}{item.suffix}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Stats strip */}
        <View style={s.healthStats}>
          {[
            { icon: 'warning-outline',        color: fh.breakdown.overdueCount > 0 ? '#E74C3C' : '#27AE60', label: 'Overdue Bills',   value: fh.breakdown.overdueCount.toString() },
            { icon: 'pie-chart-outline',      color: fh.breakdown.overBudgetCount > 0 ? '#F5A623' : '#27AE60', label: 'Over Budget',  value: fh.breakdown.overBudgetCount.toString() },
            { icon: 'trending-up-outline',    color: '#2980B9', label: 'Savings Rate',   value: `${fh.breakdown.savingsRate}%` },
            { icon: 'flag-outline',           color: '#8E44AD', label: 'Goal Progress',  value: `${fh.breakdown.goalProgress}%` },
          ].map((stat, i) => (
            <View key={i} style={s.healthStat}>
              <Ionicons name={stat.icon as any} size={18} color={stat.color} />
              <Text style={[s.healthStatValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.healthStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Tips */}
        {fh.tips.slice(0, 2).map((tip, i) => (
          <View key={i} style={s.tipRow}>
            <Ionicons name="bulb-outline" size={16} color="#F5A623" style={{ marginTop: 1 }} />
            <Text style={s.tipText}>{tip}</Text>
          </View>
        ))}

        {/* ── FINANCIAL GOALS ── */}
        <View style={[s.sectionRow, { marginTop: 12 }]}>
          <View style={s.sectionLeft}>
            <View style={s.sectionDot} />
            <Text style={s.sectionTitle}>Financial Goals</Text>
          </View>
          <Pressable onPress={() => setShowGoalModal(true)}>
            <Text style={s.seeAll}>+ Goal</Text>
          </Pressable>
        </View>
        {financialGoals.map((goal) => {
          const ratio = goal.targetAmount > 0 ? goal.savedAmount / goal.targetAmount : 0;
          const pct = Math.round(ratio * 100);
          return (
            <View key={goal.id} style={s.goalCard}>
              <LinearGradient colors={[goal.color + 'E0', goal.color + '99']}
                style={s.goalIconWrap}>
                <Ionicons name={goal.icon as any} size={22} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={s.goalTopRow}>
                  <Text style={s.goalName} numberOfLines={1}>{goal.name}</Text>
                  <Text style={[s.goalPct, { color: goal.color }]}>{pct}%</Text>
                </View>
                <Text style={s.goalAmounts}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>${goal.savedAmount.toLocaleString()}</Text>
                  <Text style={{ color: colors.textSecondary }}> of ${goal.targetAmount.toLocaleString()}</Text>
                </Text>
                <ProgressBar progress={ratio} color={goal.color} height={8} style={{ marginTop: 8, borderRadius: 4 }} />
                {goal.deadline && (
                  <Text style={s.goalDeadline}>🎯 Target: {format(new Date(goal.deadline), 'MMM yyyy')}</Text>
                )}
              </View>
            </View>
          );
        })}

        {/* ── RECENT TRANSACTIONS ── */}
        <View style={s.sectionRow}>
          <View style={s.sectionLeft}>
            <View style={s.sectionDot} />
            <Text style={s.sectionTitle}>Recent Transactions</Text>
          </View>
          <Pressable><Text style={s.seeAll}>See All →</Text></Pressable>
        </View>
        <View style={s.txContainer}>
          {transactions.slice(0, 6).map((tx, idx) => {
            const isIncome = tx.type === 'income';
            const isExpense = tx.type === 'expense';
            const dotColor = isIncome ? '#10B981' : isExpense ? '#EF4444' : colors.primary;
            return (
              <View key={tx.id} style={[s.txRow, idx < transactions.slice(0, 6).length - 1 && s.txBorder]}>
                <View style={[s.txIconCircle, { backgroundColor: dotColor + '15' }]}>
                  <Ionicons
                    name={(isIncome ? 'arrow-down-circle' : isExpense ? 'arrow-up-circle' : 'swap-horizontal') as any}
                    size={20} color={dotColor}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <Text style={s.txMeta}>{tx.category} · {format(new Date(tx.date), 'MMM d')}</Text>
                </View>
                <Text style={[s.txAmount, { color: dotColor }]}>
                  {isIncome ? '+' : isExpense ? '-' : ''}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── FINANCE TOOLS ── */}
        <View style={s.sectionRow}>
          <View style={s.sectionLeft}>
            <View style={s.sectionDot} />
            <Text style={s.sectionTitle}>Finance Tools</Text>
          </View>
        </View>
        <View style={s.toolsGrid}>
          {FINANCE_TOOLS.map((tool) => (
            <Pressable key={tool.key} onPress={() => navigation.navigate(tool.key)}
              style={({ pressed }) => [s.toolCard, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}>
              <View style={[s.toolIconWrap, { backgroundColor: tool.bg }]}>
                <Ionicons name={tool.icon as any} size={24} color={tool.color} />
              </View>
              <Text style={[s.toolLabel, { color: tool.color }]}>{tool.label}</Text>
            </Pressable>
          ))}
        </View>

      </ScrollView>

      {/* ── RECEIPT SCANNER FAB ── */}
      <Pressable
        onPress={() => navigation.navigate('ReceiptScanner')}
        style={({ pressed }) => [s.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.94 }] }]}
      >
        <Ionicons name="camera" size={26} color="#fff" />
      </Pressable>

      {/* ── ADD ACCOUNT MODAL ── */}
      <Modal visible={showAccountModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAccountModal(false)}>
        <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Add Account</Text>
          <Text style={s.modalLabel}>Account Name *</Text>
          <TextInput style={s.modalInput} placeholder="e.g. Chase Checking" value={newAccName} onChangeText={setNewAccName} placeholderTextColor={colors.textMuted} autoFocus />
          <Text style={s.modalLabel}>Account Type</Text>
          <View style={s.typeGrid}>
            {ACCOUNT_TYPES.map((t) => (
              <Pressable key={t} onPress={() => setNewAccType(t)} style={[s.typeChip, newAccType === t && s.typeChipActive]}>
                <Text style={[s.typeChipText, newAccType === t && s.typeChipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.modalLabel}>Current Balance ($)</Text>
          <TextInput style={s.modalInput} placeholder="0.00" value={newAccBalance} onChangeText={setNewAccBalance} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
          <Text style={s.modalLabel}>Institution (optional)</Text>
          <TextInput style={[s.modalInput, { marginBottom: 24 }]} placeholder="e.g. Chase, Fidelity" value={newAccInstitution} onChangeText={setNewAccInstitution} placeholderTextColor={colors.textMuted} />
          <Button title="Add Account" onPress={handleAddAccount} fullWidth size="lg" disabled={!newAccName.trim()} />
          <Button title="Cancel" onPress={() => setShowAccountModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>

      {/* ── ADD GOAL MODAL ── */}
      <Modal visible={showGoalModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGoalModal(false)}>
        <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Add Financial Goal</Text>
          <Text style={s.modalLabel}>Goal Name *</Text>
          <TextInput style={s.modalInput} placeholder="e.g. Emergency Fund" value={newGoalName} onChangeText={setNewGoalName} placeholderTextColor={colors.textMuted} autoFocus />
          <Text style={s.modalLabel}>Target Amount ($) *</Text>
          <TextInput style={s.modalInput} placeholder="10000" value={newGoalTarget} onChangeText={setNewGoalTarget} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
          <Text style={s.modalLabel}>Icon</Text>
          <View style={s.iconGrid}>
            {GOAL_ICONS.map((icon) => (
              <Pressable key={icon} onPress={() => setNewGoalIcon(icon)}
                style={[s.iconBtn, newGoalIcon === icon && { backgroundColor: newGoalColor, borderColor: 'transparent' }]}>
                <Ionicons name={icon as any} size={22} color={newGoalIcon === icon ? '#fff' : colors.textSecondary} />
              </Pressable>
            ))}
          </View>
          <Text style={s.modalLabel}>Color</Text>
          <View style={[s.colorRow, { marginBottom: 24 }]}>
            {GOAL_COLORS.map((c) => (
              <Pressable key={c} onPress={() => setNewGoalColor(c)}
                style={[s.colorSwatch, { backgroundColor: c }, newGoalColor === c && s.colorSwatchSelected]} />
            ))}
          </View>
          <Button title="Add Goal" onPress={handleAddGoal} fullWidth size="lg" disabled={!newGoalName.trim() || !newGoalTarget.trim()} />
          <Button title="Cancel" onPress={() => setShowGoalModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const SHADOW = {
  shadowColor: '#0F2952',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.09,
  shadowRadius: 14,
  elevation: 4,
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F3F9' },

  /* ── Header ── */
  header: { paddingHorizontal: 20, paddingBottom: 0, overflow: 'hidden' },
  glow1: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#1E4A8A', opacity: 0.35,
  },
  glow2: {
    position: 'absolute', bottom: 40, left: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#00D4AA', opacity: 0.08,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  netWorthLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  netWorthValue: { fontSize: 25, fontWeight: '900', color: '#fff', letterSpacing: -1.5 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  trendPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#34D39920', borderRadius: 20,
    paddingVertical: 1, paddingHorizontal: 2,
  },
  trendPillText: { fontSize: 12, color: '#34D399', fontWeight: '700' },
  trendAmount: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  urgentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EF4444', borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 10,
  },
  urgentPillText: { fontSize: 11, color: '#fff', fontWeight: '800' },

  /* Stats strip */
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    marginBottom: 15,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' },
  statIconBg: { width: 15, height: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 12, fontWeight: '800' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '600', letterSpacing: 0.3 },

  /* Tab pills */
  tabPills: { flexGrow: 0 },
  tabPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 8, paddingHorizontal: 12,
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
  },
  tabPillActive: { backgroundColor: '#F0F3F9' },
  tabPillText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  tabPillTextActive: { color: colors.primary },

  /* ── Body ── */
  body: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 110 },

  /* Section headers */
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 6 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionDot: { width: 4, height: 20, borderRadius: 2, backgroundColor: colors.primary },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0D1B2A' },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '12', borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 10,
  },
  addBtnText: { fontSize: 13, color: colors.primary, fontWeight: '700' },

  /* ── Plaid bank account cards ── */
  netWorthSmall: { fontSize: 13, fontWeight: '700', color: colors.primary },
  plaidScroll: { marginBottom: 16, marginHorizontal: -16 },
  plaidContent: { paddingHorizontal: 16, gap: 12 },
  plaidCard: { width: 160, backgroundColor: '#fff', borderRadius: 16, padding: 14, ...SHADOW },
  plaidCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  plaidTypeBadge: { backgroundColor: '#EEF2FF', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  plaidTypeBadgeText: { fontSize: 9, fontWeight: '800', color: '#6366F1', letterSpacing: 0.5 },
  plaidCardName: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  plaidCardMask: { fontSize: 11, color: '#6B7280', marginBottom: 6 },
  plaidCardBalance: { fontSize: 18, fontWeight: '900', color: '#1A1A2E' },
  connectPrompt: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#A7F3D0' },
  connectPromptText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#065F46' },

  /* ── Account cards ── */
  cardsScroll: { marginBottom: 26, marginHorizontal: -16 },
  cardsContent: { paddingHorizontal: 16, gap: 14 },
  accountCard: {
    width: CARD_W, height: 190, borderRadius: 24, padding: 20,
    justifyContent: 'space-between', overflow: 'hidden',
    ...SHADOW,
  },
  cardShimmer: {
    position: 'absolute', top: -40, right: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardChip: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
    paddingVertical: 3, paddingHorizontal: 8,
  },
  cardChipText: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.9)', letterSpacing: 1.5 },
  cardIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 4 },
  cardBank: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardBalLabel: { fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, marginBottom: 2 },
  cardBalance: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  contactless: { alignItems: 'center', justifyContent: 'center', width: 30, height: 30 },
  contactlessArc: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  cardDots: { fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginTop: 2 },
  addCard: { width: CARD_W * 0.55, height: 190, borderRadius: 24, overflow: 'hidden' },
  addCardInner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border, borderRadius: 24, gap: 8,
  },
  addCardIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.primary + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  addCardText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },

  /* ── Budget rows ── */
  budgetRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 18, marginBottom: 10, overflow: 'hidden', ...SHADOW,
  },
  budgetStrip: { width: 5 },
  budgetBody: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
  budgetIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  budgetTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  budgetName: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  budgetAmt: { fontSize: 14, fontWeight: '700', color: '#0D1B2A' },
  budgetOf: { fontWeight: '400', color: colors.textSecondary },
  budgetBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pctBadge: { borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 },
  pctBadgeText: { fontSize: 11, fontWeight: '800' },
  budgetLeft: { fontSize: 11, color: colors.textSecondary, marginTop: 5 },

  /* ── Goals ── */
  goalCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    marginBottom: 12, ...SHADOW,
  },
  goalIconWrap: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  goalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  goalName: { fontSize: 15, fontWeight: '800', color: '#0D1B2A', flex: 1 },
  goalPct: { fontSize: 15, fontWeight: '900' },
  goalAmounts: { fontSize: 13 },
  goalDeadline: { fontSize: 11, color: colors.textMuted, marginTop: 6 },

  /* ── Transactions ── */
  txContainer: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 24, ...SHADOW },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  txBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F3F9' },
  txIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 14, fontWeight: '600', color: '#0D1B2A', marginBottom: 2 },
  txMeta: { fontSize: 11, color: colors.textSecondary },
  txAmount: { fontSize: 15, fontWeight: '800' },

  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
  },

  /* ── Tools ── */
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  toolCard: {
    width: TOOL_W, backgroundColor: '#fff', borderRadius: 18,
    padding: 16, alignItems: 'center', gap: 10, ...SHADOW,
  },
  toolIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontSize: 11, fontWeight: '800', textAlign: 'center' },

  /* ── Modals ── */
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border,
    marginBottom: 16, ...shadows.sm,
  },
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

  /* ── Financial Health ── */
  gradeChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  gradeText: { fontSize: 12, fontWeight: '800' },
  healthCard: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderRadius: 20, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border, gap: 16,
    ...SHADOW,
  },
  healthLeft: { alignItems: 'center', gap: 6, width: 80 },
  healthRingWrap: { position: 'relative', width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  healthRingCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  healthRingScore: { fontSize: 18, fontWeight: '900' },
  healthScoreLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  healthRight: { flex: 1, gap: 8 },
  healthSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthSubLabel: { fontSize: 11, color: colors.textSecondary, width: 88 },
  healthSubBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  healthSubFill: { height: 6, borderRadius: 3 },
  healthSubValue: { fontSize: 11, fontWeight: '700', width: 30, textAlign: 'right' },
  healthStats: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border, justifyContent: 'space-around',
    ...SHADOW,
  },
  healthStat: { alignItems: 'center', gap: 4 },
  healthStatValue: { fontSize: 15, fontWeight: '800' },
  healthStatLabel: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  tipRow: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#FEF9E7', borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#F9E79F',
  },
  tipText: { flex: 1, fontSize: 13, color: '#7D6608', lineHeight: 19 },
});
