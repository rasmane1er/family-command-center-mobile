import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useFinanceStore } from '../../store/useFinanceStore';

const { width } = Dimensions.get('window');

export function BudgetingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { budgets, monthlyIncome, monthlyExpenses } = useFinanceStore();

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#27AE60', '#1ABC9C']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Budget Tracker</Text>
          <Pressable style={styles.addBtn}><Ionicons name="add" size={26} color="#fff" /></Pressable>
        </View>

        <View style={styles.totalCard}>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Budgeted</Text>
            <Text style={styles.totalValue}>${totalBudgeted.toLocaleString()}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Spent</Text>
            <Text style={styles.totalValue}>${totalSpent.toLocaleString()}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Remaining</Text>
            <Text style={[styles.totalValue, { color: totalBudgeted - totalSpent < 0 ? '#FF8080' : '#9FFFDE' }]}>
              ${(totalBudgeted - totalSpent).toLocaleString()}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        <Text style={styles.sectionTitle}>Budget by Category</Text>
        {budgets.map((budget) => {
          const pct = budget.spent / budget.monthlyLimit;
          const overBudget = budget.spent > budget.monthlyLimit;
          return (
            <Card key={budget.id} style={styles.budgetCard} variant="elevated">
              <View style={styles.budgetTop}>
                <View style={[styles.budgetIcon, { backgroundColor: budget.color + '22' }]}>
                  <Ionicons name={budget.icon as any} size={22} color={budget.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.budgetTitleRow}>
                    <Text style={styles.budgetCategory}>{budget.category}</Text>
                    {overBudget && <Text style={styles.overBudget}>OVER!</Text>}
                  </View>
                  <ProgressBar
                    progress={Math.min(pct, 1)}
                    color={pct > 1 ? colors.danger : pct > 0.8 ? colors.warning : colors.success}
                    backgroundColor={colors.border}
                    height={10}
                    radius={5}
                    style={{ marginTop: 8 }}
                  />
                  <View style={styles.budgetAmounts}>
                    <Text style={[styles.budgetSpent, { color: overBudget ? colors.danger : colors.text }]}>
                      ${budget.spent.toFixed(2)} spent
                    </Text>
                    <Text style={styles.budgetLimit}>of ${budget.monthlyLimit}/mo</Text>
                  </View>
                </View>
              </View>
              <View style={styles.budgetStats}>
                <View style={styles.budgetStat}>
                  <Text style={styles.budgetStatValue}>{Math.round(pct * 100)}%</Text>
                  <Text style={styles.budgetStatLabel}>Used</Text>
                </View>
                <View style={styles.budgetStat}>
                  <Text style={[styles.budgetStatValue, { color: overBudget ? colors.danger : colors.success }]}>
                    ${Math.abs(budget.monthlyLimit - budget.spent).toFixed(0)}
                  </Text>
                  <Text style={styles.budgetStatLabel}>{overBudget ? 'Over' : 'Left'}</Text>
                </View>
                <View style={styles.budgetStat}>
                  <Text style={styles.budgetStatValue}>${budget.monthlyLimit}</Text>
                  <Text style={styles.budgetStatLabel}>Limit/mo</Text>
                </View>
              </View>
            </Card>
          );
        })}

        <Card style={styles.insightCard} padding={20}>
          <View style={styles.insightRow}>
            <Ionicons name="bulb" size={24} color={colors.secondary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.insightTitle}>AI Budget Insight</Text>
              <Text style={styles.insightText}>
                Your food spending is 47% of total budget. Consider meal prepping to reduce dining out costs by ~$120/month.
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  totalCard: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: 16 },
  totalItem: { flex: 1, alignItems: 'center' },
  totalDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  totalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 6 },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 14 },
  budgetCard: { marginBottom: 14, borderRadius: 16 },
  budgetTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  budgetIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  budgetTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetCategory: { fontSize: 17, fontWeight: '700', color: colors.text },
  overBudget: { fontSize: 11, fontWeight: '800', color: colors.danger, backgroundColor: colors.dangerLight, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  budgetAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  budgetSpent: { fontSize: 13, fontWeight: '600' },
  budgetLimit: { fontSize: 13, color: colors.textSecondary },
  budgetStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 8 },
  budgetStat: { flex: 1, alignItems: 'center' },
  budgetStatValue: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 2 },
  budgetStatLabel: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  insightCard: { backgroundColor: '#FEF3E2', borderRadius: 16, marginTop: 8 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start' },
  insightTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  insightText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
