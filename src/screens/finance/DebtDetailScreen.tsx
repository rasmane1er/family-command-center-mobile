import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFinanceStore } from '../../store/useFinanceStore';
import { ProgressBar } from '../../components/common/ProgressBar';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { calculatePayoffPlan } from '../../services/debtService';
import type { Debt, DebtType, PayoffPlanMonth } from '../../types';
import { useTranslation } from 'react-i18next';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY = '#1E3A5F';
const ACCENT = '#4A90D9';
const DANGER = '#EF4444';
const SUCCESS = '#10B981';
const BG = '#F5F7FA';
const CARD = '#fff';
const TEXT = '#1A1A2E';
const SUBTEXT = '#6B7280';
const BORDER = '#E5E7EB';

const DEBT_TYPE_ICONS: Record<DebtType, keyof typeof Ionicons.glyphMap> = {
  credit_card: 'card',
  personal_loan: 'cash',
  mortgage: 'home',
  student_loan: 'school',
  auto_loan: 'car',
  medical: 'medkit',
  other: 'wallet',
};

function debtColor(type: DebtType): string {
  const map: Record<DebtType, string> = {
    credit_card: '#EF4444',
    personal_loan: '#F59E0B',
    mortgage: '#3B82F6',
    student_loan: '#8B5CF6',
    auto_loan: '#10B981',
    medical: '#EC4899',
    other: '#6B7280',
  };
  return map[type];
}

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

interface Props {
  navigation: { goBack: () => void };
  route: { params?: { debtId?: string } };
}

export function DebtDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation('finance');
  const insets = useSafeAreaInsets();
  const { debts, recordPayment } = useFinanceStore();
  const debtId = route.params?.debtId ?? '';

  const debt = debts.find((d) => d.id === debtId);

  const plan = useMemo(() => {
    if (!debt) return null;
    const summary = calculatePayoffPlan([debt], 0, 'avalanche');
    return summary.plans[0] ?? null;
  }, [debt]);

  const first12Months: PayoffPlanMonth[] = plan ? plan.months.slice(0, 12) : [];

  if (!debt) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Debt not found.</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const color = debtColor(debt.type);
  const pct = debt.originalBalance > 0
    ? Math.min(1, (debt.originalBalance - debt.balance) / debt.originalBalance)
    : 0;
  const aprPct = Math.round(debt.interestRate * 10000) / 100;
  const totalInterestPaid = plan ? plan.totalInterest : 0;

  // Interest vs principal split over first 12 months
  const totalPrincipal = first12Months.reduce((s, m) => s + m.principal, 0);
  const totalInterest12 = first12Months.reduce((s, m) => s + m.interest, 0);
  const totalYear = totalPrincipal + totalInterest12;
  const principalRatio = totalYear > 0 ? totalPrincipal / totalYear : 0;
  const interestRatio = totalYear > 0 ? totalInterest12 / totalYear : 0;

  const handleMarkPayment = () => {
    Alert.prompt(
      `Record Payment: ${debt.name}`,
      'Enter payment amount:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record',
          onPress: (raw) => {
            const amount = parseFloat(raw ?? '0');
            if (isNaN(amount) || amount <= 0) { Alert.alert('Invalid amount'); return; }
            const today = new Date().toISOString().slice(0, 10);
            recordPayment(debt.id, amount, today);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
      'plain-text',
      String(debt.minimumPayment),
      'decimal-pad',
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={[color, color + 'CC']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <View style={styles.headerMid}>
              <Ionicons name={DEBT_TYPE_ICONS[debt.type]} size={18} color="#fff" />
              <Text style={styles.headerTitle} numberOfLines={1}>{debt.name}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerBalance}>${formatMoney(debt.balance)}</Text>
          <Text style={styles.headerBalanceLabel}>Remaining Balance</Text>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal}>{aprPct.toFixed(2)}%</Text>
              <Text style={styles.headerStatLabel}>APR</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal}>${formatMoney(debt.minimumPayment)}</Text>
              <Text style={styles.headerStatLabel}>Min Payment</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal}>Day {debt.dueDate}</Text>
              <Text style={styles.headerStatLabel}>Due Date</Text>
            </View>
          </View>
        </LinearGradient>
        {/* Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payoff Progress</Text>
          <ProgressBar progress={pct} color={color} height={10} style={styles.progressBar} />
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>${formatMoney(debt.originalBalance - debt.balance)} paid</Text>
            <Text style={styles.progressLabel}>{Math.round(pct * 100)}%</Text>
          </View>
        </View>

        {/* Interest vs Principal */}
        {totalYear > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>12-Month Breakdown</Text>
            <View style={styles.breakdownBar}>
              <View style={[styles.breakdownPrincipal, { flex: principalRatio }]} />
              <View style={[styles.breakdownInterest, { flex: interestRatio }]} />
            </View>
            <View style={styles.breakdownLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: SUCCESS }]} />
                <Text style={styles.legendText}>Principal: ${formatMoney(totalPrincipal)}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: DANGER }]} />
                <Text style={styles.legendText}>Interest: ${formatMoney(totalInterest12)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Payoff info */}
        {plan && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payoff Projection</Text>
            <View style={styles.projRow}>
              <View style={styles.projStat}>
                <Text style={styles.projVal}>{plan.monthsToPayoff}</Text>
                <Text style={styles.projLabel}>months</Text>
              </View>
              <View style={styles.projStat}>
                <Text style={styles.projVal}>{plan.payoffDate}</Text>
                <Text style={styles.projLabel}>payoff date</Text>
              </View>
              <View style={styles.projStat}>
                <Text style={[styles.projVal, { color: DANGER }]}>${formatMoney(Math.round(totalInterestPaid))}</Text>
                <Text style={styles.projLabel}>total interest</Text>
              </View>
            </View>
          </View>
        )}

        {/* Month-by-month table */}
        {first12Months.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Month-by-Month (First 12)</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHead, { flex: 2 }]}>Month</Text>
              <Text style={[styles.tableCell, styles.tableHead]}>Payment</Text>
              <Text style={[styles.tableCell, styles.tableHead]}>Principal</Text>
              <Text style={[styles.tableCell, styles.tableHead]}>Interest</Text>
              <Text style={[styles.tableCell, styles.tableHead]}>Balance</Text>
            </View>
            {first12Months.map((m, i) => (
              <View key={m.month} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{m.month}</Text>
                <Text style={styles.tableCell}>${formatMoney(m.payment)}</Text>
                <Text style={[styles.tableCell, { color: SUCCESS }]}>${formatMoney(m.principal)}</Text>
                <Text style={[styles.tableCell, { color: DANGER }]}>${formatMoney(m.interest)}</Text>
                <Text style={styles.tableCell}>${formatMoney(m.remainingBalance)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Last payment */}
        {debt.lastPaymentDate && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Last Payment</Text>
            <Text style={styles.lastPayText}>
              ${formatMoney(debt.lastPaymentAmount ?? 0)} on {debt.lastPaymentDate}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Mark payment CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={[styles.payBtn, { backgroundColor: color }]} onPress={handleMarkPayment}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.payBtnText}>Mark Payment Made</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: TEXT },
  backLink: { fontSize: 14, color: ACCENT, marginTop: 12 },

  header: { paddingBottom: 8, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headerMid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerBalance: { fontSize: 36, fontWeight: '900', color: '#fff', textAlign: 'center' },
  headerBalanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 2 },
  headerStats: { flexDirection: 'row', marginTop: 16 },
  headerStat: { flex: 1, alignItems: 'center' },
  headerStatVal: { fontSize: 16, fontWeight: '800', color: '#fff' },
  headerStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  headerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },

  content: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: SUBTEXT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  progressBar: { marginBottom: 8 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, color: SUBTEXT },

  breakdownBar: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  breakdownPrincipal: { backgroundColor: SUCCESS },
  breakdownInterest: { backgroundColor: DANGER },
  breakdownLegend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: TEXT, fontWeight: '600' },

  projRow: { flexDirection: 'row' },
  projStat: { flex: 1, alignItems: 'center' },
  projVal: { fontSize: 18, fontWeight: '800', color: TEXT },
  projLabel: { fontSize: 11, color: SUBTEXT, marginTop: 3 },

  tableHeader: { flexDirection: 'row', backgroundColor: BG, borderRadius: 8, paddingVertical: 6, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 6 },
  tableRowEven: { backgroundColor: '#FAFAFA' },
  tableCell: { flex: 1, fontSize: 10, color: TEXT, textAlign: 'right', paddingHorizontal: 2 },
  tableHead: { fontWeight: '700', color: SUBTEXT, fontSize: 10 },

  lastPayText: { fontSize: 15, fontWeight: '600', color: TEXT },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  payBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
