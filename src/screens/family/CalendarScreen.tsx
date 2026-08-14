import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Switch, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import type { CalendarEvent } from '../../types';
import { useTranslation } from 'react-i18next';

const EVENT_CATEGORIES = ['Family', 'School', 'Medical', 'Sports', 'Work', 'Social', 'Holiday', 'Other'];
const EVENT_COLORS = ['#E74C3C', '#E67E22', '#F1C40F', '#27AE60', '#2980B9', '#9B59B6', '#E91E63', '#00BCD4'];
import { generateId } from '../../utils/generateId';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarScreen({ navigation, route }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newAllDay, setNewAllDay] = useState(true);
  const [newCategory, setNewCategory] = useState('Family');
  const [newColor, setNewColor] = useState('#2980B9');
  const [newAttendees, setNewAttendees] = useState<string[]>([]);

  const events = useFamilyStore((s) => s.events);
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const family = useFamilyStore((s) => s.family);
  const tasks = useFamilyStore((s) => s.tasks);
  const addEvent = useFamilyStore((s) => s.addEvent);
  const deleteEvent = useFamilyStore((s) => s.deleteEvent);
  const hydrateEvents = useFamilyStore((s) => s.hydrateEvents);
  const isHydratingEvents = useFamilyStore((s) => s.isHydratingEvents);
  const bills = useFinanceStore((s) => s.bills);
  const assignments = useSchoolStore((s) => s.assignments);

  // Automatically surfaces what's already due elsewhere in the app —
  // unpaid bills, incomplete tasks, incomplete school assignments — as
  // read-only entries on the same calendar, so this becomes one real place
  // to see everything due instead of a fourth place you have to remember
  // to separately re-enter the same date into.
  const virtualEvents = useMemo<CalendarEvent[]>(() => {
    const fromBills: CalendarEvent[] = bills
      .filter((b) => b.status !== 'paid')
      .map((b) => ({
        id: `virtual-bill-${b.id}`,
        familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
        title: `💳 ${b.name} due`,
        description: `$${b.amount.toLocaleString()}`,
        startDate: b.dueDate,
        endDate: b.dueDate,
        allDay: true,
        attendees: [],
        color: '#E74C3C',
        category: 'Bill',
        recurrence: 'none',
        createdAt: b.dueDate,
        createdBy: 'system',
        isVirtual: true,
        sourceRoute: 'Finance',
      }));

    const fromTasks: CalendarEvent[] = tasks
      .filter((t) => t.status !== 'completed' && t.dueDate)
      .map((t) => ({
        id: `virtual-task-${t.id}`,
        familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
        title: `✅ ${t.title}`,
        startDate: t.dueDate!,
        endDate: t.dueDate!,
        allDay: true,
        attendees: t.assignedTo ?? [],
        color: '#F5A623',
        category: 'Task',
        recurrence: 'none',
        createdAt: t.dueDate!,
        createdBy: 'system',
        isVirtual: true,
        sourceRoute: 'Tasks',
      }));

    const fromSchool: CalendarEvent[] = assignments
      .filter((a) => a.status !== 'completed')
      .map((a) => ({
        id: `virtual-school-${a.id}`,
        familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
        title: `📚 ${a.title}`,
        description: a.subject,
        startDate: a.dueDate,
        endDate: a.dueDate,
        allDay: true,
        attendees: [a.memberId],
        color: '#1E4A8A',
        category: 'School',
        recurrence: 'none',
        createdAt: a.dueDate,
        createdBy: 'system',
        isVirtual: true,
        sourceRoute: 'SchoolCenter',
      }));

    return [...fromBills, ...fromTasks, ...fromSchool];
  }, [bills, tasks, assignments, family?.id]);

  const allEvents = useMemo(() => [...events, ...virtualEvents], [events, virtualEvents]);

  const handleVirtualEventPress = (event: CalendarEvent) => {
    if (event.sourceRoute === 'Finance') navigation.navigate('Finance', { screen: 'Bills', initial: false });
    else if (event.sourceRoute === 'Tasks') navigation.navigate('Family', { screen: 'Tasks', initial: false });
    else if (event.sourceRoute === 'SchoolCenter') navigation.navigate('SchoolCenter');
  };

  useEffect(() => {
    hydrateEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => {
    hydrateEvents();
  }, [hydrateEvents]);

  const handleAddEvent = () => {
    if (!newTitle.trim()) return;
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(10, 0, 0, 0);
    const event: CalendarEvent = {
      id: generateId(),
      familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
      title: newTitle.trim(),
      location: newLocation.trim() || undefined,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      allDay: newAllDay,
      attendees: newAttendees,
      color: newColor,
      category: newCategory,
      recurrence: 'none',
      createdAt: new Date().toISOString(),
      createdBy: activeMemberId ?? members[0]?.id ?? 'user',
    };
    addEvent(event);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewTitle('');
    setNewLocation('');
    setNewAllDay(true);
    setNewCategory('Family');
    setNewColor('#2980B9');
    setNewAttendees([]);
    setShowModal(false);
  };

  const handleDeleteEvent = (id: string, title: string) => {
    Alert.alert(t('common.deleteTitle'), `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteEvent(id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
    ]);
  };

  const toggleAttendee = (id: string) => {
    setNewAttendees((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = getDay(monthStart);
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const selectedEvents = allEvents.filter((e) => isSameDay(new Date(e.startDate), selectedDate));
  const getDayEvents = (date: Date) => allEvents.filter((e) => isSameDay(new Date(e.startDate), date));

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const screenHeader = (
    <PremiumHeader
      title={t('calendar.title')}
      onBack={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()}
      rightAction={
        <Pressable accessibilityRole="button" onPress={() => setShowModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      }
    >
      {/* Month navigator */}
      <View style={styles.monthNav}>
        <Pressable accessibilityRole="button" onPress={prevMonth} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.8)" />
        </Pressable>
        <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
        <Pressable accessibilityRole="button" onPress={nextMonth} style={styles.monthBtn}>
          <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabels}>
        {DAY_LABELS.map((d) => (
          <Text key={d} style={styles.dayLabel}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calGrid}>
        {emptyDays.map((_, i) => <View key={`empty-${i}`} style={styles.dayCell} />)}
        {days.map((day) => {
          const dayEvents = getDayEvents(day);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          return (
            <Pressable accessibilityRole="button" key={day.toISOString()} onPress={() => setSelectedDate(day)} style={[styles.dayCell, selected && styles.dayCellSelected, today && !selected && styles.dayCellToday]}>
              <Text style={[styles.dayNum, selected && styles.dayNumSelected, today && !selected && styles.dayNumToday]}>
                {format(day, 'd')}
              </Text>
              {dayEvents.length > 0 && (
                <View style={styles.eventDots}>
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <View key={i} style={[styles.eventDot, { backgroundColor: selected ? 'rgba(255,255,255,0.8)' : e.color }]} />
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </PremiumHeader>
  );

  const screenCompact = (
    <LinearGradient colors={['#0F2952', '#1E4A8A']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button"
        onPress={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()}
        style={styles.addBtn}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>Family Calendar</Text>
      <Pressable accessibilityRole="button" onPress={() => setShowModal(true)} style={styles.addBtn}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
        refreshControl={<RefreshControl refreshing={isHydratingEvents} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.selectedDateRow}>
          <Text style={styles.selectedDateText}>{format(selectedDate, 'EEEE, MMMM d')}</Text>
          {isToday(selectedDate) && (
            <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Today</Text></View>
          )}
        </View>

        {selectedEvents.length > 0 ? (
          selectedEvents.map((event) => {
            const attendees = members.filter((m) => event.attendees.includes(m.id));
            const card = (
              <Card style={{ ...styles.eventCard, ...(event.isVirtual ? styles.eventCardVirtual : {}) }} variant="elevated">
                <View style={styles.eventRow}>
                  <View style={[styles.eventBar, { backgroundColor: event.color }]} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <View style={styles.eventHeaderRight}>
                        <Text style={styles.eventCategory}>{event.category}</Text>
                        {event.isVirtual ? (
                          <Ionicons name="link-outline" size={14} color={colors.textMuted} />
                        ) : (
                          <Pressable accessibilityRole="button" onPress={() => handleDeleteEvent(event.id, event.title)} style={styles.eventDeleteBtn}>
                            <Ionicons name="trash-outline" size={14} color={colors.danger} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                    {event.isVirtual && event.description && (
                      <Text style={styles.eventLocationText}>{event.description}</Text>
                    )}
                    {!event.allDay && (
                      <View style={styles.eventTime}>
                        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.eventTimeText}>
                          {format(new Date(event.startDate), 'h:mm a')} – {format(new Date(event.endDate), 'h:mm a')}
                        </Text>
                      </View>
                    )}
                    {event.location && (
                      <View style={styles.eventLocation}>
                        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.eventLocationText}>{event.location}</Text>
                      </View>
                    )}
                    {attendees.length > 0 && (
                      <View style={styles.attendeesRow}>
                        {attendees.map((a, i) => (
                          <Avatar key={a.id} name={a.name} color={a.avatarColor} size={26} style={{ marginLeft: i > 0 ? -8 : 0 }} />
                        ))}
                        <Text style={styles.attendeeCount}>{attendees.length} attending</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            );
            return event.isVirtual ? (
              <Pressable accessibilityRole="button" key={event.id} onPress={() => handleVirtualEventPress(event)}>{card}</Pressable>
            ) : (
              <View key={event.id}>{card}</View>
            );
          })
        ) : (
          <View style={styles.noEvents}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.noEventsTitle}>No events</Text>
            <Text style={styles.noEventsDesc}>Tap + to add an event for this day</Text>
          </View>
        )}
      </ScrollView>
        )}
      </CollapsibleHeader>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Event</Text>
          <Text style={styles.modalDate}>{format(selectedDate, 'EEEE, MMMM d')}</Text>

          <TextInput accessibilityLabel="Event title..."
            style={styles.modalInput}
            placeholder="Event title..."
            value={newTitle}
            onChangeText={setNewTitle}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          <TextInput accessibilityLabel="Location (optional)"
            style={styles.modalInput}
            placeholder="Location (optional)"
            value={newLocation}
            onChangeText={setNewLocation}
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.allDayRow}>
            <Text style={styles.allDayLabel}>All Day</Text>
            <Switch value={newAllDay} onValueChange={setNewAllDay} trackColor={{ true: colors.primary }} />
          </View>

          <Text style={styles.modalLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {EVENT_CATEGORIES.map((cat) => (
              <Pressable accessibilityRole="button" key={cat} onPress={() => setNewCategory(cat)} style={[styles.catChip, newCategory === cat && styles.catChipActive]}>
                <Text style={[styles.catChipText, newCategory === cat && styles.catChipTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Color</Text>
          <View style={styles.colorRow}>
            {EVENT_COLORS.map((c) => (
              <Pressable accessibilityRole="button" key={c} onPress={() => setNewColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, newColor === c && styles.colorSwatchSelected]} />
            ))}
          </View>

          <Text style={styles.modalLabel}>Attendees</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {members.map((m) => (
              <Pressable accessibilityRole="button" key={m.id} onPress={() => toggleAttendee(m.id)} style={[styles.attendeePickChip, newAttendees.includes(m.id) && styles.attendeePickChipActive]}>
                <Avatar name={m.name} color={m.avatarColor} size={32} />
                <Text style={styles.attendeePickName}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Button title="Add Event" onPress={handleAddEvent} fullWidth size="lg" disabled={!newTitle.trim()} />
          <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  monthBtn: { padding: 8 },
  monthTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  dayLabels: { flexDirection: 'row', marginBottom: 8 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 6, borderRadius: 10, marginBottom: 4 },
  dayCellSelected: { backgroundColor: 'rgba(255,255,255,0.25)' },
  dayCellToday: { backgroundColor: 'rgba(245,166,35,0.25)' },
  dayNum: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.8)' },
  dayNumSelected: { color: '#fff', fontWeight: '700' },
  dayNumToday: { color: colors.secondary, fontWeight: '700' },
  eventDots: { flexDirection: 'row', gap: 2, marginTop: 3 },
  eventDot: { width: 5, height: 5, borderRadius: 2.5 },
  content: { padding: 16 },
  selectedDateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  selectedDateText: { fontSize: 18, fontWeight: '700', color: colors.text },
  todayBadge: { backgroundColor: '#E8EEF9', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10 },
  todayBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  eventCard: { marginBottom: 10, borderRadius: 16 },
  eventCardVirtual: { opacity: 0.85, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start' },
  eventBar: { width: 4, height: '100%', minHeight: 60, borderRadius: 2 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  eventTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  eventHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventCategory: { fontSize: 11, color: colors.textSecondary },
  eventDeleteBtn: { padding: 2 },
  eventTime: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  eventTimeText: { fontSize: 13, color: colors.textSecondary },
  eventLocation: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  eventLocationText: { fontSize: 13, color: colors.textSecondary },
  attendeesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attendeeCount: { fontSize: 12, color: colors.textSecondary, marginLeft: 4 },
  noEvents: { alignItems: 'center', paddingVertical: 60 },
  noEventsTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 },
  noEventsDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  modalDate: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 14, ...shadows.sm },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  allDayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: colors.border },
  allDayLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  catChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  catChipTextActive: { color: '#fff' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  colorSwatch: { width: 34, height: 34, borderRadius: 17 },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },
  attendeePickChip: { alignItems: 'center', marginRight: 12, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent' },
  attendeePickChipActive: { borderColor: colors.primary, backgroundColor: '#E8EEF9' },
  attendeePickName: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
});
