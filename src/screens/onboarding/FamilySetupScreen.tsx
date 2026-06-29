import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../theme/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { Family } from '../../types';

const timezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'Pacific/Honolulu'];
const currencies = [{ code: 'USD', label: '$ USD' }, { code: 'EUR', label: '€ EUR' }, { code: 'GBP', label: '£ GBP' }, { code: 'CAD', label: 'C$ CAD' }];

export function FamilySetupScreen({ navigation }: any) {
  const [familyName, setFamilyName] = useState('');
  const [motto, setMotto] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [militaryMode, setMilitaryMode] = useState(false);
  const setFamily = useFamilyStore((s) => s.setFamily);

  const handleNext = () => {
    if (!familyName.trim()) return;
    const family: Family = {
      id: `family-${Date.now()}`,
      name: familyName.trim(),
      motto: motto.trim() || undefined,
      homeAddress: address.trim() || undefined,
      timezone,
      currency,
      militaryMode,
      premiumTier: 'free',
      healthScore: 50,
      createdAt: new Date().toISOString(),
    };
    setFamily(family);
    navigation.navigate('MemberSetup');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.stepBadge}><Text style={styles.stepText}>Step 1 of 7</Text></View>
        <Text style={styles.headerTitle}>Your Family</Text>
        <Text style={styles.headerSub}>Tell us about your household</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '14%' }]} />
        </View>

        <Input
          label="Family Name *"
          placeholder='e.g., "The Johnson Family"'
          value={familyName}
          onChangeText={setFamilyName}
          leftIcon="home-outline"
          autoCapitalize="words"
        />

        <Input
          label="Family Motto (optional)"
          placeholder='e.g., "Stronger Together"'
          value={motto}
          onChangeText={setMotto}
          leftIcon="heart-outline"
        />

        <Input
          label="Home Address (optional)"
          placeholder="123 Main Street, City, State"
          value={address}
          onChangeText={setAddress}
          leftIcon="location-outline"
          multiline
        />

        <Text style={styles.sectionLabel}>Currency</Text>
        <View style={styles.chipRow}>
          {currencies.map((c) => (
            <Pressable
              key={c.code}
              onPress={() => setCurrency(c.code)}
              style={[styles.chip, currency === c.code && styles.chipActive]}
            >
              <Text style={[styles.chipText, currency === c.code && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.militaryToggle}>
          <View style={styles.militaryInfo}>
            <View style={[styles.militaryIcon, { backgroundColor: '#4A5E3A' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.militaryTitle}>Military Family Mode</Text>
              <Text style={styles.militaryDesc}>Special features for active duty & veteran families</Text>
            </View>
          </View>
          <Pressable
            onPress={() => setMilitaryMode(!militaryMode)}
            style={[styles.toggle, militaryMode && styles.toggleActive]}
          >
            <View style={[styles.toggleThumb, militaryMode && styles.toggleThumbActive]} />
          </Pressable>
        </View>

        <Button
          title="Next: Add Family Members"
          onPress={handleNext}
          fullWidth
          size="lg"
          disabled={!familyName.trim()}
          style={{ marginTop: 8 }}
          rightIcon={<Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24 },
  back: { marginBottom: 8 },
  stepBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 6 },
  stepText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: 28 },
  progressFill: { height: 4, backgroundColor: colors.secondary, borderRadius: 2 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 },
  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  chipActive: { borderColor: colors.primary, backgroundColor: '#E8EEF9' },
  chipText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
  militaryToggle: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  militaryInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  militaryIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  militaryTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  militaryDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: colors.border, padding: 2, justifyContent: 'center' },
  toggleActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleThumbActive: { marginLeft: 'auto' as any },
});
