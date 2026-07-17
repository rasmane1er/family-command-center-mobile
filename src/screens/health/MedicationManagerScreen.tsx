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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ProgressBar } from '../../components/common/ProgressBar';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useMedicationStore, MedFrequency, Medication } from '../../store/useMedicationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { generateId } from '../../utils/generateId';

const FREQ_OPTIONS: { value: MedFrequency; labelKey: string; times: number }[] = [
  { value: 'daily', labelKey: 'freqOnceDaily', times: 1 },
  { value: 'twice_daily', labelKey: 'freqTwiceDaily', times: 2 },
  { value: 'weekly', labelKey: 'freqWeekly', times: 1 },
  { value: 'as_needed', labelKey: 'freqAsNeeded', times: 0 },
  { value: 'monthly', labelKey: 'freqMonthly', times: 1 },
];

const COLOR_PRESETS = ['#2980B9', '#F5A623', '#E74C3C', '#8E44AD', '#27AE60', '#16A085'];

function freqLabel(f: MedFrequency, t: (key: string) => string): string {
  const key = FREQ_OPTIONS.find((o) => o.value === f)?.labelKey;
  return key ? t(`health.screens.medicationManager.${key}`) : f;
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

export function MedicationManagerScreen({ navigation: navProp }: any) {
  const { colors } = useTheme();
  const navHook = useNavigation<any>();
  const navigation = navProp ?? navHook;
  const { t } = useTranslation('health');
  const insets = useSafeAreaInsets();
  const { medications, logs, addMedication, deleteMedication, logDose } = useMedicationStore();
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
      familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
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
    Alert.alert(
      t('health.screens.medicationManager.removeMedicationTitle'),
      t('health.screens.medicationManager.removeMedicationMsg', { name: med.name }),
      [
        { text: t('health.screens.medicationManager.cancel'), style: 'cancel' },
        {
          text: t('health.screens.medicationManager.remove'), style: 'destructive', onPress: () => {
            deleteMedication(med.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  };

  // Group meds by member
  const medsByMember = members.reduce<Record<string, Medication[]>>((acc, m) => {
    const memberMeds = activeMeds.filter((med) => med.memberId === m.id);
    if (memberMeds.length > 0) acc[m.id] = memberMeds;
    return acc;
  }, {});

  // Unassigned meds (member not in family list)
  const unassignedMeds = activeMeds.filter((med) => !members.find((m) => m.id === med.memberId));

  const s = makeStyles(colors);

  const screenHeader = (
    <PremiumHeader
      title={t('health.screens.medicationManager.headerTitle')}
      onBack={() => navigation.goBack()}
      colors={['#880E4F', '#AD1457']}
      rightAction={
        <Pressable onPress={() => setShowAddModal(true)} style={s.addBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      }
    >
      <View style={s.headerStats}>
        <View style={s.headerStat}>
          <Text style={s.headerStatNum}>{activeMeds.length}</Text>
          <Text style={s.headerStatLabel}>{t('health.screens.medicationManager.statActive')}</Text>
        </View>
        <View style={s.headerStatDivider} />
        <View style={s.headerStat}>
          <Text style={[s.headerStatNum, refillsDueThisWeek > 0 && s.alertNum]}>{refillsDueThisWeek}</Text>
          <Text style={s.headerStatLabel}>{t('health.screens.medicationManager.statRefillsDue')}</Text>
        </View>
        <View style={s.headerStatDivider} />
        <View style={s.headerStat}>
          <Text style={s.headerStatNum}>{logs.filter((l) => new Date(l.takenAt).toDateString() === new Date().toDateString()).length}</Text>
          <Text style={s.headerStatLabel}>{t('health.screens.medicationManager.statDosesToday')}</Text>
        </View>
      </View>
    </PremiumHeader>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#880E4F', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={s.addBtn}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, marginLeft: 8 }}>{t('health.screens.medicationManager.headerTitle')}</Text>
      <Pressable onPress={() => setShowAddModal(true)} style={s.addBtn}>
        <Ionicons name="add" size={22} color="#fff" />
      </Pressable>
    </View>
  );

  const renderActiveTab = () => (
    <View style={s.tabContent}>
      {activeMeds.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="medkit-outline" size={64} color={colors.textMuted} />
          <Text style={s.emptyTitle}>{t('health.screens.medicationManager.emptyMedsTitle')}</Text>
          <Text style={s.emptyDesc}>{t('health.screens.medicationManager.emptyMedsDesc')}</Text>
        </View>
      )}

      {Object.entries(medsByMember).map(([memberId, meds]) => {
        const member = members.find((m) => m.id === memberId);
        return (
          <View key={memberId} style={s.memberSection}>
            <View style={s.memberHeader}>
              <View style={[s.memberAvatar, { backgroundColor: member?.avatarColor ?? colors.textMuted }]}>
                <Text style={s.memberAvatarText}>{(member?.name ?? '?').charAt(0)}</Text>
              </View>
              <Text style={s.memberName}>{member?.name ?? t('health.screens.medicationManager.unknownMember')}</Text>
              <Badge label={t('health.screens.medicationManager.medsCount', { count: meds.length })} variant="neutral" size="sm" />
            </View>
            {meds.map((med) => renderMedCard(med))}
          </View>
        );
      })}

      {unassignedMeds.length > 0 && (
        <View style={s.memberSection}>
          <Text style={s.memberName}>{t('health.screens.medicationManager.otherSection')}</Text>
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
      <Card key={med.id} style={s.medCard} variant="elevated">
        <View style={s.medHeader}>
          <View style={[s.pillDot, { backgroundColor: med.color }]} />
          <View style={s.medInfo}>
            <Text style={s.medName}>{med.name}</Text>
            <Text style={s.medDosage}>{med.dosage} — {freqLabel(med.frequency, t)}</Text>
          </View>
          <Pressable onPress={() => handleDelete(med)} style={s.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </Pressable>
        </View>

        {med.instructions ? (
          <Text style={s.medInstructions}>{med.instructions}</Text>
        ) : null}

        {pillsProgress !== null && (
          <View style={s.pillsRow}>
            <Text style={s.pillsLabel}>{t('health.screens.medicationManager.pillsRemaining', { count: med.pillsRemaining })}</Text>
            <ProgressBar progress={pillsProgress} color={med.color} height={6} style={s.progressBar} />
          </View>
        )}

        <View style={s.medMeta}>
          {refillDays !== null && (
            <View style={s.metaRow}>
              <Ionicons name="reload-outline" size={13} color={refillSoon ? colors.danger : colors.textMuted} />
              <Text style={[s.metaText, refillSoon && s.refillSoonText]}>
                {refillDays <= 0 ? t('health.screens.medicationManager.refillOverdue') : t('health.screens.medicationManager.refillInDays', { count: refillDays })}
                {med.refillDate ? ` (${formatDate(med.refillDate)})` : ''}
              </Text>
            </View>
          )}
          {med.prescribedBy ? (
            <View style={s.metaRow}>
              <Ionicons name="person-outline" size={13} color={colors.textMuted} />
              <Text style={s.metaText}>{med.prescribedBy}</Text>
            </View>
          ) : null}
          {med.pharmacy ? (
            <View style={s.metaRow}>
              <Ionicons name="storefront-outline" size={13} color={colors.textMuted} />
              <Text style={s.metaText}>{med.pharmacy}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.medActions}>
          <Button
            title={t('health.screens.medicationManager.logDose')}
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
      <View style={s.tabContent}>
        <Card style={s.scheduleInfoCard} variant="elevated">
          <View style={s.scheduleInfoRow}>
            <Ionicons name="calendar-outline" size={20} color={'#AD1457'} />
            <Text style={s.scheduleInfoText}>
              {t('health.screens.medicationManager.todaysSchedule', { date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) })}
            </Text>
          </View>
        </Card>

        {(['Morning', 'Afternoon', 'Evening'] as const).map((slot) => {
          const slotMeds = slots[slot];
          const slotLabel = slot === 'Morning'
            ? t('health.screens.medicationManager.slotMorning')
            : slot === 'Afternoon'
              ? t('health.screens.medicationManager.slotAfternoon')
              : t('health.screens.medicationManager.slotEvening');
          return (
            <View key={slot} style={s.slotSection}>
              <View style={s.slotHeader}>
                <Ionicons
                  name={slot === 'Morning' ? 'sunny-outline' : slot === 'Afternoon' ? 'partly-sunny-outline' : 'moon-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={s.slotTitle}>{slotLabel}</Text>
                <Badge label={`${slotMeds.length}`} variant="neutral" size="sm" />
              </View>
              {slotMeds.length === 0 ? (
                <Text style={s.slotEmpty}>{t('health.screens.medicationManager.noMedicationsSlot')}</Text>
              ) : (
                slotMeds.map((med) => {
                  const member = members.find((m) => m.id === med.memberId);
                  const todayLogs = logs.filter((l) => {
                    const logDate = new Date(l.takenAt).toDateString();
                    return l.medicationId === med.id && logDate === new Date().toDateString();
                  });
                  const taken = todayLogs.some((l) => l.doseTaken);
                  return (
                    <Card key={med.id} style={(taken ? { ...s.scheduleCard, ...s.scheduleCardDone } : s.scheduleCard) as ViewStyle} variant="default">
                      <View style={s.scheduleRow}>
                        <View style={[s.scheduleColorDot, { backgroundColor: med.color }]} />
                        <View style={s.scheduleInfo}>
                          <Text style={[s.scheduleMedName, taken && s.doneText]}>{med.name}</Text>
                          <Text style={s.scheduleDosage}>{med.dosage}</Text>
                          {member ? <Text style={s.scheduleMember}>{t('health.screens.medicationManager.forMember', { name: member.name })}</Text> : null}
                        </View>
                        {taken ? (
                          <View style={s.takenBadge}>
                            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                          </View>
                        ) : (
                          <Pressable onPress={() => handleLogDose(med)} style={s.logBtn}>
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
        <View style={s.logGroup} key={title}>
          <Text style={s.logGroupTitle}>{title}</Text>
          {groupLogs.map((log) => {
            const med = medications.find((m) => m.id === log.medicationId);
            const member = members.find((m) => m.id === log.memberId);
            return (
              <Card key={log.id} style={s.logCard} variant="default">
                <View style={s.logRow}>
                  <View style={[s.logDot, { backgroundColor: med?.color ?? colors.textMuted }]} />
                  <View style={s.logInfo}>
                    <Text style={s.logMedName}>{med?.name ?? t('health.screens.medicationManager.unknownMember')}</Text>
                    <Text style={s.logMeta}>{med?.dosage} — {member?.name ?? t('health.screens.medicationManager.unknownMember')}</Text>
                    <Text style={s.logTime}>{formatTime(log.takenAt)}</Text>
                  </View>
                  <View style={[s.logStatus, { backgroundColor: log.doseTaken ? colors.success + '20' : colors.danger + '20' }]}>
                    <Ionicons name={log.doseTaken ? 'checkmark-circle' : 'close-circle'} size={16} color={log.doseTaken ? colors.success : colors.danger} />
                    <Text style={[s.logStatusText, { color: log.doseTaken ? colors.success : colors.danger }]}>
                      {log.doseTaken ? t('health.screens.medicationManager.statusTaken') : t('health.screens.medicationManager.statusSkipped')}
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
      <View style={s.tabContent}>
        {logs.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="time-outline" size={64} color={colors.textMuted} />
            <Text style={s.emptyTitle}>{t('health.screens.medicationManager.emptyHistoryTitle')}</Text>
            <Text style={s.emptyDesc}>{t('health.screens.medicationManager.emptyHistoryDesc')}</Text>
          </View>
        )}
        {renderLogGroup(t('health.screens.medicationManager.groupToday'), todayLogs)}
        {renderLogGroup(t('health.screens.medicationManager.groupYesterday'), yesterdayLogs)}
        {renderLogGroup(t('health.screens.medicationManager.groupThisWeek'), weekLogs)}
      </View>
    );
  };

  return (
    <View style={s.container}>

      <View style={s.tabs}>
        {(['active', 'schedule', 'history'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[s.tab, activeTab === tab && s.tabActive]}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'active' ? t('health.screens.medicationManager.tabActive') : tab === 'schedule' ? t('health.screens.medicationManager.tabSchedule') : t('health.screens.medicationManager.tabHistory')}
            </Text>
          </Pressable>
        ))}
      </View>

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
        <ScrollView
          onScroll={onScroll}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: contentPaddingTop }}>
        {activeTab === 'active' && renderActiveTab()}
        {activeTab === 'schedule' && renderScheduleTab()}
        {activeTab === 'history' && renderHistoryTab()}
        </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add Medication Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>{t('health.screens.medicationManager.addMedicationTitle')}</Text>

          <Text style={s.modalLabel}>{t('health.screens.medicationManager.familyMemberLabel')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {members.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setFormMemberId(m.id)}
                style={[s.memberChip, formMemberId === m.id && s.memberChipActive]}
              >
                <View style={[s.memberChipAvatar, { backgroundColor: m.avatarColor }]}>
                  <Text style={s.memberChipAvatarText}>{m.name.charAt(0)}</Text>
                </View>
                <Text style={s.memberChipName}>{m.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={s.modalLabel}>{t('health.screens.medicationManager.medicationNameLabel')}</Text>
          <TextInput style={s.modalInput} placeholder={t('health.screens.medicationManager.medicationNamePlaceholder')} value={formName} onChangeText={setFormName} placeholderTextColor={colors.textMuted} autoFocus />

          <Text style={s.modalLabel}>{t('health.screens.medicationManager.dosageLabel')}</Text>
          <TextInput style={s.modalInput} placeholder={t('health.screens.medicationManager.dosagePlaceholder')} value={formDosage} onChangeText={setFormDosage} placeholderTextColor={colors.textMuted} />

          <Text style={s.modalLabel}>{t('health.screens.medicationManager.frequencyLabel')}</Text>
          <View style={s.freqGrid}>
            {FREQ_OPTIONS.map((f) => (
              <Pressable
                key={f.value}
                onPress={() => setFormFrequency(f.value)}
                style={[s.freqChip, formFrequency === f.value && s.freqChipActive]}
              >
                <Text style={[s.freqChipLabel, formFrequency === f.value && s.freqChipLabelActive]}>{t(`health.screens.medicationManager.${f.labelKey}`)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.modalLabel}>{t('health.screens.medicationManager.instructionsLabel')}</Text>
          <TextInput style={[s.modalInput, s.modalTextarea]} placeholder={t('health.screens.medicationManager.instructionsPlaceholder')} value={formInstructions} onChangeText={setFormInstructions} multiline numberOfLines={2} placeholderTextColor={colors.textMuted} />

          <Text style={s.modalLabel}>{t('health.screens.medicationManager.doctorLabel')}</Text>
          <TextInput style={s.modalInput} placeholder={t('health.screens.medicationManager.doctorPlaceholder')} value={formDoctor} onChangeText={setFormDoctor} placeholderTextColor={colors.textMuted} />

          <Text style={s.modalLabel}>{t('health.screens.medicationManager.pharmacyLabel')}</Text>
          <TextInput style={s.modalInput} placeholder={t('health.screens.medicationManager.pharmacyPlaceholder')} value={formPharmacy} onChangeText={setFormPharmacy} placeholderTextColor={colors.textMuted} />

          <Text style={s.modalLabel}>{t('health.screens.medicationManager.refillDateLabel')}</Text>
          <TextInput style={s.modalInput} placeholder={t('health.screens.medicationManager.refillDatePlaceholder')} value={formRefillDate} onChangeText={setFormRefillDate} placeholderTextColor={colors.textMuted} />

          <Text style={s.modalLabel}>{t('health.screens.medicationManager.pillsRemainingLabel')}</Text>
          <TextInput style={s.modalInput} placeholder={t('health.screens.medicationManager.pillsRemainingPlaceholder')} value={formPills} onChangeText={setFormPills} keyboardType="number-pad" placeholderTextColor={colors.textMuted} />

          <Text style={s.modalLabel}>{t('health.screens.medicationManager.colorLabel')}</Text>
          <View style={s.colorRow}>
            {COLOR_PRESETS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setFormColor(c)}
                style={[s.colorDot, { backgroundColor: c }, formColor === c && s.colorDotActive]}
              />
            ))}
          </View>

          <Button title={t('health.screens.medicationManager.addMedicationButton')} onPress={handleAdd} fullWidth size="lg" disabled={!formName.trim() || !formDosage.trim() || !formMemberId} style={{ marginTop: 16 }} />
          <Button title={t('health.screens.medicationManager.cancelButton')} onPress={() => { resetForm(); setShowAddModal(false); }} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      fontSize: 18,
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
      fontSize: 18,
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
}
