import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { format, differenceInDays } from 'date-fns';
import { colors } from '../../theme/colors';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useTravelStore, Trip, ItineraryItemType, ItineraryItem, PackingItem } from '../../store/useTravelStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useTranslation } from 'react-i18next';

function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  planning: { label: 'Planning', color: '#F5A623', bg: '#FEF3E2', icon: 'map-outline' },
  upcoming: { label: 'Upcoming', color: '#2980B9', bg: '#EBF5FB', icon: 'calendar' },
  active: { label: 'Active', color: '#27AE60', bg: '#D5F5E3', icon: 'navigate' },
  completed: { label: 'Completed', color: '#8E44AD', bg: '#F5EEF8', icon: 'checkmark-circle' },
} as const;

const ITIN_TYPE_ICONS: Record<ItineraryItemType, { icon: string; color: string }> = {
  transport: { icon: 'airplane', color: '#2980B9' },
  accommodation: { icon: 'bed', color: '#8E44AD' },
  activity: { icon: 'bicycle', color: '#27AE60' },
  dining: { icon: 'restaurant', color: '#E67E22' },
  other: { icon: 'ellipsis-horizontal', color: colors.textSecondary },
};

function TripDetailModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'itinerary' | 'packing' | 'budget'>('itinerary');
  const { togglePackingItem, deleteItineraryItem, deletePackingItem } = useTravelStore();
  const members = useFamilyStore((s) => s.members);
  const [showAddItin, setShowAddItin] = useState(false);
  const [showAddPack, setShowAddPack] = useState(false);

  const getMember = (id?: string) => members.find((m) => m.id === id);
  const packedCount = trip.packingList.filter((p) => p.isPacked).length;
  const totalItems = trip.packingList.length;
  // "Spent" is always derived from real itinerary costs — there's no
  // separately-stored number that could drift from what the itinerary
  // actually adds up to.
  const itinTotal = trip.itinerary.reduce((sum, i) => sum + (i.cost ?? 0), 0);
  const budgetUsed = trip.budget > 0 ? itinTotal / trip.budget : 0;

  const handleDeleteItin = (item: ItineraryItem) => {
    Alert.alert(`Remove "${item.title}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteItineraryItem(trip.id, item.id) },
    ]);
  };

  const handleDeletePack = (item: PackingItem) => {
    Alert.alert(`Remove "${item.name}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deletePackingItem(trip.id, item.id) },
    ]);
  };

  const sortedItinerary = [...trip.itinerary].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const itinByDate = sortedItinerary.reduce<Record<string, typeof sortedItinerary>>((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  const packingByCategory = trip.packingList.reduce<Record<string, typeof trip.packingList>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient colors={[trip.color, trip.color + 'BB']} style={[styles.detailHeader, { paddingTop: insets.top + 6 }]}>
        <View style={styles.detailHeaderRow}>
          <Pressable onPress={onClose} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailTitle}>{trip.emoji} {trip.name}</Text>
            <Text style={styles.detailSub}>
              {trip.destination} · {format(new Date(trip.startDate), 'MMM d')} – {format(new Date(trip.endDate), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
        <View style={styles.detailStats}>
          <View style={styles.detailStat}>
            <Text style={styles.detailStatVal}>{differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1}</Text>
            <Text style={styles.detailStatLabel}>Days</Text>
          </View>
          <View style={styles.detailStatDiv} />
          <View style={styles.detailStat}>
            <Text style={styles.detailStatVal}>{trip.attendeeIds.length}</Text>
            <Text style={styles.detailStatLabel}>Travelers</Text>
          </View>
          <View style={styles.detailStatDiv} />
          <View style={styles.detailStat}>
            <Text style={styles.detailStatVal}>${trip.budget.toLocaleString()}</Text>
            <Text style={styles.detailStatLabel}>Budget</Text>
          </View>
        </View>

        <View style={styles.detailTabs}>
          {(['itinerary', 'packing', 'budget'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.detailTabChip, tab === t && styles.detailTabChipActive]}>
              <Text style={[styles.detailTabChipText, tab === t && { color: trip.color }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === 'packing' && totalItems > 0 ? ` (${packedCount}/${totalItems})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.detailContent, { paddingBottom: 100 }]}>
        {tab === 'itinerary' && (
          <>
            <Pressable style={[styles.addItemBtn, { borderColor: trip.color }]} onPress={() => setShowAddItin(true)}>
              <Ionicons name="add" size={16} color={trip.color} />
              <Text style={[styles.addItemBtnText, { color: trip.color }]}>Add Itinerary Item</Text>
            </Pressable>
            {Object.entries(itinByDate).length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 48 }}>🗓️</Text>
                <Text style={styles.emptyTitle}>No itinerary yet</Text>
              </View>
            ) : (
              Object.entries(itinByDate).map(([date, items]) => (
                <View key={date}>
                  <Text style={styles.itinDateHeader}>{format(new Date(date + 'T12:00:00'), 'EEEE, MMM d')}</Text>
                  {items.map((item) => {
                    const cfg = ITIN_TYPE_ICONS[item.type];
                    return (
                      <Pressable key={item.id} onLongPress={() => handleDeleteItin(item)}>
                        <Card style={styles.itinCard} variant="elevated">
                          <View style={styles.itinRow}>
                            <View style={styles.itinTimeCol}>
                              <Text style={styles.itinTime}>{item.time}</Text>
                            </View>
                            <View style={[styles.itinIcon, { backgroundColor: cfg.color + '15' }]}>
                              <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={styles.itinTitle}>{item.title}</Text>
                              <Text style={styles.itinLocation}>{item.location}</Text>
                              {item.notes && <Text style={styles.itinNotes}>{item.notes}</Text>}
                            </View>
                            {item.cost != null && item.cost > 0 && (
                              <Text style={styles.itinCost}>${item.cost}</Text>
                            )}
                          </View>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              ))
            )}
          </>
        )}

        {tab === 'packing' && (
          <>
            <Pressable style={[styles.addItemBtn, { borderColor: trip.color }]} onPress={() => setShowAddPack(true)}>
              <Ionicons name="add" size={16} color={trip.color} />
              <Text style={[styles.addItemBtnText, { color: trip.color }]}>Add Packing Item</Text>
            </Pressable>
            {totalItems > 0 && (
              <Card style={styles.packProgressCard} variant="elevated">
                <View style={styles.packProgressRow}>
                  <Text style={styles.packProgressLabel}>{packedCount} of {totalItems} items packed</Text>
                  <Text style={styles.packProgressPct}>{Math.round((packedCount / totalItems) * 100)}%</Text>
                </View>
                <ProgressBar progress={packedCount / totalItems} color={trip.color} height={8} style={{ marginTop: 8 }} />
              </Card>
            )}
            {Object.entries(packingByCategory).map(([cat, items]) => (
              <View key={cat}>
                <Text style={styles.packCatHeader}>{cat}</Text>
                {items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      togglePackingItem(trip.id, item.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    onLongPress={() => handleDeletePack(item)}
                  >
                    <Card style={styles.packItem} variant="elevated">
                      <View style={styles.packItemRow}>
                        <View style={[styles.packCheck, item.isPacked && { backgroundColor: trip.color, borderColor: trip.color }]}>
                          {item.isPacked && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <Text style={[styles.packItemName, item.isPacked && styles.packItemDone]}>
                          {item.name}
                          {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                        </Text>
                        {item.assignedTo && (
                          <Text style={styles.packAssignee}>
                            {getMember(item.assignedTo)?.name?.split(' ')[0]}
                          </Text>
                        )}
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            ))}
            {totalItems === 0 && (
              <View style={styles.empty}>
                <Text style={{ fontSize: 48 }}>🧳</Text>
                <Text style={styles.emptyTitle}>Packing list empty</Text>
              </View>
            )}
          </>
        )}

        {tab === 'budget' && (
          <>
            <Card style={styles.budgetSummaryCard} variant="elevated">
              <Text style={styles.budgetTitle}>Budget Overview</Text>
              <View style={styles.budgetRow}>
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetVal}>${trip.budget.toLocaleString()}</Text>
                  <Text style={styles.budgetLabel}>Total Budget</Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetVal, { color: budgetUsed > 0.9 ? colors.danger : colors.success }]}>
                    ${itinTotal.toLocaleString()}
                  </Text>
                  <Text style={styles.budgetLabel}>Spent</Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetVal, { color: '#2980B9' }]}>${(trip.budget - itinTotal).toLocaleString()}</Text>
                  <Text style={styles.budgetLabel}>Remaining</Text>
                </View>
              </View>
              <ProgressBar progress={budgetUsed} color={budgetUsed > 0.9 ? colors.danger : trip.color} height={8} style={{ marginTop: 12 }} />
              <Text style={styles.budgetPctText}>{Math.round(budgetUsed * 100)}% of budget used</Text>
            </Card>

            {trip.itinerary.filter((i) => (i.cost ?? 0) > 0).length > 0 && (
              <>
                <Text style={styles.packCatHeader}>Itinerary Costs</Text>
                {trip.itinerary.filter((i) => (i.cost ?? 0) > 0).map((item) => {
                  const cfg = ITIN_TYPE_ICONS[item.type];
                  return (
                    <Card key={item.id} style={styles.txCard} variant="elevated">
                      <View style={styles.txRow}>
                        <View style={[styles.txIcon, { backgroundColor: cfg.color + '15' }]}>
                          <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                        </View>
                        <Text style={styles.txDesc}>{item.title}</Text>
                        <Text style={styles.txAmount}>${item.cost?.toLocaleString()}</Text>
                      </View>
                    </Card>
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>

      <AddItineraryItemModal
        visible={showAddItin}
        onClose={() => setShowAddItin(false)}
        onAdd={(item) => {
          useTravelStore.getState().addItineraryItem(trip.id, item);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowAddItin(false);
        }}
      />
      <AddPackingItemModal
        visible={showAddPack}
        onClose={() => setShowAddPack(false)}
        members={members}
        onAdd={(item) => {
          useTravelStore.getState().addPackingItem(trip.id, item);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowAddPack(false);
        }}
      />
    </View>
  );
}

const ITIN_TYPES: ItineraryItemType[] = ['transport', 'accommodation', 'activity', 'dining', 'other'];

function AddItineraryItemModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (i: Omit<ItineraryItem, 'id'>) => void }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<ItineraryItemType>('activity');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  const dateValid = isValidDateString(date.trim());
  const timeValid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(time.trim());
  const canSubmit = title.trim() && location.trim() && dateValid && timeValid;

  const reset = () => {
    setDate(''); setTime(''); setTitle(''); setLocation(''); setType('activity'); setCost(''); setNotes('');
  };

  const handleAdd = () => {
    if (!canSubmit) return;
    onAdd({
      date: date.trim(), time: time.trim(), title: title.trim(), location: location.trim(), type,
      cost: cost.trim() ? parseFloat(cost) : undefined,
      notes: notes.trim() || undefined,
    });
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.addTripModal} contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={styles.addTripHandle} />
          <Text style={styles.addTripTitle}>Add Itinerary Item</Text>

          <Text style={styles.addTripLabel}>Title *</Text>
          <TextInput style={styles.addTripInput} value={title} onChangeText={setTitle} placeholder="e.g. Flight to Maui" placeholderTextColor={colors.textSecondary} autoFocus />

          <Text style={styles.addTripLabel}>Location *</Text>
          <TextInput style={styles.addTripInput} value={location} onChangeText={setLocation} placeholder="e.g. DFW → OGG" placeholderTextColor={colors.textSecondary} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.addTripLabel}>Date (YYYY-MM-DD) *</Text>
              <TextInput style={styles.addTripInput} value={date} onChangeText={setDate} placeholder="2026-08-10" placeholderTextColor={colors.textSecondary} />
              {date.trim().length > 0 && !dateValid && <Text style={styles.fieldError}>Invalid date</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addTripLabel}>Time (24h) *</Text>
              <TextInput style={styles.addTripInput} value={time} onChangeText={setTime} placeholder="14:00" placeholderTextColor={colors.textSecondary} />
              {time.trim().length > 0 && !timeValid && <Text style={styles.fieldError}>Use HH:MM</Text>}
            </View>
          </View>

          <Text style={styles.addTripLabel}>Type</Text>
          <View style={styles.addTripEmojiRow}>
            {ITIN_TYPES.map((t) => {
              const cfg = ITIN_TYPE_ICONS[t];
              return (
                <Pressable key={t} onPress={() => setType(t)} style={[styles.typeChip, type === t && { backgroundColor: cfg.color + '20', borderColor: cfg.color }]}>
                  <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                  <Text style={[styles.typeChipText, type === t && { color: cfg.color, fontWeight: '700' }]}>{t}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.addTripLabel}>Cost ($, optional)</Text>
          <TextInput style={styles.addTripInput} value={cost} onChangeText={setCost} placeholder="e.g. 320" keyboardType="numeric" placeholderTextColor={colors.textSecondary} />

          <Text style={styles.addTripLabel}>Notes (optional)</Text>
          <TextInput style={styles.addTripInput} value={notes} onChangeText={setNotes} placeholder="e.g. Ocean view rooms x2" placeholderTextColor={colors.textSecondary} />

          <Pressable onPress={handleAdd} disabled={!canSubmit} style={[styles.addTripSubmit, !canSubmit && { opacity: 0.4 }]}>
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.addTripSubmitText}>Add to Itinerary</Text>
          </Pressable>

          <Pressable onPress={onClose} style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const PACK_CATEGORIES = ['Documents', 'Clothing', 'Health', 'Electronics', 'Activities', 'Entertainment', 'Beach', 'Other'];

function AddPackingItemModal({ visible, onClose, onAdd, members }: { visible: boolean; onClose: () => void; onAdd: (i: Omit<PackingItem, 'id'>) => void; members: ReturnType<typeof useFamilyStore.getState>['members'] }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(PACK_CATEGORIES[0]);
  const [quantity, setQuantity] = useState('1');
  const [assignedTo, setAssignedTo] = useState<string | undefined>(undefined);

  const canSubmit = name.trim().length > 0;

  const reset = () => {
    setName(''); setCategory(PACK_CATEGORIES[0]); setQuantity('1'); setAssignedTo(undefined);
  };

  const handleAdd = () => {
    if (!canSubmit) return;
    onAdd({
      name: name.trim(), category, isPacked: false,
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
      assignedTo,
    });
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.addTripModal} contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={styles.addTripHandle} />
          <Text style={styles.addTripTitle}>Add Packing Item</Text>

          <Text style={styles.addTripLabel}>Item Name *</Text>
          <TextInput style={styles.addTripInput} value={name} onChangeText={setName} placeholder="e.g. Sunscreen" placeholderTextColor={colors.textSecondary} autoFocus />

          <Text style={styles.addTripLabel}>Category</Text>
          <View style={styles.addTripEmojiRow}>
            {PACK_CATEGORIES.map((c) => (
              <Pressable key={c} onPress={() => setCategory(c)} style={[styles.typeChip, category === c && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                <Text style={[styles.typeChipText, category === c && { color: colors.primary, fontWeight: '700' }]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.addTripLabel}>Quantity</Text>
          <TextInput style={styles.addTripInput} value={quantity} onChangeText={setQuantity} placeholder="1" keyboardType="numeric" placeholderTextColor={colors.textSecondary} />

          {members.length > 0 && (
            <>
              <Text style={styles.addTripLabel}>Assign To (optional)</Text>
              <View style={styles.addTripEmojiRow}>
                <Pressable onPress={() => setAssignedTo(undefined)} style={[styles.typeChip, !assignedTo && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                  <Text style={[styles.typeChipText, !assignedTo && { color: colors.primary, fontWeight: '700' }]}>Unassigned</Text>
                </Pressable>
                {members.map((m) => (
                  <Pressable key={m.id} onPress={() => setAssignedTo(m.id)} style={[styles.typeChip, assignedTo === m.id && { backgroundColor: m.avatarColor + '20', borderColor: m.avatarColor }]}>
                    <Text style={[styles.typeChipText, assignedTo === m.id && { color: m.avatarColor, fontWeight: '700' }]}>{m.name.split(' ')[0]}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Pressable onPress={handleAdd} disabled={!canSubmit} style={[styles.addTripSubmit, !canSubmit && { opacity: 0.4 }]}>
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.addTripSubmitText}>Add to Packing List</Text>
          </Pressable>

          <Pressable onPress={onClose} style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const TRIP_EMOJIS = ['✈️', '🏖️', '🏔️', '🏙️', '🌍'];
const TRIP_COLORS = ['#0E6655', '#2980B9', '#8E44AD', '#E67E22', '#E74C3C'];

function AddTripModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (t: Omit<Trip, 'id' | 'itinerary' | 'packingList'>) => void }) {
  const members = useFamilyStore((s) => s.members);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [color, setColor] = useState(TRIP_COLORS[0]);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);

  const startValid = isValidDateString(startDate.trim());
  const endValid = isValidDateString(endDate.trim());
  const rangeValid = startValid && endValid && endDate.trim() >= startDate.trim();
  const canSubmit = name.trim() && destination.trim() && rangeValid;

  const toggleAttendee = (id: string) => {
    setAttendeeIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handleAdd = () => {
    if (!canSubmit) return;
    const familyId = useFamilyStore.getState().family?.id ?? 'demo-family';
    onAdd({
      familyId,
      name: name.trim(),
      destination: destination.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      budget: parseFloat(budget) || 0,
      emoji,
      color,
      attendeeIds,
      status: 'planning',
    });
    setName(''); setDestination(''); setStartDate(''); setEndDate(''); setBudget('');
    setEmoji('✈️'); setColor(TRIP_COLORS[0]); setAttendeeIds([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.addTripModal} contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={styles.addTripHandle} />
          <Text style={styles.addTripTitle}>Plan New Trip</Text>

          <Text style={styles.addTripLabel}>Trip Name *</Text>
          <TextInput style={styles.addTripInput} value={name} onChangeText={setName} placeholder="e.g. Summer Beach Vacation" placeholderTextColor={colors.textSecondary} autoFocus />

          <Text style={styles.addTripLabel}>Destination *</Text>
          <TextInput style={styles.addTripInput} value={destination} onChangeText={setDestination} placeholder="e.g. Miami, FL" placeholderTextColor={colors.textSecondary} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.addTripLabel}>Start Date (YYYY-MM-DD) *</Text>
              <TextInput style={styles.addTripInput} value={startDate} onChangeText={setStartDate} placeholder="2026-07-01" placeholderTextColor={colors.textSecondary} />
              {startDate.trim().length > 0 && !startValid && <Text style={styles.fieldError}>Invalid date</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addTripLabel}>End Date (YYYY-MM-DD) *</Text>
              <TextInput style={styles.addTripInput} value={endDate} onChangeText={setEndDate} placeholder="2026-07-10" placeholderTextColor={colors.textSecondary} />
              {endDate.trim().length > 0 && !endValid && <Text style={styles.fieldError}>Invalid date</Text>}
              {startValid && endValid && !rangeValid && <Text style={styles.fieldError}>Must be after start</Text>}
            </View>
          </View>

          <Text style={styles.addTripLabel}>Budget ($)</Text>
          <TextInput style={styles.addTripInput} value={budget} onChangeText={setBudget} placeholder="e.g. 3000" keyboardType="numeric" placeholderTextColor={colors.textSecondary} />

          {members.length > 0 && (
            <>
              <Text style={styles.addTripLabel}>Travelers</Text>
              <View style={styles.addTripEmojiRow}>
                {members.map((m) => {
                  const selected = attendeeIds.includes(m.id);
                  return (
                    <Pressable key={m.id} onPress={() => toggleAttendee(m.id)} style={[styles.typeChip, selected && { backgroundColor: m.avatarColor + '20', borderColor: m.avatarColor }]}>
                      {selected && <Ionicons name="checkmark" size={12} color={m.avatarColor} />}
                      <Text style={[styles.typeChipText, selected && { color: m.avatarColor, fontWeight: '700' }]}>{m.name.split(' ')[0]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.addTripLabel}>Emoji</Text>
          <View style={styles.addTripEmojiRow}>
            {TRIP_EMOJIS.map((e) => (
              <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.addTripEmojiChip, emoji === e && styles.addTripEmojiChipActive]}>
                <Text style={styles.addTripEmojiText}>{e}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.addTripLabel}>Color</Text>
          <View style={styles.addTripColorRow}>
            {TRIP_COLORS.map((c) => (
              <Pressable key={c} onPress={() => setColor(c)} style={[styles.addTripColorSwatch, { backgroundColor: c }, color === c && styles.addTripColorSwatchSelected]} />
            ))}
          </View>

          <Pressable
            onPress={handleAdd}
            disabled={!canSubmit}
            style={[styles.addTripSubmit, !canSubmit && { opacity: 0.4 }]}
          >
            <Ionicons name="airplane" size={18} color="#fff" />
            <Text style={styles.addTripSubmitText}>Create Trip</Text>
          </Pressable>

          <Pressable onPress={onClose} style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function TravelPlanningScreen({ navigation }: any) {
  const { t } = useTranslation('ops');
  const insets = useSafeAreaInsets();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [filter, setFilter] = useState<Trip['status'] | 'all'>('all');
  const [showAddTrip, setShowAddTrip] = useState(false);

  const { trips, isLoaded, addTrip, deleteTrip, fetchFromServer } = useTravelStore();
  const members = useFamilyStore((s) => s.members);

  useEffect(() => {
    if (!isLoaded) fetchFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMember = (id: string) => members.find((m) => m.id === id);

  const filtered = filter === 'all' ? trips : trips.filter((t) => t.status === filter);
  const upcomingCount = trips.filter((t) => t.status === 'planning' || t.status === 'upcoming').length;

  if (selectedTrip) {
    const liveTrip = trips.find((t) => t.id === selectedTrip.id) ?? selectedTrip;
    return <TripDetailModal trip={liveTrip} onClose={() => setSelectedTrip(null)} />;
  }

  const screenHeader = (
    <LinearGradient colors={['#0E6655', '#1ABC9C']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('travel.title')}</Text>
          <Text style={styles.headerSub}>{upcomingCount} upcoming trips</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setShowAddTrip(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {(['all', 'planning', 'upcoming', 'active', 'completed'] as const).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : STATUS_CONFIG[f].label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#0E6655', '#1ABC9C']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('travel.title')}</Text>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>{upcomingCount} trips</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
      >
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 56 }}>✈️</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptyDesc}>Tap + to start planning your next family adventure!</Text>
          </View>
        )}

        {filtered.map((trip) => {
          const statusCfg = STATUS_CONFIG[trip.status];
          const daysUntil = trip.status !== 'completed' ? differenceInDays(new Date(trip.startDate), new Date()) : null;
          const duration = differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1;
          const tripSpent = trip.itinerary.reduce((sum, i) => sum + (i.cost ?? 0), 0);
          const budgetPct = trip.budget > 0 ? tripSpent / trip.budget : 0;
          const packedPct = trip.packingList.length > 0
            ? trip.packingList.filter((p) => p.isPacked).length / trip.packingList.length
            : 0;

          return (
            <Pressable key={trip.id} onLongPress={() => Alert.alert('Delete Trip', `Remove "${trip.name}"?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteTrip(trip.id) },
            ])}>
              <Card style={styles.tripCard} variant="elevated" onPress={() => setSelectedTrip(trip)}>
                <LinearGradient colors={[trip.color + '20', trip.color + '05']} style={styles.tripGradient}>
                  <View style={styles.tripTop}>
                    <Text style={styles.tripEmoji}>{trip.emoji}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.tripName}>{trip.name}</Text>
                      <Text style={styles.tripDest}>{trip.destination}</Text>
                      <View style={styles.tripDates}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.tripDateText}>
                          {format(new Date(trip.startDate), 'MMM d')} – {format(new Date(trip.endDate), 'MMM d, yyyy')} · {duration} days
                        </Text>
                      </View>
                    </View>
                    <View>
                      <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                        <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                      </View>
                      {daysUntil !== null && daysUntil > 0 && (
                        <Text style={[styles.daysUntil, { color: trip.color }]}>{daysUntil}d away</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.tripMeta}>
                    <View style={styles.tripMetaItem}>
                      <Text style={styles.tripMetaLabel}>Budget</Text>
                      <Text style={styles.tripMetaVal}>${tripSpent.toLocaleString()} / ${trip.budget.toLocaleString()}</Text>
                      <ProgressBar progress={budgetPct} color={budgetPct > 0.9 ? colors.danger : trip.color} height={4} style={{ marginTop: 4, width: 90 }} />
                    </View>
                    {trip.packingList.length > 0 && (
                      <View style={styles.tripMetaItem}>
                        <Text style={styles.tripMetaLabel}>Packing</Text>
                        <Text style={styles.tripMetaVal}>{trip.packingList.filter((p) => p.isPacked).length}/{trip.packingList.length} items</Text>
                        <ProgressBar progress={packedPct} color={trip.color} height={4} style={{ marginTop: 4, width: 90 }} />
                      </View>
                    )}
                  </View>

                  <View style={styles.tripAttendees}>
                    {trip.attendeeIds.slice(0, 5).map((id) => {
                      const m = getMember(id);
                      if (!m) return null;
                      return (
                        <View key={id} style={[styles.attendeeAvatar, { backgroundColor: m.avatarColor + '30', borderColor: m.avatarColor }]}>
                          <Text style={[styles.attendeeInitial, { color: m.avatarColor }]}>{m.name.charAt(0)}</Text>
                        </View>
                      );
                    })}
                    <Ionicons name="chevron-forward" size={16} color={trip.color} style={{ marginLeft: 'auto' }} />
                  </View>
                </LinearGradient>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
        )}
      </CollapsibleHeader>

      <AddTripModal
        visible={showAddTrip}
        onClose={() => setShowAddTrip(false)}
        onAdd={(t) => {
          addTrip(t);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  back: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  filterTextActive: { color: '#0E6655' },
  content: { padding: 16 },
  tripCard: { marginBottom: 14, borderRadius: 18, overflow: 'hidden', padding: 0 },
  tripGradient: { borderRadius: 18, padding: 16 },
  tripTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  tripEmoji: { fontSize: 36 },
  tripName: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 2 },
  tripDest: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  tripDates: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripDateText: { fontSize: 11, color: colors.textMuted },
  statusBadge: { borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-end' },
  statusText: { fontSize: 10, fontWeight: '700' },
  daysUntil: { fontSize: 13, fontWeight: '800', textAlign: 'right', marginTop: 4 },
  tripMeta: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  tripMetaItem: {},
  tripMetaLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  tripMetaVal: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 },
  tripAttendees: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attendeeAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  attendeeInitial: { fontSize: 12, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  detailHeader: { paddingHorizontal: 20, paddingBottom: 8 },
  detailHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  detailTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  detailSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  detailStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 14, justifyContent: 'space-around' },
  detailStat: { alignItems: 'center', gap: 2 },
  detailStatVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
  detailStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  detailStatDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  detailTabs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  detailTabChip: { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  detailTabChipActive: { backgroundColor: '#fff' },
  detailTabChipText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  detailContent: { padding: 16 },
  itinDateHeader: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  itinCard: { marginBottom: 8, borderRadius: 12 },
  itinRow: { flexDirection: 'row', alignItems: 'flex-start' },
  itinTimeCol: { width: 45 },
  itinTime: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 2 },
  itinIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itinTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  itinLocation: { fontSize: 12, color: colors.textSecondary },
  itinNotes: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  itinCost: { fontSize: 13, fontWeight: '700', color: colors.primary },
  packProgressCard: { marginBottom: 12, borderRadius: 14 },
  packProgressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  packProgressLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  packProgressPct: { fontSize: 14, fontWeight: '800', color: colors.primary },
  packCatHeader: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  packItem: { marginBottom: 6, borderRadius: 10 },
  packItemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  packCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  packItemName: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  packItemDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  packAssignee: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  budgetSummaryCard: { borderRadius: 16, marginBottom: 16 },
  budgetTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 14 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-around' },
  budgetItem: { alignItems: 'center', gap: 4 },
  budgetVal: { fontSize: 18, fontWeight: '800', color: colors.text },
  budgetLabel: { fontSize: 11, color: colors.textMuted },
  budgetPctText: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  txCard: { marginBottom: 8, borderRadius: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txDesc: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  txAmount: { fontSize: 14, fontWeight: '700', color: colors.text },
  // Add Trip Modal
  addTripModal: { flex: 1, backgroundColor: colors.background, padding: 24 },
  addTripHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  addTripTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  addTripLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  addTripInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 4 },
  addTripEmojiRow: { flexDirection: 'row', gap: 10, marginBottom: 4, flexWrap: 'wrap' },
  addTripEmojiChip: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card },
  addTripEmojiChipActive: { borderColor: '#0E6655', backgroundColor: '#D5F5E3' },
  addTripEmojiText: { fontSize: 18 },
  addTripColorRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  addTripColorSwatch: { width: 36, height: 36, borderRadius: 18 },
  addTripColorSwatchSelected: { borderWidth: 3, borderColor: colors.text },
  addTripSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0E6655', borderRadius: 14, paddingVertical: 16, marginTop: 8 },
  addTripSubmitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  fieldError: { fontSize: 11, color: colors.danger, marginTop: 4, marginBottom: 4 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, marginBottom: 16 },
  addItemBtnText: { fontSize: 13, fontWeight: '700' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  typeChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
});
