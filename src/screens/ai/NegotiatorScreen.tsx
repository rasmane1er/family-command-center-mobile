import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useAutomationStore } from '../../store/useAutomationStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useGuardianStore } from '../../store/useGuardianStore';
import { chatWithNegotiator, AIMessage } from '../../services/aiService';
import { useFamilyContextString } from '../../utils/buildFamilyContext';

const NEGOTIATION_SCENARIOS = [
  { id: 's1', title: 'Bill Negotiation Script', desc: 'Lower your cable, insurance or phone bill', icon: 'call', color: '#2980B9', savings: '$240/yr avg', category: 'bills' },
  { id: 's2', title: 'Salary Negotiation', desc: 'Get the raise you deserve with data-backed scripts', icon: 'briefcase', color: '#27AE60', savings: '14% avg increase', category: 'career' },
  { id: 's3', title: 'Car Price Negotiator', desc: 'Save thousands on your next vehicle purchase', icon: 'car', color: '#E74C3C', savings: '$3,200 avg savings', category: 'purchase' },
  { id: 's4', title: 'Contractor Bids', desc: 'Get fair pricing on home repair projects', icon: 'construct', color: '#F5A623', savings: '22% avg savings', category: 'home' },
  { id: 's5', title: 'Medical Bill Review', desc: 'Dispute and reduce medical bills legally', icon: 'medical', color: '#8E44AD', savings: '$890 avg reduction', category: 'health' },
  { id: 's6', title: 'Subscription Audit', desc: 'Negotiate better rates or cancel smartly', icon: 'card', color: '#16A085', savings: '$127/mo avg', category: 'subscriptions' },
];

type BriefingPriority = 'critical' | 'high' | 'medium' | 'low';

interface BriefingItem {
  time: string;
  priority: BriefingPriority;
  action: string;
  icon: string;
  color: string;
}

function useChiefOfStaffBriefings(): BriefingItem[] {
  const bills = useFinanceStore((s) => s.bills);
  const vehicles = useOperationsStore((s) => s.vehicles);
  const tasks = useFamilyStore((s) => s.tasks);
  const sosAlerts = useGuardianStore((s) => s.sosAlerts);

  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const briefings: BriefingItem[] = [];

  // SOS alerts — highest priority
  const unresolvedSOS = sosAlerts.filter((a) => !a.isResolved);
  unresolvedSOS.forEach((alert) => {
    briefings.push({
      time: new Date(alert.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      priority: 'critical',
      action: `SOS alert from ${alert.deviceId} — resolve immediately`,
      icon: 'warning',
      color: '#E74C3C',
    });
  });

  // Bills due within 7 days
  const billsDue = bills.filter((b) => {
    if (b.status === 'paid') return false;
    const due = new Date(b.dueDate);
    return due >= today && due <= in7Days;
  });
  billsDue.forEach((bill) => {
    const daysUntil = Math.ceil((new Date(bill.dueDate).getTime() - today.getTime()) / 86400000);
    const priority: BriefingPriority = daysUntil <= 1 ? 'critical' : daysUntil <= 3 ? 'high' : 'medium';
    briefings.push({
      time: new Date(bill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      priority,
      action: `${bill.name} ($${bill.amount}) due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} — schedule payment`,
      icon: 'cash',
      color: priority === 'critical' ? '#E74C3C' : priority === 'high' ? '#E74C3C' : '#F5A623',
    });
  });

  // Overdue bills
  const overdueBills = bills.filter((b) => b.status !== 'paid' && new Date(b.dueDate) < today);
  overdueBills.forEach((bill) => {
    const days = Math.floor((today.getTime() - new Date(bill.dueDate).getTime()) / 86400000);
    briefings.push({
      time: 'Overdue',
      priority: 'high',
      action: `${bill.name} ($${bill.amount}) overdue by ${days} day${days !== 1 ? 's' : ''} — pay now`,
      icon: 'alert-circle',
      color: '#E74C3C',
    });
  });

  // Vehicles
  vehicles.forEach((v) => {
    if (!v.nextService) return;
    const next = new Date(v.nextService);
    const daysUntil = Math.ceil((next.getTime() - today.getTime()) / 86400000);
    if (next <= in7Days) {
      briefings.push({
        time: daysUntil <= 0 ? 'Overdue' : `${daysUntil}d`,
        priority: daysUntil <= 0 ? 'high' : 'medium',
        action: `${v.year} ${v.make} ${v.model} service ${daysUntil <= 0 ? 'overdue' : `due in ${daysUntil} days`} — book service`,
        icon: 'car',
        color: daysUntil <= 0 ? '#E74C3C' : '#F5A623',
      });
    }
  });

  // Overdue tasks (max 3)
  const overdueTasks = tasks
    .filter((t) => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < today)
    .slice(0, 3);
  overdueTasks.forEach((task) => {
    const days = Math.floor((today.getTime() - new Date(task.dueDate!).getTime()) / 86400000);
    briefings.push({
      time: `${days}d ago`,
      priority: task.priority === 'high' ? 'high' : 'medium',
      action: `"${task.title}" overdue by ${days} day${days !== 1 ? 's' : ''} — complete now`,
      icon: 'checkbox',
      color: task.priority === 'high' ? '#E74C3C' : '#F5A623',
    });
  });

  if (briefings.length === 0) {
    briefings.push({
      time: 'All clear',
      priority: 'low',
      action: 'No urgent items — your household is running smoothly!',
      icon: 'checkmark-circle',
      color: '#27AE60',
    });
  }

  return briefings.slice(0, 8);
}

export function NegotiatorScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'chief' | 'negotiate' | 'conflicts' | 'chat'>('chief');
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<AIMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const chatScrollRef = useRef<ScrollView>(null);
  const { conflicts } = useAutomationStore();
  const familyContext = useFamilyContextString();

  const CHIEF_OF_STAFF_BRIEFINGS = useChiefOfStaffBriefings();
  const openConflicts = conflicts.filter((c) => c.status !== 'resolved');

  const handleChatSend = async (text?: string) => {
    const msg = text ?? chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    const newHistory: AIMessage[] = [...chatHistory, { role: 'user', content: msg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    setSuggestions([]);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    const result = await chatWithNegotiator({ message: msg, history: chatHistory, context: familyContext });
    const modelHistory: AIMessage[] = [...newHistory, { role: 'model', content: result.reply }];
    setChatHistory(modelHistory);
    setSuggestions(result.suggestions);
    setChatLoading(false);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleNegotiate = (scenario: typeof NEGOTIATION_SCENARIOS[0]) => {
    Alert.alert(
      scenario.title,
      `The AI Negotiator will analyze your situation and generate a personalized negotiation script.\n\nAverage result: ${scenario.savings}\n\nThis feature connects to the AI Assistant for a live session.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Session', onPress: () => { setActiveTab('chat'); handleChatSend(`Help me with: ${scenario.title}. ${scenario.desc}`); } },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0D2137', '#0F2952']} style={[styles.header, { paddingTop: insets.top }]}>
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
            <View style={styles.bStat}><Text style={styles.bStatVal}>{CHIEF_OF_STAFF_BRIEFINGS.filter((b) => b.priority === 'high' || b.priority === 'critical').length}</Text><Text style={styles.bStatLabel}>Urgent</Text></View>
            <View style={styles.bStat}><Text style={styles.bStatVal}>{openConflicts.length}</Text><Text style={styles.bStatLabel}>Open Conflicts</Text></View>
            <View style={styles.bStat}><Text style={styles.bStatVal}>$367</Text><Text style={styles.bStatLabel}>Savings Found</Text></View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['chief', 'negotiate', 'conflicts', 'chat'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'chief' ? 'Briefing' : tab === 'negotiate' ? 'Scripts' : tab === 'conflicts' ? 'Conflicts' : '✨ Ask AI'}
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
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={item.color} />
              </View>
              <Text style={styles.briefAction}>{item.action}</Text>
              <Badge
                label={item.priority}
                variant={item.priority === 'critical' || item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'neutral'}
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

      {activeTab === 'chat' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chatPanel}>
          <ScrollView ref={chatScrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
            {chatHistory.length === 0 && (
              <View style={styles.chatEmpty}>
                <Text style={styles.chatEmptyTitle}>AI Negotiation Coach</Text>
                <Text style={styles.chatEmptyDesc}>Get personalized scripts and strategies for any negotiation</Text>
                {['How do I negotiate my cable bill down?', 'Give me a salary negotiation script', 'How do I dispute a medical bill?'].map((q) => (
                  <Pressable key={q} style={styles.chatStarter} onPress={() => handleChatSend(q)}>
                    <Text style={styles.chatStarterText}>{q}</Text>
                    <Ionicons name="arrow-forward" size={14} color="#0F2952" />
                  </Pressable>
                ))}
              </View>
            )}
            {chatHistory.map((m, i) => (
              <View key={i} style={[styles.chatBubble, m.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI]}>
                <Text style={m.role === 'user' ? styles.chatBubbleUserText : styles.chatBubbleAIText}>{m.content}</Text>
              </View>
            ))}
            {chatLoading && (
              <View style={styles.chatBubbleAI}><ActivityIndicator size="small" color="#0F2952" /></View>
            )}
            {suggestions.length > 0 && !chatLoading && (
              <View style={{ marginTop: 8 }}>
                {suggestions.map((s) => (
                  <Pressable key={s} style={styles.chatSuggestion} onPress={() => handleChatSend(s)}>
                    <Text style={styles.chatSuggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Describe your negotiation situation..."
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={() => handleChatSend()}
              returnKeyType="send"
              multiline
            />
            <Pressable style={[styles.chatSendBtn, !chatInput.trim() && { opacity: 0.4 }]} onPress={() => handleChatSend()} disabled={!chatInput.trim()}>
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  aiChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,166,35,0.2)', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 },
  aiChipText: { fontSize: 11, fontWeight: '700', color: colors.secondary },
  briefingCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14 },
  briefingTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
  briefingDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 14 },
  briefingStats: { flexDirection: 'row', justifyContent: 'space-around' },
  bStat: { alignItems: 'center' },
  bStatVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
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
  chatPanel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background },
  chatEmpty: { alignItems: 'center', paddingTop: 20, paddingBottom: 8 },
  chatEmptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  chatEmptyDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  chatStarter: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EEF2FA', borderRadius: 12, padding: 14, marginBottom: 8, width: '100%' },
  chatStarterText: { flex: 1, fontSize: 14, color: '#0F2952', fontWeight: '500' },
  chatBubble: { borderRadius: 16, padding: 12, marginBottom: 10, maxWidth: '85%' },
  chatBubbleUser: { backgroundColor: '#0F2952', alignSelf: 'flex-end' },
  chatBubbleAI: { backgroundColor: colors.card, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  chatBubbleUserText: { fontSize: 14, color: '#fff', lineHeight: 20 },
  chatBubbleAIText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  chatSuggestion: { backgroundColor: '#EEF2FA', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 6, alignSelf: 'flex-start' },
  chatSuggestionText: { fontSize: 13, color: '#0F2952', fontWeight: '500' },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, gap: 10 },
  chatInput: { flex: 1, backgroundColor: colors.card, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 16, fontSize: 14, color: colors.text, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0F2952', alignItems: 'center', justifyContent: 'center' },
});
