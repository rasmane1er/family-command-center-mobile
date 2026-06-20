import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useWealthStore } from '../../store/useWealthStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const METRICS = [
  { key: 'helpfulness', label: 'Helpfulness', icon: 'hand-right', color: '#27AE60' },
  { key: 'taskCompletion', label: 'Task Completion', icon: 'checkbox', color: '#2980B9' },
  { key: 'teamwork', label: 'Teamwork', icon: 'people', color: '#8E44AD' },
  { key: 'reliability', label: 'Reliability', icon: 'shield-checkmark', color: '#E74C3C' },
  { key: 'kindness', label: 'Kindness', icon: 'heart', color: '#E91E63' },
] as const;

const LEADERBOARD_REWARDS = [
  { rank: 1, icon: '🥇', bonus: '+50 pts', label: 'Family Champion' },
  { rank: 2, icon: '🥈', bonus: '+30 pts', label: 'Outstanding Member' },
  { rank: 3, icon: '🥉', bonus: '+15 pts', label: 'Great Contributor' },
  { rank: 4, icon: '🏅', bonus: '+5 pts', label: 'Team Player' },
];

export function ReputationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const { reputationScores, seedDemoData } = useWealthStore();
  const members = useFamilyStore((s) => s.members);

  if (reputationScores.length === 0) seedDemoData();

  const sorted = [...reputationScores].sort((a, b) => b.overall - a.overall);
  const getMember = (id: string) => members.find((m) => m.id === id);
  const selectedScore = reputationScores.find((s) => s.memberId === (selectedMember ?? sorted[0]?.memberId));
  const activeMember = getMember(selectedMember ?? sorted[0]?.memberId ?? '');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0D47A1', '#1565C0']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Family Reputation Score</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.headerSub}>Who's topping the family leaderboard this week?</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {sorted.map((score, i) => {
            const member = getMember(score.memberId);
            if (!member) return null;
            const isSelected = (selectedMember ?? sorted[0].memberId) === score.memberId;
            return (
              <Pressable
                key={score.memberId}
                onPress={() => setSelectedMember(score.memberId)}
                style={[styles.memberChip, isSelected && styles.memberChipActive]}
              >
                <Text style={styles.rankEmoji}>{LEADERBOARD_REWARDS[i]?.icon ?? '🏅'}</Text>
                <View style={[styles.chipAvatar, { backgroundColor: member.avatarColor + '40' }]}>
                  <Text style={[styles.chipInitial, { color: member.avatarColor }]}>{member.name.charAt(0)}</Text>
                </View>
                <Text style={[styles.chipName, isSelected && styles.chipNameActive]}>{member.name}</Text>
                <Text style={[styles.chipScore, isSelected && styles.chipScoreActive]}>{score.overall}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {selectedScore && activeMember && (
          <>
            <Card style={styles.profileCard} variant="elevated">
              <View style={styles.profileHeader}>
                <View style={[styles.profileAvatar, { backgroundColor: activeMember.avatarColor + '20' }]}>
                  <Text style={[styles.profileInitial, { color: activeMember.avatarColor }]}>{activeMember.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.profileName}>{activeMember.name}</Text>
                  <View style={styles.trendRow}>
                    <Ionicons
                      name={selectedScore.trend === 'up' ? 'trending-up' : selectedScore.trend === 'down' ? 'trending-down' : 'remove'}
                      size={16}
                      color={selectedScore.trend === 'up' ? colors.success : selectedScore.trend === 'down' ? colors.danger : colors.textMuted}
                    />
                    <Text style={styles.trendText}>{selectedScore.trend === 'up' ? 'Improving' : selectedScore.trend === 'down' ? 'Declining' : 'Stable'} this week</Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.overallScore}>{selectedScore.overall}</Text>
                  <Text style={styles.overallLabel}>Score</Text>
                </View>
              </View>

              <View style={styles.weeklyPoints}>
                <Ionicons name="star" size={16} color={colors.secondary} />
                <Text style={styles.weeklyPointsText}>{selectedScore.weeklyPoints} pts earned this week</Text>
              </View>

              {METRICS.map((m) => {
                const val = selectedScore[m.key as keyof typeof selectedScore] as number;
                return (
                  <View key={m.key} style={styles.metricRow}>
                    <View style={[styles.metricIcon, { backgroundColor: m.color + '15' }]}>
                      <Ionicons name={m.icon as any} size={14} color={m.color} />
                    </View>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                    <View style={styles.metricBarWrap}>
                      <ProgressBar progress={val / 100} color={m.color} height={6} />
                    </View>
                    <Text style={[styles.metricVal, { color: m.color }]}>{val}</Text>
                  </View>
                );
              })}
            </Card>

            <Text style={styles.sectionTitle}>Weekly Leaderboard</Text>
            {sorted.map((score, i) => {
              const member = getMember(score.memberId);
              if (!member) return null;
              const reward = LEADERBOARD_REWARDS[i];
              return (
                <Card key={score.memberId} style={styles.leaderRow} variant="elevated">
                  <Text style={styles.leaderRankIcon}>{reward?.icon ?? '🏅'}</Text>
                  <View style={[styles.leaderAvatar, { backgroundColor: member.avatarColor + '20' }]}>
                    <Text style={[styles.leaderInitial, { color: member.avatarColor }]}>{member.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.leaderName}>{member.name}</Text>
                    <Text style={styles.leaderReward}>{reward?.label} • {reward?.bonus}</Text>
                  </View>
                  <Text style={styles.leaderScore}>{score.overall}</Text>
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, marginRight: 10 },
  memberChipActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  rankEmoji: { fontSize: 16 },
  chipAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipInitial: { fontSize: 13, fontWeight: '800' },
  chipName: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  chipNameActive: { color: '#fff' },
  chipScore: { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.7)' },
  chipScoreActive: { color: '#fff' },
  content: { padding: 16 },
  profileCard: { marginBottom: 20, borderRadius: 16 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  profileInitial: { fontSize: 22, fontWeight: '800' },
  profileName: { fontSize: 18, fontWeight: '800', color: colors.text },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  trendText: { fontSize: 12, color: colors.textSecondary },
  overallScore: { fontSize: 36, fontWeight: '900', color: colors.primary, textAlign: 'center' },
  overallLabel: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  weeklyPoints: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.secondary + '10', borderRadius: 10, padding: 10, marginBottom: 16 },
  weeklyPointsText: { fontSize: 13, fontWeight: '700', color: colors.text },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  metricIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { width: 110, fontSize: 12, color: colors.text, fontWeight: '600' },
  metricBarWrap: { flex: 1 },
  metricVal: { width: 30, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderRadius: 12 },
  leaderRankIcon: { fontSize: 22, marginRight: 8 },
  leaderAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  leaderInitial: { fontSize: 16, fontWeight: '800' },
  leaderName: { fontSize: 14, fontWeight: '700', color: colors.text },
  leaderReward: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  leaderScore: { fontSize: 22, fontWeight: '800', color: colors.primary },
});
