import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useMedicationStore } from '../../store/useMedicationStore';
import { useHealthStore } from '../../store/useHealthStore';
import { useMedicalRecordsStore } from '../../store/useMedicalRecordsStore';
import { useJournalStore } from '../../store/useJournalStore';
import { colors } from '../../theme/colors';
import { Analytics } from '../../services/AnalyticsService';

interface ExportSection {
  key: string;
  label: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  description: string;
}

const SECTIONS: ExportSection[] = [
  { key: 'family', label: 'Family Profiles', icon: 'people', iconBg: '#F3E5F5', iconColor: '#8E44AD', description: 'Members, tasks, events, goals' },
  { key: 'finance', label: 'Finance', icon: 'wallet', iconBg: '#E8F5E9', iconColor: '#27AE60', description: 'Bills, transactions, budgets' },
  { key: 'operations', label: 'Operations', icon: 'home', iconBg: '#E3F2FD', iconColor: '#1565C0', description: 'Pantry, vehicles, documents' },
  { key: 'health', label: 'Health & Medications', icon: 'medical', iconBg: '#FCE4EC', iconColor: '#E91E63', description: 'Medications, health records' },
  { key: 'journal', label: 'Family Journal', icon: 'book', iconBg: '#FFF8E1', iconColor: '#F5A623', description: 'Journal entries' },
];

export function DataExportScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Set<string>>(new Set(SECTIONS.map((s) => s.key)));
  const [exporting, setExporting] = useState(false);

  const family = useFamilyStore((s) => s.family);
  const members = useFamilyStore((s) => s.members);
  const tasks = useFamilyStore((s) => s.tasks);
  const events = useFamilyStore((s) => s.events);
  const goals = useFamilyStore((s) => s.goals);
  const { bills, transactions, budgets } = useFinanceStore();
  const { pantryItems, vehicles, documents } = useOperationsStore();
  const medications = useMedicationStore((s) => s.medications);
  const healthRecords = useHealthStore((s) => s.records);
  const medicalRecords = useMedicalRecordsStore((s) => s.records);
  const entries = useJournalStore((s) => s.entries);

  const toggleSection = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleExport = async () => {
    if (selected.size === 0) {
      Alert.alert('Select Data', 'Please select at least one section to export.');
      return;
    }
    setExporting(true);
    try {
      const exportData: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        familyName: family?.name ?? 'My Family',
      };

      if (selected.has('family')) exportData.family = { family, members, tasks, events, goals };
      if (selected.has('finance')) exportData.finance = { bills, transactions, budgets };
      if (selected.has('operations')) exportData.operations = { pantryItems, vehicles, documents };
      if (selected.has('health')) exportData.health = { medications, healthRecords, medicalRecords };
      if (selected.has('journal')) exportData.journal = { entries };

      const json = JSON.stringify(exportData, null, 2);
      await Share.share({
        message: json,
        title: `${family?.name ?? 'Family'} Command Center Export`,
      });
      Analytics.track('data_exported', { sections: [...selected] });
    } catch (e: any) {
      if (e.message !== 'User did not share') {
        Alert.alert('Export Failed', e.message ?? 'Could not export data.');
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#004D40', '#00695C']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Export Data</Text>
        <Text style={styles.headerSub}>Save or share your family data as JSON</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>SELECT DATA TO EXPORT</Text>

        <View style={styles.sectionList}>
          {SECTIONS.map((s, i) => (
            <Pressable
              key={s.key}
              onPress={() => toggleSection(s.key)}
              style={[styles.row, i < SECTIONS.length - 1 && styles.rowBorder]}
            >
              <View style={[styles.iconBg, { backgroundColor: s.iconBg }]}>
                <Ionicons name={s.icon as any} size={22} color={s.iconColor} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{s.label}</Text>
                <Text style={styles.rowSub}>{s.description}</Text>
              </View>
              <View style={[styles.checkbox, selected.has(s.key) && styles.checkboxChecked]}>
                {selected.has(s.key) && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color="#1565C0" />
          <Text style={styles.infoText}>
            Data is exported as a JSON file. No data is sent to external servers — everything stays on your device.
          </Text>
        </View>

        <Pressable
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={exporting}
        >
          <Ionicons name="share-outline" size={20} color="#fff" />
          <Text style={styles.exportBtnText}>{exporting ? 'Preparing...' : 'Export & Share'}</Text>
        </Pressable>

        <Text style={styles.hint}>
          Selected {selected.size} of {SECTIONS.length} sections
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingBottom: 24, paddingHorizontal: 20 },
  back: { marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.65)' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 8, marginTop: 8 },
  sectionList: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBg: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#004D40', borderColor: '#004D40' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#E3F2FD', borderRadius: 12, padding: 14, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 13, color: '#1565C0', lineHeight: 19 },
  exportBtn: { backgroundColor: '#004D40', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  hint: { textAlign: 'center', fontSize: 13, color: colors.textMuted, marginTop: 12 },
});
