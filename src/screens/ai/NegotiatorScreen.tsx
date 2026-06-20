import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useAutomationStore } from '../../store/useAutomationStore';

const NEGOTIATION_SCENARIOS = [
  { id: 's1', title: 'Bill Negotiation Script', desc: 'Lower your cable, insurance or phone bill', icon: 'call', color: '#2980B9', savings: '$240/yr avg', category: 'bills' },
  { id: 's2', title: 'Salary Negotiation', desc: 'Get the raise you deserve with data-backed scripts', icon: 'briefcase', color: '#27AE60', savings: '14% avg increase', category: 'career' },
  { id: 's3', title: 'Car Price Negotiator', desc: 'Save thousands on your next vehicle purchase', icon: 'car', color: '#E74C3C', savings: '$3,200 avg savings', category: 'purchase' },
  { id: 's4', title: 'Contractor Bids', desc: 'Get fair pricing on home repair projects', icon: 'construct', color: '#F5A623', savings: '22% avg savings', category: 'home' },
  { id: 's5', title: 'Medical Bill Review', desc: 'Dispute and reduce medical bills legally', icon: 'medical', color: '#8E44AD', savings: '$890 avg reduction', category: 'health' },
  { id: 's6', title: 'Subscription Audit', desc: 'Negotiate better rates or cancel smartly', icon: 'card', color: '#16A085', savings: '$127/mo avg', category: 'subscriptions' },
];

const CHIEF_OF_STAFF_BRIEFINGS = [
  { time: '08:00', priority: 'high', action: 'Mortgage payment due in 3 days — schedule payment', icon: 'home', color: '#E74C3C' },
  { time: '10:30', priority: 'medium', action: 'Aiden\'s school conference tomorrow at 3pm — confirm attendance', icon: 'school', color: '#2980B9' },
  { time: '14:00', priority: 'low', action: 'Oil change for Camry overdue by 3 months — book service', icon: 'car', color: '#F5A623' },
  { time: '17:00', priority: 'high', action: 'Car insurance renewal in 14 days — compare quotes now', icon: 'shield', color: '#E74C3C' },
  { time: '19:00', priority: 'low', action: 'Weekly family meeting — review goals and task assignments', icon: 'people', color: '#27AE60' },
];

export function NegotiatorScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'chief' | 'negotiate' | 'conflicts'>('chief');
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const { conflicts } = useAutomationStore();

  const openConflicts = conflicts.filter((c) => c.status !== 'resolved');

  const handleNegotiate = (scenario: typeof NEGOTIATION_SCENARIOS[0]) => {
    Alert.alert(
      scenario.title,
      `The AI Negotiator will analyze your situation and generate a personalized negotiation script.\n\nAverage result: ${scenario.savings}\n\nThis feature connects to the AI Assistant for a live session.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Session', onPress: () => Alert.alert('Starting negotiation session...') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0D2137', '#0F2952']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>AI Chief of Staff</Text>
            <Text style={styles.headerSub}>Household Negotiator & Advisor</Text>
          </View>
          <View style={styles.aiChip}>
            <Ionicons name="sparkles" size={14} color={colors.secondary} />
            <Text style={styles.aiChipText}>AI Active</Text>
          </View>
        </View>

        <View style={styles.briefingCard}>
          <Text style={styles.briefingTitle}>Today's Briefing</Text>
          <Text style={styles.briefingDate}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          <View style={styles.briefingStats}>
            <View style={styles.bStat}><Text style={styles.bStatVal}>{CHIEF_OF_STAFF_BRIEFINGS.filter(b => b.priority === 'high').length}</Text><Text style={styles.bStatLabel}>Urgent</Text></View>
            <View style={styles.bStat}><Text style={styles.bStatVal}>{openConflicts.length}</Text><Text style={styles.bStatLabel}>Open Conflicts</Text></View>
            <View style={styles.bStat}><Text style={styles.bStatVal}>$367</Text><Text style={styles.bStatLabel}>Savings Found</Text></View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['chief', 'negotiate', 'conflicts'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'chief' ? 'Briefing' : tab === 'negotiate' ? 'Negotiate' : 'Conflicts'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {activeTab === 'chief' && CHIEF_OF_STAFF_BRIEFINGS.map((item, i) => (
          <Card key={i} style={styles.briefItem} variant="elevated">
            <View style={styles.briefRow}>
              <View style={styles.briefTime}>
                <Text style={styles.briefTimeText}>{item.time}</Text>
              </View>
              <View style={[styles.briefIconBg, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={styles.briefAction}>{item.action}</Text>
              <Badge
                label={item.priority}
                variant={item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'neutral'}
                size="sm"
              />
            </View>
          </Card>
        ))}

        {activeTab === 'negotiate' && (
          <View style={styles.scenariosGrid}>
            {NEGOTIATION_SCENARIOS.map((s) => (
              <Pressable key={s.id} onPress={() => handleNegotiate(s)} style={[styles.scenarioCard, { borderLeftColor: s.color }]}>
                <View style={[styles.scenarioIcon, { backgroundColor: s.color + '15' }]}>
                  <Ionicons name={s.icon as any} size={24} color={s.color} />
                </View>
                <Text style={styles.scenarioTitle}>{s.title}</Text>
                <Text style={styles.scenarioDesc}>{s.desc}</Text>
                <View style={styles.savingsBadge}>
                  <Ionicons name="trending-up" size={12} color={colors.success} />
                  <Text style={styles.savingsText}>{s.savings}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {activeTab === 'conflicts' && (
          <>
            {openConflicts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={60} color={colors.success} />
                <Text style={styles.emptyTitle}>No open conflicts!</Text>
                <Text style={styles.emptyDesc}>Your family is in harmony. The AI will monitor for tension patterns.</Text>
              </View>
            ) : (
              openConflicts.map((conflict) => (
                <Card key={conflict.id} style={styles.conflictCard} variant="elevated">
                  <View style={styles.conflictHeader}>
                    <Badge
                      label={conflict.severity}
                      variant={conflict.severity === 'high' ? 'danger' : conflict.severity === 'medium' ? 'warning' : 'neutral'}
                      size="sm"
                    />
                    <Badge
                      label={conflict.status.replace('_', ' ')}
                      variant="neutral"
                      size="sm"
                    />
                  </View>
                  <Text style={styles.conflictTitle}>{conflict.title}</Text>
                  <Text style={styles.conflictDesc}>{conflict.description}</Text>
                  {conflict.aiSuggestion && (
                    <View style={styles.aiSuggestion}>
                      <Ionicons name="sparkles" size={14} color={colors.secondary} />
                      <Text style={styles.aiSuggestionText}>{conflict.aiSuggestion}</Text>
                    </View>
                  )}
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  aiChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,166,35,0.2)', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 },
  aiChipText: { fontSize: 11, fontWeight: '700', color: colors.secondary },
  briefingCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14 },
  briefingTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
  briefingDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 14 },
  briefingStats: { flexDirection: 'row', justifyContent: 'space-around' },
  bStat: { alignItems: 'center' },
  bStatVal: { fontSize: 22, fontWeight: '800', color: '#fff' },
  bStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  content: { padding: 16 },
  briefItem: { marginBottom: 8, borderRadius: 12 },
  briefRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  briefTime: { width: 40 },
  briefTimeText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  briefIconBg: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  briefAction: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
  scenariosGrid: { gap: 12 },
  scenarioCard: { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  scenarioIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  scenarioTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  scenarioDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  savingsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savingsText: { fontSize: 12, fontWeight: '700', color: colors.success },
  conflictCard: { marginBottom: 12, borderRadius: 14 },
  conflictHeader: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  conflictTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  conflictDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  aiSuggestion: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.secondary + '10', borderRadius: 10, padding: 10 },
  aiSuggestionText: { flex: 1, fontSize: 12, color: colors.text, lineHeight: 17 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});
