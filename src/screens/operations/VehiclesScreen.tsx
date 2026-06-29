import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, differenceInDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useHomeMaintenanceStore } from '../../store/useHomeMaintenanceStore';
import type { Vehicle } from '../../types';

const FUEL_TYPES = ['Gasoline', 'Diesel', 'Hybrid', 'Electric', 'Plug-in Hybrid'];
const SERVICE_TYPES = ['Oil Change', 'Tire Rotation', 'Brake Service', 'Air Filter', 'Transmission', 'Inspection', 'Detailing', 'Other'];

const generateId = () => Math.random().toString(36).substring(2, 11);

// ─── types ────────────────────────────────────────────────────────────────────

interface ServiceLog {
  id: string;
  vehicleId: string;
  type: string;
  date: string;
  mileage?: number;
  cost?: number;
  notes?: string;
  shop?: string;
}

// Store service logs in component state (persisted via Zustand would be ideal,
// but we keep it simple here and extend the vehicle's notes field as JSON)
const parseServiceLogs = (vehicle: Vehicle): ServiceLog[] => {
  try {
    const parsed = JSON.parse((vehicle as any).serviceLogs ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function VehiclesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(colors);

  const { vehicles, addVehicle, updateVehicle, deleteVehicle, documents } = useOperationsStore();
  const members = useFamilyStore((s) => s.members);
  const family  = useFamilyStore((s) => s.family);
  const { addTask: addMaintenanceTask } = useHomeMaintenanceStore();

  // ── add vehicle modal ──────────────────────────────────────────────────────
  const [showAdd, setShowAdd]         = useState(false);
  const [newMake, setNewMake]         = useState('');
  const [newModel, setNewModel]       = useState('');
  const [newYear, setNewYear]         = useState(new Date().getFullYear().toString());
  const [newColor, setNewColor]       = useState('');
  const [newPlate, setNewPlate]       = useState('');
  const [newVin, setNewVin]           = useState('');
  const [newMileage, setNewMileage]   = useState('');
  const [newFuelType, setNewFuelType] = useState('Gasoline');
  const [newDriverId, setNewDriverId] = useState<string | null>(null);
  const [newInsuranceExp, setNewInsuranceExp] = useState('');
  const [newRegExp, setNewRegExp]     = useState('');

  // ── log service modal ──────────────────────────────────────────────────────
  const [serviceVehicle, setServiceVehicle] = useState<Vehicle | null>(null);
  const [svcType, setSvcType]     = useState('Oil Change');
  const [svcDate, setSvcDate]     = useState(format(new Date(), 'MM/dd/yyyy'));
  const [svcMiles, setSvcMiles]   = useState('');
  const [svcCost, setSvcCost]     = useState('');
  const [svcShop, setSvcShop]     = useState('');
  const [svcNotes, setSvcNotes]   = useState('');

  // ── service history modal ──────────────────────────────────────────────────
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null);

  // ── add vehicle ────────────────────────────────────────────────────────────

  const handleAdd = () => {
    if (!newMake.trim() || !newModel.trim()) {
      Alert.alert('Required', 'Please enter the vehicle make and model.');
      return;
    }
    const vehicle: Vehicle = {
      id: generateId(),
      familyId: family?.id ?? 'family',
      make: newMake.trim(),
      model: newModel.trim(),
      year: parseInt(newYear, 10) || new Date().getFullYear(),
      color: newColor.trim() || undefined,
      licensePlate: newPlate.trim() || undefined,
      vin: newVin.trim() || undefined,
      mileage: newMileage ? parseInt(newMileage, 10) : undefined,
      fuelType: newFuelType,
      primaryDriver: newDriverId || undefined,
      insuranceExpiry: newInsuranceExp.trim() || undefined,
      registrationExpiry: newRegExp.trim() || undefined,
    };
    addVehicle(vehicle);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetAddForm();
    setShowAdd(false);
  };

  const resetAddForm = () => {
    setNewMake(''); setNewModel(''); setNewYear(new Date().getFullYear().toString());
    setNewColor(''); setNewPlate(''); setNewVin(''); setNewMileage('');
    setNewFuelType('Gasoline'); setNewDriverId(null);
    setNewInsuranceExp(''); setNewRegExp('');
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Remove Vehicle', `Remove "${name}" from your garage?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { deleteVehicle(id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
    ]);
  };

  // ── log service ────────────────────────────────────────────────────────────

  const openLogService = (vehicle: Vehicle) => {
    setServiceVehicle(vehicle);
    setSvcType('Oil Change');
    setSvcDate(format(new Date(), 'MM/dd/yyyy'));
    setSvcMiles(vehicle.mileage?.toString() ?? '');
    setSvcCost(''); setSvcShop(''); setSvcNotes('');
  };

  const handleSaveService = () => {
    if (!serviceVehicle) return;
    const log: ServiceLog = {
      id: generateId(),
      vehicleId: serviceVehicle.id,
      type: svcType,
      date: svcDate,
      mileage: svcMiles ? parseInt(svcMiles, 10) : undefined,
      cost: svcCost ? parseFloat(svcCost) : undefined,
      shop: svcShop.trim() || undefined,
      notes: svcNotes.trim() || undefined,
    };

    // Persist logs as JSON in a custom field
    const existing = parseServiceLogs(serviceVehicle);
    const updated = [log, ...existing];

    const newMileage = log.mileage ?? serviceVehicle.mileage;
    const lastServiceMileage = serviceVehicle.lastServiceMileage ?? serviceVehicle.mileage ?? 0;

    updateVehicle(serviceVehicle.id, {
      lastService: svcDate,
      mileage: newMileage,
      lastServiceMileage: log.mileage ?? lastServiceMileage,
      ...(({ serviceLogs: JSON.stringify(updated) }) as any),
    });

    // Check if oil change is due
    if (
      log.mileage !== undefined &&
      serviceVehicle.mileage !== undefined &&
      log.mileage - lastServiceMileage >= 5000
    ) {
      Alert.alert(
        'Oil Change Due',
        `Mileage difference is ${(log.mileage - lastServiceMileage).toLocaleString()} miles. Add oil change to maintenance?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: () => {
              const vehicleName = `${serviceVehicle.year} ${serviceVehicle.make} ${serviceVehicle.model}`;
              addMaintenanceTask({
                familyId: family?.id ?? 'demo-family',
                title: `Oil Change — ${vehicleName}`,
                category: 'other',
                priority: 'high',
                status: 'pending',
                estimatedCost: 80,
                notes: `Mileage: ${log.mileage?.toLocaleString()} mi`,
                isRecurring: false,
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ],
      );
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setServiceVehicle(null);
  };

  // ── documents button ────────────────────────────────────────────────────────

  const openDocuments = (vehicle: Vehicle) => {
    const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    navigation.navigate('Documents', {
      vehicleId: vehicle.id,
      vehicleLabel: vehicleName,
    });
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient colors={['#E74C3C', '#C0392B']} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={s.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>Vehicles</Text>
          <Pressable onPress={() => setShowAdd(true)} style={s.headerBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>
        <Text style={s.headerSub}>{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} in your garage</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={[s.list, { paddingBottom: 100 }]}>
        {vehicles.map((vehicle) => {
          const driver = members.find((m) => m.id === vehicle.primaryDriver);
          const insuranceDays    = vehicle.insuranceExpiry ? differenceInDays(new Date(vehicle.insuranceExpiry), new Date()) : null;
          const registrationDays = vehicle.registrationExpiry ? differenceInDays(new Date(vehicle.registrationExpiry), new Date()) : null;
          const serviceNeeded    = vehicle.nextService && new Date(vehicle.nextService) <= new Date();
          const vehicleName      = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
          const serviceLogs      = parseServiceLogs(vehicle);

          return (
            <Card key={vehicle.id} style={s.vehicleCard} variant="elevated">
              {/* Header */}
              <View style={s.vehicleHeader}>
                <LinearGradient colors={['#FDECEA', '#FADBD8']} style={s.vehicleIconBg}>
                  <Ionicons name="car" size={30} color="#E74C3C" />
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={s.vehicleName}>{vehicleName}</Text>
                  {vehicle.color && <Text style={s.vehicleDetail}>{vehicle.color}</Text>}
                  {driver && (
                    <View style={s.driverRow}>
                      <Avatar name={driver.name} color={driver.avatarColor} imageUri={driver.avatar} size={18} />
                      <Text style={s.vehicleDriver}>{driver.name}</Text>
                    </View>
                  )}
                </View>
                <View style={s.headerRight}>
                  {serviceNeeded && (
                    <View style={s.alertDot}>
                      <Ionicons name="warning" size={13} color="#fff" />
                    </View>
                  )}
                  <Pressable onPress={() => handleDelete(vehicle.id, vehicleName)} style={s.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              </View>

              {/* Stats row */}
              <View style={s.statsRow}>
                {vehicle.mileage !== undefined && (
                  <View style={s.stat}>
                    <Ionicons name="speedometer-outline" size={15} color={colors.textSecondary} />
                    <Text style={s.statValue}>{vehicle.mileage.toLocaleString()}</Text>
                    <Text style={s.statLabel}>miles</Text>
                  </View>
                )}
                {vehicle.licensePlate && (
                  <View style={s.stat}>
                    <Ionicons name="card-outline" size={15} color={colors.textSecondary} />
                    <Text style={s.statValue}>{vehicle.licensePlate}</Text>
                    <Text style={s.statLabel}>plate</Text>
                  </View>
                )}
                {vehicle.fuelType && (
                  <View style={s.stat}>
                    <Ionicons name="flame-outline" size={15} color={colors.textSecondary} />
                    <Text style={s.statValue}>{vehicle.fuelType}</Text>
                    <Text style={s.statLabel}>fuel</Text>
                  </View>
                )}
                {serviceLogs.length > 0 && (
                  <View style={s.stat}>
                    <Ionicons name="construct-outline" size={15} color={colors.textSecondary} />
                    <Text style={s.statValue}>{serviceLogs.length}</Text>
                    <Text style={s.statLabel}>services</Text>
                  </View>
                )}
              </View>

              {/* Alerts */}
              {(insuranceDays !== null || vehicle.registrationExpiry || vehicle.nextService) && (
                <View style={s.alerts}>
                  {insuranceDays !== null && (
                    <View style={[s.alertItem, insuranceDays <= 30 && { backgroundColor: colors.warningLight }]}>
                      <Ionicons name="shield-checkmark-outline" size={15} color={insuranceDays <= 30 ? colors.warning : colors.success} />
                      <Text style={[s.alertText, { color: insuranceDays <= 30 ? colors.warning : colors.textSecondary }]}>
                        Insurance: {insuranceDays <= 0 ? 'EXPIRED' : `${insuranceDays}d left`}
                      </Text>
                    </View>
                  )}
                  {registrationDays !== null && (
                    <View style={[s.alertItem, registrationDays <= 60 && { backgroundColor: colors.warningLight }]}>
                      <Ionicons name="document-text-outline" size={15} color={registrationDays <= 60 ? colors.warning : colors.success} />
                      <Text style={[s.alertText, { color: registrationDays <= 60 ? colors.warning : colors.textSecondary }]}>
                        Registration: {registrationDays <= 0 ? 'EXPIRED' : `${registrationDays}d left`}
                      </Text>
                    </View>
                  )}
                  {vehicle.nextService && (
                    <View style={[s.alertItem, serviceNeeded ? { backgroundColor: colors.dangerLight } : {}]}>
                      <Ionicons name="construct-outline" size={15} color={serviceNeeded ? colors.danger : colors.success} />
                      <Text style={[s.alertText, { color: serviceNeeded ? colors.danger : colors.textSecondary }]}>
                        {serviceNeeded ? 'SERVICE OVERDUE' : `Next service: ${format(new Date(vehicle.nextService), 'MMM d, yyyy')}`}
                      </Text>
                    </View>
                  )}
                  {vehicle.lastService && (
                    <View style={s.alertItem}>
                      <Ionicons name="checkmark-circle-outline" size={15} color={colors.success} />
                      <Text style={[s.alertText, { color: colors.textSecondary }]}>
                        Last service: {vehicle.lastService}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Linked Documents */}
              {(() => {
                const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`.toLowerCase();
                const linkedDocs = documents.filter((d) =>
                  (d.title ?? '').toLowerCase().includes(vehicle.make.toLowerCase()) ||
                  (d.title ?? '').toLowerCase().includes(vehicle.model.toLowerCase()) ||
                  d.category === 'insurance' || d.category === 'vehicle'
                );
                if (linkedDocs.length === 0) return null;
                return (
                  <View style={s.linkedDocsSection}>
                    <Text style={s.linkedDocsTitle}>Linked Documents</Text>
                    {linkedDocs.map((doc) => {
                      const expiryDays = doc.expiryDate
                        ? differenceInDays(new Date(doc.expiryDate), new Date())
                        : null;
                      return (
                        <View key={doc.id} style={[s.linkedDocItem, expiryDays !== null && expiryDays <= 60 && { backgroundColor: colors.warningLight }]}>
                          <Ionicons name="document-text-outline" size={14} color={expiryDays !== null && expiryDays <= 60 ? colors.warning : colors.textSecondary} />
                          <Text style={s.linkedDocName} numberOfLines={1}>{doc.title}</Text>
                          {expiryDays !== null && (
                            <Text style={[s.linkedDocExpiry, { color: expiryDays <= 60 ? colors.warning : colors.textMuted }]}>
                              {expiryDays <= 0 ? 'Expired' : `${expiryDays}d`}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })()}

              {/* Action buttons */}
              <View style={s.actionRow}>
                <Pressable style={s.actionBtn} onPress={() => openLogService(vehicle)}>
                  <Ionicons name="construct-outline" size={16} color="#E74C3C" />
                  <Text style={[s.actionText, { color: '#E74C3C' }]}>Log Service</Text>
                </Pressable>
                <Pressable style={s.actionBtn} onPress={() => setHistoryVehicle(vehicle)}>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                  <Text style={[s.actionText, { color: colors.primary }]}>
                    History {serviceLogs.length > 0 ? `(${serviceLogs.length})` : ''}
                  </Text>
                </Pressable>
                <Pressable style={s.actionBtn} onPress={() => openDocuments(vehicle)}>
                  <Ionicons name="document-outline" size={16} color="#8E44AD" />
                  <Text style={[s.actionText, { color: '#8E44AD' }]}>Documents</Text>
                </Pressable>
              </View>
            </Card>
          );
        })}

        {vehicles.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="car-outline" size={64} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No vehicles added</Text>
            <Text style={s.emptyDesc}>Track maintenance, insurance, and registration for all your vehicles</Text>
            <Pressable style={s.emptyBtn} onPress={() => setShowAdd(true)}>
              <LinearGradient colors={['#E74C3C', '#C0392B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.emptyBtnGrad}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={s.emptyBtnText}>Add Vehicle</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* ── Add Vehicle Modal ──────────────────────────────────────────────── */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 48 }}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Add Vehicle</Text>

            <Text style={s.modalLabel}>Make *</Text>
            <TextInput style={s.modalInput} placeholder="e.g. Toyota" value={newMake} onChangeText={setNewMake} placeholderTextColor={colors.textMuted} autoFocus />

            <Text style={s.modalLabel}>Model *</Text>
            <TextInput style={s.modalInput} placeholder="e.g. Camry" value={newModel} onChangeText={setNewModel} placeholderTextColor={colors.textMuted} />

            <View style={s.halfRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalLabel}>Year</Text>
                <TextInput style={s.modalInput} placeholder="2024" value={newYear} onChangeText={setNewYear} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalLabel}>Color</Text>
                <TextInput style={s.modalInput} placeholder="Silver" value={newColor} onChangeText={setNewColor} placeholderTextColor={colors.textMuted} />
              </View>
            </View>

            <View style={s.halfRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalLabel}>License Plate</Text>
                <TextInput style={s.modalInput} placeholder="ABC-1234" value={newPlate} onChangeText={setNewPlate} autoCapitalize="characters" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalLabel}>Current Mileage</Text>
                <TextInput style={s.modalInput} placeholder="e.g. 45000" value={newMileage} onChangeText={setNewMileage} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
              </View>
            </View>

            <Text style={s.modalLabel}>VIN</Text>
            <TextInput style={s.modalInput} placeholder="Vehicle Identification Number" value={newVin} onChangeText={setNewVin} autoCapitalize="characters" placeholderTextColor={colors.textMuted} />

            <Text style={s.modalLabel}>Fuel Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {FUEL_TYPES.map((ft) => (
                <Pressable key={ft} onPress={() => setNewFuelType(ft)}
                  style={[s.fuelChip, newFuelType === ft && s.fuelChipOn]}>
                  <Text style={[s.fuelChipText, newFuelType === ft && s.fuelChipTextOn]}>{ft}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.modalLabel}>Insurance Expiry (MM/DD/YYYY)</Text>
            <TextInput style={s.modalInput} placeholder="Optional" value={newInsuranceExp} onChangeText={setNewInsuranceExp} keyboardType="numeric" placeholderTextColor={colors.textMuted} />

            <Text style={s.modalLabel}>Registration Expiry (MM/DD/YYYY)</Text>
            <TextInput style={s.modalInput} placeholder="Optional" value={newRegExp} onChangeText={setNewRegExp} keyboardType="numeric" placeholderTextColor={colors.textMuted} />

            <Text style={s.modalLabel}>Primary Driver</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
              <Pressable onPress={() => setNewDriverId(null)} style={[s.driverChip, !newDriverId && s.driverChipOn]}>
                <Text style={s.driverChipLabel}>None</Text>
              </Pressable>
              {members.map((m) => (
                <Pressable key={m.id} onPress={() => setNewDriverId(m.id)} style={[s.driverChip, newDriverId === m.id && s.driverChipOn]}>
                  <Avatar name={m.name} color={m.avatarColor} imageUri={m.avatar} size={30} />
                  <Text style={s.driverChipLabel}>{m.name.split(' ')[0]}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Button title="Add Vehicle" onPress={handleAdd} fullWidth size="lg" disabled={!newMake.trim() || !newModel.trim()} />
            <Button title="Cancel" onPress={() => { setShowAdd(false); resetAddForm(); }} variant="ghost" fullWidth style={{ marginTop: 8 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Log Service Modal ──────────────────────────────────────────────── */}
      <Modal visible={!!serviceVehicle} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setServiceVehicle(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 48 }}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Log Service</Text>
            {serviceVehicle && (
              <Text style={s.modalSubtitle}>{serviceVehicle.year} {serviceVehicle.make} {serviceVehicle.model}</Text>
            )}

            <Text style={s.modalLabel}>Service Type</Text>
            <View style={s.typeGrid}>
              {SERVICE_TYPES.map((t) => (
                <Pressable key={t} onPress={() => setSvcType(t)}
                  style={[s.typeChip, svcType === t && s.typeChipOn]}>
                  <Text style={[s.typeChipText, svcType === t && s.typeChipTextOn]}>{t}</Text>
                </Pressable>
              ))}
            </View>

            <View style={s.halfRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalLabel}>Date</Text>
                <TextInput style={s.modalInput} value={svcDate} onChangeText={setSvcDate} placeholder="MM/DD/YYYY" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalLabel}>Mileage</Text>
                <TextInput style={s.modalInput} value={svcMiles} onChangeText={setSvcMiles} placeholder="e.g. 50000" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
              </View>
            </View>

            <View style={s.halfRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalLabel}>Cost ($)</Text>
                <TextInput style={s.modalInput} value={svcCost} onChangeText={setSvcCost} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalLabel}>Shop / Mechanic</Text>
                <TextInput style={s.modalInput} value={svcShop} onChangeText={setSvcShop} placeholder="Optional" placeholderTextColor={colors.textMuted} />
              </View>
            </View>

            <Text style={s.modalLabel}>Notes</Text>
            <TextInput style={[s.modalInput, { minHeight: 80, textAlignVertical: 'top' }]}
              value={svcNotes} onChangeText={setSvcNotes}
              placeholder="Any additional details…" multiline
              placeholderTextColor={colors.textMuted} />

            <Button title="Save Service Log" onPress={handleSaveService} fullWidth size="lg" />
            <Button title="Cancel" onPress={() => setServiceVehicle(null)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Service History Modal ──────────────────────────────────────────── */}
      <Modal visible={!!historyVehicle} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setHistoryVehicle(null)}>
        <View style={[s.modal, { flex: 1, paddingTop: insets.top + 8 }]}>
          <View style={s.modalHandle} />
          <View style={s.historyHeader}>
            <View>
              <Text style={s.modalTitle}>Service History</Text>
              {historyVehicle && (
                <Text style={s.modalSubtitle}>{historyVehicle.year} {historyVehicle.make} {historyVehicle.model}</Text>
              )}
            </View>
            <Pressable onPress={() => setHistoryVehicle(null)} style={s.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          {historyVehicle && (() => {
            const logs = parseServiceLogs(historyVehicle);
            if (logs.length === 0) {
              return (
                <View style={s.empty}>
                  <Ionicons name="construct-outline" size={48} color={colors.textMuted} />
                  <Text style={s.emptyTitle}>No service logs yet</Text>
                  <Text style={s.emptyDesc}>Tap "Log Service" on this vehicle to record maintenance</Text>
                </View>
              );
            }
            return (
              <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
                {logs.map((log) => (
                  <View key={log.id} style={s.logCard}>
                    <View style={s.logHeader}>
                      <View style={s.logIconWrap}>
                        <Ionicons name="construct" size={18} color="#E74C3C" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={s.logType}>{log.type}</Text>
                        <Text style={s.logDate}>{log.date}</Text>
                      </View>
                      {log.cost !== undefined && (
                        <Text style={s.logCost}>${log.cost.toFixed(2)}</Text>
                      )}
                    </View>
                    <View style={s.logMeta}>
                      {log.mileage !== undefined && (
                        <View style={s.logMetaItem}>
                          <Ionicons name="speedometer-outline" size={13} color={colors.textMuted} />
                          <Text style={s.logMetaText}>{log.mileage.toLocaleString()} mi</Text>
                        </View>
                      )}
                      {log.shop && (
                        <View style={s.logMetaItem}>
                          <Ionicons name="business-outline" size={13} color={colors.textMuted} />
                          <Text style={s.logMetaText}>{log.shop}</Text>
                        </View>
                      )}
                    </View>
                    {log.notes && <Text style={s.logNotes}>{log.notes}</Text>}
                  </View>
                ))}
              </ScrollView>
            );
          })()}
        </View>
      </Modal>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingBottom: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    back: { marginRight: 12 },
    headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
    headerBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
    list: { padding: 16 },
    // vehicle card
    vehicleCard: { marginBottom: 16, borderRadius: 20 },
    vehicleHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    vehicleIconBg: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    vehicleName: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 2 },
    vehicleDetail: { fontSize: 13, color: colors.textSecondary },
    driverRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    vehicleDriver: { fontSize: 13, color: colors.primary, fontWeight: '600' },
    headerRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
    alertDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { padding: 4 },
    // stats
    statsRow: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 12, padding: 12, marginBottom: 12, gap: 12, flexWrap: 'wrap' },
    stat: { alignItems: 'center', gap: 2, minWidth: 60 },
    statValue: { fontSize: 13, fontWeight: '700', color: colors.text },
    statLabel: { fontSize: 10, color: colors.textSecondary },
    // alerts
    alerts: { gap: 6, marginBottom: 12 },
    alertItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 9, borderRadius: 10, backgroundColor: colors.background },
    alertText: { fontSize: 13, fontWeight: '600' },
    // linked docs
    linkedDocsSection: { marginBottom: 12, gap: 6 },
    linkedDocsTitle: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    linkedDocItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, backgroundColor: colors.background },
    linkedDocName: { flex: 1, fontSize: 12, color: colors.text, fontWeight: '600' },
    linkedDocExpiry: { fontSize: 11, fontWeight: '700' },
    // actions
    actionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
    actionText: { fontSize: 12, fontWeight: '700' },
    // empty
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 },
    emptyDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32, marginBottom: 24 },
    emptyBtn: { borderRadius: 14, overflow: 'hidden' },
    emptyBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24 },
    emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    // modal
    modal: { flex: 1, backgroundColor: colors.background, padding: 24 },
    modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 4 },
    modalSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
    modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 },
    modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
    halfRow: { flexDirection: 'row', gap: 12 },
    // fuel chips
    fuelChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
    fuelChipOn: { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
    fuelChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    fuelChipTextOn: { color: '#fff' },
    // driver chips
    driverChip: { alignItems: 'center', marginRight: 12, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', gap: 4 },
    driverChipOn: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
    driverChipLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
    // service type chips
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    typeChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
    typeChipOn: { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
    typeChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    typeChipTextOn: { color: '#fff' },
    // service history
    historyHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 0 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    logCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    logHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    logIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FDECEA', alignItems: 'center', justifyContent: 'center' },
    logType: { fontSize: 15, fontWeight: '700', color: colors.text },
    logDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    logCost: { fontSize: 16, fontWeight: '800', color: '#27AE60' },
    logMeta: { flexDirection: 'row', gap: 12, marginBottom: 4 },
    logMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    logMetaText: { fontSize: 12, color: colors.textMuted },
    logNotes: { fontSize: 13, color: colors.textSecondary, marginTop: 6, fontStyle: 'italic' },
  });
}
