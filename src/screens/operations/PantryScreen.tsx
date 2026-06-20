import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, differenceInDays } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useOperationsStore } from '../../store/useOperationsStore';

const CATEGORIES = ['All', 'Meat', 'Dairy', 'Grains', 'Frozen', 'Canned', 'Beverages', 'Condiments', 'Produce'];

const categoryIcons: Record<string, string> = {
  Meat: 'fast-food',
  Dairy: 'water',
  Grains: 'leaf',
  Frozen: 'snow',
  Canned: 'cube',
  Beverages: 'wine',
  Condiments: 'flask',
  Produce: 'nutrition',
};

export function PantryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const { pantryItems, updatePantryItem } = useOperationsStore();

  const filtered = pantryItems.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || item.category === category;
    return matchSearch && matchCat;
  });

  const getExpiryStatus = (expiryDate?: string): { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' } => {
    if (!expiryDate) return { label: 'No expiry', variant: 'neutral' };
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { label: 'Expired', variant: 'danger' };
    if (days <= 3) return { label: `${days}d left`, variant: 'danger' };
    if (days <= 7) return { label: `${days}d left`, variant: 'warning' };
    return { label: `${days}d left`, variant: 'success' };
  };

  const lowStock = pantryItems.filter((i) => i.minQuantity && i.quantity <= i.minQuantity).length;
  const expiring = pantryItems.filter((i) => {
    if (!i.expiryDate) return false;
    return differenceInDays(new Date(i.expiryDate), new Date()) <= 3;
  }).length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#27AE60', '#1ABC9C']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Pantry</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.actionBtn}><Ionicons name="cart-outline" size={22} color="#fff" /></Pressable>
            <Pressable style={styles.actionBtn}><Ionicons name="add" size={24} color="#fff" /></Pressable>
          </View>
        </View>

        <View style={styles.alertRow}>
          {lowStock > 0 && (
            <View style={styles.alertChip}>
              <Ionicons name="warning" size={14} color={colors.warning} />
              <Text style={styles.alertText}>{lowStock} low stock</Text>
            </View>
          )}
          {expiring > 0 && (
            <View style={[styles.alertChip, { backgroundColor: 'rgba(231,76,60,0.25)' }]}>
              <Ionicons name="time" size={14} color={colors.danger} />
              <Text style={[styles.alertText, { color: colors.danger }]}>{expiring} expiring soon</Text>
            </View>
          )}
          <Text style={styles.pantryCount}>{pantryItems.length} items</Text>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pantry..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
        {CATEGORIES.map((cat) => (
          <Pressable key={cat} onPress={() => setCategory(cat)} style={[styles.catChip, category === cat && styles.catChipActive]}>
            <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {filtered.map((item) => {
          const expiry = getExpiryStatus(item.expiryDate);
          const isLowStock = item.minQuantity !== undefined && item.quantity <= item.minQuantity;
          return (
            <Card key={item.id} style={styles.itemCard} variant="elevated">
              <View style={styles.itemRow}>
                <View style={[styles.itemIcon, { backgroundColor: isLowStock ? colors.warningLight : '#E8F8F7' }]}>
                  <Ionicons name={(categoryIcons[item.category] || 'nutrition') as any} size={22} color={isLowStock ? colors.warning : '#27AE60'} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Badge label={expiry.label} variant={expiry.variant} size="sm" />
                  </View>
                  <Text style={styles.itemCategory}>{item.category} • {item.location || 'Pantry'}</Text>
                  <View style={styles.itemQuantityRow}>
                    <Pressable onPress={() => updatePantryItem(item.id, { quantity: Math.max(0, item.quantity - 1) })} style={styles.qtyBtn}>
                      <Ionicons name="remove" size={16} color={colors.primary} />
                    </Pressable>
                    <Text style={styles.itemQuantity}>{item.quantity} {item.unit}</Text>
                    <Pressable onPress={() => updatePantryItem(item.id, { quantity: item.quantity + 1 })} style={styles.qtyBtn}>
                      <Ionicons name="add" size={16} color={colors.primary} />
                    </Pressable>
                    {isLowStock && <Badge label="Low" variant="warning" size="sm" style={{ marginLeft: 8 }} />}
                  </View>
                </View>
              </View>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="nutrition-outline" size={60} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No items found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  alertChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(243,156,18,0.25)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  alertText: { fontSize: 12, color: colors.warning, fontWeight: '600' },
  pantryCount: { marginLeft: 'auto' as any, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#fff' },
  categoryScroll: { maxHeight: 48, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  categoryContent: { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  catChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: 'transparent' },
  catChipActive: { borderColor: colors.success, backgroundColor: '#D5F5E3' },
  catText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  catTextActive: { color: colors.success },
  content: { padding: 16 },
  itemCard: { marginBottom: 10, borderRadius: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  itemName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  itemCategory: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  itemQuantityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#E8EEF9', alignItems: 'center', justifyContent: 'center' },
  itemQuantity: { fontSize: 15, fontWeight: '700', color: colors.text, minWidth: 60, textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
});
