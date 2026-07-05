import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, formatDistanceToNow } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { Badge } from '../../components/common/Badge';
import { useFamilyMeetingsStore, type FamilyMeeting } from '../../store/useFamilyMeetingsStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useTranslation } from 'react-i18next';

const AGENDA_TEMPLATE_KEYS = ['wins', 'reviewLastWeek', 'thisWeekPriorities', 'concerns'] as const;

const MOODS = ['😄', '🙂', '😐', '😕', '😣'];

const TEMPLATE_STEP_KEYS = ['wins', 'reviewLastWeek', 'thisWeekPlan', 'concerns', 'assignActions'] as const;
const TEMPLATE_STEP_TIMES = ['0-5m', '5-15m', '15-22m', '22-28m', '28-30m'] as const;

export function FamilyMeetingScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const {
    meetings, addMeeting, deleteMeeting, toggleAgendaItem, updateNotes,
    setMood, setDuration, setAttendees, addActionItem, toggleActionItem,
  } = useFamilyMeetingsStore();
  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newActionText, setNewActionText] = useState<Record<string, string>>({});
  const [newActionAssignee, setNewActionAssignee] = useState<Record<string, string>>({});
  const [editingAttendeesId, setEditingAttendeesId] = useState<string | null>(null);

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? t('family.screens.familyMeeting.unknownMember');

  const totalMeetings = meetings.length;
  const totalActions = meetings.flatMap((m) => m.actionItems).length;
  const completedActions = meetings.flatMap((m) => m.actionItems).filter((a) => a.done).length;
  const durationsRecorded = meetings.filter((m) => m.durationMinutes !== undefined);
  const avgDuration = durationsRecorded.length > 0
    ? Math.round(durationsRecorded.reduce((s, m) => s + (m.durationMinutes ?? 0), 0) / durationsRecorded.length)
    : null;

  const handleNewMeeting = () => {
    Alert.alert(
      t('family.screens.familyMeeting.newMeetingTitle'),
      t('family.screens.familyMeeting.newMeetingMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('family.screens.familyMeeting.create'),
          onPress: () => {
            const id = addMeeting({
              familyId: family?.id ?? 'demo-family',
              date: new Date().toISOString(),
              title: t('family.screens.familyMeeting.defaultMeetingTitle', { n: totalMeetings + 1 }),
              attendeeIds: members.map((m) => m.id),
              agenda: AGENDA_TEMPLATE_KEYS.map((key) => ({
                id: Math.random().toString(36).slice(2),
                text: t(`family.screens.familyMeeting.agendaTemplate.${key}`),
                done: false,
              })),
              notes: '',
              actionItems: [],
            });
            setExpandedId(id);
          },
        },
      ]
    );
  };

  const handleDelete = (meeting: FamilyMeeting) => {
    Alert.alert(
      t('family.screens.familyMeeting.deleteMeetingTitle'),
      t('family.screens.familyMeeting.deleteMeetingMessage', { title: meeting.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteMeeting(meeting.id) },
      ]
    );
  };

  const handleAddAction = (meetingId: string) => {
    const text = (newActionText[meetingId] ?? '').trim();
    const assignee = newActionAssignee[meetingId] || members[0]?.id;
    if (!text || !assignee) return;
    addActionItem(meetingId, text, assignee);
    setNewActionText((s) => ({ ...s, [meetingId]: '' }));
  };

  const screenHeader = (
    <LinearGradient colors={['#1565C0', '#0D47A1']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('family.screens.familyMeeting.headerTitle')}</Text>
          <Text style={styles.headerSub}>{t('family.screens.familyMeeting.headerSub')}</Text>
        </View>
        <Pressable onPress={handleNewMeeting} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalMeetings}</Text>
          <Text style={styles.statLabel}>{t('family.screens.familyMeeting.statMeetingsHeld')}</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
          <Text style={styles.statValue}>{completedActions}/{totalActions}</Text>
          <Text style={styles.statLabel}>{t('family.screens.familyMeeting.statActionsDone')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{avgDuration !== null ? `${avgDuration}m` : '—'}</Text>
          <Text style={styles.statLabel}>{t('family.screens.familyMeeting.statAvgDuration')}</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#1565C0', '#0D47A1']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('family.screens.familyMeeting.headerTitle')}</Text>
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
        <Card variant="elevated" style={styles.tipCard}>
          <View style={styles.tipRow}>
            <Ionicons name="bulb" size={18} color={colors.secondary} />
            <Text style={styles.tipText}>Families who meet weekly show better communication and faster conflict resolution.</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Meeting History</Text>

        {meetings.length === 0 && (
          <Text style={styles.emptyText}>No meetings recorded yet. Tap + to start your first one.</Text>
        )}

        {meetings.map((meeting) => {
          const isExpanded = expandedId === meeting.id;
          const pendingActions = meeting.actionItems.filter((a) => !a.done).length;
          const isEditingAttendees = editingAttendeesId === meeting.id;

          return (
            <Card key={meeting.id} variant="elevated" style={styles.meetingCard}>
              <Pressable onPress={() => setExpandedId(isExpanded ? null : meeting.id)} onLongPress={() => handleDelete(meeting)}>
                <View style={styles.meetingHeader}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateDay}>{format(new Date(meeting.date), 'd')}</Text>
                    <Text style={styles.dateMonth}>{format(new Date(meeting.date), 'MMM')}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.meetingTitle}>{meeting.title}</Text>
                    <View style={styles.meetingMeta}>
                      <Text style={styles.meetingTime}>
                        {meeting.mood ? `${meeting.mood} ` : ''}{meeting.durationMinutes !== undefined ? `${meeting.durationMinutes}m • ` : ''}
                      </Text>
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

                <View style={styles.attendeeRow}>
                  {meeting.attendeeIds.map((id) => {
                    const m = members.find((mm) => mm.id === id);
                    return (
                      <View key={id} style={[styles.attendeeChip, m && { backgroundColor: m.avatarColor }]}>
                        <Text style={styles.attendeeText}>{memberName(id).charAt(0)}</Text>
                      </View>
                    );
                  })}
                </View>
              </Pressable>

              {isExpanded && (
                <View style={styles.expanded}>
                  <View style={styles.divider} />

                  <View style={styles.expandedLabelRow}>
                    <Text style={styles.expandedLabel}>👥 Attendees</Text>
                    <Pressable onPress={() => setEditingAttendeesId(isEditingAttendees ? null : meeting.id)}>
                      <Text style={styles.editLink}>{isEditingAttendees ? 'Done' : 'Edit'}</Text>
                    </Pressable>
                  </View>
                  {isEditingAttendees ? (
                    <View style={styles.chipRow}>
                      {members.map((m) => {
                        const selected = meeting.attendeeIds.includes(m.id);
                        return (
                          <Pressable
                            key={m.id}
                            onPress={() => setAttendees(
                              meeting.id,
                              selected ? meeting.attendeeIds.filter((id) => id !== m.id) : [...meeting.attendeeIds, m.id]
                            )}
                            style={[styles.memberChip, selected && { backgroundColor: m.avatarColor + '25', borderColor: m.avatarColor }]}
                          >
                            <Text style={[styles.memberChipText, selected && { color: m.avatarColor, fontWeight: '800' }]}>{m.name}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.attendeeNames}>{meeting.attendeeIds.map(memberName).join(', ') || 'None yet'}</Text>
                  )}

                  <Text style={styles.expandedLabel}>📋 Agenda</Text>
                  {meeting.agenda.map((item) => (
                    <Pressable key={item.id} style={styles.agendaItem} onPress={() => toggleAgendaItem(meeting.id, item.id)}>
                      <Ionicons
                        name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={item.done ? colors.success : colors.textMuted}
                      />
                      <Text style={[styles.agendaText, item.done && styles.agendaTextDone]}>{item.text}</Text>
                    </Pressable>
                  ))}

                  <Text style={styles.expandedLabel}>📝 Notes</Text>
                  <TextInput
                    style={styles.notesInput}
                    multiline
                    placeholder="What did the family discuss?"
                    placeholderTextColor={colors.textMuted}
                    value={meeting.notes}
                    onChangeText={(text) => updateNotes(meeting.id, text)}
                  />

                  <Text style={styles.expandedLabel}>✅ Action Items</Text>
                  {meeting.actionItems.map((action) => (
                    <Pressable key={action.id} style={styles.actionItem} onPress={() => toggleActionItem(meeting.id, action.id)}>
                      <Ionicons
                        name={action.done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={action.done ? colors.success : colors.warning}
                      />
                      <Text style={[styles.actionText, action.done && styles.actionTextDone]}>{action.text}</Text>
                      <Text style={styles.actionAssignee}>{memberName(action.assigneeId)}</Text>
                    </Pressable>
                  ))}
                  <View style={styles.addActionRow}>
                    <TextInput
                      style={styles.addActionInput}
                      placeholder="New action item…"
                      placeholderTextColor={colors.textMuted}
                      value={newActionText[meeting.id] ?? ''}
                      onChangeText={(text) => setNewActionText((s) => ({ ...s, [meeting.id]: text }))}
                    />
                    <Pressable style={styles.addActionBtn} onPress={() => handleAddAction(meeting.id)}>
                      <Ionicons name="add" size={18} color="#fff" />
                    </Pressable>
                  </View>
                  <View style={styles.chipRow}>
                    {members.map((m) => (
                      <Pressable
                        key={m.id}
                        onPress={() => setNewActionAssignee((s) => ({ ...s, [meeting.id]: m.id }))}
                        style={[styles.memberChip, (newActionAssignee[meeting.id] ?? members[0]?.id) === m.id && { backgroundColor: m.avatarColor + '25', borderColor: m.avatarColor }]}
                      >
                        <Text style={[styles.memberChipText, (newActionAssignee[meeting.id] ?? members[0]?.id) === m.id && { color: m.avatarColor, fontWeight: '800' }]}>{m.name}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.expandedLabel}>😊 Mood</Text>
                  <View style={styles.moodRow}>
                    {MOODS.map((emoji) => (
                      <Pressable
                        key={emoji}
                        onPress={() => setMood(meeting.id, emoji)}
                        style={[styles.moodBtn, meeting.mood === emoji && styles.moodBtnActive]}
                      >
                        <Text style={styles.moodEmoji}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.expandedLabelRow}>
                    <Text style={styles.expandedLabel}>⏱️ Duration (minutes)</Text>
                  </View>
                  <TextInput
                    style={styles.durationInput}
                    placeholder="e.g. 30"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={meeting.durationMinutes !== undefined ? String(meeting.durationMinutes) : ''}
                    onChangeText={(text) => {
                      const n = parseInt(text, 10);
                      if (!isNaN(n)) setDuration(meeting.id, n);
                    }}
                  />
                </View>
              )}
            </Card>
          );
        })}

        <Text style={styles.sectionTitle}>{t('family.screens.familyMeeting.templateSection')}</Text>
        <Card variant="elevated" style={styles.templateCard}>
          <Text style={styles.templateTitle}>{t('family.screens.familyMeeting.templateTitle')}</Text>
          {([
            { time: '0-5m',   key: 'wins' },
            { time: '5-15m',  key: 'reviewLastWeek' },
            { time: '15-22m', key: 'thisWeekPlan' },
            { time: '22-28m', key: 'concerns' },
            { time: '28-30m', key: 'assignActions' },
          ] as const).map((step) => (
            <View key={step.time} style={styles.templateStep}>
              <View style={styles.templateTimeBox}>
                <Text style={styles.templateTime}>{step.time}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.templateStepTitle}>{t(`family.screens.familyMeeting.template.${step.key}.title`)}</Text>
                <Text style={styles.templateStepDesc}>{t(`family.screens.familyMeeting.template.${step.key}.desc`)}</Text>
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
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 20, lineHeight: 19 },
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
  attendeeNames: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  expanded: { marginTop: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 14 },
  expandedLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expandedLabel: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 10 },
  editLink: { fontSize: 12, fontWeight: '700', color: colors.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  memberChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  memberChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  agendaItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  agendaText: { fontSize: 13, color: colors.text },
  agendaTextDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  notesInput: { fontSize: 13, color: colors.text, lineHeight: 20, marginBottom: 6, minHeight: 70, textAlignVertical: 'top', backgroundColor: colors.background, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.border },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  actionText: { flex: 1, fontSize: 13, color: colors.text },
  actionTextDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  actionAssignee: { fontSize: 11, color: colors.primary, fontWeight: '700', backgroundColor: '#EBF5FB', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8 },
  addActionRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 8 },
  addActionInput: { flex: 1, fontSize: 13, color: colors.text, backgroundColor: colors.background, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border },
  addActionBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  moodRow: { flexDirection: 'row', gap: 10 },
  moodBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border },
  moodBtnActive: { borderColor: colors.primary, backgroundColor: '#EBF5FB' },
  moodEmoji: { fontSize: 18 },
  durationInput: { fontSize: 13, color: colors.text, backgroundColor: colors.background, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, width: 100 },
  templateCard: { borderRadius: 16 },
  templateTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 14 },
  templateStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  templateTimeBox: { backgroundColor: '#EBF5FB', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, minWidth: 52, alignItems: 'center' },
  templateTime: { fontSize: 11, fontWeight: '700', color: '#1565C0' },
  templateStepTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  templateStepDesc: { fontSize: 12, color: colors.textSecondary },
});
