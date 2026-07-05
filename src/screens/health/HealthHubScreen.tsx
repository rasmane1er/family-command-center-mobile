import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Button } from '../../components/common/Button';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useHealthStore } from '../../store/useHealthStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const METRIC_CONFIG = {
  steps: { icon: 'walk', color: '#2980B9', labelKey: 'metricSteps', goal: 10000, unit: 'steps' },
  sleep: { icon: 'moon', color: '#8E44AD', labelKey: 'metricSleep', goal: 8, unit: 'hrs' },
  water: { icon: 'water', color: '#16A085', labelKey: 'metricWater', goal: 8, unit: 'glasses' },
  weight: { icon: 'scale', color: '#E67E22', labelKey: 'metricWeight', goal: 150, unit: 'lbs' },
  mood: { icon: 'happy', color: '#F5A623', labelKey: 'metricMood', goal: 10, unit: '/10' },
  exercise: { icon: 'fitness', color: '#27AE60', labelKey: 'metricExercise', goal: 30, unit: 'min' },
  bp: { icon: 'heart', color: '#E74C3C', labelKey: 'metricBloodPressure', goal: 120, unit: 'mmHg' },
  glucose: { icon: 'medical', color: '#D35400', labelKey: 'metricGlucose', goal: 100, unit: 'mg/dL' },
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function HealthHubScreen({ navigation: navProp }: any) {
  const { colors } = useTheme();
  const navHook = useNavigation<any>();
  const navigation = navProp ?? navHook;
  const { t } = useTranslation('health');
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'appointments'>('overview');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const { records, goals, appointments, addAppointment, seedDemoData, hasSeeded } = useHealthStore();
  const members = useFamilyStore((s) => s.members);

  useEffect(() => {
    if (!hasSeeded) seedDemoData();
  }, [hasSeeded, seedDemoData]);

  const activeMemberId = selectedMember ?? members[0]?.id ?? '';
  const activeMember = members.find((m) => m.id === activeMemberId);
  const memberRecords = records.filter((r) => r.memberId === activeMemberId);
  const memberGoals = goals.filter((g) => g.memberId === activeMemberId);

  const getLatest = (metric: string) =>
    memberRecords.filter((r) => r.metric === metric).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  // Real score: for each member's goal, how close their latest recorded
  // value is to that goal's target, averaged across every member/metric
  // pair that has both a goal and at least one recorded value. Neutral
  // baseline (50) when there's no data yet, rather than a fabricated
  // number — matches the convention already used in useFinancialHealth.ts
  // and useRelationshipHealth.ts for "not enough data" states.
  const familyHealthScore = useMemo(() => {
    const progressRatios: number[] = [];
    members.forEach((m) => {
      goals.filter((g) => g.memberId === m.id).forEach((goal) => {
        const latest = records
          .filter((r) => r.memberId === m.id && r.metric === goal.metric)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        if (latest && goal.target > 0) {
          progressRatios.push(Math.min(1, latest.value / goal.target));
        }
      });
    });
    if (progressRatios.length === 0) return 50;
    return Math.round((progressRatios.reduce((a, b) => a + b, 0) / progressRatios.length) * 100);
  }, [members, goals, records]);

  const [showAptModal, setShowAptModal] = useState(false);
  const [newAptMemberId, setNewAptMemberId] = useState<string>('');
  const [newAptType, setNewAptType] = useState('');
  const [newAptDate, setNewAptDate] = useState('');
  const [newAptDoctor, setNewAptDoctor] = useState('');

  const handleAddAppointment = () => {
    if (!newAptType.trim() || !newAptMemberId) return;
    const parsedDate = new Date(newAptDate.trim());
    addAppointment({
      memberId: newAptMemberId,
      type: newAptType.trim(),
      date: isNaN(parsedDate.getTime()) ? newAptDate.trim() : parsedDate.toISOString(),
      doctor: newAptDoctor.trim() || undefined,
      icon: 'medical',
      color: '#2980B9',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewAptMemberId(''); setNewAptType(''); setNewAptDate(''); setNewAptDoctor('');
    setShowAptModal(false);
  };

  // Real tips, computed from actual records/goals/appointments — replaces
  // a previous hardcoded HEALTH_TIPS array that named invented members
  // ("Marcus: Schedule your annual physical...") regardless of who's
  // actually in this family.
  const healthTips = useMemo(() => {
    const tips: { tip: string; icon: string; color: string; priority: 'high' | 'medium' | 'positive' }[] = [];
    const now = Date.now();

    members.forEach((m) => {
      const upcoming = appointments
        .filter((a) => a.memberId === m.id)
        .map((a) => ({ ...a, ts: Date.parse(a.date) }))
        .filter((a) => !isNaN(a.ts) && a.ts > now)
        .sort((a, b) => a.ts - b.ts)[0];
      if (upcoming) {
        const daysAway = Math.max(1, Math.ceil((upcoming.ts - now) / DAY_MS));
        if (daysAway <= 45) {
          tips.push({
            tip: `${m.name}'s ${upcoming.type} is in ${daysAway} day${daysAway === 1 ? '' : 's'} — schedule soon`,
            icon: 'calendar',
            color: '#2980B9',
            priority: daysAway <= 7 ? 'high' : 'medium',
          });
        }
      }

      const recentSleep = records.filter((r) => r.memberId === m.id && r.metric === 'sleep' && now - Date.parse(r.date) <= 7 * DAY_MS);
      if (recentSleep.length > 0) {
        const avg = recentSleep.reduce((sum, r) => sum + r.value, 0) / recentSleep.length;
        if (avg >= 8) {
          tips.push({ tip: `${m.name} is averaging ${avg.toFixed(1)} hrs sleep this week — great job!`, icon: 'moon', color: '#8E44AD', priority: 'positive' });
        }
      }

      const stepGoal = goals.find((g) => g.memberId === m.id && g.metric === 'steps');
      if (stepGoal) {
        const daysHitGoal = records.filter((r) => r.memberId === m.id && r.metric === 'steps' && now - Date.parse(r.date) <= 7 * DAY_MS && r.value >= stepGoal.target).length;
        if (daysHitGoal >= 3) {
          tips.push({ tip: `${m.name} hit their ${stepGoal.target.toLocaleString()} step goal ${daysHitGoal} days this week!`, icon: 'trophy', color: '#F5A623', priority: 'positive' });
        }
      }
    });

    return tips.slice(0, 5);
  }, [members, records, goals, appointments]);

  const s = makeStyles(colors);

  const screenHeader = (
    <PremiumHeader
      title={t('health.screens.healthHub.headerTitle')}
      onBack={() => navigation.goBack()}
      colors={['#1A3C34', '#27AE60']}
      rightAction={
        <Pressable onPress={() => setShowAptModal(true)} style={s.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      }
    >
      <View style={s.scoreRow}>
        <View style={s.scoreBlock}>
          <Text style={s.scoreValue}>{familyHealthScore}</Text>
          <Text style={s.scoreLabel}>{t('health.screens.healthHub.scoreLabel')}</Text>
        </View>
        <View style={s.memberScores}>
          {members.slice(0, 4).map((m) => {
            const memberSteps = records.filter((r) => r.memberId === m.id && r.metric === 'steps').slice(-1)[0];
            const stepGoal = goals.find((g) => g.memberId === m.id && g.metric === 'steps');
            const progress = memberSteps && stepGoal ? Math.min(1, memberSteps.value / stepGoal.target) : 0.5;
            return (
              <Pressable key={m.id} onPress={() => setSelectedMember(m.id)} style={s.memberMiniCard}>
                <View style={[s.memberDot, { backgroundColor: m.avatarColor }]} />
                <Text style={s.memberMiniName}>{m.name.split(' ')[0]}</Text>
                <ProgressBar progress={progress} color={m.avatarColor} height={4} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </PremiumHeader>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#1A3C34', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={s.addBtn}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, marginLeft: 8 }}>{t('health.screens.healthHub.headerTitle')}</Text>
      <Pressable onPress={() => setShowAptModal(true)} style={s.addBtn}>
        <Ionicons name="add" size={22} color="#fff" />
      </Pressable>
    </View>
  );

  return (
    <View style={s.container}>

      <View style={s.tabs}>
        {(['overview', 'metrics', 'appointments'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[s.tab, activeTab === tab && s.tabActive]}>
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'overview' ? t('health.screens.healthHub.tabOverview') : tab === 'metrics' ? t('health.screens.healthHub.tabMetrics') : t('health.screens.healthHub.tabAppointments')}
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
          contentContainerStyle={[s.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}>

        {activeTab === 'overview' && (
          <>
            <Text style={s.sectionTitle}>{t('health.screens.healthHub.sectionHealthTips')}</Text>
            {healthTips.length === 0 && (
              <Text style={s.emptyTipsText}>
                {t('health.screens.healthHub.emptyTips')}
              </Text>
            )}
            {healthTips.map((tip, i) => (
              <Card key={i} style={s.tipCard} variant="elevated">
                <View style={s.tipRow}>
                  <View style={[s.tipIcon, { backgroundColor: tip.color + '15' }]}>
                    <Ionicons name={tip.icon as any} size={18} color={tip.color} />
                  </View>
                  <Text style={s.tipText}>{tip.tip}</Text>
                  <View style={[s.priorityDot, { backgroundColor: tip.priority === 'high' ? colors.danger : tip.priority === 'positive' ? colors.success : colors.warning }]} />
                </View>
              </Card>
            ))}

            <Text style={s.sectionTitle}>{t('health.screens.healthHub.sectionHealthTools')}</Text>
            <View style={s.healthToolsRow}>
              {[
                { key: 'MedicationManager', icon: 'medical', label: t('health.screens.healthHub.toolMedications'), color: '#AD1457', bg: '#FCE4EC' },
                { key: 'SleepTracker', icon: 'moon', label: t('health.screens.healthHub.toolSleep'), color: '#4527A0', bg: '#EDE7F6' },
                { key: 'WorkoutTracker', icon: 'flame', label: t('health.screens.healthHub.toolWorkouts'), color: '#BF360C', bg: '#FBE9E7' },
              ].map((tool) => (
                <Pressable key={tool.key} onPress={() => navigation.navigate(tool.key)} style={[s.healthToolCard, { backgroundColor: tool.bg }]}>
                  <Ionicons name={tool.icon as any} size={24} color={tool.color} />
                  <Text style={[s.healthToolLabel, { color: tool.color }]}>{tool.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.sectionTitle}>{t('health.screens.healthHub.sectionFamilyMedicalInfo')}</Text>
            {members.map((member) => (
              member.medicalInfo && (
                <Card key={member.id} style={s.memberCard} variant="elevated">
                  <View style={s.memberHeader}>
                    <View style={[s.avatar, { backgroundColor: member.avatarColor + '20' }]}>
                      <Text style={[s.avatarText, { color: member.avatarColor }]}>{member.name.charAt(0)}</Text>
                    </View>
                    <Text style={s.memberName}>{member.name}</Text>
                    {member.medicalInfo.bloodType && (
                      <View style={s.bloodType}>
                        <Text style={s.bloodTypeText}>{member.medicalInfo.bloodType}</Text>
                      </View>
                    )}
                  </View>
                  {member.medicalInfo.allergies && member.medicalInfo.allergies.length > 0 && (
                    <View style={s.infoRow}>
                      <Ionicons name="warning" size={13} color={colors.danger} />
                      <Text style={s.infoLabel}>{t('health.screens.healthHub.allergiesLabel')}</Text>
                      <Text style={s.infoVal}>{member.medicalInfo.allergies.join(', ')}</Text>
                    </View>
                  )}
                  {member.medicalInfo.medications && member.medicalInfo.medications.length > 0 && (
                    <View style={s.infoRow}>
                      <Ionicons name="medical" size={13} color={colors.primary} />
                      <Text style={s.infoLabel}>{t('health.screens.healthHub.medsLabel')}</Text>
                      <Text style={s.infoVal}>{member.medicalInfo.medications.map((m) => m.name).join(', ')}</Text>
                    </View>
                  )}
                  {member.medicalInfo.doctorName && (
                    <View style={s.infoRow}>
                      <Ionicons name="person" size={13} color={colors.textMuted} />
                      <Text style={s.infoLabel}>{t('health.screens.healthHub.doctorLabel')}</Text>
                      <Text style={s.infoVal}>{member.medicalInfo.doctorName}</Text>
                    </View>
                  )}
                </Card>
              )
            ))}
          </>
        )}

        {activeTab === 'metrics' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.memberScroll}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setSelectedMember(m.id)}
                  style={[s.memberTab, activeMemberId === m.id && { borderBottomColor: m.avatarColor, borderBottomWidth: 2.5 }]}
                >
                  <Text style={[s.memberTabText, activeMemberId === m.id && { color: m.avatarColor }]}>{m.name.split(' ')[0]}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {(['steps', 'sleep', 'weight', 'bp'] as const).map((metric) => {
              const latest = getLatest(metric);
              const goal = memberGoals.find((g) => g.metric === metric);
              const cfg = METRIC_CONFIG[metric];
              const progress = latest && goal ? Math.min(1, latest.value / goal.target) : latest ? Math.min(1, latest.value / cfg.goal) : 0;
              return (
                <Card key={metric} style={s.metricCard} variant="elevated">
                  <View style={s.metricHeader}>
                    <View style={[s.metricIcon, { backgroundColor: cfg.color + '15' }]}>
                      <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={s.metricLabel}>{t(`health.screens.healthHub.${cfg.labelKey}`)}</Text>
                      <Text style={s.metricValue}>
                        {latest ? `${latest.value.toLocaleString()} ${latest.unit}` : t('health.screens.healthHub.noData')}
                        {metric === 'bp' && latest?.notes ? ` (${latest.notes})` : ''}
                      </Text>
                    </View>
                    {goal && (
                      <Text style={s.metricGoal}>{t('health.screens.healthHub.goalLabel', { target: goal.target, unit: cfg.unit })}</Text>
                    )}
                  </View>
                  {(latest || goal) && (
                    <ProgressBar progress={progress} color={cfg.color} height={6} />
                  )}
                </Card>
              );
            })}
          </>
        )}

        {activeTab === 'appointments' && appointments.length === 0 && (
          <Text style={s.emptyTipsText}>{t('health.screens.healthHub.emptyAppointments')}</Text>
        )}

        {activeTab === 'appointments' && appointments
          .slice()
          .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
          .map((apt) => {
            const memberName = members.find((m) => m.id === apt.memberId)?.name ?? t('health.screens.healthHub.fallbackFamilyName');
            const parsed = new Date(apt.date);
            const dateLabel = isNaN(parsed.getTime()) ? apt.date : parsed.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
            return (
              <Card key={apt.id} style={s.aptCard} variant="elevated">
                <View style={s.aptRow}>
                  <View style={[s.aptIcon, { backgroundColor: apt.color + '15' }]}>
                    <Ionicons name={apt.icon as any} size={22} color={apt.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.aptType}>{apt.type}</Text>
                    <Text style={s.aptMember}>{memberName}{apt.doctor ? ` • ${apt.doctor}` : ''}</Text>
                    <Text style={s.aptDate}>{dateLabel}</Text>
                  </View>
                  <Pressable
                    onPress={() => Alert.alert(apt.type, `${memberName}\n${apt.doctor ?? ''}\n${dateLabel}`, [
                      { text: t('health.screens.healthHub.dismiss'), style: 'cancel' },
                      { text: t('health.screens.healthHub.addToCalendar'), onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) },
                    ])}
                    style={[s.aptBtn, { backgroundColor: apt.color }]}
                  >
                    <Text style={s.aptBtnText}>{t('health.screens.healthHub.detailsButton')}</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </ScrollView>
        )}
      </CollapsibleHeader>

      <Modal visible={showAptModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAptModal(false)}>
        <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>{t('health.screens.healthHub.addAppointmentTitle')}</Text>

          <Text style={s.modalLabel}>{t('health.screens.healthHub.familyMemberLabel')}</Text>
          <View style={s.memberChipRow}>
            {members.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setNewAptMemberId(m.id)}
                style={[s.memberChip, newAptMemberId === m.id && { backgroundColor: m.avatarColor + '20', borderColor: m.avatarColor }]}
              >
                <Text style={[s.memberChipText, newAptMemberId === m.id && { color: m.avatarColor, fontWeight: '800' }]}>{m.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.modalLabel}>{t('health.screens.healthHub.appointmentTypeLabel')}</Text>
          <TextInput style={s.modalInput} placeholder={t('health.screens.healthHub.appointmentTypePlaceholder')} value={newAptType} onChangeText={setNewAptType} placeholderTextColor={colors.textMuted} />

          <Text style={s.modalLabel}>{t('health.screens.healthHub.doctorProviderLabel')}</Text>
          <TextInput style={s.modalInput} placeholder={t('health.screens.healthHub.doctorPlaceholder')} value={newAptDoctor} onChangeText={setNewAptDoctor} placeholderTextColor={colors.textMuted} />

          <Text style={s.modalLabel}>{t('health.screens.healthHub.dateLabel')}</Text>
          <TextInput style={[s.modalInput, { marginBottom: 24 }]} placeholder={t('health.screens.healthHub.datePlaceholder')} value={newAptDate} onChangeText={setNewAptDate} placeholderTextColor={colors.textMuted} />

          <Button title={t('health.screens.healthHub.addAppointmentButton')} onPress={handleAddAppointment} fullWidth size="lg" disabled={!newAptType.trim() || !newAptMemberId} />
          <Button title={t('health.screens.healthHub.cancelButton')} onPress={() => setShowAptModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    scoreRow: { flexDirection: 'row', gap: 16 },
    scoreBlock: { alignItems: 'center', justifyContent: 'center', width: 90 },
    scoreValue: { fontSize: 48, fontWeight: '900', color: '#fff', lineHeight: 52 },
    scoreLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 2 },
    memberScores: { flex: 1, gap: 8 },
    memberMiniCard: { gap: 4 },
    memberDot: { width: 8, height: 8, borderRadius: 4 },
    memberMiniName: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
    tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#27AE60' },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    tabTextActive: { color: '#27AE60' },
    content: { padding: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
    tipCard: { marginBottom: 8, borderRadius: 12 },
    tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tipIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    tipText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
    priorityDot: { width: 8, height: 8, borderRadius: 4 },
    emptyTipsText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 20, lineHeight: 19 },
    memberChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    memberChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
    memberChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    memberCard: { marginBottom: 10, borderRadius: 14 },
    memberHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 15, fontWeight: '800' },
    memberName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    bloodType: { backgroundColor: colors.danger + '15', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
    bloodTypeText: { fontSize: 12, fontWeight: '700', color: colors.danger },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    infoLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    infoVal: { flex: 1, fontSize: 12, color: colors.text },
    memberScroll: { marginBottom: 16 },
    memberTab: { paddingVertical: 8, paddingHorizontal: 14, marginRight: 4 },
    memberTabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    metricCard: { marginBottom: 10, borderRadius: 14 },
    metricHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    metricIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    metricLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    metricValue: { fontSize: 20, fontWeight: '800', color: colors.text },
    metricGoal: { fontSize: 11, color: colors.textMuted },
    aptCard: { marginBottom: 10, borderRadius: 14 },
    aptRow: { flexDirection: 'row', alignItems: 'center' },
    aptIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    aptType: { fontSize: 14, fontWeight: '700', color: colors.text },
    aptMember: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    aptDate: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 2 },
    aptBtn: { borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
    aptBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    healthToolsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    healthToolCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
    healthToolLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
    modal: { flex: 1, padding: 24, backgroundColor: colors.background },
    modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
    modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  });
}
