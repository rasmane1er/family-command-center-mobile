import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useCarpoolStore, CarpoolRoute, CarpoolParticipant } from '../../store/useCarpoolStore';

type Tab = 'routes' | 'schedule' | 'history';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ROUTE_COLORS = ['#1565C0', '#27AE60', '#E91E63', '#F5A623', '#8E44AD', '#16A085'];

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getWeekDates(weekStr: string): Date[] {
  const [year, w] = weekStr.split('-W');
  const weekNum = parseInt(w, 10);
  const jan4 = new Date(parseInt(year, 10), 0, 4);
  const startOfWeek = new Date(jan4);
  startOfWeek.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (weekNum - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

function formatWeek(weekStr: string): string {
  try {
    const dates = getWeekDates(weekStr);
    const start = dates[0];
    const end = dates[6];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[start.getMonth()]} ${start.getDate()} – ${end.getDate()}`;
  } catch {
    return weekStr;
  }
}

function getNextCarpoolInfo(routes: CarpoolRoute[]): string {
  const today = new Date();
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const todayDay = today.getDay();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let nextRoute: CarpoolRoute | null = null;
  let minDiff = Infinity;

  routes.filter((r) => r.status === 'active').forEach((r) => {
    r.daysOfWeek.forEach((d) => {
      const targetDay = dayMap[d] ?? -1;
      let diff = targetDay - todayDay;
      if (diff < 0) diff += 7;
      if (diff < minDiff) {
        minDiff = diff;
        nextRoute = r;
      }
    });
  });

  if (!nextRoute) return 'No upcoming';
  const nr = nextRoute as CarpoolRoute;
  const nextDayName = dayNames[(todayDay + minDiff) % 7];
  return minDiff === 0 ? `Today ${nr.pickupTime}` : `${nextDayName} ${nr.pickupTime}`;
}

function RouteCard({
  route,
  onAdvanceDriver,
  onAddParticipant,
}: {
  route: CarpoolRoute;
  onAdvanceDriver: () => void;
  onAddParticipant: () => void;
}) {
  const currentDriver = route.rotation[route.currentDriverIndex];
  const nextIndex = (route.currentDriverIndex + 1) % route.rotation.length;
  const nextDriver = route.rotation[nextIndex];

  return (
    <View style={[styles.routeCardWrapper, { borderLeftColor: route.color }]}>
      <View style={styles.routeCardContent}>
        <View style={styles.routeNameRow}>
          <View style={[styles.routeColorDot, { backgroundColor: route.color }]} />
          <Text style={styles.routeName}>{route.name}</Text>
          <Badge
            label={route.status}
            variant={route.status === 'active' ? 'success' : route.status === 'paused' ? 'warning' : 'neutral'}
            size="sm"
          />
        </View>

        <View style={styles.routeDestRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.routeDest}>{route.destination}</Text>
        </View>

        <View style={styles.routeTimesRow}>
          <View style={styles.routeTimeItem}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.routeTime}>{route.pickupTime}</Text>
          </View>
          {route.returnTime && (
            <View style={styles.routeTimeItem}>
              <Ionicons name="return-up-back-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.routeTime}>{route.returnTime}</Text>
            </View>
          )}
        </View>

        <View style={styles.dayChips}>
          {ALL_DAYS.map((d) => (
            <View
              key={d}
              style={[
                styles.dayChip,
                route.daysOfWeek.includes(d) && { backgroundColor: route.color, borderColor: route.color },
              ]}
            >
              <Text style={[styles.dayChipText, route.daysOfWeek.includes(d) && { color: '#fff' }]}>
                {d.charAt(0)}
              </Text>
            </View>
          ))}
        </View>

        {currentDriver && (
          <View style={[styles.currentDriverBanner, { backgroundColor: route.color + '15', borderColor: route.color + '40' }]}>
            <Ionicons name="car" size={16} color={route.color} />
            <Text style={[styles.currentDriverText, { color: route.color }]}>
              This week: {currentDriver.driverName}
            </Text>
          </View>
        )}

        <View style={styles.participantsRow}>
          {route.participants.slice(0, 5).map((p, i) => (
            <View
              key={i}
              style={[styles.participantAvatar, { backgroundColor: ROUTE_COLORS[i % ROUTE_COLORS.length] }]}
            >
              <Text style={styles.participantInitial}>{p.name.charAt(0)}</Text>
            </View>
          ))}
          {route.participants.length > 5 && (
            <View style={[styles.participantAvatar, { backgroundColor: colors.border }]}>
              <Text style={[styles.participantInitial, { color: colors.textSecondary }]}>
                +{route.participants.length - 5}
              </Text>
            </View>
          )}
          <Pressable onPress={onAddParticipant} style={styles.addParticipantBtn}>
            <Ionicons name="person-add-outline" size={14} color={colors.primary} />
          </Pressable>
        </View>

        {route.notes && (
          <Text style={styles.routeNotes}>{route.notes}</Text>
        )}

        <Pressable
          onPress={onAdvanceDriver}
          style={[styles.advanceBtn, { backgroundColor: route.color }]}
        >
          <Ionicons name="arrow-forward-circle-outline" size={16} color="#fff" />
          <Text style={styles.advanceBtnText}>
            Advance to {nextDriver?.driverName || 'Next Driver'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ScheduleTab({ routes }: { routes: CarpoolRoute[] }) {
  const today = new Date();
  const currentWeek = getISOWeek(today);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekDates = getWeekDates(currentWeek);

  return (
    <View>
      <View style={styles.scheduleWeekHeader}>
        <Text style={styles.scheduleWeekTitle}>This Week</Text>
        <Text style={styles.scheduleWeekSub}>{formatWeek(currentWeek)}</Text>
      </View>
      {dayNames.map((dayName, i) => {
        const dayDate = weekDates[i];
        const dayRoutes = routes.filter(
          (r) => r.status === 'active' && r.daysOfWeek.includes(dayName)
        );
        const isToday = dayDate.toDateString() === today.toDateString();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dateLabel = `${dayName} ${months[dayDate.getMonth()]} ${dayDate.getDate()}`;

        return (
          <View key={dayName} style={[styles.scheduleDayBlock, isToday && styles.scheduleDayBlockToday]}>
            <View style={styles.scheduleDayHeader}>
              <Text style={[styles.scheduleDayName, isToday && { color: colors.primary }]}>{dateLabel}</Text>
              {isToday && <Badge label="Today" variant="primary" size="sm" />}
            </View>
            {dayRoutes.length === 0 ? (
              <Text style={styles.scheduleNoCarpool}>No carpool today</Text>
            ) : (
              dayRoutes.map((r) => {
                const currentDriver = r.rotation[r.currentDriverIndex];
                return (
                  <View key={r.id} style={[styles.scheduleRouteRow, { borderLeftColor: r.color }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleRouteName}>{r.name}</Text>
                      <Text style={styles.scheduleRouteTime}>{r.pickupTime} • {r.destination}</Text>
                    </View>
                    <View style={styles.scheduleDriverInfo}>
                      <View style={[styles.scheduleDriverAvatar, { backgroundColor: r.color }]}>
                        <Text style={styles.scheduleDriverInitial}>
                          {currentDriver?.driverName.charAt(0) || '?'}
                        </Text>
                      </View>
                      <Text style={styles.scheduleDriverName}>{currentDriver?.driverName}</Text>
                    </View>
                    <Text style={styles.schedulePassengers}>
                      {r.participants.length} riders
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        );
      })}
    </View>
  );
}

function HistoryTab({ routes }: { routes: CarpoolRoute[] }) {
  const today = new Date();
  const currentWeek = getISOWeek(today);

  const pastDrivers = routes.flatMap((r) =>
    r.rotation
      .filter((d) => d.completed || d.week < currentWeek)
      .map((d) => ({ ...d, routeName: r.name, routeColor: r.color }))
  ).sort((a, b) => b.week.localeCompare(a.week));

  if (pastDrivers.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={{ fontSize: 48 }}>📅</Text>
        <Text style={styles.emptyTitle}>No History Yet</Text>
        <Text style={styles.emptyDesc}>Completed weeks will appear here</Text>
      </View>
    );
  }

  return (
    <View>
      {pastDrivers.map((d, i) => (
        <View key={i} style={styles.historyRow}>
          <View style={[styles.historyColorBar, { backgroundColor: d.routeColor }]} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.historyRouteName}>{d.routeName}</Text>
            <Text style={styles.historyDriver}>Driver: {d.driverName}</Text>
            <Text style={styles.historyWeek}>{formatWeek(d.week)}</Text>
          </View>
          <View style={[styles.historyStatus, { backgroundColor: d.completed ? colors.successLight : colors.border }]}>
            <Text style={[styles.historyStatusText, { color: d.completed ? colors.success : colors.textMuted }]}>
              {d.completed ? '✓ Done' : 'Pending'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function AddRouteModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (r: Omit<CarpoolRoute, 'id' | 'currentDriverIndex'>) => void;
}) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState(ROUTE_COLORS[0]);
  const [notes, setNotes] = useState('');

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAdd = () => {
    if (!name.trim() || !destination.trim() || !pickupTime.trim() || selectedDays.length === 0) return;
    onAdd({
      familyId: 'demo-family',
      name: name.trim(),
      destination: destination.trim(),
      pickupTime: pickupTime.trim(),
      returnTime: returnTime.trim() || undefined,
      daysOfWeek: selectedDays,
      participants: [],
      rotation: [],
      status: 'active',
      color: selectedColor,
      notes: notes.trim() || undefined,
    });
    setName(''); setDestination(''); setPickupTime(''); setReturnTime('');
    setSelectedDays([]); setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Carpool Route</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Route Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. School Morning Run"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Destination *</Text>
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="e.g. Lincoln Elementary"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Pickup Time *</Text>
            <TextInput
              style={styles.input}
              value={pickupTime}
              onChangeText={setPickupTime}
              placeholder="e.g. 7:45 AM"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Return Time (optional)</Text>
            <TextInput
              style={styles.input}
              value={returnTime}
              onChangeText={setReturnTime}
              placeholder="e.g. 3:20 PM"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Days of Week *</Text>
            <View style={styles.dayToggleRow}>
              {ALL_DAYS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => toggleDay(d)}
                  style={[
                    styles.dayToggle,
                    selectedDays.includes(d) && { backgroundColor: selectedColor, borderColor: selectedColor },
                  ]}
                >
                  <Text style={[
                    styles.dayToggleText,
                    selectedDays.includes(d) && { color: '#fff' },
                  ]}>
                    {d.charAt(0)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Route Color</Text>
            <View style={styles.colorRow}>
              {ROUTE_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorSwatchSelected,
                  ]}
                >
                  {selectedColor === c && <Ionicons name="checkmark" size={16} color="#fff" />}
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Pickup instructions, contact info, etc."
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Pressable
              onPress={handleAdd}
              disabled={!name.trim() || !destination.trim() || !pickupTime.trim() || selectedDays.length === 0}
              style={[
                styles.submitBtn,
                (!name.trim() || !destination.trim() || !pickupTime.trim() || selectedDays.length === 0) && { opacity: 0.4 },
              ]}
            >
              <Ionicons name="car" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Create Route</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function CarpoolManagerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { routes, addRoute, advanceDriver, addParticipant, seedDemoData } = useCarpoolStore();
  const [activeTab, setActiveTab] = useState<Tab>('routes');
  const [showAddRoute, setShowAddRoute] = useState(false);

  const activeRoutes = useMemo(() => routes.filter((r) => r.status === 'active'), [routes]);
  const totalParticipants = useMemo(() =>
    routes.reduce((sum, r) => sum + r.participants.length, 0), [routes]
  );
  const nextCarpool = useMemo(() => getNextCarpoolInfo(routes), [routes]);

  const handleAdvanceDriver = (route: CarpoolRoute) => {
    const currentDriver = route.rotation[route.currentDriverIndex];
    const nextIndex = (route.currentDriverIndex + 1) % route.rotation.length;
    const nextDriver = route.rotation[nextIndex];
    Alert.alert(
      'Advance Driver',
      `Mark ${currentDriver?.driverName || 'current driver'}'s week as complete and advance to ${nextDriver?.driverName || 'next driver'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            advanceDriver(route.id);
          }
        },
      ]
    );
  };

  const handleAddParticipant = (routeId: string) => {
    Alert.prompt(
      'Add Participant',
      'Enter participant name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add', onPress: (name) => {
            if (name?.trim()) {
              addParticipant(routeId, { name: name.trim() });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }
        },
      ],
      'plain-text'
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0D47A1', '#1565C0', '#1976D2']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Carpool Manager 🚗</Text>
            <Text style={styles.headerSub}>School & activity rides</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddRoute(true); }}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Active Routes', value: activeRoutes.length },
            { label: 'Total Riders', value: totalParticipants },
            { label: 'Next Carpool', value: nextCarpool, small: true },
          ].map((s, i) => (
            <View key={i} style={[styles.statItem, i < 2 && styles.statBorder]}>
              <Text style={[styles.statVal, s.small && { fontSize: 14 }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['routes', 'schedule', 'history'] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'routes' ? 'Routes' : tab === 'schedule' ? 'Schedule' : 'History'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {routes.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 60 }}>🚗</Text>
            <Text style={styles.emptyTitle}>No Routes Yet</Text>
            <Text style={styles.emptyDesc}>Set up carpool routes to coordinate school and activity pickups</Text>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); seedDemoData(); }}
              style={styles.demoBtn}
            >
              <Text style={styles.demoBtnText}>Load Demo Data</Text>
            </Pressable>
          </View>
        )}

        {activeTab === 'routes' && routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            onAdvanceDriver={() => handleAdvanceDriver(route)}
            onAddParticipant={() => handleAddParticipant(route.id)}
          />
        ))}

        {activeTab === 'schedule' && routes.length > 0 && (
          <ScheduleTab routes={routes} />
        )}

        {activeTab === 'history' && routes.length > 0 && (
          <HistoryTab routes={routes} />
        )}
      </ScrollView>

      <AddRouteModal
        visible={showAddRoute}
        onClose={() => setShowAddRoute(false)}
        onAdd={(r) => {
          addRoute(r);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' },
  statVal: { fontSize: 28, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2, textAlign: 'center' },
  tabs: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#1565C0' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#1565C0' },
  content: { padding: 16 },
  // Route card
  routeCardWrapper: {
    flexDirection: 'row', marginBottom: 14,
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: colors.card, ...shadows.card,
    borderLeftWidth: 5,
  },
  routeCardContent: { flex: 1, padding: 14 },
  routeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  routeColorDot: { width: 10, height: 10, borderRadius: 5 },
  routeName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  routeDestRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  routeDest: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  routeTimesRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  routeTimeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeTime: { fontSize: 13, color: colors.textSecondary },
  dayChips: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  dayChip: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.border, borderWidth: 1.5, borderColor: colors.border,
  },
  dayChipText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  currentDriverBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10,
  },
  currentDriverText: { fontSize: 13, fontWeight: '700' },
  participantsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  participantAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.card,
  },
  participantInitial: { fontSize: 13, fontWeight: '800', color: '#fff' },
  addParticipantBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed',
    marginLeft: 4,
  },
  routeNotes: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginBottom: 10 },
  advanceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 10,
  },
  advanceBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Schedule tab
  scheduleWeekHeader: { marginBottom: 12 },
  scheduleWeekTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  scheduleWeekSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  scheduleDayBlock: {
    backgroundColor: colors.card, borderRadius: 14,
    padding: 14, marginBottom: 10, ...shadows.sm,
  },
  scheduleDayBlockToday: { borderWidth: 2, borderColor: '#1565C0' },
  scheduleDayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  scheduleDayName: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  scheduleNoCarpool: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  scheduleRouteRow: {
    flexDirection: 'row', alignItems: 'center',
    borderLeftWidth: 4, paddingLeft: 10, marginBottom: 8,
  },
  scheduleRouteName: { fontSize: 14, fontWeight: '700', color: colors.text },
  scheduleRouteTime: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  scheduleDriverInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 10 },
  scheduleDriverAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  scheduleDriverInitial: { fontSize: 12, fontWeight: '800', color: '#fff' },
  scheduleDriverName: { fontSize: 12, fontWeight: '600', color: colors.text },
  schedulePassengers: { fontSize: 11, color: colors.textMuted },
  // History tab
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12,
    padding: 14, marginBottom: 10, ...shadows.sm,
  },
  historyColorBar: { width: 4, borderRadius: 2, alignSelf: 'stretch' },
  historyRouteName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  historyDriver: { fontSize: 12, color: colors.textSecondary },
  historyWeek: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  historyStatus: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  historyStatusText: { fontSize: 11, fontWeight: '700' },
  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  demoBtn: { backgroundColor: '#1565C0', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  demoBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalContent: { padding: 20, paddingBottom: 40 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  dayToggleRow: { flexDirection: 'row', gap: 8 },
  dayToggle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.border, borderWidth: 1.5, borderColor: 'transparent',
  },
  dayToggleText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1565C0', borderRadius: 14,
    paddingVertical: 16, marginTop: 24,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
