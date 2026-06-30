import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { useFamilyStore } from '../../store/useFamilyStore';

const EMERGENCY_NUMBERS = [
  { label: 'Emergency', number: '911', icon: 'warning', color: '#E74C3C', bg: '#FDEDEC' },
  { label: 'Poison Control', number: '1-800-222-1222', icon: 'flask', color: '#8E44AD', bg: '#F5EEF8' },
  { label: 'Crisis Line', number: '988', icon: 'heart', color: '#E74C3C', bg: '#FDEDEC' },
  { label: 'Non-Emergency Police', number: '311', icon: 'shield', color: '#2980B9', bg: '#D6EAF8' },
];

const FIRST_AID_STEPS: { title: string; icon: string; steps: string[] }[] = [
  {
    title: 'CPR (Adult)',
    icon: 'heart',
    steps: [
      'Call 911 immediately',
      'Place heel of hand on center of chest',
      'Push hard and fast — 100-120 compressions/min',
      'Give 2 rescue breaths after 30 compressions',
      'Continue until help arrives',
    ],
  },
  {
    title: 'Choking',
    icon: 'person',
    steps: [
      'Encourage coughing if able',
      'Give 5 back blows between shoulder blades',
      'Give 5 abdominal thrusts (Heimlich)',
      'Alternate until object dislodged or unconscious',
      'Call 911 if unconscious',
    ],
  },
  {
    title: 'Severe Bleeding',
    icon: 'bandage',
    steps: [
      'Apply firm direct pressure with cloth',
      'Do not remove cloth — add more on top',
      'Elevate injured area above heart if possible',
      'Apply tourniquet if limb & severe bleeding',
      'Call 911 immediately',
    ],
  },
];

const SAFETY_CHECKLIST = [
  { label: 'Smoke detectors tested', done: true },
  { label: 'Fire extinguisher charged', done: true },
  { label: 'Family meeting point agreed', done: true },
  { label: 'Emergency kit stocked', done: false },
  { label: 'Gas shutoff valve location known', done: false },
  { label: 'Evacuation route practiced', done: false },
];

export function EmergencyScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const members = useFamilyStore((s) => s.members);

  const callNumber = (number: string) => {
    Alert.alert(
      `Call ${number}?`,
      'This will place a phone call.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', style: 'destructive', onPress: () => Linking.openURL(`tel:${number.replace(/-/g, '')}`) },
      ]
    );
  };

  const completedChecks = SAFETY_CHECKLIST.filter((c) => c.done).length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#C0392B', '#96281B']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Emergency Center</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.safetyScore}>
          <Ionicons name="shield-checkmark" size={28} color="#fff" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.safetyScoreValue}>{completedChecks}/{SAFETY_CHECKLIST.length}</Text>
            <Text style={styles.safetyScoreLabel}>Safety checks complete</Text>
          </View>
          <View style={styles.safetyRing}>
            <Text style={styles.safetyPct}>{Math.round((completedChecks / SAFETY_CHECKLIST.length) * 100)}%</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {/* Emergency Numbers */}
        <Text style={styles.sectionTitle}>Emergency Numbers</Text>
        <View style={styles.emergencyGrid}>
          {EMERGENCY_NUMBERS.map((item) => (
            <Pressable key={item.label} onPress={() => callNumber(item.number)} style={[styles.emergencyCard, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon as any} size={26} color={item.color} />
              <Text style={[styles.emergencyNumber, { color: item.color }]}>{item.number}</Text>
              <Text style={styles.emergencyLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Family Emergency Contacts */}
        <Text style={styles.sectionTitle}>Family Medical Info</Text>
        {members.map((member) => (
          <Card key={member.id} style={styles.memberCard} variant="elevated">
            <View style={styles.memberRow}>
              <View style={[styles.memberAvatar, { backgroundColor: member.avatarColor + '20' }]}>
                <Text style={[styles.memberInitial, { color: member.avatarColor }]}>
                  {member.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role} • DOB: {member.dateOfBirth || 'N/A'}</Text>
                {member.medicalInfo?.bloodType && (
                  <View style={styles.bloodTypeBadge}>
                    <Ionicons name="water" size={12} color={colors.danger} />
                    <Text style={styles.bloodTypeText}>Blood Type: {member.medicalInfo.bloodType}</Text>
                  </View>
                )}
                {member.medicalInfo?.allergies && member.medicalInfo.allergies.length > 0 && (
                  <Text style={styles.allergiesText}>
                    ⚠️ Allergies: {member.medicalInfo.allergies.join(', ')}
                  </Text>
                )}
                {member.medicalInfo?.medications && member.medicalInfo.medications.length > 0 && (
                  <Text style={styles.medicationsText}>
                    💊 Medications: {member.medicalInfo.medications.map((m) => m.name).join(', ')}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Card>
        ))}

        {members.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Add family members to see medical info here</Text>
          </Card>
        )}

        {/* First Aid Guides */}
        <Text style={styles.sectionTitle}>First Aid Guides</Text>
        {FIRST_AID_STEPS.map((guide) => (
          <Card key={guide.title} style={styles.guideCard} variant="elevated">
            <Pressable onPress={() => setExpandedGuide(expandedGuide === guide.title ? null : guide.title)}>
              <View style={styles.guideHeader}>
                <View style={styles.guideIconBg}>
                  <Ionicons name={guide.icon as any} size={20} color={colors.danger} />
                </View>
                <Text style={styles.guideTitle}>{guide.title}</Text>
                <Ionicons
                  name={expandedGuide === guide.title ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </View>
            </Pressable>
            {expandedGuide === guide.title && (
              <View style={styles.guideSteps}>
                {guide.steps.map((step, i) => (
                  <View key={i} style={styles.guideStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        ))}

        {/* Safety Checklist */}
        <Text style={styles.sectionTitle}>Home Safety Checklist</Text>
        <Card style={styles.checklistCard} variant="elevated">
          {SAFETY_CHECKLIST.map((item, i) => (
            <View key={i} style={[styles.checkItem, i < SAFETY_CHECKLIST.length - 1 && styles.checkItemBorder]}>
              <Ionicons
                name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={item.done ? colors.success : colors.textMuted}
              />
              <Text style={[styles.checkItemText, item.done && styles.checkItemTextDone]}>
                {item.label}
              </Text>
            </View>
          ))}
        </Card>

        {/* Emergency Kit */}
        <LinearGradient colors={['#E74C3C', '#C0392B']} style={styles.kitCard}>
          <Ionicons name="medkit" size={28} color="#fff" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.kitTitle}>Emergency Kit</Text>
            <Text style={styles.kitText}>Ensure you have: water (1 gal/person/day), 3-day food supply, flashlight, batteries, first aid kit, medications, important documents, cash, radio</Text>
          </View>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  headerPlaceholder: { width: 40 },
  safetyScore: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 14 },
  safetyScoreValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  safetyScoreLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  safetyRing: { marginLeft: 'auto' as any, width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#fff' },
  safetyPct: { fontSize: 15, fontWeight: '800', color: '#fff' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 12 },
  emergencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emergencyCard: { width: '47%', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6 },
  emergencyNumber: { fontSize: 16, fontWeight: '800' },
  emergencyLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  memberCard: { marginBottom: 10, borderRadius: 14 },
  memberRow: { flexDirection: 'row', alignItems: 'flex-start' },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontSize: 18, fontWeight: '800' },
  memberName: { fontSize: 15, fontWeight: '700', color: colors.text },
  memberRole: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  bloodTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  bloodTypeText: { fontSize: 12, color: colors.danger, fontWeight: '600' },
  allergiesText: { fontSize: 12, color: colors.warning, fontWeight: '500', marginBottom: 2 },
  medicationsText: { fontSize: 12, color: colors.textSecondary },
  emptyCard: { alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  guideCard: { marginBottom: 10, borderRadius: 14 },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guideIconBg: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  guideTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  guideSteps: { marginTop: 14, gap: 10 },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumberText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  stepText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 20 },
  checklistCard: { borderRadius: 14 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  checkItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  checkItemText: { fontSize: 14, color: colors.text, flex: 1 },
  checkItemTextDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  kitCard: { borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, marginBottom: 4 },
  kitTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 6 },
  kitText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 19 },
});
