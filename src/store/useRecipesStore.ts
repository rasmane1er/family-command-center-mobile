import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { secureStorage } from '../storage/secureStorage';

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
  toggleFavorite: (id: string) => void;
  addRecipe: (recipe: Omit<Recipe, 'id'>) => void;
  seedDemoData: () => void;

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

const DEMO: Omit<Recipe, 'id'>[] = [
  {
    name: 'Avocado Toast & Eggs', emoji: '🥑',
    description: 'Creamy avocado on toasted sourdough with perfectly poached eggs.',
    prepTime: 5, cookTime: 10, servings: 2, difficulty: 'easy',
    category: 'breakfast', cuisine: 'American',
    ingredients: [
      { name: 'Sourdough bread', quantity: 2, unit: 'slices' },
      { name: 'Ripe avocado', quantity: 1, unit: 'ea' },
      { name: 'Eggs', quantity: 2, unit: 'ea' },
      { name: 'Lemon juice', quantity: 1, unit: 'tbsp' },
      { name: 'Red pepper flakes', quantity: 0.5, unit: 'tsp' },
    ],
    steps: [
      'Toast bread until golden brown.',
      'Mash avocado with lemon juice, salt, and pepper.',
      'Bring a pot of water to a gentle simmer. Add a splash of vinegar.',
      'Crack eggs into small cups, slide into water and poach 3-4 minutes.',
      'Spread avocado on toast, top with egg, sprinkle with red pepper flakes.',
    ],
    tags: ['Quick', 'Healthy', 'Vegetarian', 'High Protein'],
    rating: 4.8, isFavorite: true, calories: 380,
  },
  {
    name: 'Spaghetti Bolognese', emoji: '🍝',
    description: 'Classic Italian meat sauce slow-cooked to perfection.',
    prepTime: 15, cookTime: 45, servings: 6, difficulty: 'medium',
    category: 'dinner', cuisine: 'Italian',
    ingredients: [
      { name: 'Spaghetti', quantity: 500, unit: 'g' },
      { name: 'Ground beef', quantity: 500, unit: 'g' },
      { name: 'Crushed tomatoes', quantity: 800, unit: 'g' },
      { name: 'Onion', quantity: 1, unit: 'medium' },
      { name: 'Garlic cloves', quantity: 4, unit: 'ea' },
      { name: 'Tomato paste', quantity: 2, unit: 'tbsp' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp' },
      { name: 'Parmesan', quantity: 50, unit: 'g' },
    ],
    steps: [
      'Heat olive oil in large pan. Sauté onion until soft (5 min).',
      'Add garlic and cook 1 minute more.',
      'Add ground beef and cook until browned, breaking up lumps.',
      'Stir in tomato paste and cook 2 minutes.',
      'Add crushed tomatoes, season. Simmer 30 minutes.',
      'Cook spaghetti per package. Reserve 1 cup pasta water.',
      'Toss pasta with sauce, serve with Parmesan.',
    ],
    tags: ['Family Fav', 'Italian', 'Freezer-friendly'],
    rating: 4.9, isFavorite: true, calories: 650,
  },
  {
    name: 'Grilled Chicken Salad', emoji: '🥗',
    description: 'Fresh salad with marinated grilled chicken and lemon vinaigrette.',
    prepTime: 15, cookTime: 15, servings: 2, difficulty: 'easy',
    category: 'lunch', cuisine: 'Mediterranean',
    ingredients: [
      { name: 'Chicken breast', quantity: 2, unit: 'ea' },
      { name: 'Mixed greens', quantity: 4, unit: 'cups' },
      { name: 'Cherry tomatoes', quantity: 1, unit: 'cup' },
      { name: 'Cucumber', quantity: 1, unit: 'ea' },
      { name: 'Olive oil', quantity: 3, unit: 'tbsp' },
      { name: 'Lemon', quantity: 1, unit: 'ea' },
    ],
    steps: [
      'Marinate chicken in olive oil, lemon zest, salt, and pepper for 10 min.',
      'Grill chicken 6-7 min per side. Rest 5 min, then slice.',
      'Whisk olive oil, lemon juice, salt, and pepper for dressing.',
      'Combine greens, tomatoes, and cucumber. Top with chicken and dressing.',
    ],
    tags: ['Healthy', 'Low-carb', 'High Protein', 'Quick'],
    rating: 4.5, isFavorite: false, calories: 380,
  },
  {
    name: 'Taco Night', emoji: '🌮',
    description: "Everyone's favorite! Seasoned beef tacos with all the fixings.",
    prepTime: 10, cookTime: 20, servings: 4, difficulty: 'easy',
    category: 'dinner', cuisine: 'Mexican',
    ingredients: [
      { name: 'Ground beef', quantity: 500, unit: 'g' },
      { name: 'Taco shells', quantity: 12, unit: 'ea' },
      { name: 'Taco seasoning', quantity: 1, unit: 'packet' },
      { name: 'Shredded cheddar', quantity: 1, unit: 'cup' },
      { name: 'Sour cream', quantity: 0.5, unit: 'cup' },
      { name: 'Salsa', quantity: 1, unit: 'jar' },
      { name: 'Lettuce, shredded', quantity: 2, unit: 'cups' },
    ],
    steps: [
      'Brown ground beef in skillet. Drain fat.',
      'Add taco seasoning and 1/4 cup water. Simmer 5 minutes.',
      'Warm taco shells per package instructions.',
      'Set up a taco bar with all toppings and enjoy!',
    ],
    tags: ['Family Fav', 'Kids Love It', 'Fun', 'Quick'],
    rating: 4.9, isFavorite: true, calories: 620,
  },
  {
    name: 'Overnight Oats', emoji: '🥣',
    description: 'Prep the night before for an effortless, nutritious breakfast.',
    prepTime: 5, cookTime: 0, servings: 1, difficulty: 'easy',
    category: 'breakfast', cuisine: 'American',
    ingredients: [
      { name: 'Rolled oats', quantity: 0.5, unit: 'cup' },
      { name: 'Milk', quantity: 0.5, unit: 'cup' },
      { name: 'Greek yogurt', quantity: 0.25, unit: 'cup' },
      { name: 'Chia seeds', quantity: 1, unit: 'tbsp' },
      { name: 'Honey', quantity: 1, unit: 'tbsp' },
      { name: 'Fresh berries', quantity: 0.5, unit: 'cup' },
    ],
    steps: [
      'Combine oats, milk, yogurt, chia seeds, and honey in a jar. Stir well.',
      'Cover and refrigerate overnight (at least 4 hours).',
      'Top with fresh berries in the morning and enjoy cold.',
    ],
    tags: ['Make-ahead', 'Healthy', 'Quick Prep', 'Vegetarian'],
    rating: 4.6, isFavorite: false, calories: 310,
  },
  {
    name: 'Stir-Fry Chicken & Rice', emoji: '🍜',
    description: 'Quick, flavorful Asian-inspired stir-fry packed with vegetables.',
    prepTime: 15, cookTime: 15, servings: 4, difficulty: 'medium',
    category: 'dinner', cuisine: 'Asian',
    ingredients: [
      { name: 'Chicken breast', quantity: 500, unit: 'g' },
      { name: 'Rice', quantity: 2, unit: 'cups' },
      { name: 'Broccoli', quantity: 2, unit: 'cups' },
      { name: 'Bell peppers', quantity: 2, unit: 'ea' },
      { name: 'Soy sauce', quantity: 3, unit: 'tbsp' },
      { name: 'Sesame oil', quantity: 1, unit: 'tbsp' },
      { name: 'Garlic', quantity: 3, unit: 'cloves' },
    ],
    steps: [
      'Cook rice per package instructions.',
      'Slice chicken thin. Toss with salt, pepper.',
      'Heat oil in wok on high. Cook chicken until golden, 4-5 min. Set aside.',
      'Stir-fry garlic 30 sec. Add vegetables 3-4 min.',
      'Return chicken. Add soy sauce and sesame oil. Serve over rice.',
    ],
    tags: ['Asian', 'Quick', 'Healthy', 'Weeknight'],
    rating: 4.7, isFavorite: false, calories: 520,
  },
  {
    name: 'Chocolate Chip Cookies', emoji: '🍪',
    description: 'Classic chewy cookies the whole family will devour.',
    prepTime: 15, cookTime: 12, servings: 24, difficulty: 'easy',
    category: 'dessert', cuisine: 'American',
    ingredients: [
      { name: 'All-purpose flour', quantity: 2.25, unit: 'cups' },
      { name: 'Butter, softened', quantity: 1, unit: 'cup' },
      { name: 'Sugar', quantity: 0.75, unit: 'cup' },
      { name: 'Brown sugar', quantity: 0.75, unit: 'cup' },
      { name: 'Eggs', quantity: 2, unit: 'ea' },
      { name: 'Vanilla extract', quantity: 2, unit: 'tsp' },
      { name: 'Chocolate chips', quantity: 2, unit: 'cups' },
    ],
    steps: [
      'Preheat oven to 375°F (190°C).',
      'Beat butter and sugars until creamy. Add eggs and vanilla.',
      'Blend in flour and baking soda. Stir in chocolate chips.',
      'Drop rounded tablespoons onto baking sheets.',
      'Bake 9-11 minutes until golden. Cool 2 min before transferring.',
    ],
    tags: ['Kids Love It', 'Baking', 'Dessert', 'Family Fav'],
    rating: 5.0, isFavorite: true, calories: 180,
  },
  {
    name: 'Pancakes', emoji: '🥞',
    description: 'Fluffy weekend pancakes the kids beg for every Saturday.',
    prepTime: 10, cookTime: 20, servings: 4, difficulty: 'easy',
    category: 'breakfast', cuisine: 'American',
    ingredients: [
      { name: 'All-purpose flour', quantity: 2, unit: 'cups' },
      { name: 'Milk', quantity: 1.5, unit: 'cups' },
      { name: 'Eggs', quantity: 2, unit: 'ea' },
      { name: 'Butter, melted', quantity: 2, unit: 'tbsp' },
      { name: 'Baking powder', quantity: 2, unit: 'tsp' },
      { name: 'Sugar', quantity: 2, unit: 'tbsp' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp' },
    ],
    steps: [
      'Whisk dry ingredients (flour, baking powder, sugar, salt) in a bowl.',
      'In another bowl, mix milk, eggs, and melted butter.',
      'Pour wet into dry and stir until just combined (lumps are fine).',
      'Heat buttered skillet on medium. Pour 1/4 cup batter per pancake.',
      'Cook until bubbles form, flip, cook 1 min more. Serve with maple syrup!',
    ],
    tags: ['Weekend', 'Kids Love It', 'Family Fav', 'Quick'],
    rating: 4.8, isFavorite: true, calories: 420,
  },
];

export const useRecipesStore = create<RecipesState>()(
  persist(
    (set, get) => ({
      recipes: [],
      toggleFavorite: (id) =>
        set((s) => ({
          recipes: s.recipes.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r)),
        })),
      addRecipe: (recipe) =>
        set((s) => ({
          recipes: [...s.recipes, { ...recipe, id: `recipe-${Date.now()}` }],
        })),
      seedDemoData: () =>
        set({
          recipes: DEMO.map((r, i) => ({ ...r, id: `recipe-seed-${i}` })),
        }),

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
        set((s) => ({
          recipes: [...s.recipes, { ...toSave, id: `recipe-${Date.now()}` }],
          suggestedRecipes: s.suggestedRecipes.filter((r) => r.id !== id),
        }));
      },

      dismissSuggestion: (id) =>
        set((s) => ({ suggestedRecipes: s.suggestedRecipes.filter((r) => r.id !== id) })),

      clearSuggestions: () => set({ suggestedRecipes: [], suggestionError: null }),
    }),
    {
      name: 'recipes-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ recipes: state.recipes }),
    }
  )
);
