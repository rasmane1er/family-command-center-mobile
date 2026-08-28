import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Generic enough to accept a saved Recipe, an AI suggestion, or a
// web-sourced recipe from webRecipeService — all three shapes already carry
// name/steps/ingredients, so this doesn't need three separate cook-mode
// implementations.
export interface CookModeIngredient {
  name: string;
  detail?: string; // e.g. "2 cups" or "500 g" — pre-formatted, source-specific
}

export interface CookModeRecipe {
  name: string;
  emoji?: string;
  thumbnailUrl?: string;
  servings?: number;
  steps: string[];
  ingredients: CookModeIngredient[];
}

export function RecipeCookModeScreen({ route, navigation }: any) {
  const recipe: CookModeRecipe = route.params.recipe;
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const total = recipe.steps.length;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isLast) {
      navigation.goBack();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isFirst) {
      navigation.goBack();
    } else {
      setStepIndex((i) => i - 1);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{recipe.emoji ? `${recipe.emoji} ` : ''}{recipe.name}</Text>
          <Text style={styles.headerSub}>Step {stepIndex + 1} of {total}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setShowIngredients(true)} style={styles.headerBtn}>
          <Ionicons name="list" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((stepIndex + 1) / total) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.stepArea} showsVerticalScrollIndicator={false}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{stepIndex + 1}</Text>
        </View>
        <Text style={styles.stepText}>{recipe.steps[stepIndex]}</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.navBtnSecondary}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
          <Text style={styles.navBtnSecondaryText}>{isFirst ? 'Exit' : 'Back'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={goNext} style={styles.navBtnPrimary}>
          <Text style={styles.navBtnPrimaryText}>{isLast ? 'Finish' : 'Next Step'}</Text>
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color="#fff" />
        </Pressable>
      </View>

      <Modal visible={showIngredients} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowIngredients(false)}>
        <View style={[styles.ingContainer, { paddingTop: insets.top }]}>
          <View style={styles.ingHeader}>
            <Text style={styles.ingTitle}>Ingredients</Text>
            <Pressable accessibilityRole="button" onPress={() => setShowIngredients(false)} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          {recipe.servings && (
            <Text style={styles.ingServings}>{recipe.servings} servings</Text>
          )}
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {recipe.ingredients.map((ing, i) => (
              <Pressable
                accessibilityRole="button"
                key={i}
                onPress={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
                style={styles.ingRow}
              >
                <Ionicons
                  name={checked[i] ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={checked[i] ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.ingText, checked[i] && styles.ingTextChecked]}>
                  {ing.detail ? <Text style={styles.ingDetail}>{ing.detail} </Text> : null}
                  {ing.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  headerBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  progressTrack: { height: 4, backgroundColor: colors.border, marginHorizontal: 16, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#E74C3C', borderRadius: 2 },
  stepArea: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  stepBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E74C3C', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  stepBadgeText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  stepText: { fontSize: 22, lineHeight: 32, fontWeight: '600', color: colors.text, textAlign: 'center' },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  navBtnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, backgroundColor: colors.card, borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: colors.border },
  navBtnSecondaryText: { fontSize: 15, fontWeight: '700', color: colors.text },
  navBtnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 2, backgroundColor: '#E74C3C', borderRadius: 16, paddingVertical: 16 },
  navBtnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  ingContainer: { flex: 1, backgroundColor: colors.background },
  ingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  ingTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  ingServings: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: 20, marginTop: 4 },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  ingText: { flex: 1, fontSize: 15, color: colors.text },
  ingTextChecked: { color: colors.textMuted, textDecorationLine: 'line-through' },
  ingDetail: { fontWeight: '700', color: colors.primary },
});
