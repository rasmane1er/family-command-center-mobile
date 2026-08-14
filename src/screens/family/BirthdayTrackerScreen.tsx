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
import { useAuthStore } from '../../store/useAuthStore';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';

type Tab = 'upcoming' | 'all' | 'calendar';

const RELATIONSHIP_LABEL_KEYS: Record<Relationship, string> = {
  self: 'family.screens.birthdayTracker.relationshipSelf',
  spouse: 'family.screens.birthdayTracker.relationshipSpouse',
  child: 'family.screens.birthdayTracker.relationshipChild',
  parent: 'family.screens.birthdayTracker.relationshipParent',
  sibling: 'family.screens.birthdayTracker.relationshipSibling',
  friend: 'family.screens.birthdayTracker.relationshipFriend',
  coworker: 'family.screens.birthdayTracker.relationshipCoworker',
  other: 'family.screens.birthdayTracker.relationshipOther',
};

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F5A623', '#00D4AA'];
const REMIND_OPTIONS = [1, 3, 7, 14, 30];
const RELATIONSHIPS: Relationship[] = ['self', 'spouse', 'child', 'parent', 'sibling', 'friend', 'coworker', 'other'];

const MONTH_NAME_KEYS = [
  'family.screens.birthdayTracker.monthJanuary', 'family.screens.birthdayTracker.monthFebruary',
  'family.screens.birthdayTracker.monthMarch', 'family.screens.birthdayTracker.monthApril',
  'family.screens.birthdayTracker.monthMay', 'family.screens.birthdayTracker.monthJune',
  'family.screens.birthdayTracker.monthJuly', 'family.screens.birthdayTracker.monthAugust',
  'family.screens.birthdayTracker.monthSeptember', 'family.screens.birthdayTracker.monthOctober',
  'family.screens.birthdayTracker.monthNovember', 'family.screens.birthdayTracker.monthDecember',
];

function formatDate(mmdd: string, monthNames: string[]): string {
  const [mm, dd] = mmdd.split('-').map(Number);
  return `${monthNames[mm - 1]} ${dd}`;
}

function CountdownBadge({ days }: { days: number }) {
  const { t } = useTranslation('family');
  if (days === 0) {
    return (
      <View style={[styles.countdownBadge, { backgroundColor: '#FFD700' }]}>
        <Text style={[styles.countdownText, { color: '#7B5800' }]}>{t('family.screens.birthdayTracker.todayBadge')}</Text>
      </View>
    );
  }
  if (days === 1) {
    return (
      <View style={[styles.countdownBadge, { backgroundColor: '#FCE4EC' }]}>
        <Text style={[styles.countdownText, { color: '#C2185B' }]}>{t('family.screens.birthdayTracker.tomorrowBadge')}</Text>
      </View>
    );
  }
  if (days <= 30) {
    return (
      <View style={[styles.countdownBadge, { backgroundColor: '#E3F2FD' }]}>
        <Text style={[styles.countdownText, { color: '#1565C0' }]}>{t('family.screens.birthdayTracker.daysBadge', { count: days })}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.countdownBadge, { backgroundColor: colors.border }]}>
      <Text style={[styles.countdownText, { color: colors.textSecondary }]}>{t('family.screens.birthdayTracker.nextMonthBadge')}</Text>
    </View>
  );
}

function BirthdayCard({ birthday, daysUntil, onPress }: {
  birthday: Birthday;
  daysUntil: number;
  onPress: () => void;
}) {
  const { t } = useTranslation('family');
  const monthNames = MONTH_NAME_KEYS.map((k) => t(k));
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
              label={t(RELATIONSHIP_LABEL_KEYS[birthday.relationship])}
              variant="primary"
              size="sm"
            />
            <Text style={styles.bCardDate}>{formatDate(birthday.date, monthNames)}</Text>
          </View>
          {turningAge !== null && (
            <Text style={styles.bCardAge}>
              {t('family.screens.birthdayTracker.turningAge', { age: daysUntil === 0 ? age : turningAge })}
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
  const { t } = useTranslation('family');
  const monthNames = MONTH_NAME_KEYS.map((k) => t(k));
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
        <Pressable accessibilityRole="button" onPress={prevMonth} style={styles.calNavBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.calMonthTitle}>{monthNames[viewMonth]} {viewYear}</Text>
        <Pressable accessibilityRole="button" onPress={nextMonth} style={styles.calNavBtn}>
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
            <Pressable accessibilityRole="button"
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
            {t('family.screens.birthdayTracker.calMonthBirthdays', { month: monthNames[viewMonth], day: selectedDay })}
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
                    {t('family.screens.birthdayTracker.turningAge', { age: viewYear - b.birthYear })}
                  </Text>
                )}
              </View>
              <Badge label={t(RELATIONSHIP_LABEL_KEYS[b.relationship])} variant="primary" size="sm" />
            </View>
          ))}
        </View>
      )}

      {birthdaysInMonth.length === 0 && (
        <View style={styles.calEmpty}>
          <Text style={styles.calEmptyText}>{t('family.screens.birthdayTracker.calNoBirthdaysMonth')}</Text>
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
  const { t } = useTranslation('family');
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
      Alert.alert(
        t('family.screens.birthdayTracker.invalidDateTitle'),
        t('family.screens.birthdayTracker.invalidDateMsgFormat')
      );
      return;
    }
    const mm = parseInt(parts[0], 10);
    const dd = parseInt(parts[1], 10);
    if (isNaN(mm) || isNaN(dd) || mm < 1 || mm > 12 || dd < 1 || dd > 31) {
      Alert.alert(
        t('family.screens.birthdayTracker.invalidDateTitle'),
        t('family.screens.birthdayTracker.invalidDateMsgValid')
      );
      return;
    }
    onAdd({
      familyId: useAuthStore.getState().familyId ?? '',
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
            <Text style={styles.modalTitle}>{t('family.screens.birthdayTracker.addBirthday')}</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>{t('family.screens.birthdayTracker.fieldName')}</Text>
            <TextInput accessibilityLabel={t('family.screens.birthdayTracker.placeholderName')}
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('family.screens.birthdayTracker.placeholderName')}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <Text style={styles.fieldLabel}>{t('family.screens.birthdayTracker.fieldRelationship')}</Text>
            <View style={styles.chipRow}>
              {RELATIONSHIPS.map((r) => (
                <Pressable accessibilityRole="button"
                  key={r}
                  onPress={() => setRelationship(r)}
                  style={[styles.chip, relationship === r && styles.chipActive]}
                >
                  <Text style={[styles.chipText, relationship === r && styles.chipTextActive]}>
                    {t(RELATIONSHIP_LABEL_KEYS[r])}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('family.screens.birthdayTracker.fieldDate')}</Text>
            <TextInput accessibilityLabel={t('family.screens.birthdayTracker.placeholderDate')}
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder={t('family.screens.birthdayTracker.placeholderDate')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Text style={styles.fieldLabel}>{t('family.screens.birthdayTracker.fieldBirthYear')}</Text>
            <TextInput accessibilityLabel={t('family.screens.birthdayTracker.placeholderBirthYear')}
              style={styles.input}
              value={birthYear}
              onChangeText={setBirthYear}
              placeholder={t('family.screens.birthdayTracker.placeholderBirthYear')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={4}
            />

            <Text style={styles.fieldLabel}>{t('family.screens.birthdayTracker.fieldRemindDays')}</Text>
            <View style={styles.chipRow}>
              {REMIND_OPTIONS.map((d) => (
                <Pressable accessibilityRole="button"
                  key={d}
                  onPress={() => setRemindDays(d)}
                  style={[styles.chip, remindDays === d && styles.chipActive]}
                >
                  <Text style={[styles.chipText, remindDays === d && styles.chipTextActive]}>{t('family.screens.birthdayTracker.daysSuffix', { count: d })}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('family.screens.birthdayTracker.fieldGiftIdeas')}</Text>
            <TextInput accessibilityLabel={t('family.screens.birthdayTracker.placeholderGiftIdeas')}
              style={styles.input}
              value={giftIdeas}
              onChangeText={setGiftIdeas}
              placeholder={t('family.screens.birthdayTracker.placeholderGiftIdeas')}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>{t('family.screens.birthdayTracker.fieldNotes')}</Text>
            <TextInput accessibilityLabel={t('family.screens.birthdayTracker.placeholderNotes')}
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('family.screens.birthdayTracker.placeholderNotes')}
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Text style={styles.fieldLabel}>{t('family.screens.birthdayTracker.fieldAvatarColor')}</Text>
            <View style={styles.colorRow}>
              {AVATAR_COLORS.map((c) => (
                <Pressable accessibilityRole="button"
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

            <Pressable accessibilityRole="button"
              onPress={handleAdd}
              disabled={!name.trim() || !date.trim()}
              style={[styles.submitBtn, (!name.trim() || !date.trim()) && { opacity: 0.4 }]}
            >
              <Ionicons name="gift-outline" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>{t('family.screens.birthdayTracker.addBirthday')}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function BirthdayTrackerScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const monthNames = MONTH_NAME_KEYS.map((k) => t(k));
  const insets = useSafeAreaInsets();
  const { birthdays, addBirthday, deleteBirthday, getDaysUntil, getUpcoming } = useBirthdayStore();
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
    Alert.alert(
      t('family.screens.birthdayTracker.deleteBirthdayTitle'),
      t('family.screens.birthdayTracker.deleteBirthdayMsg', { name: b.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive', onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteBirthday(b.id);
          }
        },
      ]
    );
  };

  const handleCardPress = (b: Birthday) => {
    const days = getDaysUntil(b.date);
    Alert.alert(
      b.name,
      `${formatDate(b.date, monthNames)} ${b.birthYear ? t('family.screens.birthdayTracker.yearsOld', { age: new Date().getFullYear() - b.birthYear + (days > 0 ? 1 : 0) }) : ''}\n\n${t('family.screens.birthdayTracker.detailRelationship', { relationship: t(RELATIONSHIP_LABEL_KEYS[b.relationship]) })}\n${b.notes ? t('family.screens.birthdayTracker.detailNotes', { notes: b.notes }) : ''}${b.giftIdeas?.length ? t('family.screens.birthdayTracker.detailGiftIdeas', { giftIdeas: b.giftIdeas.map((g) => `• ${g}`).join('\n') }) : ''}`,
      [
        { text: t('common.delete'), style: 'destructive', onPress: () => handleDelete(b) },
        { text: t('common.close'), style: 'cancel' },
      ]
    );
  };

  const screenHeader = (
    <LinearGradient
      colors={['#880E4F', '#AD1457', '#E91E63']}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('family.screens.birthdayTracker.headerTitle')}</Text>
          <Text style={styles.headerSub}>{t('family.screens.birthdayTracker.headerSub')}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setShowAdd(true)} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: t('family.screens.birthdayTracker.statTracked'), value: birthdays.length, icon: 'calendar' },
          { label: t('family.screens.birthdayTracker.statThisMonth'), value: thisMonthBirthdays.length, icon: 'gift' },
          { label: t('family.screens.birthdayTracker.statToday'), value: todayBirthdays.length, icon: 'cake' },
        ].map((s, i) => (
          <View key={i} style={[styles.statItem, i < 2 && styles.statBorder]}>
            <Text style={styles.statVal}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#880E4F', '#AD1457', '#E91E63']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{t('family.screens.birthdayTracker.headerTitle')}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>{t('family.screens.birthdayTracker.compactTracked', { count: birthdays.length })}</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <>
            {hasTodayBirthdays && (
              <LinearGradient colors={['#FFD700', '#FFA000']} style={styles.celebrationBanner}>
                <Text style={styles.celebrationText}>
                  {t('family.screens.birthdayTracker.celebrationText', {
                    names: todayBirthdays.map((b) => b.name).join(' & '),
                    suffix: todayBirthdays.length === 1 ? "'s" : "'",
                  })}
                </Text>
              </LinearGradient>
            )}

            <View style={styles.tabs}>
              {(['upcoming', 'all', 'calendar'] as Tab[]).map((tab) => (
                <Pressable accessibilityRole="button"
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                    {tab === 'upcoming'
                      ? t('family.screens.birthdayTracker.tabUpcoming')
                      : tab === 'all'
                      ? t('family.screens.birthdayTracker.tabAll')
                      : t('family.screens.birthdayTracker.tabCalendar')}
                  </Text>
                </Pressable>
              ))}
            </View>

      {activeTab !== 'calendar' ? (
        <ScrollView
          onScroll={onScroll}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
          showsVerticalScrollIndicator={false}
        >
          {birthdays.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 60 }}>🎂</Text>
              <Text style={styles.emptyTitle}>{t('family.screens.birthdayTracker.emptyTitleNoBirthdays')}</Text>
              <Text style={styles.emptyDesc}>{t('family.screens.birthdayTracker.emptyDescNoBirthdays')}</Text>
            </View>
          )}

          {activeTab === 'upcoming' && (
            <>
              {upcomingBirthdays.length === 0 && birthdays.length > 0 && (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 48 }}>📅</Text>
                  <Text style={styles.emptyTitle}>{t('family.screens.birthdayTracker.emptyTitleNoUpcoming')}</Text>
                  <Text style={styles.emptyDesc}>{t('family.screens.birthdayTracker.emptyDescNoUpcoming')}</Text>
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
        <ScrollView
          onScroll={onScroll}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
        >
          {birthdays.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 60 }}>🎂</Text>
              <Text style={styles.emptyTitle}>{t('family.screens.birthdayTracker.emptyTitleNoBirthdays')}</Text>
            </View>
          ) : (
            <CalendarTab birthdays={birthdays} getDaysUntil={getDaysUntil} />
          )}
        </ScrollView>
      )}
          </>
        )}
      </CollapsibleHeader>

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
  statVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
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
  avatarInitial: { fontSize: 18, fontWeight: '800', color: '#fff' },
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
