import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useDebtStore } from '../../store/useDebtStore';

const generateId = () => Math.random().toString(36).substring(2, 11);

type DebtType = 'credit_card' | 'student_loan' | 'mortgage' | 'car_loan' | 'personal' | 'medical' | 'other';

const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: 'Credit Card',
  student_loan: 'Student Loan',
  mortgage: 'Mortgage',
  car_loan: 'Car Loan',
  personal: 'Personal',
  medical: 'Medical',
  other: 'Other',
};

const DEBT_TYPE_ICONS: Record<DebtType, string> = {
  credit_card: 'card',
  student_loan: 'school',
  mortgage: 'home',
  car_loan: 'car',
  personal: 'person',
  medical: 'medkit',
  other: 'cash',
};

const DEBT_TYPES: DebtType[] = ['credit_card', 'student_loan', 'mortgage', 'car_loan', 'personal', 'medical', 'other'];

const COLORS = ['#E74C3C', '#2980B9', '#27AE60', '#F5A623', '#8E44AD', '#16A085', '#E67E22', '#2C3E50'];

export function DebtPayoffScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    debts,
    addDebt,
    makePayment,
    deleteDebt,
    getTotalBalance,
    getTotalMinimumPayment,
    getPayoffMonthsAvalanche,
    seedDemoData,
  } = useDebtStore();

  const [activeTab, setActiveTab] = useState<'Overview' | 'Strategy' | 'Timeline'>('Overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extraPayment, setExtraPayment] = useState('0');

  // Add modal state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<DebtType>('credit_card');
  const [newBalance, setNewBalance] = useState('');
  const [newOriginalBalance, setNewOriginalBalance] = useState('');
  const [newInterestRate, setNewInterestRate] = useState('');
  const [newMinPayment, setNewMinPayment] = useState('');
  const [newLender, setNewLender] = useState('');
  const [newDueDay, setNewDueDay] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);

  const totalBalance = getTotalBalance();
  const totalMinimum = getTotalMinimumPayment();
  const extra = parseFloat(extraPayment) || 0;
  const payoffMonths = getPayoffMonthsAvalanche(extra);
  const avgAPR = debts.length > 0
    ? debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length
    : 0;
  const totalInterest = totalBalance * (avgAPR / 100) * (payoffMonths / 12);

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + payoffMonths);

  const sortedAvalanche = [...debts].sort((a, b) => b.interestRate - a.interestRate);
  const sortedSnowball = [...debts].sort((a, b) => a.balance - b.balance);
  const orderedDebts = strategy === 'avalanche' ? sortedAvalanche : sortedSnowball;

  const handleMakePayment = (id: string, name: string) => {
    Alert.prompt(
      `Make Payment: ${name}`,
      'Enter payment amount:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          onPress: (amount) => {
            const val = parseFloat(amount ?? '0');
            if (isNaN(val) || val <= 0) {
              Alert.alert('Invalid amount');
              return;
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            makePayment(id, val);
          },
        },
      ],
      'plain-text',
      '',
      'decimal-pad'
    );
  };

  const handleDeleteDebt = (id: string, name: string) => {
    Alert.alert(`Delete "${name}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteDebt(id);
        },
      },
    ]);
  };

  const handleAddDebt = () => {
    const balance = parseFloat(newBalance);
    const originalBalance = parseFloat(newOriginalBalance);
    const interestRate = parseFloat(newInterestRate);
    const minimumPayment = parseFloat(newMinPayment);
    if (!newName.trim() || isNaN(balance) || isNaN(minimumPayment)) {
      Alert.alert('Invalid Input', 'Please fill in required fields.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addDebt({
      familyId: 'demo-family',
      name: newName.trim(),
      type: newType,
      balance,
      originalBalance: isNaN(originalBalance) ? balance : originalBalance,
      interestRate: isNaN(interestRate) ? 0 : interestRate,
      minimumPayment,
      lender: newLender.trim() || undefined,
      dueDay: newDueDay ? parseInt(newDueDay) : undefined,
      color: newColor,
    });
    setNewName('');
    setNewType('credit_card');
    setNewBalance('');
    setNewOriginalBalance('');
    setNewInterestRate('');
    setNewMinPayment('');
    setNewLender('');
    setNewDueDay('');
    setNewColor(COLORS[0]);
    setShowAddModal(false);
  };

  const renderOverviewTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {debts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No debts tracked</Text>
          <Text style={styles.emptyDesc}>Tap + to add your first debt.</Text>
          <Pressable onPress={seedDemoData} style={styles.demoBtn}>
            <Text style={styles.demoBtnText}>Load Demo Data</Text>
          </Pressable>
        </View>
      ) : (
        debts.map((debt) => {
          const paidOff = debt.originalBalance > 0
            ? (debt.originalBalance - debt.balance) / debt.originalBalance
            : 0;
          return (
            <Card key={debt.id} style={styles.debtCard} variant="elevated">
              <View style={[styles.colorBar, { backgroundColor: debt.color }]} />
              <View style={styles.debtContent}>
                <View style={styles.debtHeader}>
                  <View style={styles.debtNameRow}>
                    <Ionicons
                      name={DEBT_TYPE_ICONS[debt.type] as any}
                      size={18}
                      color={debt.color}
                    />
                    <Text style={styles.debtName}>{debt.name}</Text>
                  </View>
                  <Badge label={DEBT_TYPE_LABELS[debt.type]} variant="neutral" />
                </View>
                <ProgressBar
                  progress={paidOff}
                  color={debt.color}
                  height={6}
                  style={styles.debtProgress}
                />
                <View style={styles.debtStatsRow}>
                  <Text style={styles.debtBalanceLabel}>
                    Remaining: <Text style={styles.debtBalance}>${debt.balance.toLocaleString()}</Text>
                  </Text>
                  <Text style={styles.debtPctPaid}>{Math.round(paidOff * 100)}% paid</Text>
                </View>
                <View style={styles.debtMetaRow}>
                  <Text style={styles.debtMeta}>APR: {debt.interestRate}%</Text>
                  <Text style={styles.debtMeta}>Min: ${debt.minimumPayment}/mo</Text>
                  {debt.lender && <Text style={styles.debtMeta}>{debt.lender}</Text>}
                </View>
                <View style={styles.debtActions}>
                  <Pressable
                    style={[styles.payBtn, { backgroundColor: debt.color }]}
                    onPress={() => handleMakePayment(debt.id, debt.name)}
                  >
                    <Ionicons name="card" size={14} color="#fff" />
                    <Text style={styles.payBtnText}>Make Payment</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteDebtBtn}
                    onPress={() => handleDeleteDebt(debt.id, debt.name)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );

  const renderStrategyTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionLabel}>Choose Strategy</Text>
      <View style={styles.strategyRow}>
        <Pressable
          style={{ ...styles.strategyCard, ...(strategy === 'avalanche' && styles.strategyCardActive) }}
          onPress={() => {
            Haptics.selectionAsync();
            setStrategy('avalanche');
          }}
        >
          <Ionicons
            name="trending-down"
            size={28}
            color={strategy === 'avalanche' ? '#B71C1C' : colors.textSecondary}
          />
          <Text style={{ ...styles.strategyTitle, ...(strategy === 'avalanche' && styles.strategyTitleActive) }}>
            Avalanche
          </Text>
          <Text style={styles.strategyDesc}>Highest interest first. Saves the most money.</Text>
        </Pressable>
        <Pressable
          style={{ ...styles.strategyCard, ...(strategy === 'snowball' && styles.strategyCardActive) }}
          onPress={() => {
            Haptics.selectionAsync();
            setStrategy('snowball');
          }}
        >
          <Ionicons
            name="snow"
            size={28}
            color={strategy === 'snowball' ? '#B71C1C' : colors.textSecondary}
          />
          <Text style={{ ...styles.strategyTitle, ...(strategy === 'snowball' && styles.strategyTitleActive) }}>
            Snowball
          </Text>
          <Text style={styles.strategyDesc}>Lowest balance first. Builds momentum fast.</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Extra Monthly Payment</Text>
      <Card style={styles.extraPayCard} variant="elevated">
        <View style={styles.extraPayRow}>
          <Text style={styles.extraPayLabel}>$</Text>
          <TextInput
            style={styles.extraPayInput}
            value={extraPayment}
            onChangeText={setExtraPayment}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.extraPaySuffix}>/month</Text>
        </View>
      </Card>

      <Card style={styles.estimateCard} variant="elevated">
        <View style={styles.estimateRow}>
          <View style={styles.estimateStat}>
            <Text style={styles.estimateValue}>{payoffMonths}</Text>
            <Text style={styles.estimateLabel}>months to debt-free</Text>
          </View>
          <View style={styles.estimateDivider} />
          <View style={styles.estimateStat}>
            <Text style={styles.estimateValue}>
              {payoffDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </Text>
            <Text style={styles.estimateLabel}>estimated payoff date</Text>
          </View>
        </View>
        <View style={styles.estimateDividerH} />
        <View style={styles.estimateRow}>
          <View style={styles.estimateStat}>
            <Text style={[styles.estimateValue, styles.interestRed]}>
              ${Math.round(totalInterest).toLocaleString()}
            </Text>
            <Text style={styles.estimateLabel}>estimated total interest</Text>
          </View>
          <View style={styles.estimateDivider} />
          <View style={styles.estimateStat}>
            <Text style={styles.estimateValue}>{avgAPR.toFixed(1)}%</Text>
            <Text style={styles.estimateLabel}>average APR</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );

  const renderTimelineTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionLabel}>
        Payoff Order — {strategy === 'avalanche' ? 'Avalanche' : 'Snowball'}
      </Text>
      {orderedDebts.map((debt, index) => {
        const paidOff = debt.originalBalance > 0
          ? (debt.originalBalance - debt.balance) / debt.originalBalance
          : 0;
        const monthlyAllocated = index === 0
          ? debt.minimumPayment + extra
          : debt.minimumPayment;
        const monthsToPayoff = monthlyAllocated > 0
          ? Math.ceil(debt.balance / monthlyAllocated)
          : 999;
        return (
          <View key={debt.id} style={styles.timelineItem}>
            <View style={[styles.timelineNum, { backgroundColor: debt.color }]}>
              <Text style={styles.timelineNumText}>{index + 1}</Text>
            </View>
            <View style={styles.timelineConnector}>
              {index < orderedDebts.length - 1 && (
                <View style={styles.timelineLine} />
              )}
            </View>
            <Card style={styles.timelineCard} variant="elevated">
              <View style={styles.timelineCardHeader}>
                <Ionicons name={DEBT_TYPE_ICONS[debt.type] as any} size={16} color={debt.color} />
                <Text style={styles.timelineDebtName}>{debt.name}</Text>
                <Badge label={`~${monthsToPayoff} mo`} variant="neutral" />
              </View>
              <ProgressBar
                progress={paidOff}
                color={debt.color}
                height={5}
                style={styles.timelineProgress}
              />
              <Text style={styles.timelineBalance}>
                ${debt.balance.toLocaleString()} remaining • {debt.interestRate}% APR
              </Text>
            </Card>
          </View>
        );
      })}
      {debts.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyDesc}>Add debts to see the payoff timeline.</Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#B71C1C', '#C62828', '#D32F2F']}
        style={{ paddingTop: insets.top + 12, paddingBottom: 24, paddingHorizontal: 20 }}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Debt Payoff</Text>
          <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.headerStats}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>${totalBalance.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Debt</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>${totalMinimum}/mo</Text>
            <Text style={styles.statLabel}>Min Payments</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{debts.length}</Text>
            <Text style={styles.statLabel}>Accounts</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['Overview', 'Strategy', 'Timeline'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{ ...styles.tabItem, ...(activeTab === tab && styles.tabItemActive) }}
          >
            <Text style={{ ...styles.tabText, ...(activeTab === tab && styles.tabTextActive) }}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'Overview' && renderOverviewTab()}
      {activeTab === 'Strategy' && renderStrategyTab()}
      {activeTab === 'Timeline' && renderTimelineTab()}

      {/* Add Debt Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Debt</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Chase Visa"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Debt Type *</Text>
            <View style={styles.typeGrid}>
              {DEBT_TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setNewType(t)}
                  style={{ ...styles.typeChip, ...(newType === t && styles.typeChipActive) }}
                >
                  <Ionicons
                    name={DEBT_TYPE_ICONS[t] as any}
                    size={14}
                    color={newType === t ? '#fff' : colors.textSecondary}
                  />
                  <Text style={{ ...styles.typeChipText, ...(newType === t && styles.typeChipTextActive) }}>
                    {DEBT_TYPE_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Current Balance ($) *</Text>
            <TextInput
              style={styles.modalInput}
              value={newBalance}
              onChangeText={setNewBalance}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Original Balance ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={newOriginalBalance}
              onChangeText={setNewOriginalBalance}
              placeholder="Same as balance if unsure"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Interest Rate (APR %)</Text>
            <TextInput
              style={styles.modalInput}
              value={newInterestRate}
              onChangeText={setNewInterestRate}
              placeholder="e.g. 19.99"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Minimum Payment ($/mo) *</Text>
            <TextInput
              style={styles.modalInput}
              value={newMinPayment}
              onChangeText={setNewMinPayment}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Lender (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={newLender}
              onChangeText={setNewLender}
              placeholder="e.g. Chase, Sallie Mae"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Due Day (1-31, Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={newDueDay}
              onChangeText={setNewDueDay}
              placeholder="e.g. 15"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            <Text style={styles.modalLabel}>Color</Text>
            <View style={styles.colorPicker}>
              {COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setNewColor(c)}
                  style={{ ...styles.colorDot, backgroundColor: c, ...(newColor === c && styles.colorDotSelected) }}
                />
              ))}
            </View>

            <Pressable
              onPress={handleAddDebt}
              style={[styles.submitBtn, (!newName.trim() || !newBalance || !newMinPayment) && styles.submitBtnDisabled]}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Add Debt</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerStats: { flexDirection: 'row', alignItems: 'center' },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },
  tabBar: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: '#B71C1C' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#B71C1C' },
  tabContent: { padding: 16, paddingBottom: 100 },
  debtCard: { marginBottom: 12, borderRadius: 16, padding: 0, overflow: 'hidden', flexDirection: 'row' },
  colorBar: { width: 5 },
  debtContent: { flex: 1, padding: 14 },
  debtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  debtNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  debtName: { fontSize: 15, fontWeight: '700', color: colors.text },
  debtProgress: { marginBottom: 6 },
  debtStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  debtBalanceLabel: { fontSize: 12, color: colors.textSecondary },
  debtBalance: { fontWeight: '700', color: colors.text },
  debtPctPaid: { fontSize: 12, color: colors.success, fontWeight: '600' },
  debtMetaRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  debtMeta: { fontSize: 11, color: colors.textMuted },
  debtActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10 },
  payBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  deleteDebtBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 14 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  demoBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#B71C1C', borderRadius: 12 },
  demoBtnText: { color: '#fff', fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  strategyRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  strategyCard: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', ...shadows.card },
  strategyCardActive: { borderColor: '#B71C1C', backgroundColor: '#FFF5F5' },
  strategyTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 4 },
  strategyTitleActive: { color: '#B71C1C' },
  strategyDesc: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  extraPayCard: { marginBottom: 20, borderRadius: 16 },
  extraPayRow: { flexDirection: 'row', alignItems: 'center' },
  extraPayLabel: { fontSize: 20, fontWeight: '700', color: colors.text, marginRight: 4 },
  extraPayInput: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.text, paddingVertical: 8 },
  extraPaySuffix: { fontSize: 14, color: colors.textSecondary },
  estimateCard: { borderRadius: 16 },
  estimateRow: { flexDirection: 'row', paddingVertical: 16 },
  estimateStat: { flex: 1, alignItems: 'center' },
  estimateValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  estimateLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  estimateDivider: { width: 1, backgroundColor: colors.border },
  estimateDividerH: { height: 1, backgroundColor: colors.border },
  interestRed: { color: colors.danger },
  timelineItem: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' },
  timelineNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 16, zIndex: 2 },
  timelineNumText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  timelineConnector: { position: 'absolute', left: 14, top: 44, bottom: -8, width: 1, zIndex: 1 },
  timelineLine: { flex: 1, backgroundColor: colors.border },
  timelineCard: { flex: 1, borderRadius: 14 },
  timelineCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  timelineDebtName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  timelineProgress: { marginBottom: 6 },
  timelineBalance: { fontSize: 11, color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: colors.text, marginBottom: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  typeChipActive: { backgroundColor: '#B71C1C', borderColor: '#B71C1C' },
  typeChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#fff' },
  colorPicker: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: colors.text },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#B71C1C', borderRadius: 14, paddingVertical: 14 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
