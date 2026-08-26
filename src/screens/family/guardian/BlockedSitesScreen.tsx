import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiRequest } from '../../../api/client';
import { colors } from '../../../theme/colors';

interface BlockedEvent {
  id: string;
  domain: string;
  blockedAt: string;
}

function groupByDate(events: BlockedEvent[]): { title: string; data: BlockedEvent[] }[] {
  const map = new Map<string, BlockedEvent[]>();
  for (const e of events) {
    const d = new Date(e.blockedAt);
    const key = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function cleanDomain(raw: string) {
  return raw.replace(/^www\./, '');
}

export function BlockedSitesScreen({ route }: any) {
  const { deviceId } = route.params as { deviceId: string };
  const navigation = useNavigation();

  const [events, setEvents]         = useState<BlockedEvent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await apiRequest<{ events: BlockedEvent[] }>(
        `/guardian/devices/${deviceId}/blocked-sites?limit=200`,
      );
      setEvents(data.events ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    }
  }, [deviceId]);

  useEffect(() => {
    setLoading(true);
    fetchEvents().finally(() => setLoading(false));
  }, [fetchEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [fetchEvents]);

  const onClear = useCallback(() => {
    Alert.alert(
      'Clear Log',
      'Delete all blocked site records? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await apiRequest(`/guardian/devices/${deviceId}/blocked-sites`, { method: 'DELETE' });
              setEvents([]);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not clear log');
            } finally {
              setClearing(false);
            }
          },
        },
      ],
    );
  }, [deviceId]);

  const groups = useMemo(() => groupByDate(events), [events]);

  // Flatten groups into FlatList items with section headers
  const listData = useMemo(() => {
    const items: ({ type: 'header'; title: string } | { type: 'row'; item: BlockedEvent })[] = [];
    for (const g of groups) {
      items.push({ type: 'header', title: g.title });
      for (const e of g.data) items.push({ type: 'row', item: e });
    }
    return items;
  }, [groups]);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return events.filter(e => new Date(e.blockedAt).toDateString() === today).length;
  }, [events]);

  const header = (
    <LinearGradient colors={['#0F2952', '#1E3A6E']} style={styles.header}>
      <SafeAreaView edges={['top']} style={styles.headerInner}>
        <View style={styles.topRow}>
          <TouchableOpacity accessibilityRole="button" style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          {events.length > 0 && (
            <TouchableOpacity accessibilityRole="button" style={styles.clearBtn} onPress={onClear} activeOpacity={0.7} disabled={clearing}>
              {clearing
                ? <ActivityIndicator size="small" color="#ff8080" />
                : <Ionicons name="trash-outline" size={18} color="#ff8080" />
              }
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerCenter}>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Web Filter</Text>
            <Text style={styles.headerSub}>Blocked content log</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{events.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{todayCount}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{groups.length}</Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading blocked sites…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.center}>
          <Ionicons name="warning" size={40} color={colors.danger} />
          <Text style={styles.errorTitle}>Could not load</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.retryBtn} onPress={() => { setLoading(true); fetchEvents().finally(() => setLoading(false)); }}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.center}>
          <View style={styles.emptyCircle}>
            <Ionicons name="shield-checkmark" size={40} color={colors.success} />
          </View>
          <Text style={styles.emptyTitle}>All Clear</Text>
          <Text style={styles.emptyText}>No blocked content attempts recorded yet.</Text>
          <Text style={styles.emptyHint}>The web filter is active and monitoring browsing activity.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {header}
      <FlatList
        data={listData}
        keyExtractor={(_, i) => String(i)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
              </View>
            );
          }
          const { item: e } = item;
          const url = `https://${e.domain}`;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => Linking.openURL(url).catch(() => Alert.alert('Could not open link', url))}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="ban" size={18} color="#E74C3C" />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.domainText, styles.domainLink]} numberOfLines={1}>{cleanDomain(e.domain)}</Text>
                <Text style={styles.domainFull} numberOfLines={1}>{e.domain}</Text>
              </View>
              <Text style={styles.timeText}>{formatTime(e.blockedAt)}</Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F3F9' },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: { paddingBottom: 12 },
  headerInner: { paddingHorizontal: 16 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4, marginBottom: 10,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  clearBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,80,80,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  shieldBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    marginHorizontal: 4,
  },
  statCard:    { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: '500' },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.25)' },

  // ── List ─────────────────────────────────────────────────────────────────────
  listContent:   { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  sectionHeader: { paddingVertical: 10, paddingTop: 18 },
  sectionTitle:  { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FEF0F0',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  rowContent:  { flex: 1, minWidth: 0 },
  domainText:  { fontSize: 14, fontWeight: '700', color: colors.text },
  domainLink:  { color: colors.primary, textDecorationLine: 'underline' },
  domainFull:  { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  timeText:    { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginLeft: 8 },

  // ── States ───────────────────────────────────────────────────────────────────
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  emptyCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#D5F5E3',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle:  { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
  emptyText:   { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 6 },
  emptyHint:   { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },

  errorTitle:  { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 12, marginBottom: 6 },
  errorText:   { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12,
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
