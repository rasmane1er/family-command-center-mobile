import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useFamilyStore } from '../../store/useFamilyStore';

const REWARD_STORE = [
  { id: 'r1', name: 'Extra Screen Time', description: '30 min of extra screen time', cost: 100, icon: 'phone-portrait', color: '#8E44AD', bg: '#F5EEF8' },
  { id: 'r2', name: 'Choose Dinner', description: 'Pick the family dinner tonight', cost: 150, icon: 'restaurant', color: '#F5A623', bg: '#FEF3E2' },
  { id: 'r3', name: 'Stay Up Late', description: '1 hour past bedtime', cost: 200, icon: 'moon', color: '#2C3E50', bg: '#EAECEE' },
  { id: 'r4', name: 'Movie Night Pick', description: 'You choose the movie', cost: 250, icon: 'film', color: '#E74C3C', bg: '#FDEDEC' },
  { id: 'r5', name: 'Ice Cream Trip', description: 'Family ice cream outing', cost: 300, icon: 'ice-cream', color: '#E91E63', bg: '#FCE4EC' },
  { id: 'r6', name: 'No Chores Day', description: 'Skip all chores for one day', cost: 400, icon: 'happy', color: '#27AE60', bg: '#D5F5E3' },
  { id: 'r7', name: 'Sleepover', description: 'Have a friend sleep over', cost: 500, icon: 'people', color: '#2980B9', bg: '#D6EAF8' },
  { id: 'r8', name: 'Game Purchase', description: '$10 game or app', cost: 750, icon: 'game-controller', color: '#9B59B6', bg: '#EBF5FB' },
];

const ACHIEVEMENT_BADGES = [
  { id: 'a1', name: 'Task Star', description: 'Complete 10 tasks', icon: 'star', color: '#F5A623', earned: true },
  { id: 'a2', name: 'Team Player', description: 'Help a sibling', icon: 'people', color: '#27AE60', earned: true },
  { id: 'a3', name: 'Early Bird', description: 'Ready on time 5 days', icon: 'sunny', color: '#F39C12', earned: false },
  { id: 'a4', name: 'Scholar', description: 'All A\'s on report card', icon: 'school', color: '#2980B9', earned: false },
  { id: 'a5', name: 'Helper Hero', description: 'Help with dinner 7 days', icon: 'restaurant', color: '#E74C3C', earned: false },
  { id: 'a6', name: 'Saver', description: 'Save 500 points', icon: 'wallet', color: '#8E44AD', earned: false },
];

export function RewardsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'store' | 'achievements' | 'history'>('store');
  const members = useFamilyStore((s) => s.members);
  const memberId = route?.params?.memberId;
  const role = route?.params?.role;
  const rewards = useFamilyStore((s) => s.rewards);
  const achievements = useFamilyStore((s) => s.achievements);
  const updateMember = useFamilyStore((s) => s.updateMember);

  const children = members.filter((m) => m.role === 'child');

const visibleChildren =
  role === 'child' && memberId
    ? children.filter((child) => child.id === memberId)
    : children;

const activeChild =
  visibleChildren.find((c) => c.id === selectedChild) || visibleChildren[0];

  const nextLevelPoints = activeChild ? (activeChild.level || 1) * 500 : 500;
  const levelProgress = activeChild ? (activeChild.points % 500) / 500 : 0;

  const handleRedeem = (reward: typeof REWARD_STORE[0]) => {
    if (!activeChild) return;
    if ((activeChild.points || 0) < reward.cost) {
      Alert.alert('Not enough points!', `You need ${reward.cost - (activeChild.points || 0)} more points to redeem this reward.`);
      return;
    }
    Alert.alert(
      `Redeem "${reward.name}"?`,
      `This will cost ${reward.cost} points. Current balance: ${activeChild.points} points.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem!',
          onPress: () => {
            updateMember(activeChild.id, { points: (activeChild.points || 0) - reward.cost });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('🎉 Redeemed!', `${activeChild.name} redeemed "${reward.name}"! ${reward.cost} points deducted.`);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#F5A623', '#E67E22']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Rewards Center</Text>
          <Pressable style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Child selector */}
        {role !== 'child' && visibleChildren.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childScroll}>
            {visibleChildren.map((child) => (
              <Pressable
                key={child.id}
                onPress={() => setSelectedChild(child.id)}
                style={[styles.childChip, (selectedChild === child.id || (!selectedChild && children[0].id === child.id)) && styles.childChipActive]}
              >
                <View style={[styles.childAvatar, { backgroundColor: child.avatarColor + '30' }]}>
                  <Text style={styles.childAvatarText}>{child.name.charAt(0)}</Text>
                </View>
                <Text style={styles.childName}>{child.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Points display */}
        {activeChild && (
          <View style={styles.pointsCard}>
            <View style={styles.pointsLeft}>
              <View style={styles.trophyBg}>
                <Ionicons name="trophy" size={26} color={colors.secondary} />
              </View>
              <View>
                <Text style={styles.pointsValue}>{(activeChild.points || 0).toLocaleString()}</Text>
                <Text style={styles.pointsLabel}>Points available</Text>
              </View>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelLabel}>Level</Text>
              <Text style={styles.levelValue}>{activeChild.level || 1}</Text>
            </View>
          </View>
        )}
        {activeChild && (
          <View style={styles.levelProgress}>
            <Text style={styles.levelProgressText}>Level {(activeChild.level || 1) + 1} in {nextLevelPoints - (activeChild.points % 500)} pts</Text>
            <ProgressBar progress={levelProgress} color="#fff" height={6} />
          </View>
        )}
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['store', 'achievements', 'history'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {activeTab === 'store' && (
          <>
            <View style={styles.storeGrid}>
              {REWARD_STORE.map((reward) => {
                const canAfford = (activeChild?.points || 0) >= reward.cost;
                return (
                  <Pressable key={reward.id} onPress={() => handleRedeem(reward)} style={[styles.rewardCard, { backgroundColor: reward.bg, opacity: canAfford ? 1 : 0.6 }]}>
                    <View style={[styles.rewardIcon, { backgroundColor: reward.color + '20' }]}>
                      <Ionicons name={reward.icon as any} size={28} color={reward.color} />
                    </View>
                    <Text style={styles.rewardName}>{reward.name}</Text>
                    <Text style={styles.rewardDesc}>{reward.description}</Text>
                    <View style={styles.rewardCost}>
                      <Ionicons name="star" size={12} color={colors.secondary} />
                      <Text style={[styles.rewardCostText, { color: canAfford ? colors.secondary : colors.textMuted }]}>{reward.cost} pts</Text>
                    </View>
                    {!canAfford && (
                      <View style={styles.lockedOverlay}>
                        <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {activeTab === 'achievements' && (
          <View style={styles.achievementsGrid}>
            {ACHIEVEMENT_BADGES.map((badge) => (
              <View key={badge.id} style={[styles.badgeCard, !badge.earned && styles.badgeCardLocked]}>
                <View style={[styles.badgeIcon, { backgroundColor: badge.earned ? badge.color + '20' : '#F0F0F0' }]}>
                  <Ionicons name={badge.icon as any} size={30} color={badge.earned ? badge.color : colors.textMuted} />
                  {!badge.earned && (
                    <View style={styles.badgeLock}>
                      <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
                    </View>
                  )}
                </View>
                <Text style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}>{badge.name}</Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'history' && (
          <>
            {rewards.length > 0 ? (
              rewards.map((reward) => (
                <Card key={reward.id} style={styles.historyCard} variant="elevated">
                  <View style={styles.historyRow}>
                    <Ionicons name="gift" size={22} color={colors.secondary} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.historyName}>{reward.title}</Text>
                      <Text style={styles.historyCost}>{reward.pointsCost} points</Text>
                    </View>
                    <Badge label={reward.isRedeemed ? 'Redeemed' : 'Available'} variant={reward.isRedeemed ? 'neutral' : 'success'} size="sm" />
                  </View>
                </Card>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={60} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No rewards yet</Text>
                <Text style={styles.emptyDesc}>Complete tasks to earn points and redeem rewards!</Text>
              </View>
            )}
          </>
        )}

        {visibleChildren.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={60} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No children added</Text>
            <Text style={styles.emptyDesc}>Add children in Family Profiles to use the rewards system</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  settingsBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  childScroll: { marginBottom: 14 },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, paddingVertical: 8, paddingHorizontal: 14, marginRight: 10 },
  childChipActive: { backgroundColor: '#fff' },
  childAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  childAvatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  childName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  pointsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 14, marginBottom: 12 },
  pointsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trophyBg: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  pointsValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  pointsLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  levelBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8 },
  levelLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  levelValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  levelProgress: { gap: 6 },
  levelProgressText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: colors.secondary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.secondary },
  content: { padding: 16 },
  storeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  rewardCard: { width: '47%', borderRadius: 16, padding: 14, alignItems: 'center', position: 'relative' },
  rewardIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  rewardName: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 4 },
  rewardDesc: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginBottom: 8 },
  rewardCost: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardCostText: { fontSize: 13, fontWeight: '700' },
  lockedOverlay: { position: 'absolute', top: 10, right: 10 },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: { width: '30%', alignItems: 'center', gap: 6, padding: 10 },
  badgeCardLocked: { opacity: 0.5 },
  badgeIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badgeLock: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#E0E0E0', borderRadius: 8, padding: 2 },
  badgeName: { fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' },
  badgeNameLocked: { color: colors.textMuted },
  badgeDesc: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  historyCard: { marginBottom: 8, borderRadius: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
  historyName: { fontSize: 14, fontWeight: '700', color: colors.text },
  historyCost: { fontSize: 12, color: colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});
