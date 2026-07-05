import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOperationsStore } from '../../store/useOperationsStore';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const OPS_MODULES = [
  { key: 'Pantry', icon: 'basket', label: 'Pantry', color: '#22A447', bg: '#EAF8EE', desc: 'Food inventory', group: 'Home' },
  { key: 'ShoppingList', icon: 'cart', label: 'Shopping', color: '#22A447', bg: '#EAF8EE', desc: 'Grocery lists', group: 'Home' },
  { key: 'Recipes', icon: 'restaurant', label: 'Recipes', color: '#EF4444', bg: '#FDECEC', desc: 'Cook tonight', group: 'Home' },
  { key: 'MealPlanning', icon: 'calendar', label: 'Meal Plan', color: '#F97316', bg: '#FFF1E6', desc: 'Weekly meals', group: 'Home' },
  { key: 'Vehicles', icon: 'car', label: 'Vehicles', color: '#EF4444', bg: '#FDECEC', desc: 'Maintenance', group: 'Mobility' },
  { key: 'TravelPlanning', icon: 'airplane', label: 'Travel', color: '#0097A7', bg: '#E1F7FA', desc: 'Trip planning', group: 'Mobility' },
  { key: 'CarpoolManager', icon: 'car-sport', label: 'Carpool', color: '#2475D4', bg: '#E8F2FF', desc: 'School runs', group: 'Mobility' },
  { key: 'Documents', icon: 'folder', label: 'Documents', color: '#2086E8', bg: '#E8F2FF', desc: 'Secure vault', group: 'Admin' },
  { key: 'SmartHome', icon: 'home', label: 'Smart Home', color: '#2475D4', bg: '#E8F2FF', desc: 'Devices & scenes', group: 'Home' },
  { key: 'Automation', icon: 'flash', label: 'Automation', color: '#8B5CF6', bg: '#F1EAFE', desc: 'Rules & triggers', group: 'Admin' },
  { key: 'Emergency', icon: 'shield-checkmark', label: 'Emergency', color: '#DC2626', bg: '#FDECEC', desc: 'Safety & SOS', group: 'Safety' },
  { key: 'EmergencyMode', icon: 'alert-circle', label: 'Emergency Mode', color: '#DC2626', bg: '#FDECEC', desc: 'Activate alert', group: 'Safety' },
  { key: 'Marketplace', icon: 'storefront', label: 'Marketplace', color: '#F97316', bg: '#FFF1E6', desc: 'Chore market', group: 'Family' },
  { key: 'TimeEconomy', icon: 'time', label: 'Time Economy', color: '#00838F', bg: '#E1F7FA', desc: 'Time tracking', group: 'Family' },
  { key: 'Rewards', icon: 'trophy', label: 'Rewards', color: '#F5A623', bg: '#FFF7E5', desc: 'Kids rewards', group: 'Family' },
  { key: 'PetTracker', icon: 'paw', label: 'Pet Tracker', color: '#2E7D32', bg: '#EAF8EE', desc: 'Pets & care', group: 'Family' },
  { key: 'HomeMaintenance', icon: 'construct', label: 'Maintenance', color: '#37474F', bg: '#ECEFF1', desc: 'Home repairs', group: 'Home' },
  { key: 'ChildcareManager', icon: 'heart', label: 'Childcare', color: '#EA580C', bg: '#FFF1E6', desc: 'Sitters & nannies', group: 'Family' },
  { key: 'HomeInventory', icon: 'albums', label: 'Inventory', color: '#222222', bg: '#ECEFF1', desc: 'Home belongings', group: 'Home' },
];

const FILTERS = ['All', 'Home', 'Family', 'Mobility', 'Admin', 'Safety'];

export function OperationsDashboardScreen({ navigation }: any) {
  const { t } = useTranslation('ops');
  const insets = useSafeAreaInsets();
  const { pantryItems, vehicles, documents } = useOperationsStore();
  const [activeFilter, setActiveFilter] = useState('All');

  const lowStockItems = pantryItems.filter(
    (p) => p.minQuantity && p.quantity <= p.minQuantity
  );

  const expiringItems = pantryItems.filter((p) => {
    if (!p.expiryDate) return false;
    const days = Math.ceil(
      (new Date(p.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    return days <= 3 && days >= 0;
  });

  const vehicleAlerts = vehicles.filter((v) => {
    const needsService = v.nextService && new Date(v.nextService) <= new Date();
    const insuranceExpiring =
      v.insuranceExpiry &&
      Math.ceil(
        (new Date(v.insuranceExpiry).getTime() - Date.now()) /
          (24 * 60 * 60 * 1000)
      ) <= 30;

    return needsService || insuranceExpiring;
  });

  const expiringDocs = documents.filter((d) => {
    if (!d.expiryDate) return false;
    const days = Math.ceil(
      (new Date(d.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    return days <= 90 && days >= 0;
  });

  const totalAlerts =
    lowStockItems.length +
    expiringItems.length +
    vehicleAlerts.length +
    expiringDocs.length;

  const alertCards = [
    {
      label: 'Low Stock',
      count: lowStockItems.length,
      icon: 'warning-outline',
      color: '#FDB022',
      screen: 'Pantry',
    },
    {
      label: 'Expiring',
      count: expiringItems.length,
      icon: 'time-outline',
      color: '#FF5A4F',
      screen: 'Pantry',
    },
    {
      label: 'Service Due',
      count: vehicleAlerts.length,
      icon: 'car-outline',
      color: '#65E4E8',
      screen: 'Vehicles',
    },
    {
      // "Docs" further down (Household Snapshot) already means total
      // document count — reusing that label here for a different number
      // (expiring-soon count) made the two contradict each other on the
      // same screen. This card is an alert like its siblings, so it gets
      // its own honest name instead.
      label: 'Renewals',
      count: expiringDocs.length,
      icon: 'document-outline',
      color: '#8BC5FF',
      screen: 'Documents',
    },
  ];

  const filteredModules = useMemo(() => {
    if (activeFilter === 'All') return OPS_MODULES;
    return OPS_MODULES.filter((item) => item.group === activeFilter);
  }, [activeFilter]);

  const priorityAlert = useMemo(() => {
    if (vehicleAlerts.length > 0) {
      return {
        title: 'Vehicle service required',
        message: `${vehicleAlerts.length} vehicle item${vehicleAlerts.length > 1 ? 's' : ''} need attention.`,
        screen: 'Vehicles',
        icon: 'car',
        color: '#EF4444',
        bg: '#FDECEC',
      };
    }

    if (lowStockItems.length > 0) {
      return {
        title: 'Pantry running low',
        message: `${lowStockItems.length} pantry item${lowStockItems.length > 1 ? 's are' : ' is'} below minimum stock.`,
        screen: 'Pantry',
        icon: 'basket',
        color: '#F59E0B',
        bg: '#FFF4D8',
      };
    }

    if (expiringDocs.length > 0) {
      return {
        title: 'Documents expiring soon',
        message: `${expiringDocs.length} document${expiringDocs.length > 1 ? 's' : ''} need review.`,
        screen: 'Documents',
        icon: 'document-text',
        color: '#2086E8',
        bg: '#E8F2FF',
      };
    }

    return {
      title: 'Everything is under control',
      message: 'No urgent household operations need attention right now.',
      screen: null,
      icon: 'checkmark-circle',
      color: '#22C55E',
      bg: '#EAF8EE',
    };
  }, [vehicleAlerts.length, lowStockItems.length, expiringDocs.length]);

  const screenHeader = (
    <LinearGradient
      colors={['#102F59', '#0D4268', '#0A4A72']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.headerTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Operations Center</Text>
          <Text style={styles.headerSubtitle}>
            Home, Vehicles, Documents & More
          </Text>
        </View>
      </View>

      <View style={styles.alertRow}>
        {alertCards.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => navigation.navigate(item.screen)}
            style={({ pressed }) => [
              styles.alertCard,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={item.icon as any}
              size={15}
              color={item.count > 0 ? item.color : 'rgba(255,255,255,0.42)'}
            />

            <Text
              style={[
                styles.alertNumber,
                {
                  color:
                    item.count > 0
                      ? item.color
                      : 'rgba(255,255,255,0.42)',
                },
              ]}
            >
              {item.count}
            </Text>

            <Text style={styles.alertLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#102F59', '#0A4A72']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.compactHeader,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <Text style={styles.compactTitle}>Operations</Text>
      <Text style={styles.compactMeta}>{totalAlerts} alerts</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({
          onScroll,
          onScrollEndDrag,
          onMomentumScrollEnd,
          scrollEventThrottle,
          contentPaddingTop,
        }) => (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: contentPaddingTop + 14,
                paddingBottom: 130,
              },
            ]}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
          >
            <Pressable
              disabled={!priorityAlert.screen}
              onPress={() =>
                priorityAlert.screen && navigation.navigate(priorityAlert.screen)
              }
              style={({ pressed }) => [
                styles.priorityCard,
                pressed && priorityAlert.screen && styles.pressed,
              ]}
            >
              <View style={[styles.priorityIcon, { backgroundColor: priorityAlert.bg }]}>
                <Ionicons
                  name={priorityAlert.icon as any}
                  size={27}
                  color={priorityAlert.color}
                />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.priorityTitleRow}>
                  <Text style={styles.priorityTitle}>{priorityAlert.title}</Text>
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityBadgeText}>{totalAlerts}</Text>
                  </View>
                </View>

                <Text style={styles.priorityMessage}>{priorityAlert.message}</Text>
              </View>

              {priorityAlert.screen && (
                <Ionicons name="chevron-forward" size={22} color="#7A8AA3" />
              )}
            </Pressable>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Access</Text>
              <Text style={styles.sectionLink}>Customize</Text>
            </View>

            <View style={styles.quickGrid}>
              <QuickTile
                title="Emergency"
                subtitle="SOS & Safety"
                icon="shield"
                color="#DC2626"
                bg="#FDECEC"
                onPress={() => navigation.navigate('EmergencyMode')}
              />

              <QuickTile
                title="Documents"
                subtitle="Secure Vault"
                icon="folder"
                color="#2086E8"
                bg="#E8F2FF"
                onPress={() => navigation.navigate('Documents')}
              />

              <QuickTile
                title="Automation"
                subtitle="Smart Rules"
                icon="flash"
                color="#8B5CF6"
                bg="#F1EAFE"
                onPress={() => navigation.navigate('Automation')}
              />

              <QuickTile
                title="Meal Plan"
                subtitle="This Week"
                icon="calendar"
                color="#20B486"
                bg="#E7F8F1"
                onPress={() => navigation.navigate('MealPlanning')}
              />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Modules</Text>
              <Text style={styles.moduleCount}>{filteredModules.length} tools</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {FILTERS.map((filter) => {
                const active = activeFilter === filter;

                return (
                  <Pressable
                    key={filter}
                    onPress={() => setActiveFilter(filter)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text
                      style={[styles.filterText, active && styles.filterTextActive]}
                    >
                      {filter}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.moduleList}>
              {filteredModules.map((mod) => (
                <Pressable
                  key={mod.key}
                  onPress={() => navigation.navigate(mod.key)}
                  style={({ pressed }) => [
                    styles.moduleRow,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.moduleIcon, { backgroundColor: mod.bg }]}>
                    <Ionicons name={mod.icon as any} size={24} color={mod.color} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.moduleTitle}>{mod.label}</Text>
                    <Text style={styles.moduleSubtitle}>{mod.desc}</Text>
                  </View>

                  <View style={styles.moduleArrow}>
                    <Ionicons name="chevron-forward" size={18} color="#7890AA" />
                  </View>
                </Pressable>
              ))}
            </View>

            <LinearGradient
              colors={['#0B355F', '#061F3A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.snapshotCard}
            >
              <View style={styles.snapshotHeader}>
                <Text style={styles.snapshotTitle}>Household Snapshot</Text>
                <Text style={styles.snapshotSubtitle}>
                  Live operational overview
                </Text>
              </View>

              <View style={styles.snapshotGrid}>
                <SnapshotItem icon="basket" label="Pantry" value={pantryItems.length} color="#2EAD4A" />
                <SnapshotItem icon="car" label="Vehicles" value={vehicles.length} color="#EF4444" />
                <SnapshotItem icon="folder" label="Docs" value={documents.length} color="#2086E8" />
                <SnapshotItem icon="shield" label="Expiring" value={expiringDocs.length} color="#F5A623" />
              </View>
            </LinearGradient>
          </ScrollView>
        )}
      </CollapsibleHeader>
    </View>
  );
}

function QuickTile({ title, subtitle, icon, color, bg, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickTile, pressed && styles.pressed]}
    >
      <View style={[styles.quickIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={26} color={color} />
      </View>

      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function SnapshotItem({ icon, label, value, color }: any) {
  return (
    <View style={styles.snapshotItem}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={styles.snapshotValue}>{value}</Text>
      <Text style={styles.snapshotLabel}>{label}</Text>
    </View>
  );
}

const QUICK_WIDTH = (width - 52) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },

  header: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  compactHeader: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  compactTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  compactMeta: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    fontWeight: '800',
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.9,
  },

  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },

  alertRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  alertCard: {
    flex: 1,
    height: 60,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  alertNumber: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 1,
  },

  alertLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.76)',
    marginTop: 4,
    textAlign: 'center',
  },

  content: {
    paddingHorizontal: 18,
  },

  priorityCard: {
    minHeight: 96,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#10345F',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    marginBottom: 26,
  },

  priorityIcon: {
    width: 54,
    height: 54,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  priorityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  priorityTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    color: '#0F1E36',
  },

  priorityBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#102F59',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  priorityBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  priorityMessage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6A7890',
    lineHeight: 19,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F1E36',
    letterSpacing: -0.5,
  },

  sectionLink: {
    fontSize: 14,
    fontWeight: '800',
    color: '#174CFF',
  },

  moduleCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6A7890',
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 28,
  },

  quickTile: {
    width: QUICK_WIDTH,
    minHeight: 118,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 15,
    shadowColor: '#10345F',
    shadowOpacity: 0.055,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  quickTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F1E36',
  },

  quickSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6A7890',
    marginTop: 4,
  },

  filterRow: {
    gap: 10,
    paddingBottom: 16,
  },

  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EEF2F7',
  },

  filterChipActive: {
    backgroundColor: '#102F59',
  },

  filterText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#617086',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  moduleList: {
    gap: 12,
  },

  moduleRow: {
    minHeight: 78,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#10345F',
    shadowOpacity: 0.045,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },

  moduleIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  moduleTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F1E36',
  },

  moduleSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6A7890',
    marginTop: 3,
  },

  moduleArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F6FC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  snapshotCard: {
    marginTop: 26,
    borderRadius: 28,
    padding: 18,
  },

  snapshotHeader: {
    marginBottom: 8,
  },

  snapshotTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  snapshotSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
    marginTop: 5,
  },

  snapshotGrid: {
    flexDirection: 'row',
  },

  snapshotItem: {
    flex: 1,
    alignItems: 'center',
  },

  snapshotValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 5,
  },

  snapshotLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
});