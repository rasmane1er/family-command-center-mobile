import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { useFamilyStore } from '../../store/useFamilyStore';

const { width } = Dimensions.get('window');
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const events = useFamilyStore((s) => s.events);
  const members = useFamilyStore((s) => s.members);

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
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#1E4A8A']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Family Calendar</Text>
          <Pressable style={styles.addBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>

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
      </LinearGradient>

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
              <Card key={event.id} style={styles.eventCard} onPress={() => {}} variant="elevated">
                <View style={styles.eventRow}>
                  <View style={[styles.eventBar, { backgroundColor: event.color }]} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventCategory}>{event.category}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
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
  eventCategory: { fontSize: 11, color: colors.textSecondary, marginLeft: 8 },
  eventTime: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  eventTimeText: { fontSize: 13, color: colors.textSecondary },
  eventLocation: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  eventLocationText: { fontSize: 13, color: colors.textSecondary },
  attendeesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attendeeCount: { fontSize: 12, color: colors.textSecondary, marginLeft: 4 },
  noEvents: { alignItems: 'center', paddingVertical: 60 },
  noEventsTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 },
  noEventsDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
});
