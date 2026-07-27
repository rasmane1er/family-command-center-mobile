import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Button } from '../../components/common/Button';
import { useHealthStore } from '../../store/useHealthStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const METRIC_CONFIG = {
  steps: { icon: 'walk', color: '#2980B9', label: 'Steps', goal: 10000, unit: 'steps' },
  sleep: { icon: 'moon', color: '#8E44AD', label: 'Sleep', goal: 8, unit: 'hrs' },
  water: { icon: 'water', color: '#16A085', label: 'Water', goal: 8, unit: 'glasses' },
  weight: { icon: 'scale', color: '#E67E22', label: 'Weight', goal: 150, unit: 'lbs' },
  mood: { icon: 'happy', color: '#F5A623', label: 'Mood', goal: 10, unit: '/10' },
  exercise: { icon: 'fitness', color: '#27AE60', label: 'Exercise', goal: 30, unit: 'min' },
  bp: { icon: 'heart', color: '#E74C3C', label: 'Blood Pressure', goal: 120, unit: 'mmHg' },
  glucose: { icon: 'medical', color: '#D35400', label: 'Glucose', goal: 100, unit: 'mg/dL' },
} as const;

const HEALTH_TIPS = [
  { tip: 'Marcus: Schedule your annual physical — last one was 14 months ago', icon: 'medical', color: '#E74C3C', priority: 'high' },
  { tip: "Aiden is averaging 8.5 hrs sleep — excellent for his age group!", icon: 'moon', color: '#8E44AD', priority: 'positive' },
  { tip: 'Sarah hit her 12,000 step goal 4 days this week!', icon: 'trophy', color: '#F5A623', priority: 'positive' },
  { tip: "Lily's next pediatric checkup is in 6 weeks — schedule soon", icon: 'calendar', color: '#2980B9', priority: 'medium' },
];

export function HealthHubScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'appointments'>('overview');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const { records, goals, seedDemoData } = useHealthStore();
  const members = useFamilyStore((s) => s.members);

  if (records.length === 0) seedDemoData();

  const activeMemberId = selectedMember ?? members[0]?.id ?? '';
  const activeMember = members.find((m) => m.id === activeMemberId);
  const memberRecords = records.filter((r) => r.memberId === activeMemberId);
  const memberGoals = goals.filter((g) => g.memberId === activeMemberId);

  const getLatest = (metric: string) =>
    memberRecords.filter((r) => r.metric === metric).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const FAMILY_HEALTH_SCORE = 78;

  const [showAptModal, setShowAptModal] = useState(false);
  const [newAptMember, setNewAptMember] = useState('');
  const [newAptType, setNewAptType] = useState('');
  const [newAptDate, setNewAptDate] = useState('');
  const [newAptDoctor, setNewAptDoctor] = useState('');
  const [appointments, setAppointments] = useState([
    { id: '1', member: 'Lily', type: 'Pediatric Checkup', date: 'July 12, 2026', doctor: 'Dr. Martinez', icon: 'medical', color: '#E91E63' },
    { id: '2', member: 'Marcus', type: 'Annual Physical', date: 'July 28, 2026', doctor: 'Dr. Chen', icon: 'body', color: '#2980B9' },
    { id: '3', member: 'Sarah', type: 'Dental Cleaning', date: 'August 3, 2026', doctor: 'Dr. Johnson', icon: 'happy', color: '#16A085' },
    { id: '4', member: 'Aiden', type: 'Optometry', date: 'August 15, 2026', doctor: 'Dr. Park', icon: 'eye', color: '#8E44AD' },
  ]);

  const handleAddAppointment = () => {
    if (!newAptType.trim() || !newAptMember.trim()) return;
    setAppointments([...appointments, {
      id: Math.random().toString(36).substring(2, 11),
      member: newAptMember.trim(),
      type: newAptType.trim(),
      date: newAptDate.trim() || 'TBD',
      doctor: newAptDoctor.trim() || 'TBD',
      icon: 'medical',
      color: '#2980B9',
    }]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewAptMember(''); setNewAptType(''); setNewAptDate(''); setNewAptDoctor('');
    setShowAptModal(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1A3C34', '#27AE60']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Family Health Hub</Text>
          <Pressable onPress={() => setShowAptModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreValue}>{FAMILY_HEALTH_SCORE}</Text>
            <Text style={styles.scoreLabel}>Family Health Score</Text>
          </View>
          <View style={styles.memberScores}>
            {members.slice(0, 4).map((m) => {
              const memberSteps = records.filter((r) => r.memberId === m.id && r.metric === 'steps').slice(-1)[0];
              const stepGoal = goals.find((g) => g.memberId === m.id && g.metric === 'steps');
              const progress = memberSteps && stepGoal ? Math.min(1, memberSteps.value / stepGoal.target) : 0.5;
              return (
                <Pressable key={m.id} onPress={() => setSelectedMember(m.id)} style={styles.memberMiniCard}>
                  <View style={[styles.memberDot, { backgroundColor: m.avatarColor }]} />
                  <Text style={styles.memberMiniName}>{m.name.split(' ')[0]}</Text>
                  <ProgressBar progress={progress} color={m.avatarColor} height={4} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['overview', 'metrics', 'appointments'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? 'Overview' : tab === 'metrics' ? 'Metrics' : 'Appointments'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {activeTab === 'overview' && (
          <>
            <Text style={styles.sectionTitle}>AI Health Tips</Text>
            {HEALTH_TIPS.map((tip, i) => (
              <Card key={i} style={styles.tipCard} variant="elevated">
                <View style={styles.tipRow}>
                  <View style={[styles.tipIcon, { backgroundColor: tip.color + '15' }]}>
                    <Ionicons name={tip.icon as any} size={18} color={tip.color} />
                  </View>
                  <Text style={styles.tipText}>{tip.tip}</Text>
                  <View style={[styles.priorityDot, { backgroundColor: tip.priority === 'high' ? colors.danger : tip.priority === 'positive' ? colors.success : colors.warning }]} />
                </View>
              </Card>
            ))}

            <Text style={styles.sectionTitle}>Health Tools</Text>
            <View style={styles.healthToolsRow}>
              {[
                { key: 'MedicationManager', icon: 'medical', label: 'Medications', color: '#AD1457', bg: '#FCE4EC' },
                { key: 'SleepTracker', icon: 'moon', label: 'Sleep', color: '#4527A0', bg: '#EDE7F6' },
                { key: 'WorkoutTracker', icon: 'flame', label: 'Workouts', color: '#BF360C', bg: '#FBE9E7' },
                { key: 'NutritionTracker', icon: 'nutrition', label: 'Nutrition', color: '#1B5E20', bg: '#E8F5E9' },
                { key: 'MedicalRecords', icon: 'folder-open', label: 'Records', color: '#1A237E', bg: '#E8EAF6' },
              ].map((tool) => (
                <Pressable key={tool.key} onPress={() => navigation.navigate(tool.key)} style={[styles.healthToolCard, { backgroundColor: tool.bg }]}>
                  <Ionicons name={tool.icon as any} size={24} color={tool.color} />
                  <Text style={[styles.healthToolLabel, { color: tool.color }]}>{tool.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Family Medical Info</Text>
            {members.map((member) => (
              member.medicalInfo && (
                <Card key={member.id} style={styles.memberCard} variant="elevated">
                  <View style={styles.memberHeader}>
                    <View style={[styles.avatar, { backgroundColor: member.avatarColor + '20' }]}>
                      <Text style={[styles.avatarText, { color: member.avatarColor }]}>{member.name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.memberName}>{member.name}</Text>
                    {member.medicalInfo.bloodType && (
                      <View style={styles.bloodType}>
                        <Text style={styles.bloodTypeText}>{member.medicalInfo.bloodType}</Text>
                      </View>
                    )}
                  </View>
                  {member.medicalInfo.allergies && member.medicalInfo.allergies.length > 0 && (
                    <View style={styles.infoRow}>
                      <Ionicons name="warning" size={13} color={colors.danger} />
                      <Text style={styles.infoLabel}>Allergies:</Text>
                      <Text style={styles.infoVal}>{member.medicalInfo.allergies.join(', ')}</Text>
                    </View>
                  )}
                  {member.medicalInfo.medications && member.medicalInfo.medications.length > 0 && (
                    <View style={styles.infoRow}>
                      <Ionicons name="medical" size={13} color={colors.primary} />
                      <Text style={styles.infoLabel}>Meds:</Text>
                      <Text style={styles.infoVal}>{member.medicalInfo.medications.map((m) => m.name).join(', ')}</Text>
                    </View>
                  )}
                  {member.medicalInfo.doctorName && (
                    <View style={styles.infoRow}>
                      <Ionicons name="person" size={13} color={colors.textMuted} />
                      <Text style={styles.infoLabel}>Doctor:</Text>
                      <Text style={styles.infoVal}>{member.medicalInfo.doctorName}</Text>
                    </View>
                  )}
                </Card>
              )
            ))}
          </>
        )}

        {activeTab === 'metrics' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setSelectedMember(m.id)}
                  style={[styles.memberTab, activeMemberId === m.id && { borderBottomColor: m.avatarColor, borderBottomWidth: 2.5 }]}
                >
                  <Text style={[styles.memberTabText, activeMemberId === m.id && { color: m.avatarColor }]}>{m.name.split(' ')[0]}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {(['steps', 'sleep', 'weight', 'bp'] as const).map((metric) => {
              const latest = getLatest(metric);
              const goal = memberGoals.find((g) => g.metric === metric);
              const cfg = METRIC_CONFIG[metric];
              const progress = latest && goal ? Math.min(1, latest.value / goal.target) : latest ? Math.min(1, latest.value / cfg.goal) : 0;
              return (
                <Card key={metric} style={styles.metricCard} variant="elevated">
                  <View style={styles.metricHeader}>
                    <View style={[styles.metricIcon, { backgroundColor: cfg.color + '15' }]}>
                      <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.metricLabel}>{cfg.label}</Text>
                      <Text style={styles.metricValue}>
                        {latest ? `${latest.value.toLocaleString()} ${latest.unit}` : 'No data'}
                        {metric === 'bp' && latest?.notes ? ` (${latest.notes})` : ''}
                      </Text>
                    </View>
                    {goal && (
                      <Text style={styles.metricGoal}>Goal: {goal.target} {cfg.unit}</Text>
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

        {activeTab === 'appointments' && appointments.map((apt) => (
          <Card key={apt.id} style={styles.aptCard} variant="elevated">
            <View style={styles.aptRow}>
              <View style={[styles.aptIcon, { backgroundColor: apt.color + '15' }]}>
                <Ionicons name={apt.icon as any} size={22} color={apt.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.aptType}>{apt.type}</Text>
                <Text style={styles.aptMember}>{apt.member} • {apt.doctor}</Text>
                <Text style={styles.aptDate}>{apt.date}</Text>
              </View>
              <Pressable
                onPress={() => Alert.alert(apt.type, `${apt.member}\n${apt.doctor}\n${apt.date}`, [
                  { text: 'Dismiss', style: 'cancel' },
                  { text: 'Add to Calendar', onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) },
                ])}
                style={[styles.aptBtn, { backgroundColor: apt.color }]}
              >
                <Text style={styles.aptBtnText}>Details</Text>
              </Pressable>
            </View>
          </Card>
        ))}
      </ScrollView>

      <Modal visible={showAptModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAptModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Appointment</Text>

          <Text style={styles.modalLabel}>Family Member *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Sarah" value={newAptMember} onChangeText={setNewAptMember} placeholderTextColor={colors.textMuted} autoFocus />

          <Text style={styles.modalLabel}>Appointment Type *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Dental Cleaning" value={newAptType} onChangeText={setNewAptType} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Doctor / Provider</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Dr. Martinez" value={newAptDoctor} onChangeText={setNewAptDoctor} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Date</Text>
          <TextInput style={[styles.modalInput, { marginBottom: 24 }]} placeholder="e.g. July 12, 2026" value={newAptDate} onChangeText={setNewAptDate} placeholderTextColor={colors.textMuted} />

          <Button title="Add Appointment" onPress={handleAddAppointment} fullWidth size="lg" disabled={!newAptType.trim() || !newAptMember.trim()} />
          <Button title="Cancel" onPress={() => setShowAptModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
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
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
});
