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
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useMedicationStore, MedFrequency, Medication } from '../../store/useMedicationStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const generateId = () => Math.random().toString(36).substring(2, 11);

const FREQ_OPTIONS: { value: MedFrequency; label: string; times: number }[] = [
  { value: 'daily', label: 'Once Daily', times: 1 },
  { value: 'twice_daily', label: 'Twice Daily', times: 2 },
  { value: 'weekly', label: 'Weekly', times: 1 },
  { value: 'as_needed', label: 'As Needed', times: 0 },
  { value: 'monthly', label: 'Monthly', times: 1 },
];

const COLOR_PRESETS = ['#2980B9', '#F5A623', '#E74C3C', '#8E44AD', '#27AE60', '#16A085'];

function freqLabel(f: MedFrequency): string {
  return FREQ_OPTIONS.find((o) => o.value === f)?.label ?? f;
}

function daysUntilRefill(refillDate?: string): number | null {
  if (!refillDate) return null;
  const diff = new Date(refillDate).getTime() - new Date().getTime();
  return Math.ceil(diff / 86400000);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getScheduleSlot(freq: MedFrequency): string[] {
  switch (freq) {
    case 'daily': return ['Morning'];
    case 'twice_daily': return ['Morning', 'Evening'];
    case 'weekly': return ['Weekly'];
    case 'monthly': return ['Monthly'];
    case 'as_needed': return ['As Needed'];
  }
}

export function MedicationManagerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { medications, logs, addMedication, deleteMedication, logDose, seedDemoData } = useMedicationStore();
  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);

  const [activeTab, setActiveTab] = useState<'active' | 'schedule' | 'history'>('active');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [formMemberId, setFormMemberId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDosage, setFormDosage] = useState('');
  const [formFrequency, setFormFrequency] = useState<MedFrequency>('daily');
  const [formInstructions, setFormInstructions] = useState('');
  const [formDoctor, setFormDoctor] = useState('');
  const [formPharmacy, setFormPharmacy] = useState('');
  const [formRefillDate, setFormRefillDate] = useState('');
  const [formColor, setFormColor] = useState(COLOR_PRESETS[0]);
  const [formPills, setFormPills] = useState('');

  const activeMeds = medications.filter((m) => m.isActive);
  const refillsDueThisWeek = activeMeds.filter((m) => {
    const days = daysUntilRefill(m.refillDate);
    return days !== null && days <= 7 && days >= 0;
  }).length;

  const resetForm = () => {
    setFormMemberId(''); setFormName(''); setFormDosage(''); setFormFrequency('daily');
    setFormInstructions(''); setFormDoctor(''); setFormPharmacy(''); setFormRefillDate('');
    setFormColor(COLOR_PRESETS[0]); setFormPills('');
  };

  const handleAdd = () => {
    if (!formName.trim() || !formDosage.trim() || !formMemberId) return;
    addMedication({
      familyId: family?.id ?? 'demo-family',
      memberId: formMemberId,
      name: formName.trim(),
      dosage: formDosage.trim(),
      frequency: formFrequency,
      instructions: formInstructions.trim() || undefined,
      prescribedBy: formDoctor.trim() || undefined,
      pharmacy: formPharmacy.trim() || undefined,
      refillDate: formRefillDate.trim() || undefined,
      startDate: new Date().toISOString(),
      isActive: true,
      color: formColor,
      pillsRemaining: formPills ? parseInt(formPills, 10) : undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetForm();
    setShowAddModal(false);
  };

  const handleLogDose = (med: Medication) => {
    logDose(med.id, med.memberId, true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (med: Medication) => {
    Alert.alert('Remove Medication', `Remove ${med.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: () => {
          deleteMedication(med.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  // Group meds by member
  const medsByMember = members.reduce<Record<string, Medication[]>>((acc, m) => {
    const memberMeds = activeMeds.filter((med) => med.memberId === m.id);
    if (memberMeds.length > 0) acc[m.id] = memberMeds;
    return acc;
  }, {});

  // Unassigned meds (member not in family list)
  const unassignedMeds = activeMeds.filter((med) => !members.find((m) => m.id === med.memberId));

  const renderActiveTab = () => (
    <View style={styles.tabContent}>
      {activeMeds.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="medkit-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No medications</Text>
          <Text style={styles.emptyDesc}>Track family medications and dosage schedules</Text>
          <Button title="Add Demo Data" onPress={() => { seedDemoData(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} variant="ghost" style={{ marginTop: 12 }} />
        </View>
      )}

      {Object.entries(medsByMember).map(([memberId, meds]) => {
        const member = members.find((m) => m.id === memberId);
        return (
          <View key={memberId} style={styles.memberSection}>
            <View style={styles.memberHeader}>
              <View style={[styles.memberAvatar, { backgroundColor: member?.avatarColor ?? colors.textMuted }]}>
                <Text style={styles.memberAvatarText}>{(member?.name ?? '?').charAt(0)}</Text>
              </View>
              <Text style={styles.memberName}>{member?.name ?? 'Unknown'}</Text>
              <Badge label={`${meds.length} med${meds.length !== 1 ? 's' : ''}`} variant="neutral" size="sm" />
            </View>
            {meds.map((med) => renderMedCard(med))}
          </View>
        );
      })}

      {unassignedMeds.length > 0 && (
        <View style={styles.memberSection}>
          <Text style={styles.memberName}>Other</Text>
          {unassignedMeds.map((med) => renderMedCard(med))}
        </View>
      )}
    </View>
  );

  const renderMedCard = (med: Medication) => {
    const refillDays = daysUntilRefill(med.refillDate);
    const refillSoon = refillDays !== null && refillDays <= 7;
    const pillsTotal = 90; // reference max for progress bar
    const pillsProgress = med.pillsRemaining !== undefined ? Math.min(med.pillsRemaining / pillsTotal, 1) : null;

    return (
      <Card key={med.id} style={styles.medCard} variant="elevated">
        <View style={styles.medHeader}>
          <View style={[styles.pillDot, { backgroundColor: med.color }]} />
          <View style={styles.medInfo}>
            <Text style={styles.medName}>{med.name}</Text>
            <Text style={styles.medDosage}>{med.dosage} — {freqLabel(med.frequency)}</Text>
          </View>
          <Pressable onPress={() => handleDelete(med)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </Pressable>
        </View>

        {med.instructions ? (
          <Text style={styles.medInstructions}>{med.instructions}</Text>
        ) : null}

        {pillsProgress !== null && (
          <View style={styles.pillsRow}>
            <Text style={styles.pillsLabel}>{med.pillsRemaining} pills remaining</Text>
            <ProgressBar progress={pillsProgress} color={med.color} height={6} style={styles.progressBar} />
          </View>
        )}

        <View style={styles.medMeta}>
          {refillDays !== null && (
            <View style={styles.metaRow}>
              <Ionicons name="reload-outline" size={13} color={refillSoon ? colors.danger : colors.textMuted} />
              <Text style={[styles.metaText, refillSoon && styles.refillSoonText]}>
                Refill {refillDays <= 0 ? 'overdue' : `in ${refillDays} day${refillDays !== 1 ? 's' : ''}`}
                {med.refillDate ? ` (${formatDate(med.refillDate)})` : ''}
              </Text>
            </View>
          )}
          {med.prescribedBy ? (
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>{med.prescribedBy}</Text>
            </View>
          ) : null}
          {med.pharmacy ? (
            <View style={styles.metaRow}>
              <Ionicons name="storefront-outline" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>{med.pharmacy}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.medActions}>
          <Button
            title="Log Dose"
            onPress={() => handleLogDose(med)}
            size="sm"
            leftIcon={<Ionicons name="checkmark-circle-outline" size={14} color="#fff" />}
          />
        </View>
      </Card>
    );
  };

  const renderScheduleTab = () => {
    const todayMeds = activeMeds.filter((m) => m.frequency !== 'as_needed');
    const slots: Record<string, Medication[]> = { Morning: [], Afternoon: [], Evening: [] };

    todayMeds.forEach((med) => {
      const schedSlots = getScheduleSlot(med.frequency);
      schedSlots.forEach((slot) => {
        if (slot === 'Morning') slots.Morning.push(med);
        else if (slot === 'Evening') slots.Evening.push(med);
        else slots.Afternoon.push(med);
      });
    });

    return (
      <View style={styles.tabContent}>
        <Card style={styles.scheduleInfoCard} variant="elevated">
          <View style={styles.scheduleInfoRow}>
            <Ionicons name="calendar-outline" size={20} color={'#AD1457'} />
            <Text style={styles.scheduleInfoText}>
              Today's Schedule — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        </Card>

        {(['Morning', 'Afternoon', 'Evening'] as const).map((slot) => {
          const slotMeds = slots[slot];
          return (
            <View key={slot} style={styles.slotSection}>
              <View style={styles.slotHeader}>
                <Ionicons
                  name={slot === 'Morning' ? 'sunny-outline' : slot === 'Afternoon' ? 'partly-sunny-outline' : 'moon-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.slotTitle}>{slot}</Text>
                <Badge label={`${slotMeds.length}`} variant="neutral" size="sm" />
              </View>
              {slotMeds.length === 0 ? (
                <Text style={styles.slotEmpty}>No medications</Text>
              ) : (
                slotMeds.map((med) => {
                  const member = members.find((m) => m.id === med.memberId);
                  const todayLogs = logs.filter((l) => {
                    const logDate = new Date(l.takenAt).toDateString();
                    return l.medicationId === med.id && logDate === new Date().toDateString();
                  });
                  const taken = todayLogs.some((l) => l.doseTaken);
                  return (
                    <Card key={med.id} style={(taken ? { ...styles.scheduleCard, ...styles.scheduleCardDone } : styles.scheduleCard) as ViewStyle} variant="default">
                      <View style={styles.scheduleRow}>
                        <View style={[styles.scheduleColorDot, { backgroundColor: med.color }]} />
                        <View style={styles.scheduleInfo}>
                          <Text style={[styles.scheduleMedName, taken && styles.doneText]}>{med.name}</Text>
                          <Text style={styles.scheduleDosage}>{med.dosage}</Text>
                          {member ? <Text style={styles.scheduleMember}>For: {member.name}</Text> : null}
                        </View>
                        {taken ? (
                          <View style={styles.takenBadge}>
                            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                          </View>
                        ) : (
                          <Pressable onPress={() => handleLogDose(med)} style={styles.logBtn}>
                            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                          </Pressable>
                        )}
                      </View>
                    </Card>
                  );
                })
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderHistoryTab = () => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const weekAgo = new Date(Date.now() - 7 * 86400000);

    const todayLogs = logs.filter((l) => new Date(l.takenAt).toDateString() === today);
    const yesterdayLogs = logs.filter((l) => new Date(l.takenAt).toDateString() === yesterday);
    const weekLogs = logs.filter((l) => new Date(l.takenAt) >= weekAgo && new Date(l.takenAt).toDateString() !== today && new Date(l.takenAt).toDateString() !== yesterday);

    const renderLogGroup = (title: string, groupLogs: typeof logs) => {
      if (groupLogs.length === 0) return null;
      return (
        <View style={styles.logGroup} key={title}>
          <Text style={styles.logGroupTitle}>{title}</Text>
          {groupLogs.map((log) => {
            const med = medications.find((m) => m.id === log.medicationId);
            const member = members.find((m) => m.id === log.memberId);
            return (
              <Card key={log.id} style={styles.logCard} variant="default">
                <View style={styles.logRow}>
                  <View style={[styles.logDot, { backgroundColor: med?.color ?? colors.textMuted }]} />
                  <View style={styles.logInfo}>
                    <Text style={styles.logMedName}>{med?.name ?? 'Unknown'}</Text>
                    <Text style={styles.logMeta}>{med?.dosage} — {member?.name ?? 'Unknown'}</Text>
                    <Text style={styles.logTime}>{formatTime(log.takenAt)}</Text>
                  </View>
                  <View style={[styles.logStatus, { backgroundColor: log.doseTaken ? colors.success + '20' : colors.danger + '20' }]}>
                    <Ionicons name={log.doseTaken ? 'checkmark-circle' : 'close-circle'} size={16} color={log.doseTaken ? colors.success : colors.danger} />
                    <Text style={[styles.logStatusText, { color: log.doseTaken ? colors.success : colors.danger }]}>
                      {log.doseTaken ? 'Taken' : 'Skipped'}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      );
    };

    return (
      <View style={styles.tabContent}>
        {logs.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No dose history</Text>
            <Text style={styles.emptyDesc}>Logged doses will appear here</Text>
          </View>
        )}
        {renderLogGroup('Today', todayLogs)}
        {renderLogGroup('Yesterday', yesterdayLogs)}
        {renderLogGroup('This Week', weekLogs)}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#880E4F', '#AD1457']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Medications</Text>
          <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{activeMeds.length}</Text>
            <Text style={styles.headerStatLabel}>Active</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatNum, refillsDueThisWeek > 0 && styles.alertNum]}>{refillsDueThisWeek}</Text>
            <Text style={styles.headerStatLabel}>Refills Due</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{logs.filter((l) => new Date(l.takenAt).toDateString() === new Date().toDateString()).length}</Text>
            <Text style={styles.headerStatLabel}>Doses Today</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['active', 'schedule', 'history'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {activeTab === 'active' && renderActiveTab()}
        {activeTab === 'schedule' && renderScheduleTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </ScrollView>

      {/* Add Medication Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Medication</Text>

          <Text style={styles.modalLabel}>Family Member *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {members.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setFormMemberId(m.id)}
                style={[styles.memberChip, formMemberId === m.id && styles.memberChipActive]}
              >
                <View style={[styles.memberChipAvatar, { backgroundColor: m.avatarColor }]}>
                  <Text style={styles.memberChipAvatarText}>{m.name.charAt(0)}</Text>
                </View>
                <Text style={styles.memberChipName}>{m.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Medication Name *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Lisinopril" value={formName} onChangeText={setFormName} placeholderTextColor={colors.textMuted} autoFocus />

          <Text style={styles.modalLabel}>Dosage *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. 10mg" value={formDosage} onChangeText={setFormDosage} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Frequency</Text>
          <View style={styles.freqGrid}>
            {FREQ_OPTIONS.map((f) => (
              <Pressable
                key={f.value}
                onPress={() => setFormFrequency(f.value)}
                style={[styles.freqChip, formFrequency === f.value && styles.freqChipActive]}
              >
                <Text style={[styles.freqChipLabel, formFrequency === f.value && styles.freqChipLabelActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Instructions</Text>
          <TextInput style={[styles.modalInput, styles.modalTextarea]} placeholder="e.g. Take with water in the morning" value={formInstructions} onChangeText={setFormInstructions} multiline numberOfLines={2} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Doctor / Prescriber</Text>
          <TextInput style={styles.modalInput} placeholder="Dr. Martinez" value={formDoctor} onChangeText={setFormDoctor} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Pharmacy</Text>
          <TextInput style={styles.modalInput} placeholder="CVS Pharmacy" value={formPharmacy} onChangeText={setFormPharmacy} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Refill Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.modalInput} placeholder="2024-07-15" value={formRefillDate} onChangeText={setFormRefillDate} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Pills Remaining</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. 30" value={formPills} onChangeText={setFormPills} keyboardType="number-pad" placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Color</Text>
          <View style={styles.colorRow}>
            {COLOR_PRESETS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setFormColor(c)}
                style={[styles.colorDot, { backgroundColor: c }, formColor === c && styles.colorDotActive]}
              />
            ))}
          </View>

          <Button title="Add Medication" onPress={handleAdd} fullWidth size="lg" disabled={!formName.trim() || !formDosage.trim() || !formMemberId} style={{ marginTop: 16 }} />
          <Button title="Cancel" onPress={() => { resetForm(); setShowAddModal(false); }} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  headerStat: {
    alignItems: 'center',
    flex: 1,
  },
  headerStatNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  alertNum: {
    color: '#FFD54F',
  },
  headerStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#AD1457',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: '#AD1457',
  },
  tabContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  memberSection: {
    marginBottom: 20,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  medCard: {
    marginBottom: 12,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pillDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  medDosage: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
  medInstructions: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
  },
  pillsRow: {
    marginTop: 10,
  },
  pillsLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  progressBar: {
    marginBottom: 4,
  },
  medMeta: {
    marginTop: 10,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  refillSoonText: {
    color: colors.danger,
    fontWeight: '600',
  },
  medActions: {
    marginTop: 12,
  },
  scheduleInfoCard: {
    marginBottom: 16,
  },
  scheduleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduleInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  slotSection: {
    marginBottom: 20,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  slotTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  slotEmpty: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingLeft: 8,
  },
  scheduleCard: {
    marginBottom: 8,
  },
  scheduleCardDone: {
    opacity: 0.75,
    backgroundColor: colors.successLight,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleMedName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  doneText: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  scheduleDosage: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scheduleMember: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  takenBadge: {
    padding: 4,
  },
  logBtn: {
    padding: 4,
  },
  logGroup: {
    marginBottom: 20,
  },
  logGroupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  logCard: {
    marginBottom: 8,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  logInfo: {
    flex: 1,
  },
  logMedName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  logMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  logStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  logStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  modalTextarea: {
    height: 70,
    textAlignVertical: 'top',
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: colors.card,
  },
  memberChipActive: {
    borderColor: '#AD1457',
    backgroundColor: '#AD145710',
  },
  memberChipAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberChipAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  memberChipName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  freqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  freqChip: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  freqChipActive: {
    borderColor: '#AD1457',
    backgroundColor: '#AD145710',
  },
  freqChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  freqChipLabelActive: {
    color: '#AD1457',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: colors.text,
  },
});
