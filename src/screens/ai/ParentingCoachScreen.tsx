import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useFamilyStore } from '../../store/useFamilyStore';

const COACHING_MODULES = [
  { id: 'm1', title: 'Positive Discipline', icon: 'heart', color: '#E74C3C', bg: '#FDEDEC', desc: 'Science-backed strategies that build connection while setting boundaries', sessions: 8, completed: 5, rating: 4.9 },
  { id: 'm2', title: 'Emotional Intelligence', icon: 'happy', color: '#F5A623', bg: '#FEF3E2', desc: 'Help your children identify and manage emotions effectively', sessions: 6, completed: 3, rating: 4.8 },
  { id: 'm3', title: 'Healthy Communication', icon: 'chatbubbles', color: '#2980B9', bg: '#EBF5FB', desc: 'Build open, honest family dialogue at every age', sessions: 5, completed: 5, rating: 4.7 },
  { id: 'm4', title: 'Motivation & Rewards', icon: 'trophy', color: '#27AE60', bg: '#D5F5E3', desc: 'Move beyond punishments to intrinsic motivation systems', sessions: 4, completed: 1, rating: 4.9 },
  { id: 'm5', title: 'Screen Time Balance', icon: 'phone-portrait', color: '#8E44AD', bg: '#F5EEF8', desc: 'Navigate the digital age with confidence and clear rules', sessions: 3, completed: 0, rating: 4.6 },
  { id: 'm6', title: 'Building Resilience', icon: 'shield', color: '#16A085', bg: '#D1F2EB', desc: 'Raise kids who bounce back from adversity and setbacks', sessions: 7, completed: 2, rating: 4.8 },
];

const DAILY_TIPS = [
  { tip: 'Instead of "Stop crying", try "I can see you\'re upset. Want to talk about it?" — validating emotions builds trust.', category: 'Emotional IQ', icon: 'heart', color: '#E74C3C' },
  { tip: "Name tasks as choices: 'Do you want to clean your room before or after dinner?' gives autonomy within your boundary.", category: 'Positive Discipline', icon: 'options', color: '#2980B9' },
  { tip: "Catch your child being good 3x more than you correct them. Positive reinforcement is 4x more effective than punishment.", category: 'Motivation', icon: 'star', color: '#F5A623' },
  { tip: "Set up a family meeting once a week. Kids who have voice in family decisions show 40% better behavioral outcomes.", category: 'Communication', icon: 'people', color: '#27AE60' },
];

const AGE_ADVICE: Record<string, { range: string; tips: string[] }> = {
  toddler: { range: '2–5 years', tips: ['Routines are gold — predictability = security', 'Simple choices build confidence', 'Natural consequences work better than time-outs'] },
  school: { range: '6–12 years', tips: ['Let them fail sometimes — struggle builds resilience', 'Ask "What do you think?" before giving answers', 'Chores teach responsibility — start now'] },
  teen: { range: '13–18 years', tips: ['Listen more, lecture less — they know you know', 'Negotiate rules together — buy-in beats compliance', 'Stay curious about their world without judging it'] },
};

export function ParentingCoachScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'modules' | 'tips' | 'advice'>('modules');
  const [tipIndex, setTipIndex] = useState(0);
  const members = useFamilyStore((s) => s.members);
  const children = members.filter((m) => m.role === 'child');

  const totalCompleted = COACHING_MODULES.reduce((s, m) => s + m.completed, 0);
  const totalSessions = COACHING_MODULES.reduce((s, m) => s + m.sessions, 0);
  const overallProgress = totalCompleted / totalSessions;

  const getChildAgeGroup = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member?.dateOfBirth) return 'school';
    const age = new Date().getFullYear() - new Date(member.dateOfBirth).getFullYear();
    if (age < 6) return 'toddler';
    if (age < 13) return 'school';
    return 'teen';
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1A6B3C', '#27AE60']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>AI Parenting Coach</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalCompleted}</Text>
            <Text style={styles.statLabel}>Sessions Done</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMid]}>
            <Text style={styles.statValue}>{Math.round(overallProgress * 100)}%</Text>
            <Text style={styles.statLabel}>Overall Progress</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{children.length}</Text>
            <Text style={styles.statLabel}>Children</Text>
          </View>
        </View>
        <ProgressBar progress={overallProgress} color="#fff" height={6} />
      </LinearGradient>

      <View style={styles.tabs}>
        {(['modules', 'tips', 'advice'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'modules' ? 'Modules' : tab === 'tips' ? 'Daily Tips' : 'Age Advice'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {activeTab === 'modules' && COACHING_MODULES.map((module) => (
          <Pressable key={module.id} onPress={() => Alert.alert(module.title, `${module.desc}\n\n${module.completed}/${module.sessions} sessions completed · ⭐ ${module.rating}`, [{ text: 'Close', style: 'cancel' }, { text: 'Ask AI Coach', onPress: () => navigation.navigate('AI Assistant') }])}>
            <Card style={{ ...styles.moduleCard, backgroundColor: module.bg }} variant="default">
              <View style={styles.moduleHeader}>
                <View style={[styles.moduleIcon, { backgroundColor: module.color + '25' }]}>
                  <Ionicons name={module.icon as any} size={22} color={module.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleDesc}>{module.desc}</Text>
                </View>
              </View>
              <View style={styles.moduleFooter}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <ProgressBar progress={module.completed / module.sessions} color={module.color} height={5} />
                  <Text style={styles.moduleProg}>{module.completed}/{module.sessions} sessions</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color={module.color} />
                  <Text style={[styles.ratingText, { color: module.color }]}>{module.rating}</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        ))}

        {activeTab === 'tips' && (
          <>
            <Card style={styles.tipCard} variant="elevated">
              <View style={styles.tipHeader}>
                <View style={[styles.tipIcon, { backgroundColor: DAILY_TIPS[tipIndex].color + '20' }]}>
                  <Ionicons name={DAILY_TIPS[tipIndex].icon as any} size={24} color={DAILY_TIPS[tipIndex].color} />
                </View>
                <Text style={[styles.tipCategory, { color: DAILY_TIPS[tipIndex].color }]}>{DAILY_TIPS[tipIndex].category}</Text>
              </View>
              <Text style={styles.tipText}>"{DAILY_TIPS[tipIndex].tip}"</Text>
              <View style={styles.tipNav}>
                <Pressable onPress={() => setTipIndex(Math.max(0, tipIndex - 1))} style={styles.tipNavBtn}>
                  <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
                </Pressable>
                <Text style={styles.tipCounter}>{tipIndex + 1} / {DAILY_TIPS.length}</Text>
                <Pressable onPress={() => setTipIndex(Math.min(DAILY_TIPS.length - 1, tipIndex + 1))} style={styles.tipNavBtn}>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            </Card>
          </>
        )}

        {activeTab === 'advice' && children.map((child) => {
          const ageGroup = getChildAgeGroup(child.id);
          const advice = AGE_ADVICE[ageGroup];
          return (
            <Card key={child.id} style={styles.adviceCard} variant="elevated">
              <View style={styles.adviceHeader}>
                <View style={[styles.childAvatar, { backgroundColor: child.avatarColor + '30' }]}>
                  <Text style={[styles.childInitial, { color: child.avatarColor }]}>{child.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.ageRange}>Age group: {advice.range}</Text>
                </View>
              </View>
              {advice.tips.map((tip, i) => (
                <View key={i} style={styles.adviceTip}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.adviceTipText}>{tip}</Text>
                </View>
              ))}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  statsRow: { flexDirection: 'row', marginBottom: 14 },
  statBox: { flex: 1, alignItems: 'center' },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#27AE60' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#27AE60' },
  content: { padding: 16 },
  moduleCard: { marginBottom: 12, borderRadius: 14 },
  moduleHeader: { flexDirection: 'row', marginBottom: 12 },
  moduleIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  moduleTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  moduleDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  moduleFooter: { flexDirection: 'row', alignItems: 'center' },
  moduleProg: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '700' },
  tipCard: { borderRadius: 16, marginBottom: 16 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  tipIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tipCategory: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tipText: { fontSize: 15, color: colors.text, lineHeight: 24, fontStyle: 'italic', marginBottom: 16 },
  tipNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  tipNavBtn: { padding: 8 },
  tipCounter: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  adviceCard: { marginBottom: 12, borderRadius: 14 },
  adviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  childAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  childInitial: { fontSize: 20, fontWeight: '800' },
  childName: { fontSize: 16, fontWeight: '700', color: colors.text },
  ageRange: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  adviceTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  adviceTipText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
});
