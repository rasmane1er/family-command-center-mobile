import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useAutomationStore } from '../../store/useAutomationStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const CONFLICT_TOOLS = [
  { id: 't1', name: 'Cool-Down Timer', desc: '10-minute pause before continuing a heated discussion', icon: 'timer', color: '#2980B9' },
  { id: 't2', name: 'I-Statement Builder', desc: '"I feel ___ when ___ because ___" — express without blame', icon: 'chatbubble', color: '#27AE60' },
  { id: 't3', name: 'Family Vote', desc: 'Anonymous voting on disputed family decisions', icon: 'people', color: '#8E44AD' },
  { id: 't4', name: 'Compromise Generator', desc: 'AI suggests middle-ground solutions for both parties', icon: 'shuffle', color: '#F5A623' },
];

const RESOLUTION_FRAMEWORKS = [
  { name: 'Acknowledge', step: 1, desc: 'Each person shares their perspective uninterrupted (2 min each)', color: '#E74C3C' },
  { name: 'Understand', step: 2, desc: 'Repeat back what you heard to confirm understanding', color: '#F5A623' },
  { name: 'Find Common Ground', step: 3, desc: 'Identify what both parties actually want underneath the conflict', color: '#27AE60' },
  { name: 'Create Options', step: 4, desc: 'Brainstorm 3+ solutions without judging any of them', color: '#2980B9' },
  { name: 'Choose & Commit', step: 5, desc: 'Agree on the best solution and document it', color: '#8E44AD' },
];

export function ConflictResolverScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'active' | 'tools' | 'framework'>('active');
  const { conflicts, resolveConflict, updateConflictStatus, seedDemoData } = useAutomationStore();
  const members = useFamilyStore((s) => s.members);

  if (conflicts.length === 0) seedDemoData();

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Member';

  const getStatusColor = (status: string) => {
    if (status === 'resolved') return colors.success;
    if (status === 'in_mediation') return colors.warning;
    if (status === 'escalated') return colors.danger;
    return colors.textMuted;
  };

  const handleResolve = (id: string) => {
    Alert.alert(
      'Mark as Resolved',
      'Enter the resolution agreed upon by all parties.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Resolved', onPress: () => resolveConflict(id, 'Resolved through family mediation.') },
      ]
    );
  };

  const openConflicts = conflicts.filter((c) => c.status !== 'resolved');
  const resolvedConflicts = conflicts.filter((c) => c.status === 'resolved');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#922B21', '#E74C3C']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Conflict Resolver</Text>
          <Pressable style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.sumCard}>
            <Text style={styles.sumVal}>{openConflicts.length}</Text>
            <Text style={styles.sumLabel}>Open</Text>
          </View>
          <View style={styles.sumCard}>
            <Text style={styles.sumVal}>{resolvedConflicts.length}</Text>
            <Text style={styles.sumLabel}>Resolved</Text>
          </View>
          <View style={styles.sumCard}>
            <Text style={styles.sumVal}>{resolvedConflicts.length > 0 ? Math.round(resolvedConflicts.length / conflicts.length * 100) : 0}%</Text>
            <Text style={styles.sumLabel}>Resolution Rate</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['active', 'tools', 'framework'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'active' ? 'Conflicts' : tab === 'tools' ? 'Tools' : 'Framework'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {activeTab === 'active' && (
          <>
            {openConflicts.length === 0 && (
              <View style={styles.peaceCard}>
                <Ionicons name="heart" size={40} color={colors.success} />
                <Text style={styles.peaceTitle}>Family is in harmony!</Text>
                <Text style={styles.peaceDesc}>No open conflicts. Keep up the great communication.</Text>
              </View>
            )}
            {conflicts.map((conflict) => (
              <Card key={conflict.id} style={styles.conflictCard} variant="elevated">
                <View style={styles.conflictTop}>
                  <View style={[styles.severityDot, { backgroundColor: conflict.severity === 'high' ? colors.danger : conflict.severity === 'medium' ? colors.warning : colors.success }]} />
                  <Text style={styles.conflictTitle}>{conflict.title}</Text>
                  <Badge label={conflict.status.replace('_', ' ')} variant={conflict.status === 'resolved' ? 'success' : 'neutral'} size="sm" />
                </View>
                <Text style={styles.conflictDesc}>{conflict.description}</Text>
                <View style={styles.partiesRow}>
                  {conflict.partiesInvolved.map((id) => (
                    <View key={id} style={styles.partyChip}>
                      <Text style={styles.partyName}>{getMemberName(id)}</Text>
                    </View>
                  ))}
                </View>
                {conflict.aiSuggestion && (
                  <View style={styles.aiBox}>
                    <Ionicons name="sparkles" size={14} color={colors.secondary} />
                    <Text style={styles.aiBoxText}>{conflict.aiSuggestion}</Text>
                  </View>
                )}
                {conflict.status !== 'resolved' && (
                  <Pressable onPress={() => handleResolve(conflict.id)} style={styles.resolveBtn}>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                  </Pressable>
                )}
                {conflict.resolution && (
                  <View style={styles.resolutionBox}>
                    <Text style={styles.resolutionLabel}>Resolution:</Text>
                    <Text style={styles.resolutionText}>{conflict.resolution}</Text>
                  </View>
                )}
              </Card>
            ))}
          </>
        )}

        {activeTab === 'tools' && CONFLICT_TOOLS.map((tool) => (
          <Pressable key={tool.id} onPress={() => Alert.alert(tool.name, tool.desc)}>
            <Card style={styles.toolCard} variant="elevated">
              <View style={[styles.toolIcon, { backgroundColor: tool.color + '15' }]}>
                <Ionicons name={tool.icon as any} size={24} color={tool.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.toolName}>{tool.name}</Text>
                <Text style={styles.toolDesc}>{tool.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Card>
          </Pressable>
        ))}

        {activeTab === 'framework' && (
          <>
            <Text style={styles.frameworkIntro}>
              Use this 5-step framework for any family disagreement. Research shows it resolves 87% of conflicts when followed consistently.
            </Text>
            {RESOLUTION_FRAMEWORKS.map((step) => (
              <View key={step.step} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: step.color }]}>
                  <Text style={styles.stepNumText}>{step.step}</Text>
                </View>
                <View style={styles.stepLine} />
                <Card style={styles.stepCard} variant="elevated">
                  <Text style={[styles.stepName, { color: step.color }]}>{step.name}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </Card>
              </View>
            ))}
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
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  sumCard: { alignItems: 'center' },
  sumVal: { fontSize: 28, fontWeight: '800', color: '#fff' },
  sumLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#E74C3C' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#E74C3C' },
  content: { padding: 16 },
  peaceCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  peaceTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  peaceDesc: { fontSize: 13, color: colors.textSecondary },
  conflictCard: { marginBottom: 12, borderRadius: 14 },
  conflictTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  conflictTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  conflictDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  partiesRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  partyChip: { backgroundColor: colors.primary + '15', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  partyName: { fontSize: 12, fontWeight: '600', color: colors.primary },
  aiBox: { flexDirection: 'row', gap: 8, backgroundColor: colors.secondary + '10', borderRadius: 10, padding: 10, marginBottom: 10 },
  aiBoxText: { flex: 1, fontSize: 12, color: colors.text, lineHeight: 17 },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.success, borderRadius: 10, paddingVertical: 10 },
  resolveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  resolutionBox: { backgroundColor: colors.success + '10', borderRadius: 10, padding: 10 },
  resolutionLabel: { fontSize: 11, fontWeight: '700', color: colors.success, marginBottom: 4 },
  resolutionText: { fontSize: 12, color: colors.text, lineHeight: 17 },
  toolCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderRadius: 14 },
  toolIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  toolName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  toolDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  frameworkIntro: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 20, textAlign: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepNum: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNumText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  stepLine: { width: 0 },
  stepCard: { flex: 1, borderRadius: 12 },
  stepName: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  stepDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
});
