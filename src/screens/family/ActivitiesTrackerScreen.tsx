import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
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
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import {
  useActivitiesStore,
  type Activity,
  type ActivityType,
  type DayOfWeek,
} from '../../store/useActivitiesStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ACTIVITY_TYPES: { type: ActivityType; label: string; icon: string }[] = [
  { type: 'sport', label: 'Sport', icon: 'football-outline' },
  { type: 'music', label: 'Music', icon: 'musical-notes-outline' },
  { type: 'art', label: 'Art', icon: 'color-palette-outline' },
  { type: 'academic', label: 'Academic', icon: 'book-outline' },
  { type: 'social', label: 'Social', icon: 'people-outline' },
  { type: 'religious', label: 'Religious', icon: 'heart-outline' },
  { type: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const ACTIVITY_COLORS = [
  '#27AE60', '#2980B9', '#E74C3C', '#8E44AD',
  '#E67E22', '#16A085', '#F5A623', '#E91E63',
];

const TYPE_VARIANT_MAP: Record<ActivityType, 'success' | 'info' | 'secondary' | 'primary' | 'neutral' | 'warning' | 'danger'> = {
  sport: 'success',
  music: 'info',
  art: 'secondary',
  academic: 'primary',
  social: 'warning',
  religious: 'neutral',
  other: 'neutral',
};

function getTodayDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date().getDay()];
}

export function ActivitiesTrackerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const members = useFamilyStore((s) => s.members);

  const {
    activities,
    addActivity,
    toggleActive,
    deleteActivity,
    getTotalMonthlyCost,
    seedDemoData,
  } = useActivitiesStore();

  const [selectedMemberId, setSelectedMemberId] = useState<string | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'schedule' | 'activities' | 'costs'>('activities');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<DayOfWeek>(getTodayDayOfWeek());

  // Modal state
  const [modalMemberId, setModalMemberId] = useState<string>(members[0]?.id ?? '');
  const [modalName, setModalName] = useState('');
  const [modalType, setModalType] = useState<ActivityType>('sport');
  const [modalColor, setModalColor] = useState(ACTIVITY_COLORS[0]);
  const [modalIcon, setModalIcon] = useState('football-outline');
  const [modalDays, setModalDays] = useState<DayOfWeek[]>([]);
  const [modalTime, setModalTime] = useState('');
  const [modalCost, setModalCost] = useState('');
  const [modalLocation, setModalLocation] = useState('');
  const [modalCoach, setModalCoach] = useState('');
  const [modalEquipment, setModalEquipment] = useState('');
  const [modalNotes, setModalNotes] = useState('');

  if (activities.length === 0) seedDemoData();

  const filteredActivities = useMemo(() => {
    if (selectedMemberId === 'all') return activities;
    return activities.filter((a) => a.memberId === selectedMemberId);
  }, [activities, selectedMemberId]);

  const totalCost = getTotalMonthlyCost();
  const activeCount = activities.filter((a) => a.isActive).length;

  const activitiesOnDay = useMemo(
    () => filteredActivities.filter((a) => a.scheduleDays.includes(selectedScheduleDay)),
    [filteredActivities, selectedScheduleDay]
  );

  const memberCostBreakdown = useMemo(() => {
    return members.map((m) => {
      const memberActivities = activities.filter((a) => a.memberId === m.id && a.isActive);
      const cost = memberActivities.reduce((s, a) => s + (a.monthlyCost ?? 0), 0);
      return { member: m, activities: memberActivities, cost };
    }).filter((x) => x.activities.length > 0);
  }, [activities, members]);

  const handleDelete = (a: Activity) => {
    Alert.alert('Delete Activity', `Remove "${a.name}" from activities?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => { deleteActivity(a.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); },
      },
    ]);
  };

  const handleAddActivity = () => {
    if (!modalName.trim()) return;
    addActivity({
      familyId: 'demo-family',
      memberId: modalMemberId,
      name: modalName.trim(),
      type: modalType,
      icon: modalIcon,
      color: modalColor,
      coach: modalCoach.trim() || undefined,
      location: modalLocation.trim() || undefined,
      scheduleDays: modalDays,
      scheduleTime: modalTime.trim() || undefined,
      monthlyCost: modalCost ? parseFloat(modalCost) : undefined,
      equipment: modalEquipment ? modalEquipment.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      notes: modalNotes.trim() || undefined,
      isActive: true,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalName('');
    setModalType('sport');
    setModalColor(ACTIVITY_COLORS[0]);
    setModalIcon('football-outline');
    setModalDays([]);
    setModalTime('');
    setModalCost('');
    setModalLocation('');
    setModalCoach('');
    setModalEquipment('');
    setModalNotes('');
    setShowAddModal(false);
  };

  const toggleDay = (day: DayOfWeek) => {
    setModalDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const getMemberName = (memberId: string) =>
    members.find((m) => m.id === memberId)?.name.split(' ')[0] ?? '';

  const getMemberColor = (memberId: string) =>
    members.find((m) => m.id === memberId)?.avatarColor ?? colors.textMuted;

  const renderActivityCard = (a: Activity) => {
    const memberName = getMemberName(a.memberId);
    const memberColor = getMemberColor(a.memberId);
    return (
      <Card key={a.id} variant="elevated" style={styles.activityCard}>
        <View style={[styles.activityLeftBar, { backgroundColor: a.color }]} />
        <View style={styles.activityContent}>
          <View style={styles.activityTop}>
            <View style={[styles.activityIconCircle, { backgroundColor: a.color + '20' }]}>
              <Ionicons name={a.icon as any} size={20} color={a.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityName}>{a.name}</Text>
              <Badge
                label={ACTIVITY_TYPES.find((t) => t.type === a.type)?.label ?? a.type}
                variant={TYPE_VARIANT_MAP[a.type]}
              />
            </View>
            <View style={styles.activityActions}>
              <Pressable
                onPress={() => { toggleActive(a.id); Haptics.selectionAsync(); }}
                style={[styles.toggleBtn, a.isActive ? styles.toggleBtnActive : styles.toggleBtnInactive]}
              >
                <Ionicons name={a.isActive ? 'checkmark' : 'close'} size={14} color={a.isActive ? colors.success : colors.textMuted} />
              </Pressable>
              <Pressable onPress={() => handleDelete(a)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.scheduleDaysRow}>
            {ALL_DAYS.map((day) => (
              <View
                key={day}
                style={[styles.dayChip, a.scheduleDays.includes(day) && { backgroundColor: a.color, borderColor: a.color }]}
              >
                <Text style={[styles.dayChipText, a.scheduleDays.includes(day) && { color: '#fff' }]}>
                  {day[0]}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.activityMeta}>
            {a.scheduleTime && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                <Text style={styles.metaText}>{a.scheduleTime}</Text>
              </View>
            )}
            {a.location && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <Text style={styles.metaText}>{a.location}</Text>
              </View>
            )}
            {a.coach && (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={12} color={colors.textMuted} />
                <Text style={styles.metaText}>{a.coach}</Text>
              </View>
            )}
            {a.monthlyCost !== undefined && (
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={12} color={colors.textMuted} />
                <Text style={styles.metaText}>{a.monthlyCost === 0 ? 'Free' : `$${a.monthlyCost}/mo`}</Text>
              </View>
            )}
          </View>

          {a.equipment && a.equipment.length > 0 && (
            <View style={styles.equipmentSection}>
              <Text style={styles.equipmentLabel}>Equipment needed:</Text>
              {a.equipment.map((item, i) => (
                <View key={i} style={styles.equipmentItem}>
                  <View style={styles.equipmentCheckbox}>
                    <Ionicons name="square-outline" size={14} color={colors.textMuted} />
                  </View>
                  <Text style={styles.equipmentText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {selectedMemberId === 'all' && (
            <View style={[styles.memberTag, { backgroundColor: memberColor + '20' }]}>
              <Text style={[styles.memberTagText, { color: memberColor }]}>{memberName}</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const isEmpty = activities.length === 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#00695C', '#00897B', '#26A69A']}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Activities</Text>
          <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activities.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={styles.statValue}>${totalCost}/mo</Text>
            <Text style={styles.statLabel}>Monthly Cost</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Member tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.memberScroll}
        contentContainerStyle={styles.memberScrollContent}
      >
        <Pressable
          onPress={() => { setSelectedMemberId('all'); Haptics.selectionAsync(); }}
          style={[styles.memberTab, selectedMemberId === 'all' && styles.memberTabActive]}
        >
          <Text style={[styles.memberTabText, selectedMemberId === 'all' && styles.memberTabTextActive]}>
            All
          </Text>
        </Pressable>
        {members.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => { setSelectedMemberId(m.id); Haptics.selectionAsync(); }}
            style={[styles.memberTab, selectedMemberId === m.id && styles.memberTabActive]}
          >
            <Avatar name={m.name} color={m.avatarColor} size={26} />
            <Text style={[styles.memberTabText, selectedMemberId === m.id && styles.memberTabTextActive]}>
              {m.name.split(' ')[0]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['schedule', 'activities', 'costs'] as const).map((t) => (
          <Pressable key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {isEmpty && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyTitle}>No activities yet</Text>
            <Text style={styles.emptyDesc}>Tap + to add activities or load sample data.</Text>
            <Button
              title="Load Demo Data"
              onPress={() => { seedDemoData(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
              variant="primary"
              style={{ marginTop: 16, alignSelf: 'center' }}
            />
          </View>
        )}

        {!isEmpty && activeTab === 'schedule' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekDayScroll} contentContainerStyle={styles.weekDayContent}>
              {ALL_DAYS.map((day) => {
                const count = filteredActivities.filter((a) => a.scheduleDays.includes(day)).length;
                const isSelected = day === selectedScheduleDay;
                return (
                  <Pressable
                    key={day}
                    onPress={() => { setSelectedScheduleDay(day); Haptics.selectionAsync(); }}
                    style={[styles.weekDayBtn, isSelected && styles.weekDayBtnActive]}
                  >
                    <Text style={[styles.weekDayLabel, isSelected && styles.weekDayLabelActive]}>{day}</Text>
                    {count > 0 && (
                      <View style={[styles.weekDayDot, isSelected && styles.weekDayDotActive]}>
                        <Text style={[styles.weekDayDotText, isSelected && styles.weekDayDotTextActive]}>{count}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.scheduleHeader}>
              {selectedScheduleDay} — {activitiesOnDay.length} activit{activitiesOnDay.length !== 1 ? 'ies' : 'y'}
            </Text>
            {activitiesOnDay.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>😴</Text>
                <Text style={styles.emptyTitle}>Rest day!</Text>
                <Text style={styles.emptyDesc}>No activities scheduled on {selectedScheduleDay}.</Text>
              </View>
            ) : (
              activitiesOnDay.map(renderActivityCard)
            )}
          </>
        )}

        {!isEmpty && activeTab === 'activities' && (
          filteredActivities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🎯</Text>
              <Text style={styles.emptyTitle}>No activities for this member</Text>
            </View>
          ) : (
            filteredActivities.map(renderActivityCard)
          )
        )}

        {!isEmpty && activeTab === 'costs' && (
          <>
            <Card variant="elevated" style={styles.totalCostCard}>
              <Text style={styles.totalCostLabel}>Total Family Monthly Cost</Text>
              <Text style={styles.totalCostValue}>${totalCost.toFixed(2)}</Text>
              <Text style={styles.totalCostSubLabel}>per month across all active activities</Text>
            </Card>

            {memberCostBreakdown.map(({ member, activities: mActivities, cost }) => (
              <Card key={member.id} variant="elevated" style={styles.memberCostCard}>
                <View style={styles.memberCostHeader}>
                  <Avatar name={member.name} color={member.avatarColor} size={36} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.memberCostName}>{member.name.split(' ')[0]}</Text>
                    <Text style={styles.memberCostCount}>{mActivities.length} activit{mActivities.length !== 1 ? 'ies' : 'y'}</Text>
                  </View>
                  <Text style={[styles.memberCostAmount, { color: cost === 0 ? colors.success : colors.text }]}>
                    {cost === 0 ? 'Free' : `$${cost}/mo`}
                  </Text>
                </View>
                {mActivities.map((a) => (
                  <View key={a.id} style={styles.costActivityRow}>
                    <View style={[styles.costActivityDot, { backgroundColor: a.color }]} />
                    <Text style={styles.costActivityName}>{a.name}</Text>
                    <Text style={styles.costActivityAmount}>
                      {a.monthlyCost === 0 || a.monthlyCost === undefined ? 'Free' : `$${a.monthlyCost}/mo`}
                    </Text>
                  </View>
                ))}
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add Activity Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 60 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Activity</Text>

          <Text style={styles.modalLabel}>Member</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {members.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setModalMemberId(m.id)}
                style={[styles.memberChip, modalMemberId === m.id && styles.memberChipActive]}
              >
                <Avatar name={m.name} color={m.avatarColor} size={26} />
                <Text style={styles.memberChipText}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Activity Name</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. Soccer, Piano Lessons..."
            value={modalName}
            onChangeText={setModalName}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Type</Text>
          <View style={styles.typeGrid}>
            {ACTIVITY_TYPES.map((t) => (
              <Pressable
                key={t.type}
                onPress={() => { setModalType(t.type); setModalIcon(t.icon); }}
                style={[styles.typeChip, modalType === t.type && styles.typeChipActive]}
              >
                <Ionicons name={t.icon as any} size={18} color={modalType === t.type ? '#00897B' : colors.textMuted} />
                <Text style={[styles.typeChipText, modalType === t.type && styles.typeChipTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Color</Text>
          <View style={styles.colorRow}>
            {ACTIVITY_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setModalColor(c)}
                style={[styles.colorSwatch, { backgroundColor: c }, modalColor === c && styles.colorSwatchSelected]}
              />
            ))}
          </View>

          <Text style={styles.modalLabel}>Schedule Days</Text>
          <View style={styles.daysRow}>
            {ALL_DAYS.map((day) => (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                style={[styles.dayToggle, modalDays.includes(day) && styles.dayToggleActive]}
              >
                <Text style={[styles.dayToggleText, modalDays.includes(day) && styles.dayToggleTextActive]}>
                  {day}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Time (optional)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder='e.g. "3:30 PM"'
            value={modalTime}
            onChangeText={setModalTime}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Monthly Cost ($)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="0 for free"
            value={modalCost}
            onChangeText={setModalCost}
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Location (optional)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Location..."
            value={modalLocation}
            onChangeText={setModalLocation}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Coach/Instructor (optional)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Coach name..."
            value={modalCoach}
            onChangeText={setModalCoach}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Equipment (comma-separated)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. Cleats, Shin Guards, Jersey"
            value={modalEquipment}
            onChangeText={setModalEquipment}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Additional notes..."
            value={modalNotes}
            onChangeText={setModalNotes}
            multiline
            placeholderTextColor={colors.textMuted}
          />

          <Button
            title="Add Activity"
            onPress={handleAddActivity}
            fullWidth
            size="lg"
            disabled={!modalName.trim()}
          />
          <Button
            title="Cancel"
            onPress={() => setShowAddModal(false)}
            variant="ghost"
            fullWidth
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  memberScroll: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  memberScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  memberTab: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, gap: 4, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  memberTabActive: { borderBottomColor: '#00897B' },
  memberTabText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  memberTabTextActive: { color: '#00897B', fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#00897B' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#00897B' },
  content: { padding: 16 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  weekDayScroll: { marginBottom: 16 },
  weekDayContent: { gap: 10, paddingVertical: 4 },
  weekDayBtn: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  weekDayBtnActive: { backgroundColor: '#00897B', borderColor: '#00897B' },
  weekDayLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  weekDayLabelActive: { color: '#fff' },
  weekDayDot: { marginTop: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  weekDayDotActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  weekDayDotText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  weekDayDotTextActive: { color: '#fff' },
  scheduleHeader: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  activityCard: { marginBottom: 14, borderRadius: 14, flexDirection: 'row', padding: 0, overflow: 'hidden' },
  activityLeftBar: { width: 5 },
  activityContent: { flex: 1, padding: 14 },
  activityTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  activityIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  activityActions: { flexDirection: 'row', gap: 6 },
  toggleBtn: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  toggleBtnActive: { borderColor: colors.success, backgroundColor: colors.successLight },
  toggleBtnInactive: { borderColor: colors.border },
  deleteBtn: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  scheduleDaysRow: { flexDirection: 'row', gap: 5, marginBottom: 10 },
  dayChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  dayChipText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  activityMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: colors.textSecondary },
  equipmentSection: { marginTop: 10 },
  equipmentLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  equipmentItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  equipmentCheckbox: {},
  equipmentText: { fontSize: 13, color: colors.textSecondary },
  memberTag: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  memberTagText: { fontSize: 11, fontWeight: '700' },
  totalCostCard: { marginBottom: 16, borderRadius: 16, alignItems: 'center', paddingVertical: 24 },
  totalCostLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalCostValue: { fontSize: 42, fontWeight: '800', color: colors.text, marginTop: 4 },
  totalCostSubLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  memberCostCard: { marginBottom: 14, borderRadius: 14 },
  memberCostHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  memberCostName: { fontSize: 15, fontWeight: '700', color: colors.text },
  memberCostCount: { fontSize: 12, color: colors.textSecondary },
  memberCostAmount: { fontSize: 18, fontWeight: '800' },
  costActivityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  costActivityDot: { width: 8, height: 8, borderRadius: 4 },
  costActivityName: { flex: 1, fontSize: 13, color: colors.text },
  costActivityAmount: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  typeChipActive: { backgroundColor: '#E0F2F1', borderColor: '#00897B' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#00897B' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  colorSwatch: { width: 34, height: 34, borderRadius: 17 },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },
  daysRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  dayToggle: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  dayToggleActive: { backgroundColor: '#00897B', borderColor: '#00897B' },
  dayToggleText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  dayToggleTextActive: { color: '#fff' },
  memberChip: { alignItems: 'center', marginRight: 12, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', gap: 4 },
  memberChipActive: { borderColor: '#00897B', backgroundColor: '#E0F2F1' },
  memberChipText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
});
