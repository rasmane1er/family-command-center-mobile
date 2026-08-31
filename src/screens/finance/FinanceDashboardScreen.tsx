import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Modal, TextInput, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, addMonths, differenceInDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Button } from '../../components/common/Button';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useFinancialHealth } from '../../hooks/useFinancialHealth';
import { useTotalNetWorth } from '../../hooks/useTotalNetWorth';
import { usePlaidAutoData } from '../../hooks/usePlaidAutoData';
import { getAccounts, getSpendingByCategory } from '../../services/plaidService';
import { getDetectedBills, getInvestmentAccounts } from '../../services/autoFillService';
import type { DetectedBill, PlaidInvestmentAccount } from '../../services/autoFillService';
import { getDetectedSubscriptions, confirmSubscription } from '../../services/subscriptionDetectionService';
import type { DetectedSubscription } from '../../services/subscriptionDetectionService';
import type { AccountType, PlaidAccount, Bill, Subscription, FinancialAccount, Asset } from '../../types';
import { useTranslation } from 'react-i18next';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

const { width } = Dimensions.get('window');
import { generateId } from '../../utils/generateId';
import { balanceFreshness, FRESHNESS_LABEL, FRESHNESS_COLOR } from '../../utils/accountFreshness';
const CARD_W = width * 0.72;

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
  { key: 'TaxCenter',        icon: 'document-text',    label: 'Tax Center',   color: '#0F2952', bg: '#EEF2F9' },
  { key: 'InsuranceManager', icon: 'shield-checkmark', label: 'Insurance',    color: '#2563EB', bg: '#EFF6FF' },
  { key: 'Subscriptions',    icon: 'reload',           label: 'Subscriptions', color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'Assets',           icon: 'briefcase',        label: 'Assets',       color: '#D97706', bg: '#FFFBEB' },
  { key: 'DebtPayoff',       icon: 'trending-down',    label: 'Debt',         color: '#DC2626', bg: '#FEF2F2' },
  { key: 'UtilityTracker',   icon: 'flash',            label: 'Utilities',    color: '#0891B2', bg: '#ECFEFF' },
  { key: 'TaxOrganizer',     icon: 'document-text',    label: 'Tax Organizer', color: '#1A237E', bg: '#E8EAF6' },
  { key: 'ConnectBank',      icon: 'link',             label: 'Connect Bank', color: '#10B981', bg: '#ECFDF5' },
  { key: 'Transactions',     icon: 'list-outline',     label: 'Transactions', color: '#6366F1', bg: '#EEF2FF' },
  { key: 'SpendingInsights', icon: 'pie-chart-outline', label: 'Insights',    color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'ReceiptScanner',   icon: 'camera-outline',   label: 'Scan Receipt', color: '#8B5CF6', bg: '#F5F3FF' },
];

// Mirrors the category/icon/color choices used by the standalone
// BudgetingScreen / BillsScreen / SubscriptionsScreen / AssetsScreen — the
// in-place Budget/Bills/Subs/Assets tabs below write through the same
// store actions those screens use, so staying consistent here means a
// budget/bill/sub/asset looks the same whether it was added from a tab or
// from its dedicated screen.
const BUDGET_COLORS = ['#FF6B6B', '#4ECDC4', '#F5A623', '#27AE60', '#2980B9', '#8E44AD', '#E91E63', '#95A5A6'];
const BUDGET_ICONS = ['restaurant', 'car', 'tv', 'medkit', 'shirt', 'flash', 'home', 'school', 'gift', 'airplane', 'fitness', 'wallet'];
// Maps a Plaid spending category to the budget category it should overlay
// with a live "actual" figure — mirrors BudgetingScreen.tsx's mapping so a
// budget looks the same whether viewed from this tab or that screen.
const PLAID_TO_BUDGET: Record<string, string> = {
  FOOD_AND_DRINK: 'Food',
  SHOPPING: 'Shopping',
  TRANSPORTATION: 'Transport',
  BILLS: 'Bills & Utilities',
};

const BILL_CATEGORIES = ['Housing', 'Utilities', 'Insurance', 'Internet', 'Phone', 'Health', 'Education', 'Subscriptions', 'Other'];
const BILL_CATEGORY_ICONS: Record<string, string> = {
  Housing: 'home', Utilities: 'flash', Insurance: 'shield-checkmark', Internet: 'wifi',
  Phone: 'phone-portrait', Health: 'medical', Education: 'school', Subscriptions: 'reload', Other: 'receipt',
};

const SUB_CATEGORIES = ['Entertainment', 'Music', 'Software', 'News', 'Fitness', 'Education', 'Gaming', 'Other'];
const SUB_ICONS: Record<string, string> = {
  Entertainment: 'tv-outline', Music: 'musical-notes-outline', Software: 'code-slash-outline',
  News: 'newspaper-outline', Fitness: 'fitness-outline', Education: 'school-outline',
  Gaming: 'game-controller-outline', Other: 'apps-outline',
};
const SUB_COLORS: Record<string, string> = {
  Entertainment: '#E74C3C', Music: '#9B59B6', Software: '#2980B9', News: '#E67E22',
  Fitness: '#27AE60', Education: '#16A085', Gaming: '#8E44AD', Other: '#7F8C8D',
};
const BILLING_CYCLES = ['monthly', 'quarterly', 'annual'] as const;

const ASSET_CATEGORIES = ['Real Estate', 'Vehicle', 'Electronics', 'Furniture', 'Jewelry', 'Investments', 'Collectibles', 'Other'];
const ASSET_CATEGORY_ICONS: Record<string, string> = {
  'Real Estate': 'home', 'Vehicle': 'car', 'Electronics': 'laptop', 'Furniture': 'bed',
  'Jewelry': 'diamond', 'Investments': 'trending-up', 'Collectibles': 'star', 'Other': 'cube',
};

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
  const { t } = useTranslation('finance');
  const insets = useSafeAreaInsets();
  const { contentWidth, gridColumns } = useResponsiveLayout();
  const toolColumns = gridColumns(3, 100, 10);
  const toolWidth = (contentWidth - 32 - (toolColumns - 1) * 10) / toolColumns;
  const [activeTab, setActiveTab] = useState('overview');
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('checking');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccInstitution, setNewAccInstitution] = useState('');
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalColor, setNewGoalColor] = useState('#2980B9');
  const [newGoalIcon, setNewGoalIcon] = useState('trophy');

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState('');
  const [newBudgetColor, setNewBudgetColor] = useState(BUDGET_COLORS[0]);
  const [newBudgetIcon, setNewBudgetIcon] = useState(BUDGET_ICONS[0]);

  const [showBillModal, setShowBillModal] = useState(false);
  const [newBillName, setNewBillName] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [newBillCategory, setNewBillCategory] = useState(BILL_CATEGORIES[0]);
  const [newBillDueDays, setNewBillDueDays] = useState('14');
  const [newBillAutoPay, setNewBillAutoPay] = useState(false);

  const [showSubModal, setShowSubModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');
  const [newSubCategory, setNewSubCategory] = useState(SUB_CATEGORIES[0]);
  const [newSubCycle, setNewSubCycle] = useState<typeof BILLING_CYCLES[number]>('monthly');

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetValue, setNewAssetValue] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState(ASSET_CATEGORIES[0]);

  // Live Plaid-derived data — same services the standalone Budgeting/Bills/
  // Subscriptions/Assets screens use, so connecting a bank once keeps all
  // of these tabs in sync, not just the ones you happen to visit directly.
  const [plaidActuals, setPlaidActuals] = useState<Record<string, number>>({});
  const [detectedBills, setDetectedBills] = useState<DetectedBill[]>([]);
  const [detectedBillsLoading, setDetectedBillsLoading] = useState(false);
  const [detectedSubs, setDetectedSubs] = useState<DetectedSubscription[]>([]);
  const [dismissedSubMerchants, setDismissedSubMerchants] = useState<Set<string>>(new Set());
  const [investmentAccounts, setInvestmentAccounts] = useState<PlaidInvestmentAccount[]>([]);

  const {
    accounts, transactions, budgets, bills, subscriptions, financialGoals,
    totalNetWorth: accountsNetWorth, monthlyIncome, monthlyExpenses, monthlySavings,
    addAccount, updateAccount, deleteAccount, deleteTransaction, addFinancialGoal, addBudget, addBill, markBillPaid, addSubscription, deleteSubscription,
    isLoaded: isFinanceLoaded, fetchFromServer: fetchFinance,
  } = useFinanceStore();

  useEffect(() => {
    if (!isFinanceLoaded) fetchFinance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const {
    assets, addAsset, updateAsset, deleteAsset,
    fetchFromServer: fetchOps,
  } = useOperationsStore();

  // Always re-fetch on mount rather than gating on isLoaded — that flag is
  // persisted from before assets were backend-synced, so on an existing
  // install it would stay stuck "true" forever and this screen would never
  // pick up the real (server-authoritative) list, leaving old local-only
  // entries displayed indefinitely.
  useEffect(() => {
    fetchOps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The real single-source-of-truth total (accounts + wealth entries +
  // physical assets − debts), not just Plaid account balances — see
  // useTotalNetWorth.ts for why this replaced three separately-computed
  // "net worth" figures across different Finance screens.
  const totalNetWorth = useTotalNetWorth();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshPlaidAccounts = useCallback(async () => {
    try {
      const res = await getAccounts();
      setPlaidAccounts(res.accounts);
    } catch {
      // no backend / not connected — leave last-known state as-is
    }
  }, []);

  const refreshBudgetActuals = useCallback(async () => {
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await getSpendingByCategory(month);
      const map: Record<string, number> = {};
      for (const item of res.categories) {
        const budgetCat = PLAID_TO_BUDGET[item.category];
        if (budgetCat) map[budgetCat] = (map[budgetCat] ?? 0) + item.total;
      }
      setPlaidActuals(map);
    } catch {
      // silent
    }
  }, []);

  const refreshDetectedBills = useCallback(async () => {
    setDetectedBillsLoading(true);
    try {
      const res = await getDetectedBills();
      setDetectedBills(res.bills);
    } catch {
      // silent
    } finally {
      setDetectedBillsLoading(false);
    }
  }, []);

  const refreshDetectedSubs = useCallback(async () => {
    try {
      const res = await getDetectedSubscriptions();
      setDetectedSubs(res.subscriptions);
    } catch {
      // silent
    }
  }, []);

  const refreshInvestmentAccounts = useCallback(async () => {
    try {
      const res = await getInvestmentAccounts();
      setInvestmentAccounts(res.accounts);
    } catch {
      // silent
    }
  }, []);

  // Guards the focus-triggered refetch below with a short TTL — switching
  // tabs (Home -> Finance -> Tasks -> Finance) used to re-fire all 5 Plaid
  // calls on every single focus with no staleness check. Pull-to-refresh and
  // the reactive bank-connect/sync trigger both pass force=true and always
  // hit the network regardless of this TTL.
  const lastRefreshedAt = useRef(0);
  const STALE_TTL_MS = 60_000;

  const refreshAllPlaidData = useCallback(async (force = false) => {
    if (!force && Date.now() - lastRefreshedAt.current < STALE_TTL_MS) return;
    lastRefreshedAt.current = Date.now();
    await Promise.all([
      refreshPlaidAccounts(),
      refreshBudgetActuals(),
      refreshDetectedBills(),
      refreshDetectedSubs(),
      refreshInvestmentAccounts(),
    ]);
  }, [refreshPlaidAccounts, refreshBudgetActuals, refreshDetectedBills, refreshDetectedSubs, refreshInvestmentAccounts]);

  // Refetches every time this screen gains focus — not just on first
  // mount — so reconnecting a bank, adding something via receipt scan or
  // another screen, or simply switching back to the Finance tab shows
  // current data instead of a stale snapshot from app launch, as long as
  // the last refresh wasn't within the TTL above.
  useFocusEffect(
    useCallback(() => {
      refreshAllPlaidData();
    }, [refreshAllPlaidData])
  );

  // Also refetch reactively whenever a bank connects or finishes syncing —
  // covers connecting a bank from within this same screen session, where
  // the focus effect above wouldn't otherwise re-fire. Forced — a real sync
  // event just happened, so the TTL shouldn't suppress it.
  usePlaidAutoData(useCallback(() => refreshAllPlaidData(true), [refreshAllPlaidData]));

  const handlePullRefresh = async () => {
    setIsRefreshing(true);
    await refreshAllPlaidData(true);
    setIsRefreshing(false);
  };

  // Real 30-day net worth trend, approximated from real transactions
  // (income minus expense/investment outflow in the window) rather than a
  // hardcoded "+2.4% this month" — the previous number didn't move no
  // matter what the user's actual accounts/transactions looked like.
  // Baselined off accounts-only net worth (not the unified total) since
  // transactions only explain account-balance flows, not changes in wealth
  // entries or physical asset values.
  const netWorthTrend = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const netChange = transactions
      .filter((t) => new Date(t.date).getTime() >= thirtyDaysAgo)
      .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0);
    const priorNetWorth = accountsNetWorth - netChange;
    const pct = priorNetWorth !== 0 ? (netChange / Math.abs(priorNetWorth)) * 100 : 0;
    return { amount: netChange, pct };
  }, [transactions, accountsNetWorth]);

  const plaidNetWorth = plaidAccounts.reduce((sum, acc) => {
    if (acc.accountType === 'credit') return sum - acc.balance;
    return sum + acc.balance;
  }, 0);

  const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;
  const overdueBills = bills.filter((b) => b.status === 'overdue');
  const fh = useFinancialHealth();

  // Real per-tab header stats — computed from the same store data the
  // panels below render, not separate hardcoded numbers, so the hero and
  // the list underneath it can never disagree.
  const totalBudgeted = useMemo(() => budgets.reduce((sum, b) => sum + b.monthlyLimit, 0), [budgets]);
  // Uses the live Plaid "actual" for a category when one's available (same
  // effectiveSpent logic as BudgetingScreen.tsx), falling back to the
  // manually-tracked budget.spent otherwise — so this total always matches
  // what the Budget tab's rows show underneath it.
  const totalBudgetSpent = useMemo(() => budgets.reduce((sum, b) => sum + (plaidActuals[b.category] ?? b.spent), 0), [budgets, plaidActuals]);
  const budgetRemaining = totalBudgeted - totalBudgetSpent;
  const budgetPctUsed = totalBudgeted > 0 ? Math.round((totalBudgetSpent / totalBudgeted) * 100) : 0;

  const billsUpcoming = useMemo(() => bills.filter((b) => b.status === 'upcoming' || b.status === 'due_soon'), [bills]);
  const billsOverdueTotal = useMemo(() => overdueBills.reduce((sum, b) => sum + b.amount, 0), [overdueBills]);
  const billsUpcomingTotal = useMemo(() => billsUpcoming.reduce((sum, b) => sum + b.amount, 0), [billsUpcoming]);
  const billsPaidTotal = useMemo(() => bills.filter((b) => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0), [bills]);

  const activeSubs = useMemo(() => subscriptions.filter((sub) => sub.isActive), [subscriptions]);
  const subsMonthlyTotal = useMemo(() => activeSubs.reduce((sum, sub) => {
    const monthly = sub.billingCycle === 'monthly' ? sub.amount : sub.billingCycle === 'quarterly' ? sub.amount / 3 : sub.amount / 12;
    return sum + monthly;
  }, 0), [activeSubs]);
  const subsHighest = useMemo(() => activeSubs.reduce<Subscription | null>((max, sub) => (!max || sub.amount > max.amount ? sub : max), null), [activeSubs]);
  const subsNext = useMemo(() => activeSubs.reduce<Subscription | null>((soonest, sub) => (
    !soonest || new Date(sub.nextBillingDate).getTime() < new Date(soonest.nextBillingDate).getTime() ? sub : soonest
  ), null), [activeSubs]);
  const subsNextDays = subsNext ? Math.max(0, Math.ceil((new Date(subsNext.nextBillingDate).getTime() - Date.now()) / 86400000)) : null;

  const totalAssetValue = useMemo(() => assets.reduce((sum, a) => sum + a.value, 0), [assets]);
  const assetsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    assets.forEach((a) => map.set(a.category, (map.get(a.category) ?? 0) + a.value));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [assets]);

  const visibleDetectedSubs = useMemo(
    () => detectedSubs.filter((d) => !dismissedSubMerchants.has(d.merchantName)),
    [detectedSubs, dismissedSubMerchants],
  );
  const availableInvestmentAccounts = useMemo(
    () => investmentAccounts.filter((acct) => !assets.some((a) => a.name === acct.name)),
    [investmentAccounts, assets],
  );

  const heroContent = useMemo(() => {
    switch (activeTab) {
      case 'budget':
        return {
          label: 'TOTAL BUDGETED', value: totalBudgeted,
          trendText: `${budgetPctUsed}% used this month`,
          stats: [
            { label: 'Spent',      value: `$${totalBudgetSpent.toLocaleString()}`, color: '#F87171', icon: 'trending-up' },
            { label: 'Remaining',  value: `$${Math.max(0, budgetRemaining).toLocaleString()}`, color: '#34D399', icon: 'wallet' },
            { label: 'Categories', value: `${budgets.length}`, color: '#A78BFA', icon: 'grid' },
          ],
        };
      case 'bills':
        return {
          label: 'DUE THIS MONTH', value: billsOverdueTotal + billsUpcomingTotal,
          trendText: `${overdueBills.length} overdue · ${billsUpcoming.length} upcoming`,
          stats: [
            { label: 'Overdue',  value: `$${billsOverdueTotal.toLocaleString()}`, color: '#F87171', icon: 'warning' },
            { label: 'Upcoming', value: `$${billsUpcomingTotal.toLocaleString()}`, color: '#FBBF24', icon: 'time' },
            { label: 'Paid',     value: `$${billsPaidTotal.toLocaleString()}`, color: '#34D399', icon: 'checkmark-circle' },
          ],
        };
      case 'subs':
        return {
          label: 'MONTHLY SUBSCRIPTIONS', value: subsMonthlyTotal,
          trendText: subsNext && subsNextDays !== null ? `${activeSubs.length} active · next in ${subsNextDays}d` : `${activeSubs.length} active`,
          stats: [
            { label: 'Active',       value: `${activeSubs.length}`, color: '#34D399', icon: 'repeat' },
            { label: 'Highest',      value: subsHighest ? `$${subsHighest.amount.toLocaleString()}` : '$0', color: '#A78BFA', icon: 'trending-up' },
            { label: 'Next charge',  value: subsNextDays !== null ? `${subsNextDays}d` : '—', color: '#FBBF24', icon: 'calendar' },
          ],
        };
      case 'assets':
        return {
          label: 'TOTAL ASSET VALUE', value: totalAssetValue,
          trendText: `${assets.length} item${assets.length !== 1 ? 's' : ''} tracked`,
          stats: [
            { label: assetsByCategory[0]?.[0] ?? 'Top category',  value: `$${(assetsByCategory[0]?.[1] ?? 0).toLocaleString()}`, color: '#A78BFA', icon: 'pricetag' },
            { label: assetsByCategory[1]?.[0] ?? 'Next category', value: `$${(assetsByCategory[1]?.[1] ?? 0).toLocaleString()}`, color: '#34D399', icon: 'pricetag-outline' },
            { label: 'Items', value: `${assets.length}`, color: '#93C5FD', icon: 'cube' },
          ],
        };
      default:
        return null;
    }
  }, [
    activeTab, totalBudgeted, totalBudgetSpent, budgetRemaining, budgetPctUsed, budgets.length,
    billsOverdueTotal, billsUpcomingTotal, billsPaidTotal, overdueBills.length, billsUpcoming.length,
    subsMonthlyTotal, activeSubs.length, subsHighest, subsNext, subsNextDays,
    totalAssetValue, assets.length, assetsByCategory,
  ]);

  const closeAccountModal = () => {
    setShowAccountModal(false);
    setEditingAccountId(null);
    setNewAccName(''); setNewAccType('checking'); setNewAccBalance(''); setNewAccInstitution('');
  };

  const openEditAccount = (acc: FinancialAccount) => {
    setEditingAccountId(acc.id);
    setNewAccName(acc.name);
    setNewAccType(acc.type);
    setNewAccBalance(String(acc.balance));
    setNewAccInstitution(acc.institution ?? '');
    setShowAccountModal(true);
  };

  const handleSaveAccount = () => {
    if (!newAccName.trim()) return;
    if (editingAccountId) {
      updateAccount(editingAccountId, {
        name: newAccName.trim(), type: newAccType,
        balance: parseFloat(newAccBalance) || 0,
        institution: newAccInstitution.trim() || undefined,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      const openingBalance = parseFloat(newAccBalance) || 0;
      const now = new Date().toISOString();
      addAccount({
        id: generateId(), familyId: useAuthStore.getState().familyId ?? '', name: newAccName.trim(),
        type: newAccType, balance: openingBalance,
        institution: newAccInstitution.trim() || undefined,
        lastUpdated: now, isShared: true,
        openingBalance, openingBalanceDate: now,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeAccountModal();
  };

  const handleDeleteAccount = (acc: FinancialAccount) => {
    Alert.alert(
      `Delete ${acc.name}?`,
      'This removes the account from your dashboard. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            deleteAccount(acc.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleAddGoal = () => {
    if (!newGoalName.trim() || !newGoalTarget.trim()) return;
    addFinancialGoal({
      id: generateId(), familyId: useAuthStore.getState().familyId ?? '', name: newGoalName.trim(),
      targetAmount: parseFloat(newGoalTarget) || 0, savedAmount: 0,
      category: 'Savings', color: newGoalColor, icon: newGoalIcon,
      isCompleted: false, createdAt: new Date().toISOString(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewGoalName(''); setNewGoalTarget(''); setNewGoalColor('#2980B9'); setNewGoalIcon('trophy');
    setShowGoalModal(false);
  };

  const handleAddBudget = () => {
    const limit = parseFloat(newBudgetLimit);
    if (!newBudgetCategory.trim() || isNaN(limit) || limit <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = new Date();
    addBudget({
      id: generateId(), familyId: useAuthStore.getState().familyId ?? '', category: newBudgetCategory.trim(),
      monthlyLimit: limit, spent: 0,
      month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
      color: newBudgetColor, icon: newBudgetIcon,
    });
    setNewBudgetCategory(''); setNewBudgetLimit(''); setNewBudgetColor(BUDGET_COLORS[0]); setNewBudgetIcon(BUDGET_ICONS[0]);
    setShowBudgetModal(false);
  };

  const handleAddBill = () => {
    const amount = parseFloat(newBillAmount);
    if (!newBillName.trim() || isNaN(amount) || amount <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const daysUntil = parseInt(newBillDueDays || '14', 10);
    const dueDate = new Date(Date.now() + daysUntil * 86400000).toISOString();
    const status: Bill['status'] = daysUntil < 0 ? 'overdue' : daysUntil <= 5 ? 'due_soon' : 'upcoming';
    addBill({
      id: generateId(), familyId: useAuthStore.getState().familyId ?? '', name: newBillName.trim(), amount, dueDate,
      category: newBillCategory, status, isAutoPay: newBillAutoPay, isRecurring: true, recurrence: 'monthly',
      icon: BILL_CATEGORY_ICONS[newBillCategory] ?? 'receipt',
    });
    setNewBillName(''); setNewBillAmount(''); setNewBillCategory(BILL_CATEGORIES[0]); setNewBillDueDays('14'); setNewBillAutoPay(false);
    setShowBillModal(false);
  };

  const handleMarkBillPaid = (id: string) => {
    markBillPaid(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddSubscription = () => {
    const amount = parseFloat(newSubAmount);
    if (!newSubName.trim() || isNaN(amount) || amount <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const nextBillingDate = addMonths(new Date(), newSubCycle === 'monthly' ? 1 : newSubCycle === 'quarterly' ? 3 : 12);
    const sub: Subscription = {
      id: generateId(), familyId: useAuthStore.getState().familyId ?? '', name: newSubName.trim(), amount,
      billingCycle: newSubCycle, nextBillingDate: nextBillingDate.toISOString(), category: newSubCategory,
      isActive: true, sharedMembers: [], icon: SUB_ICONS[newSubCategory] ?? 'apps-outline', color: SUB_COLORS[newSubCategory] ?? colors.primary,
    };
    addSubscription(sub);
    setNewSubName(''); setNewSubAmount(''); setNewSubCategory(SUB_CATEGORIES[0]); setNewSubCycle('monthly');
    setShowSubModal(false);
  };

  const handleCancelSubscription = (id: string) => {
    deleteSubscription(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const closeAssetModal = () => {
    setShowAssetModal(false);
    setEditingAssetId(null);
    setNewAssetName(''); setNewAssetValue(''); setNewAssetCategory(ASSET_CATEGORIES[0]);
  };

  const openEditAsset = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setNewAssetName(asset.name);
    setNewAssetValue(String(asset.value));
    setNewAssetCategory(asset.category);
    setShowAssetModal(true);
  };

  const handleSaveAsset = () => {
    const value = parseFloat(newAssetValue);
    if (!newAssetName.trim() || isNaN(value) || value <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editingAssetId) {
      updateAsset(editingAssetId, { name: newAssetName.trim(), category: newAssetCategory, value });
    } else {
      addAsset({
        id: generateId(), familyId: useAuthStore.getState().familyId ?? '', name: newAssetName.trim(),
        category: newAssetCategory, value, createdAt: new Date().toISOString(),
      });
    }
    closeAssetModal();
  };

  const handleAddDetectedBill = (detected: DetectedBill) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const dueDate = new Date(detected.nextDueDate).toISOString();
    const daysUntil = differenceInDays(new Date(detected.nextDueDate), new Date());
    const status: Bill['status'] = daysUntil < 0 ? 'overdue' : daysUntil <= 5 ? 'due_soon' : 'upcoming';
    addBill({
      id: generateId(), familyId: useAuthStore.getState().familyId ?? '', name: detected.merchantName, amount: detected.amount,
      dueDate, category: detected.category, status, isAutoPay: false, isRecurring: true, recurrence: 'monthly',
      icon: BILL_CATEGORY_ICONS[detected.category] ?? 'receipt',
    });
    setDetectedBills((prev) => prev.filter((d) => d.merchantName !== detected.merchantName));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleConfirmDetectedSub = (detected: DetectedSubscription) => {
    confirmSubscription(detected);
    setDismissedSubMerchants((prev) => new Set([...prev, detected.merchantName]));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDismissDetectedSub = (merchantName: string) => {
    setDismissedSubMerchants((prev) => new Set([...prev, merchantName]));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePrefillAssetFromPlaid = (acct: PlaidInvestmentAccount) => {
    setNewAssetName(acct.name);
    setNewAssetCategory('Investments');
    setNewAssetValue(String(acct.balance));
    setShowAssetModal(true);
  };

  const handleTabPress = (key: string) => {
    setActiveTab(key);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const financeToday = format(new Date(), 'EEEE, MMM d');
  const financeHour = new Date().getHours();
  const financeGreeting = financeHour < 12 ? 'Good morning' : financeHour < 17 ? 'Good afternoon' : 'Good evening';

  const financeHeader = (
    <LinearGradient
      colors={['#020810', '#071628', '#0A1E3D', '#0F2D56']}
      start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }}
      style={[s.header, { paddingTop: insets.top + 10 }]}
    >
      {/* Decorative orbs */}
      <View style={s.glow1} />
      <View style={s.glow2} />

      {/* Greeting + actions */}
      <View style={s.headerTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerGreeting}>{financeGreeting}</Text>
          <Text style={s.netWorthLabel}>TOTAL NET WORTH</Text>
          <Text style={s.netWorthValue}>
            ${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <View style={s.trendRow}>
            <View style={s.trendPill}>
              <Ionicons name={netWorthTrend.amount >= 0 ? 'trending-up' : 'trending-down'} size={12} color={netWorthTrend.amount >= 0 ? '#34D399' : '#F87171'} />
              <Text style={[s.trendPillText, { color: netWorthTrend.amount >= 0 ? '#34D399' : '#F87171' }]}>
                {netWorthTrend.pct >= 0 ? '+' : ''}{netWorthTrend.pct.toFixed(1)}% this month
              </Text>
            </View>
            <View style={s.datePill}>
              <Ionicons name="calendar-outline" size={10} color="rgba(255,255,255,0.6)" />
              <Text style={s.datePillText}>{financeToday}</Text>
            </View>
          </View>
        </View>
        {overdueBills.length > 0 && (
          <Pressable accessibilityRole="button" onPress={() => handleTabPress('bills')} style={s.urgentPill}>
            <Ionicons name="warning" size={12} color="#fff" />
            <Text style={s.urgentPillText}>{overdueBills.length} overdue</Text>
          </Pressable>
        )}
      </View>

      {/* Divider */}
      <View style={s.headerDivider} />

      {/* Stats cards */}
      <View style={s.statsStrip}>
        {(activeTab === 'overview'
          ? [
              { label: 'Income',   value: `$${monthlyIncome.toLocaleString()}`,  color: '#34D399', icon: 'arrow-down-circle' },
              { label: 'Expenses', value: `$${monthlyExpenses.toLocaleString()}`, color: '#F87171', icon: 'arrow-up-circle' },
              { label: 'Saved',    value: `${savingsRate}%`,                      color: '#A78BFA', icon: 'shield-checkmark' },
            ]
          : heroContent?.stats ?? []
        ).map((item, i) => (
          <LinearGradient
            key={i}
            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.05)']}
            style={s.statCard}
          >
            <View style={[s.statIconBg, { backgroundColor: item.color + '25' }]}>
              <Ionicons name={item.icon as any} size={15} color={item.color} />
            </View>
            <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </LinearGradient>
        ))}
      </View>

      {/* Tab pill row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabPills}
        contentContainerStyle={{ gap: 6, paddingRight: 16 }}>
        {NAV_TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable accessibilityRole="button" key={tab.key} onPress={() => handleTabPress(tab.key)}
              style={[s.tabPill, active && s.tabPillActive]}>
              <Ionicons name={tab.icon as any} size={13}
                color={active ? colors.primary : 'rgba(255,255,255,0.5)'} />
              <Text style={[s.tabPillText, active && s.tabPillTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );

  const financeCompact = (
    <LinearGradient
      colors={['#020810', '#0A1E3D']}
      start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="wallet" size={14} color="#fff" />
        </View>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>Finance</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>NET WORTH</Text>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: -0.5 }}>
            ${totalNetWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={financeHeader} compactHeader={financeCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView
            contentContainerStyle={[s.body, { paddingTop: contentPaddingTop }]}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={scrollEventThrottle}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handlePullRefresh} tintColor={colors.primary} colors={[colors.primary]} />
            }
          >

        {activeTab === 'overview' && (
        <>
        {/* ── PLAID BANK ACCOUNTS ── */}
        {plaidAccounts.length > 0 && (
          <>
            <View style={s.sectionRow}>
              <View style={s.sectionLeft}>
                <View style={s.sectionDot} />
                <Text style={s.sectionTitle}>Bank Accounts</Text>
                <View style={s.sectionBadge}>
                  <Text style={s.sectionBadgeText}>AUTO-SYNCED</Text>
                </View>
              </View>
              {/* "Linked Balance" not "Net Worth" — this is scoped to just
                  the connected bank accounts, while the header's TOTAL NET
                  WORTH above also includes wealth entries, physical assets,
                  and debts. Both showing "net" on the same screen read as
                  a contradiction otherwise. */}
              <Text style={s.netWorthSmall}>
                Linked Balance: ${plaidNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ConnectBank')} style={s.connectPrompt}>
            <Ionicons name="link" size={20} color="#10B981" />
            <Text style={s.connectPromptText}>Connect your bank to see live balances</Text>
            <Ionicons name="chevron-forward" size={16} color="#10B981" />
          </Pressable>
        )}

        {/* ── ACCOUNTS ── */}
        <View style={s.sectionRow}>
          <View style={s.sectionLeft}>
            <View style={s.sectionDot} />
            <Text style={s.sectionTitle}>Other Accounts</Text>
            <View style={[s.sectionBadge, s.sectionBadgeManual]}>
              <Text style={[s.sectionBadgeText, s.sectionBadgeManualText]}>MANUAL</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => setShowAccountModal(true)} style={s.addBtn}>
            <Ionicons name="add" size={14} color={colors.primary} />
            <Text style={s.addBtnText}>Add</Text>
          </Pressable>
        </View>
        {/* Distinguishes this from Bank Accounts above — without this,
            an empty manual-accounts list right below a real synced one
            reads as a confusing, seemingly-redundant duplicate section. */}
        <Text style={s.sectionSubtitle}>Accounts you add and update yourself — not connected to a bank.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={s.cardsScroll} contentContainerStyle={s.cardsContent}>
          {accounts.map((acc) => {
            const grad = ACCOUNT_GRADIENTS[acc.type] ?? ACCOUNT_GRADIENTS.checking;
            const hasPendingLedgerActivity = false; // per-account pending state loads on AccountDetail; dashboard uses date-only freshness
            const freshness = balanceFreshness(acc.type, acc.lastVerifiedAt ?? acc.openingBalanceDate, hasPendingLedgerActivity);
            return (
              <Pressable accessibilityRole="button" key={acc.id} onPress={() => navigation.navigate('AccountDetail', { accountId: acc.id })}>
              <LinearGradient colors={grad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.accountCard}>
                {/* Shimmer stripe */}
                <View style={s.cardShimmer} />
                {/* Top row */}
                <View style={s.cardTopRow}>
                  <View style={s.cardChip}>
                    <Text style={s.cardChipText}>{acc.type.toUpperCase()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pressable accessibilityRole="button" onPress={() => openEditAccount(acc)} style={s.cardActionBtn} hitSlop={8}>
                      <Ionicons name="pencil" size={14} color="rgba(255,255,255,0.9)" />
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => handleDeleteAccount(acc)} style={s.cardActionBtn} hitSlop={8}>
                      <Ionicons name="trash" size={14} color="rgba(255,255,255,0.9)" />
                    </Pressable>
                    <View style={s.cardIconWrap}>
                      <Ionicons name={(ACCOUNT_ICONS[acc.type] ?? 'card') as any} size={18} color="rgba(255,255,255,0.9)" />
                    </View>
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
                {/* Balance freshness */}
                <View style={s.freshnessRow}>
                  <View style={[s.freshnessDot, { backgroundColor: FRESHNESS_COLOR[freshness] }]} />
                  <Text style={s.freshnessText}>{FRESHNESS_LABEL[freshness]}</Text>
                </View>
              </LinearGradient>
              </Pressable>
            );
          })}

          {/* Add card */}
          <Pressable accessibilityRole="button" onPress={() => setShowAccountModal(true)} style={s.addCard}>
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
          <Pressable accessibilityRole="button" onPress={() => handleTabPress('budget')}>
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
          <Pressable accessibilityRole="button" onPress={() => setShowGoalModal(true)}>
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
          <Pressable accessibilityRole="button" onPress={() => setShowAllTransactions(true)}><Text style={s.seeAll}>See All →</Text></Pressable>
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
            <Pressable accessibilityRole="button" key={tool.key} onPress={() => navigation.navigate(tool.key)}
              style={({ pressed }) => [s.toolCard, { width: toolWidth }, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}>
              <View style={[s.toolIconWrap, { backgroundColor: tool.bg }]}>
                <Ionicons name={tool.icon as any} size={24} color={tool.color} />
              </View>
              <Text style={[s.toolLabel, { color: tool.color }]}>{tool.label}</Text>
            </Pressable>
          ))}
        </View>
        </>
        )}

        {/* ── BUDGET TAB ── */}
        {activeTab === 'budget' && (
          <>
            <View style={s.sectionRow}>
              <View style={s.sectionLeft}>
                <View style={s.sectionDot} />
                <Text style={s.sectionTitle}>All Budgets</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setShowBudgetModal(true)} style={s.addBtn}>
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text style={s.addBtnText}>Add</Text>
              </Pressable>
            </View>
            {budgets.length === 0 && (
              <Text style={s.emptyHint}>No budget categories yet. Add one to start tracking.</Text>
            )}
            {budgets.map((budget) => {
              const plaidActual = plaidActuals[budget.category];
              const effectiveSpent = plaidActual !== undefined ? plaidActual : budget.spent;
              const ratio = budget.monthlyLimit > 0 ? effectiveSpent / budget.monthlyLimit : 0;
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
                          <Text style={{ color: ratio > 0.9 ? '#EF4444' : s.budgetAmt.color }}>${effectiveSpent.toFixed(0)}</Text>
                          <Text style={s.budgetOf}> / ${budget.monthlyLimit}</Text>
                        </Text>
                      </View>
                      <View style={s.budgetBarRow}>
                        <ProgressBar progress={ratio} color={barColor} height={7} style={{ flex: 1, borderRadius: 4 }} />
                        <View style={[s.pctBadge, { backgroundColor: barColor + '1A' }]}>
                          <Text style={[s.pctBadgeText, { color: barColor }]}>{pct}%</Text>
                        </View>
                      </View>
                      <Text style={s.budgetLeft}>${(budget.monthlyLimit - effectiveSpent).toFixed(0)} remaining</Text>
                      {plaidActual !== undefined && (
                        <Text style={[s.budgetActualLabel, { color: barColor }]}>Live from bank: ${plaidActual.toFixed(2)}</Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ── BILLS TAB ── */}
        {activeTab === 'bills' && (
          <>
            {(detectedBillsLoading || detectedBills.length > 0) && (
              <View style={s.smartBanner}>
                <View style={s.smartBannerHeader}>
                  <Ionicons name="sparkles" size={16} color="#4A90D9" />
                  <Text style={s.smartBannerTitle}>Detected from your bank</Text>
                  {detectedBillsLoading && <ActivityIndicator size="small" color="#4A90D9" style={{ marginLeft: 6 }} />}
                </View>
                {detectedBills.map((d) => (
                  <View key={d.merchantName} style={s.detectedRow}>
                    <View style={s.detectedIcon}>
                      <Ionicons name={(BILL_CATEGORY_ICONS[d.category] ?? 'receipt') as any} size={16} color="#4A90D9" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={s.detectedName}>{d.merchantName}</Text>
                      <Text style={s.detectedMeta}>Due {d.nextDueDate} · ${d.amount.toFixed(2)}</Text>
                    </View>
                    <Pressable accessibilityRole="button" style={s.detectedAddBtn} onPress={() => handleAddDetectedBill(d)}>
                      <Ionicons name="add" size={14} color="#fff" />
                      <Text style={s.detectedAddBtnText}>Add</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={s.sectionRow}>
              <View style={s.sectionLeft}>
                <View style={s.sectionDot} />
                <Text style={s.sectionTitle}>All Bills</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setShowBillModal(true)} style={s.addBtn}>
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text style={s.addBtnText}>Add</Text>
              </Pressable>
            </View>
            {bills.length === 0 && <Text style={s.emptyHint}>No bills tracked yet.</Text>}
            {bills.map((bill) => {
              const statusColor = bill.status === 'overdue' ? '#EF4444' : bill.status === 'due_soon' ? '#F59E0B' : bill.status === 'paid' ? '#10B981' : colors.textSecondary;
              const statusLabel = bill.status === 'overdue' ? 'Overdue' : bill.status === 'due_soon' ? 'Due soon' : bill.status === 'paid' ? 'Paid' : 'Upcoming';
              return (
                <View key={bill.id} style={s.finRow}>
                  <View style={[s.finIconWrap, { backgroundColor: statusColor + '18' }]}>
                    <Ionicons name={(bill.icon ?? 'receipt') as any} size={20} color={statusColor} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.finName}>{bill.name}</Text>
                    <Text style={[s.finMeta, { color: statusColor }]}>
                      {statusLabel} · {format(new Date(bill.dueDate), 'MMM d')} · ${bill.amount.toLocaleString()}
                    </Text>
                  </View>
                  {bill.status !== 'paid' && (
                    <Pressable accessibilityRole="button" onPress={() => handleMarkBillPaid(bill.id)} style={s.finActionBtn}>
                      <Text style={s.finActionBtnText}>Mark paid</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* ── SUBS TAB ── */}
        {activeTab === 'subs' && (
          <>
            {visibleDetectedSubs.length > 0 && (
              <View style={s.smartBanner}>
                <View style={s.smartBannerHeader}>
                  <Ionicons name="sparkles" size={16} color="#4A90D9" />
                  <Text style={s.smartBannerTitle}>Detected from your bank</Text>
                </View>
                {visibleDetectedSubs.map((d) => (
                  <View key={d.merchantName} style={s.detectedRow}>
                    <View style={s.detectedIcon}>
                      <Ionicons name="apps-outline" size={16} color="#4A90D9" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={s.detectedName}>{d.merchantName}</Text>
                      <Text style={s.detectedMeta}>${d.amount.toFixed(2)} / {d.frequency}</Text>
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => handleDismissDetectedSub(d.merchantName)} style={s.detectedDismissBtn}>
                      <Ionicons name="close" size={14} color={colors.textMuted} />
                    </Pressable>
                    <Pressable accessibilityRole="button" style={s.detectedAddBtn} onPress={() => handleConfirmDetectedSub(d)}>
                      <Ionicons name="add" size={14} color="#fff" />
                      <Text style={s.detectedAddBtnText}>Add</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={s.sectionRow}>
              <View style={s.sectionLeft}>
                <View style={s.sectionDot} />
                <Text style={s.sectionTitle}>Subscriptions</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setShowSubModal(true)} style={s.addBtn}>
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text style={s.addBtnText}>Add</Text>
              </Pressable>
            </View>
            {subscriptions.length === 0 && <Text style={s.emptyHint}>No subscriptions tracked yet.</Text>}
            {subscriptions.map((sub) => (
              <View key={sub.id} style={s.finRow}>
                <View style={[s.finIconWrap, { backgroundColor: (sub.color ?? colors.primary) + '18' }]}>
                  <Ionicons name={(sub.icon ?? 'apps-outline') as any} size={20} color={sub.color ?? colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.finName}>{sub.name}</Text>
                  <Text style={s.finMeta}>
                    ${sub.amount.toLocaleString()} / {sub.billingCycle} · Renews {format(new Date(sub.nextBillingDate), 'MMM d')}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => handleCancelSubscription(sub.id)} style={s.finCancelBtn}>
                  <Text style={s.finCancelBtnText}>Cancel</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        {/* ── ASSETS TAB ── */}
        {activeTab === 'assets' && (
          <>
            {availableInvestmentAccounts.length > 0 && (
              <View style={s.plaidLinkCard}>
                <View style={s.plaidLinkHeader}>
                  <Ionicons name="link" size={16} color="#8E44AD" />
                  <Text style={s.plaidLinkTitle}>Link Plaid Accounts</Text>
                </View>
                <Text style={s.plaidLinkSub}>
                  {availableInvestmentAccounts.length} investment account{availableInvestmentAccounts.length > 1 ? 's' : ''} found
                </Text>
                {availableInvestmentAccounts.map((acct) => (
                  <View key={acct.plaidAccountId} style={s.plaidLinkRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.finName}>{acct.name}</Text>
                      {acct.mask && <Text style={s.finMeta}>••••{acct.mask}</Text>}
                    </View>
                    <Text style={[s.finValueText, { marginRight: 10 }]}>
                      ${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                    <Pressable accessibilityRole="button" style={s.detectedAddBtn} onPress={() => handlePrefillAssetFromPlaid(acct)}>
                      <Ionicons name="add" size={14} color="#fff" />
                      <Text style={s.detectedAddBtnText}>Import</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={s.sectionRow}>
              <View style={s.sectionLeft}>
                <View style={s.sectionDot} />
                <Text style={s.sectionTitle}>Assets</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setShowAssetModal(true)} style={s.addBtn}>
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text style={s.addBtnText}>Add</Text>
              </Pressable>
            </View>
            {assets.length === 0 && <Text style={s.emptyHint}>No assets tracked yet.</Text>}
            {assets.map((asset) => (
              <View key={asset.id} style={s.finRow}>
                <View style={[s.finIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name={(ASSET_CATEGORY_ICONS[asset.category] ?? 'cube') as any} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.finName}>{asset.name}</Text>
                  <Text style={s.finMeta}>{asset.category}</Text>
                </View>
                <Text style={s.finValueText}>${asset.value.toLocaleString()}</Text>
                <Pressable accessibilityRole="button" hitSlop={8} style={{ marginLeft: 10 }} onPress={() => openEditAsset(asset)}>
                  <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
                </Pressable>
                <Pressable accessibilityRole="button"
                  hitSlop={8}
                  style={{ marginLeft: 10 }}
                  onPress={() => {
                    Alert.alert(`Delete ${asset.name}?`, 'This cannot be undone.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteAsset(asset.id) },
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </>
        )}

          </ScrollView>
        )}
      </CollapsibleHeader>

      {/* ── RECEIPT SCANNER FAB ── */}
      <Pressable accessibilityRole="button"
        onPress={() => navigation.navigate('ReceiptScanner')}
        style={({ pressed }) => [s.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.94 }] }]}
      >
        <Ionicons name="camera" size={26} color="#fff" />
      </Pressable>

      {/* ── ADD/EDIT ACCOUNT MODAL ── */}
      <Modal visible={showAccountModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeAccountModal}>
        <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>{editingAccountId ? 'Edit Account' : 'Add Account'}</Text>
          <Text style={s.modalLabel}>Account Name *</Text>
          <TextInput accessibilityLabel="e.g. Chase Checking" style={s.modalInput} placeholder="e.g. Chase Checking" value={newAccName} onChangeText={setNewAccName} placeholderTextColor={colors.textMuted} autoFocus />
          <Text style={s.modalLabel}>Account Type</Text>
          <View style={s.typeGrid}>
            {ACCOUNT_TYPES.map((t) => (
              <Pressable accessibilityRole="button" key={t} onPress={() => setNewAccType(t)} style={[s.typeChip, newAccType === t && s.typeChipActive]}>
                <Text style={[s.typeChipText, newAccType === t && s.typeChipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.modalLabel}>Current Balance ($)</Text>
          <TextInput accessibilityLabel="0.00" style={s.modalInput} placeholder="0.00" value={newAccBalance} onChangeText={setNewAccBalance} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
          <Text style={s.modalLabel}>Institution (optional)</Text>
          <TextInput accessibilityLabel="e.g. Chase, Fidelity" style={[s.modalInput, { marginBottom: 24 }]} placeholder="e.g. Chase, Fidelity" value={newAccInstitution} onChangeText={setNewAccInstitution} placeholderTextColor={colors.textMuted} />
          <Button title={editingAccountId ? 'Save Changes' : 'Add Account'} onPress={handleSaveAccount} fullWidth size="lg" disabled={!newAccName.trim()} />
          <Button title="Cancel" onPress={closeAccountModal} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>

      {/* ── ALL TRANSACTIONS MODAL ── */}
      <Modal visible={showAllTransactions} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAllTransactions(false)}>
        <View style={s.modal}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>All Transactions</Text>
          <FlatList
            data={[...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
            keyExtractor={(tx) => tx.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={<Text style={s.emptyHint}>No transactions yet.</Text>}
            renderItem={({ item: tx }) => {
              const isIncome = tx.type === 'income';
              const isExpense = tx.type === 'expense';
              const dotColor = isIncome ? '#10B981' : isExpense ? '#EF4444' : colors.primary;
              return (
                <View style={[s.txRow, s.txBorder]}>
                  <View style={[s.txIconCircle, { backgroundColor: dotColor + '15' }]}>
                    <Ionicons
                      name={(isIncome ? 'arrow-down-circle' : isExpense ? 'arrow-up-circle' : 'swap-horizontal') as any}
                      size={20} color={dotColor}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
                    <Text style={s.txMeta}>{tx.category} · {format(new Date(tx.date), 'MMM d, yyyy')}</Text>
                  </View>
                  <Text style={[s.txAmount, { color: dotColor, marginRight: 10 }]}>
                    {isIncome ? '+' : isExpense ? '-' : ''}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                  <Pressable accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => {
                      Alert.alert('Delete Transaction?', 'This cannot be undone.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(tx.id) },
                      ]);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              );
            }}
          />
          <Button title="Close" onPress={() => setShowAllTransactions(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </View>
      </Modal>

      {/* ── ADD GOAL MODAL ── */}
      <Modal visible={showGoalModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGoalModal(false)}>
        <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Add Financial Goal</Text>
          <Text style={s.modalLabel}>Goal Name *</Text>
          <TextInput accessibilityLabel="e.g. Emergency Fund" style={s.modalInput} placeholder="e.g. Emergency Fund" value={newGoalName} onChangeText={setNewGoalName} placeholderTextColor={colors.textMuted} autoFocus />
          <Text style={s.modalLabel}>Target Amount ($) *</Text>
          <TextInput accessibilityLabel="10000" style={s.modalInput} placeholder="10000" value={newGoalTarget} onChangeText={setNewGoalTarget} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
          <Text style={s.modalLabel}>Icon</Text>
          <View style={s.iconGrid}>
            {GOAL_ICONS.map((icon) => (
              <Pressable accessibilityRole="button" key={icon} onPress={() => setNewGoalIcon(icon)}
                style={[s.iconBtn, newGoalIcon === icon && { backgroundColor: newGoalColor, borderColor: 'transparent' }]}>
                <Ionicons name={icon as any} size={22} color={newGoalIcon === icon ? '#fff' : colors.textSecondary} />
              </Pressable>
            ))}
          </View>
          <Text style={s.modalLabel}>Color</Text>
          <View style={[s.colorRow, { marginBottom: 24 }]}>
            {GOAL_COLORS.map((c) => (
              <Pressable accessibilityRole="button" key={c} onPress={() => setNewGoalColor(c)}
                style={[s.colorSwatch, { backgroundColor: c }, newGoalColor === c && s.colorSwatchSelected]} />
            ))}
          </View>
          <Button title="Add Goal" onPress={handleAddGoal} fullWidth size="lg" disabled={!newGoalName.trim() || !newGoalTarget.trim()} />
          <Button title="Cancel" onPress={() => setShowGoalModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>

      {/* ── ADD BUDGET MODAL ── */}
      <Modal visible={showBudgetModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBudgetModal(false)}>
        <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Add Budget Category</Text>
          <Text style={s.modalLabel}>Category Name *</Text>
          <TextInput accessibilityLabel="e.g. Groceries" style={s.modalInput} placeholder="e.g. Groceries" value={newBudgetCategory} onChangeText={setNewBudgetCategory} placeholderTextColor={colors.textMuted} autoFocus />
          <Text style={s.modalLabel}>Monthly Limit ($) *</Text>
          <TextInput accessibilityLabel="500" style={s.modalInput} placeholder="500" value={newBudgetLimit} onChangeText={setNewBudgetLimit} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
          <Text style={s.modalLabel}>Icon</Text>
          <View style={s.iconGrid}>
            {BUDGET_ICONS.map((icon) => (
              <Pressable accessibilityRole="button" key={icon} onPress={() => setNewBudgetIcon(icon)}
                style={[s.iconBtn, newBudgetIcon === icon && { backgroundColor: newBudgetColor, borderColor: 'transparent' }]}>
                <Ionicons name={icon as any} size={22} color={newBudgetIcon === icon ? '#fff' : colors.textSecondary} />
              </Pressable>
            ))}
          </View>
          <Text style={s.modalLabel}>Color</Text>
          <View style={[s.colorRow, { marginBottom: 24 }]}>
            {BUDGET_COLORS.map((c) => (
              <Pressable accessibilityRole="button" key={c} onPress={() => setNewBudgetColor(c)}
                style={[s.colorSwatch, { backgroundColor: c }, newBudgetColor === c && s.colorSwatchSelected]} />
            ))}
          </View>
          <Button title="Add Budget" onPress={handleAddBudget} fullWidth size="lg" disabled={!newBudgetCategory.trim() || !newBudgetLimit.trim()} />
          <Button title="Cancel" onPress={() => setShowBudgetModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>

      {/* ── ADD BILL MODAL ── */}
      <Modal visible={showBillModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBillModal(false)}>
        <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Add Bill</Text>
          <Text style={s.modalLabel}>Bill Name *</Text>
          <TextInput accessibilityLabel="e.g. Electric Bill" style={s.modalInput} placeholder="e.g. Electric Bill" value={newBillName} onChangeText={setNewBillName} placeholderTextColor={colors.textMuted} autoFocus />
          <Text style={s.modalLabel}>Amount ($) *</Text>
          <TextInput accessibilityLabel="145.00" style={s.modalInput} placeholder="145.00" value={newBillAmount} onChangeText={setNewBillAmount} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
          <Text style={s.modalLabel}>Category</Text>
          <View style={s.typeGrid}>
            {BILL_CATEGORIES.map((c) => (
              <Pressable accessibilityRole="button" key={c} onPress={() => setNewBillCategory(c)} style={[s.typeChip, newBillCategory === c && s.typeChipActive]}>
                <Text style={[s.typeChipText, newBillCategory === c && s.typeChipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.modalLabel}>Due In (days)</Text>
          <TextInput accessibilityLabel="14" style={s.modalInput} placeholder="14" value={newBillDueDays} onChangeText={setNewBillDueDays} keyboardType="number-pad" placeholderTextColor={colors.textMuted} />
          <Pressable accessibilityRole="button" onPress={() => setNewBillAutoPay(!newBillAutoPay)} style={s.autoPayRow}>
            <Ionicons name={newBillAutoPay ? 'checkbox' : 'square-outline'} size={22} color={newBillAutoPay ? colors.primary : colors.textMuted} />
            <Text style={s.autoPayText}>Auto-pay enabled</Text>
          </Pressable>
          <Button title="Add Bill" onPress={handleAddBill} fullWidth size="lg" disabled={!newBillName.trim() || !newBillAmount.trim()} style={{ marginTop: 20 }} />
          <Button title="Cancel" onPress={() => setShowBillModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>

      {/* ── ADD SUBSCRIPTION MODAL ── */}
      <Modal visible={showSubModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSubModal(false)}>
        <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Add Subscription</Text>
          <Text style={s.modalLabel}>Name *</Text>
          <TextInput accessibilityLabel="e.g. Netflix" style={s.modalInput} placeholder="e.g. Netflix" value={newSubName} onChangeText={setNewSubName} placeholderTextColor={colors.textMuted} autoFocus />
          <Text style={s.modalLabel}>Amount ($) *</Text>
          <TextInput accessibilityLabel="15.99" style={s.modalInput} placeholder="15.99" value={newSubAmount} onChangeText={setNewSubAmount} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
          <Text style={s.modalLabel}>Billing Cycle</Text>
          <View style={s.typeGrid}>
            {BILLING_CYCLES.map((c) => (
              <Pressable accessibilityRole="button" key={c} onPress={() => setNewSubCycle(c)} style={[s.typeChip, newSubCycle === c && s.typeChipActive]}>
                <Text style={[s.typeChipText, newSubCycle === c && s.typeChipTextActive]}>{c.charAt(0).toUpperCase() + c.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.modalLabel}>Category</Text>
          <View style={[s.typeGrid, { marginBottom: 24 }]}>
            {SUB_CATEGORIES.map((c) => (
              <Pressable accessibilityRole="button" key={c} onPress={() => setNewSubCategory(c)} style={[s.typeChip, newSubCategory === c && s.typeChipActive]}>
                <Text style={[s.typeChipText, newSubCategory === c && s.typeChipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <Button title="Add Subscription" onPress={handleAddSubscription} fullWidth size="lg" disabled={!newSubName.trim() || !newSubAmount.trim()} />
          <Button title="Cancel" onPress={() => setShowSubModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>

      {/* ── ADD/EDIT ASSET MODAL ── */}
      <Modal visible={showAssetModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeAssetModal}>
        <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>{editingAssetId ? 'Edit Asset' : 'Add Asset'}</Text>
          <Text style={s.modalLabel}>Asset Name *</Text>
          <TextInput accessibilityLabel="e.g. 2019 Honda Accord" style={s.modalInput} placeholder="e.g. 2019 Honda Accord" value={newAssetName} onChangeText={setNewAssetName} placeholderTextColor={colors.textMuted} autoFocus />
          <Text style={s.modalLabel}>Value ($) *</Text>
          <TextInput accessibilityLabel="18000" style={s.modalInput} placeholder="18000" value={newAssetValue} onChangeText={setNewAssetValue} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
          <Text style={s.modalLabel}>Category</Text>
          <View style={[s.typeGrid, { marginBottom: 24 }]}>
            {ASSET_CATEGORIES.map((c) => (
              <Pressable accessibilityRole="button" key={c} onPress={() => setNewAssetCategory(c)} style={[s.typeChip, newAssetCategory === c && s.typeChipActive]}>
                <Text style={[s.typeChipText, newAssetCategory === c && s.typeChipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <Button title={editingAssetId ? 'Save Changes' : 'Add Asset'} onPress={handleSaveAsset} fullWidth size="lg" disabled={!newAssetName.trim() || !newAssetValue.trim()} />
          <Button title="Cancel" onPress={closeAssetModal} variant="ghost" fullWidth style={{ marginTop: 8 }} />
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
  header: { paddingHorizontal: 16, paddingBottom: 0, overflow: 'hidden' },
  glow1: {
    position: 'absolute', top: -80, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(56,130,255,0.18)',
  },
  glow2: {
    position: 'absolute', bottom: 20, left: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(0,212,170,0.10)',
  },
  headerGreeting: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 0.2, marginBottom: 4 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  netWorthLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  netWorthValue: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1.5 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  trendPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
    paddingVertical: 3, paddingHorizontal: 8,
  },
  trendPillText: { fontSize: 11, fontWeight: '700' },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 3, paddingHorizontal: 8,
  },
  datePillText: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.2 },
  headerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.10)', marginBottom: 12 },
  urgentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EF4444', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  urgentPillText: { fontSize: 11, color: '#fff', fontWeight: '800' },

  /* Stats cards */
  statsStrip: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, alignItems: 'center', gap: 4,
    borderRadius: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  statIconBg: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 12, fontWeight: '900' },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '700', letterSpacing: 0.3 },

  /* Tab pills */
  tabPills: { flexGrow: 0 },
  tabPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 12,
    borderTopLeftRadius: 10, borderTopRightRadius: 10,
  },
  tabPillActive: { backgroundColor: '#F0F3F9' },
  tabPillText: { fontSize: 9.8, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  tabPillTextActive: { color: colors.primary },

  /* ── Body ── */
  body: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 110 },

  /* Section headers */
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 6 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionDot: { width: 4, height: 20, borderRadius: 2, backgroundColor: colors.primary },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0D1B2A' },
  sectionBadge: { backgroundColor: '#D1FAE5', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 7 },
  sectionBadgeText: { fontSize: 9, fontWeight: '800', color: '#059669', letterSpacing: 0.3 },
  sectionBadgeManual: { backgroundColor: '#EDE9FE' },
  sectionBadgeManualText: { color: '#7C3AED' },
  sectionSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: -8, marginBottom: 12 },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '12', borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 10,
  },
  addBtnText: { fontSize: 13, color: colors.primary, fontWeight: '700' },

  /* ── Non-overview tab hero text ── */
  heroTrendText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },

  /* ── In-place Bills / Subs / Assets rows (Budget tab reuses budgetRow below) ── */
  emptyHint: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  finRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, ...SHADOW },
  finIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  finName: { fontSize: 14, fontWeight: '700', color: '#0D1B2A', marginBottom: 3 },
  finMeta: { fontSize: 12, color: colors.textSecondary },
  finActionBtn: { backgroundColor: colors.primary + '12', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12 },
  finActionBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  finCancelBtn: { backgroundColor: '#FEF2F2', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12 },
  finCancelBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  finValueText: { fontSize: 15, fontWeight: '800', color: '#0D1B2A' },
  autoPayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  autoPayText: { fontSize: 14, color: colors.text, fontWeight: '600' },

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
  connectPrompt: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 14, marginBottom: 16,marginTop: 16, borderWidth: 1, borderColor: '#A7F3D0' },
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
    marginLeft: 6,
  },
  cardActionBtn: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 6,
  },
  cardName: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 4 },
  cardBank: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardBalLabel: { fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, marginBottom: 2 },
  cardBalance: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  contactless: { alignItems: 'center', justifyContent: 'center', width: 30, height: 30 },
  contactlessArc: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  cardDots: { fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginTop: 2 },
  freshnessRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  freshnessDot: { width: 6, height: 6, borderRadius: 3 },
  freshnessText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.3 },
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
  budgetActualLabel: { fontSize: 11, fontWeight: '700', marginTop: 3 },

  /* ── Smart detection banners (Plaid-derived bills/subscriptions) ── */
  smartBanner: { backgroundColor: '#EEF5FC', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#CFE3F7' },
  smartBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  smartBannerTitle: { fontSize: 13, fontWeight: '700', color: '#1A5276' },
  detectedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#CFE3F7' },
  detectedIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#D6EAF8', alignItems: 'center', justifyContent: 'center' },
  detectedName: { fontSize: 13, fontWeight: '700', color: '#0D1B2A' },
  detectedMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  detectedAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#4A90D9', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10, marginLeft: 8 },
  detectedAddBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  detectedDismissBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  /* ── Plaid investment account import card (Assets tab) ── */
  plaidLinkCard: { backgroundColor: '#F3E8FD', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E5D0F8' },
  plaidLinkHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  plaidLinkTitle: { fontSize: 13, fontWeight: '700', color: '#8E44AD' },
  plaidLinkSub: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  plaidLinkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E5D0F8' },

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
    position: 'absolute', bottom: 140, right: 20,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
  },

  /* ── Tools ── */
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  toolCard: {
    backgroundColor: '#fff', borderRadius: 18,
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
