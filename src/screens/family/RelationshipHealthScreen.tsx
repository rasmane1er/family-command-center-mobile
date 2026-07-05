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
import { useRelationshipHealth } from '../../hooks/useRelationshipHealth';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';

// Static inspirational activity ideas — not personal data, so unlike the
// bond scores and love languages below, these are fine to keep as generic
// suggestions (same category as the static "Tips" lists used elsewhere in
// the app). The "members" field for the first suggestion is filled in with
// the real lowest-scoring pair at render time.
const BONDING_SUGGESTIONS = [
  { activity: 'Family Game Night', duration: '2 hrs', members: 'All', icon: 'game-controller', color: '#8E44AD', points: 80 },
  { activity: 'One-on-One Outing', duration: '1 hr', members: '', icon: 'walk', color: '#F5A623', points: 60 },
  { activity: 'Shared Creative Project', duration: '1.5 hrs', members: 'All', icon: 'color-palette', color: '#E91E63', points: 70 },
  { activity: 'Family Walk', duration: '45 min', members: 'All', icon: 'walk', color: '#27AE60', points: 50 },
];

const TREND_TEXT: Record<'up' | 'down' | 'stable', string> = {
  up: 'Shared activity is up over the last two weeks.',
  down: 'Shared activity has slowed over the last two weeks.',
  stable: 'Shared activity is steady over the last two weeks.',
};

const TREND_ICON: Record<'up' | 'down' | 'stable', keyof typeof Ionicons.glyphMap> = {
  up: 'trending-up',
  down: 'trending-down',
  stable: 'remove',
};

export function RelationshipHealthScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'bonds' | 'languages' | 'activities'>('bonds');
  const members = useFamilyStore((s) => s.members);
  const { bonds, overallHealth, overallTrend } = useRelationshipHealth();

  const getScoreColor = (score: number) =>
    score >= 85 ? colors.success : score >= 70 ? colors.warning : colors.danger;

  const screenHeader = (
    <LinearGradient colors={['#880E4F', '#E91E63']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('relationship.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.scoreCircle}>
        <Text style={styles.scoreValue}>{overallHealth}</Text>
        <Text style={styles.scoreLabel}>Family Bond Score</Text>
      </View>
      <View style={styles.trendRow}>
        <Ionicons name={TREND_ICON[overallTrend]} size={16} color="rgba(255,255,255,0.8)" />
        <Text style={styles.trendText}>{TREND_TEXT[overallTrend]}</Text>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#880E4F', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('relationship.title')}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const lowestBond = bonds.length > 0 ? bonds[bonds.length - 1] : null;
  const suggestions = BONDING_SUGGESTIONS.map((act) =>
    act.members === '' ? { ...act, members: lowestBond ? lowestBond.label : 'Just the two of you' } : act
  );

  const tabs = (
    <View style={styles.tabs}>
      {(['bonds', 'languages', 'activities'] as const).map((tab) => (
        <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {tab === 'bonds' ? 'Bond Scores' : tab === 'languages' ? 'Love Languages' : 'Activities'}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <>
      <StatusBar style="light" />
      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <>
            {tabs}
            <ScrollView
              onScroll={onScroll}
              onScrollEndDrag={onScrollEndDrag}
              onMomentumScrollEnd={onMomentumScrollEnd}
              scrollEventThrottle={scrollEventThrottle}
              contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
            >
        {activeTab === 'bonds' && bonds.length === 0 && (
          <Text style={styles.emptyText}>Add another family member to start tracking relationships.</Text>
        )}

        {activeTab === 'bonds' && bonds.map((bond, i) => (
          <Card key={i} style={styles.relCard} variant="elevated">
            <View style={styles.relHeader}>
              <View style={[styles.relIcon, { backgroundColor: bond.color + '15' }]}>
                <Ionicons name="heart" size={20} color={bond.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.relLabel}>{bond.label}</Text>
                <Text style={styles.relActivity}>{bond.lastActivity}</Text>
              </View>
              <View style={styles.relScoreBlock}>
                <Text style={[styles.relScore, { color: getScoreColor(bond.score) }]}>{bond.score}</Text>
                <Ionicons
                  name={TREND_ICON[bond.trend]}
                  size={14}
                  color={bond.trend === 'up' ? colors.success : bond.trend === 'down' ? colors.danger : colors.textMuted}
                />
              </View>
            </View>
            <ProgressBar progress={bond.score / 100} color={bond.color} height={5} />
            <Text style={styles.checkInText}>{bond.sharedCount} shared {bond.sharedCount === 1 ? 'moment' : 'moments'} tracked</Text>
          </Card>
        ))}

        {activeTab === 'languages' && members.map((member) => (
          <Card key={member.id} style={styles.llCard} variant="elevated">
            <Pressable
              style={styles.llHeader}
              onPress={() => navigation.navigate('MemberDetails', { memberId: member.id })}
            >
              <View style={[styles.llIcon, { backgroundColor: member.avatarColor + '15' }]}>
                <Ionicons name="person" size={22} color={member.avatarColor} />
              </View>
              <Text style={styles.llName}>{member.name}</Text>
            </Pressable>
            <View style={styles.llBadges}>
              {member.loveLanguage ? (
                <View style={[styles.llPrimary, { backgroundColor: member.avatarColor + '15', borderColor: member.avatarColor + '40' }]}>
                  <Ionicons name="star" size={12} color={member.avatarColor} />
                  <Text style={[styles.llPrimaryText, { color: member.avatarColor }]}>{member.loveLanguage}</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.llSecondaryBadge}
                  onPress={() => navigation.navigate('MemberDetails', { memberId: member.id })}
                >
                  <Text style={styles.llSecondaryText}>Not set — tap to add</Text>
                </Pressable>
              )}
            </View>
          </Card>
        ))}

        {activeTab === 'activities' && suggestions.map((act, i) => (
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
            <Pressable
              onPress={() => Alert.alert('Schedule Activity', `Add "${act.activity}" to your calendar?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Calendar', onPress: () => navigation.navigate('Calendar') },
              ])}
              style={[styles.scheduleBtn, { backgroundColor: act.color }]}
            >
              <Text style={styles.scheduleBtnText}>Schedule Activity</Text>
            </Pressable>
          </Card>
        ))}
            </ScrollView>
          </>
        )}
      </CollapsibleHeader>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
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
  relScore: { fontSize: 18, fontWeight: '800' },
  checkInText: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 },
  llCard: { marginBottom: 10, borderRadius: 14 },
  llHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  llIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  llName: { fontSize: 16, fontWeight: '700', color: colors.text },
  llBadges: { flexDirection: 'row', gap: 8 },
  llPrimary: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1 },
  llPrimaryText: { fontSize: 12, fontWeight: '700' },
  llSecondaryBadge: { backgroundColor: colors.background, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 },
  llSecondaryText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  actCard: { marginBottom: 10, borderRadius: 14 },
  actHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  actIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  actMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pointsText: { fontSize: 14, fontWeight: '800', color: colors.secondary },
  scheduleBtn: { borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  scheduleBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
