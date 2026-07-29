import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useHomeInventoryStore } from '../../store/useHomeInventoryStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getRetailPurchases, type RetailPurchase } from '../../services/autoFillService';
import { useTranslation } from 'react-i18next';

import { generateId } from '../../utils/generateId';

type InventoryRoom =
  | 'living_room' | 'kitchen' | 'master_bedroom' | 'bedroom_2' | 'bedroom_3'
  | 'bathroom' | 'garage' | 'office' | 'basement' | 'attic' | 'outdoor' | 'other';

type ItemCondition = 'excellent' | 'good' | 'fair' | 'poor';

type ItemCategory =
  | 'electronics' | 'furniture' | 'appliance' | 'jewelry' | 'clothing'
  | 'tools' | 'sports' | 'collectible' | 'other';

const ROOM_LABELS: Record<InventoryRoom, string> = {
  living_room: 'Living Room',
  kitchen: 'Kitchen',
  master_bedroom: 'Master Bedroom',
  bedroom_2: 'Bedroom 2',
  bedroom_3: 'Bedroom 3',
  bathroom: 'Bathroom',
  garage: 'Garage',
  office: 'Office',
  basement: 'Basement',
  attic: 'Attic',
  outdoor: 'Outdoor',
  other: 'Other',
};

const ROOM_ICONS: Record<InventoryRoom, string> = {
  living_room: 'tv',
  kitchen: 'restaurant',
  master_bedroom: 'bed',
  bedroom_2: 'bed-outline',
  bedroom_3: 'bed-outline',
  bathroom: 'water',
  garage: 'car',
  office: 'desktop',
  basement: 'layers',
  attic: 'layers',
  outdoor: 'leaf',
  other: 'home',
};

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  electronics: 'Electronics',
  furniture: 'Furniture',
  appliance: 'Appliance',
  jewelry: 'Jewelry',
  clothing: 'Clothing',
  tools: 'Tools',
  sports: 'Sports',
  collectible: 'Collectible',
  other: 'Other',
};

const CATEGORY_ICONS: Record<ItemCategory, string> = {
  electronics: 'laptop',
  furniture: 'bed',
  appliance: 'restaurant',
  jewelry: 'diamond',
  clothing: 'shirt',
  tools: 'construct',
  sports: 'football',
  collectible: 'star',
  other: 'cube',
};

const CATEGORY_COLORS: Record<ItemCategory, string> = {
  electronics: '#2980B9',
  furniture: '#F5A623',
  appliance: '#27AE60',
  jewelry: '#FFD700',
  clothing: '#E74C3C',
  tools: '#8E44AD',
  sports: '#16A085',
  collectible: '#E67E22',
  other: '#95A5A6',
};

const CONDITION_COLORS: Record<ItemCondition, string> = {
  excellent: '#27AE60',
  good: '#2980B9',
  fair: '#F5A623',
  poor: '#E74C3C',
};

const CONDITION_BADGE: Record<ItemCondition, 'success' | 'info' | 'warning' | 'danger'> = {
  excellent: 'success',
  good: 'info',
  fair: 'warning',
  poor: 'danger',
};

const ALL_ROOMS: InventoryRoom[] = [
  'living_room', 'kitchen', 'master_bedroom', 'bedroom_2', 'bedroom_3',
  'bathroom', 'garage', 'office', 'basement', 'attic', 'outdoor', 'other',
];

const ALL_CATEGORIES: ItemCategory[] = [
  'electronics', 'furniture', 'appliance', 'jewelry', 'clothing', 'tools', 'sports', 'collectible', 'other',
];

const ALL_CONDITIONS: ItemCondition[] = ['excellent', 'good', 'fair', 'poor'];

export function HomeInventoryScreen({ navigation }: any) {
  const { t } = useTranslation('ops');
  const insets = useSafeAreaInsets();
  const { items, addItem, updateItem, deleteItem, getTotalValue, getItemsByRoom } = useHomeInventoryStore();
  const familyId = useFamilyStore((s) => s.family?.id) ?? useAuthStore.getState().familyId ?? '';

  const [activeTab, setActiveTab] = useState<'By Room' | 'All Items' | 'Value Report'>('By Room');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedRooms, setExpandedRooms] = useState<Set<InventoryRoom>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<ItemCategory | 'all'>('all');

  const sortedFilteredItems = useMemo(() => {
    let filtered = items;
    if (searchQuery) {
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (i.brand ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter((i) => i.category === filterCategory);
    }
    return [...filtered].sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));
  }, [items, searchQuery, filterCategory]);

  // Add modal state
  const [newRoom, setNewRoom] = useState<InventoryRoom>('living_room');
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newCategory, setNewCategory] = useState<ItemCategory>('electronics');
  const [newCondition, setNewCondition] = useState<ItemCondition>('good');
  const [newPurchaseDate, setNewPurchaseDate] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');
  const [newCurrentValue, setNewCurrentValue] = useState('');
  const [newWarrantyExpiry, setNewWarrantyExpiry] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [retailPurchases, setRetailPurchases] = useState<RetailPurchase[]>([]);
  const [retailBannerExpanded, setRetailBannerExpanded] = useState(true);
  const [dismissedPurchases, setDismissedPurchases] = useState<Set<string>>(new Set());

  useEffect(() => {
    getRetailPurchases(100, 30)
      .then((res) => setRetailPurchases(res.purchases))
      .catch(() => {
        // Silently fail if Plaid not connected
      });
  }, []);

  const totalValue = getTotalValue();
  const roomsWithItems = ALL_ROOMS.filter((r) => getItemsByRoom(r).length > 0);

  const today = new Date();
  const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

  const warrantyExpiring = items.filter((item) => {
    if (!item.warrantyExpiry) return false;
    const expiry = new Date(item.warrantyExpiry);
    return expiry >= today && expiry <= in60Days;
  });

  const toggleRoom = (room: InventoryRoom) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(room)) next.delete(room);
      else next.add(room);
      return next;
    });
  };

  const handleItemPress = (item: any) => {
    Alert.alert(
      item.name,
      [
        item.brand && `Brand: ${item.brand}`,
        item.model && `Model: ${item.model}`,
        item.serialNumber && `S/N: ${item.serialNumber}`,
        `Category: ${CATEGORY_LABELS[item.category as ItemCategory]}`,
        `Condition: ${item.condition}`,
        item.purchaseDate && `Purchased: ${item.purchaseDate}`,
        item.purchasePrice && `Purchase Price: $${item.purchasePrice.toLocaleString()}`,
        item.currentValue != null && `Current Value: $${item.currentValue.toLocaleString()}`,
        item.warrantyExpiry && `Warranty: ${item.warrantyExpiry}`,
        item.notes && `Notes: ${item.notes}`,
      ]
        .filter(Boolean)
        .join('\n'),
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            deleteItem(item.id);
          },
        },
      ]
    );
  };

  const handleAddItem = () => {
    if (!newName.trim()) {
      Alert.alert(t('common.validationTitle'), t('common.validationMsg'));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const purchasePrice = parseFloat(newPurchasePrice);
    const currentValue = parseFloat(newCurrentValue);
    addItem({
      familyId,
      room: newRoom,
      name: newName.trim(),
      brand: newBrand.trim() || undefined,
      model: newModel.trim() || undefined,
      serialNumber: newSerial.trim() || undefined,
      category: newCategory,
      condition: newCondition,
      purchaseDate: newPurchaseDate.trim() || undefined,
      purchasePrice: isNaN(purchasePrice) ? undefined : purchasePrice,
      currentValue: isNaN(currentValue) ? undefined : currentValue,
      warrantyExpiry: newWarrantyExpiry.trim() || undefined,
      notes: newNotes.trim() || undefined,
    });
    setNewName('');
    setNewBrand('');
    setNewModel('');
    setNewSerial('');
    setNewCategory('electronics');
    setNewCondition('good');
    setNewPurchaseDate('');
    setNewPurchasePrice('');
    setNewCurrentValue('');
    setNewWarrantyExpiry('');
    setNewNotes('');
    setShowAddModal(false);
  };

  const renderItemCard = (item: any) => {
    const isWarrantyExpiringSoon = item.warrantyExpiry
      ? new Date(item.warrantyExpiry) <= in60Days && new Date(item.warrantyExpiry) >= today
      : false;
    return (
      <Pressable key={item.id} onPress={() => handleItemPress(item)}>
        <Card style={styles.itemCard} variant="elevated">
          <View style={styles.itemRow}>
            <View style={[styles.itemIcon, { backgroundColor: CATEGORY_COLORS[item.category as ItemCategory] + '22' }]}>
              <Ionicons
                name={CATEGORY_ICONS[item.category as ItemCategory] as any}
                size={20}
                color={CATEGORY_COLORS[item.category as ItemCategory]}
              />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              {(item.brand || item.model) && (
                <Text style={styles.itemBrand}>{[item.brand, item.model].filter(Boolean).join(' ')}</Text>
              )}
              <View style={styles.itemBadgeRow}>
                <Badge label={ROOM_LABELS[item.room as InventoryRoom]} variant="neutral" size="sm" />
                <Badge
                  label={item.condition}
                  variant={CONDITION_BADGE[item.condition as ItemCondition]}
                  size="sm"
                />
                {isWarrantyExpiringSoon && (
                  <Badge label="Warranty Expiring" variant="warning" size="sm" />
                )}
              </View>
            </View>
            <View style={styles.itemRight}>
              {item.currentValue != null && (
                <Text style={styles.itemValue}>${item.currentValue.toLocaleString()}</Text>
              )}
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  const renderByRoomTab = () => (
    <View style={styles.tabContent}>
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="home-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No items tracked</Text>
          <Text style={styles.emptyDesc}>Tap + to add your first item.</Text>
        </View>
      ) : (
        roomsWithItems.map((room) => {
          const roomItems = getItemsByRoom(room);
          const roomValue = roomItems.reduce((sum, i) => sum + (i.currentValue ?? 0), 0);
          const isExpanded = expandedRooms.has(room);
          return (
            <View key={room}>
              <Pressable
                onPress={() => toggleRoom(room)}
                style={styles.roomHeader}
              >
                <View style={styles.roomIconCircle}>
                  <Ionicons name={ROOM_ICONS[room] as any} size={18} color={colors.primary} />
                </View>
                <View style={styles.roomHeaderInfo}>
                  <Text style={styles.roomName}>{ROOM_LABELS[room]}</Text>
                  <Text style={styles.roomSub}>{roomItems.length} items • ${roomValue.toLocaleString()}</Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
              {isExpanded && roomItems.map(renderItemCard)}
            </View>
          );
        })
      )}
    </View>
  );

  const renderAllItemsTab = () => {
    const sorted = sortedFilteredItems;
    return (
      <View style={styles.tabContent}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search items..."
          placeholderTextColor={colors.textMuted}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <Pressable
            onPress={() => setFilterCategory('all')}
            style={{ ...styles.filterChip, ...(filterCategory === 'all' && styles.filterChipActive) }}
          >
            <Text style={{ ...styles.filterChipText, ...(filterCategory === 'all' && styles.filterChipTextActive) }}>All</Text>
          </Pressable>
          {ALL_CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setFilterCategory(cat)}
              style={{ ...styles.filterChip, ...(filterCategory === cat && styles.filterChipActive) }}
            >
              <Text style={{ ...styles.filterChipText, ...(filterCategory === cat && styles.filterChipTextActive) }}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {sorted.map(renderItemCard)}
        {sorted.length === 0 && (
          <Text style={styles.noResults}>No items match your search.</Text>
        )}
      </View>
    );
  };

  const renderValueReportTab = () => {
    // Category breakdown
    const catTotals: Partial<Record<ItemCategory, number>> = {};
    items.forEach((item) => {
      catTotals[item.category] = (catTotals[item.category] ?? 0) + (item.currentValue ?? 0);
    });
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]) as [ItemCategory, number][];
    const maxCatValue = Math.max(...sortedCats.map((c) => c[1]), 1);

    return (
      <View style={styles.tabContent}>
        <Card style={styles.totalValueCard} variant="elevated">
          <Text style={styles.totalValueLabel}>Total Insured Value</Text>
          <Text style={styles.totalValueAmount}>${totalValue.toLocaleString()}</Text>
          <Text style={styles.totalValueSub}>{items.length} items across {roomsWithItems.length} rooms</Text>
        </Card>

        <Text style={styles.sectionLabel}>Value by Category</Text>
        {sortedCats.map(([cat, val]) => (
          <Card key={cat} style={styles.catValueCard} variant="elevated">
            <View style={styles.catValueRow}>
              <View style={[styles.catIcon, { backgroundColor: CATEGORY_COLORS[cat] + '22' }]}>
                <Ionicons name={CATEGORY_ICONS[cat] as any} size={16} color={CATEGORY_COLORS[cat]} />
              </View>
              <Text style={styles.catLabel}>{CATEGORY_LABELS[cat]}</Text>
              <View style={styles.catBarWrapper}>
                <View style={[styles.catBar, { width: `${(val / maxCatValue) * 100}%` as any, backgroundColor: CATEGORY_COLORS[cat] }]} />
              </View>
              <Text style={styles.catValue}>${val.toLocaleString()}</Text>
            </View>
          </Card>
        ))}

        {warrantyExpiring.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Warranty Expiring Soon</Text>
            {warrantyExpiring.map(renderItemCard)}
          </>
        )}
      </View>
    );
  };

  const screenHeader = (
    <LinearGradient
      colors={['#212121', '#37474F', '#455A64']}
      style={{ paddingTop: insets.top + 6, paddingBottom: 8, paddingHorizontal: 20 }}
    >
      <View style={styles.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('homeInventory.title')}</Text>
        <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.headerStats}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{items.length}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>${(totalValue / 1000).toFixed(1)}K</Text>
          <Text style={styles.statLabel}>Total Value</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{roomsWithItems.length}</Text>
          <Text style={styles.statLabel}>Rooms</Text>
        </View>
      </View>
    
    <View style={styles.tabBar}>
            {(['By Room', 'All Items', 'Value Report'] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{ ...styles.tabItem, ...(activeTab === tab && styles.tabItemActive) }}
              >
                <Text style={{ ...styles.tabText, ...(activeTab === tab && styles.tabTextActive) }}>
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>
</LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#212121', '#37474F']}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}
    >
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>{t('homeInventory.title')}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{items.length} items</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Tabs */}
      

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100, paddingTop: contentPaddingTop }}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
          >
            {retailPurchases.filter((p) => !dismissedPurchases.has(p.merchantName + p.date)).length > 0 && (
              <View style={styles.retailBanner}>
                <Pressable onPress={() => setRetailBannerExpanded((v) => !v)} style={styles.retailBannerHeader}>
                  <Ionicons name="bag-handle-outline" size={16} color="#37474F" />
                  <Text style={styles.retailBannerTitle}>Recent purchases to add?</Text>
                  <Ionicons name={retailBannerExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#37474F" />
                </Pressable>
                {retailBannerExpanded && retailPurchases
                  .filter((p) => !dismissedPurchases.has(p.merchantName + p.date))
                  .slice(0, 5)
                  .map((purchase, i) => (
                    <View key={i} style={styles.retailPurchaseRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.retailMerchant}>{purchase.merchantName}</Text>
                        <Text style={styles.retailDetail}>${purchase.amount} · {purchase.date}</Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          setNewName(purchase.merchantName);
                          setNewPurchaseDate(purchase.date);
                          setNewPurchasePrice(purchase.amount.toString());
                          setNewCurrentValue(purchase.amount.toString());
                          setShowAddModal(true);
                          setDismissedPurchases((prev) => new Set([...prev, purchase.merchantName + purchase.date]));
                        }}
                        style={styles.retailAddBtn}
                      >
                        <Ionicons name="add" size={14} color="#fff" />
                        <Text style={styles.retailAddBtnText}>Add</Text>
                      </Pressable>
                      <Pressable onPress={() => setDismissedPurchases((prev) => new Set([...prev, purchase.merchantName + purchase.date]))} style={styles.retailDismissBtn}>
                        <Ionicons name="close" size={14} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  ))}
              </View>
            )}

            {activeTab === 'By Room' && renderByRoomTab()}
            {activeTab === 'All Items' && renderAllItemsTab()}
            {activeTab === 'Value Report' && renderValueReportTab()}
          </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add Item Modal */}

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Item</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Room *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.roomPickerRow}>
                {ALL_ROOMS.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setNewRoom(r)}
                    style={{ ...styles.roomPickerBtn, ...(newRoom === r && styles.roomPickerBtnActive) }}
                  >
                    <Ionicons
                      name={ROOM_ICONS[r] as any}
                      size={18}
                      color={newRoom === r ? '#fff' : colors.textSecondary}
                    />
                    <Text style={{ ...styles.roomPickerLabel, ...(newRoom === r && styles.roomPickerLabelActive) }}>
                      {ROOM_LABELS[r]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.modalLabel}>Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Samsung TV"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Brand</Text>
            <TextInput
              style={styles.modalInput}
              value={newBrand}
              onChangeText={setNewBrand}
              placeholder="e.g. Samsung"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Model</Text>
            <TextInput
              style={styles.modalInput}
              value={newModel}
              onChangeText={setNewModel}
              placeholder="e.g. QN65Q80C"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Serial Number</Text>
            <TextInput
              style={styles.modalInput}
              value={newSerial}
              onChangeText={setNewSerial}
              placeholder="e.g. SN-12345"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Category *</Text>
            <View style={styles.chipGrid}>
              {ALL_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setNewCategory(cat)}
                  style={{ ...styles.chip, ...(newCategory === cat && { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] }) }}
                >
                  <Ionicons
                    name={CATEGORY_ICONS[cat] as any}
                    size={14}
                    color={newCategory === cat ? '#fff' : colors.textSecondary}
                  />
                  <Text style={{ ...styles.chipText, ...(newCategory === cat && { color: '#fff' }) }}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Condition *</Text>
            <View style={styles.chipGrid}>
              {ALL_CONDITIONS.map((cond) => (
                <Pressable
                  key={cond}
                  onPress={() => setNewCondition(cond)}
                  style={{ ...styles.chip, ...(newCondition === cond && { backgroundColor: CONDITION_COLORS[cond], borderColor: CONDITION_COLORS[cond] }) }}
                >
                  <Text style={{ ...styles.chipText, ...(newCondition === cond && { color: '#fff' }) }}>
                    {cond.charAt(0).toUpperCase() + cond.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Purchase Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={newPurchaseDate}
              onChangeText={setNewPurchaseDate}
              placeholder="2023-01-15"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Purchase Price ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={newPurchasePrice}
              onChangeText={setNewPurchasePrice}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Current Value ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={newCurrentValue}
              onChangeText={setNewCurrentValue}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Warranty Expiry (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={newWarrantyExpiry}
              onChangeText={setNewWarrantyExpiry}
              placeholder="2026-01-15"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              style={[styles.modalInput, { height: 72 }]}
              value={newNotes}
              onChangeText={setNewNotes}
              placeholder="Any additional notes..."
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Pressable
              onPress={handleAddItem}
              style={[styles.submitBtn, !newName.trim() && styles.submitBtnDisabled]}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Add Item</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  retailBanner: { backgroundColor: '#ECEFF1', borderLeftWidth: 4, borderLeftColor: '#37474F', margin: 12, borderRadius: 12, padding: 12 },
  retailBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  retailBannerTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#37474F' },
  retailPurchaseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, backgroundColor: '#fff', borderRadius: 10, padding: 8 },
  retailMerchant: { fontSize: 13, fontWeight: '700', color: colors.text },
  retailDetail: { fontSize: 11, color: colors.textSecondary },
  retailAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#37474F' },
  retailAddBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  retailDismissBtn: { padding: 4 },
  container: { flex: 1, backgroundColor: colors.background },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerStats: { flexDirection: 'row', alignItems: 'center' },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },
  tabBar: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: '#37474F' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#37474F' },
  tabContent: { padding: 16, paddingBottom: 100 },
  roomHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  roomIconCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8EEF9', alignItems: 'center', justifyContent: 'center' },
  roomHeaderInfo: { flex: 1 },
  roomName: { fontSize: 15, fontWeight: '700', color: colors.text },
  roomSub: { fontSize: 12, color: colors.textSecondary },
  itemCard: { marginBottom: 8, marginLeft: 8, borderRadius: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemBrand: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  itemBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  itemRight: { alignItems: 'flex-end' },
  itemValue: { fontSize: 15, fontWeight: '800', color: colors.text },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 14 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  demoBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#37474F', borderRadius: 12 },
  demoBtnText: { color: '#fff', fontWeight: '700' },
  searchInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14, color: colors.text, marginBottom: 12 },
  filterScroll: { marginBottom: 12 },
  filterChip: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8 },
  filterChipActive: { backgroundColor: '#37474F', borderColor: '#37474F' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  noResults: { textAlign: 'center', color: colors.textMuted, paddingVertical: 40 },
  totalValueCard: { borderRadius: 16, alignItems: 'center', marginBottom: 20, paddingVertical: 20 },
  totalValueLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  totalValueAmount: { fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: -1 },
  totalValueSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  catValueCard: { marginBottom: 8, borderRadius: 14 },
  catValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catLabel: { width: 80, fontSize: 13, fontWeight: '700', color: colors.text },
  catBarWrapper: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  catBar: { height: 8, borderRadius: 4 },
  catValue: { fontSize: 13, fontWeight: '700', color: colors.text, width: 72, textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: colors.text, marginBottom: 16 },
  roomPickerRow: { flexDirection: 'row', gap: 8 },
  roomPickerBtn: { alignItems: 'center', padding: 10, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, minWidth: 76 },
  roomPickerBtnActive: { backgroundColor: '#37474F', borderColor: '#37474F' },
  roomPickerLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  roomPickerLabelActive: { color: '#fff' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#37474F', borderRadius: 14, paddingVertical: 14 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
