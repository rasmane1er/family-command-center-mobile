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
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  useMealPrepStore,
  PrepSession,
  PrepCategory,
} from '../../store/useMealPrepStore';

type SessionTab = 'items' | 'ingredients' | 'overview';

const PREP_CATEGORIES: { value: PrepCategory; label: string; color: string }[] = [
  { value: 'protein', label: 'Protein', color: '#E53935' },
  { value: 'grain', label: 'Grain', color: '#F9A825' },
  { value: 'vegetable', label: 'Vegetable', color: '#43A047' },
  { value: 'sauce', label: 'Sauce', color: '#FB8C00' },
  { value: 'snack', label: 'Snack', color: '#7B1FA2' },
  { value: 'breakfast', label: 'Breakfast', color: '#039BE5' },
  { value: 'full-meal', label: 'Full Meal', color: '#00695C' },
  { value: 'dessert', label: 'Dessert', color: '#E91E63' },
];

const STORAGE_METHODS = ['fridge', 'freezer', 'room-temp'] as const;

function getCategoryColor(cat: PrepCategory): string {
  return PREP_CATEGORIES.find((c) => c.value === cat)?.color ?? '#666';
}

function getCategoryLabel(cat: PrepCategory): string {
  return PREP_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

function getStorageIcon(method: PrepSession['status']): string {
  return 'help-outline';
}

function getStorageBadgeColor(method: string): string {
  switch (method) {
    case 'fridge': return '#1565C0';
    case 'freezer': return '#0D47A1';
    case 'room-temp': return '#E65100';
    default: return '#666';
  }
}

function getSessionStatusVariant(status: PrepSession['status']): 'neutral' | 'warning' | 'success' {
  switch (status) {
    case 'planned': return 'neutral';
    case 'in-progress': return 'warning';
    case 'completed': return 'success';
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function minutesToHrsMin(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export function MealPrepScreen({ navigation: _navigation }: any) {
  const insets = useSafeAreaInsets();
  const store = useMealPrepStore();

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionTab, setSessionTab] = useState<SessionTab>('items');

  // Add Session modal
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessTitle, setSessTitle] = useState('');
  const [sessDate, setSessDate] = useState('');
  const [sessHours, setSessHours] = useState('');
  const [sessNotes, setSessNotes] = useState('');

  // Add Item modal
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<PrepCategory>('protein');
  const [itemServings, setItemServings] = useState('');
  const [itemPrepTime, setItemPrepTime] = useState('');
  const [itemCookTime, setItemCookTime] = useState('');
  const [itemInstructions, setItemInstructions] = useState('');
  const [itemStorageDays, setItemStorageDays] = useState('');
  const [itemStorageMethod, setItemStorageMethod] = useState<'fridge' | 'freezer' | 'room-temp'>('fridge');

  // Add Ingredient modal
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [ingName, setIngName] = useState('');
  const [ingQty, setIngQty] = useState('');
  const [ingAisle, setIngAisle] = useState('');

  const sortedSessions = [...store.sessions].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const selectedSession = selectedSessionId
    ? store.sessions.find((s) => s.id === selectedSessionId)
    : null;

  const sessionItems = selectedSessionId ? store.getItemsForSession(selectedSessionId) : [];
  const sessionIngredients = selectedSessionId ? store.getIngredientsForSession(selectedSessionId) : [];
  const completionPct = selectedSessionId ? store.getCompletionPercent(selectedSessionId) : 0;
  const totalPrepTime = selectedSessionId ? store.getTotalPrepTime(selectedSessionId) : 0;

  const resetSessionForm = () => { setSessTitle(''); setSessDate(''); setSessHours(''); setSessNotes(''); };
  const resetItemForm = () => {
    setItemName(''); setItemCategory('protein'); setItemServings('');
    setItemPrepTime(''); setItemCookTime(''); setItemInstructions('');
    setItemStorageDays(''); setItemStorageMethod('fridge');
  };
  const resetIngredientForm = () => { setIngName(''); setIngQty(''); setIngAisle(''); };

  const handleAddSession = () => {
    if (!sessTitle.trim()) return;
    const dateStr = sessDate.trim() || new Date().toISOString().split('T')[0];
    store.addSession({
      title: sessTitle.trim(),
      scheduledDate: dateStr,
      estimatedHours: parseFloat(sessHours) || 2,
      status: 'planned',
      notes: sessNotes.trim(),
      weekOf: getMondayOfWeek(dateStr),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetSessionForm();
    setShowAddSession(false);
  };

  const handleAddItem = () => {
    if (!itemName.trim() || !selectedSessionId) return;
    store.addItem({
      sessionId: selectedSessionId,
      name: itemName.trim(),
      category: itemCategory,
      servings: parseInt(itemServings) || 4,
      prepTimeMinutes: parseInt(itemPrepTime) || 0,
      cookTimeMinutes: parseInt(itemCookTime) || 0,
      instructions: itemInstructions.trim(),
      completed: false,
      storageDays: parseInt(itemStorageDays) || 4,
      storageMethod: itemStorageMethod,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetItemForm();
    setShowAddItem(false);
  };

  const handleAddIngredient = () => {
    if (!ingName.trim() || !selectedSessionId) return;
    store.addIngredient({
      sessionId: selectedSessionId,
      name: ingName.trim(),
      quantity: ingQty.trim(),
      purchased: false,
      aisle: ingAisle.trim(),
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetIngredientForm();
    setShowAddIngredient(false);
  };

  const handleDeleteSession = (session: PrepSession) => {
    Alert.alert('Delete Session', `Delete "${session.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          store.removeSession(session.id);
          if (selectedSessionId === session.id) setSelectedSessionId(null);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  // ── Session Detail View ──────────────────────────────────────────────────────
  if (selectedSession) {
    const fridgeItems = sessionItems.filter((i) => i.storageMethod === 'fridge').length;
    const freezerItems = sessionItems.filter((i) => i.storageMethod === 'freezer').length;
    const purchasedCount = sessionIngredients.filter((i) => i.purchased).length;

    // Group ingredients by aisle
    const byAisle: Record<string, typeof sessionIngredients> = {};
    for (const ing of sessionIngredients) {
      const aisleKey = ing.aisle || 'Other';
      if (!byAisle[aisleKey]) byAisle[aisleKey] = [];
      byAisle[aisleKey].push(ing);
    }

    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#004D40', '#00695C']}
          style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 20 }}
        >
          <Pressable accessibilityRole="button" onPress={() => setSelectedSessionId(null)} style={styles.backRow}>
            <Ionicons name={'chevron-back' as any} size={20} color="#fff" />
            <Text style={styles.backText}>Meal Prep</Text>
          </Pressable>
          <Text style={styles.detailTitle}>{selectedSession.title}</Text>
          <View style={styles.detailMeta}>
            <Ionicons name={'calendar-outline' as any} size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.detailMetaText}>{formatDate(selectedSession.scheduledDate)} · {selectedSession.estimatedHours}h estimated</Text>
            <Badge label={selectedSession.status} variant={getSessionStatusVariant(selectedSession.status)} size="sm" />
          </View>
        </LinearGradient>

        {/* Sub-tabs */}
        <View style={styles.subTabRow}>
          {(['items', 'ingredients', 'overview'] as SessionTab[]).map((t) => (
            <Pressable accessibilityRole="button" key={t} onPress={() => setSessionTab(t)} style={{ ...styles.subTabPill, ...(sessionTab === t ? styles.subTabPillActive : {}) }}>
              <Text style={{ ...styles.subTabText, ...(sessionTab === t ? styles.subTabTextActive : {}) }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* ─── Items Tab ──────────────────────────────────────────────────── */}
          {sessionTab === 'items' && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>{sessionItems.filter((i) => i.completed).length}/{sessionItems.length} completed</Text>
                <Pressable accessibilityRole="button" onPress={() => setShowAddItem(true)} style={styles.addSmallBtn}>
                  <Ionicons name={'add' as any} size={18} color={colors.primary} />
                  <Text style={styles.addSmallText}>Add Item</Text>
                </Pressable>
              </View>
              {sessionItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name={'restaurant-outline' as any} size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No prep items yet</Text>
                  <Text style={styles.emptySubText}>Tap + to add what you'll cook</Text>
                </View>
              ) : (
                sessionItems.map((item) => {
                  const catColor = getCategoryColor(item.category);
                  return (
                    <Card key={item.id} style={{ ...styles.itemCard, ...(item.completed ? { opacity: 0.6 } : {}) }}>
                      <View style={styles.itemHeader}>
                        <View style={[styles.catDot, { backgroundColor: catColor }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <View style={styles.itemBadgeRow}>
                            <View style={[styles.catBadge, { backgroundColor: catColor + '20' }]}>
                              <Text style={[styles.catBadgeText, { color: catColor }]}>{getCategoryLabel(item.category)}</Text>
                            </View>
                            <Text style={styles.itemMeta}>{item.servings} servings</Text>
                            <Text style={styles.itemMeta}>{minutesToHrsMin(item.prepTimeMinutes + item.cookTimeMinutes)}</Text>
                          </View>
                        </View>
                        <Pressable accessibilityRole="button" onPress={() => { store.completeItem(item.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                          <Ionicons name={(item.completed ? 'checkbox' : 'square-outline') as any} size={24} color={item.completed ? colors.success : colors.textMuted} />
                        </Pressable>
                      </View>
                      <View style={styles.storageRow}>
                        <View style={[styles.storageBadge, { backgroundColor: getStorageBadgeColor(item.storageMethod) + '18' }]}>
                          <Text style={[styles.storageBadgeText, { color: getStorageBadgeColor(item.storageMethod) }]}>
                            {item.storageMethod === 'room-temp' ? 'Room Temp' : item.storageMethod.charAt(0).toUpperCase() + item.storageMethod.slice(1)}
                          </Text>
                        </View>
                        <Text style={styles.storageDays}>{item.storageDays} days</Text>
                        <Pressable accessibilityRole="button" onPress={() => store.removeItem(item.id)} style={{ marginLeft: 'auto' as any }}>
                          <Ionicons name={'trash-outline' as any} size={15} color={colors.danger} />
                        </Pressable>
                      </View>
                    </Card>
                  );
                })
              )}
            </>
          )}

          {/* ─── Ingredients Tab ─────────────────────────────────────────────── */}
          {sessionTab === 'ingredients' && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>{purchasedCount} / {sessionIngredients.length} purchased</Text>
                <Pressable accessibilityRole="button" onPress={() => setShowAddIngredient(true)} style={styles.addSmallBtn}>
                  <Ionicons name={'add' as any} size={18} color={colors.primary} />
                  <Text style={styles.addSmallText}>Add Item</Text>
                </Pressable>
              </View>
              {sessionIngredients.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name={'cart-outline' as any} size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>Shopping list empty</Text>
                  <Text style={styles.emptySubText}>Add ingredients you need to buy</Text>
                </View>
              ) : (
                Object.entries(byAisle).map(([aisle, ings]) => (
                  <View key={aisle}>
                    <Text style={styles.aisleHeader}>{aisle}</Text>
                    {ings.map((ing) => (
                      <Card key={ing.id} style={styles.ingCard}>
                        <View style={styles.ingRow}>
                          <Pressable accessibilityRole="button" onPress={() => { store.toggleIngredientPurchased(ing.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                            <Ionicons name={(ing.purchased ? 'checkbox' : 'square-outline') as any} size={22} color={ing.purchased ? colors.success : colors.textMuted} />
                          </Pressable>
                          <Text style={{ ...styles.ingName, ...(ing.purchased ? styles.ingPurchased : {}) }}>{ing.name}</Text>
                          <Text style={styles.ingQty}>{ing.quantity}</Text>
                          <Pressable accessibilityRole="button" onPress={() => store.removeIngredient(ing.id)}>
                            <Ionicons name={'trash-outline' as any} size={15} color={colors.danger} />
                          </Pressable>
                        </View>
                      </Card>
                    ))}
                  </View>
                ))
              )}
            </>
          )}

          {/* ─── Overview Tab ─────────────────────────────────────────────── */}
          {sessionTab === 'overview' && (
            <>
              {/* Completion ring (simplified as a progress bar) */}
              <Card style={styles.overviewCard}>
                <Text style={styles.overviewTitle}>Completion</Text>
                <View style={styles.completionRow}>
                  <Text style={styles.completionPct}>{completionPct}%</Text>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${completionPct}%` as any }]} />
                    </View>
                    <Text style={styles.completionSub}>{sessionItems.filter((i) => i.completed).length} of {sessionItems.length} items done</Text>
                  </View>
                </View>
              </Card>
              <Card style={styles.overviewCard}>
                <Text style={styles.overviewTitle}>Total Time</Text>
                <Text style={styles.overviewBig}>{minutesToHrsMin(totalPrepTime)}</Text>
                <Text style={styles.overviewSub}>across {sessionItems.length} prep items</Text>
              </Card>
              <Card style={styles.overviewCard}>
                <Text style={styles.overviewTitle}>Storage Breakdown</Text>
                <View style={styles.storageBreakRow}>
                  <View style={styles.storageBreakItem}>
                    <Ionicons name={'thermometer-outline' as any} size={24} color="#1565C0" />
                    <Text style={styles.storageBreakNum}>{fridgeItems}</Text>
                    <Text style={styles.storageBreakLabel}>Fridge</Text>
                  </View>
                  <View style={styles.storageBreakItem}>
                    <Ionicons name={'snow-outline' as any} size={24} color="#0D47A1" />
                    <Text style={styles.storageBreakNum}>{freezerItems}</Text>
                    <Text style={styles.storageBreakLabel}>Freezer</Text>
                  </View>
                  <View style={styles.storageBreakItem}>
                    <Ionicons name={'home-outline' as any} size={24} color="#E65100" />
                    <Text style={styles.storageBreakNum}>{sessionItems.length - fridgeItems - freezerItems}</Text>
                    <Text style={styles.storageBreakLabel}>Room Temp</Text>
                  </View>
                </View>
              </Card>
              {selectedSession.notes ? (
                <Card style={styles.overviewCard}>
                  <Text style={styles.overviewTitle}>Notes</Text>
                  <Text style={styles.overviewNotes}>{selectedSession.notes}</Text>
                </Card>
              ) : null}
              <View style={styles.statusRow}>
                <Text style={styles.fieldLabel}>Session Status</Text>
                <View style={styles.optionRow}>
                  {(['planned', 'in-progress', 'completed'] as PrepSession['status'][]).map((s) => (
                    <Pressable accessibilityRole="button" key={s} onPress={() => store.updateSession(selectedSession.id, { status: s })} style={{ ...styles.optionChip, ...(selectedSession.status === s ? styles.optionChipActive : {}) }}>
                      <Text style={{ ...styles.optionChipText, ...(selectedSession.status === s ? styles.optionChipTextActive : {}) }}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* FAB for detail view */}
        {sessionTab !== 'overview' && (
          <Pressable accessibilityRole="button"
            onPress={() => { if (sessionTab === 'items') setShowAddItem(true); else setShowAddIngredient(true); }}
            style={styles.fab}
          >
            <LinearGradient colors={['#004D40', '#00695C']} style={styles.fabGradient}>
              <Ionicons name={'add' as any} size={28} color="#fff" />
            </LinearGradient>
          </Pressable>
        )}

        {/* Add Item Modal */}
        <Modal visible={showAddItem} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddItem(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
              <Text style={styles.modalTitle}>Add Prep Item</Text>
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput accessibilityLabel="e.g. Baked Chicken Breasts" style={styles.input} value={itemName} onChangeText={setItemName} placeholder="e.g. Baked Chicken Breasts" />
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.optionRow}>
                {PREP_CATEGORIES.map((c) => (
                  <Pressable accessibilityRole="button" key={c.value} onPress={() => setItemCategory(c.value)} style={{ ...styles.optionChip, ...(itemCategory === c.value ? { backgroundColor: c.color } : {}) }}>
                    <Text style={{ ...styles.optionChipText, ...(itemCategory === c.value ? { color: '#fff' } : {}) }}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Servings</Text>
              <TextInput accessibilityLabel="4" style={styles.input} value={itemServings} onChangeText={setItemServings} placeholder="4" keyboardType="number-pad" />
              <Text style={styles.fieldLabel}>Prep Time (minutes)</Text>
              <TextInput accessibilityLabel="15" style={styles.input} value={itemPrepTime} onChangeText={setItemPrepTime} placeholder="15" keyboardType="number-pad" />
              <Text style={styles.fieldLabel}>Cook Time (minutes)</Text>
              <TextInput accessibilityLabel="30" style={styles.input} value={itemCookTime} onChangeText={setItemCookTime} placeholder="30" keyboardType="number-pad" />
              <Text style={styles.fieldLabel}>Instructions</Text>
              <TextInput accessibilityLabel="How to prepare this item" style={{ ...styles.input, height: 80 }} value={itemInstructions} onChangeText={setItemInstructions} placeholder="How to prepare this item" multiline />
              <Text style={styles.fieldLabel}>Storage Method</Text>
              <View style={styles.optionRow}>
                {STORAGE_METHODS.map((m) => (
                  <Pressable accessibilityRole="button" key={m} onPress={() => setItemStorageMethod(m)} style={{ ...styles.optionChip, ...(itemStorageMethod === m ? styles.optionChipActive : {}) }}>
                    <Text style={{ ...styles.optionChipText, ...(itemStorageMethod === m ? styles.optionChipTextActive : {}) }}>
                      {m === 'room-temp' ? 'Room Temp' : m.charAt(0).toUpperCase() + m.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Lasts (days)</Text>
              <TextInput accessibilityLabel="5" style={styles.input} value={itemStorageDays} onChangeText={setItemStorageDays} placeholder="5" keyboardType="number-pad" />
              <View style={styles.modalButtons}>
                <Button title="Cancel" variant="ghost" onPress={() => { resetItemForm(); setShowAddItem(false); }} />
                <Button title="Add Item" onPress={handleAddItem} disabled={!itemName.trim()} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Add Ingredient Modal */}
        <Modal visible={showAddIngredient} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddIngredient(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={{ ...styles.modal, padding: 20 }}>
              <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
              <Text style={styles.modalTitle}>Add Ingredient</Text>
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput accessibilityLabel="e.g. Chicken breasts" style={styles.input} value={ingName} onChangeText={setIngName} placeholder="e.g. Chicken breasts" />
              <Text style={styles.fieldLabel}>Quantity</Text>
              <TextInput accessibilityLabel="e.g. 2 lbs, 3 cups" style={styles.input} value={ingQty} onChangeText={setIngQty} placeholder="e.g. 2 lbs, 3 cups" />
              <Text style={styles.fieldLabel}>Aisle (optional)</Text>
              <TextInput accessibilityLabel="e.g. Meat, Produce, Dairy" style={styles.input} value={ingAisle} onChangeText={setIngAisle} placeholder="e.g. Meat, Produce, Dairy" />
              <View style={styles.modalButtons}>
                <Button title="Cancel" variant="ghost" onPress={() => { resetIngredientForm(); setShowAddIngredient(false); }} />
                <Button title="Add" onPress={handleAddIngredient} disabled={!ingName.trim()} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  // ── Sessions List View ───────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#004D40', '#00695C']}
        style={{ paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <Text style={styles.headerTitle}>Meal Prep</Text>
        <Text style={styles.headerSubtitle}>Batch cooking planner</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {sortedSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name={'restaurant-outline' as any} size={56} color={colors.textMuted} />
            <Text style={styles.emptyText}>No prep sessions yet</Text>
            <Text style={styles.emptySubText}>Tap + to plan a batch cook session</Text>
          </View>
        ) : (
          sortedSessions.map((session) => {
            const pct = store.getCompletionPercent(session.id);
            const items = store.getItemsForSession(session.id);
            const ings = store.getIngredientsForSession(session.id);
            return (
              <Pressable accessibilityRole="button" key={session.id} onPress={() => { setSelectedSessionId(session.id); setSessionTab('items'); }}>
                <Card style={styles.sessionCard}>
                  <View style={styles.sessionCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionTitle}>{session.title}</Text>
                      <Text style={styles.sessionDate}>{formatDate(session.scheduledDate)} · {session.estimatedHours}h</Text>
                    </View>
                    <Badge label={session.status} variant={getSessionStatusVariant(session.status)} />
                  </View>
                  <View style={styles.sessionProgressRow}>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                    </View>
                    <Text style={styles.sessionPct}>{pct}%</Text>
                  </View>
                  <View style={styles.sessionFooter}>
                    <View style={styles.sessionStat}>
                      <Ionicons name={'restaurant-outline' as any} size={14} color={colors.textSecondary} />
                      <Text style={styles.sessionStatText}>{items.length} items</Text>
                    </View>
                    <View style={styles.sessionStat}>
                      <Ionicons name={'cart-outline' as any} size={14} color={colors.textSecondary} />
                      <Text style={styles.sessionStatText}>{ings.filter((i) => i.purchased).length}/{ings.length} bought</Text>
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => handleDeleteSession(session)} hitSlop={8} style={{ marginLeft: 'auto' as any }}>
                      <Ionicons name={'trash-outline' as any} size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Add Session Modal */}
      <Modal visible={showAddSession} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddSession(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.modalTitle}>New Prep Session</Text>
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput accessibilityLabel="e.g. Sunday Batch Cook" style={styles.input} value={sessTitle} onChangeText={setSessTitle} placeholder="e.g. Sunday Batch Cook" />
            <Text style={styles.fieldLabel}>Scheduled Date (YYYY-MM-DD)</Text>
            <TextInput accessibilityLabel="2026-08-09" style={styles.input} value={sessDate} onChangeText={setSessDate} placeholder="2026-08-09" />
            <Text style={styles.fieldLabel}>Estimated Hours</Text>
            <TextInput accessibilityLabel="3" style={styles.input} value={sessHours} onChangeText={setSessHours} placeholder="3" keyboardType="decimal-pad" />
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput accessibilityLabel="What's the focus this session?" style={{ ...styles.input, height: 80 }} value={sessNotes} onChangeText={setSessNotes} placeholder="What's the focus this session?" multiline />
            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="ghost" onPress={() => { resetSessionForm(); setShowAddSession(false); }} />
              <Button title="Create Session" onPress={handleAddSession} disabled={!sessTitle.trim()} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* FAB */}
      <Pressable accessibilityRole="button" onPress={() => setShowAddSession(true)} style={styles.fab}>
        <LinearGradient colors={['#004D40', '#00695C']} style={styles.fabGradient}>
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
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  sessionCard: { marginBottom: 14, ...shadows.sm },
  sessionCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  sessionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  sessionDate: { fontSize: 13, color: colors.textSecondary },
  sessionProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sessionPct: { fontSize: 13, fontWeight: '700', color: '#00695C' },
  sessionFooter: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sessionStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionStatText: { fontSize: 12, color: colors.textSecondary },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.textSecondary, marginTop: 12 },
  emptySubText: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  fab: { position: 'absolute', bottom: 90, right: 20 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  // Detail view
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  backText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  detailTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 6 },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', flex: 1 },
  subTabRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: colors.card, ...shadows.sm },
  subTabPill: { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center', backgroundColor: colors.border },
  subTabPillActive: { backgroundColor: '#00695C' },
  subTabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  subTabTextActive: { color: '#fff' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  summaryText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  addSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, backgroundColor: colors.card, borderRadius: 10, ...shadows.sm },
  addSmallText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  itemCard: { marginBottom: 10, ...shadows.sm },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  itemName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  itemBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
  itemMeta: { fontSize: 12, color: colors.textSecondary },
  storageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  storageBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  storageBadgeText: { fontSize: 12, fontWeight: '600' },
  storageDays: { fontSize: 12, color: colors.textSecondary },
  aisleHeader: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  ingCard: { marginBottom: 8, ...shadows.sm },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ingName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  ingPurchased: { textDecorationLine: 'line-through', color: colors.textMuted },
  ingQty: { fontSize: 13, color: colors.textSecondary },
  overviewCard: { marginBottom: 12, ...shadows.sm },
  overviewTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  overviewBig: { fontSize: 32, fontWeight: '800', color: '#00695C' },
  overviewSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  overviewNotes: { fontSize: 15, color: colors.text, lineHeight: 22 },
  completionRow: { flexDirection: 'row', alignItems: 'center' },
  completionPct: { fontSize: 36, fontWeight: '800', color: '#00695C', minWidth: 80 },
  completionSub: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  progressBg: { height: 8, backgroundColor: colors.border, borderRadius: 4, flex: 1 },
  progressFill: { height: 8, backgroundColor: '#00695C', borderRadius: 4 },
  storageBreakRow: { flexDirection: 'row', justifyContent: 'space-around' },
  storageBreakItem: { alignItems: 'center', gap: 4 },
  storageBreakNum: { fontSize: 22, fontWeight: '700', color: colors.text },
  storageBreakLabel: { fontSize: 12, color: colors.textSecondary },
  statusRow: { marginTop: 4 },
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
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, justifyContent: 'flex-end' },
});
