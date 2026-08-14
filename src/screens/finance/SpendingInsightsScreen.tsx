import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { getSpendingByCategory, getMonthlySpending, getTransactions } from '../../services/plaidService';
import type { PlaidTransaction } from '../../types';
import { useTranslation } from 'react-i18next';
import { usePlaidAutoData } from '../../hooks/usePlaidAutoData';

const CATEGORY_COLORS: Record<string, string> = {
  FOOD_AND_DRINK: '#FF6B6B',
  SHOPPING: '#4ECDC4',
  TRANSPORTATION: '#45B7D1',
  BILLS: '#96CEB4',
  ENTERTAINMENT: '#FFEAA7',
};

function catColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? '#DDA0DD';
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthShort(ym: string): string {
  const [, m] = ym.split('-').map(Number);
  return SHORT_MONTHS[m - 1] ?? ym;
}

export function SpendingInsightsScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation('finance');
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [categories, setCategories] = useState<{ category: string; total: number; count: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; total: number }[]>([]);
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [catRes, monthlyRes, txRes] = await Promise.all([
        getSpendingByCategory(month),
        getMonthlySpending(),
        getTransactions({ limit: 200, month }),
      ]);
      setCategories(catRes.categories);
      setMonthlyData(monthlyRes.months);
      setTransactions(txRes.transactions);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);
  usePlaidAutoData(load);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = (() => {
    const [y, m] = month.split('-').map(Number);
    return format(new Date(y, m - 1, 1), 'MMMM yyyy');
  })();

  const totalSpent = transactions.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const totalIncome = transactions.filter((tx) => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const netSavings = totalIncome - totalSpent;

  const maxCat = categories[0]?.total ?? 1;
  const maxMonthly = Math.max(...monthlyData.map((m) => m.total), 1);

  const topMerchants = (() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.amount <= 0) continue;
      const key = tx.merchantName ?? tx.name;
      map.set(key, (map.get(key) ?? 0) + tx.amount);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  })();

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#1E3A5F" />
        </Pressable>
        <Text style={s.headerTitle}>{t('spending.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.monthRow}>
        <Pressable accessibilityRole="button" onPress={() => shiftMonth(-1)} style={s.monthArrow}>
          <Ionicons name="chevron-back" size={18} color="#1E3A5F" />
        </Pressable>
        <Text style={s.monthLabel}>{monthLabel}</Text>
        <Pressable accessibilityRole="button" onPress={() => shiftMonth(1)} style={s.monthArrow}>
          <Ionicons name="chevron-forward" size={18} color="#1E3A5F" />
        </Pressable>
      </View>

      {loading && !refreshing ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#4A90D9" />
        </View>
      ) : error ? (
        <View style={s.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Summary cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.summaryScroll} contentContainerStyle={s.summaryContent}>
            {[
              { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}`, color: '#EF4444', icon: 'arrow-up-circle-outline' },
              { label: 'Total Income', value: `$${totalIncome.toFixed(2)}`, color: '#10B981', icon: 'arrow-down-circle-outline' },
              { label: 'Net Savings', value: `$${netSavings.toFixed(2)}`, color: netSavings >= 0 ? '#4A90D9' : '#F59E0B', icon: 'wallet-outline' },
            ].map((card) => (
              <View key={card.label} style={s.summaryCard}>
                <Ionicons name={card.icon as any} size={22} color={card.color} />
                <Text style={[s.summaryValue, { color: card.color }]}>{card.value}</Text>
                <Text style={s.summaryLabel}>{card.label}</Text>
              </View>
            ))}
          </ScrollView>

          {/* By Category */}
          <Text style={s.sectionTitle}>Spending by Category</Text>
          {categories.length === 0 ? (
            <Text style={s.emptyText}>No spending data for this month.</Text>
          ) : (
            categories.map((item) => {
              const widthPct = item.total / maxCat;
              const color = catColor(item.category);
              return (
                <View key={item.category} style={s.catRow}>
                  <View style={[s.catIconDot, { backgroundColor: color + '33' }]}>
                    <Text style={[s.catIconText, { color }]}>{item.category.charAt(0)}</Text>
                  </View>
                  <View style={s.catBody}>
                    <Text style={s.catName}>{item.category.replace(/_/g, ' ')}</Text>
                    <View style={s.catBarWrap}>
                      <View style={[s.catBar, { width: `${Math.round(widthPct * 100)}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                  <View style={s.catRight}>
                    <Text style={s.catAmount}>${item.total.toFixed(0)}</Text>
                    <Text style={s.catCount}>{item.count} txn{item.count !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
              );
            })
          )}

          {/* Top Merchants */}
          {topMerchants.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 24 }]}>Top Merchants</Text>
              {topMerchants.map(([name, total], idx) => (
                <View key={name} style={s.merchantRow}>
                  <View style={s.merchantRank}>
                    <Text style={s.merchantRankText}>{idx + 1}</Text>
                  </View>
                  <Text style={s.merchantName} numberOfLines={1}>{name}</Text>
                  <Text style={s.merchantTotal}>${total.toFixed(2)}</Text>
                </View>
              ))}
            </>
          )}

          {/* Monthly Trend */}
          {monthlyData.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 24 }]}>Monthly Trend</Text>
              <View style={s.trendChart}>
                {monthlyData.map((item) => {
                  const heightPct = item.total / maxMonthly;
                  return (
                    <View key={item.month} style={s.trendBarWrap}>
                      <Text style={s.trendAmount}>${item.total > 999 ? `${(item.total / 1000).toFixed(1)}k` : item.total.toFixed(0)}</Text>
                      <View style={s.trendBarContainer}>
                        <View style={[s.trendBar, { height: `${Math.max(4, Math.round(heightPct * 100))}%`, backgroundColor: '#4A90D9' }]} />
                      </View>
                      <Text style={s.trendMonthLabel}>{monthShort(item.month)}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F0F3F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F3F9' },
  monthArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F0F3F9', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', minWidth: 130, textAlign: 'center' },
  body: { padding: 16, paddingBottom: 100 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center' },
  summaryScroll: { flexGrow: 0, marginBottom: 24 },
  summaryContent: { gap: 12 },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, width: 130 },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E', marginBottom: 14 },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', paddingVertical: 20 },
  catRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 8 },
  catIconDot: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catIconText: { fontSize: 16, fontWeight: '800' },
  catBody: { flex: 1, marginRight: 12 },
  catName: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 6 },
  catBarWrap: { height: 8, backgroundColor: '#F0F3F9', borderRadius: 4, overflow: 'hidden' },
  catBar: { height: 8, borderRadius: 4 },
  catRight: { alignItems: 'flex-end' },
  catAmount: { fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
  catCount: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  merchantRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8 },
  merchantRank: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  merchantRankText: { fontSize: 13, fontWeight: '800', color: '#6366F1' },
  merchantName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  merchantTotal: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
  trendChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, height: 160 },
  trendBarWrap: { flex: 1, alignItems: 'center', height: '100%' },
  trendAmount: { fontSize: 9, color: '#6B7280', marginBottom: 4, textAlign: 'center' },
  trendBarContainer: { flex: 1, width: '60%', justifyContent: 'flex-end' },
  trendBar: { width: '100%', borderRadius: 4 },
  trendMonthLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', marginTop: 4 },
});
