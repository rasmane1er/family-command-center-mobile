import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
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

const { width } = Dimensions.get('window');

// Radar chart dimensions
const RADAR_SIZE = width - 80;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = RADAR_SIZE / 2 - 30;

const DIMENSIONS_CONFIG = [
  { label: 'Financial', value: 72, prediction: 78, icon: 'wallet', color: '#27AE60' },
  { label: 'Social', value: 85, prediction: 88, icon: 'people', color: '#2980B9' },
  { label: 'Health', value: 68, prediction: 75, icon: 'heart', color: '#E74C3C' },
  { label: 'Productivity', value: 79, prediction: 82, icon: 'checkmark-circle', color: '#F5A623' },
  { label: 'Happiness', value: 88, prediction: 91, icon: 'happy', color: '#8E44AD' },
];

const WHAT_IF_SCENARIOS = [
  { scenario: 'Cut dining out by 50%', impact: '+$340/month', effect: 'Reach Hawaii goal 4 months early', icon: 'restaurant', color: '#27AE60', positive: true },
  { scenario: 'Add 30min family exercise', impact: '+12 happiness points', effect: 'Reduce stress markers by 23%', icon: 'fitness', color: '#2980B9', positive: true },
  { scenario: 'Miss 2 weekly meetings', impact: '-8 communication score', effect: 'Conflict risk increases by 35%', icon: 'people', color: '#E74C3C', positive: false },
  { scenario: 'Automate bill payments', impact: '0 late fees ever', effect: 'Credit score up ~15 points', icon: 'card', color: '#F5A623', positive: true },
];

const PREDICTIONS = [
  { timeframe: '30 days', prediction: 'Task completion rate will hit 82% if current streak holds', confidence: 87, icon: 'checkmark-circle', color: '#27AE60' },
  { timeframe: '60 days', prediction: 'Hawaii vacation fund will be at 63% — on track for August goal', confidence: 91, icon: 'airplane', color: '#2980B9' },
  { timeframe: '90 days', prediction: 'Aiden\'s grades will improve with current homework habit', confidence: 74, icon: 'school', color: '#F5A623' },
  { timeframe: '6 months', prediction: 'Family net worth projected to reach $540k at current savings rate', confidence: 68, icon: 'trending-up', color: '#8E44AD' },
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

export function DigitalTwinScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'twin' | 'predict' | 'whatif'>('twin');
  const members = useFamilyStore((s) => s.members);
  const { monthlyIncome, monthlyExpenses } = useFinanceStore();

  const overallScore = Math.round(DIMENSIONS_CONFIG.reduce((s, d) => s + d.value, 0) / DIMENSIONS_CONFIG.length);
  const predictedScore = Math.round(DIMENSIONS_CONFIG.reduce((s, d) => s + d.prediction, 0) / DIMENSIONS_CONFIG.length);

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
      <LinearGradient colors={['#0D0D2B', '#1A1A4E', '#2D2D8F']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Family Digital Twin</Text>
            <Text style={styles.headerSub}>AI-powered simulation of your family's patterns</Text>
          </View>
          <View style={[styles.scoreBadge]}>
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
        {(['twin', 'predict', 'whatif'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'twin' ? '🧬 DNA' : t === 'predict' ? '🔮 Predict' : '💡 What-If'}
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
                {/* Grid circles */}
                {[0.25, 0.5, 0.75, 1].map((pct) => (
                  <Circle key={pct} cx={RADAR_CENTER} cy={RADAR_CENTER} r={RADAR_RADIUS * pct} fill="none" stroke="#E5E7EB" strokeWidth={1} />
                ))}
                {/* Grid lines to vertices */}
                {maxPoints.map((pt, i) => (
                  <Line key={i} x1={RADAR_CENTER} y1={RADAR_CENTER} x2={pt.x} y2={pt.y} stroke="#E5E7EB" strokeWidth={1} />
                ))}
                {/* Predicted polygon */}
                <Polygon
                  points={getPolygonPoints(predictedValues, RADAR_CENTER, RADAR_CENTER, RADAR_RADIUS)}
                  fill="#4EECD0"
                  fillOpacity={0.12}
                  stroke="#4EECD0"
                  strokeWidth={1.5}
                />
                {/* Current polygon */}
                <Polygon
                  points={getPolygonPoints(currentValues, RADAR_CENTER, RADAR_CENTER, RADAR_RADIUS)}
                  fill={colors.primary}
                  fillOpacity={0.2}
                  stroke={colors.primary}
                  strokeWidth={2}
                />
                {/* Labels */}
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
                    <Ionicons name={d.icon as any} size={18} color={d.color} />
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
                    <Ionicons name={p.icon as any} size={18} color={p.color} />
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
              <Text style={styles.predictHeroDesc}>Based on 90 days of behavioral data, your family is trending {predictedScore > overallScore ? 'upward' : 'downward'}. Current trajectory leads to a {predictedScore}/100 family score in 30 days.</Text>
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
                  <View style={[styles.predIcon, { backgroundColor: p.color + '20' }]}>
                    <Ionicons name={p.icon as any} size={18} color={p.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.predHeader}>
                      <Text style={styles.predTimeframe}>{p.timeframe}</Text>
                      <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceText}>{p.confidence}% confidence</Text>
                      </View>
                    </View>
                    <Text style={styles.predPrediction}>{p.prediction}</Text>
                    <ProgressBar progress={p.confidence / 100} color={p.color} height={3} />
                  </View>
                </View>
              </Card>
            ))}

            <Card variant="elevated" style={styles.modelCard}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={styles.modelTitle}>How the AI Model Works</Text>
              <Text style={styles.modelDesc}>The Family Digital Twin analyzes task completion rates, spending patterns, mood data, and behavioral history to build a predictive model unique to your family. Predictions improve as more data is collected.</Text>
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
                    <Ionicons name={s.icon as any} size={20} color={s.color} />
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
                <Pressable style={[styles.whatIfBtn, { backgroundColor: s.color }]}>
                  <Text style={styles.whatIfBtnText}>Apply This Change</Text>
                </Pressable>
              </Card>
            ))}

            <Card variant="elevated" style={styles.customCard}>
              <Text style={styles.customTitle}>Create Custom Scenario</Text>
              <Text style={styles.customDesc}>Tell the AI what you're planning and it will project the impact on your family's score, finances, and wellbeing.</Text>
              <Pressable style={styles.customBtn}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={styles.customBtnText}>Ask AI to Analyze</Text>
              </Pressable>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scoreBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  scoreBadgeText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  twinStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 },
  twinStat: { alignItems: 'center', gap: 4 },
  twinStatValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
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
  predHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  predTimeframe: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  confidenceBadge: { backgroundColor: '#EBF5FB', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7 },
  confidenceText: { fontSize: 10, color: '#2980B9', fontWeight: '700' },
  predPrediction: { fontSize: 13, color: colors.text, lineHeight: 19, marginBottom: 8 },
  modelCard: { borderRadius: 16, marginTop: 12, backgroundColor: '#EBF5FB' },
  modelTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 6, marginBottom: 6 },
  modelDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  whatIfIntro: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 16 },
  whatIfCard: { marginBottom: 12, borderRadius: 16 },
  whatIfHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
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
});
