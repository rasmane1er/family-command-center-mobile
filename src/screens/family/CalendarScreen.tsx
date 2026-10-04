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

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(now);
  };

  const screenHeader = (
    <PremiumHeader
      title={t('calendar.title')}
      onBack={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()}
      style={styles.headerRound}
      rightAction={
        <Pressable accessibilityRole="button" onPress={() => setShowModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      }
    >
      {/* Month navigator */}
      <View style={styles.monthNav}>
        <Pressable accessibilityRole="button" onPress={prevMonth} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <View style={styles.monthCenter}>
          <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
          {!isSameDay(selectedDate, new Date()) && (
            <Pressable accessibilityRole="button" onPress={goToToday} style={styles.todayJump} hitSlop={8}>
              <Text style={styles.todayJumpText}>Today</Text>
            </Pressable>
          )}
        </View>
        <Pressable accessibilityRole="button" onPress={nextMonth} style={styles.monthBtn}>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Calendar card */}
      <View style={styles.calCard}>
        <View style={styles.dayLabels}>
          {DAY_LABELS.map((d) => (
            <Text key={d} style={styles.dayLabel}>{d}</Text>
          ))}
        </View>

        <View style={styles.calGrid}>
          {emptyDays.map((_, i) => <View key={`empty-${i}`} style={styles.dayCell} />)}
          {days.map((day) => {
            const dayEvents = getDayEvents(day);
            const selected = isSameDay(day, selectedDate);
            const today = isToday(day);
            return (
              <Pressable accessibilityRole="button" key={day.toISOString()} onPress={() => setSelectedDate(day)} style={styles.dayCell}>
                <View style={[styles.dayCircle, today && !selected && styles.dayCircleToday, selected && styles.dayCircleSelected]}>
                  <Text style={[styles.dayNum, today && !selected && styles.dayNumToday, selected && styles.dayNumSelected]}>
                    {format(day, 'd')}
                  </Text>
                </View>
                <View style={styles.eventDots}>
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <View key={i} style={[styles.eventDot, { backgroundColor: e.color }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
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
        contentContainerStyle={[styles.content, { paddingBottom: 110, paddingTop: contentPaddingTop + 18 }]}
        refreshControl={<RefreshControl refreshing={isHydratingEvents} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.selectedDateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedDateText}>{format(selectedDate, 'EEEE, MMMM d')}</Text>
            <Text style={styles.selectedDateSub}>
              {selectedEvents.length === 0 ? 'Nothing scheduled' : `${selectedEvents.length} ${selectedEvents.length === 1 ? 'item' : 'items'}`}
            </Text>
          </View>
          {isToday(selectedDate) && (
            <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Today</Text></View>
          )}
        </View>

        {selectedEvents.length > 0 ? (
          selectedEvents
            .slice()
            .sort((a, b) => (a.allDay === b.allDay ? new Date(a.startDate).getTime() - new Date(b.startDate).getTime() : a.allDay ? -1 : 1))
            .map((event) => {
            const attendees = members.filter((m) => event.attendees.includes(m.id));
            const card = (
              <View style={[styles.eventCard, event.isVirtual && styles.eventCardVirtual]}>
                <View style={styles.timeCol}>
                  {event.allDay ? (
                    <Text style={styles.timeAllDay}>All{'\n'}day</Text>
                  ) : (
                    <>
                      <Text style={styles.timeStart}>{format(new Date(event.startDate), 'h:mm')}</Text>
                      <Text style={styles.timeAmPm}>{format(new Date(event.startDate), 'a')}</Text>
                      <Text style={styles.timeEnd}>{format(new Date(event.endDate), 'h:mm a')}</Text>
                    </>
                  )}
                </View>
                <View style={[styles.eventBar, { backgroundColor: event.color }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {event.isVirtual ? (
                      <Ionicons name="link-outline" size={15} color={colors.textMuted} />
                    ) : (
                      <Pressable accessibilityRole="button" onPress={() => handleDeleteEvent(event.id, event.title)} style={styles.eventDeleteBtn} hitSlop={8}>
                        <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                  <View style={[styles.catPill, { backgroundColor: event.color + '22' }]}>
                    <Text style={[styles.catPillText, { color: event.color }]}>{event.category}</Text>
                  </View>
                  {event.isVirtual && event.description && (
                    <Text style={styles.eventLocationText}>{event.description}</Text>
                  )}
                  {event.location && (
                    <View style={styles.eventLocation}>
                      <Ionicons name="location" size={13} color={colors.textMuted} />
                      <Text style={styles.eventLocationText}>{event.location}</Text>
                    </View>
                  )}
                  {attendees.length > 0 && (
                    <View style={styles.attendeesRow}>
                      <View style={{ flexDirection: 'row' }}>
                        {attendees.slice(0, 5).map((a, i) => (
                          <View key={a.id} style={[styles.attendeeRing, { marginLeft: i > 0 ? -9 : 0 }]}>
                            <Avatar name={a.name} color={a.avatarColor} size={26} />
                          </View>
                        ))}
                      </View>
                      <Text style={styles.attendeeCount}>{attendees.length} attending</Text>
                    </View>
                  )}
                </View>
              </View>
            );
            return event.isVirtual ? (
              <Pressable accessibilityRole="button" key={event.id} onPress={() => handleVirtualEventPress(event)}>{card}</Pressable>
            ) : (
              <View key={event.id}>{card}</View>
            );
          })
        ) : (
          <View style={styles.noEvents}>
            <LinearGradient colors={['#E0E7FF', '#DBEAFE']} style={styles.noEventsIcon}>
              <Ionicons name="calendar" size={34} color={colors.primaryLight} />
            </LinearGradient>
            <Text style={styles.noEventsTitle}>No events</Text>
            <Text style={styles.noEventsDesc}>Tap + to add an event for this day</Text>
            <Pressable accessibilityRole="button" onPress={() => setShowModal(true)} style={styles.noEventsCta}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.noEventsCtaText}>Add Event</Text>
            </Pressable>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
            {EVENT_CATEGORIES.map((cat) => (
              <Pressable accessibilityRole="button" key={cat} onPress={() => setNewCategory(cat)} style={[styles.catChip, newCategory === cat && styles.catChipActive]}>
                <Text style={[styles.catChipText, newCategory === cat && styles.catChipTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Color</Text>
          <View style={styles.colorRow}>
            {EVENT_COLORS.map((c) => (
              <Pressable accessibilityRole="button" key={c} onPress={() => setNewColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, newColor === c && styles.colorSwatchSelected]}>
                {newColor === c && <Ionicons name="checkmark" size={18} color="#fff" />}
              </Pressable>
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
  headerRound: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 18 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  /* ── Month navigator ── */
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 14 },
  monthBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  monthCenter: { alignItems: 'center', gap: 4 },
  monthTitle: { fontSize: 19, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  todayJump: { paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(245,166,35,0.9)' },
  todayJumpText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  /* ── Calendar card ── */
  calCard: { backgroundColor: colors.card, borderRadius: 24, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 6, ...shadows.md },
  dayLabels: { flexDirection: 'row', marginBottom: 4 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', paddingTop: 3, height: 50 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected: { backgroundColor: colors.primary },
  dayCircleToday: { borderWidth: 2, borderColor: colors.secondary },
  dayNum: { fontSize: 15, fontWeight: '700', color: colors.text },
  dayNumSelected: { color: '#fff', fontWeight: '800' },
  dayNumToday: { color: '#B45309', fontWeight: '800' },
  eventDots: { flexDirection: 'row', gap: 3, marginTop: 3, height: 5 },
  eventDot: { width: 5, height: 5, borderRadius: 2.5 },

  /* ── Selected day ── */
  content: { padding: 16 },
  selectedDateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 4 },
  selectedDateText: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.4 },
  selectedDateSub: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },
  todayBadge: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  todayBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  /* ── Event cards ── */
  eventCard: { flexDirection: 'row', alignItems: 'stretch', gap: 12, marginBottom: 12, padding: 14, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  eventCardVirtual: { opacity: 0.9, borderStyle: 'dashed', backgroundColor: colors.surface },
  timeCol: { width: 50, alignItems: 'center', justifyContent: 'center' },
  timeStart: { fontSize: 17, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  timeAmPm: { fontSize: 10.5, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase' },
  timeEnd: { fontSize: 10, fontWeight: '600', color: colors.textMuted, marginTop: 6 },
  timeAllDay: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, textAlign: 'center', lineHeight: 16 },
  eventBar: { width: 4, borderRadius: 2 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  eventTitle: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1, letterSpacing: -0.2 },
  eventDeleteBtn: { padding: 2 },
  catPill: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, marginBottom: 8 },
  catPillText: { fontSize: 11.5, fontWeight: '800' },
  eventLocation: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  eventLocationText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  attendeesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attendeeRing: { borderRadius: 15, borderWidth: 2, borderColor: colors.card, overflow: 'hidden' },
  attendeeCount: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

  /* ── Empty ── */
  noEvents: { alignItems: 'center', paddingVertical: 40 },
  noEventsIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  noEventsTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 18 },
  noEventsDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
  noEventsCta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, backgroundColor: colors.primary, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 999, ...shadows.md },
  noEventsCtaText: { fontSize: 14.5, fontWeight: '800', color: '#fff' },

  /* ── Add-event sheet ── */
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 4, letterSpacing: -0.4 },
  modalDate: { fontSize: 14, color: colors.textSecondary, marginBottom: 20, fontWeight: '600' },
  modalInput: { backgroundColor: colors.card, borderRadius: 16, padding: 15, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 14, ...shadows.sm },
  modalLabel: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  allDayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 18, borderWidth: 1.5, borderColor: colors.border },
  allDayLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  catChip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginRight: 8, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  catChipTextActive: { color: '#fff' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 22, flexWrap: 'wrap' },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.card, ...shadows.md },
  attendeePickChip: { alignItems: 'center', marginRight: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent' },
  attendeePickChipActive: { borderColor: colors.primary, backgroundColor: '#E8EEF9' },
  attendeePickName: { fontSize: 11, color: colors.textSecondary, marginTop: 4, fontWeight: '600' },
});
