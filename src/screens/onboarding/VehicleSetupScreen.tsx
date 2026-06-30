import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../theme/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useOperationsStore } from '../../store/useOperationsStore';
import type { Vehicle } from '../../types';

export function VehicleSetupScreen({ navigation }: any) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const addVehicle = useOperationsStore((s) => s.addVehicle);

  const addVehicleLocal = () => {
    if (!make.trim() || !model.trim() || !year.trim()) return;
    const v: Vehicle = {
      id: `vehicle-${Date.now()}`,
      familyId: 'family-1',
      make: make.trim(),
      model: model.trim(),
      year: parseInt(year, 10),
      licensePlate: licensePlate.trim() || undefined,
    };
    setVehicles([...vehicles, v]);
    setMake(''); setModel(''); setYear(''); setLicensePlate('');
  };

  const handleNext = () => {
    vehicles.forEach(addVehicle);
    navigation.navigate('FinancialSetup');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.stepBadge}><Text style={styles.stepText}>Step 4 of 7</Text></View>
        <Text style={styles.headerTitle}>Vehicles</Text>
        <Text style={styles.headerSub}>Track maintenance, insurance & more</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '57%' }]} />
        </View>

        {vehicles.map((v, i) => (
          <Card key={i} style={styles.vehicleCard} variant="elevated">
            <View style={styles.vehicleRow}>
              <View style={styles.vehicleIcon}>
                <Ionicons name="car" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.vehicleName}>{v.year} {v.make} {v.model}</Text>
                {v.licensePlate && <Text style={styles.vehicleDetail}>{v.licensePlate}</Text>}
              </View>
              <Pressable onPress={() => setVehicles(vehicles.filter((_, vi) => vi !== i))}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          </Card>
        ))}

        <Text style={styles.sectionLabel}>Add a Vehicle</Text>

        <View style={styles.makeModelRow}>
          <Input label="Make" placeholder="Toyota" value={make} onChangeText={setMake} containerStyle={{ flex: 1, marginRight: 8 }} />
          <Input label="Model" placeholder="Camry" value={model} onChangeText={setModel} containerStyle={{ flex: 1 }} />
        </View>
        <View style={styles.makeModelRow}>
          <Input label="Year" placeholder="2021" value={year} onChangeText={setYear} keyboardType="numeric" containerStyle={{ flex: 1, marginRight: 8 }} />
          <Input label="License Plate" placeholder="ABC 1234" value={licensePlate} onChangeText={setLicensePlate} containerStyle={{ flex: 1 }} autoCapitalize="characters" />
        </View>

        <Button
          title="Add Vehicle"
          onPress={addVehicleLocal}
          variant="secondary"
          fullWidth
          disabled={!make.trim() || !model.trim() || !year.trim()}
          leftIcon={<Ionicons name="add-circle-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />}
          style={{ marginBottom: 16 }}
        />
        <Button
          title="Next: Financial Setup"
          onPress={handleNext}
          fullWidth size="lg"
          rightIcon={<Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />}
        />
        <Pressable onPress={handleNext} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24 },
  back: { marginBottom: 16 },
  stepBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 12 },
  stepText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: 28 },
  progressFill: { height: 4, backgroundColor: colors.secondary, borderRadius: 2 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 },
  vehicleCard: { marginBottom: 12 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center' },
  vehicleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E8EEF9', alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontSize: 16, fontWeight: '600', color: colors.text },
  vehicleDetail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  makeModelRow: { flexDirection: 'row' },
  skipButton: { alignItems: 'center', paddingVertical: 16 },
  skipText: { color: colors.textMuted, fontSize: 14 },
});
