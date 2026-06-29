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
import { spacing, shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useBirthdayStore, Birthday, Relationship } from '../../store/useBirthdayStore';

type Tab = 'upcoming' | 'all' | 'calendar';

const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  self: 'Myself',
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  sibling: 'Sibling',
  friend: 'Friend',
  coworker: 'Coworker',
  other: 'Other',
};

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F5A623', '#00D4AA'];
const REMIND_OPTIONS = [1, 3, 7, 14, 30];
const RELATIONSHIPS: Relationship[] = ['self', 'spouse', 'child', 'parent', 'sibling', 'friend', 'coworker', 'other'];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(mmdd: string): string {
  const [mm, dd] = mmdd.split('-').map(Number);
  return `${MONTH_NAMES[mm - 1]} ${dd}`;
}

function CountdownBadge({ days }: { days: number }) {
  if (days === 0) {
    return (
      <View style={[styles.countdownBadge, { backgroundColor: '#FFD700' }]}>
        <Text style={[styles.countdownText, { color: '#7B5800' }]}>Today! 🎂</Text>
      </View>
    );
  }
  if (days === 1) {
    return (
      <View style={[styles.countdownBadge, { backgroundColor: '#FCE4EC' }]}>
        <Text style={[styles.countdownText, { color: '#C2185B' }]}>Tomorrow</Text>
      </View>
    );
  }
  if (days <= 30) {
    return (
      <View style={[styles.countdownBadge, { backgroundColor: '#E3F2FD' }]}>
        <Text style={[styles.countdownText, { color: '#1565C0' }]}>{days} days</Text>
      </View>
    );
  }
  return (
    <View style={[styles.countdownBadge, { backgroundColor: colors.border }]}>
      <Text style={[styles.countdownText, { color: colors.textSecondary }]}>Next month</Text>
    </View>
  );
}

function BirthdayCard({ birthday, daysUntil, onPress }: {
  birthday: Birthday;
  daysUntil: number;
  onPress: () => void;
}) {
  const initial = birthday.name.charAt(0).toUpperCase();
  const age = birthday.birthYear
    ? new Date().getFullYear() - birthday.birthYear + (daysUntil === 0 ? 0 : 0)
    : null;
  const turningAge = birthday.birthYear
    ? new Date().getFullYear() - birthday.birthYear + (daysUntil > 0 ? 1 : 0)
    : null;

  return (
    <Card
      style={{ marginBottom: 10, borderRadius: 16 }}
      variant="elevated"
      onPress={onPress}
    >
      <View style={styles.bCardRow}>
        <View style={[styles.avatarCircle, { backgroundColor: birthday.avatarColor }]}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.bCardNameRow}>
            <Text style={styles.bCardName}>{birthday.name}</Text>
            <CountdownBadge days={daysUntil} />
          </View>
          <View style={styles.bCardMetaRow}>
            <Badge
              label={RELATIONSHIP_LABELS[birthday.relationship]}
              variant="primary"
              size="sm"
            />
            <Text style={styles.bCardDate}>{formatDate(birthday.date)}</Text>
          </View>
          {turningAge !== null && (
            <Text style={styles.bCardAge}>
              {daysUntil === 0 ? `Turning ${age}` : `Turning ${turningAge}`}
            </Text>
          )}
          {birthday.giftIdeas && birthday.giftIdeas.length > 0 && (
            <View style={styles.giftChips}>
              {birthday.giftIdeas.slice(0, 2).map((idea, i) => (
                <View key={i} style={styles.giftChip}>
                  <Text style={styles.giftChipText}>🎁 {idea}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

function CalendarTab({ birthdays, getDaysUntil }: { birthdays: Birthday[]; getDaysUntil: (d: string) => number }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const [viewMonth, setViewMonth] = useState(month);
  const [viewYear, setViewYear] = useState(year);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const birthdaysInMonth = useMemo(() => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    return birthdays.filter((b) => b.date.startsWith(mm + '-'));
  }, [birthdays, viewMonth]);

  const birthdayDays = useMemo(() => {
    const set = new Set<number>();
    birthdaysInMonth.forEach((b) => {
      const dd = parseInt(b.date.split('-')[1], 10);
      set.add(dd);
    });
    return set;
  }, [birthdaysInMonth]);

  const selectedBirthdays = useMemo(() => {
    if (!selectedDay) return [];
    const dd = String(selectedDay).padStart(2, '0');
    const mm = String(viewMonth + 1).padStart(2, '0');
    return birthdays.filter((b) => b.date === `${mm}-${dd}`);
  }, [selectedDay, birthdays, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
    setSelectedDay(null);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calMonthNav}>
        <Pressable onPress={prevMonth} style={styles.calNavBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.calMonthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <Pressable onPress={nextMonth} style={styles.calNavBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.calDayHeaders}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} style={styles.calDayHeaderText}>{d}</Text>
        ))}
      </View>

      <View style={styles.calGrid}>
        {cells.map((day, i) => {
          const hasBirthday = day !== null && birthdayDays.has(day);
          const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          const isSelected = day === selectedDay;
          return (
            <Pressable
              key={i}
              onPress={() => day && setSelectedDay(day === selectedDay ? null : day)}
              style={[
                styles.calCell,
                isSelected && styles.calCellSelected,
                isToday && !isSelected && styles.calCellToday,
              ]}
            >
              {day !== null && (
                <>
                  <Text style={[
                    styles.calCellText,
                    isSelected && styles.calCellTextSelected,
                    isToday && !isSelected && styles.calCellTextToday,
                  ]}>{day}</Text>
                  {hasBirthday && (
                    <View style={[styles.calDot, isSelected && styles.calDotSelected]} />
                  )}
                </>
              )}
            </Pressable>
          );
        })}
      </View>

      {selectedBirthdays.length > 0 && (
        <View style={styles.calSelectedBirthdays}>
          <Text style={styles.calSelectedTitle}>
            {MONTH_NAMES[viewMonth]} {selectedDay} Birthdays
          </Text>
          {selectedBirthdays.map((b) => (
            <View key={b.id} style={styles.calBirthdayRow}>
              <View style={[styles.calAvatarCircle, { backgroundColor: b.avatarColor }]}>
                <Text style={styles.calAvatarInitial}>{b.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.calBirthdayName}>{b.name}</Text>
                {b.birthYear && (
                  <Text style={styles.calBirthdayAge}>
                    Turning {viewYear - b.birthYear}
                  </Text>
                )}
              </View>
              <Badge label={RELATIONSHIP_LABELS[b.relationship]} variant="primary" size="sm" />
            </View>
          ))}
        </View>
      )}

      {birthdaysInMonth.length === 0 && (
        <View style={styles.calEmpty}>
          <Text style={styles.calEmptyText}>No birthdays this month</Text>
        </View>
      )}
    </View>
  );
}

function AddBirthdayModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (b: Omit<Birthday, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<Relationship>('friend');
  const [date, setDate] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [remindDays, setRemindDays] = useState(7);
  const [giftIdeas, setGiftIdeas] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);

  const handleAdd = () => {
    if (!name.trim() || !date.trim()) return;
    const parts = date.trim().split('-');
    if (parts.length !== 2) {
      Alert.alert('Invalid Date', 'Enter date as MM-DD (e.g. 07-04)');
      return;
    }
    const mm = parseInt(parts[0], 10);
    const dd = parseInt(parts[1], 10);
    if (isNaN(mm) || isNaN(dd) || mm < 1 || mm > 12 || dd < 1 || dd > 31) {
      Alert.alert('Invalid Date', 'Enter a valid date (MM-DD)');
      return;
    }
    onAdd({
      familyId: 'demo-family',
      name: name.trim(),
      relationship,
      date: `${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
      birthYear: birthYear ? parseInt(birthYear, 10) : undefined,
      avatarColor: selectedColor,
      remindDaysBefore: remindDays,
      giftIdeas: giftIdeas ? giftIdeas.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      notes: notes.trim() || undefined,
    });
    setName(''); setRelationship('friend'); setDate(''); setBirthYear('');
    setRemindDays(7); setGiftIdeas(''); setNotes(''); setSelectedColor(AVATAR_COLORS[0]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Birthday</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Relationship</Text>
            <View style={styles.chipRow}>
              {RELATIONSHIPS.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRelationship(r)}
                  style={[styles.chip, relationship === r && styles.chipActive]}
                >
                  <Text style={[styles.chipText, relationship === r && styles.chipTextActive]}>
                    {RELATIONSHIP_LABELS[r]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Date (MM-DD) *</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="07-04"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Text style={styles.fieldLabel}>Birth Year (optional)</Text>
            <TextInput
              style={styles.input}
              value={birthYear}
              onChangeText={setBirthYear}
              placeholder="1990"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={4}
            />

            <Text style={styles.fieldLabel}>Remind Days Before</Text>
            <View style={styles.chipRow}>
              {REMIND_OPTIONS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setRemindDays(d)}
                  style={[styles.chip, remindDays === d && styles.chipActive]}
                >
                  <Text style={[styles.chipText, remindDays === d && styles.chipTextActive]}>{d}d</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Gift Ideas (comma-separated)</Text>
            <TextInput
              style={styles.input}
              value={giftIdeas}
              onChangeText={setGiftIdeas}
              placeholder="Watch, Golf clubs, Book"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special notes..."
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Text style={styles.fieldLabel}>Avatar Color</Text>
            <View style={styles.colorRow}>
              {AVATAR_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorSwatchSelected,
                  ]}
                >
                  {selectedColor === c && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleAdd}
              disabled={!name.trim() || !date.trim()}
              style={[styles.submitBtn, (!name.trim() || !date.trim()) && { opacity: 0.4 }]}
            >
              <Ionicons name="gift-outline" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Add Birthday</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function BirthdayTrackerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { birthdays, addBirthday, deleteBirthday, getDaysUntil, getUpcoming, seedDemoData } = useBirthdayStore();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [showAdd, setShowAdd] = useState(false);

  const today = new Date();
  const todayBirthdays = useMemo(() => getUpcoming(0), [birthdays]);
  const upcomingBirthdays = useMemo(() => getUpcoming(90), [birthdays]);
  const thisMonthBirthdays = useMemo(() => getUpcoming(30), [birthdays]);

  const allSorted = useMemo(() =>
    [...birthdays].sort((a, b) => a.name.localeCompare(b.name)),
    [birthdays]
  );

  const hasTodayBirthdays = todayBirthdays.length > 0;

  const handleDelete = (b: Birthday) => {
    Alert.alert('Delete Birthday', `Remove ${b.name}'s birthday?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteBirthday(b.id);
        }
      },
    ]);
  };

  const handleCardPress = (b: Birthday) => {
    const days = getDaysUntil(b.date);
    Alert.alert(
      b.name,
      `${formatDate(b.date)} ${b.birthYear ? `(${new Date().getFullYear() - b.birthYear + (days > 0 ? 1 : 0)} years old)` : ''}\n\nRelationship: ${RELATIONSHIP_LABELS[b.relationship]}\n${b.notes ? `\nNotes: ${b.notes}` : ''}${b.giftIdeas?.length ? `\n\nGift Ideas:\n${b.giftIdeas.map((g) => `• ${g}`).join('\n')}` : ''}`,
      [
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(b) },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#880E4F', '#AD1457', '#E91E63']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Birthday Tracker 🎂</Text>
            <Text style={styles.headerSub}>Never forget a birthday</Text>
          </View>
          <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Tracked', value: birthdays.length, icon: 'calendar' },
            { label: 'This Month', value: thisMonthBirthdays.length, icon: 'gift' },
            { label: 'Today', value: todayBirthdays.length, icon: 'cake' },
          ].map((s, i) => (
            <View key={i} style={[styles.statItem, i < 2 && styles.statBorder]}>
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {hasTodayBirthdays && (
        <LinearGradient colors={['#FFD700', '#FFA000']} style={styles.celebrationBanner}>
          <Text style={styles.celebrationText}>
            🎉 Today is {todayBirthdays.map((b) => b.name).join(' & ')}
            {todayBirthdays.length === 1 ? "'s" : "'"} Birthday! 🎂🎊
          </Text>
        </LinearGradient>
      )}

      <View style={styles.tabs}>
        {(['upcoming', 'all', 'calendar'] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'upcoming' ? 'Upcoming' : tab === 'all' ? 'All' : 'Calendar'}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab !== 'calendar' ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {birthdays.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 60 }}>🎂</Text>
              <Text style={styles.emptyTitle}>No Birthdays Yet</Text>
              <Text style={styles.emptyDesc}>Add family and friends to never miss a birthday!</Text>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); seedDemoData(); }}
                style={styles.demoBtn}
              >
                <Text style={styles.demoBtnText}>Load Demo Data</Text>
              </Pressable>
            </View>
          )}

          {activeTab === 'upcoming' && (
            <>
              {upcomingBirthdays.length === 0 && birthdays.length > 0 && (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 48 }}>📅</Text>
                  <Text style={styles.emptyTitle}>No Upcoming Birthdays</Text>
                  <Text style={styles.emptyDesc}>No birthdays in the next 90 days</Text>
                </View>
              )}
              {upcomingBirthdays.map((b) => (
                <BirthdayCard
                  key={b.id}
                  birthday={b}
                  daysUntil={getDaysUntil(b.date)}
                  onPress={() => handleCardPress(b)}
                />
              ))}
            </>
          )}

          {activeTab === 'all' && allSorted.map((b) => (
            <BirthdayCard
              key={b.id}
              birthday={b}
              daysUntil={getDaysUntil(b.date)}
              onPress={() => handleCardPress(b)}
            />
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
          {birthdays.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 60 }}>🎂</Text>
              <Text style={styles.emptyTitle}>No Birthdays Yet</Text>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); seedDemoData(); }}
                style={styles.demoBtn}
              >
                <Text style={styles.demoBtnText}>Load Demo Data</Text>
              </Pressable>
            </View>
          ) : (
            <CalendarTab birthdays={birthdays} getDaysUntil={getDaysUntil} />
          )}
        </ScrollView>
      )}

      <AddBirthdayModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={(b) => {
          addBirthday(b);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
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
  celebrationBanner: {
    paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center',
  },
  celebrationText: { fontSize: 14, fontWeight: '700', color: '#7B5800', textAlign: 'center' },
  tabs: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#E91E63' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#E91E63' },
  content: { padding: 16 },
  bCardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 22, fontWeight: '800', color: '#fff' },
  bCardNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  bCardName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  bCardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  bCardDate: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  bCardAge: { fontSize: 12, color: '#E91E63', fontWeight: '600', marginBottom: 6 },
  giftChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  giftChip: {
    backgroundColor: '#FCE4EC', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  giftChipText: { fontSize: 11, color: '#AD1457', fontWeight: '600' },
  countdownBadge: {
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  countdownText: { fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  demoBtn: {
    backgroundColor: '#E91E63', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  demoBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Calendar styles
  calendarContainer: { padding: 0 },
  calMonthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNavBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    ...shadows.sm,
  },
  calMonthTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  calDayHeaders: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  calDayHeaderText: { fontSize: 12, fontWeight: '700', color: colors.textMuted, width: 36, textAlign: 'center' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calCell: {
    width: '14.28%', aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
  },
  calCellSelected: { backgroundColor: '#E91E63' },
  calCellToday: { backgroundColor: '#FCE4EC' },
  calCellText: { fontSize: 14, fontWeight: '600', color: colors.text },
  calCellTextSelected: { color: '#fff' },
  calCellTextToday: { color: '#E91E63' },
  calDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: '#E91E63', marginTop: 2,
  },
  calDotSelected: { backgroundColor: '#fff' },
  calSelectedBirthdays: {
    marginTop: 16, backgroundColor: colors.card,
    borderRadius: 16, padding: 16, ...shadows.sm,
  },
  calSelectedTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 },
  calBirthdayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  calAvatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  calAvatarInitial: { fontSize: 15, fontWeight: '800', color: '#fff' },
  calBirthdayName: { fontSize: 14, fontWeight: '700', color: colors.text },
  calBirthdayAge: { fontSize: 12, color: colors.textSecondary },
  calEmpty: { alignItems: 'center', paddingTop: 20 },
  calEmptyText: { fontSize: 13, color: colors.textMuted },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 20, backgroundColor: colors.border,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: '#FCE4EC', borderColor: '#E91E63' },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#E91E63' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#E91E63', borderRadius: 14,
    paddingVertical: 16, marginTop: 24,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
