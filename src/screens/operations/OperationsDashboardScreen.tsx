import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { useOperationsStore } from '../../store/useOperationsStore';

const { width } = Dimensions.get('window');

const OPS_MODULES = [
  { key: 'Pantry', icon: 'nutrition', label: 'Pantry', color: '#27AE60', bg: '#D5F5E3', desc: 'Food inventory' },
  { key: 'ShoppingList', icon: 'cart', label: 'Shopping', color: '#1A6B3C', bg: '#D5F5E3', desc: 'Grocery lists' },
  { key: 'Recipes', icon: 'restaurant', label: 'Recipes', color: '#C0392B', bg: '#FDEDEC', desc: 'Cook tonight' },
  { key: 'MealPlanning', icon: 'calendar', label: 'Meal Plan', color: '#F5A623', bg: '#FEF3E2', desc: 'Weekly meals' },
  { key: 'Vehicles', icon: 'car', label: 'Vehicles', color: '#E74C3C', bg: '#FDEDEC', desc: 'Maintenance' },
  { key: 'TravelPlanning', icon: 'airplane', label: 'Travel', color: '#0E6655', bg: '#D1F2EB', desc: 'Trip planning' },
  { key: 'Documents', icon: 'folder', label: 'Documents', color: '#2980B9', bg: '#D6EAF8', desc: 'Secure vault' },
  { key: 'SmartHome', icon: 'home', label: 'Smart Home', color: '#1565C0', bg: '#E3F2FD', desc: 'Devices & scenes' },
  { key: 'Automation', icon: 'flash', label: 'Automation', color: '#6A1B9A', bg: '#F3E5F5', desc: 'Rules & triggers' },
  { key: 'Emergency', icon: 'shield-checkmark', label: 'Emergency', color: '#E74C3C', bg: '#FDEDEC', desc: 'Safety & SOS' },
  { key: 'EmergencyMode', icon: 'alert-circle', label: 'Emergency Mode', color: '#C0392B', bg: '#FDEDEC', desc: 'Activate alert' },
  { key: 'Marketplace', icon: 'storefront', label: 'Marketplace', color: '#E65100', bg: '#FFF3E0', desc: 'Chore market' },
  { key: 'TimeEconomy', icon: 'time', label: 'Time Economy', color: '#00838F', bg: '#E0F7FA', desc: 'Time tracking' },
  { key: 'Rewards', icon: 'trophy', label: 'Rewards', color: '#F5A623', bg: '#FEF3E2', desc: 'Kids rewards' },
  { key: 'PetTracker', icon: 'paw', label: 'Pet Tracker', color: '#2E7D32', bg: '#E8F5E9', desc: 'Pets & care' },
  { key: 'HomeMaintenance', icon: 'construct', label: 'Maintenance', color: '#37474F', bg: '#ECEFF1', desc: 'Home repairs' },
  { key: 'ChildcareManager', icon: 'heart', label: 'Childcare', color: '#E65100', bg: '#FFF3E0', desc: 'Sitters & nannies' },
  { key: 'HomeInventory', icon: 'albums', label: 'Inventory', color: '#212121', bg: '#ECEFF1', desc: 'Home belongings' },
  { key: 'CarpoolManager', icon: 'car-sport', label: 'Carpool', color: '#1565C0', bg: '#E3F2FD', desc: 'School runs' },
];

export function OperationsDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { pantryItems, vehicles, documents } = useOperationsStore();

  const lowStockItems = pantryItems.filter((p) => p.minQuantity && p.quantity <= p.minQuantity);
  const expiringItems = pantryItems.filter((p) => {
    if (!p.expiryDate) return false;
    const days = Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return days <= 3 && days >= 0;
  });

  const vehicleAlerts = vehicles.filter((v) => {
    const needsService = v.nextService && new Date(v.nextService) <= new Date();
    const insuranceExpiring = v.insuranceExpiry && Math.ceil((new Date(v.insuranceExpiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) <= 30;
    return needsService || insuranceExpiring;
  });

  const expiringDocs = documents.filter((d) => {
    if (!d.expiryDate) return false;
    const days = Math.ceil((new Date(d.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return days <= 90 && days >= 0;
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0F2952', '#16476E']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Text style={styles.headerTitle}>Operations Center</Text>
        <Text style={styles.headerSub}>Home, Vehicles, Documents & More</Text>

        {/* Alert summary */}
        <View style={styles.alertsRow}>
          {[
            { label: 'Low Stock', count: lowStockItems.length, icon: 'warning-outline', color: colors.warning },
            { label: 'Expiring', count: expiringItems.length, icon: 'time-outline', color: colors.danger },
            { label: 'Vehicle Alerts', count: vehicleAlerts.length, icon: 'car-outline', color: '#E74C3C' },
            { label: 'Doc Alerts', count: expiringDocs.length, icon: 'document-outline', color: '#2980B9' },
          ].map((a, i) => (
            <View key={i} style={[styles.alertCard, a.count > 0 && styles.alertCardActive]}>
              <Ionicons name={a.icon as any} size={18} color={a.count > 0 ? a.color : 'rgba(255,255,255,0.4)'} />
              <Text style={[styles.alertCount, { color: a.count > 0 ? a.color : 'rgba(255,255,255,0.4)' }]}>{a.count}</Text>
              <Text style={styles.alertLabel}>{a.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {/* Module grid */}
        <View style={styles.modulesGrid}>
          {OPS_MODULES.map((mod) => (
            <Pressable
              key={mod.key}
              onPress={() => navigation.navigate(mod.key)}
              style={[styles.moduleCard, shadows.card]}
            >
              <View style={[styles.moduleIcon, { backgroundColor: mod.bg }]}>
                <Ionicons name={mod.icon as any} size={28} color={mod.color} />
              </View>
              <Text style={styles.moduleLabel}>{mod.label}</Text>
              <Text style={styles.moduleDesc}>{mod.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* Quick alerts */}
        {lowStockItems.length > 0 && (
          <Card style={styles.alertsCard} onPress={() => navigation.navigate('Pantry')}>
            <View style={styles.alertsCardRow}>
              <Ionicons name="warning" size={22} color={colors.warning} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.alertsCardTitle}>Low Pantry Stock</Text>
                <Text style={styles.alertsCardDesc}>
                  {lowStockItems.map((i) => i.name).join(', ')} running low
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Card>
        )}

        {vehicleAlerts.length > 0 && (
          <Card style={styles.alertsCard} onPress={() => navigation.navigate('Vehicles')}>
            <View style={styles.alertsCardRow}>
              <Ionicons name="car" size={22} color={colors.danger} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.alertsCardTitle}>Vehicle Service Needed</Text>
                <Text style={styles.alertsCardDesc}>
                  {vehicleAlerts.map((v) => `${v.year} ${v.make} ${v.model}`).join(', ')} needs attention
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Card>
        )}

        {/* Quick stats */}
        <Text style={styles.sectionTitle}>Household at a Glance</Text>
        <View style={styles.statsGrid}>
          {[
            { icon: 'nutrition', label: 'Pantry Items', value: pantryItems.length, color: '#27AE60', bg: '#D5F5E3' },
            { icon: 'car', label: 'Vehicles', value: vehicles.length, color: '#E74C3C', bg: '#FDEDEC' },
            { icon: 'folder', label: 'Documents', value: documents.length, color: '#2980B9', bg: '#D6EAF8' },
            { icon: 'shield', label: 'Doc Expiring', value: expiringDocs.length, color: '#F5A623', bg: '#FEF3E2' },
          ].map((stat, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: stat.bg }, shadows.sm]}>
              <Ionicons name={stat.icon as any} size={22} color={stat.color} />
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 20 },
  alertsRow: { flexDirection: 'row', gap: 8 },
  alertCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10, alignItems: 'center', gap: 4 },
  alertCardActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  alertCount: { fontSize: 20, fontWeight: '800' },
  alertLabel: { fontSize: 9, color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontWeight: '600' },
  content: { padding: 16 },
  modulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  moduleCard: {
    width: (width - 44) / 3,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  moduleIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  moduleLabel: { fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 3 },
  moduleDesc: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  alertsCard: { marginBottom: 10, borderRadius: 14, borderLeftWidth: 4, borderLeftColor: colors.warning },
  alertsCardRow: { flexDirection: 'row', alignItems: 'center' },
  alertsCardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3 },
  alertsCardDesc: { fontSize: 12, color: colors.textSecondary },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: (width - 42) / 2, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
});
