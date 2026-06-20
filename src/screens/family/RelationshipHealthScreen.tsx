import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useFamilyStore } from '../../store/useFamilyStore';

const RELATIONSHIP_PAIRS = [
  { pair: ['member-1', 'member-2'], label: 'Marcus & Sarah', score: 88, trend: 'up', icon: 'heart', color: '#E74C3C', checkIns: 12, lastActivity: 'Date night 3 days ago' },
  { pair: ['member-1', 'member-3'], label: 'Marcus & Aiden', score: 74, trend: 'stable', icon: 'basketball', color: '#F5A623', checkIns: 8, lastActivity: 'Basketball game last week' },
  { pair: ['member-2', 'member-4'], label: 'Sarah & Lily', score: 95, trend: 'up', icon: 'flower', color: '#E91E63', checkIns: 15, lastActivity: 'Baking session yesterday' },
  { pair: ['member-3', 'member-4'], label: 'Aiden & Lily', score: 68, trend: 'down', icon: 'game-controller', color: '#8E44AD', checkIns: 5, lastActivity: 'Movie night 5 days ago' },
  { pair: ['member-1', 'member-4'], label: 'Marcus & Lily', score: 91, trend: 'up', icon: 'musical-note', color: '#2980B9', checkIns: 10, lastActivity: 'Music listening session today' },
  { pair: ['member-2', 'member-3'], label: 'Sarah & Aiden', score: 79, trend: 'up', icon: 'book', color: '#27AE60', checkIns: 9, lastActivity: 'Homework help yesterday' },
];

const LOVE_LANGUAGES = [
  { member: 'Marcus', primary: 'Acts of Service', secondary: 'Quality Time', icon: 'construct', color: '#2980B9' },
  { member: 'Sarah', primary: 'Words of Affirmation', secondary: 'Physical Touch', icon: 'chatbubble-ellipses', color: '#E91E63' },
  { member: 'Aiden', primary: 'Quality Time', secondary: 'Gifts', icon: 'people', color: '#F5A623' },
  { member: 'Lily', primary: 'Physical Touch', secondary: 'Acts of Service', icon: 'hand-left', color: '#8E44AD' },
];

const BONDING_SUGGESTIONS = [
  { activity: 'Family Game Night', duration: '2 hrs', members: 'All', icon: 'game-controller', color: '#8E44AD', points: 80 },
  { activity: 'Marcus + Aiden: Basketball', duration: '1 hr', members: 'Marcus & Aiden', icon: 'basketball', color: '#F5A623', points: 60 },
  { activity: 'Sarah + Lily: Art Project', duration: '1.5 hrs', members: 'Sarah & Lily', icon: 'color-palette', color: '#E91E63', points: 70 },
  { activity: 'Family Walk', duration: '45 min', members: 'All', icon: 'walk', color: '#27AE60', points: 50 },
];

export function RelationshipHealthScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'bonds' | 'languages' | 'activities'>('bonds');
  const members = useFamilyStore((s) => s.members);

  const overallHealth = Math.round(RELATIONSHIP_PAIRS.reduce((s, r) => s + r.score, 0) / RELATIONSHIP_PAIRS.length);

  const getScoreColor = (score: number) =>
    score >= 85 ? colors.success : score >= 70 ? colors.warning : colors.danger;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#880E4F', '#E91E63']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Relationship Health</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{overallHealth}</Text>
          <Text style={styles.scoreLabel}>Family Bond Score</Text>
        </View>
        <View style={styles.trendRow}>
          <Ionicons name="trending-up" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={styles.trendText}>+4 points this week — relationships are thriving!</Text>
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['bonds', 'languages', 'activities'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'bonds' ? 'Bond Scores' : tab === 'languages' ? 'Love Languages' : 'Activities'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {activeTab === 'bonds' && RELATIONSHIP_PAIRS.map((rel, i) => (
          <Card key={i} style={styles.relCard} variant="elevated">
            <View style={styles.relHeader}>
              <View style={[styles.relIcon, { backgroundColor: rel.color + '15' }]}>
                <Ionicons name={rel.icon as any} size={20} color={rel.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.relLabel}>{rel.label}</Text>
                <Text style={styles.relActivity}>{rel.lastActivity}</Text>
              </View>
              <View style={styles.relScoreBlock}>
                <Text style={[styles.relScore, { color: getScoreColor(rel.score) }]}>{rel.score}</Text>
                <Ionicons
                  name={rel.trend === 'up' ? 'trending-up' : rel.trend === 'down' ? 'trending-down' : 'remove'}
                  size={14}
                  color={rel.trend === 'up' ? colors.success : rel.trend === 'down' ? colors.danger : colors.textMuted}
                />
              </View>
            </View>
            <ProgressBar progress={rel.score / 100} color={rel.color} height={5} />
            <Text style={styles.checkInText}>{rel.checkIns} quality moments this month</Text>
          </Card>
        ))}

        {activeTab === 'languages' && LOVE_LANGUAGES.map((ll, i) => (
          <Card key={i} style={styles.llCard} variant="elevated">
            <View style={styles.llHeader}>
              <View style={[styles.llIcon, { backgroundColor: ll.color + '15' }]}>
                <Ionicons name={ll.icon as any} size={22} color={ll.color} />
              </View>
              <Text style={styles.llName}>{ll.member}</Text>
            </View>
            <View style={styles.llBadges}>
              <View style={[styles.llPrimary, { backgroundColor: ll.color + '15', borderColor: ll.color + '40' }]}>
                <Ionicons name="star" size={12} color={ll.color} />
                <Text style={[styles.llPrimaryText, { color: ll.color }]}>{ll.primary}</Text>
              </View>
              <View style={styles.llSecondaryBadge}>
                <Text style={styles.llSecondaryText}>{ll.secondary}</Text>
              </View>
            </View>
          </Card>
        ))}

        {activeTab === 'activities' && BONDING_SUGGESTIONS.map((act, i) => (
          <Card key={i} style={styles.actCard} variant="elevated">
            <View style={styles.actHeader}>
              <View style={[styles.actIcon, { backgroundColor: act.color + '15' }]}>
                <Ionicons name={act.icon as any} size={22} color={act.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actTitle}>{act.activity}</Text>
                <Text style={styles.actMeta}>{act.members} • {act.duration}</Text>
              </View>
              <View style={styles.pointsBadge}>
                <Ionicons name="star" size={12} color={colors.secondary} />
                <Text style={styles.pointsText}>{act.points}</Text>
              </View>
            </View>
            <Pressable style={[styles.scheduleBtn, { backgroundColor: act.color }]}>
              <Text style={styles.scheduleBtnText}>Schedule Activity</Text>
            </Pressable>
          </Card>
        ))}
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
  scoreCircle: { alignItems: 'center', marginBottom: 10 },
  scoreValue: { fontSize: 64, fontWeight: '900', color: '#fff', lineHeight: 72 },
  scoreLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  trendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  trendText: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#E91E63' },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#E91E63' },
  content: { padding: 16 },
  relCard: { marginBottom: 10, borderRadius: 14 },
  relHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  relIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  relLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  relActivity: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  relScoreBlock: { alignItems: 'center' },
  relScore: { fontSize: 22, fontWeight: '800' },
  checkInText: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  llCard: { marginBottom: 10, borderRadius: 14 },
  llHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  llIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  llName: { fontSize: 16, fontWeight: '700', color: colors.text },
  llBadges: { flexDirection: 'row', gap: 8 },
  llPrimary: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1 },
  llPrimaryText: { fontSize: 12, fontWeight: '700' },
  llSecondaryBadge: { backgroundColor: colors.background, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 },
  llSecondaryText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  actCard: { marginBottom: 10, borderRadius: 14 },
  actHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  actIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  actMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pointsText: { fontSize: 14, fontWeight: '800', color: colors.secondary },
  scheduleBtn: { borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  scheduleBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
