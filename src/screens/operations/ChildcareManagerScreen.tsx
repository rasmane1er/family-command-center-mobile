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
  Switch,
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
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import {
  useChildcareStore,
  type Caregiver,
  type Booking,
  type CaregiverType,
} from '../../store/useChildcareStore';

const CAREGIVER_TYPES: { type: CaregiverType; label: string; icon: string }[] = [
  { type: 'babysitter', label: 'Babysitter', icon: 'happy-outline' },
  { type: 'nanny', label: 'Nanny', icon: 'person-outline' },
  { type: 'daycare', label: 'Daycare', icon: 'business-outline' },
  { type: 'relative', label: 'Relative', icon: 'people-outline' },
  { type: 'au_pair', label: 'Au Pair', icon: 'globe-outline' },
  { type: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#F5A623', '#8E44AD', '#27AE60', '#E74C3C',
];

const TYPE_LABELS: Record<CaregiverType, string> = {
  babysitter: 'Babysitter',
  nanny: 'Nanny',
  daycare: 'Daycare',
  relative: 'Relative',
  au_pair: 'Au Pair',
  other: 'Other',
};

const TYPE_VARIANT: Record<CaregiverType, 'success' | 'info' | 'primary' | 'warning' | 'secondary' | 'neutral'> = {
  babysitter: 'success',
  nanny: 'info',
  daycare: 'primary',
  relative: 'warning',
  au_pair: 'secondary',
  other: 'neutral',
};

function StarRating({ rating, onRate }: { rating: number; onRate?: (r: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onRate?.(i)} disabled={!onRate}>
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={16}
            color={i <= rating ? colors.gold : colors.textMuted}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function ChildcareManagerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const {
    caregivers,
    bookings,
    addCaregiver,
    deleteCaregiver,
    togglePreferred,
    addBooking,
    completeBooking,
    cancelBooking,
    seedDemoData,
  } = useChildcareStore();

  const [activeTab, setActiveTab] = useState<'caregivers' | 'schedule' | 'payments'>('caregivers');
  const [showAddCaregiverModal, setShowAddCaregiverModal] = useState(false);
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);

  // Caregiver modal state
  const [cgName, setCgName] = useState('');
  const [cgType, setCgType] = useState<CaregiverType>('babysitter');
  const [cgPhone, setCgPhone] = useState('');
  const [cgRate, setCgRate] = useState('');
  const [cgRating, setCgRating] = useState(5);
  const [cgCerts, setCgCerts] = useState('');
  const [cgNotes, setCgNotes] = useState('');
  const [cgPreferred, setCgPreferred] = useState(false);
  const [cgColor, setCgColor] = useState(AVATAR_COLORS[0]);

  // Booking modal state
  const [bkCaregiverId, setBkCaregiverId] = useState<string>('');
  const [bkDate, setBkDate] = useState('');
  const [bkStartTime, setBkStartTime] = useState('');
  const [bkEndTime, setBkEndTime] = useState('');
  const [bkHours, setBkHours] = useState('');
  const [bkAmountPaid, setBkAmountPaid] = useState('');
  const [bkNotes, setBkNotes] = useState('');

  if (caregivers.length === 0) seedDemoData();

  const today = new Date().toISOString().split('T')[0];

  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'upcoming')
        .sort((a, b) => a.date.localeCompare(b.date)),
    [bookings]
  );

  const pastBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'completed' || b.status === 'cancelled')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [bookings]
  );

  const totalPaidThisMonth = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return bookings
      .filter((b) => b.status === 'completed' && b.date.startsWith(monthPrefix))
      .reduce((s, b) => s + (b.amountPaid ?? 0), 0);
  }, [bookings]);

  const totalPaidAllTime = caregivers.reduce((s, c) => s + c.totalPaid, 0);

  const getCaregiverName = (id: string) =>
    caregivers.find((c) => c.id === id)?.name ?? 'Unknown';

  const getCaregiverById = (id: string) => caregivers.find((c) => c.id === id);

  const handleBookNow = (caregiver: Caregiver) => {
    Alert.alert(
      `Book ${caregiver.name}`,
      `Rate: ${caregiver.hourlyRate === 0 || !caregiver.hourlyRate ? 'Free' : `$${caregiver.hourlyRate}/hr`}\nRating: ${'⭐'.repeat(caregiver.rating)}\n\nTap "Add Booking" to schedule with this caregiver.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Booking',
          onPress: () => {
            setBkCaregiverId(caregiver.id);
            setShowAddBookingModal(true);
          },
        },
      ]
    );
  };

  const handleDeleteCaregiver = (c: Caregiver) => {
    Alert.alert('Remove Caregiver', `Remove "${c.name}" from your caregivers?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => { deleteCaregiver(c.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); },
      },
    ]);
  };

  const handleCompleteBooking = (b: Booking) => {
    const caregiver = getCaregiverById(b.caregiverId);
    const suggested = caregiver?.hourlyRate ? b.hoursWorked * caregiver.hourlyRate : 0;
    Alert.alert(
      'Complete Booking',
      `Mark booking with ${getCaregiverName(b.caregiverId)} as complete?\nSuggested payment: $${suggested.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => { completeBooking(b.id, suggested); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
        },
      ]
    );
  };

  const handleCancelBooking = (b: Booking) => {
    Alert.alert('Cancel Booking', 'Cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: () => { cancelBooking(b.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); },
      },
    ]);
  };

  const handleAddCaregiver = () => {
    if (!cgName.trim()) return;
    addCaregiver({
      familyId: 'demo-family',
      name: cgName.trim(),
      type: cgType,
      phone: cgPhone.trim() || undefined,
      hourlyRate: cgRate ? parseFloat(cgRate) : undefined,
      rating: cgRating,
      certifications: cgCerts ? cgCerts.split(',').map((s) => s.trim()).filter(Boolean) : [],
      notes: cgNotes.trim() || undefined,
      avatarColor: cgColor,
      isPreferred: cgPreferred,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCgName('');
    setCgType('babysitter');
    setCgPhone('');
    setCgRate('');
    setCgRating(5);
    setCgCerts('');
    setCgNotes('');
    setCgPreferred(false);
    setCgColor(AVATAR_COLORS[0]);
    setShowAddCaregiverModal(false);
  };

  const parseTimeToMinutes = (timeStr: string): number => {
    const cleaned = timeStr.trim().toUpperCase();
    const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3];
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const handleEndTimeChange = (val: string) => {
    setBkEndTime(val);
    if (bkStartTime && val) {
      const startMins = parseTimeToMinutes(bkStartTime);
      const endMins = parseTimeToMinutes(val);
      let diff = endMins - startMins;
      if (diff < 0) diff += 24 * 60;
      const hoursDecimal = diff / 60;
      if (hoursDecimal > 0) {
        setBkHours(hoursDecimal.toFixed(2));
        const caregiver = getCaregiverById(bkCaregiverId);
        if (caregiver?.hourlyRate) {
          setBkAmountPaid((hoursDecimal * caregiver.hourlyRate).toFixed(2));
        }
      }
    }
  };

  const handleAddBooking = () => {
    if (!bkCaregiverId || !bkDate || !bkStartTime || !bkEndTime) return;
    addBooking({
      caregiverId: bkCaregiverId,
      date: bkDate,
      startTime: bkStartTime,
      endTime: bkEndTime,
      hoursWorked: bkHours ? parseFloat(bkHours) : 0,
      notes: bkNotes.trim() || undefined,
      status: 'upcoming',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBkCaregiverId('');
    setBkDate('');
    setBkStartTime('');
    setBkEndTime('');
    setBkHours('');
    setBkAmountPaid('');
    setBkNotes('');
    setShowAddBookingModal(false);
  };

  const isEmpty = caregivers.length === 0;

  const screenHeader = (
    <LinearGradient
      colors={['#E65100', '#EF6C00', '#F57C00']}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Childcare Manager</Text>
        <Pressable onPress={() => setShowAddCaregiverModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{caregivers.length}</Text>
          <Text style={styles.statLabel}>Caregivers</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
          <Text style={styles.statValue}>{upcomingBookings.length}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>${totalPaidThisMonth}</Text>
          <Text style={styles.statLabel}>Paid This Month</Text>
        </View>
      </View>
    
    <View style={styles.tabs}>
            {(['caregivers', 'schedule', 'payments'] as const).map((t) => (
              <Pressable key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && styles.tabActive]}>
                <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
</LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#E65100', '#EF6C00', '#F57C00']}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>Childcare Manager</Text>
      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>{caregivers.length} caregivers</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Tabs */}
      

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
      >
        {isEmpty && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👶</Text>
            <Text style={styles.emptyTitle}>No caregivers yet</Text>
            <Text style={styles.emptyDesc}>Add caregivers or load sample data to get started.</Text>
            <Button
              title="Load Demo Data"
              onPress={() => { seedDemoData(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
              variant="primary"
              style={{ marginTop: 16, alignSelf: 'center' }}
            />
          </View>
        )}

        {!isEmpty && activeTab === 'caregivers' && (
          <>
            {caregivers.map((c) => (
              <Card key={c.id} variant="elevated" style={styles.caregiverCard}>
                <View style={styles.caregiverTop}>
                  <View style={[styles.avatarCircle, { backgroundColor: c.avatarColor }]}>
                    <Text style={styles.avatarInitial}>{c.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.caregiverNameRow}>
                      <Text style={styles.caregiverName}>{c.name}</Text>
                      {c.isPreferred && (
                        <Ionicons name="star" size={14} color={colors.gold} />
                      )}
                    </View>
                    <Badge label={TYPE_LABELS[c.type]} variant={TYPE_VARIANT[c.type]} />
                  </View>
                  <Pressable onPress={() => handleDeleteCaregiver(c)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                  </Pressable>
                </View>

                <View style={styles.caregiverMeta}>
                  <StarRating rating={c.rating} />
                  {c.phone && (
                    <View style={styles.metaItem}>
                      <Ionicons name="call-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.metaText}>{c.phone}</Text>
                    </View>
                  )}
                  <View style={styles.metaItem}>
                    <Ionicons name="cash-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.metaText}>
                      {c.hourlyRate === 0 || !c.hourlyRate ? 'Free' : `$${c.hourlyRate}/hr`}
                    </Text>
                  </View>
                </View>

                {c.certifications.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.certScroll}>
                    {c.certifications.map((cert, i) => (
                      <View key={i} style={styles.certChip}>
                        <Text style={styles.certText}>{cert}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <View style={styles.caregiverStats}>
                  <View style={styles.caregiverStatItem}>
                    <Text style={styles.caregiverStatValue}>{c.totalHoursWorked}h</Text>
                    <Text style={styles.caregiverStatLabel}>Hours</Text>
                  </View>
                  <View style={styles.caregiverStatItem}>
                    <Text style={styles.caregiverStatValue}>${c.totalPaid}</Text>
                    <Text style={styles.caregiverStatLabel}>Total Paid</Text>
                  </View>
                </View>

                <View style={styles.caregiverActions}>
                  <Pressable
                    onPress={() => { togglePreferred(c.id); Haptics.selectionAsync(); }}
                    style={[styles.actionBtn, c.isPreferred && styles.actionBtnPreferred]}
                  >
                    <Ionicons name={c.isPreferred ? 'star' : 'star-outline'} size={14} color={c.isPreferred ? colors.gold : colors.textMuted} />
                    <Text style={[styles.actionBtnText, c.isPreferred && { color: colors.gold }]}>
                      {c.isPreferred ? 'Preferred' : 'Set Preferred'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => handleBookNow(c)} style={styles.bookNowBtn}>
                    <Text style={styles.bookNowText}>Book Now</Text>
                  </Pressable>
                </View>
              </Card>
            ))}

            <Button
              title="Add Booking"
              onPress={() => setShowAddBookingModal(true)}
              variant="outline"
              fullWidth
              style={{ marginTop: 4 }}
            />
          </>
        )}

        {!isEmpty && activeTab === 'schedule' && (
          <>
            <Text style={styles.sectionTitle}>Upcoming ({upcomingBookings.length})</Text>
            {upcomingBookings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📅</Text>
                <Text style={styles.emptyTitle}>No upcoming bookings</Text>
                <Button
                  title="Add Booking"
                  onPress={() => setShowAddBookingModal(true)}
                  variant="primary"
                  style={{ marginTop: 12, alignSelf: 'center' }}
                />
              </View>
            ) : (
              upcomingBookings.map((b) => {
                const caregiver = getCaregiverById(b.caregiverId);
                return (
                  <Card key={b.id} variant="elevated" style={styles.bookingCard}>
                    <View style={styles.bookingTop}>
                      <View style={[styles.bookingAvatar, { backgroundColor: caregiver?.avatarColor ?? colors.textMuted }]}>
                        <Text style={styles.bookingAvatarText}>{getCaregiverName(b.caregiverId).charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.bookingCaregiverName}>{getCaregiverName(b.caregiverId)}</Text>
                        <Text style={styles.bookingDate}>{b.date}</Text>
                      </View>
                      <Badge label="Upcoming" variant="info" />
                    </View>
                    <View style={styles.bookingTime}>
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      <Text style={styles.bookingTimeText}>{b.startTime} — {b.endTime} ({b.hoursWorked}h)</Text>
                    </View>
                    {b.notes && <Text style={styles.bookingNotes}>{b.notes}</Text>}
                    <View style={styles.bookingActions}>
                      <Pressable onPress={() => handleCompleteBooking(b)} style={styles.completeBtn}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                        <Text style={styles.completeBtnText}>Complete</Text>
                      </Pressable>
                      <Pressable onPress={() => handleCancelBooking(b)} style={styles.cancelBtnInline}>
                        <Ionicons name="close-circle-outline" size={14} color={colors.danger} />
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </Card>
                );
              })
            )}

            {pastBookings.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Past Bookings ({pastBookings.length})</Text>
                {pastBookings.map((b) => {
                  const caregiver = getCaregiverById(b.caregiverId);
                  return (
                    <Card key={b.id} variant="elevated" style={styles.bookingCard}>
                      <View style={styles.bookingTop}>
                        <View style={[styles.bookingAvatar, { backgroundColor: caregiver?.avatarColor ?? colors.textMuted }]}>
                          <Text style={styles.bookingAvatarText}>{getCaregiverName(b.caregiverId).charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.bookingCaregiverName}>{getCaregiverName(b.caregiverId)}</Text>
                          <Text style={styles.bookingDate}>{b.date}</Text>
                        </View>
                        <Badge label={b.status === 'cancelled' ? 'Cancelled' : 'Completed'} variant={b.status === 'cancelled' ? 'danger' : 'success'} />
                      </View>
                      <View style={styles.bookingTime}>
                        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.bookingTimeText}>{b.startTime} — {b.endTime} ({b.hoursWorked}h)</Text>
                      </View>
                      {b.amountPaid !== undefined && b.status === 'completed' && (
                        <Text style={styles.amountPaidText}>Paid: ${b.amountPaid.toFixed(2)}</Text>
                      )}
                    </Card>
                  );
                })}
              </>
            )}
          </>
        )}

        {!isEmpty && activeTab === 'payments' && (
          <>
            <Card variant="elevated" style={styles.totalPayCard}>
              <Text style={styles.totalPayLabel}>Total Paid (All Time)</Text>
              <Text style={styles.totalPayValue}>${totalPaidAllTime.toFixed(2)}</Text>
              <Text style={styles.totalPaySub}>This month: ${totalPaidThisMonth.toFixed(2)}</Text>
            </Card>

            <Text style={styles.sectionTitle}>Per Caregiver Breakdown</Text>
            {caregivers.filter((c) => c.totalHoursWorked > 0 || c.totalPaid > 0).map((c) => (
              <Card key={c.id} variant="elevated" style={styles.payCard}>
                <View style={styles.payCardRow}>
                  <View style={[styles.avatarCircleSmall, { backgroundColor: c.avatarColor }]}>
                    <Text style={styles.avatarInitialSmall}>{c.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.payCaregiverName}>{c.name}</Text>
                    <Text style={styles.payHours}>{c.totalHoursWorked}h worked</Text>
                  </View>
                  <Text style={styles.payAmount}>${c.totalPaid.toFixed(2)}</Text>
                </View>
              </Card>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Recent Payments</Text>
            {pastBookings.filter((b) => b.status === 'completed' && b.amountPaid !== undefined).map((b) => {
              const caregiver = getCaregiverById(b.caregiverId);
              return (
                <Card key={b.id} variant="elevated" style={styles.recentPayCard}>
                  <View style={styles.recentPayRow}>
                    <View style={[styles.avatarCircleSmall, { backgroundColor: caregiver?.avatarColor ?? colors.textMuted }]}>
                      <Text style={styles.avatarInitialSmall}>{getCaregiverName(b.caregiverId).charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.recentPayName}>{getCaregiverName(b.caregiverId)}</Text>
                      <Text style={styles.recentPayDate}>{b.date} • {b.hoursWorked}h</Text>
                    </View>
                    <Text style={styles.recentPayAmount}>${(b.amountPaid ?? 0).toFixed(2)}</Text>
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add Caregiver Modal */}
      <Modal
        visible={showAddCaregiverModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddCaregiverModal(false)}
      >
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 60 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Caregiver</Text>

          <Text style={styles.modalLabel}>Name</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Caregiver name..."
            value={cgName}
            onChangeText={setCgName}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <Text style={styles.modalLabel}>Type</Text>
          <View style={styles.typeGrid}>
            {CAREGIVER_TYPES.map((t) => (
              <Pressable
                key={t.type}
                onPress={() => setCgType(t.type)}
                style={[styles.typeChip, cgType === t.type && styles.typeChipActive]}
              >
                <Ionicons name={t.icon as any} size={16} color={cgType === t.type ? '#EF6C00' : colors.textMuted} />
                <Text style={[styles.typeChipText, cgType === t.type && styles.typeChipTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Phone (optional)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="+1 (555) 000-0000"
            value={cgPhone}
            onChangeText={setCgPhone}
            keyboardType="phone-pad"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Hourly Rate ($)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="0 for free/relative"
            value={cgRate}
            onChangeText={setCgRate}
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Rating</Text>
          <StarRating rating={cgRating} onRate={setCgRating} />
          <View style={{ height: 16 }} />

          <Text style={styles.modalLabel}>Certifications (comma-separated)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. CPR, First Aid"
            value={cgCerts}
            onChangeText={setCgCerts}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Additional notes..."
            value={cgNotes}
            onChangeText={setCgNotes}
            multiline
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Avatar Color</Text>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCgColor(c)}
                style={[styles.colorSwatch, { backgroundColor: c }, cgColor === c && styles.colorSwatchSelected]}
              />
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Mark as Preferred</Text>
            <Switch
              value={cgPreferred}
              onValueChange={setCgPreferred}
              trackColor={{ false: colors.border, true: '#EF6C00' }}
            />
          </View>

          <Button
            title="Add Caregiver"
            onPress={handleAddCaregiver}
            fullWidth
            size="lg"
            disabled={!cgName.trim()}
          />
          <Button
            title="Cancel"
            onPress={() => setShowAddCaregiverModal(false)}
            variant="ghost"
            fullWidth
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </Modal>

      {/* Add Booking Modal */}
      <Modal
        visible={showAddBookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddBookingModal(false)}
      >
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 60 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Booking</Text>

          <Text style={styles.modalLabel}>Caregiver</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {caregivers.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setBkCaregiverId(c.id)}
                style={[styles.cgChip, bkCaregiverId === c.id && styles.cgChipActive]}
              >
                <View style={[styles.cgChipAvatar, { backgroundColor: c.avatarColor }]}>
                  <Text style={styles.cgChipAvatarText}>{c.name.charAt(0)}</Text>
                </View>
                <Text style={styles.cgChipText}>{c.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="2026-07-04"
            value={bkDate}
            onChangeText={setBkDate}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Start Time</Text>
          <TextInput
            style={styles.modalInput}
            placeholder='e.g. "6:00 PM"'
            value={bkStartTime}
            onChangeText={setBkStartTime}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>End Time</Text>
          <TextInput
            style={styles.modalInput}
            placeholder='e.g. "10:00 PM"'
            value={bkEndTime}
            onChangeText={handleEndTimeChange}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Hours Worked (auto-calculated)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. 4"
            value={bkHours}
            onChangeText={setBkHours}
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Amount to Pay ($, auto-calculated)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. 60.00"
            value={bkAmountPaid}
            onChangeText={setBkAmountPaid}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Special instructions..."
            value={bkNotes}
            onChangeText={setBkNotes}
            multiline
            placeholderTextColor={colors.textMuted}
          />

          <Button
            title="Add Booking"
            onPress={handleAddBooking}
            fullWidth
            size="lg"
            disabled={!bkCaregiverId || !bkDate || !bkStartTime || !bkEndTime}
          />
          <Button
            title="Cancel"
            onPress={() => setShowAddBookingModal(false)}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#EF6C00' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#EF6C00' },
  content: { padding: 16 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  caregiverCard: { marginBottom: 16, borderRadius: 16 },
  caregiverTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '800', color: '#fff' },
  caregiverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  caregiverName: { fontSize: 16, fontWeight: '700', color: colors.text },
  deleteBtn: { padding: 4 },
  caregiverMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: colors.textSecondary },
  certScroll: { marginBottom: 12 },
  certChip: { marginRight: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#EF6C00' },
  certText: { fontSize: 11, fontWeight: '600', color: '#EF6C00' },
  caregiverStats: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  caregiverStatItem: { alignItems: 'center' },
  caregiverStatValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  caregiverStatLabel: { fontSize: 11, color: colors.textMuted },
  caregiverActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  actionBtnPreferred: { borderColor: colors.gold, backgroundColor: '#FFF9E6' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  bookNowBtn: { paddingVertical: 9, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#EF6C00' },
  bookNowText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  bookingCard: { marginBottom: 12, borderRadius: 14 },
  bookingTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  bookingAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  bookingAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  bookingCaregiverName: { fontSize: 15, fontWeight: '700', color: colors.text },
  bookingDate: { fontSize: 12, color: colors.textSecondary },
  bookingTime: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  bookingTimeText: { fontSize: 13, color: colors.textSecondary },
  bookingNotes: { fontSize: 12, color: colors.textMuted, marginBottom: 10, fontStyle: 'italic' },
  bookingActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.successLight },
  completeBtnText: { fontSize: 13, fontWeight: '600', color: colors.success },
  cancelBtnInline: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.dangerLight },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: colors.danger },
  amountPaidText: { fontSize: 13, fontWeight: '700', color: colors.success, marginTop: 4 },
  totalPayCard: { marginBottom: 20, borderRadius: 16, alignItems: 'center', paddingVertical: 24 },
  totalPayLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalPayValue: { fontSize: 42, fontWeight: '800', color: colors.text, marginTop: 4 },
  totalPaySub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  payCard: { marginBottom: 10, borderRadius: 12 },
  payCardRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircleSmall: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarInitialSmall: { fontSize: 16, fontWeight: '800', color: '#fff' },
  payCaregiverName: { fontSize: 14, fontWeight: '700', color: colors.text },
  payHours: { fontSize: 12, color: colors.textSecondary },
  payAmount: { fontSize: 18, fontWeight: '800', color: colors.text },
  recentPayCard: { marginBottom: 10, borderRadius: 12 },
  recentPayRow: { flexDirection: 'row', alignItems: 'center' },
  recentPayName: { fontSize: 14, fontWeight: '600', color: colors.text },
  recentPayDate: { fontSize: 12, color: colors.textSecondary },
  recentPayAmount: { fontSize: 16, fontWeight: '700', color: '#EF6C00' },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  typeChipActive: { backgroundColor: '#FFF3E0', borderColor: '#EF6C00' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: '#EF6C00' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  colorSwatch: { width: 34, height: 34, borderRadius: 17 },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  switchLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  cgChip: { alignItems: 'center', marginRight: 12, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', gap: 4 },
  cgChipActive: { borderColor: '#EF6C00', backgroundColor: '#FFF3E0' },
  cgChipAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cgChipAvatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  cgChipText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
});
