import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import { API_BASE_URL } from '../config/api';
import { secureStorage } from '../storage/secureStorage';
import * as recipeService from '../services/recipeService';

export type RecipeDifficulty = 'easy' | 'medium' | 'hard';
export type RecipeCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  category: RecipeCategory;
  cuisine: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: string[];
  rating: number;
  isFavorite: boolean;
  calories?: number;
}

interface RecipesState {
  recipes: Recipe[];
  isLoaded: boolean;
  toggleFavorite: (id: string) => void;
  addRecipe: (recipe: Omit<Recipe, 'id'>) => void;
  fetchFromServer: () => Promise<void>;

  // AI pantry-based suggestions — deliberately not persisted. These are
  // proposals, not real recipes, until the user explicitly saves one via
  // saveSuggestion (which moves it into the real, persisted `recipes` list
  // through the same addRecipe path as a manually-created recipe).
  suggestedRecipes: Recipe[];
  isSuggesting: boolean;
  suggestionError: string | null;
  generateSuggestions: (pantryItems: string[], category?: RecipeCategory) => Promise<void>;
  saveSuggestion: (id: string) => void;
  dismissSuggestion: (id: string) => void;
  clearSuggestions: () => void;
}

interface RawSuggestedRecipe {
  name?: unknown; emoji?: unknown; description?: unknown;
  prepTime?: unknown; cookTime?: unknown; servings?: unknown;
  difficulty?: unknown; category?: unknown; cuisine?: unknown;
  ingredients?: unknown; steps?: unknown; tags?: unknown; calories?: unknown;
}

const VALID_DIFFICULTY: RecipeDifficulty[] = ['easy', 'medium', 'hard'];
const VALID_CATEGORY: RecipeCategory[] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];

function coerceSuggestedRecipe(raw: RawSuggestedRecipe, index: number): Recipe | null {
  if (typeof raw.name !== 'string' || !raw.name.trim()) return null;
  if (!Array.isArray(raw.ingredients) || !Array.isArray(raw.steps)) return null;

  const ingredients: RecipeIngredient[] = raw.ingredients
    .filter((i): i is { name: unknown; quantity: unknown; unit: unknown } => !!i && typeof i === 'object')
    .map((i) => ({
      name: typeof i.name === 'string' ? i.name : '',
      quantity: typeof i.quantity === 'number' ? i.quantity : Number(i.quantity) || 0,
      unit: typeof i.unit === 'string' ? i.unit : 'ea',
    }))
    .filter((i) => i.name);

  const steps = raw.steps.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
  if (ingredients.length === 0 || steps.length === 0) return null;

  return {
    id: `suggestion-${Date.now()}-${index}`,
    name: raw.name.trim(),
    emoji: typeof raw.emoji === 'string' && raw.emoji ? raw.emoji : '🍽️',
    description: typeof raw.description === 'string' ? raw.description : '',
    prepTime: typeof raw.prepTime === 'number' ? raw.prepTime : 0,
    cookTime: typeof raw.cookTime === 'number' ? raw.cookTime : 0,
    servings: typeof raw.servings === 'number' && raw.servings > 0 ? raw.servings : 4,
    difficulty: VALID_DIFFICULTY.includes(raw.difficulty as RecipeDifficulty) ? (raw.difficulty as RecipeDifficulty) : 'medium',
    category: VALID_CATEGORY.includes(raw.category as RecipeCategory) ? (raw.category as RecipeCategory) : 'dinner',
    cuisine: typeof raw.cuisine === 'string' && raw.cuisine ? raw.cuisine : 'Fusion',
    ingredients,
    steps,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [],
    rating: 0,
    isFavorite: false,
    ...(typeof raw.calories === 'number' ? { calories: raw.calories } : {}),
  };
}



export const useRecipesStore = create<RecipesState>()(
  persist(
    (set, get) => ({
      recipes: [],
      isLoaded: false,
      toggleFavorite: (id) => {
        const prev = get().recipes;
        set((s) => ({
          recipes: s.recipes.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r)),
        }));
        recipeService.toggleRecipeFavoriteRemote(id).catch(() => { set({ recipes: prev }); });
      },
      addRecipe: (recipe) => {
        const newRecipe: Recipe = { ...recipe, id: `recipe-${Date.now()}` };
        set((s) => ({ recipes: [...s.recipes, newRecipe] }));
        recipeService.createRecipe(newRecipe).catch(() => {
          set((s) => ({ recipes: s.recipes.filter((r) => r.id !== newRecipe.id) }));
        });
      },
      fetchFromServer: async () => {
        try {
          const { recipes } = await recipeService.fetchRecipes();
          set({ recipes, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },

      suggestedRecipes: [],
      isSuggesting: false,
      suggestionError: null,

      generateSuggestions: async (pantryItems, category) => {
        set({ isSuggesting: true, suggestionError: null });
        try {
          const token = await secureStorage.getToken('access_token');
          const response = await fetch(`${API_BASE_URL}/ai/recipe-suggestions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ pantryItems, category }),
          });

          if (!response.ok) {
            set({ isSuggesting: false, suggestionError: "Couldn't reach the AI service. Please try again in a moment." });
            return;
          }

          const data = (await response.json()) as { recipes?: RawSuggestedRecipe[] };
          const parsed = (data.recipes ?? [])
            .map((r, i) => coerceSuggestedRecipe(r, i))
            .filter((r): r is Recipe => r !== null);

          if (parsed.length === 0) {
            set({ isSuggesting: false, suggestionError: 'No suggestions came back — try again, or add pantry items first.' });
            return;
          }

          set({ suggestedRecipes: parsed, isSuggesting: false });
        } catch {
          set({ isSuggesting: false, suggestionError: "Couldn't reach the AI service. Please try again in a moment." });
        }
      },

      saveSuggestion: (id) => {
        const suggestion = get().suggestedRecipes.find((r) => r.id === id);
        if (!suggestion) return;
        const { id: _discard, ...toSave } = suggestion;
        set((s) => ({ suggestedRecipes: s.suggestedRecipes.filter((r) => r.id !== id) }));
        get().addRecipe(toSave);
      },

      dismissSuggestion: (id) =>
        set((s) => ({ suggestedRecipes: s.suggestedRecipes.filter((r) => r.id !== id) })),

      clearSuggestions: () => set({ suggestedRecipes: [], suggestionError: null }),
    }),
    {
      name: 'recipes-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ recipes: state.recipes, isLoaded: state.isLoaded }),
    }
  )
);
