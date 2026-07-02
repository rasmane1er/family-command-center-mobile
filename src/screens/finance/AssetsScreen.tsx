import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../components/common/Card';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { useOperationsStore } from '../../store/useOperationsStore';
import { getInvestmentAccounts } from '../../services/autoFillService';
import type { PlaidInvestmentAccount } from '../../services/autoFillService';
import type { Asset } from '../../types';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { colors } = useTheme();
  const { assets, addAsset, deleteAsset } = useOperationsStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Electronics');
  const [newValue, setNewValue] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');

  // Plaid investment accounts
  const [investmentAccounts, setInvestmentAccounts] = useState<PlaidInvestmentAccount[]>([]);
  const [showPlaidCard, setShowPlaidCard] = useState(false);

  useEffect(() => {
    getInvestmentAccounts()
      .then((res) => {
        setInvestmentAccounts(res.accounts);
        if (res.accounts.length > 0) setShowPlaidCard(true);
      })
      .catch(() => {/* silent */ });
  }, []);

  // Vehicles aren't auto-merged in with a guessed value — there's no real
  // valuation data source (Vehicle has no value field, VIN lookup isn't
  // integrated). A user who wants a vehicle counted here can add it as a
  // real Asset (category: Vehicle) with a value they actually know.
  const allAssets: Asset[] = assets;
  const totalAssets = allAssets.reduce((sum, a) => sum + a.value, 0);

  const grouped = allAssets.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {} as Record<string, Asset[]>);

  // Filter out already-imported accounts
  const availableAccounts = investmentAccounts.filter(
    (acct) => !allAssets.some((a) => a.name === acct.name),
  );

  const prefillFromPlaid = (acct: PlaidInvestmentAccount) => {
    setNewName(acct.name);
    setNewCategory('Investments');
    setNewValue(String(acct.balance));
    setNewPurchasePrice('');
    setShowAddModal(true);
  };

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

  const s = makeStyles(colors);

  const screenHeader = (
      <PremiumHeader
        title="Asset Tracker"
        onBack={() => navigation.goBack()}
        colors={['#1A1A2E', '#16213E']}
        rightAction={
          <Pressable onPress={() => setShowAddModal(true)} style={s.addBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        }
      >
        <Text style={s.totalLabel}>Total Asset Value</Text>
        <Text style={s.totalValue}>${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        <View style={s.statsRow}>
          <Text style={s.totalSub}>{allAssets.length} assets tracked</Text>
          <Text style={s.totalSub}>•</Text>
          <Text style={s.totalSub}>{Object.keys(grouped).length} categories</Text>
        </View>
      </PremiumHeader>
  );
  const screenCompact = (
    <LinearGradient
      colors={['#1A1A2E', '#16213E']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>Assets</Text>
      <View />
    </LinearGradient>
  );

  return (
    <View style={s.container}>


      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView contentContainerStyle={[s.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]} onScroll={onScroll} onScrollEndDrag={onScrollEndDrag} onMomentumScrollEnd={onMomentumScrollEnd} scrollEventThrottle={scrollEventThrottle}>
        {/* Plaid Investment Accounts Card */}
        {showPlaidCard && availableAccounts.length > 0 && (
          <View style={s.plaidCard}>
            <View style={s.plaidCardHeader}>
              <Ionicons name="link" size={16} color="#8E44AD" />
              <Text style={s.plaidCardTitle}>Link Plaid Accounts</Text>
              <Pressable onPress={() => setShowPlaidCard(false)}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={s.plaidCardSub}>{availableAccounts.length} investment account{availableAccounts.length > 1 ? 's' : ''} found</Text>
            {availableAccounts.map((acct) => (
              <View key={acct.plaidAccountId} style={s.plaidAccountRow}>
                <View style={s.plaidAccountIcon}>
                  <Ionicons name="trending-up" size={18} color="#8E44AD" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.plaidAccountName}>{acct.name}</Text>
                  {acct.mask && <Text style={s.plaidAccountMask}>••••{acct.mask}</Text>}
                </View>
                <Text style={s.plaidAccountBalance}>${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                <Pressable style={s.importBtn} onPress={() => prefillFromPlaid(acct)}>
                  <Text style={s.importBtnText}>Import</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Allocation bar */}
        {totalAssets > 0 && (
          <Card style={s.allocationCard} variant="elevated">
            <Text style={s.allocationTitle}>Portfolio Mix</Text>
            <View style={s.allocationBar}>
              {Object.entries(grouped).map(([cat, catAssets]) => {
                const catTotal = catAssets.reduce((sum, a) => sum + a.value, 0);
                return (
                  <View
                    key={cat}
                    style={[s.allocationSegment, { flex: (catTotal / totalAssets) * 100, backgroundColor: categoryColors[cat] ?? '#95A5A6' }]}
                  />
                );
              })}
            </View>
            <View style={s.allocationLegend}>
              {Object.entries(grouped).map(([cat, catAssets]) => {
                const catTotal = catAssets.reduce((sum, a) => sum + a.value, 0);
                return (
                  <View key={cat} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: categoryColors[cat] ?? '#95A5A6' }]} />
                    <Text style={s.legendLabel}>{cat}</Text>
                    <Text style={s.legendPct}>{((catTotal / totalAssets) * 100).toFixed(0)}%</Text>
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
              <View style={s.categoryHeader}>
                <View style={[s.categoryIcon, { backgroundColor: (categoryColors[category] ?? '#95A5A6') + '20' }]}>
                  <Ionicons name={(CATEGORY_ICONS[category] ?? 'cube') as any} size={16} color={categoryColors[category] ?? '#95A5A6'} />
                </View>
                <Text style={s.categoryName}>{category}</Text>
                <Text style={s.categoryTotal}>${catTotal.toLocaleString()}</Text>
              </View>
              {categoryAssets.map((asset) => (
                <Card key={asset.id} style={s.assetCard} variant="elevated">
                  <View style={s.assetRow}>
                    <View style={[s.assetIcon, { backgroundColor: (categoryColors[asset.category] ?? '#95A5A6') + '22' }]}>
                      <Ionicons
                        name={(CATEGORY_ICONS[asset.category] ?? 'cube') as any}
                        size={22}
                        color={categoryColors[asset.category] ?? '#95A5A6'}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={s.assetName}>{asset.name}</Text>
                      <Text style={s.assetCategory}>{asset.category}</Text>
                      {asset.purchasePrice != null && (
                        <Text style={s.assetAppreciation}>
                          Purchase: ${asset.purchasePrice.toLocaleString()} •{' '}
                          <Text style={{ color: asset.value >= asset.purchasePrice ? colors.success : colors.danger }}>
                            {asset.value >= asset.purchasePrice ? '+' : '-'}$
                            {Math.abs(asset.value - asset.purchasePrice).toLocaleString()}
                          </Text>
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.assetValue}>${asset.value.toLocaleString()}</Text>
                      {!isVehicleCat && (
                        <Pressable onPress={() => handleDelete(asset.id, asset.name, isVehicleCat)} style={s.deleteBtn}>
                          <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          );
        })}

        {allAssets.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="briefcase-outline" size={56} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No assets tracked</Text>
            <Text style={s.emptyDesc}>Tap + to add your first asset.</Text>
          </View>
        )}
          </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add Asset Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Asset</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Text style={s.modalLabel}>Asset Name</Text>
            <TextInput
              style={s.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. MacBook Pro, Dining Table"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={s.modalLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setNewCategory(c)}
                  style={[s.catChip, newCategory === c && { backgroundColor: categoryColors[c] ?? colors.primary, borderColor: categoryColors[c] ?? colors.primary }]}
                >
                  <Ionicons name={(CATEGORY_ICONS[c] ?? 'cube') as any} size={14} color={newCategory === c ? '#fff' : colors.textSecondary} />
                  <Text style={[s.catChipText, newCategory === c && { color: '#fff' }]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.modalLabel}>Current Value ($)</Text>
            <TextInput
              style={s.modalInput}
              value={newValue}
              onChangeText={setNewValue}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={s.modalLabel}>Purchase Price ($) — Optional</Text>
            <TextInput
              style={s.modalInput}
              value={newPurchasePrice}
              onChangeText={setNewPurchasePrice}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Pressable
              onPress={handleAddAsset}
              style={[s.modalSubmit, (!newName.trim() || !newValue) && s.modalSubmitDisabled]}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={s.modalSubmitText}>Add Asset</Text>
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
    addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 6 },
    totalValue: { fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 4 },
    statsRow: { flexDirection: 'row', gap: 8 },
    totalSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
    content: { padding: 16 },
    // Plaid card
    plaidCard: { backgroundColor: '#F3E8FD', borderRadius: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#8E44AD', padding: 14 },
    plaidCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    plaidCardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#8E44AD' },
    plaidCardSub: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
    plaidAccountRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E5D0F8' },
    plaidAccountIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E5D0F8', alignItems: 'center', justifyContent: 'center' },
    plaidAccountName: { fontSize: 13, fontWeight: '700', color: colors.text },
    plaidAccountMask: { fontSize: 11, color: colors.textSecondary, fontFamily: 'monospace' },
    plaidAccountBalance: { fontSize: 14, fontWeight: '800', color: colors.text, marginRight: 10 },
    importBtn: { backgroundColor: '#8E44AD', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
    importBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
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
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: colors.text, marginBottom: 16 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8 },
    catChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    modalSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14 },
    modalSubmitDisabled: { opacity: 0.5 },
    modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}
