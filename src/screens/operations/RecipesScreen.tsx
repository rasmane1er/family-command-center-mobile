import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { useRecipesStore, Recipe, RecipeCategory } from '../../store/useRecipesStore';
import { useOperationsStore } from '../../store/useOperationsStore';

const DIFF_CONFIG = {
  easy:   { label: 'Easy',   color: '#27AE60', bg: '#D5F5E3' },
  medium: { label: 'Medium', color: '#F5A623', bg: '#FEF3E2' },
  hard:   { label: 'Hard',   color: '#E74C3C', bg: '#FDEDEC' },
};

const CAT_FILTERS: { key: RecipeCategory | 'all' | 'favorites'; label: string; emoji: string }[] = [
  { key: 'all',       label: 'All',       emoji: '🍴' },
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { key: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { key: 'snack',     label: 'Snack',     emoji: '🍎' },
  { key: 'dessert',   label: 'Dessert',   emoji: '🍰' },
  { key: 'favorites', label: 'Faves',     emoji: '❤️' },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons key={s} name={s <= Math.round(rating) ? 'star' : 'star-outline'} size={11} color="#F5A623" />
      ))}
      <Text style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 3 }}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function RecipeDetailModal({ recipe, onClose, onFavorite }: { recipe: Recipe; onClose: () => void; onFavorite: () => void }) {
  const diff = DIFF_CONFIG[recipe.difficulty];
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={det.container}>
        <View style={det.headerRow}>
          <Pressable onPress={onClose} style={det.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Pressable onPress={onFavorite} style={det.favBtn}>
            <Ionicons name={recipe.isFavorite ? 'heart' : 'heart-outline'} size={24} color={recipe.isFavorite ? '#E74C3C' : colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={det.content} showsVerticalScrollIndicator={false}>
          <Text style={det.emoji}>{recipe.emoji}</Text>
          <Text style={det.name}>{recipe.name}</Text>
          <Text style={det.desc}>{recipe.description}</Text>
          <View style={det.metaRow}>
            <View style={det.metaChip}>
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text style={det.metaText}>{recipe.prepTime + recipe.cookTime} min</Text>
            </View>
            <View style={det.metaChip}>
              <Ionicons name="people-outline" size={14} color={colors.primary} />
              <Text style={det.metaText}>{recipe.servings} servings</Text>
            </View>
            <View style={[det.metaChip, { backgroundColor: diff.bg }]}>
              <Text style={[det.metaText, { color: diff.color, fontWeight: '700' }]}>{diff.label}</Text>
            </View>
            {recipe.calories && (
              <View style={det.metaChip}>
                <Ionicons name="flame-outline" size={14} color="#E67E22" />
                <Text style={det.metaText}>{recipe.calories} cal</Text>
              </View>
            )}
          </View>
          <StarRating rating={recipe.rating} />
          <View style={det.tagsRow}>
            {recipe.tags.map((t) => (
              <View key={t} style={det.tag}><Text style={det.tagText}>{t}</Text></View>
            ))}
          </View>

          <Text style={det.sectionTitle}>Ingredients</Text>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} style={det.ingRow}>
              <View style={det.ingDot} />
              <Text style={det.ingText}>
                <Text style={det.ingQty}>{ing.quantity} {ing.unit} </Text>
                {ing.name}
              </Text>
            </View>
          ))}

          <Text style={det.sectionTitle}>Instructions</Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={det.stepRow}>
              <View style={det.stepNum}>
                <Text style={det.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={det.stepText}>{step}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function RecipesScreen({ navigation }: any) {
  const { recipes, toggleFavorite, seedDemoData } = useRecipesStore();
  const { pantryItems } = useOperationsStore();
  const [filter, setFilter] = useState<RecipeCategory | 'all' | 'favorites'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Recipe | null>(null);

  if (recipes.length === 0) seedDemoData();

  const cookTonightRecipes = useMemo(() => {
    const pantryNames = new Set(pantryItems.map((p) => p.name.toLowerCase()));
    return recipes
      .filter((r) => r.category === 'dinner')
      .map((r) => {
        const have = r.ingredients.filter((ing) => pantryNames.has(ing.name.toLowerCase())).length;
        const pct = have / r.ingredients.length;
        return { recipe: r, pct };
      })
      .filter(({ pct }) => pct >= 0.4)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);
  }, [recipes, pantryItems]);

  const filtered = useMemo(() => {
    let list = recipes;
    if (filter === 'favorites') list = list.filter((r) => r.isFavorite);
    else if (filter !== 'all') list = list.filter((r) => r.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)));
    }
    return list;
  }, [recipes, filter, search]);

  return (
    <View style={styles.container}>
      <PremiumHeader
        title="Recipe Book"
        colors={['#C0392B', '#E74C3C']}
        onBack={() => navigation.goBack()}
      >
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search recipes..."
            placeholderTextColor="rgba(255,255,255,0.5)"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )}
        </View>
      </PremiumHeader>

      {/* Category filters */}
      <View style={styles.filtersBar}>
        {CAT_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => { setFilter(f.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
          >
            <Text style={styles.filterEmoji}>{f.emoji}</Text>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        {/* Cook Tonight */}
        {cookTonightRecipes.length > 0 && filter === 'all' && !search && (
          <View style={styles.cookSection}>
            <View style={styles.cookHeader}>
              <Text style={styles.cookTitle}>🌙 Cook Tonight</Text>
              <Text style={styles.cookSub}>Based on your pantry</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {cookTonightRecipes.map(({ recipe: r, pct }) => (
                <Pressable key={r.id} onPress={() => setSelected(r)} style={styles.cookCard}>
                  <Text style={styles.cookCardEmoji}>{r.emoji}</Text>
                  <Text style={styles.cookCardName} numberOfLines={2}>{r.name}</Text>
                  <View style={styles.cookCardBar}>
                    <View style={[styles.cookCardFill, { width: `${pct * 100}%` }]} />
                  </View>
                  <Text style={styles.cookCardPct}>{Math.round(pct * 100)}% of ingredients</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recipe grid */}
        <Text style={styles.sectionCount}>{filtered.length} recipe{filtered.length !== 1 ? 's' : ''}</Text>
        <View style={styles.grid}>
          {filtered.map((r) => {
            const diff = DIFF_CONFIG[r.difficulty];
            return (
              <Pressable key={r.id} onPress={() => setSelected(r)} style={styles.recipeCard}>
                <View style={styles.recipeCardTop}>
                  <Text style={styles.recipeEmoji}>{r.emoji}</Text>
                  <Pressable onPress={() => { toggleFavorite(r.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.favBtn}>
                    <Ionicons name={r.isFavorite ? 'heart' : 'heart-outline'} size={18} color={r.isFavorite ? '#E74C3C' : colors.textMuted} />
                  </Pressable>
                </View>
                <Text style={styles.recipeName} numberOfLines={2}>{r.name}</Text>
                <StarRating rating={r.rating} />
                <View style={styles.recipeMeta}>
                  <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
                    <Text style={[styles.diffText, { color: diff.color }]}>{diff.label}</Text>
                  </View>
                  <View style={styles.timeBadge}>
                    <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                    <Text style={styles.timeText}>{r.prepTime + r.cookTime}m</Text>
                  </View>
                  {r.calories && (
                    <Text style={styles.calsText}>{r.calories} cal</Text>
                  )}
                </View>
                <View style={styles.cuisineBadge}>
                  <Text style={styles.cuisineText}>{r.cuisine}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>👨‍🍳</Text>
            <Text style={styles.emptyTitle}>No recipes found</Text>
            <Text style={styles.emptyDesc}>Try a different filter or search term.</Text>
          </View>
        )}
      </ScrollView>

      {selected && (
        <RecipeDetailModal
          recipe={selected}
          onClose={() => setSelected(null)}
          onFavorite={() => { toggleFavorite(selected.id); setSelected({ ...selected, isFavorite: !selected.isFavorite }); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#fff' },
  filtersBar: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.background, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
  filterEmoji: { fontSize: 13 },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: '#fff' },
  content: { padding: 16 },
  cookSection: { marginBottom: 24 },
  cookHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cookTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cookSub: { fontSize: 12, color: colors.textSecondary },
  cookCard: { width: 140, backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  cookCardEmoji: { fontSize: 32, marginBottom: 8 },
  cookCardName: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10, lineHeight: 18 },
  cookCardBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: 4 },
  cookCardFill: { height: 4, backgroundColor: '#27AE60', borderRadius: 2 },
  cookCardPct: { fontSize: 10, color: '#27AE60', fontWeight: '700' },
  sectionCount: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  recipeCard: { width: '47.5%', backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  recipeCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  recipeEmoji: { fontSize: 34 },
  favBtn: { padding: 2 },
  recipeName: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6, lineHeight: 18 },
  recipeMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  diffBadge: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  diffText: { fontSize: 10, fontWeight: '700' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontSize: 11, color: colors.textMuted },
  calsText: { fontSize: 10, color: colors.textMuted },
  cuisineBadge: { marginTop: 8 },
  cuisineText: { fontSize: 10, color: colors.textMuted, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
});

const det = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  favBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 60 },
  emoji: { fontSize: 56, textAlign: 'center', marginBottom: 12 },
  name: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 12 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8EEF9', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  metaText: { fontSize: 12, fontWeight: '600', color: colors.text },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 20 },
  tag: { backgroundColor: '#FEF3E2', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  tagText: { fontSize: 11, color: '#B85C00', fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 24, marginBottom: 12 },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  ingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E74C3C' },
  ingText: { fontSize: 14, color: colors.text, flex: 1 },
  ingQty: { fontWeight: '700', color: colors.primary },
  stepRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E74C3C', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  stepText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 22 },
});
