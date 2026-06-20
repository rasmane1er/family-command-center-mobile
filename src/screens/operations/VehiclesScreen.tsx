import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, differenceInDays } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useFamilyStore } from '../../store/useFamilyStore';

export function VehiclesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { vehicles } = useOperationsStore();
  const members = useFamilyStore((s) => s.members);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#E74C3C', '#C0392B']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Vehicles</Text>
          <Pressable style={styles.addBtn}><Ionicons name="add" size={26} color="#fff" /></Pressable>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {vehicles.map((vehicle) => {
          const driver = members.find((m) => m.id === vehicle.primaryDriver);
          const insuranceDays = vehicle.insuranceExpiry ? differenceInDays(new Date(vehicle.insuranceExpiry), new Date()) : null;
          const registrationDays = vehicle.registrationExpiry ? differenceInDays(new Date(vehicle.registrationExpiry), new Date()) : null;
          const serviceNeeded = vehicle.nextService && new Date(vehicle.nextService) <= new Date();

          return (
            <Card key={vehicle.id} style={styles.vehicleCard} variant="elevated">
              <View style={styles.vehicleHeader}>
                <View style={styles.vehicleIconBg}>
                  <Ionicons name="car" size={32} color={colors.danger} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.vehicleName}>{vehicle.year} {vehicle.make} {vehicle.model}</Text>
                  {vehicle.color && <Text style={styles.vehicleDetail}>{vehicle.color}</Text>}
                  {driver && <Text style={styles.vehicleDriver}>Primary: {driver.name}</Text>}
                </View>
                {serviceNeeded && (
                  <View style={styles.alertBadge}>
                    <Ionicons name="warning" size={14} color="#fff" />
                  </View>
                )}
              </View>

              <View style={styles.vehicleStats}>
                {vehicle.mileage && (
                  <View style={styles.vehicleStat}>
                    <Ionicons name="speedometer-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.vehicleStatValue}>{vehicle.mileage.toLocaleString()}</Text>
                    <Text style={styles.vehicleStatLabel}>miles</Text>
                  </View>
                )}
                {vehicle.licensePlate && (
                  <View style={styles.vehicleStat}>
                    <Ionicons name="card-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.vehicleStatValue}>{vehicle.licensePlate}</Text>
                    <Text style={styles.vehicleStatLabel}>plate</Text>
                  </View>
                )}
                {vehicle.fuelType && (
                  <View style={styles.vehicleStat}>
                    <Ionicons name="flame-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.vehicleStatValue}>{vehicle.fuelType}</Text>
                    <Text style={styles.vehicleStatLabel}>fuel</Text>
                  </View>
                )}
              </View>

              <View style={styles.vehicleAlerts}>
                {insuranceDays !== null && (
                  <View style={[styles.alertItem, insuranceDays <= 30 && styles.alertItemWarning]}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={insuranceDays <= 30 ? colors.warning : colors.success} />
                    <Text style={[styles.alertItemText, { color: insuranceDays <= 30 ? colors.warning : colors.textSecondary }]}>
                      Insurance: {insuranceDays <= 0 ? 'EXPIRED' : `${insuranceDays} days left`}
                    </Text>
                  </View>
                )}
                {vehicle.registrationExpiry && registrationDays !== null && (
                  <View style={[styles.alertItem, registrationDays <= 60 && styles.alertItemWarning]}>
                    <Ionicons name="document-text-outline" size={16} color={registrationDays <= 60 ? colors.warning : colors.success} />
                    <Text style={[styles.alertItemText, { color: registrationDays <= 60 ? colors.warning : colors.textSecondary }]}>
                      Registration: {registrationDays <= 0 ? 'EXPIRED' : `${registrationDays} days left`}
                    </Text>
                  </View>
                )}
                {vehicle.nextService && (
                  <View style={[styles.alertItem, serviceNeeded && styles.alertItemDanger]}>
                    <Ionicons name="construct-outline" size={16} color={serviceNeeded ? colors.danger : colors.success} />
                    <Text style={[styles.alertItemText, { color: serviceNeeded ? colors.danger : colors.textSecondary }]}>
                      {serviceNeeded ? 'SERVICE OVERDUE!' : `Next service: ${format(new Date(vehicle.nextService), 'MMM d, yyyy')}`}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.vehicleActions}>
                <Pressable style={styles.actionBtn}>
                  <Ionicons name="construct-outline" size={16} color={colors.primary} />
                  <Text style={styles.actionText}>Log Service</Text>
                </Pressable>
                <Pressable style={styles.actionBtn}>
                  <Ionicons name="document-outline" size={16} color={colors.primary} />
                  <Text style={styles.actionText}>Documents</Text>
                </Pressable>
                <Pressable style={styles.actionBtn}>
                  <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                  <Text style={styles.actionText}>Edit</Text>
                </Pressable>
              </View>
            </Card>
          );
        })}

        {vehicles.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No vehicles added</Text>
            <Text style={styles.emptyDesc}>Track maintenance, insurance, and registration</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  vehicleCard: { marginBottom: 16, borderRadius: 20 },
  vehicleHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  vehicleIconBg: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 3 },
  vehicleDetail: { fontSize: 13, color: colors.textSecondary, marginBottom: 3 },
  vehicleDriver: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  alertBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  vehicleStats: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 12, padding: 12, marginBottom: 14, gap: 16 },
  vehicleStat: { alignItems: 'center', gap: 3 },
  vehicleStatValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  vehicleStatLabel: { fontSize: 10, color: colors.textSecondary },
  vehicleAlerts: { gap: 8, marginBottom: 14 },
  alertItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: colors.background },
  alertItemWarning: { backgroundColor: colors.warningLight },
  alertItemDanger: { backgroundColor: colors.dangerLight },
  alertItemText: { fontSize: 13, fontWeight: '600' },
  vehicleActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, backgroundColor: '#E8EEF9', borderRadius: 10 },
  actionText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
});
