import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useUtilityStore } from '../../store/useUtilityStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getDetectedUtilities } from '../../services/autoFillService';
import type { DetectedUtility } from '../../services/autoFillService';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';
import { usePlaidAutoData } from '../../hooks/usePlaidAutoData';

const generateId = () => Math.random().toString(36).substring(2, 11);

type UtilityType = 'electric' | 'water' | 'gas' | 'internet' | 'phone' | 'trash' | 'sewer' | 'other';

const UTILITY_LABELS: Record<UtilityType, string> = {
  electric: 'Electric',
  water: 'Water',
  gas: 'Gas',
  internet: 'Internet',
  phone: 'Phone',
  trash: 'Trash',
  sewer: 'Sewer',
  other: 'Other',
};

const UTILITY_ICONS: Record<UtilityType, string> = {
  electric: 'flash',
  water: 'water',
  gas: 'flame',
  internet: 'wifi',
  phone: 'phone-portrait',
  trash: 'trash',
  sewer: 'water-outline',
  other: 'receipt',
};

const UTILITY_COLORS: Record<UtilityType, string> = {
  electric: '#F5A623',
  water: '#2980B9',
  gas: '#E67E22',
  internet: '#8E44AD',
  phone: '#27AE60',
  trash: '#95A5A6',
  sewer: '#16A085',
  other: '#7F8C8D',
};

const UTILITY_TYPES: UtilityType[] = ['electric', 'water', 'gas', 'internet', 'phone', 'trash', 'sewer', 'other'];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function inferUtilityType(type: string): UtilityType {
  if (UTILITY_TYPES.includes(type as UtilityType)) return type as UtilityType;
  return 'other';
}

export function UtilityTrackerScreen({ navigation }: any) {
  const { t } = useTranslation('finance');
  const insets = useSafeAreaInsets();
  const { bills, addBill, updateBill, markPaid, deleteBill, getMonthlyTotal, getAverageForType, getCurrentMonthTotal, isLoaded, fetchFromServer } = useUtilityStore();

  useEffect(() => {
    if (!isLoaded) fetchFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeTab, setActiveTab] = useState<'This Month' | 'Trends' | 'By Type'>('This Month');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingBill, setEditingBill] = useState<typeof bills[number] | null>(null);

  const [newType, setNewType] = useState<UtilityType>('electric');
  const [newProvider, setNewProvider] = useState('');
  const [newMonth, setNewMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [newAmount, setNewAmount] = useState('');
  const [newUsage, setNewUsage] = useState('');
  const [newUsageUnit, setNewUsageUnit] = useState('');
  const [newIsPaid, setNewIsPaid] = useState(false);

  // Detected utilities
  const [detectedUtilities, setDetectedUtilities] = useState<DetectedUtility[]>([]);
  const [detectedLoading, setDetectedLoading] = useState(false);

  const currentMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const lastMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const thisMonthBills = bills.filter((b) => b.month === currentMonth);
  const thisMonthTotal = getCurrentMonthTotal();
  const lastMonthTotal = getMonthlyTotal(lastMonth);
  const unpaidCount = thisMonthBills.filter((b) => !b.isPaid).length;
  const pctChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  const trendMonths: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    trendMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const trendTotals = trendMonths.map((m) => getMonthlyTotal(m));
  const maxTrend = Math.max(...trendTotals, 1);

  const byType: Record<UtilityType, typeof bills> = {} as Record<UtilityType, typeof bills>;
  UTILITY_TYPES.forEach((t) => {
    byType[t] = bills.filter((b) => b.type === t);
  });

  const loadDetectedUtilities = () => {
    setDetectedLoading(true);
    getDetectedUtilities(currentMonth)
      .then((res) => setDetectedUtilities(res.utilities))
      .catch(() => {/* silent */ })
      .finally(() => setDetectedLoading(false));
  };

  // Pre-fetch detected utilities in the background whenever a bank
  // connects or finishes syncing, so the Import modal opens with fresh
  // data already loaded instead of a spinner — the modal itself still
  // opens manually via the header button.
  usePlaidAutoData(loadDetectedUtilities);

  const handleImportAll = () => {
    let imported = 0;
    for (const du of detectedUtilities) {
      const month = du.date.substring(0, 7);
      const alreadyExists = bills.some(
        (b) => b.provider.toLowerCase() === du.merchantName.toLowerCase() && b.month === month,
      );
      if (!alreadyExists) {
        addBill({
          familyId: useAuthStore.getState().familyId ?? '',
          type: inferUtilityType(du.type),
          provider: du.merchantName,
          month,
          amount: du.amount,
          isPaid: true,
        });
        imported++;
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Import Complete', `${imported} utilities imported.`);
    setShowImportModal(false);
  };

  const handleImportOne = (du: DetectedUtility) => {
    const month = du.date.substring(0, 7);
    const alreadyExists = bills.some(
      (b) => b.provider.toLowerCase() === du.merchantName.toLowerCase() && b.month === month,
    );
    if (alreadyExists) {
      Alert.alert('Already exists', 'This utility is already in your records.');
      return;
    }
    addBill({
      familyId: useAuthStore.getState().familyId ?? '',
      type: inferUtilityType(du.type),
      provider: du.merchantName,
      month,
      amount: du.amount,
      isPaid: true,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const prefillFromDetected = (du: DetectedUtility) => {
    setNewType(inferUtilityType(du.type));
    setNewProvider(du.merchantName);
    setNewAmount(String(du.amount));
    setNewMonth(du.date.substring(0, 7));
    setNewIsPaid(true);
    setShowImportModal(false);
    setShowAddModal(true);
  };

  const handleMarkPaid = (id: string, _provider: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markPaid(id);
  };

  const handleDelete = (id: string, provider: string) => {
    Alert.alert(`Delete "${provider}" bill?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteBill(id);
        },
      },
    ]);
  };

  const handleEditBill = (bill: typeof bills[number]) => {
    setEditingBill(bill);
    setNewType(bill.type);
    setNewProvider(bill.provider);
    setNewMonth(bill.month);
    setNewAmount(String(bill.amount));
    setNewUsage(bill.usage !== undefined ? String(bill.usage) : '');
    setNewUsageUnit(bill.usageUnit ?? '');
    setNewIsPaid(bill.isPaid);
    setShowAddModal(true);
  };

  const handleAddBill = () => {
    const amount = parseFloat(newAmount);
    if (!newProvider.trim() || isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Input', 'Please fill in provider and amount.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editingBill) {
      updateBill(editingBill.id, {
        type: newType,
        provider: newProvider.trim(),
        month: newMonth,
        amount,
        usage: newUsage ? parseFloat(newUsage) : undefined,
        usageUnit: newUsageUnit.trim() || undefined,
        isPaid: newIsPaid,
      });
      setEditingBill(null);
    } else {
      addBill({
        familyId: useAuthStore.getState().familyId ?? '',
        type: newType,
        provider: newProvider.trim(),
        month: newMonth,
        amount,
        usage: newUsage ? parseFloat(newUsage) : undefined,
        usageUnit: newUsageUnit.trim() || undefined,
        isPaid: newIsPaid,
      });
    }
    setNewProvider('');
    setNewAmount('');
    setNewUsage('');
    setNewUsageUnit('');
    setNewIsPaid(false);
    setShowAddModal(false);
  };

  // Current month bank chips for add modal
  const currentMonthChips = detectedUtilities.filter((d) => d.date.startsWith(currentMonth));

  const renderThisMonthTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Card style={styles.summaryCard} variant="elevated">
        <View style={styles.summaryRow}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>${thisMonthTotal.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>This Month</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <View style={styles.deltaRow}>
              <Ionicons
                name={pctChange >= 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={pctChange >= 0 ? colors.danger : colors.success}
              />
              <Text style={{ ...styles.summaryValue, color: pctChange >= 0 ? colors.danger : colors.success }}>
                {Math.abs(pctChange).toFixed(1)}%
              </Text>
            </View>
            <Text style={styles.summaryLabel}>vs Last Month</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, unpaidCount > 0 && styles.unpaidRed]}>{unpaidCount}</Text>
            <Text style={styles.summaryLabel}>Unpaid</Text>
          </View>
        </View>
      </Card>

      {thisMonthBills.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="flash-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No bills for this month</Text>
          <Text style={styles.emptyDesc}>Tap + to add a bill.</Text>
        </View>
      ) : (
        thisMonthBills.map((bill) => (
          <Card key={bill.id} style={styles.billCard} variant="elevated">
            <View style={styles.billRow}>
              <View style={[styles.billIcon, { backgroundColor: UTILITY_COLORS[bill.type] + '22' }]}>
                <Ionicons name={UTILITY_ICONS[bill.type] as any} size={22} color={UTILITY_COLORS[bill.type]} />
              </View>
              <View style={styles.billInfo}>
                <Text style={styles.billProvider}>{bill.provider}</Text>
                <Text style={styles.billType}>{UTILITY_LABELS[bill.type]}</Text>
                {bill.usage != null && (
                  <Text style={styles.billUsage}>{bill.usage} {bill.usageUnit}</Text>
                )}
              </View>
              <View style={styles.billRight}>
                <Text style={styles.billAmount}>${bill.amount.toFixed(2)}</Text>
                {bill.isPaid ? (
                  <Badge label="PAID" variant="success" />
                ) : (
                  <Badge label="UNPAID" variant="danger" />
                )}
                {!bill.isPaid && (
                  <Pressable
                    style={styles.markPaidBtn}
                    onPress={() => handleMarkPaid(bill.id, bill.provider)}
                  >
                    <Text style={styles.markPaidText}>Mark Paid</Text>
                  </Pressable>
                )}
                <View style={styles.billActions}>
                  <Pressable style={styles.billEditBtn} onPress={() => handleEditBill(bill)}>
                    <Ionicons name="create-outline" size={15} color={colors.primary} />
                  </Pressable>
                  <Pressable style={styles.billDeleteBtn} onPress={() => handleDelete(bill.id, bill.provider)}>
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );

  const renderTrendsTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionLabel}>6-Month Spending Trend</Text>
      <Card style={styles.chartCard} variant="elevated">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.barChartContainer}>
            {trendMonths.map((month, idx) => {
              const total = trendTotals[idx];
              const barHeight = maxTrend > 0 ? (total / maxTrend) * 120 : 4;
              const monthLabel = MONTH_LABELS[parseInt(month.split('-')[1]) - 1];
              return (
                <View key={month} style={styles.barColumn}>
                  <Text style={styles.barValue}>${Math.round(total)}</Text>
                  <View style={styles.barWrapper}>
                    <View style={[styles.bar, { height: barHeight, backgroundColor: month === currentMonth ? '#006064' : '#4DD0E1' }]} />
                  </View>
                  <Text style={[styles.barLabel, month === currentMonth && styles.barLabelCurrent]}>{monthLabel}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Card>

      <Text style={styles.sectionLabel}>Average by Type</Text>
      {UTILITY_TYPES.map((type) => {
        const avg = getAverageForType(type);
        if (avg === 0) return null;
        return (
          <Card key={type} style={styles.avgCard} variant="elevated">
            <View style={styles.avgRow}>
              <View style={[styles.avgIcon, { backgroundColor: UTILITY_COLORS[type] + '22' }]}>
                <Ionicons name={UTILITY_ICONS[type] as any} size={18} color={UTILITY_COLORS[type]} />
              </View>
              <Text style={styles.avgType}>{UTILITY_LABELS[type]}</Text>
              <Text style={styles.avgAmount}>${avg.toFixed(2)}/mo avg</Text>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );

  const renderByTypeTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {UTILITY_TYPES.map((type) => {
        const typeBills = byType[type];
        if (typeBills.length === 0) return null;
        const total = typeBills.reduce((sum, b) => sum + b.amount, 0);
        const avg = total / typeBills.length;
        return (
          <View key={type} style={styles.typeSection}>
            <View style={styles.typeSectionHeader}>
              <View style={[styles.typeIconCircle, { backgroundColor: UTILITY_COLORS[type] + '22' }]}>
                <Ionicons name={UTILITY_ICONS[type] as any} size={18} color={UTILITY_COLORS[type]} />
              </View>
              <View style={styles.typeHeaderInfo}>
                <Text style={styles.typeHeaderName}>{UTILITY_LABELS[type]}</Text>
                <Text style={styles.typeHeaderSub}>{typeBills.length} bills · avg ${avg.toFixed(2)}/mo</Text>
              </View>
            </View>
            {typeBills.slice().sort((a, b) => b.month.localeCompare(a.month)).slice(0, 3).map((bill) => (
              <Card key={bill.id} style={styles.typeCard} variant="elevated">
                <View style={styles.typeCardRow}>
                  <Text style={styles.typeCardMonth}>{bill.month}</Text>
                  <Text style={styles.typeCardProvider}>{bill.provider}</Text>
                  <Text style={styles.typeCardAmount}>${bill.amount.toFixed(2)}</Text>
                  {bill.isPaid ? (
                    <Badge label="PAID" variant="success" size="sm" />
                  ) : (
                    <Badge label="UNPAID" variant="danger" size="sm" />
                  )}
                </View>
              </Card>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );

  const screenHeader = (
      <LinearGradient
        colors={['#006064', '#00838F', '#0097A7']}
        style={{ paddingTop: insets.top + 6, paddingBottom: 8, paddingHorizontal: 20 }}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>{t('utility.title')}</Text>
          <Pressable
            onPress={() => {
              loadDetectedUtilities();
              setShowImportModal(true);
            }}
            style={styles.importBtn}
          >
            <Ionicons name="cloud-download-outline" size={20} color="#fff" />
          </Pressable>
          <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.headerStats}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>${thisMonthTotal.toFixed(0)}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{unpaidCount}</Text>
            <Text style={styles.statLabel}>Unpaid Bills</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <View style={styles.deltaRow}>
              <Ionicons
                name={pctChange >= 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={pctChange >= 0 ? '#FF8A80' : '#A5D6A7'}
              />
              <Text style={styles.statValue}>{Math.abs(pctChange).toFixed(1)}%</Text>
            </View>
            <Text style={styles.statLabel}>vs Last Month</Text>
          </View>
        </View>
      </LinearGradient>
  );
  const screenCompact = (
    <LinearGradient
      colors={['#006064', '#0097A7']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>Utilities</Text>
      <View />
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <View style={{ flex: 1, paddingTop: contentPaddingTop }}>


          <View style={styles.tabBar}>
        {(['This Month', 'Trends', 'By Type'] as const).map((tab) => (
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

          {activeTab === 'This Month' && renderThisMonthTab()}
          {activeTab === 'Trends' && renderTrendsTab()}
          {activeTab === 'By Type' && renderByTypeTab()}

      {/* Import from Bank Modal */}
      <Modal visible={showImportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import from Bank</Text>
              <Pressable onPress={() => setShowImportModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>{currentMonth} utility transactions</Text>

            {detectedLoading ? (
              <ActivityIndicator size="large" color="#006064" style={{ marginVertical: 24 }} />
            ) : detectedUtilities.length === 0 ? (
              <View style={styles.emptyImport}>
                <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyImportText}>No utility transactions found for this month.</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {detectedUtilities.map((du, i) => (
                  <View key={i} style={styles.importRow}>
                    <View style={[styles.importTypeIcon, { backgroundColor: UTILITY_COLORS[inferUtilityType(du.type)] + '22' }]}>
                      <Ionicons name={UTILITY_ICONS[inferUtilityType(du.type)] as any} size={18} color={UTILITY_COLORS[inferUtilityType(du.type)]} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.importProvider}>{du.merchantName}</Text>
                      <Text style={styles.importDate}>{du.date}</Text>
                    </View>
                    <Text style={styles.importAmount}>${du.amount.toFixed(2)}</Text>
                    <Pressable style={styles.importOneBtn} onPress={() => handleImportOne(du)}>
                      <Text style={styles.importOneBtnText}>Import</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            {!detectedLoading && detectedUtilities.length > 0 && (
              <Pressable style={styles.importAllBtn} onPress={handleImportAll}>
                <Ionicons name="cloud-download" size={18} color="#fff" />
                <Text style={styles.importAllBtnText}>Import All ({detectedUtilities.length})</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Bill Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingBill ? 'Edit Utility Bill' : 'Add Utility Bill'}</Text>
              <Pressable onPress={() => { setEditingBill(null); setShowAddModal(false); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Recent from bank chips */}
            {currentMonthChips.length > 0 && (
              <View style={styles.bankChipsContainer}>
                <Text style={styles.bankChipsLabel}>
                  <Ionicons name="cloud-download-outline" size={12} color="#006064" /> Recent from bank
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {currentMonthChips.map((du, i) => (
                    <Pressable key={i} style={styles.bankChip} onPress={() => prefillFromDetected(du)}>
                      <Ionicons name={UTILITY_ICONS[inferUtilityType(du.type)] as any} size={12} color="#006064" />
                      <Text style={styles.bankChipText}>{du.merchantName}</Text>
                      <Text style={styles.bankChipAmount}>${du.amount.toFixed(0)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={styles.modalLabel}>Utility Type *</Text>
            <View style={styles.typeIconGrid}>
              {UTILITY_TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setNewType(t)}
                  style={{ ...styles.typeIconBtn, ...(newType === t && { borderColor: UTILITY_COLORS[t], backgroundColor: UTILITY_COLORS[t] + '22' }) }}
                >
                  <Ionicons
                    name={UTILITY_ICONS[t] as any}
                    size={20}
                    color={newType === t ? UTILITY_COLORS[t] : colors.textSecondary}
                  />
                  <Text style={{ ...styles.typeIconLabel, ...(newType === t && { color: UTILITY_COLORS[t] }) }}>
                    {UTILITY_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Provider *</Text>
            <TextInput
              style={styles.modalInput}
              value={newProvider}
              onChangeText={setNewProvider}
              placeholder="e.g. Xfinity, AEP"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Month (YYYY-MM) *</Text>
            <TextInput
              style={styles.modalInput}
              value={newMonth}
              onChangeText={setNewMonth}
              placeholder="2026-06"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Amount ($) *</Text>
            <TextInput
              style={styles.modalInput}
              value={newAmount}
              onChangeText={setNewAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Usage (Optional)</Text>
            <View style={styles.usageRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginRight: 8 }]}
                value={newUsage}
                onChangeText={setNewUsage}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                value={newUsageUnit}
                onChangeText={setNewUsageUnit}
                placeholder="kWh, gallons..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.paidToggleRow}>
              <Text style={styles.modalLabel}>Mark as Paid</Text>
              <Switch
                value={newIsPaid}
                onValueChange={setNewIsPaid}
                trackColor={{ true: colors.success }}
              />
            </View>

            <Pressable
              onPress={handleAddBill}
              style={[styles.submitBtn, (!newProvider.trim() || !newAmount) && styles.submitBtnDisabled]}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>{editingBill ? 'Save Changes' : 'Add Bill'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
          </View>
        )}
      </CollapsibleHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  importBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerStats: { flexDirection: 'row', alignItems: 'center' },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: '#006064' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#006064' },
  tabContent: { padding: 16, paddingBottom: 100 },
  summaryCard: { borderRadius: 16, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, height: 36, backgroundColor: colors.border },
  unpaidRed: { color: colors.danger },
  billCard: { marginBottom: 10, borderRadius: 16 },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  billIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  billInfo: { flex: 1 },
  billProvider: { fontSize: 15, fontWeight: '700', color: colors.text },
  billType: { fontSize: 12, color: colors.textSecondary },
  billUsage: { fontSize: 11, color: colors.textMuted },
  billRight: { alignItems: 'flex-end', gap: 4 },
  billAmount: { fontSize: 18, fontWeight: '800', color: colors.text },
  markPaidBtn: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: colors.success, borderRadius: 8 },
  markPaidText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  billActions: { flexDirection: 'row', gap: 6, marginTop: 4 },
  billEditBtn: { width: 28, height: 28, borderRadius: 7, backgroundColor: colors.primaryLight + '30', alignItems: 'center', justifyContent: 'center' },
  billDeleteBtn: { width: 28, height: 28, borderRadius: 7, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 14 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  demoBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#006064', borderRadius: 12 },
  demoBtnText: { color: '#fff', fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  chartCard: { borderRadius: 16, marginBottom: 20 },
  barChartContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingBottom: 8 },
  barColumn: { width: 56, alignItems: 'center', marginHorizontal: 4 },
  barValue: { fontSize: 10, color: colors.textSecondary, marginBottom: 4 },
  barWrapper: { height: 120, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: 32, borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 6 },
  barLabelCurrent: { color: '#006064', fontWeight: '700' },
  avgCard: { marginBottom: 8, borderRadius: 14 },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avgIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avgType: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  avgAmount: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  typeSection: { marginBottom: 16 },
  typeSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  typeIconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeHeaderInfo: { flex: 1 },
  typeHeaderName: { fontSize: 15, fontWeight: '700', color: colors.text },
  typeHeaderSub: { fontSize: 12, color: colors.textSecondary },
  typeCard: { marginBottom: 6, borderRadius: 12, padding: 12 },
  typeCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeCardMonth: { fontSize: 12, color: colors.textMuted, width: 60 },
  typeCardProvider: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  typeCardAmount: { fontSize: 14, fontWeight: '700', color: colors.text },
  // Import modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalSubtitle: { fontSize: 12, color: colors.textSecondary, marginBottom: 16 },
  emptyImport: { alignItems: 'center', paddingVertical: 24 },
  emptyImportText: { fontSize: 13, color: colors.textSecondary, marginTop: 10, textAlign: 'center' },
  importRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  importTypeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  importProvider: { fontSize: 14, fontWeight: '700', color: colors.text },
  importDate: { fontSize: 11, color: colors.textSecondary },
  importAmount: { fontSize: 15, fontWeight: '800', color: colors.text, marginRight: 10 },
  importOneBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#006064', borderRadius: 8 },
  importOneBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  importAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#006064', borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  importAllBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Bank chips in add modal
  bankChipsContainer: { backgroundColor: '#E0F7FA', borderRadius: 12, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#006064' },
  bankChipsLabel: { fontSize: 12, fontWeight: '700', color: '#006064' },
  bankChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, borderWidth: 1.5, borderColor: '#006064', paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, backgroundColor: '#fff' },
  bankChipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  bankChipAmount: { fontSize: 11, color: '#006064', fontWeight: '700' },
  modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: colors.text, marginBottom: 16 },
  typeIconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeIconBtn: { width: 80, alignItems: 'center', padding: 10, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12 },
  typeIconLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginTop: 4 },
  usageRow: { flexDirection: 'row', marginBottom: 0 },
  paidToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#006064', borderRadius: 14, paddingVertical: 14 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
