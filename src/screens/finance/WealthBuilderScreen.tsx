import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Button } from '../../components/common/Button';
import { useWealthStore } from '../../store/useWealthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getAccounts } from '../../services/plaidService';
import type { PlaidAccount } from '../../types';
import type { WealthCategory } from '../../types';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';
import { usePlaidAutoData } from '../../hooks/usePlaidAutoData';

const WEALTH_CATEGORIES: WealthCategory[] = ['stocks', 'bonds', 'real_estate', 'crypto', 'savings', 'retirement', 'business', 'other'];

const CATEGORY_COLORS: Record<string, string> = {
  retirement: '#8E44AD',
  real_estate: '#27AE60',
  stocks: '#2980B9',
  savings: '#16A085',
  crypto: '#F5A623',
  bonds: '#7F8C8D',
  business: '#E74C3C',
  other: '#95A5A6',
};

const CATEGORY_LABELS: Record<string, string> = {
  retirement: 'Retirement',
  real_estate: 'Real Estate',
  stocks: 'Stocks',
  savings: 'Savings',
  crypto: 'Crypto',
  bonds: 'Bonds',
  business: 'Business',
  other: 'Other',
};

function mapAccountTypeToWealthCategory(accountType: string): WealthCategory {
  if (accountType === 'investment') return 'stocks';
  if (accountType === 'savings') return 'savings';
  if (accountType === 'checking') return 'savings';
  return 'other';
}

function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function WealthBuilderScreen({ navigation }: any) {
  const { t } = useTranslation('finance');
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'portfolio' | 'forecast' | 'insights'>('portfolio');
  const [showModal, setShowModal] = useState(false);
  const [showPlaidSubSheet, setShowPlaidSubSheet] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<WealthCategory>('savings');
  const [newCurrentValue, setNewCurrentValue] = useState('');
  const [newCostBasis, setNewCostBasis] = useState('');
  const [newInstitution, setNewInstitution] = useState('');
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const { entries, projections, getTotalNetWorth, addEntry, updateEntry, deleteEntry, isLoaded, fetchFromServer } = useWealthStore();
  const [editingEntry, setEditingEntry] = useState<typeof entries[0] | null>(null);
  const monthlyExpenses = useFinanceStore((s) => s.monthlyExpenses);

  useEffect(() => {
    if (!isLoaded) fetchFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddEntry = () => {
    if (!newName.trim() || !newCurrentValue) { Alert.alert('Required', 'Please enter a name and current value.'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const cv = parseFloat(newCurrentValue) || 0;
    const cb = parseFloat(newCostBasis) || cv;
    if (editingEntry) {
      updateEntry(editingEntry.id, { name: newName.trim(), category: newCategory, currentValue: cv, costBasis: cb, institution: newInstitution.trim() || undefined });
    } else {
      addEntry({
        familyId: useAuthStore.getState().familyId ?? '',
        name: newName.trim(),
        category: newCategory,
        currentValue: cv,
        costBasis: cb,
        percentAllocation: 0,
        institution: newInstitution.trim() || undefined,
      });
    }
    setShowModal(false);
    setEditingEntry(null);
    setNewName(''); setNewCategory('savings'); setNewCurrentValue(''); setNewCostBasis(''); setNewInstitution('');
  };

  const openPlaidSubSheet = () => {
    setPlaidLoading(true);
    getAccounts()
      .then((res) => setPlaidAccounts(res.accounts))
      .catch(() => { Alert.alert('Error', 'Failed to load Plaid accounts.'); })
      .finally(() => setPlaidLoading(false));
    setShowPlaidSubSheet(true);
  };

  // Silently keeps plaidAccounts warm in the background whenever a bank
  // connects or finishes syncing, so opening the import sub-sheet shows
  // accounts instantly instead of a spinner on the first tap.
  usePlaidAutoData(() => {
    getAccounts()
      .then((res) => setPlaidAccounts(res.accounts))
      .catch(() => {/* silent — openPlaidSubSheet surfaces errors on manual open */});
  });

  const prefillFromPlaid = (acct: PlaidAccount) => {
    setNewName(acct.name);
    setNewCurrentValue(String(acct.balance));
    setNewCategory(mapAccountTypeToWealthCategory(acct.accountType));
    setNewInstitution(firstWord(acct.name));
    setNewCostBasis('');
    setShowPlaidSubSheet(false);
  };

  const totalNetWorth = getTotalNetWorth();
  const totalGain = entries.reduce((s, e) => s + (e.currentValue - e.costBasis), 0);
  const gainPct = entries.length > 0 ? ((totalGain / entries.reduce((s, e) => s + e.costBasis, 0)) * 100) : 0;

  const grouped = entries.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = 0;
    acc[e.category] += e.currentValue;
    return acc;
  }, {} as Record<string, number>);

  // Real insights derived from actual entries/projections — replaces a
  // previous hardcoded list (fixed "$1M in 12 years", a fixed "4.8 months"
  // emergency fund figure, a fixed "38% real estate", and one naming a
  // specific invented child "Aiden") that never reflected the user's real
  // portfolio at all.
  const wealthInsights: { icon: string; color: string; text: string; label: string }[] = [];

  const millionaireYear = projections.find((p) => p.netWorth >= 1000000)?.year;
  if (millionaireYear && totalNetWorth < 1000000) {
    const yearsAway = millionaireYear - new Date().getFullYear();
    wealthInsights.push({
      icon: 'trending-up', color: '#27AE60', label: 'Projection',
      text: `At your current pace, you'll reach $1M net worth in ${yearsAway} year${yearsAway === 1 ? '' : 's'}`,
    });
  }

  if (monthlyExpenses > 0) {
    const liquidSavings = entries.filter((e) => e.category === 'savings').reduce((s, e) => s + e.currentValue, 0);
    const monthsCovered = liquidSavings / monthlyExpenses;
    wealthInsights.push({
      icon: monthsCovered >= 6 ? 'checkmark-circle' : 'warning',
      color: monthsCovered >= 6 ? '#27AE60' : '#F5A623',
      label: monthsCovered >= 6 ? 'On Track' : 'Action Needed',
      text: `Your savings cover ${monthsCovered.toFixed(1)} months of expenses — target is 6 months`,
    });
  }

  const topCategory = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0];
  if (topCategory && totalNetWorth > 0) {
    const [cat, val] = topCategory;
    const pct = (val / totalNetWorth) * 100;
    if (pct >= 35) {
      wealthInsights.push({
        icon: 'pie-chart', color: '#8E44AD', label: 'Rebalance',
        text: `Portfolio is ${pct.toFixed(0)}% ${CATEGORY_LABELS[cat] ?? cat} — consider diversifying for stability`,
      });
    }
  }

  const screenHeader = (
        <LinearGradient colors={['#1B5E20', '#2E7D32']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <View style={styles.headerTop}>
            <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>{t('wealth.title')}</Text>
            <Pressable accessibilityRole="button" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowModal(true); }} style={styles.addBtn}>
              <Ionicons name="add" size={24} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.nwBlock}>
            {/* This is investment/wealth holdings only (retirement, stocks,
                real estate equity, savings, crypto), not the family's full
                net worth — that combined figure (also including bank
                accounts, physical assets, debt) lives in useTotalNetWorth.ts
                and is shown on the main Finance dashboard. Labeled distinctly
                here so the two don't look like conflicting "net worth"
                numbers. */}
            <Text style={styles.nwLabel}>Investment & Wealth Holdings</Text>
            <Text style={styles.nwValue}>${totalNetWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
            <View style={styles.gainRow}>
              <Ionicons name="trending-up" size={16} color="#A5D6A7" />
              <Text style={styles.gainText}>
                +${totalGain.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({gainPct.toFixed(1)}%) all-time gain
              </Text>
            </View>
          </View>
    
  <View style={styles.tabs}>
          {(['portfolio', 'forecast', 'insights'] as const).map((tab) => (
            <Pressable accessibilityRole="button" key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'portfolio' ? 'Portfolio' : tab === 'forecast' ? 'Forecast' : 'AI Insights'}
              </Text>
            </Pressable>
          ))}
        </View>
    </LinearGradient>
  );
  const screenCompact = (
    <LinearGradient
      colors={['#1B5E20', '#2E7D32']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>{t('wealth.title')}</Text>
      <View />
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]} onScroll={onScroll} onScrollEndDrag={onScrollEndDrag} onMomentumScrollEnd={onMomentumScrollEnd} scrollEventThrottle={scrollEventThrottle}>
        {entries.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="trending-up-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No holdings yet</Text>
            <Text style={styles.emptyDesc}>
              Add your real accounts and assets to track net worth, forecasts, and insights.
            </Text>
            <Button title="Add a Holding" onPress={() => setShowModal(true)} style={{ marginTop: 18, alignSelf: 'stretch' }} />
          </View>
        )}

        {entries.length > 0 && activeTab === 'portfolio' && (
          <>
            <Text style={styles.sectionTitle}>Allocation</Text>
            <Card style={styles.allocationCard} variant="elevated">
              <View style={styles.allocationBar}>
                {Object.entries(grouped).map(([cat, val]) => (
                  <View
                    key={cat}
                    style={[styles.allocationSegment, { flex: (val / totalNetWorth) * 100, backgroundColor: CATEGORY_COLORS[cat] ?? '#95A5A6' }]}
                  />
                ))}
              </View>
              {Object.entries(grouped).map(([cat, val]) => (
                <View key={cat} style={styles.allocRow}>
                  <View style={[styles.allocDot, { backgroundColor: CATEGORY_COLORS[cat] ?? '#95A5A6' }]} />
                  <Text style={styles.allocLabel}>{CATEGORY_LABELS[cat] ?? cat}</Text>
                  <Text style={styles.allocPct}>{((val / totalNetWorth) * 100).toFixed(1)}%</Text>
                  <Text style={styles.allocVal}>${(val / 1000).toFixed(0)}k</Text>
                </View>
              ))}
            </Card>

            <Text style={styles.sectionTitle}>Holdings</Text>
            {entries.map((e) => {
              const gain = e.currentValue - e.costBasis;
              const gainPctEntry = ((gain / e.costBasis) * 100);
              return (
                <Card key={e.id} style={styles.holdingCard} variant="elevated">
                  <View style={styles.holdingHeader}>
                    <View style={[styles.holdingIcon, { backgroundColor: (CATEGORY_COLORS[e.category] ?? '#95A5A6') + '15' }]}>
                      <Ionicons name="cash" size={18} color={CATEGORY_COLORS[e.category] ?? '#95A5A6'} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.holdingName}>{e.name}</Text>
                      <Text style={styles.holdingInst}>{e.institution} · {CATEGORY_LABELS[e.category]}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={styles.holdingValue}>${e.currentValue.toLocaleString()}</Text>
                      <Text style={[styles.holdingGain, { color: gain >= 0 ? colors.success : colors.danger }]}>
                        {gain >= 0 ? '+' : ''}{gainPctEntry.toFixed(1)}%
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                        <Pressable accessibilityRole="button" onPress={() => { setEditingEntry(e); setNewName(e.name); setNewCategory(e.category); setNewCurrentValue(String(e.currentValue)); setNewCostBasis(String(e.costBasis)); setNewInstitution(e.institution ?? ''); setShowModal(true); }} style={styles.holdingActionBtn}>
                          <Ionicons name="create-outline" size={13} color={colors.textMuted} />
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={() => { Alert.alert('Delete Holding', `Remove "${e.name}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); deleteEntry(e.id); } }]); }} style={styles.holdingActionBtn}>
                          <Ionicons name="trash-outline" size={13} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                  {e.annualReturn && (
                    <View style={styles.returnRow}>
                      <Ionicons name="trending-up" size={12} color={colors.success} />
                      <Text style={styles.returnText}>{e.annualReturn}% annual return</Text>
                    </View>
                  )}
                </Card>
              );
            })}
          </>
        )}

        {entries.length > 0 && activeTab === 'forecast' && (
          <>
            <Card style={styles.forecastCard} variant="elevated">
              <Text style={styles.forecastTitle}>Net Worth Projection</Text>
              <Text style={styles.forecastSub}>Based on 7.2% avg annual return + $24k/yr contributions</Text>
              <View style={styles.forecastTimeline}>
                {projections.filter((_, i) => [0, 4, 9, 14, 19].includes(i)).map((proj) => (
                  <View key={proj.year} style={styles.forecastPoint}>
                    <Text style={styles.forecastVal}>${proj.netWorth >= 1000000 ? `${(proj.netWorth / 1000000).toFixed(1)}M` : `${Math.round(proj.netWorth / 1000)}k`}</Text>
                    <View style={styles.forecastDot} />
                    <Text style={styles.forecastYear}>{proj.year}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.forecastConnector} />
            </Card>

            <View style={styles.milestones}>
              {[
                { amount: 500000, label: 'Half-Million Milestone', icon: '🎯' },
                { amount: 1000000, label: 'Millionaire Status', icon: '💎' },
                { amount: 2000000, label: 'Financial Independence', icon: '🏆' },
              ]
                .filter((m) => totalNetWorth < m.amount)
                .map((m) => {
                  const hit = projections.find((p) => p.netWorth >= m.amount);
                  const years = hit ? hit.year - new Date().getFullYear() : null;
                  return (
                    <Card key={m.label} style={styles.milestoneCard} variant="elevated">
                      <Text style={styles.milestoneIcon}>{m.icon}</Text>
                      <View>
                        <Text style={styles.milestoneLabel}>{m.label}</Text>
                        <Text style={styles.milestoneTarget}>
                          ${(m.amount / 1000000).toFixed(1)}M {years !== null ? `in ~${years} year${years === 1 ? '' : 's'}` : '— beyond current projection'}
                        </Text>
                      </View>
                    </Card>
                  );
                })}
            </View>
          </>
        )}

        {entries.length > 0 && activeTab === 'insights' && wealthInsights.length === 0 && (
          <Text style={styles.emptyInsightsText}>
            Add a few holdings and your monthly expenses to see personalized insights here.
          </Text>
        )}

        {entries.length > 0 && activeTab === 'insights' && wealthInsights.map((ins, i) => (
          <Card key={i} style={styles.insightCard} variant="elevated">
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, { backgroundColor: ins.color + '15' }]}>
                <Ionicons name={ins.icon as any} size={20} color={ins.color} />
              </View>
              <Text style={[styles.insightLabel, { color: ins.color }]}>{ins.label}</Text>
            </View>
            <Text style={styles.insightText}>{ins.text}</Text>
          </Card>
        ))}
          </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add/Edit Holding Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onDismiss={() => { setEditingEntry(null); }}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{editingEntry ? 'Edit Holding' : 'Add Holding'}</Text>

          {/* Import from Plaid button */}
          {!editingEntry && <Pressable accessibilityRole="button" style={styles.plaidImportBtn} onPress={openPlaidSubSheet}>
            <Ionicons name="link" size={18} color="#2E7D32" />
            <Text style={styles.plaidImportBtnText}>Import from Plaid Accounts</Text>
            <Ionicons name="chevron-forward" size={16} color="#2E7D32" />
          </Pressable>}

          <Text style={styles.modalLabel}>Category</Text>
          <View style={styles.catGrid}>
            {WEALTH_CATEGORIES.map((cat) => (
              <Pressable accessibilityRole="button" key={cat} onPress={() => setNewCategory(cat)} style={[styles.catChip, newCategory === cat && { backgroundColor: CATEGORY_COLORS[cat] ?? '#95A5A6', borderColor: CATEGORY_COLORS[cat] ?? '#95A5A6' }]}>
                <Text style={[styles.catChipText, newCategory === cat && { color: '#fff' }]}>{CATEGORY_LABELS[cat] ?? cat}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Name</Text>
          <TextInput accessibilityLabel="e.g. Vanguard S&P 500, Primary Home..." style={styles.modalInput} value={newName} onChangeText={setNewName} placeholder="e.g. Vanguard S&P 500, Primary Home..." placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Current Value ($)</Text>
          <TextInput accessibilityLabel="0" style={styles.modalInput} value={newCurrentValue} onChangeText={setNewCurrentValue} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

          <Text style={styles.modalLabel}>Cost Basis ($)</Text>
          <TextInput accessibilityLabel="What you originally paid" style={styles.modalInput} value={newCostBasis} onChangeText={setNewCostBasis} placeholder="What you originally paid" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

          <Text style={styles.modalLabel}>Institution (Optional)</Text>
          <TextInput accessibilityLabel="Fidelity, Chase, Coinbase..." style={styles.modalInput} value={newInstitution} onChangeText={setNewInstitution} placeholder="Fidelity, Chase, Coinbase..." placeholderTextColor={colors.textMuted} />

          <Button title={editingEntry ? 'Save Changes' : 'Add Holding'} onPress={handleAddEntry} />
          <Button title="Cancel" onPress={() => { setShowModal(false); setEditingEntry(null); setNewName(''); setNewCategory('savings'); setNewCurrentValue(''); setNewCostBasis(''); setNewInstitution(''); }} variant="ghost" style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>

      {/* Plaid Sub-Sheet */}
      <Modal visible={showPlaidSubSheet} transparent animationType="slide">
        <View style={styles.subSheetOverlay}>
          <View style={styles.subSheet}>
            <View style={styles.subSheetHeader}>
              <Text style={styles.subSheetTitle}>Plaid Accounts</Text>
              <Pressable accessibilityRole="button" onPress={() => setShowPlaidSubSheet(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            {plaidLoading ? (
              <Text style={styles.subSheetLoading}>Loading accounts...</Text>
            ) : plaidAccounts.length === 0 ? (
              <Text style={styles.subSheetEmpty}>No connected accounts found.</Text>
            ) : (
              <ScrollView>
                {plaidAccounts.map((acct) => (
                  <Pressable accessibilityRole="button" key={acct.plaidAccountId} style={styles.plaidAcctRow} onPress={() => prefillFromPlaid(acct)}>
                    <View style={styles.plaidAcctIcon}>
                      <Ionicons name="wallet" size={18} color="#2E7D32" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.plaidAcctName}>{acct.name}</Text>
                      <View style={styles.plaidAcctBadge}>
                        <Text style={styles.plaidAcctType}>{acct.accountType}</Text>
                      </View>
                    </View>
                    <Text style={styles.plaidAcctBalance}>${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  nwBlock: { alignItems: 'center' },
  nwLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 6 },
  nwValue: { fontSize: 44, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  gainRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  gainText: { fontSize: 13, color: '#A5D6A7', fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#2E7D32' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#2E7D32' },
  content: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 14 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  emptyInsightsText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 24, lineHeight: 19 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  allocationCard: { marginBottom: 16, borderRadius: 14 },
  allocationBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 14, gap: 2 },
  allocationSegment: { borderRadius: 3 },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  allocDot: { width: 10, height: 10, borderRadius: 5 },
  allocLabel: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  allocPct: { fontSize: 13, color: colors.textSecondary, width: 45 },
  allocVal: { fontSize: 13, fontWeight: '700', color: colors.text, width: 50, textAlign: 'right' },
  holdingCard: { marginBottom: 8, borderRadius: 14 },
  holdingHeader: { flexDirection: 'row', alignItems: 'center' },
  holdingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  holdingName: { fontSize: 13, fontWeight: '700', color: colors.text },
  holdingInst: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  holdingValue: { fontSize: 15, fontWeight: '800', color: colors.text },
  holdingGain: { fontSize: 12, fontWeight: '700', textAlign: 'right', marginTop: 2 },
  holdingActionBtn: { width: 26, height: 26, borderRadius: 7, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  returnRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  returnText: { fontSize: 11, color: colors.success },
  forecastCard: { borderRadius: 14, marginBottom: 16 },
  forecastTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  forecastSub: { fontSize: 12, color: colors.textSecondary, marginBottom: 20 },
  forecastTimeline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 8 },
  forecastPoint: { alignItems: 'center', gap: 6 },
  forecastVal: { fontSize: 12, fontWeight: '800', color: colors.primary },
  forecastDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  forecastYear: { fontSize: 11, color: colors.textMuted },
  forecastConnector: { height: 2, backgroundColor: colors.primary + '30', borderRadius: 1, marginTop: -20 },
  milestones: { gap: 10 },
  milestoneCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14 },
  milestoneIcon: { fontSize: 20 },
  milestoneLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  milestoneTarget: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  insightCard: { marginBottom: 10, borderRadius: 14 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  insightIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  insightLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  insightText: { fontSize: 13, color: colors.text, lineHeight: 19 },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  // Plaid import button in modal
  plaidImportBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#2E7D32' },
  plaidImportBtnText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catChip: { borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  catChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  // Plaid sub-sheet
  subSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  subSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%' },
  subSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subSheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  subSheetLoading: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 24 },
  subSheetEmpty: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 24 },
  plaidAcctRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  plaidAcctIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  plaidAcctName: { fontSize: 14, fontWeight: '700', color: colors.text },
  plaidAcctBadge: { backgroundColor: colors.background, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 2 },
  plaidAcctType: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  plaidAcctBalance: { fontSize: 15, fontWeight: '800', color: colors.text },
});
