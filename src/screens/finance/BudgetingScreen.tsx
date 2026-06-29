import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useAIStore } from '../../store/useAIStore';

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

const generateId = () => Math.random().toString(36).substring(2, 11);

export function BudgetingScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { budgets, monthlyIncome, monthlyExpenses, addBudget, deleteBudget } = useFinanceStore();
  const { insights } = useAIStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newIcon, setNewIcon] = useState('wallet');

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  const financialInsight = insights.find((i) => i.type === 'financial');

  const handleAddBudget = () => {
    const limit = parseFloat(newLimit);
    if (!newCategory.trim() || isNaN(limit) || limit <= 0) {
      Alert.alert('Invalid Input', 'Please enter a category name and valid monthly limit.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = new Date();
    addBudget({
      id: generateId(),
      familyId: 'family-1',
      category: newCategory.trim(),
      monthlyLimit: limit,
      spent: 0,
      month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
      color: newColor,
      icon: newIcon,
    });
    setNewCategory('');
    setNewLimit('');
    setNewColor(PRESET_COLORS[0]);
    setNewIcon('wallet');
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

  const s = makeStyles(colors);

  return (
    <View style={s.container}>
      <PremiumHeader
        title="Budget Tracker"
        onBack={() => navigation.goBack()}
        colors={['#27AE60', '#1ABC9C']}
        rightAction={
          <Pressable onPress={() => setShowAddModal(true)} style={s.addBtn}>
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

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 100 }]}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Budget by Category</Text>
          <Text style={s.budgetCount}>{budgets.length} categories</Text>
        </View>

        {budgets.map((budget) => {
          const pct = budget.spent / budget.monthlyLimit;
          const overBudget = budget.spent > budget.monthlyLimit;
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
                    color={pct > 1 ? colors.danger : pct > 0.8 ? colors.warning : colors.success}
                    backgroundColor={colors.border}
                    height={10}
                    radius={5}
                    style={{ marginTop: 8 }}
                  />
                  <View style={s.budgetAmounts}>
                    <Text style={[s.budgetSpent, { color: overBudget ? colors.danger : colors.text }]}>
                      ${budget.spent.toFixed(2)} spent
                    </Text>
                    <Text style={s.budgetLimit}>of ${budget.monthlyLimit}/mo</Text>
                  </View>
                </View>
                <Pressable onPress={() => handleDelete(budget.id, budget.category)} style={s.deleteBtn}>
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
                    ${Math.abs(budget.monthlyLimit - budget.spent).toFixed(0)}
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
              <Text style={s.insightTitle}>{financialInsight?.title ?? 'AI Budget Insight'}</Text>
              <Text style={s.insightText}>
                {financialInsight?.summary ?? 'Your spending is tracking well. Review your top categories for savings opportunities.'}
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Add Budget Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Budget Category</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Text style={s.modalLabel}>Category Name</Text>
            <TextInput
              style={s.modalInput}
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="e.g. Dining Out"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={s.modalLabel}>Monthly Limit ($)</Text>
            <TextInput
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
                <Pressable
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
                <Pressable
                  key={c}
                  onPress={() => setNewColor(c)}
                  style={[s.colorSwatch, { backgroundColor: c }, newColor === c && s.colorSwatchActive]}
                >
                  {newColor === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleAddBudget}
              style={[s.modalSubmit, { backgroundColor: newColor }, (!newCategory.trim() || !newLimit) && s.modalSubmitDisabled]}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={s.modalSubmitText}>Add Budget</Text>
            </Pressable>
          </View>
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
    budgetAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    budgetSpent: { fontSize: 13, fontWeight: '600' },
    budgetLimit: { fontSize: 13, color: colors.textSecondary },
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
    modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
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
