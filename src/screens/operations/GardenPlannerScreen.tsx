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
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import {
  useGardenStore,
  PlantType,
  PlantStatus,
  WateringFrequency,
  Plant,
} from '../../store/useGardenStore';

const PLANT_TYPES: { value: PlantType; label: string }[] = [
  { value: 'vegetable', label: 'Vegetable' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'herb', label: 'Herb' },
  { value: 'flower', label: 'Flower' },
  { value: 'tree', label: 'Tree' },
  { value: 'shrub', label: 'Shrub' },
  { value: 'indoor', label: 'Indoor' },
  { value: 'lawn', label: 'Lawn' },
];

const PLANT_STATUSES: { value: PlantStatus; label: string; color: string }[] = [
  { value: 'seed', label: 'Seed', color: '#795548' },
  { value: 'seedling', label: 'Seedling', color: '#8BC34A' },
  { value: 'growing', label: 'Growing', color: '#4CAF50' },
  { value: 'flowering', label: 'Flowering', color: '#E91E63' },
  { value: 'harvesting', label: 'Harvesting', color: '#FF9800' },
  { value: 'dormant', label: 'Dormant', color: '#9E9E9E' },
  { value: 'dead', label: 'Dead', color: '#F44336' },
];

const WATERING_FREQUENCIES: { value: WateringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'every-2-days', label: 'Every 2 Days' },
  { value: 'every-3-days', label: 'Every 3 Days' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const TASK_CATEGORIES = [
  { value: 'watering', label: 'Watering', icon: 'water' },
  { value: 'fertilizing', label: 'Fertilizing', icon: 'flask' },
  { value: 'pruning', label: 'Pruning', icon: 'cut' },
  { value: 'harvesting', label: 'Harvesting', icon: 'basket' },
  { value: 'planting', label: 'Planting', icon: 'leaf' },
  { value: 'pest-control', label: 'Pest Control', icon: 'bug' },
  { value: 'other', label: 'Other', icon: 'construct' },
] as const;

const PLANT_EMOJIS = ['🌱', '🍅', '🌿', '🌻', '🌳', '🌾', '🍋', '🥕', '🌺', '🫐', '🌵', '🪴'];

const SUNLIGHT_OPTIONS = [
  { value: 'full-sun', label: 'Full Sun' },
  { value: 'partial-shade', label: 'Partial Shade' },
  { value: 'full-shade', label: 'Full Shade' },
] as const;

function getStatusColor(status: PlantStatus): string {
  return PLANT_STATUSES.find((s) => s.value === status)?.color ?? colors.textMuted;
}
function getStatusLabel(status: PlantStatus): string {
  return PLANT_STATUSES.find((s) => s.value === status)?.label ?? status;
}
function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}
function formatDate(dateStr?: string): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type Tab = 'Garden' | 'Tasks' | 'Schedule';

export function GardenPlannerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    plants,
    tasks,
    addPlant,
    updatePlant,
    waterPlant,
    removePlant,
    addTask,
    completeTask,
    removeTask,
    getPlantsNeedingWater,
    getTasksDueToday,
  } = useGardenStore();

  const [activeTab, setActiveTab] = useState<Tab>('Garden');
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [showAddPlantModal, setShowAddPlantModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [wateredPlantIds, setWateredPlantIds] = useState<Set<string>>(new Set());

  // Add Plant form
  const [pName, setPName] = useState('');
  const [pType, setPType] = useState<PlantType>('vegetable');
  const [pLocation, setPLocation] = useState('');
  const [pEmoji, setPEmoji] = useState('🌱');
  const [pStatus, setPStatus] = useState<PlantStatus>('seedling');
  const [pPlantedDate, setPPlantedDate] = useState('');
  const [pHarvestDate, setPHarvestDate] = useState('');
  const [pWaterFreq, setPWaterFreq] = useState<WateringFrequency>('weekly');
  const [pSunlight, setPSunlight] = useState<'full-sun' | 'partial-shade' | 'full-shade'>('full-sun');
  const [pNotes, setPNotes] = useState('');

  // Add Task form
  const [tTitle, setTTitle] = useState('');
  const [tCategory, setTCategory] = useState<typeof TASK_CATEGORIES[number]['value']>('watering');
  const [tDueDate, setTDueDate] = useState('');
  const [tPlantId, setTPlantId] = useState<string>('');

  const plantsNeedingWater = getPlantsNeedingWater();
  const tasksDueToday = getTasksDueToday();

  const locations = ['All', ...Array.from(new Set(plants.map((p) => p.location)))];
  const filteredPlants = locationFilter === 'All' ? plants : plants.filter((p) => p.location === locationFilter);

  const pendingTasks = tasks.filter((t) => !t.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const completedTasks = tasks.filter((t) => t.completed);
  const todayStr = new Date().toDateString();
  const dueTodayTasks = pendingTasks.filter((t) => new Date(t.dueDate).toDateString() === todayStr);
  const upcomingTasks = pendingTasks.filter((t) => new Date(t.dueDate).toDateString() !== todayStr);

  // Schedule: 7-day week view
  const weekDays: Date[] = [];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    weekDays.push(d);
  }

  const getPlantsForDay = (day: Date): Plant[] => {
    return plants.filter((p) => {
      if (!p.nextWatering) return false;
      return new Date(p.nextWatering).toDateString() === day.toDateString();
    });
  };

  const plantsByFrequency = WATERING_FREQUENCIES.map((f) => ({
    ...f,
    plants: plants.filter((p) => p.wateringFrequency === f.value),
  })).filter((f) => f.plants.length > 0);

  const resetPlantForm = () => {
    setPName(''); setPType('vegetable'); setPLocation(''); setPEmoji('🌱');
    setPStatus('seedling'); setPPlantedDate(''); setPHarvestDate('');
    setPWaterFreq('weekly'); setPSunlight('full-sun'); setPNotes('');
  };
  const resetTaskForm = () => {
    setTTitle(''); setTCategory('watering'); setTDueDate(''); setTPlantId('');
  };

  const handleAddPlant = () => {
    if (!pName.trim() || !pLocation.trim()) {
      Alert.alert('Missing Info', 'Please enter plant name and location.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addPlant({
      name: pName.trim(),
      type: pType,
      location: pLocation.trim(),
      emoji: pEmoji,
      status: pStatus,
      plantedDate: pPlantedDate.trim() || new Date().toISOString(),
      harvestDate: pHarvestDate.trim() || undefined,
      wateringFrequency: pWaterFreq,
      sunlight: pSunlight,
      notes: pNotes.trim(),
    });
    resetPlantForm();
    setShowAddPlantModal(false);
  };

  const handleAddTask = () => {
    if (!tTitle.trim()) {
      Alert.alert('Missing Info', 'Please enter a task title.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addTask({
      title: tTitle.trim(),
      category: tCategory,
      dueDate: tDueDate.trim() || new Date().toISOString(),
      completed: false,
      plantId: tPlantId || undefined,
    });
    resetTaskForm();
    setShowAddTaskModal(false);
  };

  const handleWaterPlant = (id: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    waterPlant(id);
    setWateredPlantIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setWateredPlantIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2000);
  };

  const GRADIENT_COLORS: [string, string] = ['#1B5E20', '#388E3C'];
  const tabs: Tab[] = ['Garden', 'Tasks', 'Schedule'];
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENT_COLORS} style={{ paddingTop: insets.top + 8, paddingBottom: 0 }}>
        {/* Header top row */}
        <View style={styles.headerTop}>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Garden Planner</Text>
            <Text style={styles.headerSub}>Plants, watering & tasks</Text>
          </View>
          <Pressable accessibilityRole="button"
            onPress={() => activeTab === 'Tasks' ? setShowAddTaskModal(true) : setShowAddPlantModal(true)}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>

        {/* Water alert badge */}
        {plantsNeedingWater.length > 0 && (
          <View style={styles.waterAlert}>
            <Ionicons name="water" size={16} color="#fff" />
            <Text style={styles.waterAlertText}>
              {plantsNeedingWater.length} plant{plantsNeedingWater.length !== 1 ? 's' : ''} need water today
            </Text>
          </View>
        )}

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

        {/* ---- GARDEN TAB ---- */}
        {activeTab === 'Garden' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {locations.map((loc) => {
                const isActive = locationFilter === loc;
                const locStyle: ViewStyle = {
                  ...styles.locChip,
                  backgroundColor: isActive ? '#1B5E20' : colors.card,
                  borderColor: '#1B5E20',
                };
                return (
                  <Pressable accessibilityRole="button" key={loc} onPress={() => setLocationFilter(loc)} style={locStyle}>
                    <Text style={[styles.locChipText, { color: isActive ? '#fff' : '#1B5E20' }]}>{loc}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {filteredPlants.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🌱</Text>
                <Text style={styles.emptyText}>No plants yet</Text>
                <Text style={styles.emptySubText}>Tap + to add</Text>
              </View>
            ) : (
              filteredPlants.map((plant) => {
                const needsWater = isOverdue(plant.nextWatering);
                const justWatered = wateredPlantIds.has(plant.id);
                const cardBg = justWatered ? '#E8F5E9' : colors.card;
                const plantCardStyle: ViewStyle = { ...styles.plantCard, backgroundColor: cardBg };
                return (
                  <View key={plant.id} style={plantCardStyle}>
                    <View style={styles.plantRow}>
                      <Text style={styles.plantEmoji}>{plant.emoji}</Text>
                      <View style={styles.plantInfo}>
                        <View style={styles.plantNameRow}>
                          <Text style={styles.plantName}>{plant.name}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(plant.status) }]}>
                            <Text style={styles.statusBadgeText}>{getStatusLabel(plant.status)}</Text>
                          </View>
                        </View>
                        <Text style={styles.plantLocation}>
                          <Ionicons name="location-outline" size={12} color={colors.textMuted} /> {plant.location}
                        </Text>
                        <Text style={[styles.waterNext, needsWater && !justWatered ? styles.waterNextOverdue : null]}>
                          <Ionicons name="water-outline" size={12} color={needsWater && !justWatered ? colors.danger : colors.textMuted} />
                          {' '}Next watering: {justWatered ? 'Just watered!' : formatDate(plant.nextWatering)}
                          {needsWater && !justWatered ? ' (overdue)' : ''}
                        </Text>
                      </View>
                      <Pressable accessibilityRole="button"
                        onPress={() => handleWaterPlant(plant.id, plant.name)}
                        style={[styles.waterBtn, justWatered ? styles.waterBtnDone : null]}
                      >
                        <Ionicons name="water" size={18} color={justWatered ? colors.success : '#1B5E20'} />
                      </Pressable>
                    </View>
                    <Pressable accessibilityRole="button"
                      style={styles.deletePlantBtn}
                      onLongPress={() =>
                        Alert.alert('Remove plant?', plant.name, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => removePlant(plant.id) },
                        ])
                      }
                    />
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ---- TASKS TAB ---- */}
        {activeTab === 'Tasks' && (
          <>
            {dueTodayTasks.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Due Today</Text>
                {dueTodayTasks.map((task) => {
                  const cat = TASK_CATEGORIES.find((c) => c.value === task.category);
                  const linkedPlant = task.plantId ? plants.find((p) => p.id === task.plantId) : undefined;
                  return (
                    <View key={task.id} style={styles.taskCardToday}>
                      <View style={styles.taskRow}>
                        <Ionicons name={cat?.icon as any ?? 'construct'} size={20} color='#1B5E20' />
                        <View style={styles.taskInfo}>
                          <Text style={styles.taskTitle}>{task.title}</Text>
                          {linkedPlant && (
                            <Text style={styles.taskMeta}>{linkedPlant.emoji} {linkedPlant.name}</Text>
                          )}
                        </View>
                        <Pressable accessibilityRole="button"
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); completeTask(task.id); }}
                          style={styles.completeBtn}
                        >
                          <Ionicons name="checkmark-circle" size={24} color='#1B5E20' />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {upcomingTasks.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Upcoming</Text>
                {upcomingTasks.map((task) => {
                  const cat = TASK_CATEGORIES.find((c) => c.value === task.category);
                  const linkedPlant = task.plantId ? plants.find((p) => p.id === task.plantId) : undefined;
                  return (
                    <Pressable accessibilityRole="button"
                      key={task.id}
                      onLongPress={() =>
                        Alert.alert('Task options', task.title, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Complete', onPress: () => completeTask(task.id) },
                          { text: 'Delete', style: 'destructive', onPress: () => removeTask(task.id) },
                        ])
                      }
                    >
                      <View style={styles.taskCard}>
                        <View style={styles.taskRow}>
                          <Ionicons name={cat?.icon as any ?? 'construct'} size={18} color={colors.textSecondary} />
                          <View style={styles.taskInfo}>
                            <Text style={styles.taskTitle}>{task.title}</Text>
                            <Text style={styles.taskMeta}>
                              {formatDate(task.dueDate)}
                              {linkedPlant ? ` • ${linkedPlant.emoji} ${linkedPlant.name}` : ''}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            )}

            {completedTasks.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 16, color: colors.textMuted }]}>Completed</Text>
                {completedTasks.map((task) => (
                  <Pressable accessibilityRole="button"
                    key={task.id}
                    onLongPress={() =>
                      Alert.alert('Delete task?', task.title, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => removeTask(task.id) },
                      ])
                    }
                  >
                    <View style={styles.taskCardDone}>
                      <View style={styles.taskRow}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                        <Text style={styles.taskTitleDone}>{task.title}</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </>
            )}

            {tasks.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyText}>No tasks yet</Text>
                <Text style={styles.emptySubText}>Tap + to add</Text>
              </View>
            )}
          </>
        )}

        {/* ---- SCHEDULE TAB ---- */}
        {activeTab === 'Schedule' && (
          <>
            <Text style={styles.sectionTitle}>This Week's Watering</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={styles.weekGrid}>
                {weekDays.map((day, idx) => {
                  const dayPlants = getPlantsForDay(day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <View key={idx} style={[styles.dayCol, isToday ? styles.dayColToday : null]}>
                      <Text style={[styles.dayLabel, isToday ? styles.dayLabelToday : null]}>
                        {DAY_LABELS[day.getDay()]}
                      </Text>
                      <Text style={[styles.dayDate, isToday ? styles.dayLabelToday : null]}>
                        {day.getDate()}
                      </Text>
                      {dayPlants.map((p) => (
                        <View key={p.id} style={styles.dayPlantChip}>
                          <Text style={styles.dayPlantEmoji}>{p.emoji}</Text>
                        </View>
                      ))}
                      {dayPlants.length === 0 && (
                        <Text style={styles.dayEmpty}>—</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={[styles.sectionTitle, { marginTop: 4 }]}>By Watering Frequency</Text>
            {plantsByFrequency.map((group) => (
              <View key={group.value} style={{ marginBottom: 12 }}>
                <Text style={styles.freqLabel}>{group.label}</Text>
                {group.plants.map((p) => (
                  <View key={p.id} style={styles.schedPlantCard}>
                    <Text style={styles.schedEmoji}>{p.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.schedPlantName}>{p.name}</Text>
                      <Text style={styles.schedPlantMeta}>{p.location} • Next: {formatDate(p.nextWatering)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable accessibilityRole="button"
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (activeTab === 'Tasks') setShowAddTaskModal(true);
          else setShowAddPlantModal(true);
        }}
      >
        <LinearGradient colors={GRADIENT_COLORS} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </Pressable>

      {/* Add Plant Modal */}
      <Modal visible={showAddPlantModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddPlantModal(false)}>
        <View style={styles.modalContainer}>
          <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={styles.modalTitle}>Add Plant</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Plant Name *</Text>
            <TextInput accessibilityLabel="e.g. Cherry Tomatoes" style={styles.input} value={pName} onChangeText={setPName} placeholder="e.g. Cherry Tomatoes" />

            <Text style={styles.fieldLabel}>Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {PLANT_EMOJIS.map((em) => (
                <Pressable accessibilityRole="button"
                  key={em}
                  onPress={() => setPEmoji(em)}
                  style={[styles.emojiBtn, pEmoji === em ? styles.emojiBtnActive : null]}
                >
                  <Text style={{ fontSize: 24 }}>{em}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {PLANT_TYPES.map((t) => (
                <Pressable accessibilityRole="button"
                  key={t.value}
                  onPress={() => setPType(t.value)}
                  style={pType === t.value ? styles.pickerItemActive : styles.pickerItem}
                >
                  <Text style={pType === t.value ? styles.pickerTextActive : styles.pickerText}>{t.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Location *</Text>
            <TextInput accessibilityLabel="e.g. Backyard Raised Bed" style={styles.input} value={pLocation} onChangeText={setPLocation} placeholder="e.g. Backyard Raised Bed" />

            <Text style={styles.fieldLabel}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {PLANT_STATUSES.map((s) => (
                <Pressable accessibilityRole="button"
                  key={s.value}
                  onPress={() => setPStatus(s.value)}
                  style={[
                    styles.pickerItem,
                    pStatus === s.value ? { backgroundColor: s.color, borderColor: s.color } : { borderColor: s.color },
                  ]}
                >
                  <Text style={[styles.pickerText, pStatus === s.value ? { color: '#fff' } : { color: s.color }]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Watering Frequency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {WATERING_FREQUENCIES.map((f) => (
                <Pressable accessibilityRole="button"
                  key={f.value}
                  onPress={() => setPWaterFreq(f.value)}
                  style={pWaterFreq === f.value ? styles.pickerItemActive : styles.pickerItem}
                >
                  <Text style={pWaterFreq === f.value ? styles.pickerTextActive : styles.pickerText}>{f.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Sunlight</Text>
            <View style={styles.sunRow}>
              {SUNLIGHT_OPTIONS.map((s) => (
                <Pressable accessibilityRole="button"
                  key={s.value}
                  onPress={() => setPSunlight(s.value)}
                  style={[styles.sunChip, pSunlight === s.value ? styles.sunChipActive : null]}
                >
                  <Text style={[styles.sunChipText, pSunlight === s.value ? styles.sunChipTextActive : null]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Planted Date</Text>
            <TextInput accessibilityLabel="YYYY-MM-DD" style={styles.input} value={pPlantedDate} onChangeText={setPPlantedDate} placeholder="YYYY-MM-DD" />

            <Text style={styles.fieldLabel}>Est. Harvest Date (optional)</Text>
            <TextInput accessibilityLabel="YYYY-MM-DD" style={styles.input} value={pHarvestDate} onChangeText={setPHarvestDate} placeholder="YYYY-MM-DD" />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput accessibilityLabel="Care tips, varieties, etc."
              style={[styles.input, { height: 80 }]}
              value={pNotes}
              onChangeText={setPNotes}
              placeholder="Care tips, varieties, etc."
              multiline
            />

            <Pressable accessibilityRole="button" style={styles.saveBtn} onPress={handleAddPlant}>
              <Text style={styles.saveBtnText}>Add Plant</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.cancelBtn} onPress={() => { resetPlantForm(); setShowAddPlantModal(false); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal visible={showAddTaskModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddTaskModal(false)}>
        <View style={styles.modalContainer}>
          <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={styles.modalTitle}>Add Garden Task</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput accessibilityLabel="e.g. Fertilize tomatoes" style={styles.input} value={tTitle} onChangeText={setTTitle} placeholder="e.g. Fertilize tomatoes" />

            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {TASK_CATEGORIES.map((cat) => (
                <Pressable accessibilityRole="button"
                  key={cat.value}
                  onPress={() => setTCategory(cat.value)}
                  style={tCategory === cat.value ? styles.pickerItemActive : styles.pickerItem}
                >
                  <Ionicons name={cat.icon as any} size={14} color={tCategory === cat.value ? '#fff' : colors.textSecondary} />
                  <Text style={tCategory === cat.value ? styles.pickerTextActive : styles.pickerText}> {cat.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Due Date</Text>
            <TextInput accessibilityLabel="YYYY-MM-DD" style={styles.input} value={tDueDate} onChangeText={setTDueDate} placeholder="YYYY-MM-DD" />

            <Text style={styles.fieldLabel}>Link to Plant (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <Pressable accessibilityRole="button"
                onPress={() => setTPlantId('')}
                style={tPlantId === '' ? styles.pickerItemActive : styles.pickerItem}
              >
                <Text style={tPlantId === '' ? styles.pickerTextActive : styles.pickerText}>None</Text>
              </Pressable>
              {plants.map((p) => (
                <Pressable accessibilityRole="button"
                  key={p.id}
                  onPress={() => setTPlantId(p.id)}
                  style={tPlantId === p.id ? styles.pickerItemActive : styles.pickerItem}
                >
                  <Text style={tPlantId === p.id ? styles.pickerTextActive : styles.pickerText}>
                    {p.emoji} {p.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable accessibilityRole="button" style={styles.saveBtn} onPress={handleAddTask}>
              <Text style={styles.saveBtnText}>Add Task</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.cancelBtn} onPress={() => { resetTaskForm(); setShowAddTaskModal(false); }}>
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
  waterAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 8,
    gap: 6,
  },
  waterAlertText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
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
  tabTextActive: { fontSize: 14, fontWeight: '700', color: '#1B5E20' },
  tabTextInactive: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  body: { flex: 1 },
  locChip: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  locChipText: { fontSize: 13, fontWeight: '600' },
  plantCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    ...shadows.sm,
  },
  plantRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  plantEmoji: { fontSize: 32, flexShrink: 0 },
  plantInfo: { flex: 1 },
  plantNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  plantName: { fontSize: 16, fontWeight: '700', color: colors.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  plantLocation: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  waterNext: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  waterNextOverdue: { color: colors.danger, fontWeight: '600' },
  waterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(27,94,32,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  waterBtnDone: { backgroundColor: 'rgba(39,174,96,0.15)' },
  deletePlantBtn: { position: 'absolute', top: 0, right: 0, width: 40, height: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  taskCardToday: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1B5E20',
    ...shadows.sm,
  },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    ...shadows.sm,
  },
  taskCardDone: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    opacity: 0.55,
  },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  taskTitleDone: { fontSize: 14, color: colors.textMuted, textDecorationLine: 'line-through' },
  taskMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  completeBtn: { padding: 4 },
  weekGrid: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  dayCol: {
    width: 56,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 8,
    gap: 4,
    ...shadows.sm,
  },
  dayColToday: { backgroundColor: '#E8F5E9', borderWidth: 1.5, borderColor: '#1B5E20' },
  dayLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  dayLabelToday: { color: '#1B5E20' },
  dayDate: { fontSize: 16, fontWeight: '700', color: colors.text },
  dayPlantChip: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dayPlantEmoji: { fontSize: 18 },
  dayEmpty: { fontSize: 16, color: colors.border },
  freqLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
  schedPlantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    gap: 12,
    ...shadows.sm,
  },
  schedEmoji: { fontSize: 26 },
  schedPlantName: { fontSize: 14, fontWeight: '600', color: colors.text },
  schedPlantMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...shadows.md,
  },
  fabGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
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
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#1B5E20',
  },
  pickerText: { fontSize: 13, color: colors.textSecondary },
  pickerTextActive: { fontSize: 13, color: '#fff', fontWeight: '700' },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiBtnActive: { borderColor: '#1B5E20', borderWidth: 2.5, backgroundColor: '#E8F5E9' },
  sunRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  sunChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sunChipActive: { backgroundColor: '#1B5E20', borderColor: '#1B5E20' },
  sunChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  sunChipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#1B5E20', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  cancelBtnText: { color: colors.textSecondary, fontSize: 15 },
});
