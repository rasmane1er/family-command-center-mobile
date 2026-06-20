import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, startOfWeek, addDays } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const SAMPLE_MEALS: Record<string, Record<string, { name: string; calories: number; prep: number; tags: string[] }>> = {
  Monday: {
    Breakfast: { name: 'Avocado Toast & Eggs', calories: 420, prep: 10, tags: ['Quick', 'Protein'] },
    Lunch: { name: 'Grilled Chicken Salad', calories: 380, prep: 15, tags: ['Healthy', 'Low-carb'] },
    Dinner: { name: 'Spaghetti Bolognese', calories: 650, prep: 30, tags: ['Family Fav'] },
  },
  Tuesday: {
    Breakfast: { name: 'Greek Yogurt Parfait', calories: 320, prep: 5, tags: ['Quick'] },
    Lunch: { name: 'Turkey Sandwich', calories: 420, prep: 10, tags: ['Easy'] },
    Dinner: { name: 'Stir-Fry Chicken & Rice', calories: 580, prep: 25, tags: ['Asian'] },
  },
  Wednesday: {
    Breakfast: { name: 'Pancakes', calories: 480, prep: 20, tags: ['Kids Fav'] },
    Dinner: { name: 'Grilled Salmon', calories: 540, prep: 20, tags: ['Omega-3', 'Healthy'] },
  },
  Thursday: {
    Dinner: { name: 'Taco Night', calories: 620, prep: 25, tags: ['Family Fav', 'Tex-Mex'] },
  },
  Friday: {
    Dinner: { name: 'Pizza Night', calories: 780, prep: 5, tags: ['Family Fav', 'Fun'] },
  },
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function MealPlanningScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [selectedDay, setSelectedDay] = useState('Monday');

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = DAYS.map((d, i) => ({
    name: d,
    short: d.slice(0, 3),
    date: addDays(weekStart, i),
    isToday: format(addDays(weekStart, i), 'EEEE') === format(new Date(), 'EEEE'),
  }));

  const dayMeals = SAMPLE_MEALS[selectedDay] || {};
  const totalCals = Object.values(dayMeals).reduce((sum, m) => sum + m.calories, 0);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#F5A623', '#FF8C42']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Meal Planning</Text>
          <Pressable style={styles.addBtn}><Ionicons name="sparkles-outline" size={22} color="#fff" /></Pressable>
        </View>

        <Text style={styles.weekLabel}>Week of {format(weekStart, 'MMMM d, yyyy')}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
          {weekDays.map((day) => (
            <Pressable
              key={day.name}
              onPress={() => setSelectedDay(day.name)}
              style={[styles.dayChip, selectedDay === day.name && styles.dayChipActive]}
            >
              <Text style={[styles.dayShort, selectedDay === day.name && styles.dayShortActive]}>{day.short}</Text>
              <Text style={[styles.dayDate, selectedDay === day.name && styles.dayDateActive]}>{format(day.date, 'd')}</Text>
              {day.isToday && <View style={styles.todayDot} />}
              {SAMPLE_MEALS[day.name] && Object.keys(SAMPLE_MEALS[day.name]).length > 0 && (
                <View style={[styles.mealDot, selectedDay === day.name && styles.mealDotActive]} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {/* Day summary */}
        <View style={styles.daySummary}>
          <Text style={styles.daySummaryDay}>{selectedDay}</Text>
          <View style={styles.dayCalories}>
            <Ionicons name="flame" size={16} color={colors.secondary} />
            <Text style={styles.dayCaloriesText}>{totalCals} calories</Text>
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
                        <Ionicons name="time-outline" size={13} color={colors.textMuted} style={{ marginLeft: 8 }} />
                        <Text style={styles.mealMetaText}>{meal.prep} min</Text>
                      </View>
                      <View style={styles.mealTags}>
                        {meal.tags.map((tag) => (
                          <View key={tag} style={styles.mealTag}>
                            <Text style={styles.mealTagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <Pressable style={styles.mealSwap}>
                      <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                    </Pressable>
                  </View>
                </Card>
              ) : (
                <Pressable style={styles.addMealBtn}>
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
              <Text style={styles.aiText}>Based on your pantry (chicken breast expiring soon), I suggest Chicken Pasta for tonight's dinner. Tap to generate full plan!</Text>
            </View>
          </View>
          <Pressable style={styles.aiGenerateBtn}>
            <Ionicons name="flash" size={16} color="#fff" />
            <Text style={styles.aiGenerateText}>Generate Weekly Plan</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
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
  daySummaryDay: { fontSize: 22, fontWeight: '800', color: colors.text },
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
  mealSwap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8EEF9', alignItems: 'center', justifyContent: 'center' },
  addMealBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', padding: 14 },
  addMealText: { fontSize: 14, color: colors.secondary, fontWeight: '600' },
  aiCard: { backgroundColor: '#FEF3E2', borderRadius: 16, marginTop: 8 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  aiTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 5 },
  aiText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  aiGenerateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.secondary, borderRadius: 12, paddingVertical: 12 },
  aiGenerateText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
