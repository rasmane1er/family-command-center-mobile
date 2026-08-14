import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAIStore } from '../../store/useAIStore';
import { getBudgetSuggestions } from '../../services/autoFillService';
import type { BudgetSuggestion } from '../../services/autoFillService';
import type { Budget } from '../../types';
import { usePlaidAutoData } from '../../hooks/usePlaidAutoData';
import { useDetectionFilter } from '../../hooks/useDetectionFilter';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

// Map Plaid category to display name
function plaidCatToDisplay(cat: string): string {
  if (cat === 'FOOD_AND_DRINK') return 'Food & Drink';
  if (cat === 'SHOPPING') return 'Shopping';
  if (cat === 'TRANSPORTATION') return 'Transportation';
  if (cat === 'ENTERTAINMENT') return 'Entertainment';
  if (cat === 'BILLS_AND_UTILITIES') return 'Utilities';
  // Capitalize first letter of each word
  return cat.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function roundUpTo50(value: number): number {
  return Math.ceil(value / 50) * 50;
}

const PRESET_COLORS = ['#FF6B6B', '#4ECDC4', '#F5A623', '#27AE60', '#2980B9', '#8E44AD', '#E91E63', '#95A5A6'];
const PRESET_ICONS = [
  { icon: 'restaurant', label: 'Food' },
  { icon: 'car', label: 'Transport' },
  { icon: 'tv', label: 'Entertain' },
  { icon: 'medkit', label: 'Health' },
  { icon: 'shirt', label: 'Clothing' },
  { icon: 'flash', label: 'Utilities' },
  { icon: 'home', label: 'Housing' },
  { icon: 'school', label: 'Education' },
  { icon: 'gift', label: 'Gifts' },
  { icon: 'airplane', label: 'Travel' },
  { icon: 'fitness', label: 'Fitness' },
  { icon: 'wallet', label: 'Savings' },
];

import { generateId } from '../../utils/generateId';

export function BudgetingScreen({ navigation, route }: any) {
  const { t } = useTranslation('finance');
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { budgets, monthlyIncome, monthlyExpenses, addBudget, deleteBudget, updateBudget, fetchBudgets } = useFinanceStore();
  const { insights } = useAIStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newIcon, setNewIcon] = useState('wallet');
  // Set by applySuggestion so a confirmed suggestion carries its Plaid
  // category link through to the create call — this is what makes `spent`
  // (computed server-side from real transactions) show a nonzero figure
  // instead of every budget outside the old 4-entry PLAID_TO_BUDGET map
  // silently reading $0 forever.
  const [newSourcePlaidCategory, setNewSourcePlaidCategory] = useState<string | undefined>(undefined);

  const [suggestionsRaw, setSuggestionsRaw] = useState<BudgetSuggestion[]>([]);

  const refreshBudgets = async () => {
    setRefreshing(true);
    try {
      await fetchBudgets();
    } finally {
      setRefreshing(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const res = await getBudgetSuggestions();
      setSuggestionsRaw(res.suggestions);
    } catch {
      // ignore
    }
  };

  usePlaidAutoData(() => {
    fetchBudgets().catch(() => {});
    loadSuggestions();
  });

  // Reactive against the live `budgets` list, keyed on the raw Plaid
  // category (not a merchant name — a budget suggestion isn't merchant-scoped).
  const existingBudgetCategoryKeys = budgets.flatMap((b) => b.plaidCategories ?? []);
  const { visible: suggestions, dismiss: dismissSuggestion } = useDetectionFilter(
    'budget',
    suggestionsRaw,
    (sg) => sg.category,
    existingBudgetCategoryKeys,
  );

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  const financialInsight = insights.find((i) => i.type === 'financial');

  // Real fallback when there's no AI insight yet — previously a hardcoded
  // "Your spending is tracking well..." shown unconditionally regardless of
  // actual budget state. Computed from real budgets: flags the category
  // closest to (or over) its limit, or an honest empty message if there's
  // no budget data to compute from at all.
  const fallbackInsight = (() => {
    if (budgets.length === 0) {
      return { title: 'Add a Budget', text: 'Create a budget category to start seeing personalized insights here.' };
    }
    const tightest = budgets.reduce((worst, b) =>
      b.monthlyLimit > 0 && b.spent / b.monthlyLimit > (worst.monthlyLimit > 0 ? worst.spent / worst.monthlyLimit : 0) ? b : worst
    , budgets[0]);
    const ratio = tightest.monthlyLimit > 0 ? tightest.spent / tightest.monthlyLimit : 0;
    if (ratio >= 1) {
      return { title: 'Over Budget', text: `${tightest.category} is $${(tightest.spent - tightest.monthlyLimit).toFixed(0)} over its $${tightest.monthlyLimit.toFixed(0)} monthly limit.` };
    }
    if (ratio >= 0.8) {
      return { title: 'Budget Alert', text: `${tightest.category} is at ${Math.round(ratio * 100)}% of its monthly limit — keep an eye on it.` };
    }
    return { title: 'On Track', text: 'Your spending is tracking well across all budget categories this month.' };
  })();

  const handleAddBudget = () => {
    const limit = parseFloat(newLimit);
    if (!newCategory.trim() || isNaN(limit) || limit <= 0) {
      Alert.alert('Invalid Input', 'Please enter a category name and valid monthly limit.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editingBudget) {
      updateBudget(editingBudget.id, { category: newCategory.trim(), monthlyLimit: limit });
      setEditingBudget(null);
      setNewCategory('');
      setNewLimit('');
      setNewColor(PRESET_COLORS[0]);
      setNewIcon('wallet');
      setShowAddModal(false);
      return;
    }
    const today = new Date();
    addBudget({
      id: generateId(),
      familyId: useAuthStore.getState().familyId ?? '',
      category: newCategory.trim(),
      monthlyLimit: limit,
      // `spent` is server-computed on every GET /finance/budgets — never
      // written here; the value doesn't matter, it's discarded on create.
      spent: 0,
      month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
      color: newColor,
      icon: newIcon,
      ...(newSourcePlaidCategory ? { source: 'plaid_detected', sourcePlaidCategory: newSourcePlaidCategory, plaidCategories: [newSourcePlaidCategory] } : {}),
    });
    setNewCategory('');
    setNewLimit('');
    setNewColor(PRESET_COLORS[0]);
    setNewIcon('wallet');
    setNewSourcePlaidCategory(undefined);
    setShowAddModal(false);
  };

  const handleDelete = (id: string, category: string) => {
    Alert.alert(`Remove "${category}" budget?`, 'This will delete this budget category.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteBudget(id);
        },
      },
    ]);
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setNewCategory(budget.category);
    setNewLimit(String(budget.monthlyLimit));
    setNewColor(budget.color ?? PRESET_COLORS[0]);
    setNewIcon(budget.icon ?? 'wallet');
    setNewSourcePlaidCategory(undefined);
    setShowAddModal(true);
  };

  const applySuggestion = (s: BudgetSuggestion) => {
    setNewCategory(plaidCatToDisplay(s.category));
    setNewLimit(String(roundUpTo50(s.monthlyAverage)));
    setNewSourcePlaidCategory(s.category);
  };

  const s = makeStyles(colors);

  const screenHeader = (
        <PremiumHeader
          title="Budget Tracker"
          onBack={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()}
          colors={['#27AE60', '#1ABC9C']}
          rightAction={
            <Pressable accessibilityRole="button" onPress={() => setShowAddModal(true)} style={s.addBtn}>
              <Ionicons name="add" size={26} color="#fff" />
            </Pressable>
          }
        >
          <View style={s.totalCard}>
            <View style={s.totalItem}>
              <Text style={s.totalLabel}>Budgeted</Text>
              <Text style={s.totalValue}>${totalBudgeted.toLocaleString()}</Text>
            </View>
            <View style={s.totalDivider} />
            <View style={s.totalItem}>
              <Text style={s.totalLabel}>Spent</Text>
              <Text style={s.totalValue}>${totalSpent.toLocaleString()}</Text>
            </View>
            <View style={s.totalDivider} />
            <View style={s.totalItem}>
              <Text style={s.totalLabel}>Remaining</Text>
              <Text style={[s.totalValue, { color: totalBudgeted - totalSpent < 0 ? '#FF8080' : '#9FFFDE' }]}>
                ${(totalBudgeted - totalSpent).toLocaleString()}
              </Text>
            </View>
          </View>
        </PremiumHeader>
  );
  const screenCompact = (
    <LinearGradient
      colors={['#27AE60', '#1ABC9C']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable accessibilityRole="button" onPress={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()} style={{ padding: 8, marginRight: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>Budget</Text>
      <View />
    </LinearGradient>
  );

  return (
    <View style={s.container}>


      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView
            contentContainerStyle={[s.content, { paddingTop: contentPaddingTop, paddingBottom: 100 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshBudgets} />}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Budget by Category</Text>
          <Text style={s.budgetCount}>{budgets.length} categories</Text>
        </View>

        {budgets.map((budget) => {
          const effectiveSpent = budget.spent;
          const pct = budget.monthlyLimit > 0 ? effectiveSpent / budget.monthlyLimit : 0;
          const overBudget = effectiveSpent > budget.monthlyLimit;
          const barColor = pct > 1 ? colors.danger : pct > 0.8 ? colors.warning : colors.success;
          return (
            <Card key={budget.id} style={s.budgetCard} variant="elevated">
              <View style={s.budgetTop}>
                <View style={[s.budgetIcon, { backgroundColor: budget.color + '22' }]}>
                  <Ionicons name={budget.icon as any} size={22} color={budget.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={s.budgetTitleRow}>
                    <Text style={s.budgetCategory}>{budget.category}</Text>
                    {overBudget && <Text style={s.overBudget}>OVER!</Text>}
                  </View>
                  <ProgressBar
                    progress={Math.min(pct, 1)}
                    color={barColor}
                    backgroundColor={colors.border}
                    height={10}
                    radius={5}
                    style={{ marginTop: 8 }}
                  />
                  <View style={s.budgetAmounts}>
                    <Text style={[s.budgetSpent, { color: overBudget ? colors.danger : colors.text }]}>
                      ${effectiveSpent.toFixed(2)} spent
                    </Text>
                    <Text style={s.budgetLimit}>of ${budget.monthlyLimit}/mo</Text>
                  </View>
                </View>
                <Pressable accessibilityRole="button" onPress={() => handleEditBudget(budget)} style={s.editBtn}>
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => handleDelete(budget.id, budget.category)} style={s.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </Pressable>
              </View>
              <View style={s.budgetStats}>
                <View style={s.budgetStat}>
                  <Text style={s.budgetStatValue}>{Math.round(pct * 100)}%</Text>
                  <Text style={s.budgetStatLabel}>Used</Text>
                </View>
                <View style={s.budgetStat}>
                  <Text style={[s.budgetStatValue, { color: overBudget ? colors.danger : colors.success }]}>
                    ${Math.abs(budget.monthlyLimit - effectiveSpent).toFixed(0)}
                  </Text>
                  <Text style={s.budgetStatLabel}>{overBudget ? 'Over' : 'Left'}</Text>
                </View>
                <View style={s.budgetStat}>
                  <Text style={s.budgetStatValue}>${budget.monthlyLimit}</Text>
                  <Text style={s.budgetStatLabel}>Limit/mo</Text>
                </View>
              </View>
            </Card>
          );
        })}

        {budgets.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="wallet-outline" size={56} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No budgets yet</Text>
            <Text style={s.emptyDesc}>Tap + to create your first budget category.</Text>
          </View>
        )}

        <Card style={s.insightCard} padding={20}>
          <View style={s.insightRow}>
            <Ionicons name="bulb" size={24} color={colors.secondary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.insightTitle}>{financialInsight?.title ?? fallbackInsight.title}</Text>
              <Text style={s.insightText}>
                {financialInsight?.summary ?? fallbackInsight.text}
              </Text>
            </View>
          </View>
        </Card>
          </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add Budget Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <ScrollView style={s.modalSheet} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingBudget ? 'Edit Budget' : 'Add Budget Category'}</Text>
              <Pressable accessibilityRole="button" onPress={() => { setEditingBudget(null); setShowAddModal(false); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Suggested Budgets */}
            {suggestions.length > 0 && !editingBudget && (
              <View style={s.suggestionsContainer}>
                <Text style={s.suggestionsLabel}>
                  <Ionicons name="analytics" size={13} color="#27AE60" /> Suggested Budgets
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {suggestions.slice(0, 8).map((sg) => {
                    const existingBudget = budgets.find(
                      (b) => b.category.toLowerCase() === plaidCatToDisplay(sg.category).toLowerCase(),
                    );
                    const isOverBudget = existingBudget && sg.monthlyAverage > existingBudget.monthlyLimit;
                    return (
                      <View key={sg.category} style={[s.suggestionChip, isOverBudget && s.suggestionChipOver]}>
                        <Pressable accessibilityRole="button"
                          style={s.suggestionChipDismiss}
                          onPress={() => dismissSuggestion(sg.category)}
                          hitSlop={8}
                        >
                          <Ionicons name="close" size={12} color={colors.textMuted} />
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={() => applySuggestion(sg)}>
                          <Text style={[s.suggestionChipName, isOverBudget && s.suggestionChipNameOver]}>
                            {plaidCatToDisplay(sg.category)}
                          </Text>
                          <Text style={[s.suggestionChipAmount, isOverBudget && s.suggestionChipAmountOver]}>
                            avg ${sg.monthlyAverage.toFixed(0)}/mo
                          </Text>
                          <Text style={s.suggestionChipRange}>
                            ${sg.monthlyMin.toFixed(0)}–${sg.monthlyMax.toFixed(0)}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <Text style={s.modalLabel}>Category Name</Text>
            <TextInput accessibilityLabel="e.g. Dining Out"
              style={s.modalInput}
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="e.g. Dining Out"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={s.modalLabel}>Monthly Limit ($)</Text>
            <TextInput accessibilityLabel="0"
              style={s.modalInput}
              value={newLimit}
              onChangeText={setNewLimit}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={s.modalLabel}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {PRESET_ICONS.map((pi) => (
                <Pressable accessibilityRole="button"
                  key={pi.icon}
                  onPress={() => setNewIcon(pi.icon)}
                  style={[s.iconChip, newIcon === pi.icon && { backgroundColor: newColor, borderColor: newColor }]}
                >
                  <Ionicons name={pi.icon as any} size={18} color={newIcon === pi.icon ? '#fff' : colors.textSecondary} />
                  <Text style={[s.iconChipText, newIcon === pi.icon && { color: '#fff' }]}>{pi.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.modalLabel}>Color</Text>
            <View style={s.colorRow}>
              {PRESET_COLORS.map((c) => (
                <Pressable accessibilityRole="button"
                  key={c}
                  onPress={() => setNewColor(c)}
                  style={[s.colorSwatch, { backgroundColor: c }, newColor === c && s.colorSwatchActive]}
                >
                  {newColor === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                </Pressable>
              ))}
            </View>

            <Pressable accessibilityRole="button"
              onPress={handleAddBudget}
              style={[s.modalSubmit, { backgroundColor: newColor }, (!newCategory.trim() || !newLimit) && s.modalSubmitDisabled]}
            >
              <Ionicons name={editingBudget ? 'checkmark-circle' : 'add-circle'} size={18} color="#fff" />
              <Text style={s.modalSubmitText}>{editingBudget ? 'Save Changes' : 'Add Budget'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    totalCard: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: 16 },
    totalItem: { flex: 1, alignItems: 'center' },
    totalDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
    totalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 6 },
    totalValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
    content: { padding: 16 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    budgetCount: { fontSize: 13, color: colors.textSecondary },
    budgetCard: { marginBottom: 14, borderRadius: 16 },
    budgetTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    budgetIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    budgetTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetCategory: { fontSize: 17, fontWeight: '700', color: colors.text },
    overBudget: { fontSize: 11, fontWeight: '800', color: colors.danger, backgroundColor: colors.dangerLight, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
    actualLabel: { fontSize: 11, fontWeight: '700', marginTop: 4 },
    budgetAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    budgetSpent: { fontSize: 13, fontWeight: '600' },
    budgetLimit: { fontSize: 13, color: colors.textSecondary },
    editBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    deleteBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    budgetStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 8 },
    budgetStat: { flex: 1, alignItems: 'center' },
    budgetStatValue: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 2 },
    budgetStatLabel: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    emptyState: { alignItems: 'center', paddingVertical: 50 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 14 },
    emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
    insightCard: { backgroundColor: '#FEF3E2', borderRadius: 16, marginTop: 8 },
    insightRow: { flexDirection: 'row', alignItems: 'flex-start' },
    insightTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
    insightText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    // Suggestions
    suggestionsContainer: { backgroundColor: '#EDF7EF', borderRadius: 12, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#27AE60' },
    suggestionsLabel: { fontSize: 12, fontWeight: '700', color: '#27AE60' },
    suggestionChip: { borderRadius: 10, borderWidth: 1.5, borderColor: '#27AE60', paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, backgroundColor: '#fff', minWidth: 100, position: 'relative' },
    suggestionChipDismiss: { position: 'absolute', top: 4, right: 4, zIndex: 1 },
    suggestionChipOver: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
    suggestionChipName: { fontSize: 12, fontWeight: '700', color: colors.text },
    suggestionChipNameOver: { color: colors.danger },
    suggestionChipAmount: { fontSize: 12, color: '#27AE60', fontWeight: '600', marginTop: 2 },
    suggestionChipAmountOver: { color: colors.danger },
    suggestionChipRange: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
    modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: colors.text, marginBottom: 16 },
    iconChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8 },
    iconChipText: { fontSize: 11, color: colors.textSecondary },
    colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    colorSwatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    colorSwatchActive: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
    modalSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
    modalSubmitDisabled: { opacity: 0.5 },
    modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}
