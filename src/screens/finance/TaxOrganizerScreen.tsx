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
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import {
  useTaxStore,
  TaxCategory,
  DocumentStatus,
} from '../../store/useTaxStore';

const TAX_CATEGORIES: { value: TaxCategory; label: string; icon: string }[] = [
  { value: 'income', label: 'Income', icon: 'cash' },
  { value: 'deduction', label: 'Deduction', icon: 'remove-circle' },
  { value: 'credit', label: 'Credit', icon: 'gift' },
  { value: 'property', label: 'Property', icon: 'home' },
  { value: 'investment', label: 'Investment', icon: 'trending-up' },
  { value: 'business', label: 'Business', icon: 'briefcase' },
  { value: 'medical', label: 'Medical', icon: 'medkit' },
  { value: 'charity', label: 'Charity', icon: 'heart' },
  { value: 'education', label: 'Education', icon: 'school' },
  { value: 'childcare', label: 'Childcare', icon: 'people' },
];

const DOCUMENT_STATUSES: { value: DocumentStatus; label: string; color: string }[] = [
  { value: 'needed', label: 'Needed', color: colors.danger },
  { value: 'received', label: 'Received', color: colors.warning },
  { value: 'uploaded', label: 'Uploaded', color: colors.info },
  { value: 'filed', label: 'Filed', color: colors.success },
];

function getCategoryLabel(cat: TaxCategory): string {
  return TAX_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}
function getCategoryIcon(cat: TaxCategory): string {
  return TAX_CATEGORIES.find((c) => c.value === cat)?.icon ?? 'document';
}
function getStatusColor(status: DocumentStatus): string {
  return DOCUMENT_STATUSES.find((s) => s.value === status)?.color ?? colors.textMuted;
}
function getStatusLabel(status: DocumentStatus): string {
  return DOCUMENT_STATUSES.find((s) => s.value === status)?.label ?? status;
}
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

type Tab = 'Documents' | 'Deductions' | 'Summary';
type DocFilter = 'All' | DocumentStatus;

export function TaxOrganizerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    documents,
    deductions,
    selectedYear,
    setSelectedYear,
    addDocument,
    updateDocumentStatus,
    removeDocument,
    addDeduction,
    removeDeduction,
    getTotalDeductions,
    getDocumentsByStatus,
  } = useTaxStore();

  const [activeTab, setActiveTab] = useState<Tab>('Documents');
  const [docFilter, setDocFilter] = useState<DocFilter>('All');
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showAddDedModal, setShowAddDedModal] = useState(false);

  // Add Document form
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<TaxCategory>('income');
  const [docStatus, setDocStatus] = useState<DocumentStatus>('needed');
  const [docAmount, setDocAmount] = useState('');
  const [docDueDate, setDocDueDate] = useState('');
  const [docNotes, setDocNotes] = useState('');

  // Add Deduction form
  const [dedCategory, setDedCategory] = useState<TaxCategory>('charity');
  const [dedDescription, setDedDescription] = useState('');
  const [dedAmount, setDedAmount] = useState('');
  const [dedDate, setDedDate] = useState('');
  const [dedReceipts, setDedReceipts] = useState('0');
  const [dedNotes, setDedNotes] = useState('');

  const yearDocs = documents.filter((d) => d.year === selectedYear);
  const yearDeds = deductions.filter((d) => d.year === selectedYear);
  const filteredDocs = docFilter === 'All' ? yearDocs : yearDocs.filter((d) => d.status === docFilter);
  const totalDeductions = getTotalDeductions(selectedYear);

  const neededCount = getDocumentsByStatus(selectedYear, 'needed').length;
  const receivedCount = getDocumentsByStatus(selectedYear, 'received').length;
  const uploadedCount = getDocumentsByStatus(selectedYear, 'uploaded').length;
  const filedCount = getDocumentsByStatus(selectedYear, 'filed').length;
  const totalDocs = yearDocs.length;

  const resetDocForm = () => {
    setDocName(''); setDocCategory('income'); setDocStatus('needed');
    setDocAmount(''); setDocDueDate(''); setDocNotes('');
  };
  const resetDedForm = () => {
    setDedCategory('charity'); setDedDescription(''); setDedAmount('');
    setDedDate(''); setDedReceipts('0'); setDedNotes('');
  };

  const handleAddDoc = () => {
    if (!docName.trim()) {
      Alert.alert('Missing Info', 'Please enter a document name.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addDocument({
      year: selectedYear,
      name: docName.trim(),
      category: docCategory,
      status: docStatus,
      amount: docAmount ? parseFloat(docAmount) : undefined,
      dueDate: docDueDate.trim() || undefined,
      notes: docNotes.trim(),
    });
    resetDocForm();
    setShowAddDocModal(false);
  };

  const handleAddDed = () => {
    const amount = parseFloat(dedAmount);
    if (!dedDescription.trim() || isNaN(amount) || amount <= 0) {
      Alert.alert('Missing Info', 'Please enter a description and valid amount.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addDeduction({
      year: selectedYear,
      category: dedCategory,
      description: dedDescription.trim(),
      amount,
      date: dedDate.trim() || new Date().toISOString().split('T')[0],
      receiptCount: parseInt(dedReceipts, 10) || 0,
      notes: dedNotes.trim(),
    });
    resetDedForm();
    setShowAddDedModal(false);
  };

  const handleDocPress = (id: string, name: string, currentStatus: DocumentStatus) => {
    Alert.alert(`Update: ${name}`, 'Set document status:', [
      { text: 'Cancel', style: 'cancel' },
      ...DOCUMENT_STATUSES.filter((s) => s.value !== currentStatus).map((s) => ({
        text: s.label,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateDocumentStatus(id, s.value);
        },
      })),
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Delete document?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => removeDocument(id) },
          ]);
        },
      },
    ]);
  };

  // Summary tab: group deductions by category
  const dedByCategory = TAX_CATEGORIES.map((cat) => {
    const total = yearDeds.filter((d) => d.category === cat.value).reduce((s, d) => s + d.amount, 0);
    return { ...cat, total };
  }).filter((c) => c.total > 0);
  const maxDedAmount = Math.max(...dedByCategory.map((c) => c.total), 1);

  const tabs: Tab[] = ['Documents', 'Deductions', 'Summary'];
  const GRADIENT_COLORS: [string, string] = ['#1A237E', '#283593'];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENT_COLORS} style={{ paddingTop: insets.top + 8, paddingBottom: 0 }}>
        {/* Header top row */}
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Tax Organizer</Text>
            <Text style={styles.headerSub}>Documents & deductions tracker</Text>
          </View>
          <Pressable
            onPress={() => activeTab === 'Documents' ? setShowAddDocModal(true) : setShowAddDedModal(true)}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>

        {/* Year selector */}
        <View style={styles.yearRow}>
          <Pressable onPress={() => setSelectedYear(selectedYear - 1)} style={styles.yearArrow}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.yearText}>{selectedYear} Tax Year</Text>
          <Pressable onPress={() => setSelectedYear(selectedYear + 1)} style={styles.yearArrow}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={activeTab === tab ? styles.tabActive : styles.tabInactive}
            >
              <Text style={activeTab === tab ? styles.tabTextActive : styles.tabTextInactive}>{tab}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>

        {/* ---- DOCUMENTS TAB ---- */}
        {activeTab === 'Documents' && (
          <>
            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {(['All', 'needed', 'received', 'uploaded', 'filed'] as DocFilter[]).map((f) => {
                const isActive = docFilter === f;
                const color = f === 'All' ? colors.primary : getStatusColor(f);
                const chipStyle: ViewStyle = {
                  ...styles.filterChip,
                  backgroundColor: isActive ? color : colors.card,
                  borderColor: color,
                };
                return (
                  <Pressable key={f} onPress={() => setDocFilter(f)} style={chipStyle}>
                    <Text style={[styles.filterChipText, { color: isActive ? '#fff' : color }]}>
                      {f === 'All' ? 'All' : getStatusLabel(f)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {filteredDocs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No documents yet</Text>
                <Text style={styles.emptySubText}>Tap + to add</Text>
              </View>
            ) : (
              filteredDocs.map((doc) => {
                const statusColor = getStatusColor(doc.status);
                const cardStyle: ViewStyle = { ...styles.listCard, borderLeftColor: statusColor, borderLeftWidth: 4 };
                return (
                  <Pressable key={doc.id} onPress={() => handleDocPress(doc.id, doc.name, doc.status)}>
                    <View style={cardStyle}>
                      <View style={styles.docRow}>
                        <View style={[styles.categoryBadge, { backgroundColor: statusColor + '22' }]}>
                          <Ionicons name={getCategoryIcon(doc.category) as any} size={16} color={statusColor} />
                        </View>
                        <View style={styles.docInfo}>
                          <Text style={styles.docName}>{doc.name}</Text>
                          <Text style={styles.docMeta}>
                            {getCategoryLabel(doc.category)}
                            {doc.amount ? ` • ${formatCurrency(doc.amount)}` : ''}
                            {doc.dueDate ? ` • Due ${doc.dueDate}` : ''}
                          </Text>
                          {doc.notes ? <Text style={styles.docNotes}>{doc.notes}</Text> : null}
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                          <Text style={styles.statusBadgeText}>{getStatusLabel(doc.status)}</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </>
        )}

        {/* ---- DEDUCTIONS TAB ---- */}
        {activeTab === 'Deductions' && (
          <>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Deductions {selectedYear}</Text>
              <Text style={styles.totalAmount}>{formatCurrency(totalDeductions)}</Text>
            </View>

            {yearDeds.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No deductions yet</Text>
                <Text style={styles.emptySubText}>Tap + to add</Text>
              </View>
            ) : (
              TAX_CATEGORIES.filter((cat) =>
                yearDeds.some((d) => d.category === cat.value)
              ).map((cat) => {
                const catDeds = yearDeds.filter((d) => d.category === cat.value);
                const catTotal = catDeds.reduce((s, d) => s + d.amount, 0);
                return (
                  <View key={cat.value} style={{ marginBottom: 6 }}>
                    <View style={styles.catHeader}>
                      <Ionicons name={cat.icon as any} size={16} color={colors.primary} />
                      <Text style={styles.catLabel}>{cat.label}</Text>
                      <Text style={styles.catTotal}>{formatCurrency(catTotal)}</Text>
                    </View>
                    {catDeds.map((ded) => (
                      <Pressable
                        key={ded.id}
                        onLongPress={() =>
                          Alert.alert('Delete?', ded.description, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => removeDeduction(ded.id) },
                          ])
                        }
                      >
                        <View style={styles.dedCard}>
                          <View style={styles.dedRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.dedDesc}>{ded.description}</Text>
                              <Text style={styles.dedMeta}>
                                {ded.date} • {ded.receiptCount} receipt{ded.receiptCount !== 1 ? 's' : ''}
                              </Text>
                            </View>
                            <Text style={styles.dedAmount}>{formatCurrency(ded.amount)}</Text>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ---- SUMMARY TAB ---- */}
        {activeTab === 'Summary' && (
          <>
            {/* Document progress cards */}
            <Text style={styles.sectionTitle}>Document Progress</Text>
            <View style={styles.progressGrid}>
              {[
                { label: 'Needed', count: neededCount, color: colors.danger },
                { label: 'Received', count: receivedCount, color: colors.warning },
                { label: 'Uploaded', count: uploadedCount, color: colors.info },
                { label: 'Filed', count: filedCount, color: colors.success },
              ].map((item) => (
                <View key={item.label} style={[styles.progressCard, { borderTopColor: item.color, borderTopWidth: 3 }]}>
                  <Text style={[styles.progressCount, { color: item.color }]}>{item.count}</Text>
                  <Text style={styles.progressLabel}>{item.label}</Text>
                  <Text style={styles.progressSub}>of {totalDocs}</Text>
                </View>
              ))}
            </View>

            {/* Deductions bar chart */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Deductions by Category</Text>
            {dedByCategory.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No deductions recorded</Text>
              </View>
            ) : (
              dedByCategory.map((cat) => {
                const pct = cat.total / maxDedAmount;
                return (
                  <View key={cat.value} style={styles.barRow}>
                    <Text style={styles.barLabel}>{cat.label}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={styles.barAmount}>{formatCurrency(cat.total)}</Text>
                  </View>
                );
              })
            )}

            {/* Estimated refund placeholder */}
            <View style={styles.refundCard}>
              <Ionicons name="calculator-outline" size={32} color={colors.primary} />
              <Text style={styles.refundTitle}>Estimated Refund</Text>
              <Text style={styles.refundValue}>Available after filing</Text>
              <Text style={styles.refundSub}>
                Total deductions: {formatCurrency(totalDeductions)} • Docs filed: {filedCount}/{totalDocs}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (activeTab === 'Documents') setShowAddDocModal(true);
          else if (activeTab === 'Deductions') setShowAddDedModal(true);
        }}
      >
        <LinearGradient colors={GRADIENT_COLORS} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </Pressable>

      {/* Add Document Modal */}
      <Modal visible={showAddDocModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddDocModal(false)}>
        <View style={styles.modalContainer}>
          <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={styles.modalTitle}>Add Tax Document</Text>
          <ScrollView>
            <Text style={styles.fieldLabel}>Document Name *</Text>
            <TextInput
              style={styles.input}
              value={docName}
              onChangeText={setDocName}
              placeholder="e.g. W-2 from Employer"
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {TAX_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  onPress={() => setDocCategory(cat.value)}
                  style={docCategory === cat.value ? styles.pickerItemActive : styles.pickerItem}
                >
                  <Text style={docCategory === cat.value ? styles.pickerTextActive : styles.pickerText}>{cat.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.statusRow}>
              {DOCUMENT_STATUSES.map((s) => (
                <Pressable
                  key={s.value}
                  onPress={() => setDocStatus(s.value)}
                  style={[styles.statusChip, { borderColor: s.color, backgroundColor: docStatus === s.value ? s.color : 'transparent' }]}
                >
                  <Text style={[styles.statusChipText, { color: docStatus === s.value ? '#fff' : s.color }]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Amount (optional)</Text>
            <TextInput
              style={styles.input}
              value={docAmount}
              onChangeText={setDocAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Due Date (optional)</Text>
            <TextInput
              style={styles.input}
              value={docDueDate}
              onChangeText={setDocDueDate}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={docNotes}
              onChangeText={setDocNotes}
              placeholder="Additional notes..."
              multiline
            />

            <Pressable style={styles.saveBtn} onPress={handleAddDoc}>
              <Text style={styles.saveBtnText}>Add Document</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => { resetDocForm(); setShowAddDocModal(false); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Deduction Modal */}
      <Modal visible={showAddDedModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddDedModal(false)}>
        <View style={styles.modalContainer}>
          <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={styles.modalTitle}>Add Deduction</Text>
          <ScrollView>
            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {TAX_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  onPress={() => setDedCategory(cat.value)}
                  style={dedCategory === cat.value ? styles.pickerItemActive : styles.pickerItem}
                >
                  <Text style={dedCategory === cat.value ? styles.pickerTextActive : styles.pickerText}>{cat.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={styles.input}
              value={dedDescription}
              onChangeText={setDedDescription}
              placeholder="e.g. Charitable donation to Red Cross"
            />

            <Text style={styles.fieldLabel}>Amount *</Text>
            <TextInput
              style={styles.input}
              value={dedAmount}
              onChangeText={setDedAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.input}
              value={dedDate}
              onChangeText={setDedDate}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.fieldLabel}>Receipt Count</Text>
            <View style={styles.counterRow}>
              <Pressable onPress={() => setDedReceipts(String(Math.max(0, parseInt(dedReceipts, 10) - 1)))} style={styles.counterBtn}>
                <Ionicons name="remove" size={20} color={colors.primary} />
              </Pressable>
              <Text style={styles.counterValue}>{dedReceipts}</Text>
              <Pressable onPress={() => setDedReceipts(String(parseInt(dedReceipts, 10) + 1))} style={styles.counterBtn}>
                <Ionicons name="add" size={20} color={colors.primary} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={dedNotes}
              onChangeText={setDedNotes}
              placeholder="Additional notes..."
              multiline
            />

            <Pressable style={styles.saveBtn} onPress={handleAddDed}>
              <Text style={styles.saveBtnText}>Add Deduction</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => { resetDedForm(); setShowAddDedModal(false); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { padding: 4 },
  addBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 16,
  },
  yearArrow: { padding: 6 },
  yearText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabActive: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabInactive: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabTextActive: { fontSize: 14, fontWeight: '700', color: '#1A237E' },
  tabTextInactive: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  body: { flex: 1 },
  filterChip: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    ...shadows.sm,
  },
  docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  categoryBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docInfo: { flex: 1 },
  docName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  docMeta: { fontSize: 12, color: colors.textSecondary },
  docNotes: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  totalCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    ...shadows.sm,
  },
  totalLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  totalAmount: { fontSize: 32, fontWeight: '800', color: colors.primary },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    marginTop: 12,
    marginBottom: 6,
  },
  catLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  catTotal: { fontSize: 14, fontWeight: '700', color: colors.primary },
  dedCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    ...shadows.sm,
  },
  dedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dedDesc: { fontSize: 14, fontWeight: '600', color: colors.text },
  dedMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  dedAmount: { fontSize: 15, fontWeight: '700', color: colors.success },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  progressGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  progressCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    ...shadows.sm,
  },
  progressCount: { fontSize: 28, fontWeight: '800' },
  progressLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 2 },
  progressSub: { fontSize: 11, color: colors.textMuted },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  barLabel: { width: 80, fontSize: 12, color: colors.textSecondary },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barAmount: { width: 64, fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'right' },
  refundCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    alignItems: 'center',
    ...shadows.sm,
  },
  refundTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 12 },
  refundValue: { fontSize: 22, fontWeight: '800', color: colors.textMuted, marginTop: 4 },
  refundSub: { fontSize: 12, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
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
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  emptySubText: { fontSize: 13, color: colors.textMuted },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerItemActive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.primary,
  },
  pickerText: { fontSize: 13, color: colors.textSecondary },
  pickerTextActive: { fontSize: 13, color: '#fff', fontWeight: '700' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  statusChip: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusChipText: { fontSize: 13, fontWeight: '600' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: { fontSize: 20, fontWeight: '700', color: colors.text, minWidth: 30, textAlign: 'center' },
  saveBtn: {
    backgroundColor: '#1A237E',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  cancelBtnText: { color: colors.textSecondary, fontSize: 15 },
});
