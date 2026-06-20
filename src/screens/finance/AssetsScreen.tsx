import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { useOperationsStore } from '../../store/useOperationsStore';
import type { Asset } from '../../types';

const CATEGORIES = ['Real Estate', 'Vehicle', 'Electronics', 'Furniture', 'Jewelry', 'Investments', 'Collectibles', 'Other'];

const CATEGORY_ICONS: Record<string, string> = {
  'Real Estate': 'home',
  'Vehicle': 'car',
  'Electronics': 'laptop',
  'Furniture': 'bed',
  'Jewelry': 'diamond',
  'Investments': 'trending-up',
  'Collectibles': 'star',
  'Other': 'cube',
};

const categoryColors: Record<string, string> = {
  'Real Estate': '#27AE60',
  'Electronics': '#2980B9',
  'Furniture': '#F5A623',
  'Vehicle': '#E74C3C',
  'Jewelry': '#FFD700',
  'Investments': '#8E44AD',
  'Collectibles': '#16A085',
  'Other': '#95A5A6',
};

const generateId = () => Math.random().toString(36).substring(2, 11);

export function AssetsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { assets, vehicles, addAsset, deleteAsset } = useOperationsStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Electronics');
  const [newValue, setNewValue] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');

  const vehicleAssets = vehicles.map((v) => ({
    id: v.id,
    familyId: v.familyId,
    name: `${v.year} ${v.make} ${v.model}`,
    category: 'Vehicle',
    value: 25000,
    createdAt: new Date().toISOString(),
  }));

  const allAssets: Asset[] = [...assets, ...vehicleAssets];
  const totalAssets = allAssets.reduce((sum, a) => sum + a.value, 0);

  const grouped = allAssets.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {} as Record<string, Asset[]>);

  const handleAddAsset = () => {
    const value = parseFloat(newValue);
    if (!newName.trim() || isNaN(value) || value <= 0) {
      Alert.alert('Invalid Input', 'Please enter an asset name and valid value.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const purchasePrice = parseFloat(newPurchasePrice);
    const newAsset: Asset = {
      id: generateId(),
      familyId: 'family-1',
      name: newName.trim(),
      category: newCategory,
      value,
      purchasePrice: isNaN(purchasePrice) ? undefined : purchasePrice,
      createdAt: new Date().toISOString(),
    };
    addAsset(newAsset);
    setNewName('');
    setNewValue('');
    setNewPurchasePrice('');
    setNewCategory('Electronics');
    setShowAddModal(false);
  };

  const handleDelete = (id: string, name: string, isVehicle: boolean) => {
    if (isVehicle) {
      Alert.alert('Vehicle Asset', 'Vehicle assets are managed in the Vehicles section.');
      return;
    }
    Alert.alert(`Delete "${name}"?`, 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteAsset(id);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Asset Tracker</Text>
          <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>

        <Text style={styles.totalLabel}>Total Asset Value</Text>
        <Text style={styles.totalValue}>${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.totalSub}>{allAssets.length} assets tracked</Text>
          <Text style={styles.totalSub}>•</Text>
          <Text style={styles.totalSub}>{Object.keys(grouped).length} categories</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {/* Allocation bar */}
        {totalAssets > 0 && (
          <Card style={styles.allocationCard} variant="elevated">
            <Text style={styles.allocationTitle}>Portfolio Mix</Text>
            <View style={styles.allocationBar}>
              {Object.entries(grouped).map(([cat, catAssets]) => {
                const catTotal = catAssets.reduce((s, a) => s + a.value, 0);
                return (
                  <View
                    key={cat}
                    style={[styles.allocationSegment, { flex: catTotal / totalAssets * 100, backgroundColor: categoryColors[cat] ?? '#95A5A6' }]}
                  />
                );
              })}
            </View>
            <View style={styles.allocationLegend}>
              {Object.entries(grouped).map(([cat, catAssets]) => {
                const catTotal = catAssets.reduce((s, a) => s + a.value, 0);
                return (
                  <View key={cat} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: categoryColors[cat] ?? '#95A5A6' }]} />
                    <Text style={styles.legendLabel}>{cat}</Text>
                    <Text style={styles.legendPct}>{((catTotal / totalAssets) * 100).toFixed(0)}%</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {Object.entries(grouped).map(([category, categoryAssets]) => {
          const catTotal = categoryAssets.reduce((sum, a) => sum + a.value, 0);
          const isVehicleCat = category === 'Vehicle';
          return (
            <View key={category}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: (categoryColors[category] ?? '#95A5A6') + '20' }]}>
                  <Ionicons name={(CATEGORY_ICONS[category] ?? 'cube') as any} size={16} color={categoryColors[category] ?? '#95A5A6'} />
                </View>
                <Text style={styles.categoryName}>{category}</Text>
                <Text style={styles.categoryTotal}>${catTotal.toLocaleString()}</Text>
              </View>
              {categoryAssets.map((asset) => {
                const gain = asset.purchasePrice != null ? asset.value - asset.purchasePrice : null;
                return (
                  <Card key={asset.id} style={styles.assetCard} variant="elevated">
                    <View style={styles.assetRow}>
                      <View style={[styles.assetIcon, { backgroundColor: (categoryColors[asset.category] ?? '#95A5A6') + '22' }]}>
                        <Ionicons
                          name={(CATEGORY_ICONS[asset.category] ?? 'cube') as any}
                          size={22}
                          color={categoryColors[asset.category] ?? '#95A5A6'}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={styles.assetName}>{asset.name}</Text>
                        <Text style={styles.assetCategory}>{asset.category}</Text>
                        {asset.purchasePrice != null && (
                          <Text style={styles.assetAppreciation}>
                            Purchase: ${asset.purchasePrice.toLocaleString()} •{' '}
                            <Text style={{ color: asset.value >= asset.purchasePrice ? colors.success : colors.danger }}>
                              {asset.value >= asset.purchasePrice ? '+' : '-'}$
                              {Math.abs(asset.value - asset.purchasePrice).toLocaleString()}
                            </Text>
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.assetValue}>${asset.value.toLocaleString()}</Text>
                        {!isVehicleCat && (
                          <Pressable onPress={() => handleDelete(asset.id, asset.name, isVehicleCat)} style={styles.deleteBtn}>
                            <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          );
        })}

        {allAssets.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No assets tracked</Text>
            <Text style={styles.emptyDesc}>Tap + to add your first asset.</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Asset Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Asset</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Asset Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. MacBook Pro, Dining Table"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setNewCategory(c)}
                  style={[styles.catChip, newCategory === c && { backgroundColor: categoryColors[c] ?? colors.primary, borderColor: categoryColors[c] ?? colors.primary }]}
                >
                  <Ionicons name={(CATEGORY_ICONS[c] ?? 'cube') as any} size={14} color={newCategory === c ? '#fff' : colors.textSecondary} />
                  <Text style={[styles.catChipText, newCategory === c && { color: '#fff' }]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Current Value ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={newValue}
              onChangeText={setNewValue}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Purchase Price ($) — Optional</Text>
            <TextInput
              style={styles.modalInput}
              value={newPurchasePrice}
              onChangeText={setNewPurchasePrice}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Pressable
              onPress={handleAddAsset}
              style={[styles.modalSubmit, (!newName.trim() || !newValue) && styles.modalSubmitDisabled]}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.modalSubmitText}>Add Asset</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 6 },
  totalValue: { fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 4 },
  statsRow: { flexDirection: 'row', gap: 8 },
  totalSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  content: { padding: 16 },
  allocationCard: { marginBottom: 20, borderRadius: 16 },
  allocationTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  allocationBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12, gap: 2 },
  allocationSegment: { borderRadius: 3 },
  allocationLegend: { gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 12, color: colors.text, fontWeight: '600' },
  legendPct: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 12, gap: 8 },
  categoryIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  categoryName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  categoryTotal: { fontSize: 14, fontWeight: '700', color: colors.text },
  assetCard: { marginBottom: 10, borderRadius: 14 },
  assetRow: { flexDirection: 'row', alignItems: 'center' },
  assetIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  assetName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
  assetCategory: { fontSize: 12, color: colors.textSecondary, marginBottom: 3 },
  assetAppreciation: { fontSize: 12, color: colors.textSecondary },
  assetValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  deleteBtn: { marginTop: 6, width: 28, height: 28, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 14 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: colors.text, marginBottom: 16 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8 },
  catChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  modalSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14 },
  modalSubmitDisabled: { opacity: 0.5 },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
