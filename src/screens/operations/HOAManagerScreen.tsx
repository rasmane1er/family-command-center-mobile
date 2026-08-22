import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Switch,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { useTabBarInset } from '../../hooks/useTabBarInset';
import {
  useHOAStore,
  DuesStatus,
  HOARule,
} from '../../store/useHOAStore';

function getDuesStatusColor(status: DuesStatus): string {
  switch (status) {
    case 'paid': return colors.success;
    case 'due': return colors.warning;
    case 'overdue': return colors.danger;
    case 'waived': return colors.textMuted;
  }
}
function getDuesStatusLabel(status: DuesStatus): string {
  switch (status) {
    case 'paid': return 'Paid';
    case 'due': return 'Due';
    case 'overdue': return 'Overdue';
    case 'waived': return 'Waived';
  }
}
function getSeverityIcon(severity: HOARule['severity']): string {
  switch (severity) {
    case 'info': return 'information-circle';
    case 'warning': return 'warning';
    case 'strict': return 'shield';
  }
}
function getSeverityColor(severity: HOARule['severity']): string {
  switch (severity) {
    case 'info': return colors.info;
    case 'warning': return colors.warning;
    case 'strict': return colors.danger;
  }
}
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function isFuture(dateStr: string): boolean {
  return new Date(dateStr) > new Date();
}

type Tab = 'Dues' | 'Rules' | 'Community';

export function HOAManagerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const {
    dues,
    rules,
    amenities,
    meetings,
    hoaName,
    monthlyDueAmount,
    managementCompany,
    managementPhone,
    addDues,
    markDuesPaid,
    addRule,
    removeRule,
    addMeeting,
    updateMeetingMinutes,
    updateSettings,
    getTotalOwed,
    getOverdueDues,
    fetchFromServer,
  } = useHOAStore();

  useEffect(() => {
    fetchFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>('Dues');
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [showAddDuesModal, setShowAddDuesModal] = useState(false);
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sHoaName, setSHoaName] = useState(hoaName);
  const [sCompany, setSCompany] = useState(managementCompany);
  const [sPhone, setSPhone] = useState(managementPhone);
  const [sDueAmount, setSDueAmount] = useState(String(monthlyDueAmount || ''));

  const openSettingsModal = () => {
    setSHoaName(hoaName); setSCompany(managementCompany); setSPhone(managementPhone);
    setSDueAmount(String(monthlyDueAmount || ''));
    setShowSettingsModal(true);
  };

  const handleSaveSettings = () => {
    updateSettings({
      hoaName: sHoaName.trim(),
      managementCompany: sCompany.trim(),
      managementPhone: sPhone.trim(),
      monthlyDueAmount: parseFloat(sDueAmount) || 0,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSettingsModal(false);
  };

  // Add Dues form
  const [dPeriod, setDPeriod] = useState('');
  const [dAmount, setDAmount] = useState(String(monthlyDueAmount));
  const [dDueDate, setDDueDate] = useState('');
  const [dNotes, setDNotes] = useState('');

  // Add Meeting form
  const [mTitle, setMTitle] = useState('');
  const [mDate, setMDate] = useState('');
  const [mLocation, setMLocation] = useState('');
  const [mNotes, setMNotes] = useState('');
  const [mAttended, setMAttended] = useState(false);

  const totalOwed = getTotalOwed();
  const overdueDues = getOverdueDues();
  const sortedDues = [...dues].sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const upcomingMeetings = meetings.filter((m) => isFuture(m.date)).sort((a, b) => a.date.localeCompare(b.date));
  const pastMeetings = meetings.filter((m) => !isFuture(m.date)).sort((a, b) => b.date.localeCompare(a.date));

  const rulesByCategory = rules.reduce<Record<string, HOARule[]>>((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {});

  const resetDuesForm = () => {
    setDPeriod(''); setDAmount(String(monthlyDueAmount)); setDDueDate(''); setDNotes('');
  };
  const resetMeetingForm = () => {
    setMTitle(''); setMDate(''); setMLocation(''); setMNotes(''); setMAttended(false);
  };

  const handleAddDues = () => {
    const amount = parseFloat(dAmount);
    if (!dPeriod.trim() || isNaN(amount) || !dDueDate.trim()) {
      Alert.alert('Missing Info', 'Please fill in period, amount, and due date.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addDues({
      period: dPeriod.trim(),
      amount,
      dueDate: dDueDate.trim(),
      status: 'due',
      notes: dNotes.trim(),
    });
    resetDuesForm();
    setShowAddDuesModal(false);
  };

  const handleMarkPaid = (id: string, period: string) => {
    Alert.alert(`Mark "${period}" as paid?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          markDuesPaid(id, new Date().toISOString().split('T')[0]);
        },
      },
    ]);
  };

  const handleAddMeeting = () => {
    if (!mTitle.trim() || !mDate.trim()) {
      Alert.alert('Missing Info', 'Please enter a title and date.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addMeeting({
      title: mTitle.trim(),
      date: mDate.trim(),
      location: mLocation.trim(),
      notes: mNotes.trim(),
      attended: mAttended,
      minutes: '',
    });
    resetMeetingForm();
    setShowAddMeetingModal(false);
  };

  const handleDeleteRule = (id: string, title: string) => {
    Alert.alert(`Delete rule?`, title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          removeRule(id);
        },
      },
    ]);
  };

  const GRADIENT_COLORS: [string, string] = ['#37474F', '#455A64'];
  const tabs: Tab[] = ['Dues', 'Rules', 'Community'];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENT_COLORS} style={{ paddingTop: insets.top + 8, paddingBottom: 0 }}>
        {/* Header top row */}
        <View style={styles.headerTop}>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={openSettingsModal} style={styles.headerCenter}>
            <Text style={styles.headerTitle}>HOA Manager</Text>
            <Text style={styles.headerSub}>{hoaName || 'Tap to add your HOA info'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button"
            onPress={() => activeTab === 'Dues' ? setShowAddDuesModal(true) : activeTab === 'Community' ? setShowAddMeetingModal(true) : null}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>

        {/* Header stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(monthlyDueAmount)}<Text style={styles.statUnit}>/mo</Text></Text>
            <Text style={styles.statLabel}>Monthly Dues</Text>
          </View>
          <View style={[styles.statCard, totalOwed > 0 ? styles.statCardDanger : null]}>
            <Text style={[styles.statValue, totalOwed > 0 ? { color: '#FF8A65' } : null]}>
              {formatCurrency(totalOwed)}
            </Text>
            <Text style={styles.statLabel}>Total Owed</Text>
          </View>
          {overdueDues.length > 0 && (
            <View style={[styles.statCard, styles.statCardDanger]}>
              <Text style={[styles.statValue, { color: '#FF5252' }]}>{overdueDues.length}</Text>
              <Text style={styles.statLabel}>Overdue</Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <Pressable accessibilityRole="button"
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={activeTab === tab ? styles.tabActive : styles.tabInactive}
            >
              <Text style={activeTab === tab ? styles.tabTextActive : styles.tabTextInactive}>{tab}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>

        {/* ---- DUES TAB ---- */}
        {activeTab === 'Dues' && (
          <>
            {totalOwed > 0 && (
              <View style={styles.owedBanner}>
                <Ionicons name="alert-circle" size={20} color={colors.danger} />
                <Text style={styles.owedBannerText}>
                  {formatCurrency(totalOwed)} outstanding • {overdueDues.length} overdue
                </Text>
              </View>
            )}

            {sortedDues.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No dues records</Text>
                <Text style={styles.emptySubText}>Tap + to add</Text>
              </View>
            ) : (
              sortedDues.map((record) => {
                const statusColor = getDuesStatusColor(record.status);
                const cardStyle: ViewStyle = { ...styles.listCard, borderLeftColor: statusColor, borderLeftWidth: 4 };
                const canPay = record.status === 'due' || record.status === 'overdue';
                return (
                  <View key={record.id} style={cardStyle}>
                    <View style={styles.duesRow}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.duesTitleRow}>
                          <Text style={styles.duesPeriod}>{record.period}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                            <Text style={styles.statusBadgeText}>{getDuesStatusLabel(record.status)}</Text>
                          </View>
                        </View>
                        <Text style={styles.duesMeta}>
                          Due: {record.dueDate}
                          {record.paidDate ? ` • Paid: ${record.paidDate}` : ''}
                        </Text>
                        {record.notes ? <Text style={styles.duesNotes}>{record.notes}</Text> : null}
                      </View>
                      <View style={styles.duesRight}>
                        <Text style={[styles.duesAmount, { color: statusColor }]}>{formatCurrency(record.amount)}</Text>
                        {canPay && (
                          <Pressable accessibilityRole="button"
                            onPress={() => handleMarkPaid(record.id, record.period)}
                            style={styles.payBtn}
                          >
                            <Text style={styles.payBtnText}>Mark Paid</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ---- RULES TAB ---- */}
        {activeTab === 'Rules' && (
          <>
            {Object.keys(rulesByCategory).length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No rules yet</Text>
              </View>
            ) : (
              Object.entries(rulesByCategory).map(([category, categoryRules]) => (
                <View key={category} style={{ marginBottom: 8 }}>
                  <Text style={styles.categoryHeader}>{category}</Text>
                  {categoryRules.map((rule) => {
                    const isExpanded = expandedRuleId === rule.id;
                    const sevColor = getSeverityColor(rule.severity);
                    return (
                      <Pressable accessibilityRole="button"
                        key={rule.id}
                        onPress={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                        onLongPress={() => handleDeleteRule(rule.id, rule.title)}
                      >
                        <View style={styles.ruleCard}>
                          <View style={styles.ruleHeader}>
                            <Ionicons name={getSeverityIcon(rule.severity) as any} size={20} color={sevColor} />
                            <Text style={styles.ruleTitle}>{rule.title}</Text>
                            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                          </View>
                          {isExpanded && (
                            <Text style={styles.ruleDesc}>{rule.description}</Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))
            )}
            <Text style={styles.longPressHint}>Long-press a rule to delete</Text>
          </>
        )}

        {/* ---- COMMUNITY TAB ---- */}
        {activeTab === 'Community' && (
          <>
            {/* Amenities */}
            <Text style={styles.sectionTitle}>Amenities</Text>
            {amenities.map((amenity) => (
              <View key={amenity.id} style={styles.amenityCard}>
                <View style={styles.amenityIcon}>
                  <Ionicons name={amenity.icon as any} size={24} color='#455A64' />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.amenityTitleRow}>
                    <Text style={styles.amenityName}>{amenity.name}</Text>
                    {amenity.reservationRequired && (
                      <View style={styles.resBadge}>
                        <Text style={styles.resBadgeText}>Reservation</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.amenityHours}>
                    <Ionicons name="time-outline" size={12} color={colors.textMuted} /> {amenity.hours}
                  </Text>
                  {amenity.notes ? <Text style={styles.amenityNotes}>{amenity.notes}</Text> : null}
                </View>
              </View>
            ))}

            {/* Management Contact */}
            <Pressable accessibilityRole="button" onPress={openSettingsModal} style={styles.contactCard}>
              <Ionicons name="business-outline" size={20} color='#455A64' />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.contactName}>{managementCompany || 'Add management company'}</Text>
                <Text style={styles.contactPhone}>{managementPhone || 'Tap to add contact info'}</Text>
              </View>
              <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
            </Pressable>

            {/* Upcoming Meetings */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Upcoming Meetings</Text>
              <Pressable accessibilityRole="button" onPress={() => setShowAddMeetingModal(true)}>
                <Ionicons name="add-circle-outline" size={22} color='#455A64' />
              </Pressable>
            </View>
            <View style={{ marginTop: 10, marginBottom: 16 }}>
              {upcomingMeetings.length === 0 ? (
                <Text style={styles.noMeetings}>No upcoming meetings</Text>
              ) : (
                upcomingMeetings.map((meeting) => (
                  <View key={meeting.id} style={styles.meetingCard}>
                    <View style={styles.meetingDateCol}>
                      <Text style={styles.meetingMonth}>
                        {new Date(meeting.date).toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                      </Text>
                      <Text style={styles.meetingDay}>{new Date(meeting.date).getDate()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.meetingTitle}>{meeting.title}</Text>
                      <Text style={styles.meetingMeta}>{meeting.location}</Text>
                      {meeting.notes ? <Text style={styles.meetingNotes}>{meeting.notes}</Text> : null}
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Past Meetings */}
            <Text style={styles.sectionTitle}>Past Meetings</Text>
            {pastMeetings.length === 0 ? (
              <Text style={styles.noMeetings}>No past meetings</Text>
            ) : (
              pastMeetings.map((meeting) => (
                <View key={meeting.id} style={styles.meetingCardPast}>
                  <View style={styles.meetingDateCol}>
                    <Text style={styles.meetingMonth}>
                      {new Date(meeting.date).toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={styles.meetingDay}>{new Date(meeting.date).getDate()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.meetingTitleRow}>
                      <Text style={styles.meetingTitle}>{meeting.title}</Text>
                      {meeting.attended && (
                        <View style={styles.attendedBadge}>
                          <Text style={styles.attendedText}>Attended</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.meetingMeta}>{meeting.location} • {formatDate(meeting.date)}</Text>
                    {meeting.minutes ? (
                      <Text style={styles.meetingMinutes} numberOfLines={2}>{meeting.minutes}</Text>
                    ) : (
                      <Text style={styles.meetingNoMinutes}>No minutes recorded</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      {(activeTab === 'Dues' || activeTab === 'Community') && (
        <Pressable accessibilityRole="button"
          style={[styles.fab, { bottom: tabBarInset }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (activeTab === 'Dues') setShowAddDuesModal(true);
            else setShowAddMeetingModal(true);
          }}
        >
          <LinearGradient colors={GRADIENT_COLORS} style={styles.fabGradient}>
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </Pressable>
      )}

      {/* Add Dues Modal */}
      <Modal visible={showAddDuesModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddDuesModal(false)}>
        <View style={styles.modalContainer}>
          <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={styles.modalTitle}>Add Dues Record</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Period *</Text>
            <TextInput accessibilityLabel="e.g. August 2026, Q3 2026"
              style={styles.input}
              value={dPeriod}
              onChangeText={setDPeriod}
              placeholder="e.g. August 2026, Q3 2026"
            />

            <Text style={styles.fieldLabel}>Amount *</Text>
            <TextInput accessibilityLabel="250"
              style={styles.input}
              value={dAmount}
              onChangeText={setDAmount}
              placeholder="250"
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Due Date *</Text>
            <TextInput accessibilityLabel="YYYY-MM-DD"
              style={styles.input}
              value={dDueDate}
              onChangeText={setDDueDate}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput accessibilityLabel="Optional notes..."
              style={[styles.input, { height: 80 }]}
              value={dNotes}
              onChangeText={setDNotes}
              placeholder="Optional notes..."
              multiline
            />

            <Pressable accessibilityRole="button" style={styles.saveBtn} onPress={handleAddDues}>
              <Text style={styles.saveBtnText}>Add Dues Record</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.cancelBtn} onPress={() => { resetDuesForm(); setShowAddDuesModal(false); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Meeting Modal */}
      <Modal visible={showAddMeetingModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddMeetingModal(false)}>
        <View style={styles.modalContainer}>
          <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={styles.modalTitle}>Add Meeting</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput accessibilityLabel="e.g. Annual Board Meeting"
              style={styles.input}
              value={mTitle}
              onChangeText={setMTitle}
              placeholder="e.g. Annual Board Meeting"
            />

            <Text style={styles.fieldLabel}>Date *</Text>
            <TextInput accessibilityLabel="YYYY-MM-DD"
              style={styles.input}
              value={mDate}
              onChangeText={setMDate}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput accessibilityLabel="e.g. Clubhouse, Main Hall"
              style={styles.input}
              value={mLocation}
              onChangeText={setMLocation}
              placeholder="e.g. Clubhouse, Main Hall"
            />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput accessibilityLabel="Agenda, topics..."
              style={[styles.input, { height: 80 }]}
              value={mNotes}
              onChangeText={setMNotes}
              placeholder="Agenda, topics..."
              multiline
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>I attended this meeting</Text>
              <Switch
                value={mAttended}
                onValueChange={setMAttended}
                trackColor={{ true: '#455A64' }}
              />
            </View>

            <Pressable accessibilityRole="button" style={styles.saveBtn} onPress={handleAddMeeting}>
              <Text style={styles.saveBtnText}>Add Meeting</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.cancelBtn} onPress={() => { resetMeetingForm(); setShowAddMeetingModal(false); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showSettingsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettingsModal(false)}>
        <View style={styles.modalContainer}>
          <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={styles.modalTitle}>HOA Info</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>HOA Name</Text>
            <TextInput accessibilityLabel="e.g. Maple Grove HOA"
              style={styles.input}
              value={sHoaName}
              onChangeText={setSHoaName}
              placeholder="e.g. Maple Grove HOA"
            />

            <Text style={styles.fieldLabel}>Management Company</Text>
            <TextInput accessibilityLabel="e.g. ABC Community Management"
              style={styles.input}
              value={sCompany}
              onChangeText={setSCompany}
              placeholder="e.g. ABC Community Management"
            />

            <Text style={styles.fieldLabel}>Management Phone</Text>
            <TextInput accessibilityLabel="e.g. (555) 123-4567"
              style={styles.input}
              value={sPhone}
              onChangeText={setSPhone}
              placeholder="e.g. (555) 123-4567"
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>Monthly Dues Amount</Text>
            <TextInput accessibilityLabel="e.g. 250"
              style={styles.input}
              value={sDueAmount}
              onChangeText={setSDueAmount}
              placeholder="e.g. 250"
              keyboardType="decimal-pad"
            />

            <Pressable accessibilityRole="button" style={styles.saveBtn} onPress={handleSaveSettings}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.cancelBtn} onPress={() => setShowSettingsModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { padding: 4 },
  addBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  statCardDanger: { backgroundColor: 'rgba(255,82,82,0.2)' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statUnit: { fontSize: 12, fontWeight: '500' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabActive: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabInactive: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabTextActive: { fontSize: 14, fontWeight: '700', color: '#37474F' },
  tabTextInactive: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  body: { flex: 1 },
  owedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  owedBannerText: { fontSize: 14, fontWeight: '600', color: colors.danger, flex: 1 },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    ...shadows.sm,
  },
  duesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  duesTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  duesPeriod: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, flexShrink: 0 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  duesMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  duesNotes: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  duesRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  duesAmount: { fontSize: 17, fontWeight: '800' },
  payBtn: {
    backgroundColor: '#37474F',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  payBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  categoryHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  ruleCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    ...shadows.sm,
  },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  ruleDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  longPressHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10, marginTop: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  amenityCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    ...shadows.sm,
  },
  amenityIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ECEFF1',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  amenityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  amenityName: { fontSize: 15, fontWeight: '700', color: colors.text },
  resBadge: { backgroundColor: '#455A64', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  resBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  amenityHours: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  amenityNotes: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    ...shadows.sm,
  },
  contactName: { fontSize: 14, fontWeight: '700', color: colors.text },
  contactPhone: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  noMeetings: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', marginBottom: 8 },
  meetingCard: {
    flexDirection: 'row',
    backgroundColor: '#ECEFF1',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
    ...shadows.sm,
  },
  meetingCardPast: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
    ...shadows.sm,
  },
  meetingDateCol: { alignItems: 'center', width: 40, flexShrink: 0 },
  meetingMonth: { fontSize: 10, fontWeight: '700', color: '#455A64', letterSpacing: 0.5 },
  meetingDay: { fontSize: 22, fontWeight: '800', color: colors.text },
  meetingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  meetingTitle: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  attendedBadge: { backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  attendedText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  meetingMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  meetingNotes: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  meetingMinutes: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  meetingNoMinutes: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...shadows.md,
  },
  fabGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  emptySubText: { fontSize: 13, color: colors.textMuted },
  modalContainer: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
  },
  switchLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },
  saveBtn: { backgroundColor: '#37474F', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  cancelBtnText: { color: colors.textSecondary, fontSize: 15 },
});
