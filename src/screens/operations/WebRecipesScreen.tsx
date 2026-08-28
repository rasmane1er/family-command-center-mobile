import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors } from '../../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  HEALTHY_CATEGORIES, fetchMealsByCategory, fetchMealDetail, WebRecipeSummary,
} from '../../services/webRecipeService';

export function WebRecipesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState(HEALTHY_CATEGORIES[0].key);
  const [meals, setMeals] = useState<WebRecipeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async (cat: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await fetchMealsByCategory(cat);
      setMeals(results);
    } catch {
      setError("Couldn't load recipes. Check your connection and try again.");
      setMeals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(category);
  }, [category, load]);

  const openRecipe = async (meal: WebRecipeSummary) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOpeningId(meal.id);
    try {
      const detail = await fetchMealDetail(meal.id);
      navigation.navigate('RecipeCookMode', {
        recipe: {
          name: detail.name,
          thumbnailUrl: detail.thumbnail,
          steps: detail.steps,
          ingredients: detail.ingredients.map((i) => ({ name: i.name, detail: i.measure })),
        },
      });
    } catch {
      setError("Couldn't load that recipe. Try another one.");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <View style={styles.container}>
      <PremiumHeader title="Healthy & Popular" colors={['#27AE60', '#2ECC71']} onBack={() => navigation.goBack()}>
        <View style={styles.catBar}>
          {HEALTHY_CATEGORIES.map((c) => (
            <Pressable
              accessibilityRole="button"
              key={c.key}
              onPress={() => { setCategory(c.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.catChip, category === c.key && styles.catChipActive]}
            >
              <Text style={styles.catEmoji}>{c.emoji}</Text>
              <Text style={[styles.catText, category === c.key && styles.catTextActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
      </PremiumHeader>

      <Text style={styles.disclaimer}>
        Real recipes pulled from the web, sourced by category — not a nutrition-verified "healthy" filter.
      </Text>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#27AE60" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => load(category)} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          {meals.map((m) => (
            <Pressable
              accessibilityRole="button"
              key={m.id}
              onPress={() => openRecipe(m)}
              disabled={openingId !== null}
              style={styles.card}
            >
              <Image source={{ uri: m.thumbnail }} style={styles.cardImage} />
              {openingId === m.id && (
                <View style={styles.cardLoadingOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
              <Text style={styles.cardName} numberOfLines={2}>{m.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  catBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 },
  catChipActive: { backgroundColor: '#fff' },
  catEmoji: { fontSize: 13 },
  catText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  catTextActive: { color: '#27AE60' },
  disclaimer: { fontSize: 11, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 20, paddingVertical: 10, fontStyle: 'italic' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 30 },
  errorText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: { backgroundColor: '#27AE60', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 },
  retryBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  card: { width: '47.5%', backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardImage: { width: '100%', height: 110, backgroundColor: colors.border },
  cardLoadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 110, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 13, fontWeight: '700', color: colors.text, padding: 10, lineHeight: 18 },
});
