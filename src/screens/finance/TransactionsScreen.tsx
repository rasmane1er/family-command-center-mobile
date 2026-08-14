import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTransactions } from '../../services/plaidService';
import type { PlaidTransaction } from '../../types';
import { useTranslation } from 'react-i18next';
import { usePlaidAutoData } from '../../hooks/usePlaidAutoData';

const CATEGORIES = ['All', 'FOOD_AND_DRINK', 'SHOPPING', 'TRANSPORTATION', 'BILLS', 'INCOME', 'OTHER'];
const CATEGORY_LABELS: Record<string, string> = {
  All: 'All',
  FOOD_AND_DRINK: 'Food & Drink',
  SHOPPING: 'Shopping',
  TRANSPORTATION: 'Transportation',
  BILLS: 'Bills',
  INCOME: 'Income',
  OTHER: 'Other',
};
const CATEGORY_COLORS: Record<string, string> = {
  FOOD_AND_DRINK: '#FF6B6B',
  SHOPPING: '#4ECDC4',
  TRANSPORTATION: '#45B7D1',
  BILLS: '#96CEB4',
  INCOME: '#27AE60',
  OTHER: '#DDA0DD',
};

function formatDateLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE MMM d');
}

function MerchantIcon({ name, color }: { name: string; color: string }) {
  return (
    <View style={[s.merchantIcon, { backgroundColor: color + '22' }]}>
      <Text style={[s.merchantInitial, { color }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

function SkeletonRow() {
  return (
    <View style={s.skeletonRow}>
      <View style={s.skeletonCircle} />
      <View style={s.skeletonBody}>
        <View style={s.skeletonLine} />
        <View style={[s.skeletonLine, { width: '50%', marginTop: 6 }]} />
      </View>
      <View style={[s.skeletonLine, { width: 60 }]} />
    </View>
  );
}

type GroupedItem =
  | { type: 'header'; date: string; key: string }
  | { type: 'tx'; tx: PlaidTransaction; key: string };

const PAGE_SIZE = 30;

export function TransactionsScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation('finance');
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchTransactions = useCallback(async (reset = true) => {
    try {
      const offset = reset ? 0 : transactions.length;
      if (reset) setLoading(true);
      else setLoadingMore(true);
      const res = await getTransactions({
        limit: PAGE_SIZE,
        offset,
        category: category === 'All' ? undefined : category,
        search: debouncedSearch || undefined,
        month,
      });
      if (reset) {
        setTransactions(res.transactions);
      } else {
        setTransactions((prev) => [...prev, ...res.transactions]);
      }
      setTotal(res.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [category, debouncedSearch, month, transactions.length]);

  useEffect(() => {
    fetchTransactions(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, debouncedSearch, month]);

  // Also refetch whenever a bank connects or a sync completes elsewhere in
  // the app, so a freshly-linked account's transactions show up here
  // without the user having to change a filter first.
  usePlaidAutoData(() => fetchTransactions(true));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, debouncedSearch, month]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && transactions.length < total) {
      fetchTransactions(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, transactions.length, total]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = (() => {
    const [y, m] = month.split('-').map(Number);
    return format(new Date(y, m - 1, 1), 'MMMM yyyy');
  })();

  const grouped: GroupedItem[] = [];
  let lastDate = '';
  for (const tx of transactions) {
    if (tx.date !== lastDate) {
      grouped.push({ type: 'header', date: tx.date, key: `h-${tx.date}` });
      lastDate = tx.date;
    }
    grouped.push({ type: 'tx', tx, key: tx.plaidTransactionId });
  }

  const renderItem = ({ item }: { item: GroupedItem }) => {
    if (item.type === 'header') {
      return <Text style={s.dateHeader}>{formatDateLabel(item.date)}</Text>;
    }
    const { tx } = item;
    const isIncome = tx.amount < 0;
    const catColor = CATEGORY_COLORS[tx.category] ?? '#999';
    const displayName = tx.merchantName ?? tx.name;
    return (
      <View style={s.txRow}>
        <MerchantIcon name={displayName} color={catColor} />
        <View style={s.txBody}>
          <Text style={s.txName} numberOfLines={1}>{displayName}</Text>
          <View style={s.txMeta}>
            <View style={[s.catBadge, { backgroundColor: catColor + '22' }]}>
              <Text style={[s.catBadgeText, { color: catColor }]}>{tx.category.replace(/_/g, ' ')}</Text>
            </View>
            {tx.pending && <View style={s.pendingBadge}><Text style={s.pendingBadgeText}>Pending</Text></View>}
          </View>
        </View>
        <Text style={[s.txAmount, { color: isIncome ? '#10B981' : '#EF4444' }]}>
          {isIncome ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
        </Text>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={22} color="#1E3A5F" />
        </Pressable>
        <Text style={s.headerTitle}>{t('transactions.title')}</Text>
        <Pressable
          onPress={() => navigation.navigate('ReceiptScanner')}
          style={s.cameraBtn}
          accessibilityRole="button"
          accessibilityLabel={t('transactions.scanReceipt')}
        >
          <Ionicons name="camera-outline" size={22} color="#1E3A5F" />
        </Pressable>
      </View>

      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color="#6B7280" style={s.searchIcon} />
        <TextInput accessibilityLabel="Search transactions..."
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search transactions..."
          placeholderTextColor="#9CA3AF"
        />
        {search.length > 0 && (
          <Pressable accessibilityRole="button" onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        )}
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

      <FlatList
        data={['pills']}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={() => 'pills'}
        style={s.pillsScroll}
        contentContainerStyle={s.pillsContent}
        renderItem={() => (
          <>
            {CATEGORIES.map((cat) => (
              <Pressable accessibilityRole="button"
                key={cat}
                onPress={() => setCategory(cat)}
                style={[s.pill, category === cat && s.pillActive]}
              >
                <Text style={[s.pillText, category === cat && s.pillTextActive]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
              </Pressable>
            ))}
          </>
        )}
      />

      {loading && !refreshing ? (
        <View style={s.skeletons}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : error ? (
        <View style={s.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={s.emptyTitle}>Failed to load</Text>
          <Text style={s.emptyDesc}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          contentContainerStyle={
            transactions.length === 0
              ? s.emptyContent
              : [s.listContent, { paddingBottom: s.listContent.paddingBottom + insets.bottom }]
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
              <Text style={s.emptyTitle}>No transactions</Text>
              <Text style={s.emptyDesc}>No transactions found for this period.</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 16 }} color="#4A90D9" /> : null}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F0F3F9', alignItems: 'center', justifyContent: 'center' },
  cameraBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F0F3F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  searchRow: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A2E' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 },
  monthArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F0F3F9', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', minWidth: 130, textAlign: 'center' },
  pillsScroll: { flexGrow: 0, marginBottom: 8 },
  pillsContent: { paddingHorizontal: 16, gap: 8 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  pillActive: { backgroundColor: '#1E3A5F', borderColor: '#1E3A5F' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  pillTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyContent: { flex: 1 },
  dateHeader: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8 },
  merchantIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  merchantInitial: { fontSize: 18, fontWeight: '800' },
  txBody: { flex: 1 },
  txName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 6 },
  txMeta: { flexDirection: 'row', gap: 6 },
  catBadge: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  catBadgeText: { fontSize: 10, fontWeight: '700' },
  pendingBadge: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  pendingBadgeText: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  txAmount: { fontSize: 15, fontWeight: '800' },
  skeletons: { paddingHorizontal: 16, paddingTop: 16 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8 },
  skeletonCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E5E7EB', marginRight: 12 },
  skeletonBody: { flex: 1 },
  skeletonLine: { height: 14, borderRadius: 7, backgroundColor: '#E5E7EB', width: '75%' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginTop: 14 },
  emptyDesc: { fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center' },
});
