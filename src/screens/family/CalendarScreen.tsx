import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Modal, TextInput, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { CalendarEvent } from '../../types';

const EVENT_CATEGORIES = ['Family', 'School', 'Medical', 'Sports', 'Work', 'Social', 'Holiday', 'Other'];
const EVENT_COLORS = ['#E74C3C', '#E67E22', '#F1C40F', '#27AE60', '#2980B9', '#9B59B6', '#E91E63', '#00BCD4'];
const generateId = () => Math.random().toString(36).substring(2, 11);

const { width } = Dimensions.get('window');
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarScreen({ navigation }: any) {
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
  const addEvent = useFamilyStore((s) => s.addEvent);
  const deleteEvent = useFamilyStore((s) => s.deleteEvent);

  const handleAddEvent = () => {
    if (!newTitle.trim()) return;
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(10, 0, 0, 0);
    const event: CalendarEvent = {
      id: generateId(),
      familyId: 'demo-family',
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
      createdBy: members[0]?.id || 'user',
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
    Alert.alert('Delete Event', `Remove "${title}"?`, [
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

  const selectedEvents = events.filter((e) => isSameDay(new Date(e.startDate), selectedDate));
  const getDayEvents = (date: Date) => events.filter((e) => isSameDay(new Date(e.startDate), date));

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  return (
    <View style={styles.container}>
      <PremiumHeader
        title="Family Calendar"
        onBack={() => navigation.goBack()}
        rightAction={
          <Pressable onPress={() => setShowModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        }
      >
        {/* Month navigator */}
        <View style={styles.monthNav}>
          <Pressable onPress={prevMonth} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
          <Pressable onPress={nextMonth} style={styles.monthBtn}>
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
              <Pressable key={day.toISOString()} onPress={() => setSelectedDate(day)} style={[styles.dayCell, selected && styles.dayCellSelected, today && !selected && styles.dayCellToday]}>
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

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        <View style={styles.selectedDateRow}>
          <Text style={styles.selectedDateText}>{format(selectedDate, 'EEEE, MMMM d')}</Text>
          {isToday(selectedDate) && (
            <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Today</Text></View>
          )}
        </View>

        {selectedEvents.length > 0 ? (
          selectedEvents.map((event) => {
            const attendees = members.filter((m) => event.attendees.includes(m.id));
            return (
              <Card key={event.id} style={styles.eventCard} variant="elevated">
                <View style={styles.eventRow}>
                  <View style={[styles.eventBar, { backgroundColor: event.color }]} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <View style={styles.eventHeaderRight}>
                        <Text style={styles.eventCategory}>{event.category}</Text>
                        <Pressable onPress={() => handleDeleteEvent(event.id, event.title)} style={styles.eventDeleteBtn}>
                          <Ionicons name="trash-outline" size={14} color={colors.danger} />
                        </Pressable>
                      </View>
                    </View>
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
          })
        ) : (
          <View style={styles.noEvents}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.noEventsTitle}>No events</Text>
            <Text style={styles.noEventsDesc}>Tap + to add an event for this day</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Event</Text>
          <Text style={styles.modalDate}>{format(selectedDate, 'EEEE, MMMM d')}</Text>

          <TextInput
            style={styles.modalInput}
            placeholder="Event title..."
            value={newTitle}
            onChangeText={setNewTitle}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          <TextInput
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
              <Pressable key={cat} onPress={() => setNewCategory(cat)} style={[styles.catChip, newCategory === cat && styles.catChipActive]}>
                <Text style={[styles.catChipText, newCategory === cat && styles.catChipTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Color</Text>
          <View style={styles.colorRow}>
            {EVENT_COLORS.map((c) => (
              <Pressable key={c} onPress={() => setNewColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, newColor === c && styles.colorSwatchSelected]} />
            ))}
          </View>

          <Text style={styles.modalLabel}>Attendees</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {members.map((m) => (
              <Pressable key={m.id} onPress={() => toggleAttendee(m.id)} style={[styles.attendeePickChip, newAttendees.includes(m.id) && styles.attendeePickChipActive]}>
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
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 4 },
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
