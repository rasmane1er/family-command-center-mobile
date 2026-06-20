import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { differenceInDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useOperationsStore } from '../../store/useOperationsStore';
import type { PantryItem } from '../../types';

const generateId = () => Math.random().toString(36).substring(2, 11);

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
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Produce');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newLocation, setNewLocation] = useState('Pantry');

  const { pantryItems, updatePantryItem, addPantryItem, deletePantryItem } = useOperationsStore();

  const handleAdd = () => {
    if (!newName.trim()) return;
    const item: PantryItem = {
      id: generateId(),
      familyId: 'demo-family',
      name: newName.trim(),
      category: newCategory,
      quantity: parseInt(newQuantity, 10) || 1,
      unit: newUnit.trim() || 'pcs',
      location: newLocation.trim() || 'Pantry',
      updatedAt: new Date().toISOString(),
    };
    addPantryItem(item);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewName(''); setNewCategory('Produce'); setNewQuantity('1');
    setNewUnit('pcs'); setNewLocation('Pantry');
    setShowModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Remove Item', `Remove "${name}" from pantry?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { deletePantryItem(id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
    ]);
  };

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
            <Pressable onPress={() => setShowModal(true)} style={styles.actionBtn}><Ionicons name="add" size={24} color="#fff" /></Pressable>
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
                    <Pressable onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    </Pressable>
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

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Pantry Item</Text>

          <Text style={styles.modalLabel}>Item Name *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Olive Oil" value={newName} onChangeText={setNewName} placeholderTextColor={colors.textMuted} autoFocus />

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>Quantity</Text>
              <TextInput style={styles.modalInput} placeholder="1" value={newQuantity} onChangeText={setNewQuantity} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.modalLabel}>Unit</Text>
              <TextInput style={styles.modalInput} placeholder="pcs / lbs / oz" value={newUnit} onChangeText={setNewUnit} placeholderTextColor={colors.textMuted} />
            </View>
          </View>

          <Text style={styles.modalLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
              <Pressable key={cat} onPress={() => setNewCategory(cat)} style={[styles.catChip, newCategory === cat && styles.catChipActive]}>
                <Text style={[styles.catText, newCategory === cat && styles.catTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Storage Location</Text>
          <TextInput style={[styles.modalInput, { marginBottom: 24 }]} placeholder="e.g. Pantry, Fridge, Freezer" value={newLocation} onChangeText={setNewLocation} placeholderTextColor={colors.textMuted} />

          <Button title="Add Item" onPress={handleAdd} fullWidth size="lg" disabled={!newName.trim()} />
          <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
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
  deleteBtn: { marginLeft: 4, padding: 4 },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  rowInputs: { flexDirection: 'row' },
});
