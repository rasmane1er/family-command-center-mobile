import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useWellnessStore } from '../../store/useWellnessStore';

export function WeightGoalScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const activeMember = members.find((m) => m.id === activeMemberId);

  const {
    entries, weightGoalLbs, isLoading, error,
    suggestions, isSuggesting, suggestionError,
    loadWeightData, logWeight, setGoal, generateMealSuggestions, clearSuggestions,
  } = useWellnessStore();

  const [weightInput, setWeightInput] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);

  useEffect(() => {
    if (activeMemberId) loadWeightData(activeMemberId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMemberId]);

  useEffect(() => {
    if (weightGoalLbs != null) setGoalInput(String(weightGoalLbs));
  }, [weightGoalLbs]);

  const handleLogWeight = async () => {
    const lbs = parseFloat(weightInput);
    if (!activeMemberId || isNaN(lbs) || lbs <= 0) return;
    try {
      await logWeight(activeMemberId, lbs);
      setWeightInput('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // error already surfaced via the store's `error` field
    }
  };

  const handleSaveGoal = async () => {
    if (!activeMemberId) return;
    const lbs = goalInput.trim() === '' ? null : parseFloat(goalInput);
    if (lbs !== null && (isNaN(lbs) || lbs <= 0)) return;
    try {
      await setGoal(activeMemberId, lbs);
      setEditingGoal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // error already surfaced via the store's `error` field
    }
  };

  const handleGetSuggestions = () => {
    if (!activeMemberId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generateMealSuggestions(activeMemberId);
  };

  const latest = entries[0];

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Weight Goals</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.disclaimer}>
          General healthy-eating support for {activeMember?.name ?? 'you'} — not medical advice. Available to adults only.
        </Text>

        {error && <Text style={s.errorText}>{error}</Text>}

        {/* Goal */}
        <View style={[s.card, shadows.card]}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardTitle}>Your Goal Weight</Text>
            {!editingGoal && (
              <Pressable accessibilityRole="button" onPress={() => setEditingGoal(true)}>
                <Ionicons name="pencil" size={16} color={colors.primary} />
              </Pressable>
            )}
          </View>
          {editingGoal ? (
            <View style={s.inputRow}>
              <TextInput
                accessibilityLabel="Goal weight in pounds"
                style={s.input}
                keyboardType="decimal-pad"
                placeholder="e.g. 170"
                placeholderTextColor={colors.textMuted}
                value={goalInput}
                onChangeText={setGoalInput}
              />
              <Text style={s.unit}>lbs</Text>
              <Pressable accessibilityRole="button" onPress={handleSaveGoal} style={s.saveBtn}>
                <Text style={s.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={s.goalValue}>{weightGoalLbs != null ? `${weightGoalLbs} lbs` : 'Not set yet'}</Text>
          )}
        </View>

        {/* Log weight */}
        <View style={[s.card, shadows.card]}>
          <Text style={s.cardTitle}>Log Today's Weight</Text>
          <View style={s.inputRow}>
            <TextInput
              accessibilityLabel="Weight in pounds"
              style={s.input}
              keyboardType="decimal-pad"
              placeholder="e.g. 182.5"
              placeholderTextColor={colors.textMuted}
              value={weightInput}
              onChangeText={setWeightInput}
            />
            <Text style={s.unit}>lbs</Text>
            <Pressable accessibilityRole="button" onPress={handleLogWeight} style={s.saveBtn} disabled={!weightInput.trim()}>
              <Text style={s.saveBtnText}>Log</Text>
            </Pressable>
          </View>
          {latest && <Text style={s.latestText}>Last logged: {latest.weightLbs} lbs on {latest.date}</Text>}
        </View>

        {/* History */}
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
        ) : entries.length > 0 && (
          <View style={[s.card, shadows.card]}>
            <Text style={s.cardTitle}>Recent History</Text>
            {entries.slice(0, 10).map((e) => (
              <View key={e.id} style={s.historyRow}>
                <Text style={s.historyDate}>{e.date}</Text>
                <Text style={s.historyWeight}>{e.weightLbs} lbs</Text>
              </View>
            ))}
          </View>
        )}

        {/* Meal suggestions */}
        <View style={[s.card, s.mealCard, shadows.card]}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardTitle}>Today's Healthy Meal Ideas</Text>
            <Pressable accessibilityRole="button" onPress={handleGetSuggestions} disabled={isSuggesting} style={s.suggestBtn}>
              {isSuggesting ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="sparkles" size={13} color="#fff" />
                  <Text style={s.suggestBtnText}>{suggestions ? 'Refresh' : 'Get Ideas'}</Text>
                </>
              )}
            </Pressable>
          </View>

          {suggestionError && <Text style={s.errorText}>{suggestionError}</Text>}

          {suggestions && (
            <View style={{ marginTop: 10, gap: 10 }}>
              {([['Breakfast', 'sunny', suggestions.breakfast], ['Lunch', 'partly-sunny', suggestions.lunch], ['Dinner', 'moon', suggestions.dinner]] as const).map(([label, icon, meal]) => (
                <View key={label} style={s.mealRow}>
                  <View style={s.mealIcon}>
                    <Ionicons name={icon as any} size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mealLabel}>{label}: {meal.name}</Text>
                    <Text style={s.mealDesc}>{meal.description}</Text>
                  </View>
                </View>
              ))}
              <Pressable accessibilityRole="button" onPress={clearSuggestions} style={{ alignSelf: 'flex-start' }}>
                <Text style={s.dismissText}>Dismiss</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: '#00695C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 60 },
  disclaimer: { fontSize: 12, color: colors.textMuted, marginBottom: 16, lineHeight: 17, fontStyle: 'italic' },
  errorText: { fontSize: 12, color: colors.danger, marginBottom: 10 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14 },
  mealCard: { backgroundColor: '#E0F2F1' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  goalValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, color: colors.text },
  unit: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  saveBtn: { backgroundColor: '#00695C', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  latestText: { fontSize: 12, color: colors.textMuted, marginTop: 10 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  historyDate: { fontSize: 13, color: colors.textSecondary },
  historyWeight: { fontSize: 13, fontWeight: '700', color: colors.text },
  suggestBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#00695C', borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12, minWidth: 84, justifyContent: 'center' },
  suggestBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  mealRow: { flexDirection: 'row', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  mealIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E0F2F1', alignItems: 'center', justifyContent: 'center' },
  mealLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  mealDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  dismissText: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
});
