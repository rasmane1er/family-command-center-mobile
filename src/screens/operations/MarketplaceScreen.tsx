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

const CATEGORY_CONFIG: Record<string, { color: string; icon: string }> = {
  chores: { color: '#27AE60', icon: 'home' },
  skills: { color: '#2980B9', icon: 'school' },
  items: { color: '#F5A623', icon: 'bag' },
  favors: { color: '#E74C3C', icon: 'heart' },
  lessons: { color: '#8E44AD', icon: 'book' },
};

export function MarketplaceScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | string>('all');
  const [activeTab, setActiveTab] = useState<'available' | 'claimed' | 'history'>('available');
  const { listings, claimListing, completeListing, seedDemoData } = useAutomationStore();
  const members = useFamilyStore((s) => s.members);

  if (listings.length === 0) seedDemoData();

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown';

  const available = listings.filter((l) => l.isAvailable);
  const claimed = listings.filter((l) => !l.isAvailable && !l.completedAt);
  const completed = listings.filter((l) => !!l.completedAt);

  const displayList = activeTab === 'available' ? available : activeTab === 'claimed' ? claimed : completed;

  const handleClaim = (id: string, title: string, value: number) => {
    Alert.alert(
      `Claim "${title}"?`,
      `This task is worth ${value} points. Complete it to earn your reward!`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Claim!', onPress: () => claimListing(id, 'member-3') },
      ]
    );
  };

  const totalPoints = listings.filter((l) => l.isAvailable).reduce((s, l) => s + l.pointsValue, 0);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#E65100', '#F57C00']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Family Marketplace</Text>
          <Pressable style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.marketStats}>
          <View style={styles.mStat}>
            <Text style={styles.mStatVal}>{available.length}</Text>
            <Text style={styles.mStatLabel}>Available</Text>
          </View>
          <View style={styles.mStat}>
            <Text style={styles.mStatVal}>{totalPoints}</Text>
            <Text style={styles.mStatLabel}>Points Available</Text>
          </View>
          <View style={styles.mStat}>
            <Text style={styles.mStatVal}>{completed.length}</Text>
            <Text style={styles.mStatLabel}>Completed</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {['all', 'chores', 'skills', 'lessons', 'favors'].map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setFilter(cat)}
              style={[styles.filterChip, filter === cat && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === cat && styles.filterTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['available', 'claimed', 'history'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'available' ? `Available (${available.length})` : tab === 'claimed' ? `In Progress (${claimed.length})` : `Done (${completed.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {displayList
          .filter((l) => filter === 'all' || l.category === filter)
          .map((listing) => {
            const cfg = CATEGORY_CONFIG[listing.category] ?? { color: '#95A5A6', icon: 'ellipsis-horizontal' };
            return (
              <Card key={listing.id} style={styles.listingCard} variant="elevated">
                <View style={styles.listingHeader}>
                  <View style={[styles.listingIcon, { backgroundColor: cfg.color + '15' }]}>
                    <Ionicons name={listing.icon as any} size={24} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.listingTitle}>{listing.title}</Text>
                    <Text style={styles.listingDesc}>{listing.description}</Text>
                    <Text style={styles.listingCreator}>Posted by {getMemberName(listing.createdBy)}</Text>
                  </View>
                  <View style={styles.pointsBlock}>
                    <Ionicons name="star" size={14} color={colors.secondary} />
                    <Text style={styles.pointsVal}>{listing.pointsValue}</Text>
                    <Text style={styles.pointsLabel}>pts</Text>
                  </View>
                </View>

                <View style={styles.tagsRow}>
                  {listing.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                  <Badge label={listing.category} variant="neutral" size="sm" />
                </View>

                {listing.isAvailable && (
                  <Pressable
                    onPress={() => handleClaim(listing.id, listing.title, listing.pointsValue)}
                    style={[styles.claimBtn, { backgroundColor: cfg.color }]}
                  >
                    <Ionicons name="hand-left" size={14} color="#fff" />
                    <Text style={styles.claimBtnText}>Claim This Task</Text>
                  </Pressable>
                )}

                {listing.claimedBy && !listing.completedAt && (
                  <View style={styles.claimedBanner}>
                    <Ionicons name="person" size={14} color={colors.warning} />
                    <Text style={styles.claimedText}>Claimed by {getMemberName(listing.claimedBy)}</Text>
                    <Pressable onPress={() => completeListing(listing.id)} style={styles.doneBtn}>
                      <Text style={styles.doneBtnText}>Mark Done</Text>
                    </Pressable>
                  </View>
                )}

                {listing.completedAt && (
                  <View style={styles.completedBanner}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={styles.completedText}>Completed by {listing.claimedBy ? getMemberName(listing.claimedBy) : 'someone'}</Text>
                  </View>
                )}
              </Card>
            );
          })}

        {displayList.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={60} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyDesc}>Post tasks, skills, or favors to earn points as a family.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  marketStats: { flexDirection: 'row', justifyContent: 'space-around' },
  mStat: { alignItems: 'center' },
  mStatVal: { fontSize: 26, fontWeight: '800', color: '#fff' },
  mStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8 },
  filterChipActive: { backgroundColor: '#fff' },
  filterText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  filterTextActive: { color: '#F57C00' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#F57C00' },
  tabText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#F57C00' },
  content: { padding: 16 },
  listingCard: { marginBottom: 12, borderRadius: 14 },
  listingHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  listingIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  listingTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  listingDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  listingCreator: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  pointsBlock: { alignItems: 'center' },
  pointsVal: { fontSize: 20, fontWeight: '800', color: colors.secondary },
  pointsLabel: { fontSize: 10, color: colors.textMuted },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: { backgroundColor: colors.background, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  tagText: { fontSize: 11, color: colors.textMuted },
  claimBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 10 },
  claimBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  claimedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warning + '15', borderRadius: 10, padding: 10 },
  claimedText: { flex: 1, fontSize: 12, color: colors.text },
  doneBtn: { backgroundColor: colors.success, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  doneBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  completedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.success + '10', borderRadius: 10, padding: 10 },
  completedText: { fontSize: 12, color: colors.success, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});
