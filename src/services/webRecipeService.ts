// TheMealDB — free, public, no API key required (uses the shared "1" test
// key TheMealDB documents as fine for light production use). Provides real,
// internet-sourced recipes with real photos, as the counterpart to the
// pantry-tailored AI suggestions in useRecipesStore, which are AI-generated
// and not sourced from any real recipe.
const BASE = 'https://www.themealdb.com/api/json/v1/1';

export interface WebRecipeSummary {
  id: string;
  name: string;
  thumbnail: string;
}

export interface WebRecipeIngredient {
  name: string;
  measure: string;
}

export interface WebRecipeDetail extends WebRecipeSummary {
  category: string;
  area: string;
  steps: string[];
  ingredients: WebRecipeIngredient[];
  tags: string[];
  youtubeUrl?: string;
}

// TheMealDB has no real "healthy" filter — this is a curated, honestly-named
// selection of its categories that lean lighter/healthier, not a
// nutrition-verified filter.
export const HEALTHY_CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: 'Vegetarian', label: 'Vegetarian', emoji: '🥗' },
  { key: 'Vegan', label: 'Vegan', emoji: '🌱' },
  { key: 'Seafood', label: 'Seafood', emoji: '🐟' },
  { key: 'Breakfast', label: 'Breakfast', emoji: '🍳' },
  { key: 'Chicken', label: 'Chicken', emoji: '🍗' },
];

type RawMealSummary = { idMeal: string; strMeal: string; strMealThumb: string };

export async function fetchMealsByCategory(category: string): Promise<WebRecipeSummary[]> {
  const res = await fetch(`${BASE}/filter.php?c=${encodeURIComponent(category)}`);
  if (!res.ok) throw new Error('Failed to load recipes');
  const json = await res.json();
  const meals = (json.meals ?? []) as RawMealSummary[];
  return meals.map((m) => ({ id: m.idMeal, name: m.strMeal, thumbnail: m.strMealThumb }));
}

export async function fetchMealDetail(id: string): Promise<WebRecipeDetail> {
  const res = await fetch(`${BASE}/lookup.php?i=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to load recipe');
  const json = await res.json();
  const m = json.meals?.[0];
  if (!m) throw new Error('Recipe not found');

  const ingredients: WebRecipeIngredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = m[`strIngredient${i}`];
    const measure = m[`strMeasure${i}`];
    if (name && String(name).trim()) {
      ingredients.push({ name: String(name).trim(), measure: String(measure ?? '').trim() });
    }
  }

  // strInstructions is one free-text blob, usually newline-separated —
  // split into discrete steps for the cook-mode walkthrough, stripping any
  // "Step 1:" / "1." prefix the source text already included so we don't
  // double-number it against our own step counter.
  const steps = String(m.strInstructions ?? '')
    .split(/\r?\n+/)
    .map((s: string) => s.replace(/^\s*(step\s*)?\d+[.).:-]?\s*/i, '').trim())
    .filter((s: string) => s.length > 0);

  return {
    id: m.idMeal,
    name: m.strMeal,
    thumbnail: m.strMealThumb,
    category: m.strCategory ?? '',
    area: m.strArea ?? '',
    steps: steps.length > 0 ? steps : ['No instructions provided.'],
    ingredients,
    tags: String(m.strTags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean),
    youtubeUrl: m.strYoutube || undefined,
  };
}
