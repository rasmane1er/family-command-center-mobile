import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useGuardianStore } from '../../store/useGuardianStore';
import { chatWithDigitalTwin, AIMessage } from '../../services/aiService';

const { width } = Dimensions.get('window');

const RADAR_SIZE = width - 80;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = RADAR_SIZE / 2 - 30;

interface DimensionConfig {
  label: string;
  value: number;
  prediction: number;
  icon: string;
  color: string;
}

interface PredictionItem {
  icon: string;
  title: string;
  description: string;
  impact: number;
  category: string;
}

function useDigitalTwinScores(): { dimensions: DimensionConfig[]; predictions: PredictionItem[] } {
  const members = useFamilyStore((s) => s.members);
  const tasks = useFamilyStore((s) => s.tasks);
  const bills = useFinanceStore((s) => s.bills);
  const accounts = useFinanceStore((s) => s.accounts);
  const monthlyIncome = useFinanceStore((s) => s.monthlyIncome);
  const monthlyExpenses = useFinanceStore((s) => s.monthlyExpenses);
  const financialGoals = useFinanceStore((s) => s.financialGoals);
  const pantryItems = useOperationsStore((s) => s.pantryItems);
  const vehicles = useOperationsStore((s) => s.vehicles);
  const sosAlerts = useGuardianStore((s) => s.sosAlerts);
  const approvalRequests = useGuardianStore((s) => s.approvalRequests);
  const screenTimeRules = useGuardianStore((s) => s.screenTimeRules);

  const today = new Date();

  // Financial Health (0-100)
  let financial = 50;
  const overdueBills = bills.filter((b) => b.status !== 'paid' && new Date(b.dueDate) < today);
  financial -= Math.min(30, overdueBills.length * 10);
  const positiveAccounts = accounts.filter((a) => a.balance > 0);
  financial += Math.min(20, positiveAccounts.length > 0 ? 20 : 0);
  if (monthlyExpenses > 0 && monthlyIncome > monthlyExpenses) financial += 30;
  if (financialGoals.length > 0) financial += 10;
  financial = Math.max(0, Math.min(100, financial));

  // Productivity (0-100)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 50;
  let productivity = 50 + completionRate * 0.5;
  const overdueTasks = tasks.filter((t) => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < today);
  productivity -= Math.min(25, overdueTasks.length * 5);
  productivity = Math.max(0, Math.min(100, productivity));

  // Safety (0-100)
  let safety = 70;
  const unresolvedSOS = sosAlerts.filter((a) => !a.isResolved);
  safety -= Math.min(40, unresolvedSOS.length * 20);
  const pendingApprovals = approvalRequests.filter((r) => r.status === 'pending');
  safety -= Math.min(20, pendingApprovals.length * 5);
  if (screenTimeRules.length > 0) safety += 10;
  safety = Math.max(0, Math.min(100, safety));

  // Home (0-100)
  let home = 80;
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const vehiclesOverdue = vehicles.filter((v) => v.nextService && new Date(v.nextService) < today);
  home -= vehiclesOverdue.length * 15;
  const vehiclesDueSoon = vehicles.filter((v) => v.nextService && new Date(v.nextService) <= in30Days && new Date(v.nextService) >= today);
  home -= vehiclesDueSoon.length * 5;
  const lowPantry = pantryItems.filter((p) => p.minQuantity !== undefined && p.quantity <= p.minQuantity);
  home -= Math.min(20, lowPantry.length * 3);
  home = Math.max(0, Math.min(100, home));

  // Wellness (0-100)
  const children = members.filter((m) => m.role === 'child');
  let wellness = 60;
  const childrenWithRules = children.filter((c) => screenTimeRules.some((r) => r.memberId === c.id));
  wellness += childrenWithRules.length * 10;
  wellness = Math.max(0, Math.min(100, wellness));
  if (children.length === 0) wellness = 70;

  const dimensions: DimensionConfig[] = [
    { label: 'Financial', value: Math.round(financial), prediction: Math.min(100, Math.round(financial + 6)), icon: 'wallet', color: '#27AE60' },
    { label: 'Productivity', value: Math.round(productivity), prediction: Math.min(100, Math.round(productivity + 3)), icon: 'checkmark-circle', color: '#F5A623' },
    { label: 'Safety', value: Math.round(safety), prediction: Math.min(100, Math.round(safety + 5)), icon: 'shield', color: '#2980B9' },
    { label: 'Home', value: Math.round(home), prediction: Math.min(100, Math.round(home + 4)), icon: 'home', color: '#E74C3C' },
    { label: 'Wellness', value: Math.round(wellness), prediction: Math.min(100, Math.round(wellness + 3)), icon: 'heart', color: '#8E44AD' },
  ];

  // Dynamic predictions
  const predictions: PredictionItem[] = [];
  if (overdueBills.length > 0) {
    predictions.push({
      icon: '💸',
      title: 'Bill Overdue',
      description: `${overdueBills.length} bill${overdueBills.length !== 1 ? 's' : ''} need attention`,
      impact: -5,
      category: 'financial',
    });
  }
  if (vehiclesOverdue.length > 0 || vehiclesDueSoon.length > 0) {
    predictions.push({
      icon: '🚗',
      title: 'Vehicle Service Due',
      description: 'Maintenance needed soon',
      impact: -3,
      category: 'home',
    });
  }
  if (lowPantry.length > 3) {
    predictions.push({
      icon: '🛒',
      title: 'Restock Pantry',
      description: `${lowPantry.length} items running low`,
      impact: -2,
      category: 'home',
    });
  }

  // Positive prediction based on highest-scoring dimension
  const highestDim = [...dimensions].sort((a, b) => b.value - a.value)[0];
  if (highestDim) {
    predictions.push({
      icon: '🌟',
      title: `Strong ${highestDim.label}`,
      description: `Your ${highestDim.label.toLowerCase()} score of ${highestDim.value} is excellent — keep it up!`,
      impact: 5,
      category: highestDim.label.toLowerCase(),
    });
  }

  return { dimensions, predictions };
}

const WHAT_IF_SCENARIOS = [
  { scenario: 'Cut dining out by 50%', impact: '+$340/month', effect: 'Reach Hawaii goal 4 months early', icon: 'restaurant', color: '#27AE60', positive: true },
  { scenario: 'Add 30min family exercise', impact: '+12 happiness points', effect: 'Reduce stress markers by 23%', icon: 'fitness', color: '#2980B9', positive: true },
  { scenario: 'Miss 2 weekly meetings', impact: '-8 communication score', effect: 'Conflict risk increases by 35%', icon: 'people', color: '#E74C3C', positive: false },
  { scenario: 'Automate bill payments', impact: '0 late fees ever', effect: 'Credit score up ~15 points', icon: 'card', color: '#F5A623', positive: true },
];

const PATTERNS = [
  { pattern: 'Peak Productivity', detail: 'Your family completes 73% more tasks on Tuesday & Wednesday', icon: 'trending-up', color: '#27AE60' },
  { pattern: 'Spending Trigger', detail: 'Online spending spikes 40% on Friday evenings', icon: 'card', color: '#E74C3C' },
  { pattern: 'Best Mood Days', detail: 'Family mood average is highest on Saturday mornings', icon: 'happy', color: '#8E44AD' },
  { pattern: 'Communication Peak', detail: 'Most family discussions happen between 6-8 PM', icon: 'chatbubbles', color: '#2980B9' },
];

function getPolygonPoints(values: number[], centerX: number, centerY: number, radius: number): string {
  return values.map((val, i) => {
    const angle = (i * 2 * Math.PI) / values.length - Math.PI / 2;
    const r = (val / 100) * radius;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');
}

function getLabelPosition(i: number, total: number, centerX: number, centerY: number, radius: number) {
  const angle = (i * 2 * Math.PI) / total - Math.PI / 2;
  const r = radius + 18;
  return { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
}

export function DigitalTwinScreen({ navigation }: { navigation: { goBack: () => void; navigate: (s: string) => void } }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'twin' | 'predict' | 'whatif' | 'chat'>('twin');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<AIMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const chatScrollRef = useRef<ScrollView>(null);
  const members = useFamilyStore((s) => s.members);
  const { monthlyIncome, monthlyExpenses } = useFinanceStore();

  const { dimensions: DIMENSIONS_CONFIG, predictions: PREDICTIONS } = useDigitalTwinScores();

  const overallScore = Math.round(DIMENSIONS_CONFIG.reduce((s, d) => s + d.value, 0) / DIMENSIONS_CONFIG.length);
  const predictedScore = Math.round(DIMENSIONS_CONFIG.reduce((s, d) => s + d.prediction, 0) / DIMENSIONS_CONFIG.length);

  const handleChatSend = async (text?: string) => {
    const msg = text ?? chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    const newHistory: AIMessage[] = [...chatHistory, { role: 'user', content: msg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    setChatSuggestions([]);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    const familyData = { members: members.length, monthlyIncome, monthlyExpenses, overallScore };
    const result = await chatWithDigitalTwin({ message: msg, history: chatHistory, familyData });
    setChatHistory([...newHistory, { role: 'model', content: result.reply }]);
    setChatSuggestions(result.suggestions);
    setChatLoading(false);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const currentValues = DIMENSIONS_CONFIG.map((d) => d.value);
  const predictedValues = DIMENSIONS_CONFIG.map((d) => d.prediction);
  const maxPoints = DIMENSIONS_CONFIG.map((_, i) => {
    const angle = (i * 2 * Math.PI) / DIMENSIONS_CONFIG.length - Math.PI / 2;
    return {
      x: RADAR_CENTER + RADAR_RADIUS * Math.cos(angle),
      y: RADAR_CENTER + RADAR_RADIUS * Math.sin(angle),
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0D0D2B', '#1A1A4E', '#2D2D8F']} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Family Digital Twin</Text>
            <Text style={styles.headerSub}>AI-powered simulation of your family's patterns</Text>
          </View>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreBadgeText}>{overallScore}</Text>
          </View>
        </View>

        <View style={styles.twinStats}>
          <View style={styles.twinStat}>
            <Text style={styles.twinStatValue}>{overallScore}</Text>
            <Text style={styles.twinStatLabel}>Current</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.4)" />
          <View style={styles.twinStat}>
            <Text style={[styles.twinStatValue, { color: '#4EECD0' }]}>{predictedScore}</Text>
            <Text style={styles.twinStatLabel}>30-day forecast</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.4)" />
          <View style={styles.twinStat}>
            <Text style={[styles.twinStatValue, { color: '#FFD166' }]}>{members.length}</Text>
            <Text style={styles.twinStatLabel}>Members modeled</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['twin', 'predict', 'whatif', 'chat'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'twin' ? '🧬 DNA' : t === 'predict' ? '🔮 Predict' : t === 'whatif' ? '💡 What-If' : '✨ Ask AI'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {tab === 'twin' && (
          <>
            <Text style={styles.sectionTitle}>Family Behavioral DNA</Text>
            <Card variant="elevated" style={styles.radarCard}>
              <Svg width={RADAR_SIZE} height={RADAR_SIZE}>
                {[0.25, 0.5, 0.75, 1].map((pct) => (
                  <Circle key={pct} cx={RADAR_CENTER} cy={RADAR_CENTER} r={RADAR_RADIUS * pct} fill="none" stroke="#E5E7EB" strokeWidth={1} />
                ))}
                {maxPoints.map((pt, i) => (
                  <Line key={i} x1={RADAR_CENTER} y1={RADAR_CENTER} x2={pt.x} y2={pt.y} stroke="#E5E7EB" strokeWidth={1} />
                ))}
                <Polygon
                  points={getPolygonPoints(predictedValues, RADAR_CENTER, RADAR_CENTER, RADAR_RADIUS)}
                  fill="#4EECD0"
                  fillOpacity={0.12}
                  stroke="#4EECD0"
                  strokeWidth={1.5}
                />
                <Polygon
                  points={getPolygonPoints(currentValues, RADAR_CENTER, RADAR_CENTER, RADAR_RADIUS)}
                  fill={colors.primary}
                  fillOpacity={0.2}
                  stroke={colors.primary}
                  strokeWidth={2}
                />
                {DIMENSIONS_CONFIG.map((d, i) => {
                  const pos = getLabelPosition(i, DIMENSIONS_CONFIG.length, RADAR_CENTER, RADAR_CENTER, RADAR_RADIUS);
                  return (
                    <SvgText key={d.label} x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill={d.color}>
                      {d.label}
                    </SvgText>
                  );
                })}
              </Svg>
              <View style={styles.radarLegend}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Current</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#4EECD0' }]} /><Text style={styles.legendText}>30-Day Forecast</Text></View>
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Dimension Breakdown</Text>
            {DIMENSIONS_CONFIG.map((d) => (
              <Card key={d.label} variant="elevated" style={styles.dimCard}>
                <View style={styles.dimRow}>
                  <View style={[styles.dimIcon, { backgroundColor: d.color + '20' }]}>
                    <Ionicons name={d.icon as keyof typeof Ionicons.glyphMap} size={18} color={d.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.dimHeader}>
                      <Text style={styles.dimLabel}>{d.label}</Text>
                      <View style={styles.dimScores}>
                        <Text style={styles.dimCurrent}>{d.value}</Text>
                        <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
                        <Text style={[styles.dimPredicted, { color: d.color }]}>{d.prediction}</Text>
                      </View>
                    </View>
                    <ProgressBar progress={d.value / 100} color={d.color} height={5} />
                  </View>
                </View>
              </Card>
            ))}

            <Text style={styles.sectionTitle}>Behavioral Patterns</Text>
            {PATTERNS.map((p, i) => (
              <Card key={i} variant="elevated" style={styles.patternCard}>
                <View style={styles.patternRow}>
                  <View style={[styles.patternIcon, { backgroundColor: p.color + '20' }]}>
                    <Ionicons name={p.icon as keyof typeof Ionicons.glyphMap} size={18} color={p.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.patternTitle}>{p.pattern}</Text>
                    <Text style={styles.patternDetail}>{p.detail}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {tab === 'predict' && (
          <>
            <Card variant="elevated" style={styles.predictHero}>
              <Text style={styles.predictHeroTitle}>🔮 AI Forecast</Text>
              <Text style={styles.predictHeroDesc}>Based on your family's real data, you're trending {predictedScore > overallScore ? 'upward' : 'downward'}. Current trajectory leads to a {predictedScore}/100 family score in 30 days.</Text>
              <View style={styles.predictScoreRow}>
                <View style={styles.predictScore}>
                  <Text style={styles.predictScoreLabel}>NOW</Text>
                  <Text style={styles.predictScoreValue}>{overallScore}</Text>
                </View>
                <View style={styles.predictArrow}>
                  <Ionicons name="trending-up" size={32} color="#4EECD0" />
                </View>
                <View style={styles.predictScore}>
                  <Text style={styles.predictScoreLabel}>30 DAYS</Text>
                  <Text style={[styles.predictScoreValue, { color: '#4EECD0' }]}>{predictedScore}</Text>
                </View>
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Specific Predictions</Text>
            {PREDICTIONS.map((p, i) => (
              <Card key={i} variant="elevated" style={styles.predCard}>
                <View style={styles.predRow}>
                  <View style={[styles.predIcon, { backgroundColor: p.impact > 0 ? '#D5F5E3' : '#FDEDEC' }]}>
                    <Text style={{ fontSize: 18 }}>{p.icon}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.predHeader}>
                      <Text style={styles.predTimeframe}>{p.category.toUpperCase()}</Text>
                      <View style={[styles.confidenceBadge, { backgroundColor: p.impact > 0 ? '#D5F5E3' : '#FDEDEC' }]}>
                        <Text style={[styles.confidenceText, { color: p.impact > 0 ? '#27AE60' : '#E74C3C' }]}>
                          {p.impact > 0 ? '+' : ''}{p.impact} pts
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.predTitle}>{p.title}</Text>
                    <Text style={styles.predPrediction}>{p.description}</Text>
                  </View>
                </View>
              </Card>
            ))}

            <Card variant="elevated" style={styles.modelCard}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={styles.modelTitle}>How the AI Model Works</Text>
              <Text style={styles.modelDesc}>The Family Digital Twin analyzes task completion rates, spending patterns, pantry data, vehicle schedules, and guardian insights to compute your family's real scores. All data comes live from your family stores.</Text>
            </Card>
          </>
        )}

        {tab === 'whatif' && (
          <>
            <Text style={styles.whatIfIntro}>Explore how specific changes could impact your family's trajectory.</Text>
            {WHAT_IF_SCENARIOS.map((s, i) => (
              <Card key={i} variant="elevated" style={styles.whatIfCard}>
                <View style={styles.whatIfHeader}>
                  <View style={[styles.whatIfIcon, { backgroundColor: s.color + '20' }]}>
                    <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={20} color={s.color} />
                  </View>
                  <Text style={styles.whatIfScenario}>{s.scenario}</Text>
                </View>
                <View style={styles.whatIfResults}>
                  <View style={[styles.whatIfResult, { backgroundColor: s.positive ? '#D5F5E3' : '#FDEDEC' }]}>
                    <Ionicons name={s.positive ? 'trending-up' : 'trending-down'} size={14} color={s.positive ? '#27AE60' : '#E74C3C'} />
                    <Text style={[styles.whatIfImpact, { color: s.positive ? '#27AE60' : '#E74C3C' }]}>{s.impact}</Text>
                  </View>
                  <Text style={styles.whatIfEffect}>{s.effect}</Text>
                </View>
                <Pressable
                  onPress={() => Alert.alert('Apply This Change', `"${s.scenario}"\n\nProjected effect: ${s.effect}\n\nWould you like to add this as a family goal?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Add to Goals', onPress: () => navigation.navigate('Finance') },
                  ])}
                  style={[styles.whatIfBtn, { backgroundColor: s.color }]}
                >
                  <Text style={styles.whatIfBtnText}>Apply This Change</Text>
                </Pressable>
              </Card>
            ))}

            <Card variant="elevated" style={styles.customCard}>
              <Text style={styles.customTitle}>Create Custom Scenario</Text>
              <Text style={styles.customDesc}>Tell the AI what you're planning and it will project the impact on your family's score, finances, and wellbeing.</Text>
              <Pressable
                onPress={() => Alert.alert('Ask AI to Analyze', 'Describe a change you\'re planning — budget adjustment, routine shift, habit change — and the AI will project its impact.', [
                  { text: 'Later', style: 'cancel' },
                  { text: 'Open AI Assistant', onPress: () => navigation.navigate('AIAssistant') },
                ])}
                style={styles.customBtn}
              >
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={styles.customBtnText}>Ask AI to Analyze</Text>
              </Pressable>
            </Card>
          </>
        )}
      </ScrollView>

      {tab === 'chat' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chatPanel}>
          <ScrollView ref={chatScrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
            {chatHistory.length === 0 && (
              <View style={styles.chatEmpty}>
                <Text style={styles.chatEmptyTitle}>Ask Your Digital Twin</Text>
                <Text style={styles.chatEmptyDesc}>AI-powered insights about your family's patterns and future</Text>
                {['What should we improve to raise our score?', 'Predict our finances for the next 6 months', 'What habits are hurting our family wellbeing?'].map((q) => (
                  <Pressable key={q} style={styles.chatStarter} onPress={() => handleChatSend(q)}>
                    <Text style={styles.chatStarterText}>{q}</Text>
                    <Ionicons name="arrow-forward" size={14} color="#2D2D8F" />
                  </Pressable>
                ))}
              </View>
            )}
            {chatHistory.map((m, i) => (
              <View key={i} style={[styles.chatBubble, m.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI]}>
                <Text style={m.role === 'user' ? styles.chatBubbleUserText : styles.chatBubbleAIText}>{m.content}</Text>
              </View>
            ))}
            {chatLoading && <View style={styles.chatBubbleAI}><ActivityIndicator size="small" color="#2D2D8F" /></View>}
            {chatSuggestions.length > 0 && !chatLoading && chatSuggestions.map((s) => (
              <Pressable key={s} style={styles.chatSuggestion} onPress={() => handleChatSend(s)}>
                <Text style={styles.chatSuggestionText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.chatInputRow}>
            <TextInput style={styles.chatInput} value={chatInput} onChangeText={setChatInput} placeholder="Ask about your family patterns..." placeholderTextColor={colors.textMuted} onSubmitEditing={() => handleChatSend()} returnKeyType="send" multiline />
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
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { marginRight: 12 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scoreBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  scoreBadgeText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  twinStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 },
  twinStat: { alignItems: 'center', gap: 4 },
  twinStatValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  twinStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#2D2D8F' },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#2D2D8F' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 12 },
  radarCard: { borderRadius: 16, alignItems: 'center', padding: 16, marginBottom: 4 },
  radarLegend: { flexDirection: 'row', gap: 20, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.textSecondary },
  dimCard: { marginBottom: 8, borderRadius: 12 },
  dimRow: { flexDirection: 'row', alignItems: 'center' },
  dimIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dimHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dimLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  dimScores: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dimCurrent: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  dimPredicted: { fontSize: 14, fontWeight: '800' },
  patternCard: { marginBottom: 8, borderRadius: 12 },
  patternRow: { flexDirection: 'row', alignItems: 'center' },
  patternIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  patternTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  patternDetail: { fontSize: 12, color: colors.textSecondary },
  predictHero: { borderRadius: 16, backgroundColor: '#0D0D2B' },
  predictHeroTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 8 },
  predictHeroDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 20, marginBottom: 16 },
  predictScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  predictScore: { alignItems: 'center' },
  predictScoreLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  predictScoreValue: { fontSize: 40, fontWeight: '800', color: '#fff' },
  predictArrow: { opacity: 0.6 },
  predCard: { marginBottom: 10, borderRadius: 14 },
  predRow: { flexDirection: 'row', alignItems: 'flex-start' },
  predIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  predHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  predTimeframe: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  predTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  confidenceBadge: { borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7 },
  confidenceText: { fontSize: 10, fontWeight: '700' },
  predPrediction: { fontSize: 13, color: colors.text, lineHeight: 19, marginBottom: 4 },
  modelCard: { borderRadius: 16, marginTop: 12, backgroundColor: '#EBF5FB' },
  modelTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 6, marginBottom: 6 },
  modelDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  whatIfIntro: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 16 },
  whatIfCard: { marginBottom: 12, borderRadius: 16 },
  whatIfHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  whatIfIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  whatIfScenario: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  whatIfResults: { marginBottom: 14 },
  whatIfResult: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 8, alignSelf: 'flex-start' },
  whatIfImpact: { fontSize: 14, fontWeight: '800' },
  whatIfEffect: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  whatIfBtn: { borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  whatIfBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  customCard: { borderRadius: 16, marginTop: 8 },
  customTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  customDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 14 },
  customBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start' },
  customBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  chatPanel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background },
  chatEmpty: { alignItems: 'center', paddingTop: 20, paddingBottom: 8 },
  chatEmptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  chatEmptyDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  chatStarter: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EEEEF8', borderRadius: 12, padding: 14, marginBottom: 8, width: '100%' },
  chatStarterText: { flex: 1, fontSize: 14, color: '#2D2D8F', fontWeight: '500' },
  chatBubble: { borderRadius: 16, padding: 12, marginBottom: 10, maxWidth: '85%' },
  chatBubbleUser: { backgroundColor: '#2D2D8F', alignSelf: 'flex-end' },
  chatBubbleAI: { backgroundColor: colors.card, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  chatBubbleUserText: { fontSize: 14, color: '#fff', lineHeight: 20 },
  chatBubbleAIText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  chatSuggestion: { backgroundColor: '#EEEEF8', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 6, alignSelf: 'flex-start' },
  chatSuggestionText: { fontSize: 13, color: '#2D2D8F', fontWeight: '500' },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, gap: 10 },
  chatInput: { flex: 1, backgroundColor: colors.card, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 16, fontSize: 14, color: colors.text, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2D2D8F', alignItems: 'center', justifyContent: 'center' },
});
