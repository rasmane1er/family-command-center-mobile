import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, startOfWeek, addDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useShoppingStore } from '../../store/useShoppingStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { MealPlan } from '../../types';
import type { ShopCategory } from '../../store/useShoppingStore';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTabBarInset } from '../../hooks/useTabBarInset';
import { useTranslation } from 'react-i18next';

interface PlannedMeal {
  name: string;
  calories: number;
  prep: number;
  tags: string[];
}

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
const MEAL_TAGS = ['Quick', 'Healthy', 'Kids Fav', 'Family Fav', 'Protein', 'Low-carb', 'Easy', 'Vegetarian'];

const EMPTY_WEEK: Record<string, Record<string, PlannedMeal>> = {
  Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {}, Saturday: {}, Sunday: {},
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function MealPlanningScreen({ navigation }: any) {
  const { t } = useTranslation('ops');
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const [selectedDay, setSelectedDay] = useState('Monday');
  // Starts empty, not with fabricated meals — the mount effect below loads
  // any real saved plan; a first-time user should see a blank week, not
  // fake meals silently written into their real meal-plan store.
  const [weekMeals, setWeekMeals] = useState(EMPTY_WEEK);
  const [addingMeal, setAddingMeal] = useState<{ day: string; type: string } | null>(null);
  const [newMealName, setNewMealName] = useState('');
  const [newMealCals, setNewMealCals] = useState('');
  const [newMealPrep, setNewMealPrep] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { mealPlans, setMealPlan } = useOperationsStore();
  const { addItem } = useShoppingStore();
  const familyId = useFamilyStore((s) => s.family?.id) ?? 'demo-family';

  // Guards the persist effect below from firing with stale initial state
  // before this load effect's setWeekMeals has taken effect — without it,
  // a real stored plan gets overwritten by the initial (empty) state on
  // every mount, since both effects run in the same pass on first render.
  const hydratedRef = useRef(false);

  // Load from store on mount
  useEffect(() => {
    const weekStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekKey = format(weekStartDate, 'yyyy-MM-dd');
    const stored = mealPlans.find((p) => p.weekStart === weekKey);
    if (stored) {
      // Convert store MealPlan format to local format
      const converted: Record<string, Record<string, PlannedMeal>> = {};
      for (const day of DAYS) {
        const dayKey = day.toLowerCase();
        const dayMealsFromStore = (stored.meals as Record<string, Record<string, { name?: string; calories?: number; prepTime?: number; tags?: string[] }>>)[dayKey] ?? {};
        converted[day] = {};
        for (const [mealType, meal] of Object.entries(dayMealsFromStore)) {
          if (meal && typeof meal === 'object' && 'name' in meal && meal.name) {
            const mealTypeCap = mealType.charAt(0).toUpperCase() + mealType.slice(1);
            converted[day][mealTypeCap] = {
              name: String(meal.name ?? ''),
              calories: Number(meal.calories ?? 0),
              prep: Number(meal.prepTime ?? 0),
              tags: Array.isArray(meal.tags) ? meal.tags : [],
            };
          }
        }
      }
      setWeekMeals(converted);
    }
    hydratedRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to store on change
  useEffect(() => {
    if (!hydratedRef.current) return;
    const weekStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekKey = format(weekStartDate, 'yyyy-MM-dd');
    const meals: Record<string, Record<string, { name: string; calories: number; prepTime: number; tags: string[] }>> = {};
    for (const day of DAYS) {
      meals[day.toLowerCase()] = {};
      const dayMeals = weekMeals[day] ?? {};
      for (const [mealType, meal] of Object.entries(dayMeals)) {
        meals[day.toLowerCase()][mealType.toLowerCase()] = {
          name: meal.name,
          calories: meal.calories,
          prepTime: meal.prep,
          tags: meal.tags,
        };
      }
    }
    const existingPlan = mealPlans.find((p) => p.weekStart === weekKey);
    setMealPlan({
      id: existingPlan?.id ?? `mp-${weekKey}`,
      familyId,
      weekStart: weekKey,
      meals: meals as Record<string, { breakfast?: import('../../types').Meal; lunch?: import('../../types').Meal; dinner?: import('../../types').Meal; snack?: import('../../types').Meal }>,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekMeals]);

  const handleGenerateShoppingList = () => {
    const PANTRY_KEYWORDS = ['avocado', 'eggs', 'chicken', 'milk', 'rice', 'pasta', 'olive oil', 'tomato', 'spinach', 'cheese', 'bread', 'beef', 'salmon', 'yogurt', 'banana', 'berries', 'oats', 'butter', 'garlic', 'onion'];
    const allMealNames: string[] = [];
    for (const day of DAYS) {
      for (const meal of Object.values(weekMeals[day] ?? {})) {
        if (meal.name) allMealNames.push(meal.name.toLowerCase());
      }
    }
    if (allMealNames.length === 0) {
      Alert.alert('No Meals', 'Plan some meals first before generating a shopping list.');
      return;
    }
    const needed: string[] = [];
    for (const mealName of allMealNames) {
      for (const keyword of PANTRY_KEYWORDS) {
        if (mealName.includes(keyword) && !needed.includes(keyword)) {
          needed.push(keyword);
        }
      }
    }
    const toAdd = needed.length > 0 ? needed : ['groceries for the week'];
    for (const ingredient of toAdd) {
      addItem({
        name: ingredient.charAt(0).toUpperCase() + ingredient.slice(1),
        category: 'pantry',
        quantity: 1,
        unit: 'ea',
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Shopping List Updated', `Added ${toAdd.length} item(s) to your shopping list.`);
  };

  const weekStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = DAYS.map((d, i) => ({
    name: d,
    short: d.slice(0, 3),
    date: addDays(weekStartDate, i),
    isToday: format(addDays(weekStartDate, i), 'EEEE') === format(new Date(), 'EEEE'),
  }));

  const dayMeals = weekMeals[selectedDay] || {};
  const totalCals = Object.values(dayMeals).reduce((sum, m) => sum + m.calories, 0);

  const openAddMeal = (day: string, type: string) => {
    setAddingMeal({ day, type });
    setNewMealName('');
    setNewMealCals('');
    setNewMealPrep('');
    setSelectedTags([]);
  };

  const handleSaveMeal = () => {
    if (!addingMeal || !newMealName.trim()) return;
    const meal: PlannedMeal = {
      name: newMealName.trim(),
      calories: parseInt(newMealCals, 10) || 0,
      prep: parseInt(newMealPrep, 10) || 0,
      tags: selectedTags,
    };
    setWeekMeals((prev) => ({
      ...prev,
      [addingMeal.day]: {
        ...(prev[addingMeal.day] || {}),
        [addingMeal.type]: meal,
      },
    }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddingMeal(null);
  };

  const handleRemoveMeal = (day: string, type: string) => {
    Alert.alert(t('common.removeTitle'), `Remove this ${type}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setWeekMeals((prev) => {
            const updated = { ...prev[day] };
            delete updated[type];
            return { ...prev, [day]: updated };
          });
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const handleGeneratePlan = () => {
    const suggestions: Record<string, Record<string, PlannedMeal>> = {
      Monday: {
        Breakfast: { name: 'Oatmeal with Berries', calories: 350, prep: 8, tags: ['Healthy', 'Quick'] },
        Lunch: { name: 'Caesar Salad', calories: 400, prep: 10, tags: ['Easy'] },
        Dinner: { name: 'Chicken Stir Fry', calories: 580, prep: 25, tags: ['Protein'] },
      },
      Tuesday: {
        Breakfast: { name: 'Smoothie Bowl', calories: 380, prep: 10, tags: ['Quick', 'Healthy'] },
        Dinner: { name: 'Beef Tacos', calories: 650, prep: 20, tags: ['Family Fav'] },
      },
      Wednesday: {
        Breakfast: { name: 'Eggs & Bacon', calories: 500, prep: 15, tags: ['Protein'] },
        Dinner: { name: 'Baked Salmon & Veggies', calories: 520, prep: 30, tags: ['Healthy'] },
      },
      Thursday: {
        Breakfast: { name: 'Banana Pancakes', calories: 450, prep: 20, tags: ['Kids Fav'] },
        Dinner: { name: 'Pasta Primavera', calories: 580, prep: 25, tags: ['Vegetarian'] },
      },
      Friday: {
        Breakfast: { name: 'French Toast', calories: 480, prep: 15, tags: ['Kids Fav'] },
        Dinner: { name: 'Homemade Pizza', calories: 720, prep: 35, tags: ['Family Fav'] },
      },
      Saturday: {
        Breakfast: { name: 'Pancake Brunch', calories: 520, prep: 25, tags: ['Family Fav', 'Kids Fav'] },
        Dinner: { name: 'BBQ Night', calories: 700, prep: 40, tags: ['Family Fav'] },
      },
      Sunday: {
        Breakfast: { name: 'Sunday Eggs Benedict', calories: 580, prep: 20, tags: ['Family Fav'] },
        Dinner: { name: 'Roast Chicken', calories: 640, prep: 90, tags: ['Family Fav'] },
      },
    };
    setWeekMeals(suggestions);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const weekLabel = `Week of ${format(weekStartDate, 'MMMM d, yyyy')}`;

  const screenHeader = (
    <LinearGradient colors={['#F5A623', '#FF8C42']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('mealPlanning.title')}</Text>
        <Pressable onPress={handleGeneratePlan} style={styles.addBtn}>
          <Ionicons name="sparkles-outline" size={22} color="#fff" />
        </Pressable>
      </View>

      <Text style={styles.weekLabel}>{weekLabel}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
        {weekDays.map((day) => {
          const hasMeals = Object.keys(weekMeals[day.name] || {}).length > 0;
          return (
            <Pressable
              key={day.name}
              onPress={() => setSelectedDay(day.name)}
              style={[styles.dayChip, selectedDay === day.name && styles.dayChipActive]}
            >
              <Text style={[styles.dayShort, selectedDay === day.name && styles.dayShortActive]}>{day.short}</Text>
              <Text style={[styles.dayDate, selectedDay === day.name && styles.dayDateActive]}>{format(day.date, 'd')}</Text>
              {day.isToday && <View style={styles.todayDot} />}
              {hasMeals && <View style={[styles.mealDot, selectedDay === day.name && styles.mealDotActive]} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#F5A623', '#FF8C42']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('mealPlanning.title')}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{totalCals} cal</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: tabBarInset, paddingTop: contentPaddingTop }]}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
          >
        <View style={styles.daySummary}>
          <Text style={styles.daySummaryDay}>{selectedDay}</Text>
          <View style={styles.dayCalories}>
            <Ionicons name="flame" size={16} color={colors.secondary} />
            <Text style={styles.dayCaloriesText}>{totalCals} cal</Text>
          </View>
        </View>

        {MEAL_TYPES.map((mealType) => {
          const meal = dayMeals[mealType];
          return (
            <View key={mealType} style={styles.mealSection}>
              <View style={styles.mealTypeHeader}>
                <Ionicons
                  name={mealType === 'Breakfast' ? 'sunny-outline' : mealType === 'Lunch' ? 'partly-sunny-outline' : mealType === 'Dinner' ? 'moon-outline' : 'cafe-outline'}
                  size={18}
                  color={colors.secondary}
                />
                <Text style={styles.mealType}>{mealType}</Text>
              </View>
              {meal ? (
                <Card style={styles.mealCard} variant="elevated">
                  <View style={styles.mealRow}>
                    <View style={styles.mealContent}>
                      <Text style={styles.mealName}>{meal.name}</Text>
                      <View style={styles.mealMeta}>
                        <Ionicons name="flame-outline" size={13} color={colors.textMuted} />
                        <Text style={styles.mealMetaText}>{meal.calories} cal</Text>
                        {meal.prep > 0 && <>
                          <Ionicons name="time-outline" size={13} color={colors.textMuted} style={{ marginLeft: 8 }} />
                          <Text style={styles.mealMetaText}>{meal.prep} min</Text>
                        </>}
                      </View>
                      {meal.tags.length > 0 && (
                        <View style={styles.mealTags}>
                          {meal.tags.map((tag) => (
                            <View key={tag} style={styles.mealTag}>
                              <Text style={styles.mealTagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <View style={styles.mealActions}>
                      <Pressable onPress={() => openAddMeal(selectedDay, mealType)} style={styles.mealSwap}>
                        <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => handleRemoveMeal(selectedDay, mealType)} style={styles.mealRemove}>
                        <Ionicons name="close" size={16} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                </Card>
              ) : (
                <Pressable onPress={() => openAddMeal(selectedDay, mealType)} style={styles.addMealBtn}>
                  <Ionicons name="add-circle-outline" size={20} color={colors.secondary} />
                  <Text style={styles.addMealText}>Plan {mealType}</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        <Card style={styles.aiCard} padding={16}>
          <View style={styles.aiRow}>
            <Ionicons name="sparkles" size={22} color={colors.secondary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.aiTitle}>AI Meal Suggestion</Text>
              <Text style={styles.aiText}>Based on your pantry, I can generate a balanced weekly meal plan. Tap the ✨ button to auto-fill the whole week!</Text>
            </View>
          </View>
          <Pressable onPress={handleGeneratePlan} style={styles.aiGenerateBtn}>
            <Ionicons name="flash" size={16} color="#fff" />
            <Text style={styles.aiGenerateText}>Generate Weekly Plan</Text>
          </Pressable>
          <Pressable onPress={handleGenerateShoppingList} style={styles.shoppingListBtn}>
            <Ionicons name="cart-outline" size={16} color={colors.secondary} />
            <Text style={styles.shoppingListBtnText}>Generate Shopping List</Text>
          </Pressable>
        </Card>
          </ScrollView>
        )}
      </CollapsibleHeader>

      <Modal visible={!!addingMeal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddingMeal(null)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Plan {addingMeal?.type}</Text>
          <Text style={styles.modalSubtitle}>{addingMeal?.day}</Text>

          <Text style={styles.modalLabel}>Meal Name *</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. Grilled Chicken Salad"
            value={newMealName}
            onChangeText={setNewMealName}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>Calories</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. 450" value={newMealCals} onChangeText={setNewMealCals} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.modalLabel}>Prep (min)</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. 20" value={newMealPrep} onChangeText={setNewMealPrep} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
            </View>
          </View>

          <Text style={styles.modalLabel}>Tags</Text>
          <View style={styles.tagsGrid}>
            {MEAL_TAGS.map((tag) => (
              <Pressable key={tag} onPress={() => toggleTag(tag)} style={[styles.tagChip, selectedTags.includes(tag) && styles.tagChipActive]}>
                <Text style={[styles.tagChipText, selectedTags.includes(tag) && styles.tagChipTextActive]}>{tag}</Text>
              </Pressable>
            ))}
          </View>

          <Button title="Save Meal" onPress={handleSaveMeal} fullWidth size="lg" disabled={!newMealName.trim()} style={{ marginTop: 8 }} />
          <Button title="Cancel" onPress={() => setAddingMeal(null)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  weekLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  dayScroll: {},
  dayChip: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.15)', minWidth: 52 },
  dayChipActive: { backgroundColor: '#fff' },
  dayShort: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  dayShortActive: { color: colors.secondary },
  dayDate: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2 },
  dayDateActive: { color: colors.primary },
  todayDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.secondary, marginTop: 3 },
  mealDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.5)', marginTop: 3 },
  mealDotActive: { backgroundColor: colors.success },
  content: { padding: 16 },
  daySummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  daySummaryDay: { fontSize: 18, fontWeight: '800', color: colors.text },
  dayCalories: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3E2', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  dayCaloriesText: { fontSize: 14, fontWeight: '700', color: colors.secondary },
  mealSection: { marginBottom: 16 },
  mealTypeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  mealType: { fontSize: 14, fontWeight: '700', color: colors.text },
  mealCard: { borderRadius: 14 },
  mealRow: { flexDirection: 'row', alignItems: 'flex-start' },
  mealContent: { flex: 1 },
  mealName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  mealMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  mealMetaText: { fontSize: 12, color: colors.textSecondary },
  mealTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  mealTag: { backgroundColor: '#FEF3E2', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8 },
  mealTagText: { fontSize: 11, color: '#B85C00', fontWeight: '600' },
  mealActions: { gap: 6 },
  mealSwap: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#E8EEF9', alignItems: 'center', justifyContent: 'center' },
  mealRemove: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  addMealBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', padding: 14 },
  addMealText: { fontSize: 14, color: colors.secondary, fontWeight: '600' },
  aiCard: { backgroundColor: '#FEF3E2', borderRadius: 16, marginTop: 8 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  aiTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 5 },
  aiText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  aiGenerateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.secondary, borderRadius: 12, paddingVertical: 12 },
  aiGenerateText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  shoppingListBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12, marginTop: 8, borderWidth: 1.5, borderColor: colors.secondary, backgroundColor: 'transparent' },
  shoppingListBtnText: { fontSize: 14, fontWeight: '700', color: colors.secondary },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 2 },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  rowInputs: { flexDirection: 'row' },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tagChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  tagChipActive: { backgroundColor: '#FEF3E2', borderColor: colors.secondary },
  tagChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tagChipTextActive: { color: colors.secondary },
});
