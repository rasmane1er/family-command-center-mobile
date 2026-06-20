import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, differenceInDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { Vehicle } from '../../types';

const FUEL_TYPES = ['Gasoline', 'Diesel', 'Hybrid', 'Electric', 'Plug-in Hybrid'];
const generateId = () => Math.random().toString(36).substring(2, 11);

export function VehiclesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { vehicles, addVehicle, deleteVehicle } = useOperationsStore();
  const members = useFamilyStore((s) => s.members);

  const [showModal, setShowModal] = useState(false);
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newColor, setNewColor] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newFuelType, setNewFuelType] = useState('Gasoline');
  const [newDriverId, setNewDriverId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newMake.trim() || !newModel.trim()) return;
    const vehicle: Vehicle = {
      id: generateId(),
      familyId: 'demo-family',
      make: newMake.trim(),
      model: newModel.trim(),
      year: parseInt(newYear, 10) || new Date().getFullYear(),
      color: newColor.trim() || undefined,
      licensePlate: newPlate.trim() || undefined,
      fuelType: newFuelType,
      primaryDriver: newDriverId || undefined,
    };
    addVehicle(vehicle);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewMake(''); setNewModel(''); setNewYear(new Date().getFullYear().toString());
    setNewColor(''); setNewPlate(''); setNewFuelType('Gasoline'); setNewDriverId(null);
    setShowModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Remove Vehicle', `Remove "${name}" from your garage?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { deleteVehicle(id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#E74C3C', '#C0392B']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Vehicles</Text>
          <Pressable onPress={() => setShowModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {vehicles.map((vehicle) => {
          const driver = members.find((m) => m.id === vehicle.primaryDriver);
          const insuranceDays = vehicle.insuranceExpiry ? differenceInDays(new Date(vehicle.insuranceExpiry), new Date()) : null;
          const registrationDays = vehicle.registrationExpiry ? differenceInDays(new Date(vehicle.registrationExpiry), new Date()) : null;
          const serviceNeeded = vehicle.nextService && new Date(vehicle.nextService) <= new Date();
          const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

          return (
            <Card key={vehicle.id} style={styles.vehicleCard} variant="elevated">
              <View style={styles.vehicleHeader}>
                <View style={styles.vehicleIconBg}>
                  <Ionicons name="car" size={32} color={colors.danger} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.vehicleName}>{vehicleName}</Text>
                  {vehicle.color && <Text style={styles.vehicleDetail}>{vehicle.color}</Text>}
                  {driver && <Text style={styles.vehicleDriver}>Primary: {driver.name}</Text>}
                </View>
                <View style={styles.headerRight}>
                  {serviceNeeded && (
                    <View style={styles.alertBadge}>
                      <Ionicons name="warning" size={14} color="#fff" />
                    </View>
                  )}
                  <Pressable onPress={() => handleDelete(vehicle.id, vehicleName)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Pressable>
                </View>
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

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Vehicle</Text>

          <Text style={styles.modalLabel}>Make *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Toyota" value={newMake} onChangeText={setNewMake} placeholderTextColor={colors.textMuted} autoFocus />

          <Text style={styles.modalLabel}>Model *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Camry" value={newModel} onChangeText={setNewModel} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Year</Text>
          <TextInput style={styles.modalInput} placeholder="2024" value={newYear} onChangeText={setNewYear} keyboardType="numeric" placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Color</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Silver" value={newColor} onChangeText={setNewColor} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>License Plate</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. ABC-1234" value={newPlate} onChangeText={setNewPlate} placeholderTextColor={colors.textMuted} autoCapitalize="characters" />

          <Text style={styles.modalLabel}>Fuel Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {FUEL_TYPES.map((ft) => (
              <Pressable key={ft} onPress={() => setNewFuelType(ft)} style={[styles.fuelChip, newFuelType === ft && styles.fuelChipActive]}>
                <Text style={[styles.fuelChipText, newFuelType === ft && styles.fuelChipTextActive]}>{ft}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Primary Driver</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            <Pressable onPress={() => setNewDriverId(null)} style={[styles.driverChip, !newDriverId && styles.driverChipActive]}>
              <Text style={styles.driverChipLabel}>None</Text>
            </Pressable>
            {members.map((m) => (
              <Pressable key={m.id} onPress={() => setNewDriverId(m.id)} style={[styles.driverChip, newDriverId === m.id && styles.driverChipActive]}>
                <Avatar name={m.name} color={m.avatarColor} size={30} />
                <Text style={styles.driverChipLabel}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Button title="Add Vehicle" onPress={handleAdd} fullWidth size="lg" disabled={!newMake.trim() || !newModel.trim()} />
          <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
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
  headerRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  alertBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { padding: 4 },
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
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  fuelChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  fuelChipActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  fuelChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  fuelChipTextActive: { color: '#fff' },
  driverChip: { alignItems: 'center', marginRight: 12, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', gap: 4 },
  driverChipActive: { borderColor: colors.primary, backgroundColor: '#E8EEF9' },
  driverChipLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
});
