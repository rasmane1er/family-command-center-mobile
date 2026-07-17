import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ProgressBar } from '../../components/common/ProgressBar';
import {
  getDetectedDebtsFromPlaid,
  syncDebtBalances,
  getPaymentDetections,
  calculatePayoffPlan,
} from '../../services/debtService';
import type {
  Debt,
  DebtType,
  PayoffStrategy,
  DetectedDebt,
  PaymentDetection,
  PayoffSummary,
} from '../../types';
import { useTranslation } from 'react-i18next';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY = '#1E3A5F';
const ACCENT = '#4A90D9';
const DANGER = '#EF4444';
const SUCCESS = '#10B981';
const WARNING = '#F59E0B';
const BG = '#F5F7FA';
const CARD = '#fff';
const TEXT = '#1A1A2E';
const SUBTEXT = '#6B7280';
const BORDER = '#E5E7EB';

const DEBT_TYPES: DebtType[] = [
  'credit_card',
  'personal_loan',
  'mortgage',
  'student_loan',
  'auto_loan',
  'medical',
  'other',
];

const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: 'Credit Card',
  personal_loan: 'Personal Loan',
  mortgage: 'Mortgage',
  student_loan: 'Student Loan',
  auto_loan: 'Auto Loan',
  medical: 'Medical',
  other: 'Other',
};

const DEBT_TYPE_ICONS: Record<DebtType, keyof typeof Ionicons.glyphMap> = {
  credit_card: 'card',
  personal_loan: 'cash',
  mortgage: 'home',
  student_loan: 'school',
  auto_loan: 'car',
  medical: 'medkit',
  other: 'wallet',
};

import { generateId } from '../../utils/generateId';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

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

function isOverdue(debt: Debt): boolean {
  if (!debt.lastPaymentDate) return false;
  const today = new Date();
  const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), debt.dueDate);
  const lastPaid = new Date(debt.lastPaymentDate);
  return lastPaid < new Date(today.getFullYear(), today.getMonth(), 1) && today >= dueThisMonth;
}

function isDueSoon(debt: Debt): boolean {
  const today = new Date();
  const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), debt.dueDate);
  const diff = (dueThisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
}

function isPaidThisMonth(debt: Debt): boolean {
  if (!debt.lastPaymentDate) return false;
  const today = new Date();
  const paid = new Date(debt.lastPaymentDate);
  return paid.getFullYear() === today.getFullYear() && paid.getMonth() === today.getMonth();
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface DebtFormState {
  name: string;
  type: DebtType;
  balance: string;
  originalBalance: string;
  interestRate: string;
  minimumPayment: string;
  dueDate: string;
  isAutoPay: boolean;
  notes: string;
  plaidAccountId: string;
}

const BLANK_FORM: DebtFormState = {
  name: '',
  type: 'credit_card',
  balance: '',
  originalBalance: '',
  interestRate: '',
  minimumPayment: '',
  dueDate: '15',
  isAutoPay: false,
  notes: '',
  plaidAccountId: '',
};

interface AddEditModalProps {
  visible: boolean;
  initial?: Debt | null;
  detectedDebts: DetectedDebt[];
  familyId: string;
  onClose: () => void;
  onSave: (data: DebtFormState) => void;
}

function AddEditModal({ visible, initial, detectedDebts, familyId, onClose, onSave }: AddEditModalProps) {
  const [form, setForm] = useState<DebtFormState>(BLANK_FORM);

  useEffect(() => {
    if (visible) {
      if (initial) {
        setForm({
          name: initial.name,
          type: initial.type,
          balance: String(initial.balance),
          originalBalance: String(initial.originalBalance),
          interestRate: String(Math.round(initial.interestRate * 10000) / 100),
          minimumPayment: String(initial.minimumPayment),
          dueDate: String(initial.dueDate),
          isAutoPay: initial.isAutoPay,
          notes: initial.notes ?? '',
          plaidAccountId: initial.plaidAccountId ?? '',
        });
      } else {
        setForm(BLANK_FORM);
      }
    }
  }, [visible, initial]);

  const set = (k: keyof DebtFormState, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleLinkPlaid = (d: DetectedDebt) => {
    setForm((f) => ({
      ...f,
      name: f.name || d.name,
      balance: f.balance || String(Math.round(d.balance)),
      minimumPayment: f.minimumPayment || String(Math.round(d.estimatedMinPayment)),
      plaidAccountId: d.plaidAccountId,
    }));
  };

  const canSave =
    form.name.trim().length > 0 &&
    !isNaN(parseFloat(form.balance)) &&
    !isNaN(parseFloat(form.minimumPayment));

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <ScrollView style={modalStyles.sheet} contentContainerStyle={modalStyles.sheetContent} keyboardShouldPersistTaps="handled">
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{initial ? 'Edit Debt' : 'Add Debt'}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={TEXT} />
            </Pressable>
          </View>

          <Text style={modalStyles.label}>Name *</Text>
          <TextInput
            style={modalStyles.input}
            value={form.name}
            onChangeText={(v) => set('name', v)}
            placeholder="e.g. Chase Sapphire"
            placeholderTextColor={SUBTEXT}
          />

          <Text style={modalStyles.label}>Type *</Text>
          <View style={modalStyles.typeGrid}>
            {DEBT_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => set('type', t)}
                style={[modalStyles.typeChip, form.type === t && { backgroundColor: debtColor(t), borderColor: debtColor(t) }]}
              >
                <Ionicons
                  name={DEBT_TYPE_ICONS[t]}
                  size={13}
                  color={form.type === t ? '#fff' : SUBTEXT}
                />
                <Text style={[modalStyles.typeChipText, form.type === t && modalStyles.typeChipTextActive]}>
                  {DEBT_TYPE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={modalStyles.label}>Current Balance ($) *</Text>
          <TextInput style={modalStyles.input} value={form.balance} onChangeText={(v) => set('balance', v)}
            placeholder="0" placeholderTextColor={SUBTEXT} keyboardType="decimal-pad" />

          <Text style={modalStyles.label}>Original Balance ($)</Text>
          <TextInput style={modalStyles.input} value={form.originalBalance} onChangeText={(v) => set('originalBalance', v)}
            placeholder="Same as balance if unsure" placeholderTextColor={SUBTEXT} keyboardType="decimal-pad" />

          <Text style={modalStyles.label}>Interest Rate (APR %)</Text>
          <TextInput style={modalStyles.input} value={form.interestRate} onChangeText={(v) => set('interestRate', v)}
            placeholder="e.g. 21.99" placeholderTextColor={SUBTEXT} keyboardType="decimal-pad" />

          <Text style={modalStyles.label}>Minimum Payment ($/mo) *</Text>
          <TextInput style={modalStyles.input} value={form.minimumPayment} onChangeText={(v) => set('minimumPayment', v)}
            placeholder="0" placeholderTextColor={SUBTEXT} keyboardType="decimal-pad" />

          <Text style={modalStyles.label}>Due Day (1–31)</Text>
          <TextInput style={modalStyles.input} value={form.dueDate} onChangeText={(v) => set('dueDate', v)}
            placeholder="15" placeholderTextColor={SUBTEXT} keyboardType="number-pad" />

          <View style={modalStyles.switchRow}>
            <Text style={modalStyles.label}>Auto-Pay</Text>
            <Switch value={form.isAutoPay} onValueChange={(v) => set('isAutoPay', v)}
              trackColor={{ true: SUCCESS }} />
          </View>

          <Text style={modalStyles.label}>Notes</Text>
          <TextInput style={[modalStyles.input, modalStyles.inputMulti]} value={form.notes} onChangeText={(v) => set('notes', v)}
            placeholder="Optional notes" placeholderTextColor={SUBTEXT} multiline numberOfLines={2} />

          {detectedDebts.length > 0 && (
            <>
              <Text style={[modalStyles.label, { marginTop: 8 }]}>Link to Plaid Account</Text>
              {detectedDebts.map((d) => (
                <Pressable key={d.plaidAccountId} style={[modalStyles.plaidOption, form.plaidAccountId === d.plaidAccountId && modalStyles.plaidOptionActive]}
                  onPress={() => handleLinkPlaid(d)}>
                  <Ionicons name="link" size={14} color={form.plaidAccountId === d.plaidAccountId ? ACCENT : SUBTEXT} />
                  <Text style={modalStyles.plaidOptionText}>{d.name}{d.mask ? ` ••${d.mask}` : ''} — ${formatMoney(d.balance)}</Text>
                </Pressable>
              ))}
            </>
          )}

          <Pressable
            style={[modalStyles.saveBtn, !canSave && { opacity: 0.4 }]}
            disabled={!canSave}
            onPress={() => onSave(form)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={modalStyles.saveBtnText}>{initial ? 'Save Changes' : 'Add Debt'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Tab = 'debts' | 'strategy' | 'timeline';

export function DebtPayoffScreen({ navigation }: { navigation: { goBack: () => void; navigate: (s: string, p?: Record<string, unknown>) => void } }) {
  const { t } = useTranslation('finance');
  const insets = useSafeAreaInsets();
  const { debts, addDebt, updateDebt, removeDebt, recordPayment } = useFinanceStore();

  const familyId = useAuthStore.getState().familyId ?? '';
  const [activeTab, setActiveTab] = useState<Tab>('debts');
  const [strategy, setStrategy] = useState<PayoffStrategy>('avalanche');
  const [extraBudget, setExtraBudget] = useState(0);
  const [showTooltip, setShowTooltip] = useState<PayoffStrategy | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  const [detectedDebts, setDetectedDebts] = useState<DetectedDebt[]>([]);
  const [detectedLoading, setDetectedLoading] = useState(false);
  const [paymentDetections, setPaymentDetections] = useState<PaymentDetection[]>([]);
  const [syncingBalances, setSyncingBalances] = useState(false);

  const [matchMap, setMatchMap] = useState<Record<string, string>>({}); // detectionId -> debtId

  const summary: PayoffSummary = calculatePayoffPlan(debts, extraBudget, strategy);
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);

  // Fetch Plaid-detected debts
  useEffect(() => {
    let cancelled = false;
    setDetectedLoading(true);
    getDetectedDebtsFromPlaid()
      .then(({ detected }) => { if (!cancelled) setDetectedDebts(detected); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDetectedLoading(false); });
    getPaymentDetections()
      .then(({ detections }) => { if (!cancelled) setPaymentDetections(detections); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleSyncBalances = useCallback(async () => {
    const pairs = debts
      .filter((d) => d.plaidAccountId)
      .map((d) => ({ debtId: d.id, plaidAccountId: d.plaidAccountId as string }));
    if (pairs.length === 0) { Alert.alert('No linked accounts', 'Link a Plaid account to a debt first.'); return; }
    setSyncingBalances(true);
    try {
      const { updates } = await syncDebtBalances(pairs);
      for (const u of updates) {
        updateDebt(u.debtId, { balance: u.balance });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Synced', `Updated ${updates.length} balance(s).`);
    } catch (e) {
      Alert.alert('Sync failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSyncingBalances(false);
    }
  }, [debts, updateDebt]);

  const handleSaveDebt = useCallback((form: DebtFormState) => {
    const balance = parseFloat(form.balance);
    const origBalance = parseFloat(form.originalBalance) || balance;
    const interestRate = (parseFloat(form.interestRate) || 0) / 100;
    const minimumPayment = parseFloat(form.minimumPayment);
    const dueDate = parseInt(form.dueDate, 10) || 15;

    if (editingDebt) {
      updateDebt(editingDebt.id, {
        name: form.name.trim(),
        type: form.type,
        balance,
        originalBalance: origBalance,
        interestRate,
        minimumPayment,
        dueDate,
        isAutoPay: form.isAutoPay,
        notes: form.notes.trim() || undefined,
        plaidAccountId: form.plaidAccountId || undefined,
      });
    } else {
      addDebt({
        familyId,
        name: form.name.trim(),
        type: form.type,
        balance,
        originalBalance: origBalance,
        interestRate,
        minimumPayment,
        dueDate,
        isAutoPay: form.isAutoPay,
        notes: form.notes.trim() || undefined,
        plaidAccountId: form.plaidAccountId || undefined,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    setEditingDebt(null);
  }, [editingDebt, addDebt, updateDebt, familyId]);

  const handleLongPressDebt = useCallback((debt: Debt) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Edit', 'Delete'], destructiveButtonIndex: 2, cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) { setEditingDebt(debt); setShowModal(true); }
          if (idx === 2) {
            Alert.alert(`Delete "${debt.name}"?`, 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); removeDebt(debt.id); } },
            ]);
          }
        },
      );
    } else {
      Alert.alert(debt.name, 'Choose action', [
        { text: 'Edit', onPress: () => { setEditingDebt(debt); setShowModal(true); } },
        { text: 'Delete', style: 'destructive', onPress: () => removeDebt(debt.id) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [removeDebt]);

  const handleMarkPayment = useCallback((debt: Debt) => {
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
  }, [recordPayment]);

  const handleMatchDetection = useCallback((detection: PaymentDetection, debtId: string) => {
    setMatchMap((m) => ({ ...m, [detection.plaidTransactionId]: debtId }));
    recordPayment(debtId, detection.amount, detection.date);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [recordPayment]);

  const isAlreadyTracked = (d: DetectedDebt) =>
    debts.some((debt) => debt.plaidAccountId === d.plaidAccountId);

  const handleAddDetected = (d: DetectedDebt) => {
    addDebt({
      familyId,
      name: d.name,
      type: 'credit_card',
      balance: d.balance,
      originalBalance: d.balance,
      interestRate: 0.1999,
      minimumPayment: d.estimatedMinPayment,
      dueDate: 15,
      isAutoPay: false,
      plaidAccountId: d.plaidAccountId,
      lastPaymentDate: d.lastPaymentDate ?? undefined,
      lastPaymentAmount: d.lastPaymentAmount ?? undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── Tab: Debts ──

  const renderDebtsTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {/* Detected from Bank */}
      {(detectedLoading || detectedDebts.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detected from Bank</Text>
          {detectedLoading ? (
            <View style={styles.skeletonRow}>
              {[1, 2].map((k) => <View key={k} style={styles.skeleton} />)}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.detectedScroll}>
              {detectedDebts.map((d) => {
                const tracked = isAlreadyTracked(d);
                return (
                  <View key={d.plaidAccountId} style={styles.detectedCard}>
                    <Text style={styles.detectedName} numberOfLines={1}>{d.name}{d.mask ? ` ••${d.mask}` : ''}</Text>
                    <Text style={styles.detectedBalance}>${formatMoney(d.balance)}</Text>
                    <Text style={styles.detectedMin}>Est. min ${formatMoney(d.estimatedMinPayment)}/mo</Text>
                    {tracked ? (
                      <View style={styles.trackedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={SUCCESS} />
                        <Text style={styles.trackedBadgeText}>Tracking</Text>
                      </View>
                    ) : (
                      <Pressable style={styles.addDetectedBtn} onPress={() => handleAddDetected(d)}>
                        <Ionicons name="add" size={13} color="#fff" />
                        <Text style={styles.addDetectedBtnText}>Add to Plan</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* My Debts */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>My Debts</Text>
          <Pressable style={styles.addBtn} onPress={() => { setEditingDebt(null); setShowModal(true); }}>
            <Ionicons name="add" size={18} color={PRIMARY} />
            <Text style={styles.addBtnText}>Add Debt</Text>
          </Pressable>
        </View>

        {debts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={48} color={SUBTEXT} />
            <Text style={styles.emptyText}>No debts tracked yet.</Text>
            <Text style={styles.emptySubText}>Tap "Add Debt" to get started.</Text>
          </View>
        ) : (
          debts.map((debt) => {
            const pct = debt.originalBalance > 0
              ? Math.min(1, (debt.originalBalance - debt.balance) / debt.originalBalance)
              : 0;
            const paid = isPaidThisMonth(debt);
            const overdue = isOverdue(debt);
            const dueSoon = isDueSoon(debt);
            const color = debtColor(debt.type);
            const aprPct = Math.round(debt.interestRate * 10000) / 100;

            return (
              <Pressable
                key={debt.id}
                style={styles.debtCard}
                onLongPress={() => handleLongPressDebt(debt)}
                onPress={() => navigation.navigate('DebtDetail', { debtId: debt.id })}
              >
                <View style={[styles.debtColorBar, { backgroundColor: color }]} />
                <View style={styles.debtBody}>
                  <View style={styles.debtRow}>
                    <View style={[styles.debtIconBox, { backgroundColor: color + '22' }]}>
                      <Ionicons name={DEBT_TYPE_ICONS[debt.type]} size={16} color={color} />
                    </View>
                    <View style={styles.debtInfo}>
                      <Text style={styles.debtName}>{debt.name}</Text>
                      <Text style={styles.debtSub}>{DEBT_TYPE_LABELS[debt.type]}</Text>
                    </View>
                    <View style={styles.aprBadge}>
                      <Text style={styles.aprText}>{aprPct.toFixed(2)}% APR</Text>
                    </View>
                  </View>

                  <ProgressBar progress={pct} color={color} height={5} style={styles.progress} />

                  <View style={styles.debtMetaRow}>
                    <Text style={styles.debtBalance}>${formatMoney(debt.balance)} left</Text>
                    <Text style={styles.debtPct}>{Math.round(pct * 100)}% paid</Text>
                  </View>

                  <View style={styles.debtFooter}>
                    <Text style={styles.debtPayNote}>
                      Next: ${formatMoney(debt.minimumPayment)} on day {debt.dueDate}
                    </Text>
                    {paid ? (
                      <View style={styles.statusBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={SUCCESS} />
                        <Text style={[styles.statusText, { color: SUCCESS }]}>Paid</Text>
                      </View>
                    ) : overdue ? (
                      <View style={styles.statusBadge}>
                        <Ionicons name="alert-circle" size={12} color={DANGER} />
                        <Text style={[styles.statusText, { color: DANGER }]}>Overdue</Text>
                      </View>
                    ) : dueSoon ? (
                      <View style={styles.statusBadge}>
                        <Ionicons name="time" size={12} color={WARNING} />
                        <Text style={[styles.statusText, { color: WARNING }]}>Due Soon</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.debtActions}>
                    <Pressable style={[styles.payBtnSmall, { backgroundColor: color }]} onPress={() => handleMarkPayment(debt)}>
                      <Ionicons name="checkmark" size={13} color="#fff" />
                      <Text style={styles.payBtnSmallText}>Payment</Text>
                    </Pressable>
                    {debt.isAutoPay && (
                      <View style={styles.autoPayBadge}>
                        <Ionicons name="refresh-circle" size={12} color={ACCENT} />
                        <Text style={styles.autoPayText}>Auto-Pay</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      {/* Auto-payment detections */}
      {paymentDetections.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Possible Payments Detected ({paymentDetections.length})
          </Text>
          {paymentDetections.slice(0, 5).map((det) => {
            const matched = matchMap[det.plaidTransactionId];
            return (
              <View key={det.plaidTransactionId} style={styles.detectionCard}>
                <View style={styles.detectionLeft}>
                  <Text style={styles.detectionName}>{det.merchantName ?? det.name}</Text>
                  <Text style={styles.detectionDate}>{det.date} · ${formatMoney(det.amount)}</Text>
                </View>
                {matched ? (
                  <View style={styles.matchedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={SUCCESS} />
                    <Text style={styles.matchedText}>Matched</Text>
                  </View>
                ) : debts.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {debts.map((d) => (
                      <Pressable key={d.id} style={styles.matchChip} onPress={() => handleMatchDetection(det, d.id)}>
                        <Text style={styles.matchChipText} numberOfLines={1}>{d.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.matchPrompt}>Add a debt to match</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  // ── Tab: Strategy ──

  const renderStrategyTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionTitle}>Strategy</Text>
      <View style={styles.strategyRow}>
        {(['avalanche', 'snowball'] as PayoffStrategy[]).map((s) => (
          <Pressable
            key={s}
            style={[styles.strategyCard, strategy === s && styles.strategyCardActive]}
            onPress={() => { Haptics.selectionAsync(); setStrategy(s); }}
            onLongPress={() => setShowTooltip(s)}
          >
            <Text style={styles.strategyEmoji}>{s === 'avalanche' ? '🔥' : '⛄'}</Text>
            <Text style={[styles.strategyLabel, strategy === s && { color: PRIMARY }]}>
              {s === 'avalanche' ? 'Avalanche' : 'Snowball'}
            </Text>
          </Pressable>
        ))}
      </View>

      {showTooltip && (
        <Pressable style={styles.tooltip} onPress={() => setShowTooltip(null)}>
          <Text style={styles.tooltipText}>
            {showTooltip === 'avalanche'
              ? '🔥 Avalanche: Pay highest-interest debt first. Saves the most money over time.'
              : '⛄ Snowball: Pay smallest balance first. Builds momentum and motivation.'}
          </Text>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>Extra Monthly Budget</Text>
      <View style={styles.sliderRow}>
        {[0, 50, 100, 150, 200, 300, 500].map((v) => (
          <Pressable key={v} style={[styles.sliderChip, extraBudget === v && styles.sliderChipActive]}
            onPress={() => { Haptics.selectionAsync(); setExtraBudget(v); }}>
            <Text style={[styles.sliderChipText, extraBudget === v && { color: '#fff' }]}>
              {v === 0 ? 'None' : `+$${v}`}
            </Text>
          </Pressable>
        ))}
      </View>

      {summary.totalMonths > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeadline}>
            Debt-free in {summary.totalMonths} months
          </Text>
          <Text style={styles.summaryDate}>Estimated: {summary.payoffDate}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryVal}>${formatMoney(summary.totalInterestPaid)}</Text>
              <Text style={styles.summaryStatLabel}>Total interest</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryVal}>${formatMoney(summary.totalPaid)}</Text>
              <Text style={styles.summaryStatLabel}>Total paid</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryVal}>${formatMoney(summary.monthlyBudget)}</Text>
              <Text style={styles.summaryStatLabel}>Monthly budget</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );

  // ── Tab: Timeline ──

  const renderTimelineTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionTitle}>Payoff Order — {strategy === 'avalanche' ? 'Avalanche 🔥' : 'Snowball ⛄'}</Text>
      {summary.plans.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptySubText}>Add debts to see timeline.</Text>
        </View>
      ) : (
        summary.plans.map((plan, idx) => {
          const debt = debts.find((d) => d.id === plan.debtId);
          if (!debt) return null;
          const color = debtColor(debt.type);
          return (
            <View key={plan.debtId} style={styles.timelineItem}>
              <View style={[styles.timelineNumBadge, { backgroundColor: color }]}>
                <Text style={styles.timelineNum}>{idx + 1}</Text>
              </View>
              {idx < summary.plans.length - 1 && <View style={styles.timelineLine} />}
              <View style={styles.timelineContent}>
                <View style={styles.timelineRow}>
                  <Text style={styles.timelineDebtName}>{debt.name}</Text>
                  <Text style={styles.timelinePayoff}>Payoff: {plan.payoffDate}</Text>
                </View>
                <ProgressBar
                  progress={debt.originalBalance > 0 ? (debt.originalBalance - debt.balance) / debt.originalBalance : 0}
                  color={color} height={5} style={styles.progress} />
                <Text style={styles.timelineMeta}>
                  ${formatMoney(debt.balance)} · {plan.monthsToPayoff} months · ${formatMoney(Math.round(plan.totalInterest))} interest
                </Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={[PRIMARY, '#2A4D7F', ACCENT]} style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>{t('debt.title')}</Text>
          <Pressable onPress={handleSyncBalances} disabled={syncingBalances} hitSlop={10}>
            {syncingBalances
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="sync" size={22} color="#fff" />}
          </Pressable>
        </View>
        <Text style={styles.totalDebt}>${formatMoney(totalDebt)}</Text>
        <Text style={styles.totalDebtLabel}>Total Debt Outstanding</Text>
        {summary.totalMonths > 0 && (
          <Text style={styles.debtFreeDate}>
            Debt-free {summary.payoffDate} · {strategy === 'avalanche' ? 'Avalanche 🔥' : 'Snowball ⛄'}
          </Text>
        )}
      </LinearGradient>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['debts', 'strategy', 'timeline'] as Tab[]).map((tab) => (
          <Pressable key={tab} style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'debts' && renderDebtsTab()}
      {activeTab === 'strategy' && renderStrategyTab()}
      {activeTab === 'timeline' && renderTimelineTab()}

      <AddEditModal
        visible={showModal}
        initial={editingDebt}
        detectedDebts={detectedDebts}
        familyId={familyId}
        onClose={() => { setShowModal(false); setEditingDebt(null); }}
        onSave={handleSaveDebt}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { paddingBottom: 8, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center' },
  totalDebt: { fontSize: 36, fontWeight: '900', color: '#fff', textAlign: 'center' },
  totalDebtLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 2 },
  debtFreeDate: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 6 },

  tabBar: { flexDirection: 'row', backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  tabItem: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 13, fontWeight: '600', color: SUBTEXT },
  tabTextActive: { color: PRIMARY },

  tabContent: { padding: 16, paddingBottom: 100 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: SUBTEXT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },

  // Detected
  detectedScroll: { marginHorizontal: -4 },
  detectedCard: { width: 160, backgroundColor: CARD, borderRadius: 14, padding: 14, marginHorizontal: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  detectedName: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 4 },
  detectedBalance: { fontSize: 18, fontWeight: '900', color: DANGER, marginBottom: 2 },
  detectedMin: { fontSize: 11, color: SUBTEXT, marginBottom: 10 },
  addDetectedBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PRIMARY, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  addDetectedBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  trackedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trackedBadgeText: { fontSize: 12, color: SUCCESS, fontWeight: '600' },
  skeletonRow: { flexDirection: 'row', gap: 8 },
  skeleton: { width: 160, height: 120, backgroundColor: '#E5E7EB', borderRadius: 14 },

  // Debt cards
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: PRIMARY + '18', borderRadius: 10 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  debtCard: { backgroundColor: CARD, borderRadius: 16, marginBottom: 12, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  debtColorBar: { width: 5 },
  debtBody: { flex: 1, padding: 14 },
  debtRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  debtIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  debtInfo: { flex: 1 },
  debtName: { fontSize: 15, fontWeight: '700', color: TEXT },
  debtSub: { fontSize: 11, color: SUBTEXT, marginTop: 1 },
  aprBadge: { backgroundColor: DANGER + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  aprText: { fontSize: 11, fontWeight: '700', color: DANGER },
  progress: { marginBottom: 6 },
  debtMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  debtBalance: { fontSize: 12, color: TEXT, fontWeight: '600' },
  debtPct: { fontSize: 12, color: SUCCESS, fontWeight: '600' },
  debtFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  debtPayNote: { fontSize: 11, color: SUBTEXT },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  debtActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10 },
  payBtnSmallText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  autoPayBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  autoPayText: { fontSize: 11, color: ACCENT, fontWeight: '600' },

  // Payment detection
  detectionCard: { backgroundColor: CARD, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  detectionLeft: { flex: 1 },
  detectionName: { fontSize: 13, fontWeight: '600', color: TEXT },
  detectionDate: { fontSize: 11, color: SUBTEXT, marginTop: 2 },
  matchedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  matchedText: { fontSize: 12, color: SUCCESS, fontWeight: '600' },
  matchChip: { backgroundColor: PRIMARY + '18', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10, marginHorizontal: 3 },
  matchChipText: { fontSize: 11, color: PRIMARY, fontWeight: '600', maxWidth: 80 },
  matchPrompt: { fontSize: 11, color: SUBTEXT },

  // Strategy
  strategyRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  strategyCard: { flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  strategyCardActive: { borderColor: PRIMARY },
  strategyEmoji: { fontSize: 20, marginBottom: 6 },
  strategyLabel: { fontSize: 15, fontWeight: '700', color: SUBTEXT },
  tooltip: { backgroundColor: TEXT, borderRadius: 12, padding: 14, marginBottom: 16 },
  tooltipText: { fontSize: 13, color: '#fff', lineHeight: 20 },
  sliderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  sliderChip: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14 },
  sliderChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  sliderChipText: { fontSize: 13, fontWeight: '600', color: SUBTEXT },
  summaryCard: { backgroundColor: CARD, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  summaryHeadline: { fontSize: 20, fontWeight: '800', color: TEXT, textAlign: 'center', marginBottom: 4 },
  summaryDate: { fontSize: 13, color: SUBTEXT, textAlign: 'center', marginBottom: 16 },
  summaryRow: { flexDirection: 'row' },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 16, fontWeight: '800', color: TEXT },
  summaryStatLabel: { fontSize: 10, color: SUBTEXT, marginTop: 3, textAlign: 'center' },
  summaryDivider: { width: 1, backgroundColor: BORDER },

  // Timeline
  timelineItem: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  timelineNumBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 10, zIndex: 2 },
  timelineNum: { color: '#fff', fontSize: 12, fontWeight: '800' },
  timelineLine: { position: 'absolute', left: 13, top: 38, bottom: -16, width: 2, backgroundColor: BORDER, zIndex: 1 },
  timelineContent: { flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timelineDebtName: { fontSize: 14, fontWeight: '700', color: TEXT },
  timelinePayoff: { fontSize: 12, color: ACCENT, fontWeight: '600' },
  timelineMeta: { fontSize: 11, color: SUBTEXT, marginTop: 4 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '700', color: TEXT, marginTop: 12 },
  emptySubText: { fontSize: 13, color: SUBTEXT, marginTop: 4 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  sheetContent: { padding: 24, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: TEXT },
  label: { fontSize: 12, fontWeight: '700', color: SUBTEXT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: TEXT, marginBottom: 16 },
  inputMulti: { height: 64, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: BORDER, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  typeChipText: { fontSize: 12, fontWeight: '600', color: SUBTEXT },
  typeChipTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  plaidOption: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, padding: 12, marginBottom: 8 },
  plaidOptionActive: { borderColor: ACCENT, backgroundColor: ACCENT + '10' },
  plaidOptionText: { fontSize: 13, color: TEXT, flex: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 14, marginTop: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
