import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import {
  useShoppingStore, ShopCategory,
  SHOP_CAT_CONFIG, CAT_ORDER,
} from '../../store/useShoppingStore';
import { useOperationsStore } from '../../store/useOperationsStore';

const UNITS = ['ea', 'lbs', 'oz', 'g', 'kg', 'cup', 'tbsp', 'tsp', 'bag', 'box', 'bottle', 'can', 'pack', 'bunch', 'carton', 'gallon', 'loaf', 'jar', 'pint', 'block'];

export function ShoppingListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { items, budget, addItem, toggleItem, deleteItem, clearChecked, seedDemoData } = useShoppingStore();
  const { pantryItems } = useOperationsStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showChecked, setShowChecked] = useState(true);

  // New item form state
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<ShopCategory>('other');
  const [newQty, setNewQty] = useState('1');
  const [newUnit, setNewUnit] = useState('ea');
  const [newPrice, setNewPrice] = useState('');

  if (items.length === 0) seedDemoData();

  const unchecked = useMemo(() => items.filter((i) => !i.checked), [items]);
  const checked = useMemo(() => items.filter((i) => i.checked), [items]);
  const totalCost = useMemo(
    () => items.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0),
    [items]
  );
  const checkedCost = useMemo(
    () => checked.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0),
    [checked]
  );

  const lowStockSuggestions = useMemo(
    () => pantryItems.filter(
      (p) => p.quantity <= (p.minQuantity || 1) &&
        !items.some((i) => i.name.toLowerCase() === p.name.toLowerCase())
    ).slice(0, 5),
    [pantryItems, items]
  );

  const grouped = useMemo(() => {
    const g: Partial<Record<ShopCategory, typeof unchecked>> = {};
    for (const item of unchecked) {
      if (!g[item.category]) g[item.category] = [];
      g[item.category]!.push(item);
    }
    return g;
  }, [unchecked]);

  const handleToggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleItem(id);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Remove item?', `Remove "${name}" from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); deleteItem(id); },
      },
    ]);
  };

  const handleAddItem = () => {
    if (!newName.trim()) return;
    addItem({
      name: newName.trim(),
      category: newCat,
      quantity: parseFloat(newQty) || 1,
      unit: newUnit,
      estimatedPrice: newPrice ? parseFloat(newPrice) : undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewName(''); setNewPrice(''); setNewQty('1'); setNewUnit('ea'); setNewCat('other');
    setShowAdd(false);
  };

  const handleAddFromPantry = (name: string, unit: string) => {
    addItem({ name, category: 'pantry', quantity: 1, unit });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1A6B3C', '#27AE60']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Shopping List</Text>
          <Pressable onPress={() => clearChecked()} style={styles.clearBtn}>
            <Ionicons name="checkmark-done" size={20} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>

        <View style={styles.budgetRow}>
          <View>
            <Text style={styles.budgetLabel}>BUDGET</Text>
            <Text style={styles.budgetValue}>${budget.toFixed(0)}</Text>
          </View>
          <View style={styles.budgetCenter}>
            <ProgressBar
              progress={Math.min(totalCost / budget, 1)}
              color={totalCost > budget ? '#FF6B6B' : '#fff'}
              backgroundColor="rgba(255,255,255,0.2)"
              height={8}
            />
            <Text style={styles.budgetHint}>
              ${totalCost.toFixed(2)} estimated · ${(budget - totalCost).toFixed(2)} left
            </Text>
          </View>
          <View style={styles.budgetRight}>
            <Text style={styles.budgetLabel}>IN CART</Text>
            <Text style={styles.budgetValue}>{checked.length}/{items.length}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        {/* Pantry low-stock suggestions */}
        {lowStockSuggestions.length > 0 && (
          <View style={styles.suggestSection}>
            <Text style={styles.suggestLabel}>⚠️ Running Low — Add to List?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {lowStockSuggestions.map((p) => (
                <Pressable key={p.id} onPress={() => handleAddFromPantry(p.name, p.unit)} style={styles.suggestChip}>
                  <Ionicons name="add-circle" size={16} color="#27AE60" />
                  <Text style={styles.suggestChipText}>{p.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Items by category */}
        {CAT_ORDER.map((cat) => {
          const catItems = grouped[cat];
          if (!catItems || catItems.length === 0) return null;
          const cfg = SHOP_CAT_CONFIG[cat];
          return (
            <View key={cat} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryEmoji}>{cfg.emoji}</Text>
                <Text style={[styles.categoryLabel, { color: cfg.color }]}>{cfg.label}</Text>
                <Text style={styles.categoryCount}>{catItems.length}</Text>
              </View>
              {catItems.map((item) => (
                <Pressable
                  key={item.id}
                  onLongPress={() => handleDelete(item.id, item.name)}
                  style={styles.itemRow}
                >
                  <Pressable
                    onPress={() => handleToggle(item.id)}
                    style={[styles.checkbox, { borderColor: cfg.color }]}
                  >
                    {item.checked && <Ionicons name="checkmark" size={14} color={cfg.color} />}
                  </Pressable>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
                  </View>
                  {item.estimatedPrice != null && (
                    <Text style={styles.itemPrice}>${item.estimatedPrice.toFixed(2)}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          );
        })}

        {/* Checked items */}
        {checked.length > 0 && (
          <View style={styles.categorySection}>
            <Pressable onPress={() => setShowChecked(!showChecked)} style={styles.categoryHeader}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.categoryLabel, { color: colors.success, marginLeft: 6 }]}>
                In Cart ({checked.length})
              </Text>
              <Text style={[styles.categoryCount, { color: colors.success, marginLeft: 'auto' }]}>
                ${checkedCost.toFixed(2)}
              </Text>
              <Ionicons name={showChecked ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} style={{ marginLeft: 8 }} />
            </Pressable>
            {showChecked && checked.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleToggle(item.id)}
                onLongPress={() => handleDelete(item.id, item.name)}
                style={[styles.itemRow, styles.itemChecked]}
              >
                <View style={[styles.checkbox, styles.checkboxChecked]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
                <Text style={[styles.itemName, styles.itemNameChecked]}>{item.name}</Text>
                <Text style={styles.itemPrice}>${(item.estimatedPrice || 0).toFixed(2)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {items.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 56 }}>🛒</Text>
            <Text style={styles.emptyTitle}>List is empty!</Text>
            <Text style={styles.emptyDesc}>Tap + to add items or let us suggest from your pantry.</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable onPress={() => setShowAdd(true)} style={[styles.fab, { bottom: insets.bottom + 24 }]}>
        <LinearGradient colors={['#1A6B3C', '#27AE60']} style={styles.fabGrad}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </Pressable>

      {/* Add Item Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Item</Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalLabel}>Item Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Almond Milk"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <Text style={styles.modalLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {CAT_ORDER.map((cat) => {
                  const cfg = SHOP_CAT_CONFIG[cat];
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setNewCat(cat)}
                      style={[styles.catChip, newCat === cat && { backgroundColor: cfg.color }]}
                    >
                      <Text style={styles.catChipEmoji}>{cfg.emoji}</Text>
                      <Text style={[styles.catChipText, newCat === cat && { color: '#fff' }]}>{cfg.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={styles.modalRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Quantity</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newQty}
                    onChangeText={setNewQty}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {UNITS.slice(0, 8).map((u) => (
                        <Pressable key={u} onPress={() => setNewUnit(u)} style={[styles.unitChip, newUnit === u && styles.unitChipActive]}>
                          <Text style={[styles.unitText, newUnit === u && styles.unitTextActive]}>{u}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
              <Text style={styles.modalLabel}>Estimated Price ($)</Text>
              <TextInput
                style={styles.modalInput}
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
              />
              <Pressable onPress={handleAddItem} style={[styles.addBtn, !newName.trim() && styles.addBtnDisabled]} disabled={!newName.trim()}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Add to List</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  clearBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  budgetLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 3 },
  budgetValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  budgetCenter: { flex: 1 },
  budgetHint: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 5 },
  budgetRight: { alignItems: 'flex-end' },
  content: { padding: 16 },
  suggestSection: { marginBottom: 16 },
  suggestLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 8 },
  suggestChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D5F5E3', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 },
  suggestChipText: { fontSize: 13, fontWeight: '600', color: '#1A6B3C' },
  categorySection: { marginBottom: 8 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  categoryEmoji: { fontSize: 16, marginRight: 6 },
  categoryLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  categoryCount: { fontSize: 11, color: colors.textMuted, marginLeft: 6, backgroundColor: colors.border, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  itemChecked: { opacity: 0.6 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  itemName: { fontSize: 15, fontWeight: '600', color: colors.text },
  itemNameChecked: { textDecorationLine: 'line-through', color: colors.textMuted },
  itemQty: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: colors.text },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  fab: { position: 'absolute', right: 20, borderRadius: 32, overflow: 'hidden' },
  fabGrad: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 31 },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalContent: { padding: 20, gap: 4 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  modalRow: { flexDirection: 'row', alignItems: 'flex-end' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.card, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  catChipEmoji: { fontSize: 14 },
  catChipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  unitChip: { backgroundColor: colors.card, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  unitChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitText: { fontSize: 12, fontWeight: '600', color: colors.text },
  unitTextActive: { color: '#fff' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#27AE60', borderRadius: 14, paddingVertical: 16, marginTop: 24 },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
