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
import { useNutritionStore, MealType, NutritionGoal } from '../../store/useNutritionStore';

const MEAL_CONFIG: Record<MealType, { icon: string; color: string; label: string }> = {
  breakfast: { icon: 'sunny', color: '#F5A623', label: 'Breakfast' },
  lunch:     { icon: 'partly-sunny', color: '#27AE60', label: 'Lunch' },
  dinner:    { icon: 'moon', color: '#2980B9', label: 'Dinner' },
  snack:     { icon: 'cafe', color: '#8E44AD', label: 'Snack' },
};
const MEAL_TYPES = Object.keys(MEAL_CONFIG) as MealType[];

const MACRO_COLORS = {
  calories: '#27AE60',
  protein:  '#2980B9',
  carbs:    '#F5A623',
  fat:      '#E74C3C',
};

const MEMBERS = [
  { id: 'member-1', name: 'Dad',  color: '#2980B9' },
  { id: 'member-2', name: 'Mom',  color: '#8E44AD' },
  { id: 'member-3', name: 'Emma', color: '#27AE60' },
  { id: 'member-4', name: 'Liam', color: '#F5A623' },
];

function formatDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (isoDate === today.toISOString().split('T')[0]) return 'Today';
  if (isoDate === yesterday.toISOString().split('T')[0]) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function MacroPill({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={[styles.macroPill, { backgroundColor: color + '20', borderColor: color + '40' }]}>
      <Text style={[styles.macroPillValue, { color }]}>{value}g</Text>
      <Text style={[styles.macroPillLabel, { color }]}>{label}</Text>
    </View>
  );
}

function MacroBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={styles.macroBarTrack}>
      <View style={[styles.macroBarFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}

export function NutritionTrackerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { entries, goals, addEntry, removeEntry, setGoal, getEntriesForDay, getDayTotals } = useNutritionStore();

  const [activeTab, setActiveTab] = useState<'today' | 'members' | 'goals'>('today');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMemberId, setSelectedMemberId] = useState('member-1');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Food modal state
  const [mFoodName, setMFoodName] = useState('');
  const [mCalories, setMCalories] = useState('');
  const [mProtein, setMProtein] = useState('');
  const [mCarbs, setMCarbs] = useState('');
  const [mFat, setMFat] = useState('');
  const [mMeal, setMMeal] = useState<MealType>('breakfast');
  const [mServing, setMServing] = useState('');
  const [mNotes, setMNotes] = useState('');
  const [mMemberId, setMMemberId] = useState('member-1');

  // Edit Goal modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [gMemberId, setGMemberId] = useState('member-1');
  const [gCalories, setGCalories] = useState('');
  const [gProtein, setGProtein] = useState('');
  const [gCarbs, setGCarbs] = useState('');
  const [gFat, setGFat] = useState('');

  const selectedMember = MEMBERS.find((m) => m.id === selectedMemberId) ?? MEMBERS[0];
  const dayEntries = getEntriesForDay(selectedMemberId, selectedDate);
  const dayTotals = getDayTotals(selectedMemberId, selectedDate);
  const currentGoal = goals.find((g) => g.memberId === selectedMemberId);

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const openAddModal = () => {
    setMFoodName(''); setMCalories(''); setMProtein(''); setMCarbs(''); setMFat('');
    setMServing(''); setMNotes(''); setMMeal('breakfast'); setMMemberId(selectedMemberId);
    setShowAddModal(true);
  };

  const handleAddEntry = () => {
    if (!mFoodName.trim()) { Alert.alert('Missing Info', 'Please enter a food name.'); return; }
    const cal = parseInt(mCalories);
    if (!cal || cal <= 0) { Alert.alert('Missing Info', 'Please enter valid calories.'); return; }
    const mem = MEMBERS.find((m) => m.id === mMemberId)!;
    addEntry({
      memberId: mMemberId,
      memberName: mem.name,
      date: selectedDate,
      meal: mMeal,
      foodName: mFoodName.trim(),
      calories: cal,
      protein: parseFloat(mProtein) || 0,
      carbs: parseFloat(mCarbs) || 0,
      fat: parseFloat(mFat) || 0,
      servingSize: mServing.trim(),
      notes: mNotes.trim(),
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddModal(false);
  };

  const openGoalModal = (memberId: string) => {
    const g = goals.find((x) => x.memberId === memberId);
    setGMemberId(memberId);
    setGCalories(g ? String(g.dailyCalories) : '');
    setGProtein(g ? String(g.dailyProtein) : '');
    setGCarbs(g ? String(g.dailyCarbs) : '');
    setGFat(g ? String(g.dailyFat) : '');
    setShowGoalModal(true);
  };

  const handleSaveGoal = () => {
    const mem = MEMBERS.find((m) => m.id === gMemberId)!;
    setGoal({
      memberId: gMemberId,
      memberName: mem.name,
      dailyCalories: parseInt(gCalories) || 2000,
      dailyProtein: parseInt(gProtein) || 150,
      dailyCarbs: parseInt(gCarbs) || 200,
      dailyFat: parseInt(gFat) || 65,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowGoalModal(false);
  };

  const entriesByMeal = MEAL_TYPES.reduce<Record<MealType, typeof dayEntries>>((acc, meal) => {
    acc[meal] = dayEntries.filter((e) => e.meal === meal);
    return acc;
  }, { breakfast: [], lunch: [], dinner: [], snack: [] });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name={'arrow-back' as any} size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Nutrition Tracker</Text>
          <Text style={styles.headerSubtitle}>Daily food & macro diary</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['today', 'members', 'goals'] as const).map((tab) => (
          <Pressable accessibilityRole="button"
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* TODAY TAB */}
        {activeTab === 'today' && (
          <>
            {/* Date selector */}
            <View style={styles.dateSelectorRow}>
              <Pressable accessibilityRole="button" onPress={() => shiftDate(-1)} style={styles.dateArrow}>
                <Ionicons name={'chevron-back' as any} size={22} color={colors.text} />
              </Pressable>
              <Text style={styles.dateLabel}>{formatDate(selectedDate)}</Text>
              <Pressable accessibilityRole="button" onPress={() => shiftDate(1)} style={styles.dateArrow}>
                <Ionicons name={'chevron-forward' as any} size={22} color={colors.text} />
              </Pressable>
            </View>

            {/* Member picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll} contentContainerStyle={styles.memberScrollContent}>
              {MEMBERS.map((m) => (
                <Pressable accessibilityRole="button"
                  key={m.id}
                  style={[styles.memberChip, selectedMemberId === m.id && { backgroundColor: m.color, borderColor: m.color }]}
                  onPress={() => setSelectedMemberId(m.id)}
                >
                  <Text style={[styles.memberChipText, selectedMemberId === m.id && { color: '#fff' }]}>{m.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Macro summary */}
            <View style={[styles.summaryCard, shadows.sm]}>
              <View style={styles.summaryRow}>
                <View style={styles.calorieBlock}>
                  <Text style={[styles.calorieValue, { color: MACRO_COLORS.calories }]}>{dayTotals.calories}</Text>
                  <Text style={styles.calorieLabel}>kcal</Text>
                  {currentGoal && (
                    <Text style={styles.calorieGoal}>/ {currentGoal.dailyCalories} goal</Text>
                  )}
                </View>
                <View style={styles.macroRow}>
                  <MacroPill label="Protein" value={dayTotals.protein} unit="g" color={MACRO_COLORS.protein} />
                  <MacroPill label="Carbs" value={dayTotals.carbs} unit="g" color={MACRO_COLORS.carbs} />
                  <MacroPill label="Fat" value={dayTotals.fat} unit="g" color={MACRO_COLORS.fat} />
                </View>
              </View>
              {currentGoal && (
                <View style={styles.calBarWrapper}>
                  <MacroBar value={dayTotals.calories} max={currentGoal.dailyCalories} color={MACRO_COLORS.calories} />
                  <Text style={styles.calBarLabel}>
                    {Math.max(0, currentGoal.dailyCalories - dayTotals.calories)} kcal remaining
                  </Text>
                </View>
              )}
            </View>

            {/* Meal groups */}
            {MEAL_TYPES.map((meal) => {
              const mealEntries = entriesByMeal[meal];
              const cfg = MEAL_CONFIG[meal];
              return (
                <View key={meal} style={styles.mealSection}>
                  <View style={styles.mealHeader}>
                    <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                    <Text style={styles.mealTitle}>{cfg.label}</Text>
                    <Text style={[styles.mealCal, { color: cfg.color }]}>
                      {mealEntries.reduce((s, e) => s + e.calories, 0)} kcal
                    </Text>
                  </View>
                  {mealEntries.length === 0 ? (
                    <Text style={styles.emptyMealText}>No {cfg.label.toLowerCase()} logged</Text>
                  ) : (
                    mealEntries.map((entry) => (
                      <View key={entry.id} style={[styles.entryCard, shadows.sm]}>
                        <View style={styles.entryRow}>
                          <View style={styles.entryInfo}>
                            <Text style={styles.entryName}>{entry.foodName}</Text>
                            {entry.servingSize ? (
                              <Text style={styles.entryServing}>{entry.servingSize}</Text>
                            ) : null}
                          </View>
                          <View style={styles.entryMacros}>
                            <Text style={[styles.entryCal, { color: MACRO_COLORS.calories }]}>{entry.calories} kcal</Text>
                            <Text style={styles.entryMacroDetail}>
                              P:{entry.protein}g C:{entry.carbs}g F:{entry.fat}g
                            </Text>
                          </View>
                          <Pressable accessibilityRole="button" onPress={() => removeEntry(entry.id)} style={styles.deleteBtn}>
                            <Ionicons name={'trash-outline' as any} size={18} color={colors.textMuted} />
                          </Pressable>
                        </View>
                        {entry.notes ? <Text style={styles.entryNotes}>{entry.notes}</Text> : null}
                      </View>
                    ))
                  )}
                </View>
              );
            })}
            <View style={{ height: 120 }} />
          </>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <>
            <Text style={styles.sectionHeader}>Today's Calorie Intake</Text>
            {MEMBERS.map((m) => {
              const todayDate = new Date().toISOString().split('T')[0];
              const totals = getDayTotals(m.id, todayDate);
              const goal = goals.find((g) => g.memberId === m.id);
              const pct = goal && goal.dailyCalories > 0 ? Math.min(totals.calories / goal.dailyCalories, 1) : 0;
              return (
                <View key={m.id} style={[styles.memberCard, shadows.sm]}>
                  <View style={styles.memberCardHeader}>
                    <View style={[styles.memberAvatar, { backgroundColor: m.color }]}>
                      <Text style={styles.memberAvatarText}>{m.name[0]}</Text>
                    </View>
                    <View style={styles.memberCardInfo}>
                      <Text style={styles.memberCardName}>{m.name}</Text>
                      <Text style={styles.memberCardSub}>
                        {totals.calories} {goal ? `/ ${goal.dailyCalories} kcal` : 'kcal'}
                      </Text>
                    </View>
                    <Text style={[styles.memberPct, { color: m.color }]}>{Math.round(pct * 100)}%</Text>
                  </View>
                  <View style={styles.macroBarTrack}>
                    <View style={[styles.macroBarFill, { width: `${pct * 100}%` as any, backgroundColor: m.color }]} />
                  </View>
                  <View style={styles.memberMacroRow}>
                    <Text style={styles.memberMacroItem}>P: {totals.protein}g</Text>
                    <Text style={styles.memberMacroItem}>C: {totals.carbs}g</Text>
                    <Text style={styles.memberMacroItem}>F: {totals.fat}g</Text>
                  </View>
                </View>
              );
            })}
            <View style={{ height: 40 }} />
          </>
        )}

        {/* GOALS TAB */}
        {activeTab === 'goals' && (
          <>
            <Text style={styles.sectionHeader}>Daily Macro Goals</Text>
            {MEMBERS.map((m) => {
              const goal = goals.find((g) => g.memberId === m.id);
              return (
                <View key={m.id} style={[styles.goalCard, shadows.sm]}>
                  <View style={styles.goalCardHeader}>
                    <View style={[styles.memberAvatar, { backgroundColor: m.color }]}>
                      <Text style={styles.memberAvatarText}>{m.name[0]}</Text>
                    </View>
                    <Text style={styles.goalCardName}>{m.name}</Text>
                    <Pressable accessibilityRole="button"
                      style={[styles.editGoalBtn, { backgroundColor: m.color }]}
                      onPress={() => openGoalModal(m.id)}
                    >
                      <Ionicons name={'pencil' as any} size={14} color="#fff" />
                      <Text style={styles.editGoalBtnText}>Edit</Text>
                    </Pressable>
                  </View>
                  {goal ? (
                    <View style={styles.goalMacros}>
                      <View style={styles.goalMacroItem}>
                        <Text style={[styles.goalMacroValue, { color: MACRO_COLORS.calories }]}>{goal.dailyCalories}</Text>
                        <Text style={styles.goalMacroLabel}>kcal/day</Text>
                      </View>
                      <View style={styles.goalMacroItem}>
                        <Text style={[styles.goalMacroValue, { color: MACRO_COLORS.protein }]}>{goal.dailyProtein}g</Text>
                        <Text style={styles.goalMacroLabel}>Protein</Text>
                      </View>
                      <View style={styles.goalMacroItem}>
                        <Text style={[styles.goalMacroValue, { color: MACRO_COLORS.carbs }]}>{goal.dailyCarbs}g</Text>
                        <Text style={styles.goalMacroLabel}>Carbs</Text>
                      </View>
                      <View style={styles.goalMacroItem}>
                        <Text style={[styles.goalMacroValue, { color: MACRO_COLORS.fat }]}>{goal.dailyFat}g</Text>
                        <Text style={styles.goalMacroLabel}>Fat</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.noGoalText}>No goal set. Tap Edit to add one.</Text>
                  )}
                </View>
              );
            })}
            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {/* FAB */}
      {activeTab === 'today' && (
        <Pressable accessibilityRole="button" style={styles.fab} onPress={openAddModal}>
          <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.fabGradient}>
            <Ionicons name={'add' as any} size={32} color="#fff" />
          </LinearGradient>
        </Pressable>
      )}

      {/* Add Food Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Food</Text>
              <Pressable accessibilityRole="button" onPress={() => setShowAddModal(false)}>
                <Ionicons name={'close' as any} size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

              <Text style={styles.fieldLabel}>Member</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {MEMBERS.map((m) => (
                  <Pressable accessibilityRole="button"
                    key={m.id}
                    style={[styles.chipBtn, mMemberId === m.id && { backgroundColor: m.color, borderColor: m.color }]}
                    onPress={() => setMMemberId(m.id)}
                  >
                    <Text style={[styles.chipBtnText, mMemberId === m.id && { color: '#fff' }]}>{m.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Meal</Text>
              <View style={styles.chipRow}>
                {MEAL_TYPES.map((meal) => {
                  const cfg = MEAL_CONFIG[meal];
                  return (
                    <Pressable accessibilityRole="button"
                      key={meal}
                      style={[styles.chipBtn, mMeal === meal && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                      onPress={() => setMMeal(meal)}
                    >
                      <Text style={[styles.chipBtnText, mMeal === meal && { color: '#fff' }]}>{cfg.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Food Name *</Text>
              <TextInput accessibilityLabel="e.g. Grilled chicken breast"
                style={styles.textInput}
                value={mFoodName}
                onChangeText={setMFoodName}
                placeholder="e.g. Grilled chicken breast"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Serving Size</Text>
              <TextInput accessibilityLabel="e.g. 1 cup, 200g"
                style={styles.textInput}
                value={mServing}
                onChangeText={setMServing}
                placeholder="e.g. 1 cup, 200g"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Calories *</Text>
              <TextInput accessibilityLabel="kcal"
                style={styles.textInput}
                value={mCalories}
                onChangeText={setMCalories}
                placeholder="kcal"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />

              <View style={styles.macroInputRow}>
                <View style={styles.macroInputItem}>
                  <Text style={[styles.fieldLabel, { color: MACRO_COLORS.protein }]}>Protein (g)</Text>
                  <TextInput accessibilityLabel="0" style={styles.textInput} value={mProtein} onChangeText={setMProtein} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
                <View style={styles.macroInputItem}>
                  <Text style={[styles.fieldLabel, { color: MACRO_COLORS.carbs }]}>Carbs (g)</Text>
                  <TextInput accessibilityLabel="0" style={styles.textInput} value={mCarbs} onChangeText={setMCarbs} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
                <View style={styles.macroInputItem}>
                  <Text style={[styles.fieldLabel, { color: MACRO_COLORS.fat }]}>Fat (g)</Text>
                  <TextInput accessibilityLabel="0" style={styles.textInput} value={mFat} onChangeText={setMFat} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput accessibilityLabel="Optional notes..."
                style={[styles.textInput, styles.textInputMultiline]}
                value={mNotes}
                onChangeText={setMNotes}
                placeholder="Optional notes..."
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <Pressable accessibilityRole="button" style={styles.saveBtn} onPress={handleAddEntry}>
                <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.saveBtnGradient}>
                  <Ionicons name={'checkmark-circle' as any} size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Add Food Entry</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Goal Modal */}
      <Modal visible={showGoalModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGoalModal(false)}>
        <View style={styles.modalContainer}>
          <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Daily Goals</Text>
            <Pressable accessibilityRole="button" onPress={() => setShowGoalModal(false)}>
              <Ionicons name={'close' as any} size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Member</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {MEMBERS.map((m) => (
                <Pressable accessibilityRole="button"
                  key={m.id}
                  style={[styles.chipBtn, gMemberId === m.id && { backgroundColor: m.color, borderColor: m.color }]}
                  onPress={() => setGMemberId(m.id)}
                >
                  <Text style={[styles.chipBtnText, gMemberId === m.id && { color: '#fff' }]}>{m.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[styles.fieldLabel, { color: MACRO_COLORS.calories }]}>Daily Calories (kcal)</Text>
            <TextInput accessibilityLabel="2000" style={styles.textInput} value={gCalories} onChangeText={setGCalories} placeholder="2000" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
            <Text style={[styles.fieldLabel, { color: MACRO_COLORS.protein }]}>Daily Protein (g)</Text>
            <TextInput accessibilityLabel="150" style={styles.textInput} value={gProtein} onChangeText={setGProtein} placeholder="150" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
            <Text style={[styles.fieldLabel, { color: MACRO_COLORS.carbs }]}>Daily Carbs (g)</Text>
            <TextInput accessibilityLabel="200" style={styles.textInput} value={gCarbs} onChangeText={setGCarbs} placeholder="200" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
            <Text style={[styles.fieldLabel, { color: MACRO_COLORS.fat }]}>Daily Fat (g)</Text>
            <TextInput accessibilityLabel="65" style={styles.textInput} value={gFat} onChangeText={setGFat} placeholder="65" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
            <Pressable accessibilityRole="button" style={styles.saveBtn} onPress={handleSaveGoal}>
              <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.saveBtnGradient}>
                <Ionicons name={'checkmark-circle' as any} size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Goals</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 12,
    padding: 4,
    ...shadows.sm,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#2E7D32' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabLabelActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12,
  },
  dateArrow: { padding: 8 },
  dateLabel: { fontSize: 18, fontWeight: '700', color: colors.text, minWidth: 100, textAlign: 'center' },
  memberScroll: { marginBottom: 12 },
  memberScrollContent: { gap: 8, paddingRight: 8 },
  memberChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  memberChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  calorieBlock: { alignItems: 'center', minWidth: 70 },
  calorieValue: { fontSize: 32, fontWeight: '800' },
  calorieLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  calorieGoal: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  macroRow: { flex: 1, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  macroPill: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  macroPillValue: { fontSize: 14, fontWeight: '700' },
  macroPillLabel: { fontSize: 10, fontWeight: '600' },
  calBarWrapper: { gap: 6 },
  macroBarTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroBarFill: { height: '100%', borderRadius: 4 },
  calBarLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'right' },
  mealSection: { marginBottom: 16 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  mealTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  mealCal: { fontSize: 13, fontWeight: '600' },
  emptyMealText: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', paddingLeft: 4 },
  entryCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryInfo: { flex: 1 },
  entryName: { fontSize: 14, fontWeight: '600', color: colors.text },
  entryServing: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  entryMacros: { alignItems: 'flex-end' },
  entryCal: { fontSize: 14, fontWeight: '700' },
  entryMacroDetail: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: 4 },
  entryNotes: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 6 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12, marginTop: 4 },
  memberCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  memberCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  memberCardInfo: { flex: 1 },
  memberCardName: { fontSize: 15, fontWeight: '700', color: colors.text },
  memberCardSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  memberPct: { fontSize: 18, fontWeight: '800' },
  memberMacroRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  memberMacroItem: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  goalCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  goalCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  goalCardName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  editGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editGoalBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  goalMacros: { flexDirection: 'row', justifyContent: 'space-around' },
  goalMacroItem: { alignItems: 'center' },
  goalMacroValue: { fontSize: 20, fontWeight: '800' },
  goalMacroLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  noGoalText: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
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
  modalContainer: { flex: 1, backgroundColor: colors.background, paddingTop: 12 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalScroll: { flex: 1 },
  modalContent: { padding: 20, paddingBottom: 60 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginRight: 8,
    marginBottom: 4,
  },
  chipBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  textInputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  macroInputRow: { flexDirection: 'row', gap: 8 },
  macroInputItem: { flex: 1 },
  saveBtn: { marginTop: 24, borderRadius: 14, overflow: 'hidden' },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
