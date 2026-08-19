import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Linking,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { useMedicalRecordsStore, RecordType, MedicalRecord } from '../../store/useMedicalRecordsStore';
import { AIVoiceQuickFillButton } from '../../components/ai/AIVoiceQuickFillButton';
import type { QuickFillField, QuickFillResult } from '../../services/aiService';

const RECORD_CONFIG: Record<RecordType, { icon: string; color: string; label: string }> = {
  visit:        { icon: 'medical',             color: '#2980B9', label: 'Visit' },
  lab:          { icon: 'flask',               color: '#8E44AD', label: 'Lab' },
  imaging:      { icon: 'scan',                color: '#16A085', label: 'Imaging' },
  prescription: { icon: 'clipboard',           color: '#F5A623', label: 'Prescription' },
  vaccination:  { icon: 'shield-checkmark',    color: '#27AE60', label: 'Vaccination' },
  allergy:      { icon: 'alert-circle',        color: '#E74C3C', label: 'Allergy' },
  surgery:      { icon: 'cut',                 color: '#C0392B', label: 'Surgery' },
  dental:       { icon: 'happy',               color: '#3498DB', label: 'Dental' },
  vision:       { icon: 'eye',                 color: '#1ABC9C', label: 'Vision' },
};
const RECORD_TYPES = Object.keys(RECORD_CONFIG) as RecordType[];

const ADD_RECORD_QUICKFILL_FIELDS: QuickFillField[] = [
  { name: 'title', type: 'string', description: 'Short title for the visit/record, e.g. "Annual checkup"' },
  { name: 'type', type: 'string', description: `Record type, one of exactly: ${RECORD_TYPES.join(', ')}` },
  { name: 'provider', type: 'string', description: 'Doctor or clinic name' },
  { name: 'date', type: 'date', description: 'Visit/record date, formatted YYYY-MM-DD' },
  { name: 'results', type: 'string', description: 'Findings, diagnosis, or lab results mentioned' },
  { name: 'followUpDate', type: 'date', description: 'Follow-up appointment date if mentioned, formatted YYYY-MM-DD' },
];

const MEMBERS = [
  { id: 'member-1', name: 'Dad',  color: '#2980B9' },
  { id: 'member-2', name: 'Mom',  color: '#8E44AD' },
  { id: 'member-3', name: 'Emma', color: '#27AE60' },
  { id: 'member-4', name: 'Liam', color: '#F5A623' },
];

function RecordCard({ record, onDelete }: { record: MedicalRecord; onDelete: () => void }) {
  const cfg = RECORD_CONFIG[record.type];
  const mem = MEMBERS.find((m) => m.id === record.memberId);
  return (
    <View style={[styles.recordCard, shadows.sm, record.isCritical && styles.criticalCard]}>
      <View style={styles.recordRow}>
        <View style={[styles.recordIconWrap, { backgroundColor: cfg.color + '20' }]}>
          <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
        </View>
        <View style={styles.recordInfo}>
          <View style={styles.recordTitleRow}>
            <Text style={styles.recordTitle}>{record.title}</Text>
            {record.isCritical && (
              <View style={styles.criticalBadge}>
                <Text style={styles.criticalBadgeText}>CRITICAL</Text>
              </View>
            )}
          </View>
          <Text style={styles.recordProvider}>{record.provider}</Text>
          <View style={styles.recordMeta}>
            <View style={[styles.typePill, { backgroundColor: cfg.color + '15' }]}>
              <Text style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            {mem && (
              <View style={[styles.typePill, { backgroundColor: (mem.color) + '15' }]}>
                <Text style={[styles.typePillText, { color: mem.color }]}>{mem.name}</Text>
              </View>
            )}
            <Text style={styles.recordDate}>{record.date}</Text>
          </View>
          {record.results ? <Text style={styles.recordResults} numberOfLines={2}>{record.results}</Text> : null}
          {record.followUpDate ? (
            <Text style={styles.followUpText}>Follow-up: {record.followUpDate}</Text>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name={'trash-outline' as any} size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

export function MedicalRecordsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { records, doctors, addRecord, removeRecord, addDoctor, removeDoctor, getRecordsForMember, getCriticalRecords } = useMedicalRecordsStore();

  const [activeTab, setActiveTab] = useState<'records' | 'doctors' | 'critical'>('records');
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<RecordType | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);

  // Record modal state
  const [rType, setRType] = useState<RecordType>('visit');
  const [rTitle, setRTitle] = useState('');
  const [rMemberId, setRMemberId] = useState('member-1');
  const [rProvider, setRProvider] = useState('');
  const [rDate, setRDate] = useState(new Date().toISOString().split('T')[0]);
  const [rNotes, setRNotes] = useState('');
  const [rResults, setRResults] = useState('');
  const [rFollowUp, setRFollowUp] = useState('');
  const [rCritical, setRCritical] = useState(false);

  // Doctor modal state
  const [dName, setDName] = useState('');
  const [dSpecialty, setDSpecialty] = useState('');
  const [dPhone, setDPhone] = useState('');
  const [dAddress, setDAddress] = useState('');
  const [dMemberId, setDMemberId] = useState('member-1');

  const openRecordModal = () => {
    setRType('visit'); setRTitle(''); setRMemberId('member-1'); setRProvider('');
    setRDate(new Date().toISOString().split('T')[0]); setRNotes(''); setRResults('');
    setRFollowUp(''); setRCritical(false);
    setShowRecordModal(true);
  };

  const handleAddRecord = () => {
    if (!rTitle.trim()) { Alert.alert('Missing Info', 'Please enter a title.'); return; }
    const mem = MEMBERS.find((m) => m.id === rMemberId)!;
    addRecord({
      memberId: rMemberId,
      memberName: mem.name,
      type: rType,
      title: rTitle.trim(),
      date: rDate,
      provider: rProvider.trim(),
      notes: rNotes.trim(),
      results: rResults.trim(),
      followUpDate: rFollowUp.trim() || undefined,
      attachmentCount: 0,
      isCritical: rCritical,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowRecordModal(false);
  };

  const handleRecordQuickFill = (result: QuickFillResult) => {
    if (typeof result.title === 'string') setRTitle(result.title);
    if (typeof result.type === 'string' && RECORD_TYPES.includes(result.type as RecordType)) {
      setRType(result.type as RecordType);
    }
    if (typeof result.provider === 'string') setRProvider(result.provider);
    if (typeof result.date === 'string') setRDate(result.date);
    if (typeof result.results === 'string') setRResults(result.results);
    if (typeof result.followUpDate === 'string') setRFollowUp(result.followUpDate);
  };

  const openDoctorModal = () => {
    setDName(''); setDSpecialty(''); setDPhone(''); setDAddress(''); setDMemberId('member-1');
    setShowDoctorModal(true);
  };

  const handleAddDoctor = () => {
    if (!dName.trim()) { Alert.alert('Missing Info', 'Please enter a doctor name.'); return; }
    addDoctor({ name: dName.trim(), specialty: dSpecialty.trim(), phone: dPhone.trim(), address: dAddress.trim(), memberId: dMemberId });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDoctorModal(false);
  };

  const filteredRecords = records.filter((r) => {
    if (memberFilter && r.memberId !== memberFilter) return false;
    if (typeFilter && r.type !== typeFilter) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const criticalRecords = getCriticalRecords().sort((a, b) => b.date.localeCompare(a.date));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={['#1A237E', '#283593']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name={'arrow-back' as any} size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Medical Records</Text>
          <Text style={styles.headerSubtitle}>Health history & providers</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['records', 'doctors', 'critical'] as const).map((tab) => (
          <Pressable accessibilityRole="button"
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* RECORDS TAB */}
        {activeTab === 'records' && (
          <>
            {/* Member filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
              <Pressable accessibilityRole="button"
                style={[styles.filterChip, memberFilter === null && styles.filterChipActive]}
                onPress={() => setMemberFilter(null)}
              >
                <Text style={[styles.filterChipText, memberFilter === null && styles.filterChipTextActive]}>All</Text>
              </Pressable>
              {MEMBERS.map((m) => (
                <Pressable accessibilityRole="button"
                  key={m.id}
                  style={[styles.filterChip, memberFilter === m.id && { backgroundColor: m.color, borderColor: m.color }]}
                  onPress={() => setMemberFilter(memberFilter === m.id ? null : m.id)}
                >
                  <Text style={[styles.filterChipText, memberFilter === m.id && { color: '#fff' }]}>{m.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Type filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
              <Pressable accessibilityRole="button"
                style={[styles.filterChip, typeFilter === null && styles.filterChipActive]}
                onPress={() => setTypeFilter(null)}
              >
                <Text style={[styles.filterChipText, typeFilter === null && styles.filterChipTextActive]}>All Types</Text>
              </Pressable>
              {RECORD_TYPES.map((t) => {
                const cfg = RECORD_CONFIG[t];
                return (
                  <Pressable accessibilityRole="button"
                    key={t}
                    style={[styles.filterChip, typeFilter === t && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                    onPress={() => setTypeFilter(typeFilter === t ? null : t)}
                  >
                    <Ionicons name={cfg.icon as any} size={12} color={typeFilter === t ? '#fff' : cfg.color} />
                    <Text style={[styles.filterChipText, typeFilter === t && { color: '#fff' }]}>{cfg.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {filteredRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name={'medical' as any} size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Records Yet</Text>
                <Text style={styles.emptySubtitle}>Tap + to add your first medical record</Text>
              </View>
            ) : (
              filteredRecords.map((r) => (
                <RecordCard key={r.id} record={r} onDelete={() => removeRecord(r.id)} />
              ))
            )}
            <View style={{ height: 120 }} />
          </>
        )}

        {/* DOCTORS TAB */}
        {activeTab === 'doctors' && (
          <>
            <Text style={styles.sectionHeader}>Healthcare Providers</Text>
            {doctors.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name={'person-circle' as any} size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Doctors Yet</Text>
                <Text style={styles.emptySubtitle}>Tap + to add a healthcare provider</Text>
              </View>
            ) : (
              doctors.map((doc) => {
                const mem = MEMBERS.find((m) => m.id === doc.memberId);
                return (
                  <View key={doc.id} style={[styles.doctorCard, shadows.sm]}>
                    <View style={styles.doctorHeader}>
                      <View style={[styles.doctorAvatar, { backgroundColor: '#1A237E20' }]}>
                        <Ionicons name={'person' as any} size={24} color="#283593" />
                      </View>
                      <View style={styles.doctorInfo}>
                        <Text style={styles.doctorName}>{doc.name}</Text>
                        <Text style={styles.doctorSpecialty}>{doc.specialty}</Text>
                        {mem && (
                          <View style={[styles.typePill, { backgroundColor: (mem.color) + '20', alignSelf: 'flex-start', marginTop: 4 }]}>
                            <Text style={[styles.typePillText, { color: mem.color }]}>{mem.name}'s Doctor</Text>
                          </View>
                        )}
                      </View>
                      <Pressable accessibilityRole="button" onPress={() => removeDoctor(doc.id)} style={styles.deleteBtn}>
                        <Ionicons name={'trash-outline' as any} size={18} color={colors.textMuted} />
                      </Pressable>
                    </View>
                    {doc.phone ? (
                      <Pressable accessibilityRole="button"
                        style={styles.doctorContact}
                        onPress={() => Linking.openURL(`tel:${doc.phone}`)}
                      >
                        <Ionicons name={'call' as any} size={16} color="#27AE60" />
                        <Text style={styles.doctorPhone}>{doc.phone}</Text>
                      </Pressable>
                    ) : null}
                    {doc.address ? (
                      <View style={styles.doctorContact}>
                        <Ionicons name={'location' as any} size={16} color={colors.textSecondary} />
                        <Text style={styles.doctorAddress}>{doc.address}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
            <View style={{ height: 120 }} />
          </>
        )}

        {/* CRITICAL TAB */}
        {activeTab === 'critical' && (
          <>
            <View style={styles.criticalBanner}>
              <Ionicons name={'alert-circle' as any} size={20} color="#E74C3C" />
              <Text style={styles.criticalBannerText}>
                Critical records — allergies and major diagnoses across all family members
              </Text>
            </View>
            {criticalRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name={'shield-checkmark' as any} size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Critical Records</Text>
                <Text style={styles.emptySubtitle}>Mark records as critical to show them here</Text>
              </View>
            ) : (
              criticalRecords.map((r) => (
                <RecordCard key={r.id} record={r} onDelete={() => removeRecord(r.id)} />
              ))
            )}
            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable accessibilityRole="button"
        style={styles.fab}
        onPress={activeTab === 'doctors' ? openDoctorModal : openRecordModal}
      >
        <LinearGradient colors={['#283593', '#1A237E']} style={styles.fabGradient}>
          <Ionicons name={'add' as any} size={32} color="#fff" />
        </LinearGradient>
      </Pressable>

      {/* Add Record Modal */}
      <Modal visible={showRecordModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRecordModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Medical Record</Text>
              <Pressable accessibilityRole="button" onPress={() => setShowRecordModal(false)}>
                <Ionicons name={'close' as any} size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

              <AIVoiceQuickFillButton
                fields={ADD_RECORD_QUICKFILL_FIELDS}
                context="This is a family member's medical visit being logged in a household medical records tracker."
                onExtracted={handleRecordQuickFill}
                prompt="Hold to dictate visit summary"
              />

              <Text style={styles.fieldLabel}>Member</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {MEMBERS.map((m) => (
                  <Pressable accessibilityRole="button"
                    key={m.id}
                    style={[styles.chipBtn, rMemberId === m.id && { backgroundColor: m.color, borderColor: m.color }]}
                    onPress={() => setRMemberId(m.id)}
                  >
                    <Text style={[styles.chipBtnText, rMemberId === m.id && { color: '#fff' }]}>{m.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Record Type</Text>
              <View style={styles.chipRow}>
                {RECORD_TYPES.map((t) => {
                  const cfg = RECORD_CONFIG[t];
                  return (
                    <Pressable accessibilityRole="button"
                      key={t}
                      style={[styles.chipBtn, rType === t && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                      onPress={() => setRType(t)}
                    >
                      <Ionicons name={cfg.icon as any} size={14} color={rType === t ? '#fff' : cfg.color} />
                      <Text style={[styles.chipBtnText, rType === t && { color: '#fff' }]}>{cfg.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput accessibilityLabel="e.g. Annual checkup" style={styles.textInput} value={rTitle} onChangeText={setRTitle} placeholder="e.g. Annual checkup" placeholderTextColor={colors.textMuted} />

              <Text style={styles.fieldLabel}>Provider / Clinic</Text>
              <TextInput accessibilityLabel="Doctor or clinic name" style={styles.textInput} value={rProvider} onChangeText={setRProvider} placeholder="Doctor or clinic name" placeholderTextColor={colors.textMuted} />

              <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput accessibilityLabel="2025-07-01" style={styles.textInput} value={rDate} onChangeText={setRDate} placeholder="2025-07-01" placeholderTextColor={colors.textMuted} />

              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput accessibilityLabel="Observations, symptoms..." style={[styles.textInput, styles.textInputMultiline]} value={rNotes} onChangeText={setRNotes} placeholder="Observations, symptoms..." placeholderTextColor={colors.textMuted} multiline />

              <Text style={styles.fieldLabel}>Results / Findings</Text>
              <TextInput accessibilityLabel="Lab results, diagnosis..." style={[styles.textInput, styles.textInputMultiline]} value={rResults} onChangeText={setRResults} placeholder="Lab results, diagnosis..." placeholderTextColor={colors.textMuted} multiline />

              <Text style={styles.fieldLabel}>Follow-Up Date (optional)</Text>
              <TextInput accessibilityLabel="YYYY-MM-DD" style={styles.textInput} value={rFollowUp} onChangeText={setRFollowUp} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />

              <View style={styles.criticalToggleRow}>
                <View style={styles.criticalToggleInfo}>
                  <Text style={styles.criticalToggleLabel}>Mark as Critical</Text>
                  <Text style={styles.criticalToggleSub}>Allergies, major diagnoses</Text>
                </View>
                <Switch
                  value={rCritical}
                  onValueChange={setRCritical}
                  trackColor={{ false: colors.border, true: '#E74C3C80' }}
                  thumbColor={rCritical ? '#E74C3C' : colors.textMuted}
                />
              </View>

              <Pressable accessibilityRole="button" style={styles.saveBtn} onPress={handleAddRecord}>
                <LinearGradient colors={['#283593', '#1A237E']} style={styles.saveBtnGradient}>
                  <Ionicons name={'checkmark-circle' as any} size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Record</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Doctor Modal */}
      <Modal visible={showDoctorModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDoctorModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Doctor</Text>
              <Pressable accessibilityRole="button" onPress={() => setShowDoctorModal(false)}>
                <Ionicons name={'close' as any} size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

              <Text style={styles.fieldLabel}>Primary Patient</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {MEMBERS.map((m) => (
                  <Pressable accessibilityRole="button"
                    key={m.id}
                    style={[styles.chipBtn, dMemberId === m.id && { backgroundColor: m.color, borderColor: m.color }]}
                    onPress={() => setDMemberId(m.id)}
                  >
                    <Text style={[styles.chipBtnText, dMemberId === m.id && { color: '#fff' }]}>{m.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Doctor Name *</Text>
              <TextInput accessibilityLabel="Dr. Jane Smith" style={styles.textInput} value={dName} onChangeText={setDName} placeholder="Dr. Jane Smith" placeholderTextColor={colors.textMuted} />

              <Text style={styles.fieldLabel}>Specialty</Text>
              <TextInput accessibilityLabel="e.g. Family Medicine" style={styles.textInput} value={dSpecialty} onChangeText={setDSpecialty} placeholder="e.g. Family Medicine" placeholderTextColor={colors.textMuted} />

              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput accessibilityLabel="(555) 123-4567" style={styles.textInput} value={dPhone} onChangeText={setDPhone} placeholder="(555) 123-4567" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />

              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput accessibilityLabel="123 Main St, City, State 12345" style={[styles.textInput, styles.textInputMultiline]} value={dAddress} onChangeText={setDAddress} placeholder="123 Main St, City, State 12345" placeholderTextColor={colors.textMuted} multiline />

              <Pressable accessibilityRole="button" style={styles.saveBtn} onPress={handleAddDoctor}>
                <LinearGradient colors={['#283593', '#1A237E']} style={styles.saveBtnGradient}>
                  <Ionicons name={'checkmark-circle' as any} size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Add Doctor</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 12,
    padding: 4,
    ...shadows.sm,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#283593' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabLabelActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  filterScroll: { marginBottom: 8 },
  filterScrollContent: { gap: 8, paddingRight: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginRight: 6,
  },
  filterChipActive: { backgroundColor: '#283593', borderColor: '#283593' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  filterChipTextActive: { color: '#fff' },
  recordCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  criticalCard: {
    borderWidth: 1.5,
    borderColor: '#E74C3C',
  },
  recordRow: { flexDirection: 'row', gap: 12 },
  recordIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  recordInfo: { flex: 1 },
  recordTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  recordTitle: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  criticalBadge: {
    backgroundColor: '#E74C3C',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  criticalBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  recordProvider: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  recordMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typePillText: { fontSize: 11, fontWeight: '600' },
  recordDate: { fontSize: 11, color: colors.textMuted, marginLeft: 4 },
  recordResults: { fontSize: 12, color: colors.textSecondary, marginTop: 6, fontStyle: 'italic' },
  followUpText: { fontSize: 11, color: '#F5A623', marginTop: 4, fontWeight: '600' },
  deleteBtn: { padding: 4, flexShrink: 0 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12, marginTop: 4 },
  doctorCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  doctorHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '700', color: colors.text },
  doctorSpecialty: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  doctorContact: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  doctorPhone: { fontSize: 14, color: '#27AE60', fontWeight: '600' },
  doctorAddress: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  criticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDEDEC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E74C3C40',
  },
  criticalBannerText: { flex: 1, fontSize: 12, color: '#C0392B', fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...shadows.md,
  },
  fabGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalContainer: { flex: 1, backgroundColor: colors.background, paddingTop: 12 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalScroll: { flex: 1 },
  modalContent: { padding: 20, paddingBottom: 60 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginRight: 8,
    marginBottom: 4,
  },
  chipBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  textInputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  criticalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  criticalToggleInfo: { flex: 1 },
  criticalToggleLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  criticalToggleSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  saveBtn: { marginTop: 24, borderRadius: 14, overflow: 'hidden' },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
