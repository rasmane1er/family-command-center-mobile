import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { format, differenceInDays } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useTravelStore, Trip, ItineraryItemType } from '../../store/useTravelStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  planning: { label: 'Planning', color: '#F5A623', bg: '#FEF3E2', icon: 'map-outline' },
  upcoming: { label: 'Upcoming', color: '#2980B9', bg: '#EBF5FB', icon: 'calendar' },
  active: { label: 'Active', color: '#27AE60', bg: '#D5F5E3', icon: 'navigate' },
  completed: { label: 'Completed', color: '#8E44AD', bg: '#F5EEF8', icon: 'checkmark-circle' },
} as const;

const ITIN_TYPE_ICONS: Record<ItineraryItemType, { icon: string; color: string }> = {
  transport: { icon: 'airplane', color: '#2980B9' },
  accommodation: { icon: 'bed', color: '#8E44AD' },
  activity: { icon: 'bicycle', color: '#27AE60' },
  dining: { icon: 'restaurant', color: '#E67E22' },
  other: { icon: 'ellipsis-horizontal', color: colors.textSecondary },
};

function TripDetailModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'itinerary' | 'packing' | 'budget'>('itinerary');
  const { togglePackingItem } = useTravelStore();
  const members = useFamilyStore((s) => s.members);

  const getMember = (id?: string) => members.find((m) => m.id === id);
  const packedCount = trip.packingList.filter((p) => p.isPacked).length;
  const totalItems = trip.packingList.length;
  const budgetUsed = trip.budget > 0 ? trip.spent / trip.budget : 0;
  const itinTotal = trip.itinerary.reduce((sum, i) => sum + (i.cost ?? 0), 0);

  const sortedItinerary = [...trip.itinerary].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const itinByDate = sortedItinerary.reduce<Record<string, typeof sortedItinerary>>((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  const packingByCategory = trip.packingList.reduce<Record<string, typeof trip.packingList>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={[trip.color, trip.color + 'BB']} style={[styles.detailHeader, { paddingTop: insets.top + 12 }]}>
        <View style={styles.detailHeaderRow}>
          <Pressable onPress={onClose} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailTitle}>{trip.emoji} {trip.name}</Text>
            <Text style={styles.detailSub}>
              {trip.destination} · {format(new Date(trip.startDate), 'MMM d')} – {format(new Date(trip.endDate), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
        <View style={styles.detailStats}>
          <View style={styles.detailStat}>
            <Text style={styles.detailStatVal}>{differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1}</Text>
            <Text style={styles.detailStatLabel}>Days</Text>
          </View>
          <View style={styles.detailStatDiv} />
          <View style={styles.detailStat}>
            <Text style={styles.detailStatVal}>{trip.attendeeIds.length}</Text>
            <Text style={styles.detailStatLabel}>Travelers</Text>
          </View>
          <View style={styles.detailStatDiv} />
          <View style={styles.detailStat}>
            <Text style={styles.detailStatVal}>${trip.budget.toLocaleString()}</Text>
            <Text style={styles.detailStatLabel}>Budget</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.detailTabs}>
        {(['itinerary', 'packing', 'budget'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.detailTab, tab === t && styles.detailTabActive]}>
            <Text style={[styles.detailTabText, tab === t && { color: trip.color }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'packing' && totalItems > 0 ? ` (${packedCount}/${totalItems})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.detailContent, { paddingBottom: 100 }]}>
        {tab === 'itinerary' && (
          Object.entries(itinByDate).length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🗓️</Text>
              <Text style={styles.emptyTitle}>No itinerary yet</Text>
            </View>
          ) : (
            Object.entries(itinByDate).map(([date, items]) => (
              <View key={date}>
                <Text style={styles.itinDateHeader}>{format(new Date(date + 'T12:00:00'), 'EEEE, MMM d')}</Text>
                {items.map((item) => {
                  const cfg = ITIN_TYPE_ICONS[item.type];
                  return (
                    <Card key={item.id} style={styles.itinCard} variant="elevated">
                      <View style={styles.itinRow}>
                        <View style={styles.itinTimeCol}>
                          <Text style={styles.itinTime}>{item.time}</Text>
                        </View>
                        <View style={[styles.itinIcon, { backgroundColor: cfg.color + '15' }]}>
                          <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.itinTitle}>{item.title}</Text>
                          <Text style={styles.itinLocation}>{item.location}</Text>
                          {item.notes && <Text style={styles.itinNotes}>{item.notes}</Text>}
                        </View>
                        {item.cost != null && item.cost > 0 && (
                          <Text style={styles.itinCost}>${item.cost}</Text>
                        )}
                      </View>
                    </Card>
                  );
                })}
              </View>
            ))
          )
        )}

        {tab === 'packing' && (
          <>
            {totalItems > 0 && (
              <Card style={styles.packProgressCard} variant="elevated">
                <View style={styles.packProgressRow}>
                  <Text style={styles.packProgressLabel}>{packedCount} of {totalItems} items packed</Text>
                  <Text style={styles.packProgressPct}>{Math.round((packedCount / totalItems) * 100)}%</Text>
                </View>
                <ProgressBar progress={packedCount / totalItems} color={trip.color} height={8} style={{ marginTop: 8 }} />
              </Card>
            )}
            {Object.entries(packingByCategory).map(([cat, items]) => (
              <View key={cat}>
                <Text style={styles.packCatHeader}>{cat}</Text>
                {items.map((item) => (
                  <Pressable key={item.id} onPress={() => {
                    togglePackingItem(trip.id, item.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}>
                    <Card style={styles.packItem} variant="elevated">
                      <View style={styles.packItemRow}>
                        <View style={[styles.packCheck, item.isPacked && { backgroundColor: trip.color, borderColor: trip.color }]}>
                          {item.isPacked && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <Text style={[styles.packItemName, item.isPacked && styles.packItemDone]}>
                          {item.name}
                          {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                        </Text>
                        {item.assignedTo && (
                          <Text style={styles.packAssignee}>
                            {getMember(item.assignedTo)?.name?.split(' ')[0]}
                          </Text>
                        )}
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            ))}
            {totalItems === 0 && (
              <View style={styles.empty}>
                <Text style={{ fontSize: 48 }}>🧳</Text>
                <Text style={styles.emptyTitle}>Packing list empty</Text>
              </View>
            )}
          </>
        )}

        {tab === 'budget' && (
          <>
            <Card style={styles.budgetSummaryCard} variant="elevated">
              <Text style={styles.budgetTitle}>Budget Overview</Text>
              <View style={styles.budgetRow}>
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetVal}>${trip.budget.toLocaleString()}</Text>
                  <Text style={styles.budgetLabel}>Total Budget</Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetVal, { color: budgetUsed > 0.9 ? colors.danger : colors.success }]}>
                    ${trip.spent.toLocaleString()}
                  </Text>
                  <Text style={styles.budgetLabel}>Spent</Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetVal, { color: '#2980B9' }]}>${(trip.budget - trip.spent).toLocaleString()}</Text>
                  <Text style={styles.budgetLabel}>Remaining</Text>
                </View>
              </View>
              <ProgressBar progress={budgetUsed} color={budgetUsed > 0.9 ? colors.danger : trip.color} height={8} style={{ marginTop: 12 }} />
              <Text style={styles.budgetPctText}>{Math.round(budgetUsed * 100)}% of budget used</Text>
            </Card>

            {trip.itinerary.filter((i) => (i.cost ?? 0) > 0).length > 0 && (
              <>
                <Text style={styles.packCatHeader}>Itinerary Costs</Text>
                {trip.itinerary.filter((i) => (i.cost ?? 0) > 0).map((item) => {
                  const cfg = ITIN_TYPE_ICONS[item.type];
                  return (
                    <Card key={item.id} style={styles.txCard} variant="elevated">
                      <View style={styles.txRow}>
                        <View style={[styles.txIcon, { backgroundColor: cfg.color + '15' }]}>
                          <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                        </View>
                        <Text style={styles.txDesc}>{item.title}</Text>
                        <Text style={styles.txAmount}>${item.cost?.toLocaleString()}</Text>
                      </View>
                    </Card>
                  );
                })}
                <Card style={styles.txCard} variant="elevated">
                  <View style={styles.txRow}>
                    <View style={{ flex: 1 }}><Text style={[styles.txDesc, { fontWeight: '800' }]}>Total Planned</Text></View>
                    <Text style={[styles.txAmount, { fontWeight: '800', color: colors.primary }]}>${itinTotal.toLocaleString()}</Text>
                  </View>
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export function TravelPlanningScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [filter, setFilter] = useState<Trip['status'] | 'all'>('all');

  const { trips, deleteTrip, seedDemoData } = useTravelStore();
  const members = useFamilyStore((s) => s.members);

  if (trips.length === 0) seedDemoData();

  const getMember = (id: string) => members.find((m) => m.id === id);

  const filtered = filter === 'all' ? trips : trips.filter((t) => t.status === filter);
  const upcomingCount = trips.filter((t) => t.status === 'planning' || t.status === 'upcoming').length;

  if (selectedTrip) {
    const liveTrip = trips.find((t) => t.id === selectedTrip.id) ?? selectedTrip;
    return <TripDetailModal trip={liveTrip} onClose={() => setSelectedTrip(null)} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0E6655', '#1ABC9C']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Travel Planning</Text>
            <Text style={styles.headerSub}>{upcomingCount} upcoming trips</Text>
          </View>
          <Pressable style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['all', 'planning', 'upcoming', 'active', 'completed'] as const).map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : STATUS_CONFIG[f].label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 56 }}>✈️</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptyDesc}>Tap + to start planning your next family adventure!</Text>
          </View>
        )}

        {filtered.map((trip) => {
          const statusCfg = STATUS_CONFIG[trip.status];
          const daysUntil = trip.status !== 'completed' ? differenceInDays(new Date(trip.startDate), new Date()) : null;
          const duration = differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1;
          const budgetPct = trip.budget > 0 ? trip.spent / trip.budget : 0;
          const packedPct = trip.packingList.length > 0
            ? trip.packingList.filter((p) => p.isPacked).length / trip.packingList.length
            : 0;

          return (
            <Pressable key={trip.id} onLongPress={() => Alert.alert('Delete Trip', `Remove "${trip.name}"?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteTrip(trip.id) },
            ])}>
              <Card style={styles.tripCard} variant="elevated" onPress={() => setSelectedTrip(trip)}>
                <LinearGradient colors={[trip.color + '20', trip.color + '05']} style={styles.tripGradient}>
                  <View style={styles.tripTop}>
                    <Text style={styles.tripEmoji}>{trip.emoji}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.tripName}>{trip.name}</Text>
                      <Text style={styles.tripDest}>{trip.destination}</Text>
                      <View style={styles.tripDates}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.tripDateText}>
                          {format(new Date(trip.startDate), 'MMM d')} – {format(new Date(trip.endDate), 'MMM d, yyyy')} · {duration} days
                        </Text>
                      </View>
                    </View>
                    <View>
                      <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                        <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                      </View>
                      {daysUntil !== null && daysUntil > 0 && (
                        <Text style={[styles.daysUntil, { color: trip.color }]}>{daysUntil}d away</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.tripMeta}>
                    <View style={styles.tripMetaItem}>
                      <Text style={styles.tripMetaLabel}>Budget</Text>
                      <Text style={styles.tripMetaVal}>${trip.spent.toLocaleString()} / ${trip.budget.toLocaleString()}</Text>
                      <ProgressBar progress={budgetPct} color={budgetPct > 0.9 ? colors.danger : trip.color} height={4} style={{ marginTop: 4, width: 90 }} />
                    </View>
                    {trip.packingList.length > 0 && (
                      <View style={styles.tripMetaItem}>
                        <Text style={styles.tripMetaLabel}>Packing</Text>
                        <Text style={styles.tripMetaVal}>{trip.packingList.filter((p) => p.isPacked).length}/{trip.packingList.length} items</Text>
                        <ProgressBar progress={packedPct} color={trip.color} height={4} style={{ marginTop: 4, width: 90 }} />
                      </View>
                    )}
                  </View>

                  <View style={styles.tripAttendees}>
                    {trip.attendeeIds.slice(0, 5).map((id) => {
                      const m = getMember(id);
                      if (!m) return null;
                      return (
                        <View key={id} style={[styles.attendeeAvatar, { backgroundColor: m.avatarColor + '30', borderColor: m.avatarColor }]}>
                          <Text style={[styles.attendeeInitial, { color: m.avatarColor }]}>{m.name.charAt(0)}</Text>
                        </View>
                      );
                    })}
                    <Ionicons name="chevron-forward" size={16} color={trip.color} style={{ marginLeft: 'auto' }} />
                  </View>
                </LinearGradient>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  back: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  filterTextActive: { color: '#0E6655' },
  content: { padding: 16 },
  tripCard: { marginBottom: 14, borderRadius: 18, overflow: 'hidden', padding: 0 },
  tripGradient: { borderRadius: 18, padding: 16 },
  tripTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  tripEmoji: { fontSize: 36 },
  tripName: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 2 },
  tripDest: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  tripDates: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripDateText: { fontSize: 11, color: colors.textMuted },
  statusBadge: { borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-end' },
  statusText: { fontSize: 10, fontWeight: '700' },
  daysUntil: { fontSize: 13, fontWeight: '800', textAlign: 'right', marginTop: 4 },
  tripMeta: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  tripMetaItem: {},
  tripMetaLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  tripMetaVal: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 },
  tripAttendees: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attendeeAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  attendeeInitial: { fontSize: 12, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  detailHeader: { paddingHorizontal: 20, paddingBottom: 20 },
  detailHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  detailTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  detailSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  detailStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 14, justifyContent: 'space-around' },
  detailStat: { alignItems: 'center', gap: 2 },
  detailStatVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
  detailStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  detailStatDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  detailTabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailTab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  detailTabActive: { borderBottomWidth: 2.5, borderBottomColor: colors.primary },
  detailTabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  detailContent: { padding: 16 },
  itinDateHeader: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  itinCard: { marginBottom: 8, borderRadius: 12 },
  itinRow: { flexDirection: 'row', alignItems: 'flex-start' },
  itinTimeCol: { width: 45 },
  itinTime: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 2 },
  itinIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itinTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  itinLocation: { fontSize: 12, color: colors.textSecondary },
  itinNotes: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  itinCost: { fontSize: 13, fontWeight: '700', color: colors.primary },
  packProgressCard: { marginBottom: 12, borderRadius: 14 },
  packProgressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  packProgressLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  packProgressPct: { fontSize: 14, fontWeight: '800', color: colors.primary },
  packCatHeader: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  packItem: { marginBottom: 6, borderRadius: 10 },
  packItemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  packCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  packItemName: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  packItemDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  packAssignee: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  budgetSummaryCard: { borderRadius: 16, marginBottom: 16 },
  budgetTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 14 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-around' },
  budgetItem: { alignItems: 'center', gap: 4 },
  budgetVal: { fontSize: 18, fontWeight: '800', color: colors.text },
  budgetLabel: { fontSize: 11, color: colors.textMuted },
  budgetPctText: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  txCard: { marginBottom: 8, borderRadius: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txDesc: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  txAmount: { fontSize: 14, fontWeight: '700', color: colors.text },
});
