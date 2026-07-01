import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, formatDistanceToNow } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { Badge } from '../../components/common/Badge';

interface AgendaItem {
  id: string;
  text: string;
  done: boolean;
}

interface MeetingNote {
  id: string;
  date: string;
  title: string;
  attendees: string[];
  agenda: AgendaItem[];
  notes: string;
  actionItems: { text: string; assignee: string; done: boolean }[];
  mood: string;
  duration: number;
}

const DEMO_MEETINGS: MeetingNote[] = [
  {
    id: 'm1',
    date: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    title: 'Weekly Family Sync #12',
    attendees: ['Sarah', 'Marcus', 'Aiden', 'Lily'],
    agenda: [
      { id: 'a1', text: 'Review last week\'s goals', done: true },
      { id: 'a2', text: 'Summer vacation planning', done: true },
      { id: 'a3', text: 'Chore rotation update', done: true },
      { id: 'a4', text: 'Aiden\'s school performance', done: true },
    ],
    notes: 'Great energy this week! Everyone excited about the Hawaii trip. Aiden got an A on his math test — family celebration dinner planned for Friday. Discussed switching Lily to swimming lessons in July.',
    actionItems: [
      { text: 'Book Hawaii flights for August', assignee: 'Marcus', done: true },
      { text: 'Register Lily for summer camp', assignee: 'Sarah', done: false },
      { text: 'Clean up garage this weekend', assignee: 'Aiden', done: false },
    ],
    mood: '😄',
    duration: 35,
  },
  {
    id: 'm2',
    date: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
    title: 'Weekly Family Sync #11',
    attendees: ['Sarah', 'Marcus', 'Aiden'],
    agenda: [
      { id: 'b1', text: 'Budget review — May expenses', done: true },
      { id: 'b2', text: 'Marcus\'s project update', done: true },
      { id: 'b3', text: 'Discuss phone rules for Aiden', done: true },
    ],
    notes: "Lily wasn't feeling well — excused. Went over budget in dining by $120 — agreed to cook more at home. Aiden agreed to no phone at dinner in exchange for extra gaming time on weekends.",
    actionItems: [
      { text: 'Set up meal prep Sunday', assignee: 'Sarah', done: true },
      { text: 'Set parental controls on Aiden\'s phone', assignee: 'Marcus', done: true },
    ],
    mood: '🙂',
    duration: 28,
  },
];

export function FamilyMeetingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [meetings, setMeetings] = useState(DEMO_MEETINGS);
  const [expandedId, setExpandedId] = useState<string | null>('m1');

  const totalMeetings = meetings.length;
  const totalActions = meetings.flatMap((m) => m.actionItems).length;
  const completedActions = meetings.flatMap((m) => m.actionItems).filter((a) => a.done).length;

  const handleNewMeeting = () => {
    Alert.alert('New Meeting', 'Create a new family meeting record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Create',
        onPress: () => {
          const newMeeting: MeetingNote = {
            id: `m${Date.now()}`,
            date: new Date().toISOString(),
            title: `Weekly Family Sync #${totalMeetings + 1}`,
            attendees: ['Sarah', 'Marcus', 'Aiden', 'Lily'],
            agenda: [
              { id: 'x1', text: 'Review last week', done: false },
              { id: 'x2', text: 'This week\'s priorities', done: false },
              { id: 'x3', text: 'Any concerns or celebrations?', done: false },
            ],
            notes: 'Meeting notes will appear here...',
            actionItems: [],
            mood: '😐',
            duration: 0,
          };
          setMeetings([newMeeting, ...meetings]);
          setExpandedId(newMeeting.id);
        },
      },
    ]);
  };

  const screenHeader = (
    <LinearGradient colors={['#1565C0', '#0D47A1']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Family Meetings</Text>
          <Text style={styles.headerSub}>Building connection through regular check-ins</Text>
        </View>
        <Pressable onPress={handleNewMeeting} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalMeetings}</Text>
          <Text style={styles.statLabel}>Meetings Held</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
          <Text style={styles.statValue}>{completedActions}/{totalActions}</Text>
          <Text style={styles.statLabel}>Actions Done</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>35m</Text>
          <Text style={styles.statLabel}>Avg Duration</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#1565C0', '#0D47A1']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>Family Meetings</Text>
      <Pressable onPress={handleNewMeeting} style={styles.addBtn}>
        <Ionicons name="add" size={22} color="#fff" />
      </Pressable>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
      >
        {/* Meeting cadence tip */}
        <Card variant="elevated" style={styles.tipCard}>
          <View style={styles.tipRow}>
            <Ionicons name="bulb" size={18} color={colors.secondary} />
            <Text style={styles.tipText}>Families who meet weekly show 40% better communication and 3x faster conflict resolution.</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Meeting History</Text>

        {meetings.map((meeting) => {
          const isExpanded = expandedId === meeting.id;
          const pendingActions = meeting.actionItems.filter((a) => !a.done).length;

          return (
            <Card key={meeting.id} variant="elevated" style={styles.meetingCard}>
              <Pressable onPress={() => setExpandedId(isExpanded ? null : meeting.id)}>
                <View style={styles.meetingHeader}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateDay}>{format(new Date(meeting.date), 'd')}</Text>
                    <Text style={styles.dateMonth}>{format(new Date(meeting.date), 'MMM')}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.meetingTitle}>{meeting.title}</Text>
                    <View style={styles.meetingMeta}>
                      <Text style={styles.meetingTime}>{meeting.mood} {meeting.duration}m • </Text>
                      <Text style={styles.meetingAgo}>{formatDistanceToNow(new Date(meeting.date), { addSuffix: true })}</Text>
                    </View>
                  </View>
                  <View style={styles.meetingRight}>
                    {pendingActions > 0 && (
                      <Badge label={`${pendingActions} pending`} variant="warning" size="sm" />
                    )}
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                  </View>
                </View>

                {/* Attendees */}
                <View style={styles.attendeeRow}>
                  {meeting.attendees.map((name) => (
                    <View key={name} style={styles.attendeeChip}>
                      <Text style={styles.attendeeText}>{name.charAt(0)}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>

              {isExpanded && (
                <View style={styles.expanded}>
                  <View style={styles.divider} />

                  <Text style={styles.expandedLabel}>📋 Agenda</Text>
                  {meeting.agenda.map((item) => (
                    <View key={item.id} style={styles.agendaItem}>
                      <Ionicons
                        name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={item.done ? colors.success : colors.textMuted}
                      />
                      <Text style={[styles.agendaText, item.done && styles.agendaTextDone]}>{item.text}</Text>
                    </View>
                  ))}

                  <Text style={styles.expandedLabel}>📝 Notes</Text>
                  <Text style={styles.notes}>{meeting.notes}</Text>

                  {meeting.actionItems.length > 0 && (
                    <>
                      <Text style={styles.expandedLabel}>✅ Action Items</Text>
                      {meeting.actionItems.map((action, i) => (
                        <View key={i} style={styles.actionItem}>
                          <Ionicons
                            name={action.done ? 'checkmark-circle' : 'ellipse-outline'}
                            size={16}
                            color={action.done ? colors.success : colors.warning}
                          />
                          <Text style={[styles.actionText, action.done && styles.actionTextDone]}>{action.text}</Text>
                          <Text style={styles.actionAssignee}>{action.assignee}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              )}
            </Card>
          );
        })}

        {/* Agenda Template */}
        <Text style={styles.sectionTitle}>Meeting Template</Text>
        <Card variant="elevated" style={styles.templateCard}>
          <Text style={styles.templateTitle}>✨ 30-Minute Family Meeting Formula</Text>
          {[
            { time: '0-5m', title: 'Wins & Celebrations', desc: 'Start with positives — what went well?' },
            { time: '5-15m', title: 'Review Last Week', desc: 'How did action items go? Any blockers?' },
            { time: '15-22m', title: 'This Week\'s Plan', desc: 'Set 3 family priorities for the week' },
            { time: '22-28m', title: 'Any Concerns?', desc: 'Open floor — anyone need support?' },
            { time: '28-30m', title: 'Assign Actions', desc: 'Who does what by when? Be specific.' },
          ].map((step) => (
            <View key={step.time} style={styles.templateStep}>
              <View style={styles.templateTimeBox}>
                <Text style={styles.templateTime}>{step.time}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.templateStepTitle}>{step.title}</Text>
                <Text style={styles.templateStepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
        )}
      </CollapsibleHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  back: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  content: { padding: 16 },
  tipCard: { borderRadius: 14, backgroundColor: '#FEF3E2', marginBottom: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 12 },
  meetingCard: { borderRadius: 16, marginBottom: 12 },
  meetingHeader: { flexDirection: 'row', alignItems: 'center' },
  dateBadge: { width: 46, height: 54, backgroundColor: '#EBF5FB', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 18, fontWeight: '800', color: '#1565C0' },
  dateMonth: { fontSize: 11, color: '#1565C0', fontWeight: '600', textTransform: 'uppercase' },
  meetingTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
  meetingMeta: { flexDirection: 'row', alignItems: 'center' },
  meetingTime: { fontSize: 12, color: colors.textSecondary },
  meetingAgo: { fontSize: 12, color: colors.textMuted },
  meetingRight: { alignItems: 'flex-end', gap: 4 },
  attendeeRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  attendeeChip: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center' },
  attendeeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  expanded: { marginTop: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 14 },
  expandedLabel: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  agendaItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  agendaText: { fontSize: 13, color: colors.text },
  agendaTextDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  notes: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 14 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  actionText: { flex: 1, fontSize: 13, color: colors.text },
  actionTextDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  actionAssignee: { fontSize: 11, color: colors.primary, fontWeight: '700', backgroundColor: '#EBF5FB', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8 },
  templateCard: { borderRadius: 16 },
  templateTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 14 },
  templateStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  templateTimeBox: { backgroundColor: '#EBF5FB', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, minWidth: 52, alignItems: 'center' },
  templateTime: { fontSize: 11, fontWeight: '700', color: '#1565C0' },
  templateStepTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  templateStepDesc: { fontSize: 12, color: colors.textSecondary },
});
