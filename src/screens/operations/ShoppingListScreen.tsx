import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import {
  useShoppingStore, ShopCategory,
  SHOP_CAT_CONFIG, CAT_ORDER,
} from '../../store/useShoppingStore';
import { useOperationsStore } from '../../store/useOperationsStore';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';

const UNITS = ['ea', 'lbs', 'oz', 'g', 'kg', 'cup', 'tbsp', 'tsp', 'bag', 'box', 'bottle', 'can', 'pack', 'bunch', 'carton', 'gallon', 'loaf', 'jar', 'pint', 'block'];

export function ShoppingListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation('ops');
  const insets = useSafeAreaInsets();
  const { items, budget, isLoaded, addItem, toggleItem, deleteItem, clearChecked, fetchFromServer } = useShoppingStore();
  const { pantryItems } = useOperationsStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showChecked, setShowChecked] = useState(true);

  // New item form state
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<ShopCategory>('other');
  const [newQty, setNewQty] = useState('1');
  const [newUnit, setNewUnit] = useState('ea');
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    if (!isLoaded) fetchFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    Alert.alert(t('common.removeTitle'), `Remove "${name}" from your list?`, [
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

  const s = makeStyles(colors);

  const screenHeader = (
        <PremiumHeader
          title={t('ops.shopping')}
          colors={['#1A6B3C', '#27AE60']}
          onBack={() => navigation.goBack()}
          rightAction={
            <Pressable onPress={() => clearChecked()} style={s.clearBtn}>
              <Ionicons name="checkmark-done" size={20} color="rgba(255,255,255,0.8)" />
            </Pressable>
          }
        >
          <View style={s.budgetRow}>
            <View>
              <Text style={s.budgetLabel}>BUDGET</Text>
              <Text style={s.budgetValue}>${budget.toFixed(0)}</Text>
            </View>
            <View style={s.budgetCenter}>
              <ProgressBar
                progress={Math.min(totalCost / budget, 1)}
                color={totalCost > budget ? '#FF6B6B' : '#fff'}
                backgroundColor="rgba(255,255,255,0.2)"
                height={8}
              />
              <Text style={s.budgetHint}>
                ${totalCost.toFixed(2)} estimated · ${(budget - totalCost).toFixed(2)} left
              </Text>
            </View>
            <View style={s.budgetRight}>
              <Text style={s.budgetLabel}>IN CART</Text>
              <Text style={s.budgetValue}>{checked.length}/{items.length}</Text>
            </View>
          </View>
        </PremiumHeader>
  );
  const screenCompact = (
    <LinearGradient
      colors={['#1A6B3C', '#27AE60']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>Shopping List</Text>
      <View />
    </LinearGradient>
  );

  return (
    <View style={s.container}>


      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView contentContainerStyle={[
  s.content,
  {
    paddingTop: contentPaddingTop + 16,
    paddingBottom: 100,
  },
]} showsVerticalScrollIndicator={false} onScroll={onScroll} onScrollEndDrag={onScrollEndDrag} onMomentumScrollEnd={onMomentumScrollEnd} scrollEventThrottle={scrollEventThrottle}>
        {/* Pantry low-stock suggestions */}
        {lowStockSuggestions.length > 0 && (
          <View style={s.suggestSection}>
            <Text style={s.suggestLabel}>⚠️ Running Low — Add to List?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {lowStockSuggestions.map((p) => (
                <Pressable key={p.id} onPress={() => handleAddFromPantry(p.name, p.unit)} style={s.suggestChip}>
                  <Ionicons name="add-circle" size={16} color="#27AE60" />
                  <Text style={s.suggestChipText}>{p.name}</Text>
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
            <View key={cat} style={s.categorySection}>
              <View style={s.categoryHeader}>
                <Text style={s.categoryEmoji}>{cfg.emoji}</Text>
                <Text style={[s.categoryLabel, { color: cfg.color }]}>{cfg.label}</Text>
                <Text style={s.categoryCount}>{catItems.length}</Text>
              </View>
              {catItems.map((item) => (
                <Pressable
                  key={item.id}
                  onLongPress={() => handleDelete(item.id, item.name)}
                  style={s.itemRow}
                >
                  <Pressable
                    onPress={() => handleToggle(item.id)}
                    style={[s.checkbox, { borderColor: cfg.color }]}
                  >
                    {item.checked && <Ionicons name="checkmark" size={14} color={cfg.color} />}
                  </Pressable>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.itemName}>{item.name}</Text>
                    <Text style={s.itemQty}>{item.quantity} {item.unit}</Text>
                  </View>
                  {item.estimatedPrice != null && (
                    <Text style={s.itemPrice}>${item.estimatedPrice.toFixed(2)}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          );
        })}

        {/* Checked items */}
        {checked.length > 0 && (
          <View style={s.categorySection}>
            <Pressable onPress={() => setShowChecked(!showChecked)} style={s.categoryHeader}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[s.categoryLabel, { color: colors.success, marginLeft: 6 }]}>
                In Cart ({checked.length})
              </Text>
              <Text style={[s.categoryCount, { color: colors.success, marginLeft: 'auto' }]}>
                ${checkedCost.toFixed(2)}
              </Text>
              <Ionicons name={showChecked ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} style={{ marginLeft: 8 }} />
            </Pressable>
            {showChecked && checked.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleToggle(item.id)}
                onLongPress={() => handleDelete(item.id, item.name)}
                style={[s.itemRow, s.itemChecked]}
              >
                <View style={[s.checkbox, s.checkboxChecked]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
                <Text style={[s.itemName, s.itemNameChecked]}>{item.name}</Text>
                <Text style={s.itemPrice}>${(item.estimatedPrice || 0).toFixed(2)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {items.length === 0 && (
          <View style={s.empty}>
            <Text style={{ fontSize: 56 }}>🛒</Text>
            <Text style={s.emptyTitle}>List is empty!</Text>
            <Text style={s.emptyDesc}>Tap + to add items or let us suggest from your pantry.</Text>
          </View>
        )}
          </ScrollView>
        )}
      </CollapsibleHeader>

      {/* FAB */}
      <Pressable onPress={() => setShowAdd(true)} style={[s.fab, { bottom: insets.bottom + 24 }]}>
        <LinearGradient colors={['#1A6B3C', '#27AE60']} style={s.fabGrad}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </Pressable>

      {/* Add Item Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Item</Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={s.modalLabel}>Item Name *</Text>
              <TextInput
                style={s.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Almond Milk"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <Text style={s.modalLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {CAT_ORDER.map((cat) => {
                  const cfg = SHOP_CAT_CONFIG[cat];
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setNewCat(cat)}
                      style={[s.catChip, newCat === cat && { backgroundColor: cfg.color }]}
                    >
                      <Text style={s.catChipEmoji}>{cfg.emoji}</Text>
                      <Text style={[s.catChipText, newCat === cat && { color: '#fff' }]}>{cfg.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={s.modalRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalLabel}>Quantity</Text>
                  <TextInput
                    style={s.modalInput}
                    value={newQty}
                    onChangeText={setNewQty}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.modalLabel}>Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {UNITS.slice(0, 8).map((u) => (
                        <Pressable key={u} onPress={() => setNewUnit(u)} style={[s.unitChip, newUnit === u && s.unitChipActive]}>
                          <Text style={[s.unitText, newUnit === u && s.unitTextActive]}>{u}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
              <Text style={s.modalLabel}>Estimated Price ($)</Text>
              <TextInput
                style={s.modalInput}
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
              />
              <Pressable onPress={handleAddItem} style={[s.addBtn, !newName.trim() && s.addBtnDisabled]} disabled={!newName.trim()}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={s.addBtnText}>Add to List</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    clearBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    budgetLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 3 },
    budgetValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
    budgetCenter: { flex: 1 },
    budgetHint: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 5 },
    budgetRight: { alignItems: 'flex-end' },
    content: { paddingHorizontal: 16,},
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
}
