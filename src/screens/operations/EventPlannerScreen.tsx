import React, { useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { useTabBarInset } from '../../hooks/useTabBarInset';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  useEventPlannerStore,
  FamilyEvent,
  EventType,
  RSVPStatus,
} from '../../store/useEventPlannerStore';
import { AIVoiceQuickFillButton } from '../../components/ai/AIVoiceQuickFillButton';
import type { QuickFillField, QuickFillResult } from '../../services/aiService';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'baby-shower', label: 'Baby Shower' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'dinner-party', label: 'Dinner Party' },
  { value: 'game-night', label: 'Game Night' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'other', label: 'Other' },
];

const TASK_CATEGORIES = ['venue', 'catering', 'decorations', 'invitations', 'entertainment', 'other'] as const;

const EMOJIS = ['🎉', '🎂', '🎄', '🎊', '🎁', '🥂', '🎈'];

const RSVP_OPTIONS: { value: RSVPStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'maybe', label: 'Maybe' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusVariant(status: FamilyEvent['status']): 'neutral' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'planning': return 'warning';
    case 'confirmed': return 'success';
    case 'completed': return 'neutral';
    case 'cancelled': return 'danger';
  }
}

function getRSVPColor(rsvp: RSVPStatus): string {
  switch (rsvp) {
    case 'yes': return colors.success;
    case 'no': return colors.danger;
    case 'maybe': return colors.warning;
    case 'pending': return colors.textMuted;
  }
}

function getCategoryIcon(cat: string): string {
  switch (cat) {
    case 'venue': return 'location';
    case 'catering': return 'restaurant';
    case 'decorations': return 'color-palette';
    case 'invitations': return 'mail';
    case 'entertainment': return 'musical-notes';
    default: return 'list';
  }
}

type DetailTab = 'guests' | 'tasks' | 'budget';
type ViewTab = 'upcoming' | 'past';

const NEW_EVENT_QUICKFILL_FIELDS: QuickFillField[] = [
  { name: 'title', type: 'string', description: 'Event name/title' },
  { name: 'type', type: 'string', description: `Event type, one of exactly: ${EVENT_TYPES.map((t) => t.value).join(', ')}` },
  { name: 'date', type: 'date', description: 'Event date, formatted YYYY-MM-DD' },
  { name: 'time', type: 'string', description: 'Event time, e.g. "3:00 PM"' },
  { name: 'location', type: 'string', description: 'Venue or address' },
  { name: 'budget', type: 'number', description: 'Budget amount, digits only' },
  { name: 'host', type: 'string', description: 'Name of the family member hosting' },
  { name: 'description', type: 'string', description: 'Short description of the occasion' },
];

export function EventPlannerScreen({ navigation: _navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const store = useEventPlannerStore();

  const [viewTab, setViewTab] = useState<ViewTab>('upcoming');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('guests');

  // Add Event modal
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evType, setEvType] = useState<EventType>('birthday');
  const [evDate, setEvDate] = useState('');
  const [evTime, setEvTime] = useState('');
  const [evLocation, setEvLocation] = useState('');
  const [evBudget, setEvBudget] = useState('');
  const [evEmoji, setEvEmoji] = useState('🎉');
  const [evHost, setEvHost] = useState('');
  const [evDesc, setEvDesc] = useState('');

  // Add Guest modal
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [guName, setGuName] = useState('');
  const [guEmail, setGuEmail] = useState('');
  const [guPhone, setGuPhone] = useState('');
  const [guRsvp, setGuRsvp] = useState<RSVPStatus>('pending');
  const [guPlusOne, setGuPlusOne] = useState(false);
  const [guDiet, setGuDiet] = useState('');

  // Add Task modal
  const [showAddTask, setShowAddTask] = useState(false);
  const [tkTitle, setTkTitle] = useState('');
  const [tkCategory, setTkCategory] = useState<typeof TASK_CATEGORIES[number]>('other');
  const [tkDue, setTkDue] = useState('');
  const [tkAssigned, setTkAssigned] = useState('');

  // Add Expense modal
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [exCategory, setExCategory] = useState('');
  const [exDesc, setExDesc] = useState('');
  const [exAmount, setExAmount] = useState('');
  const [exPaid, setExPaid] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = store.events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = store.events.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const displayedEvents = viewTab === 'upcoming' ? upcoming : past;

  const selectedEvent = selectedEventId ? store.events.find((e) => e.id === selectedEventId) : null;
  const eventGuests = selectedEventId ? store.getGuestsForEvent(selectedEventId) : [];
  const eventTasks = selectedEventId ? store.getTasksForEvent(selectedEventId) : [];
  const eventExpenses = selectedEventId ? store.getExpensesForEvent(selectedEventId) : [];
  const totalSpent = selectedEventId ? store.getTotalSpent(selectedEventId) : 0;
  const confirmedCount = selectedEventId ? store.getConfirmedGuestCount(selectedEventId) : 0;

  const resetEventForm = () => {
    setEvTitle(''); setEvType('birthday'); setEvDate(''); setEvTime('');
    setEvLocation(''); setEvBudget(''); setEvEmoji('🎉'); setEvHost(''); setEvDesc('');
  };
  const resetGuestForm = () => {
    setGuName(''); setGuEmail(''); setGuPhone(''); setGuRsvp('pending'); setGuPlusOne(false); setGuDiet('');
  };
  const resetTaskForm = () => { setTkTitle(''); setTkCategory('other'); setTkDue(''); setTkAssigned(''); };
  const resetExpenseForm = () => { setExCategory(''); setExDesc(''); setExAmount(''); setExPaid(false); };

  const handleEventQuickFill = (result: QuickFillResult) => {
    if (typeof result.title === 'string') setEvTitle(result.title);
    if (typeof result.type === 'string' && EVENT_TYPES.some((t) => t.value === result.type)) {
      setEvType(result.type as EventType);
    }
    if (typeof result.date === 'string') setEvDate(result.date);
    if (typeof result.time === 'string') setEvTime(result.time);
    if (typeof result.location === 'string') setEvLocation(result.location);
    if (result.budget !== null && result.budget !== undefined) setEvBudget(String(result.budget));
    if (typeof result.host === 'string') setEvHost(result.host);
    if (typeof result.description === 'string') setEvDesc(result.description);
  };

  const handleAddEvent = () => {
    if (!evTitle.trim()) return;
    store.addEvent({
      title: evTitle.trim(),
      type: evType,
      date: evDate.trim() || today,
      time: evTime.trim() || '12:00 PM',
      location: evLocation.trim(),
      description: evDesc.trim(),
      budget: parseFloat(evBudget) || 0,
      status: 'planning',
      hostMember: evHost.trim(),
      emoji: evEmoji,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetEventForm();
    setShowAddEvent(false);
  };

  const handleAddGuest = () => {
    if (!guName.trim() || !selectedEventId) return;
    store.addGuest({
      eventId: selectedEventId,
      name: guName.trim(),
      email: guEmail.trim(),
      phone: guPhone.trim(),
      rsvp: guRsvp,
      plusOne: guPlusOne,
      dietaryRestrictions: guDiet.trim(),
      notes: '',
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetGuestForm();
    setShowAddGuest(false);
  };

  const handleAddTask = () => {
    if (!tkTitle.trim() || !selectedEventId) return;
    store.addTask({
      eventId: selectedEventId,
      title: tkTitle.trim(),
      dueDate: tkDue.trim() || today,
      completed: false,
      assignedTo: tkAssigned.trim(),
      category: tkCategory,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetTaskForm();
    setShowAddTask(false);
  };

  const handleAddExpense = () => {
    if (!exDesc.trim() || !selectedEventId) return;
    store.addExpense({
      eventId: selectedEventId,
      category: exCategory.trim() || 'Other',
      description: exDesc.trim(),
      amount: parseFloat(exAmount) || 0,
      paid: exPaid,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetExpenseForm();
    setShowAddExpense(false);
  };

  const handleDeleteEvent = (event: FamilyEvent) => {
    Alert.alert('Remove Event', `Delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          store.removeEvent(event.id);
          if (selectedEventId === event.id) setSelectedEventId(null);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  // ── Detail View ──────────────────────────────────────────────────────────────
  if (selectedEvent) {
    const budgetPct = selectedEvent.budget > 0 ? Math.min(totalSpent / selectedEvent.budget, 1) : 0;
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient colors={['#880E4F', '#AD1457']} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 20 }}>
          <Pressable accessibilityRole="button" onPress={() => setSelectedEventId(null)} style={styles.backRow}>
            <Ionicons name={'chevron-back' as any} size={20} color="#fff" />
            <Text style={styles.backText}>Events</Text>
          </Pressable>
          <View style={styles.detailHeaderRow}>
            <Text style={styles.detailEmoji}>{selectedEvent.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle}>{selectedEvent.title}</Text>
              <Text style={styles.detailSubtitle}>{formatDate(selectedEvent.date)} · {selectedEvent.time}</Text>
            </View>
            <Badge label={selectedEvent.status} variant={getStatusVariant(selectedEvent.status)} />
          </View>
        </LinearGradient>

        {/* Sub-tabs */}
        <View style={styles.tabRow}>
          {(['guests', 'tasks', 'budget'] as DetailTab[]).map((t) => (
            <Pressable accessibilityRole="button" key={t} onPress={() => setDetailTab(t)} style={{ ...styles.tabPill, ...(detailTab === t ? styles.tabPillActive : {}) }}>
              <Text style={{ ...styles.tabPillText, ...(detailTab === t ? styles.tabPillTextActive : {}) }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {detailTab === 'guests' && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>{confirmedCount} confirmed · {eventGuests.length} invited</Text>
                <Pressable accessibilityRole="button" onPress={() => setShowAddGuest(true)} style={styles.addSmallBtn}>
                  <Ionicons name={'add' as any} size={18} color={colors.primary} />
                  <Text style={styles.addSmallText}>Add Guest</Text>
                </Pressable>
              </View>
              {eventGuests.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name={'people-outline' as any} size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No guests yet</Text>
                  <Text style={styles.emptySubText}>Tap Add Guest to start your list</Text>
                </View>
              ) : (
                eventGuests.map((g) => (
                  <Card key={g.id} style={styles.listCard}>
                    <View style={styles.guestRow}>
                      <View style={[styles.rsvpDot, { backgroundColor: getRSVPColor(g.rsvp) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.guestName}>{g.name}{g.plusOne ? ' +1' : ''}</Text>
                        {g.dietaryRestrictions ? <Text style={styles.guestDetail}>{g.dietaryRestrictions}</Text> : null}
                      </View>
                      <View style={styles.rsvpRow}>
                        {RSVP_OPTIONS.map((opt) => (
                          <Pressable accessibilityRole="button"
                            key={opt.value}
                            onPress={() => store.updateGuestRSVP(g.id, opt.value)}
                            style={{ ...styles.rsvpBtn, ...(g.rsvp === opt.value ? { backgroundColor: getRSVPColor(opt.value) } : {}) }}
                          >
                            <Text style={{ ...styles.rsvpBtnText, ...(g.rsvp === opt.value ? { color: '#fff' } : {}) }}>
                              {opt.label.charAt(0)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <Pressable accessibilityRole="button" onPress={() => store.removeGuest(g.id)}>
                        <Ionicons name={'trash-outline' as any} size={16} color={colors.danger} />
                      </Pressable>
                    </View>
                  </Card>
                ))
              )}
            </>
          )}

          {detailTab === 'tasks' && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>{eventTasks.filter((t) => t.completed).length}/{eventTasks.length} done</Text>
                <Pressable accessibilityRole="button" onPress={() => setShowAddTask(true)} style={styles.addSmallBtn}>
                  <Ionicons name={'add' as any} size={18} color={colors.primary} />
                  <Text style={styles.addSmallText}>Add Task</Text>
                </Pressable>
              </View>
              {eventTasks.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name={'checkbox-outline' as any} size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No tasks yet</Text>
                  <Text style={styles.emptySubText}>Tap + to add planning tasks</Text>
                </View>
              ) : (
                eventTasks.map((t) => (
                  <Card key={t.id} style={{ ...styles.listCard, ...(t.completed ? { opacity: 0.6 } : {}) }}>
                    <View style={styles.taskRow}>
                      <Pressable accessibilityRole="button" onPress={() => { store.completeTask(t.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                        <Ionicons name={(t.completed ? 'checkbox' : 'square-outline') as any} size={22} color={t.completed ? colors.success : colors.textMuted} />
                      </Pressable>
                      <View style={[styles.catIconSmall, { backgroundColor: '#F0F4FF' }]}>
                        <Ionicons name={getCategoryIcon(t.category) as any} size={14} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...styles.taskTitle, ...(t.completed ? styles.taskDone : {}) }}>{t.title}</Text>
                        <Text style={styles.taskMeta}>{t.assignedTo ? `${t.assignedTo} · ` : ''}{t.dueDate ? formatDate(t.dueDate) : ''}</Text>
                      </View>
                    </View>
                  </Card>
                ))
              )}
            </>
          )}

          {detailTab === 'budget' && (
            <>
              <Card style={styles.budgetSummaryCard}>
                <Text style={styles.budgetLabel}>Total Budget</Text>
                <Text style={styles.budgetAmount}>${selectedEvent.budget.toFixed(2)}</Text>
                <View style={styles.budgetBarBg}>
                  <View style={[styles.budgetBarFill, { width: `${budgetPct * 100}%` as any, backgroundColor: budgetPct > 0.9 ? colors.danger : colors.success }]} />
                </View>
                <Text style={styles.budgetSpent}>${totalSpent.toFixed(2)} spent</Text>
              </Card>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>{eventExpenses.length} expense{eventExpenses.length !== 1 ? 's' : ''}</Text>
                <Pressable accessibilityRole="button" onPress={() => setShowAddExpense(true)} style={styles.addSmallBtn}>
                  <Ionicons name={'add' as any} size={18} color={colors.primary} />
                  <Text style={styles.addSmallText}>Add Expense</Text>
                </Pressable>
              </View>
              {eventExpenses.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name={'wallet-outline' as any} size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No expenses yet</Text>
                  <Text style={styles.emptySubText}>Track costs as you plan</Text>
                </View>
              ) : (
                eventExpenses.map((ex) => (
                  <Card key={ex.id} style={styles.listCard}>
                    <View style={styles.expenseRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.expenseDesc}>{ex.description}</Text>
                        <Text style={styles.expenseCat}>{ex.category}</Text>
                      </View>
                      <Text style={styles.expenseAmount}>${ex.amount.toFixed(2)}</Text>
                      <Badge label={ex.paid ? 'Paid' : 'Unpaid'} variant={ex.paid ? 'success' : 'warning'} />
                      <Pressable accessibilityRole="button" onPress={() => store.removeExpense(ex.id)} style={{ marginLeft: 8 }}>
                        <Ionicons name={'trash-outline' as any} size={16} color={colors.danger} />
                      </Pressable>
                    </View>
                  </Card>
                ))
              )}
            </>
          )}
        </ScrollView>

        {/* Add Guest Modal */}
        <Modal visible={showAddGuest} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddGuest(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
              <Text style={styles.modalTitle}>Add Guest</Text>
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput accessibilityLabel="Full name" style={styles.input} value={guName} onChangeText={setGuName} placeholder="Full name" />
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput accessibilityLabel="Email address" style={styles.input} value={guEmail} onChangeText={setGuEmail} placeholder="Email address" keyboardType="email-address" />
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput accessibilityLabel="Phone number" style={styles.input} value={guPhone} onChangeText={setGuPhone} placeholder="Phone number" keyboardType="phone-pad" />
              <Text style={styles.fieldLabel}>RSVP Status</Text>
              <View style={styles.optionRow}>
                {RSVP_OPTIONS.map((opt) => (
                  <Pressable accessibilityRole="button" key={opt.value} onPress={() => setGuRsvp(opt.value)} style={{ ...styles.optionChip, ...(guRsvp === opt.value ? styles.optionChipActive : {}) }}>
                    <Text style={{ ...styles.optionChipText, ...(guRsvp === opt.value ? styles.optionChipTextActive : {}) }}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Plus One</Text>
                <Switch value={guPlusOne} onValueChange={setGuPlusOne} trackColor={{ true: colors.primary }} />
              </View>
              <Text style={styles.fieldLabel}>Dietary Restrictions</Text>
              <TextInput accessibilityLabel="e.g. Vegetarian, No nuts" style={styles.input} value={guDiet} onChangeText={setGuDiet} placeholder="e.g. Vegetarian, No nuts" />
              <View style={styles.modalButtons}>
                <Button title="Cancel" variant="ghost" onPress={() => { resetGuestForm(); setShowAddGuest(false); }} />
                <Button title="Add Guest" onPress={handleAddGuest} disabled={!guName.trim()} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Add Task Modal */}
        <Modal visible={showAddTask} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddTask(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
              <Text style={styles.modalTitle}>Add Task</Text>
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput accessibilityLabel="Task description" style={styles.input} value={tkTitle} onChangeText={setTkTitle} placeholder="Task description" />
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.optionRow}>
                {TASK_CATEGORIES.map((c) => (
                  <Pressable accessibilityRole="button" key={c} onPress={() => setTkCategory(c)} style={{ ...styles.optionChip, ...(tkCategory === c ? styles.optionChipActive : {}) }}>
                    <Text style={{ ...styles.optionChipText, ...(tkCategory === c ? styles.optionChipTextActive : {}) }}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Due Date (YYYY-MM-DD)</Text>
              <TextInput accessibilityLabel="2026-08-10" style={styles.input} value={tkDue} onChangeText={setTkDue} placeholder="2026-08-10" />
              <Text style={styles.fieldLabel}>Assigned To</Text>
              <TextInput accessibilityLabel="Family member name" style={styles.input} value={tkAssigned} onChangeText={setTkAssigned} placeholder="Family member name" />
              <View style={styles.modalButtons}>
                <Button title="Cancel" variant="ghost" onPress={() => { resetTaskForm(); setShowAddTask(false); }} />
                <Button title="Add Task" onPress={handleAddTask} disabled={!tkTitle.trim()} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Add Expense Modal */}
        <Modal visible={showAddExpense} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddExpense(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
              <Text style={styles.modalTitle}>Add Expense</Text>
              <Text style={styles.fieldLabel}>Category</Text>
              <TextInput accessibilityLabel="e.g. Catering, Venue" style={styles.input} value={exCategory} onChangeText={setExCategory} placeholder="e.g. Catering, Venue" />
              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput accessibilityLabel="What did you spend on?" style={styles.input} value={exDesc} onChangeText={setExDesc} placeholder="What did you spend on?" />
              <Text style={styles.fieldLabel}>Amount ($)</Text>
              <TextInput accessibilityLabel="0.00" style={styles.input} value={exAmount} onChangeText={setExAmount} placeholder="0.00" keyboardType="decimal-pad" />
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Already Paid</Text>
                <Switch value={exPaid} onValueChange={setExPaid} trackColor={{ true: colors.success }} />
              </View>
              <View style={styles.modalButtons}>
                <Button title="Cancel" variant="ghost" onPress={() => { resetExpenseForm(); setShowAddExpense(false); }} />
                <Button title="Add Expense" onPress={handleAddExpense} disabled={!exDesc.trim()} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  // ── List View ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#880E4F', '#AD1457']} style={{ paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: 20 }}>
        <Text style={styles.headerTitle}>Event Planner</Text>
        <Text style={styles.headerSubtitle}>Parties & celebrations</Text>
        <View style={styles.tabRow}>
          {(['upcoming', 'past'] as ViewTab[]).map((t) => (
            <Pressable accessibilityRole="button" key={t} onPress={() => setViewTab(t)} style={{ ...styles.tabPillLight, ...(viewTab === t ? styles.tabPillLightActive : {}) }}>
              <Text style={{ ...styles.tabPillLightText, ...(viewTab === t ? styles.tabPillLightTextActive : {}) }}>
                {t.charAt(0).toUpperCase() + t.slice(1)} ({(t === 'upcoming' ? upcoming : past).length})
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {displayedEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name={'calendar-outline' as any} size={56} color={colors.textMuted} />
            <Text style={styles.emptyText}>No {viewTab} events</Text>
            <Text style={styles.emptySubText}>Tap + to plan a new event</Text>
          </View>
        ) : (
          displayedEvents.map((event) => {
            const guests = store.getGuestsForEvent(event.id);
            const spent = store.getTotalSpent(event.id);
            const budgetPct = event.budget > 0 ? Math.min(spent / event.budget, 1) : 0;
            return (
              <Pressable accessibilityRole="button" key={event.id} onPress={() => { setSelectedEventId(event.id); setDetailTab('guests'); }}>
                <Card style={styles.eventCard}>
                  <View style={styles.eventCardHeader}>
                    <Text style={styles.eventEmoji}>{event.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventMeta}>{formatDate(event.date)} · {event.time}</Text>
                      {event.location ? <Text style={styles.eventLocation}>{event.location}</Text> : null}
                    </View>
                    <View style={styles.eventBadgeCol}>
                      <Badge label={event.type.replace('-', ' ')} variant="primary" size="sm" />
                      <View style={{ height: 4 }} />
                      <Badge label={event.status} variant={getStatusVariant(event.status)} size="sm" />
                    </View>
                  </View>
                  <View style={styles.eventCardFooter}>
                    <View style={styles.guestCountRow}>
                      <Ionicons name={'people-outline' as any} size={14} color={colors.textSecondary} />
                      <Text style={styles.footerText}>{guests.length} guests</Text>
                    </View>
                    {event.budget > 0 && (
                      <View style={styles.budgetMini}>
                        <View style={styles.budgetBarMini}>
                          <View style={[styles.budgetBarMiniFill, { width: `${budgetPct * 100}%` as any, backgroundColor: budgetPct > 0.9 ? colors.danger : colors.success }]} />
                        </View>
                        <Text style={styles.footerText}>${spent.toFixed(0)} / ${event.budget.toFixed(0)}</Text>
                      </View>
                    )}
                    <Pressable accessibilityRole="button" onPress={() => handleDeleteEvent(event)} hitSlop={8}>
                      <Ionicons name={'trash-outline' as any} size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={showAddEvent} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddEvent(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.modalTitle}>New Event</Text>
            <AIVoiceQuickFillButton
              fields={NEW_EVENT_QUICKFILL_FIELDS}
              context="This is a family event being planned in a household event planner."
              onExtracted={handleEventQuickFill}
              prompt="Hold to dictate event details"
            />
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput accessibilityLabel="Event name" style={styles.input} value={evTitle} onChangeText={setEvTitle} placeholder="Event name" />
            <Text style={styles.fieldLabel}>Event Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {EVENT_TYPES.map((et) => (
                <Pressable accessibilityRole="button" key={et.value} onPress={() => setEvType(et.value)} style={{ ...styles.optionChip, ...(evType === et.value ? styles.optionChipActive : {}), marginRight: 8 }}>
                  <Text style={{ ...styles.optionChipText, ...(evType === et.value ? styles.optionChipTextActive : {}) }}>{et.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.fieldLabel}>Emoji</Text>
            <View style={styles.emojiRow}>
              {EMOJIS.map((em) => (
                <Pressable accessibilityRole="button" key={em} onPress={() => setEvEmoji(em)} style={{ ...styles.emojiBtn, ...(evEmoji === em ? styles.emojiBtnActive : {}) }}>
                  <Text style={styles.emojiText}>{em}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput accessibilityLabel="2026-08-15" style={styles.input} value={evDate} onChangeText={setEvDate} placeholder="2026-08-15" />
            <Text style={styles.fieldLabel}>Time</Text>
            <TextInput accessibilityLabel="3:00 PM" style={styles.input} value={evTime} onChangeText={setEvTime} placeholder="3:00 PM" />
            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput accessibilityLabel="Venue or address" style={styles.input} value={evLocation} onChangeText={setEvLocation} placeholder="Venue or address" />
            <Text style={styles.fieldLabel}>Budget ($)</Text>
            <TextInput accessibilityLabel="500" style={styles.input} value={evBudget} onChangeText={setEvBudget} placeholder="500" keyboardType="decimal-pad" />
            <Text style={styles.fieldLabel}>Host</Text>
            <TextInput accessibilityLabel="Family member name" style={styles.input} value={evHost} onChangeText={setEvHost} placeholder="Family member name" />
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput accessibilityLabel="What's the occasion?" style={{ ...styles.input, height: 80 }} value={evDesc} onChangeText={setEvDesc} placeholder="What's the occasion?" multiline />
            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="ghost" onPress={() => { resetEventForm(); setShowAddEvent(false); }} />
              <Button title="Create Event" onPress={handleAddEvent} disabled={!evTitle.trim()} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* FAB */}
      <Pressable accessibilityRole="button"
        onPress={() => setShowAddEvent(true)}
        style={[styles.fab, { bottom: tabBarInset }]}
      >
        <LinearGradient colors={['#880E4F', '#AD1457']} style={styles.fabGradient}>
          <Ionicons name={'add' as any} size={28} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 110 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 2 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tabPillLight: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  tabPillLightActive: { backgroundColor: '#fff' },
  tabPillLightText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  tabPillLightTextActive: { color: '#880E4F' },
  tabPill: { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center', backgroundColor: colors.border },
  tabPillActive: { backgroundColor: colors.primary },
  tabPillText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabPillTextActive: { color: '#fff' },
  eventCard: { marginBottom: 12, ...shadows.sm },
  eventCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  eventEmoji: { fontSize: 32 },
  eventTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  eventMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  eventLocation: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  eventBadgeCol: { alignItems: 'flex-end' },
  eventCardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  guestCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: colors.textSecondary },
  budgetMini: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  budgetBarMini: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2 },
  budgetBarMiniFill: { height: 4, borderRadius: 2 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.textSecondary, marginTop: 12 },
  emptySubText: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  fab: { position: 'absolute', right: 20 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  // Detail view
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  detailHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailEmoji: { fontSize: 36 },
  detailTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  detailSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  summaryText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  addSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, backgroundColor: colors.card, borderRadius: 10, ...shadows.sm },
  addSmallText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  listCard: { marginBottom: 10, ...shadows.sm },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rsvpDot: { width: 10, height: 10, borderRadius: 5 },
  guestName: { fontSize: 14, fontWeight: '600', color: colors.text },
  guestDetail: { fontSize: 12, color: colors.textSecondary },
  rsvpRow: { flexDirection: 'row', gap: 4 },
  rsvpBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  rsvpBtnText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIconSmall: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  taskDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  taskMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  budgetSummaryCard: { marginBottom: 16, ...shadows.sm },
  budgetLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  budgetAmount: { fontSize: 28, fontWeight: '700', color: colors.text },
  budgetBarBg: { height: 8, backgroundColor: colors.border, borderRadius: 4, marginVertical: 8 },
  budgetBarFill: { height: 8, borderRadius: 4 },
  budgetSpent: { fontSize: 14, color: colors.textSecondary },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  expenseDesc: { fontSize: 14, fontWeight: '600', color: colors.text },
  expenseCat: { fontSize: 12, color: colors.textSecondary },
  expenseAmount: { fontSize: 16, fontWeight: '700', color: colors.text },
  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 4 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.border },
  optionChipActive: { backgroundColor: colors.primary },
  optionChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  optionChipTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, justifyContent: 'flex-end' },
  emojiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  emojiBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emojiBtnActive: { backgroundColor: '#F8BBD0', borderWidth: 2, borderColor: '#880E4F' },
  emojiText: { fontSize: 24 },
});
