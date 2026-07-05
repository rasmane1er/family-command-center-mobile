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
  hasSeeded: boolean;
  toggleFavorite: (id: string) => void;
  addRecipe: (recipe: Omit<Recipe, 'id'>) => void;
  seedDemoData: () => void;
  // Tops up the built-in recipe catalog with any curated recipes the
  // device hasn't seen yet (matched by name), without touching recipes
  // the user has already favorited or added themselves. Needed because
  // `seedDemoData` only ever runs once per device (gated by `hasSeeded`),
  // so growing the DEMO catalog wouldn't otherwise reach existing installs.
  syncCatalogRecipes: () => void;

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
  // ── Breakfast ──
  {
    name: 'French Toast', emoji: '🍞',
    description: 'Golden, custardy French toast with cinnamon and maple syrup.',
    prepTime: 10, cookTime: 15, servings: 4, difficulty: 'easy',
    category: 'breakfast', cuisine: 'American',
    ingredients: [
      { name: 'Thick bread slices', quantity: 6, unit: 'ea' },
      { name: 'Eggs', quantity: 3, unit: 'ea' },
      { name: 'Milk', quantity: 0.5, unit: 'cup' },
      { name: 'Cinnamon', quantity: 1, unit: 'tsp' },
      { name: 'Vanilla extract', quantity: 1, unit: 'tsp' },
      { name: 'Butter', quantity: 2, unit: 'tbsp' },
      { name: 'Maple syrup', quantity: 0.25, unit: 'cup' },
    ],
    steps: [
      'Whisk eggs, milk, cinnamon, and vanilla in a shallow dish.',
      'Dip each bread slice, coating both sides well.',
      'Melt butter in a skillet over medium heat.',
      'Cook bread 2-3 minutes per side until golden brown.',
      'Serve warm with maple syrup and extra butter.',
    ],
    tags: ['Weekend', 'Kids Love It', 'Quick'],
    rating: 4.7, isFavorite: false, calories: 350,
  },
  {
    name: 'Shakshuka', emoji: '🍳',
    description: 'Eggs poached in a spiced tomato and bell pepper sauce.',
    prepTime: 10, cookTime: 20, servings: 4, difficulty: 'easy',
    category: 'breakfast', cuisine: 'Middle Eastern',
    ingredients: [
      { name: 'Crushed tomatoes', quantity: 800, unit: 'g' },
      { name: 'Bell pepper', quantity: 1, unit: 'ea' },
      { name: 'Onion', quantity: 1, unit: 'medium' },
      { name: 'Garlic cloves', quantity: 3, unit: 'ea' },
      { name: 'Cumin', quantity: 1, unit: 'tsp' },
      { name: 'Paprika', quantity: 1, unit: 'tsp' },
      { name: 'Eggs', quantity: 6, unit: 'ea' },
      { name: 'Feta cheese', quantity: 0.5, unit: 'cup' },
    ],
    steps: [
      'Sauté onion and bell pepper in olive oil until softened, 5 minutes.',
      'Add garlic, cumin, and paprika; cook 1 minute.',
      'Pour in crushed tomatoes and simmer 10 minutes until thickened.',
      'Make wells in the sauce and crack in eggs.',
      'Cover and cook 6-8 minutes until egg whites are set.',
      'Top with crumbled feta and fresh herbs, serve with crusty bread.',
    ],
    tags: ['Vegetarian', 'One-pan', 'Brunch'],
    rating: 4.7, isFavorite: false, calories: 310,
  },
  {
    name: 'Breakfast Burrito', emoji: '🌯',
    description: 'Scrambled eggs, cheese, and potatoes wrapped in a warm tortilla.',
    prepTime: 10, cookTime: 15, servings: 4, difficulty: 'easy',
    category: 'breakfast', cuisine: 'Mexican-American',
    ingredients: [
      { name: 'Flour tortillas', quantity: 4, unit: 'ea' },
      { name: 'Eggs', quantity: 6, unit: 'ea' },
      { name: 'Breakfast potatoes', quantity: 2, unit: 'cups' },
      { name: 'Shredded cheddar', quantity: 1, unit: 'cup' },
      { name: 'Cooked bacon or sausage', quantity: 200, unit: 'g' },
      { name: 'Salsa', quantity: 0.5, unit: 'cup' },
    ],
    steps: [
      'Scramble eggs in a buttered pan until just set.',
      'Warm breakfast potatoes and bacon or sausage in a skillet.',
      'Warm tortillas until pliable.',
      'Layer eggs, potatoes, meat, cheese, and salsa down the center of each tortilla.',
      'Fold in the sides and roll tightly. Toast seam-side down for a crisp finish.',
    ],
    tags: ['Grab & Go', 'Freezer-friendly', 'Family Fav'],
    rating: 4.6, isFavorite: false, calories: 480,
  },
  {
    name: 'Belgian Waffles', emoji: '🧇',
    description: 'Crispy on the outside, fluffy inside — a weekend breakfast classic.',
    prepTime: 10, cookTime: 20, servings: 4, difficulty: 'easy',
    category: 'breakfast', cuisine: 'Belgian',
    ingredients: [
      { name: 'All-purpose flour', quantity: 2, unit: 'cups' },
      { name: 'Eggs', quantity: 2, unit: 'ea' },
      { name: 'Milk', quantity: 1.75, unit: 'cups' },
      { name: 'Butter, melted', quantity: 0.5, unit: 'cup' },
      { name: 'Baking powder', quantity: 4, unit: 'tsp' },
      { name: 'Sugar', quantity: 2, unit: 'tbsp' },
      { name: 'Vanilla extract', quantity: 1, unit: 'tsp' },
    ],
    steps: [
      'Whisk together flour, baking powder, and sugar.',
      'In another bowl, mix milk, eggs, melted butter, and vanilla.',
      'Combine wet and dry ingredients until just smooth.',
      'Pour batter into a preheated waffle iron and cook until golden and crisp.',
      'Serve with fresh fruit, whipped cream, or maple syrup.',
    ],
    tags: ['Weekend', 'Kids Love It', 'Family Fav'],
    rating: 4.8, isFavorite: false, calories: 410,
  },
  {
    name: 'Congee (Rice Porridge)', emoji: '🍚',
    description: 'A comforting, silky Chinese rice porridge topped with scallions and ginger.',
    prepTime: 5, cookTime: 60, servings: 4, difficulty: 'easy',
    category: 'breakfast', cuisine: 'Chinese',
    ingredients: [
      { name: 'Rice', quantity: 1, unit: 'cup' },
      { name: 'Chicken or vegetable stock', quantity: 8, unit: 'cups' },
      { name: 'Fresh ginger', quantity: 1, unit: 'tbsp' },
      { name: 'Scallions', quantity: 3, unit: 'ea' },
      { name: 'Soy sauce', quantity: 1, unit: 'tbsp' },
      { name: 'Sesame oil', quantity: 1, unit: 'tsp' },
    ],
    steps: [
      'Rinse rice and combine with stock and ginger in a large pot.',
      'Bring to a boil, then reduce to a low simmer.',
      'Cook uncovered, stirring occasionally, 45-60 minutes until thick and creamy.',
      'Season with soy sauce and sesame oil.',
      'Top with sliced scallions and your choice of egg, shredded chicken, or pickles.',
    ],
    tags: ['Comfort Food', 'Make-ahead', 'Gentle on Stomach'],
    rating: 4.5, isFavorite: false, calories: 220,
  },
  {
    name: 'Tamagoyaki (Rolled Omelette)', emoji: '🍳',
    description: 'A lightly sweet, delicately layered Japanese rolled omelette.',
    prepTime: 10, cookTime: 15, servings: 2, difficulty: 'medium',
    category: 'breakfast', cuisine: 'Japanese',
    ingredients: [
      { name: 'Eggs', quantity: 4, unit: 'ea' },
      { name: 'Dashi stock', quantity: 2, unit: 'tbsp' },
      { name: 'Soy sauce', quantity: 1, unit: 'tsp' },
      { name: 'Sugar', quantity: 1, unit: 'tbsp' },
      { name: 'Vegetable oil', quantity: 1, unit: 'tbsp' },
    ],
    steps: [
      'Whisk eggs with dashi, soy sauce, and sugar until smooth.',
      'Heat a lightly oiled rectangular tamagoyaki pan (or nonstick skillet) over medium-low heat.',
      'Pour in a thin layer of egg mixture, tilting to coat the pan.',
      'When mostly set, roll the egg to one side, then add another thin layer and repeat.',
      'Continue layering and rolling until all egg mixture is used.',
      'Slice into pieces and serve warm or at room temperature.',
    ],
    tags: ['Bento', 'High Protein', 'Make-ahead'],
    rating: 4.6, isFavorite: false, calories: 190,
  },
  {
    name: 'Chilaquiles', emoji: '🌶️',
    description: 'Crispy tortilla chips simmered in salsa, topped with eggs and cheese.',
    prepTime: 10, cookTime: 20, servings: 4, difficulty: 'medium',
    category: 'breakfast', cuisine: 'Mexican',
    ingredients: [
      { name: 'Corn tortilla chips', quantity: 6, unit: 'cups' },
      { name: 'Red or green salsa', quantity: 2, unit: 'cups' },
      { name: 'Eggs', quantity: 4, unit: 'ea' },
      { name: 'Queso fresco', quantity: 0.5, unit: 'cup' },
      { name: 'Sour cream', quantity: 0.25, unit: 'cup' },
      { name: 'Cilantro', quantity: 0.25, unit: 'cup' },
    ],
    steps: [
      'Warm salsa in a large skillet over medium heat.',
      'Add tortilla chips and gently toss to coat, cooking 2-3 minutes until slightly softened.',
      'Fry or poach eggs separately to your preference.',
      'Plate chilaquiles and top with eggs, queso fresco, sour cream, and cilantro.',
    ],
    tags: ['Brunch', 'Spicy', 'Quick'],
    rating: 4.7, isFavorite: false, calories: 430,
  },
  // ── Lunch ──
  {
    name: 'Turkey Club Sandwich', emoji: '🥪',
    description: 'A triple-decker classic with turkey, bacon, lettuce, and tomato.',
    prepTime: 15, cookTime: 10, servings: 2, difficulty: 'easy',
    category: 'lunch', cuisine: 'American',
    ingredients: [
      { name: 'Sliced bread', quantity: 6, unit: 'slices' },
      { name: 'Sliced turkey breast', quantity: 200, unit: 'g' },
      { name: 'Bacon', quantity: 6, unit: 'slices' },
      { name: 'Lettuce', quantity: 2, unit: 'leaves' },
      { name: 'Tomato', quantity: 1, unit: 'ea' },
      { name: 'Mayonnaise', quantity: 3, unit: 'tbsp' },
    ],
    steps: [
      'Toast bread slices until golden.',
      'Cook bacon until crisp.',
      'Spread mayonnaise on each slice of toast.',
      'Layer turkey, bacon, lettuce, and tomato between the toast slices, stacking triple-decker style.',
      'Secure with toothpicks and slice diagonally.',
    ],
    tags: ['Quick', 'No-cook option', 'Classic'],
    rating: 4.6, isFavorite: false, calories: 520,
  },
  {
    name: 'Chicken Caesar Wrap', emoji: '🌯',
    description: 'Grilled chicken, romaine, and Parmesan tossed in Caesar dressing.',
    prepTime: 10, cookTime: 12, servings: 4, difficulty: 'easy',
    category: 'lunch', cuisine: 'American',
    ingredients: [
      { name: 'Chicken breast', quantity: 2, unit: 'ea' },
      { name: 'Romaine lettuce', quantity: 4, unit: 'cups' },
      { name: 'Parmesan cheese', quantity: 0.5, unit: 'cup' },
      { name: 'Caesar dressing', quantity: 0.33, unit: 'cup' },
      { name: 'Large flour tortillas', quantity: 4, unit: 'ea' },
    ],
    steps: [
      'Season and grill chicken breast, then slice thin.',
      'Toss chopped romaine, Parmesan, and Caesar dressing in a bowl.',
      'Lay a tortilla flat and add the salad mixture and sliced chicken.',
      'Fold in the sides and roll tightly.',
      'Slice in half and serve.',
    ],
    tags: ['Quick', 'High Protein', 'Meal Prep'],
    rating: 4.6, isFavorite: false, calories: 460,
  },
  {
    name: 'Vietnamese Banh Mi', emoji: '🥖',
    description: 'A crusty baguette packed with savory pork, pickled veggies, and herbs.',
    prepTime: 20, cookTime: 15, servings: 4, difficulty: 'medium',
    category: 'lunch', cuisine: 'Vietnamese',
    ingredients: [
      { name: 'French baguette', quantity: 1, unit: 'ea' },
      { name: 'Pork tenderloin or pâté', quantity: 300, unit: 'g' },
      { name: 'Carrot, julienned', quantity: 1, unit: 'ea' },
      { name: 'Daikon radish, julienned', quantity: 1, unit: 'cup' },
      { name: 'Rice vinegar', quantity: 0.25, unit: 'cup' },
      { name: 'Cucumber', quantity: 1, unit: 'ea' },
      { name: 'Cilantro', quantity: 0.5, unit: 'cup' },
      { name: 'Jalapeño', quantity: 1, unit: 'ea' },
      { name: 'Mayonnaise', quantity: 3, unit: 'tbsp' },
    ],
    steps: [
      'Pickle carrot and daikon in rice vinegar, sugar, and salt for at least 20 minutes.',
      'Cook and slice the pork (or use pâté).',
      'Split baguette lengthwise and spread with mayonnaise.',
      'Layer pork, pickled vegetables, cucumber, jalapeño, and cilantro.',
      'Press together and slice into portions.',
    ],
    tags: ['Bright & Fresh', 'Make-ahead pickles'],
    rating: 4.8, isFavorite: false, calories: 470,
  },
  {
    name: 'Greek Salad', emoji: '🥙',
    description: 'Crisp cucumbers, tomatoes, olives, and feta with a lemon-oregano dressing.',
    prepTime: 15, cookTime: 0, servings: 4, difficulty: 'easy',
    category: 'lunch', cuisine: 'Greek',
    ingredients: [
      { name: 'Cucumber', quantity: 2, unit: 'ea' },
      { name: 'Tomatoes', quantity: 4, unit: 'ea' },
      { name: 'Red onion', quantity: 0.5, unit: 'ea' },
      { name: 'Kalamata olives', quantity: 0.5, unit: 'cup' },
      { name: 'Feta cheese', quantity: 200, unit: 'g' },
      { name: 'Olive oil', quantity: 0.25, unit: 'cup' },
      { name: 'Dried oregano', quantity: 1, unit: 'tsp' },
    ],
    steps: [
      'Chop cucumber, tomatoes, and red onion into chunks.',
      'Combine in a bowl with olives.',
      'Whisk olive oil, lemon juice, and oregano for the dressing.',
      'Toss vegetables with dressing, top with a slab of feta and a sprinkle of oregano.',
    ],
    tags: ['No-cook', 'Vegetarian', 'Quick'],
    rating: 4.7, isFavorite: false, calories: 320,
  },
  {
    name: 'Tomato Basil Soup & Grilled Cheese', emoji: '🍅',
    description: 'The ultimate cozy lunch pairing — creamy soup with a crispy, cheesy dipper.',
    prepTime: 10, cookTime: 30, servings: 4, difficulty: 'easy',
    category: 'lunch', cuisine: 'American',
    ingredients: [
      { name: 'Crushed tomatoes', quantity: 800, unit: 'g' },
      { name: 'Vegetable stock', quantity: 2, unit: 'cups' },
      { name: 'Heavy cream', quantity: 0.5, unit: 'cup' },
      { name: 'Fresh basil', quantity: 0.25, unit: 'cup' },
      { name: 'Sliced bread', quantity: 8, unit: 'slices' },
      { name: 'Cheddar cheese', quantity: 8, unit: 'slices' },
      { name: 'Butter', quantity: 3, unit: 'tbsp' },
    ],
    steps: [
      'Simmer crushed tomatoes and stock for 20 minutes.',
      'Blend until smooth, then stir in cream and basil.',
      'Butter bread slices and build sandwiches with cheddar.',
      'Grill sandwiches in a skillet until golden and cheese melts, 3-4 minutes per side.',
      'Serve soup with sandwiches for dipping.',
    ],
    tags: ['Comfort Food', 'Kids Love It', 'Family Fav'],
    rating: 4.9, isFavorite: false, calories: 540,
  },
  {
    name: 'Poke Bowl', emoji: '🐟',
    description: 'Fresh marinated ahi tuna over rice with crisp veggies and sesame.',
    prepTime: 20, cookTime: 15, servings: 4, difficulty: 'medium',
    category: 'lunch', cuisine: 'Hawaiian',
    ingredients: [
      { name: 'Sushi-grade ahi tuna', quantity: 400, unit: 'g' },
      { name: 'Soy sauce', quantity: 3, unit: 'tbsp' },
      { name: 'Sesame oil', quantity: 1, unit: 'tbsp' },
      { name: 'Rice', quantity: 2, unit: 'cups' },
      { name: 'Cucumber', quantity: 1, unit: 'ea' },
      { name: 'Avocado', quantity: 1, unit: 'ea' },
      { name: 'Edamame', quantity: 1, unit: 'cup' },
      { name: 'Sesame seeds', quantity: 1, unit: 'tbsp' },
    ],
    steps: [
      'Cook rice per package instructions and let cool slightly.',
      'Cube tuna and marinate in soy sauce and sesame oil for 15 minutes.',
      'Slice cucumber and avocado.',
      'Assemble bowls with rice, tuna, cucumber, avocado, and edamame.',
      'Sprinkle with sesame seeds and extra soy sauce to taste.',
    ],
    tags: ['Healthy', 'High Protein', 'No-cook option'],
    rating: 4.7, isFavorite: false, calories: 490,
  },
  {
    name: 'Falafel Pita', emoji: '🧆',
    description: 'Crispy chickpea falafel tucked into warm pita with tahini sauce.',
    prepTime: 20, cookTime: 15, servings: 4, difficulty: 'medium',
    category: 'lunch', cuisine: 'Middle Eastern',
    ingredients: [
      { name: 'Chickpeas, cooked', quantity: 2, unit: 'cups' },
      { name: 'Garlic cloves', quantity: 3, unit: 'ea' },
      { name: 'Fresh parsley', quantity: 0.5, unit: 'cup' },
      { name: 'Ground cumin', quantity: 1, unit: 'tsp' },
      { name: 'Pita bread', quantity: 4, unit: 'ea' },
      { name: 'Tahini', quantity: 0.25, unit: 'cup' },
      { name: 'Lemon juice', quantity: 2, unit: 'tbsp' },
      { name: 'Mixed greens', quantity: 2, unit: 'cups' },
    ],
    steps: [
      'Pulse chickpeas, garlic, parsley, and cumin in a food processor until coarse.',
      'Form into small patties and pan-fry or bake until crisp, about 4 minutes per side.',
      'Whisk tahini with lemon juice and a splash of water for the sauce.',
      'Warm pita and fill with greens, falafel, and tahini sauce.',
    ],
    tags: ['Vegetarian', 'Meal Prep', 'High Fiber'],
    rating: 4.6, isFavorite: false, calories: 440,
  },
  // ── Dinner ──
  {
    name: 'Chicken Tikka Masala', emoji: '🍛',
    description: 'Tender marinated chicken in a creamy, spiced tomato sauce.',
    prepTime: 30, cookTime: 30, servings: 4, difficulty: 'medium',
    category: 'dinner', cuisine: 'Indian',
    ingredients: [
      { name: 'Chicken thighs', quantity: 600, unit: 'g' },
      { name: 'Yogurt', quantity: 0.5, unit: 'cup' },
      { name: 'Garam masala', quantity: 2, unit: 'tsp' },
      { name: 'Crushed tomatoes', quantity: 400, unit: 'g' },
      { name: 'Heavy cream', quantity: 0.5, unit: 'cup' },
      { name: 'Onion', quantity: 1, unit: 'ea' },
      { name: 'Garlic and ginger paste', quantity: 2, unit: 'tbsp' },
      { name: 'Basmati rice', quantity: 2, unit: 'cups' },
    ],
    steps: [
      'Marinate chicken in yogurt, half the garam masala, salt, and lemon juice for at least 30 minutes.',
      'Sear marinated chicken until charred at the edges; set aside.',
      'Sauté onion, garlic, and ginger until golden.',
      'Add crushed tomatoes and remaining garam masala; simmer 10 minutes.',
      'Stir in cream and cooked chicken; simmer 10 more minutes.',
      'Serve over basmati rice.',
    ],
    tags: ['Family Fav', 'Spiced', 'Freezer-friendly'],
    rating: 4.9, isFavorite: false, calories: 610,
  },
  {
    name: 'Beef and Broccoli', emoji: '🥦',
    description: 'A fast, savory stir-fry with tender beef and crisp broccoli in garlic sauce.',
    prepTime: 15, cookTime: 15, servings: 4, difficulty: 'easy',
    category: 'dinner', cuisine: 'Chinese',
    ingredients: [
      { name: 'Flank steak, sliced thin', quantity: 500, unit: 'g' },
      { name: 'Broccoli florets', quantity: 4, unit: 'cups' },
      { name: 'Soy sauce', quantity: 0.25, unit: 'cup' },
      { name: 'Oyster sauce', quantity: 2, unit: 'tbsp' },
      { name: 'Garlic cloves', quantity: 3, unit: 'ea' },
      { name: 'Cornstarch', quantity: 1, unit: 'tbsp' },
      { name: 'Rice', quantity: 2, unit: 'cups' },
    ],
    steps: [
      'Toss sliced beef with cornstarch and a splash of soy sauce.',
      'Blanch broccoli 2 minutes, then drain.',
      'Sear beef in a hot wok until browned, 2-3 minutes; set aside.',
      'Stir-fry garlic 30 seconds, add broccoli and beef back in.',
      'Add soy sauce and oyster sauce, toss until glossy.',
      'Serve over steamed rice.',
    ],
    tags: ['Quick', 'Weeknight', 'High Protein'],
    rating: 4.7, isFavorite: false, calories: 540,
  },
  {
    name: 'Chicken Parmesan', emoji: '🧀',
    description: 'Crispy breaded chicken cutlets baked with marinara and melted mozzarella.',
    prepTime: 20, cookTime: 30, servings: 4, difficulty: 'medium',
    category: 'dinner', cuisine: 'Italian-American',
    ingredients: [
      { name: 'Chicken breast, pounded thin', quantity: 4, unit: 'ea' },
      { name: 'Breadcrumbs', quantity: 1.5, unit: 'cups' },
      { name: 'Parmesan cheese', quantity: 0.5, unit: 'cup' },
      { name: 'Eggs', quantity: 2, unit: 'ea' },
      { name: 'Marinara sauce', quantity: 2, unit: 'cups' },
      { name: 'Mozzarella cheese', quantity: 1.5, unit: 'cups' },
      { name: 'Spaghetti', quantity: 400, unit: 'g' },
    ],
    steps: [
      'Dip chicken in beaten egg, then coat in breadcrumbs mixed with Parmesan.',
      'Pan-fry cutlets until golden on both sides.',
      'Place in a baking dish, top with marinara and mozzarella.',
      'Bake at 400°F (200°C) for 15 minutes until cheese is bubbly.',
      'Serve over spaghetti with extra marinara.',
    ],
    tags: ['Family Fav', 'Kids Love It', 'Comfort Food'],
    rating: 4.8, isFavorite: false, calories: 680,
  },
  {
    name: 'Salmon Teriyaki', emoji: '🐟',
    description: 'Pan-seared salmon glazed in a sweet-savory homemade teriyaki sauce.',
    prepTime: 10, cookTime: 15, servings: 4, difficulty: 'easy',
    category: 'dinner', cuisine: 'Japanese',
    ingredients: [
      { name: 'Salmon fillets', quantity: 4, unit: 'ea' },
      { name: 'Soy sauce', quantity: 0.25, unit: 'cup' },
      { name: 'Mirin', quantity: 2, unit: 'tbsp' },
      { name: 'Brown sugar', quantity: 2, unit: 'tbsp' },
      { name: 'Garlic cloves', quantity: 2, unit: 'ea' },
      { name: 'Rice', quantity: 2, unit: 'cups' },
      { name: 'Steamed broccoli', quantity: 2, unit: 'cups' },
    ],
    steps: [
      'Whisk soy sauce, mirin, brown sugar, and minced garlic for the glaze.',
      'Sear salmon skin-side down in a hot pan, 4 minutes.',
      'Flip and pour glaze over the fillets, simmer 3-4 minutes until glossy and cooked through.',
      'Serve over rice with steamed broccoli, spooning extra glaze on top.',
    ],
    tags: ['Healthy', 'High Protein', 'Quick'],
    rating: 4.8, isFavorite: false, calories: 480,
  },
  {
    name: 'Sausage & Gnocchi Skillet', emoji: '🍲',
    description: 'A one-pan Italian dinner with sausage, gnocchi, and wilted spinach.',
    prepTime: 10, cookTime: 20, servings: 4, difficulty: 'easy',
    category: 'dinner', cuisine: 'Italian',
    ingredients: [
      { name: 'Italian sausage', quantity: 400, unit: 'g' },
      { name: 'Potato gnocchi', quantity: 500, unit: 'g' },
      { name: 'Baby spinach', quantity: 3, unit: 'cups' },
      { name: 'Garlic cloves', quantity: 3, unit: 'ea' },
      { name: 'Heavy cream', quantity: 0.5, unit: 'cup' },
      { name: 'Parmesan cheese', quantity: 0.5, unit: 'cup' },
    ],
    steps: [
      'Brown sausage in a large skillet, breaking into pieces.',
      'Add garlic and gnocchi, cooking until gnocchi starts to brown, 5 minutes.',
      'Stir in cream and simmer 3-4 minutes.',
      'Fold in spinach until wilted.',
      'Top with Parmesan and serve straight from the skillet.',
    ],
    tags: ['One-pan', 'Weeknight', 'Family Fav'],
    rating: 4.8, isFavorite: false, calories: 640,
  },
  {
    name: 'Chicken Enchiladas', emoji: '🌶️',
    description: 'Corn tortillas rolled with seasoned chicken and smothered in enchilada sauce.',
    prepTime: 20, cookTime: 30, servings: 6, difficulty: 'medium',
    category: 'dinner', cuisine: 'Mexican',
    ingredients: [
      { name: 'Cooked shredded chicken', quantity: 3, unit: 'cups' },
      { name: 'Corn tortillas', quantity: 12, unit: 'ea' },
      { name: 'Enchilada sauce', quantity: 3, unit: 'cups' },
      { name: 'Shredded cheese', quantity: 2, unit: 'cups' },
      { name: 'Onion', quantity: 1, unit: 'ea' },
      { name: 'Sour cream', quantity: 0.5, unit: 'cup' },
    ],
    steps: [
      'Preheat oven to 375°F (190°C).',
      'Mix shredded chicken with diced onion and a splash of enchilada sauce.',
      'Warm tortillas, fill with chicken mixture, and roll tightly into a baking dish.',
      'Pour remaining sauce over the top and sprinkle with cheese.',
      'Bake 20 minutes until bubbly. Serve with sour cream.',
    ],
    tags: ['Freezer-friendly', 'Family Fav', 'Make-ahead'],
    rating: 4.8, isFavorite: false, calories: 560,
  },
  {
    name: 'Beef Chili', emoji: '🌶️',
    description: 'A hearty, slow-simmered chili loaded with beans and warm spices.',
    prepTime: 15, cookTime: 60, servings: 6, difficulty: 'easy',
    category: 'dinner', cuisine: 'American',
    ingredients: [
      { name: 'Ground beef', quantity: 700, unit: 'g' },
      { name: 'Kidney beans', quantity: 2, unit: 'cans' },
      { name: 'Crushed tomatoes', quantity: 800, unit: 'g' },
      { name: 'Onion', quantity: 1, unit: 'ea' },
      { name: 'Chili powder', quantity: 2, unit: 'tbsp' },
      { name: 'Cumin', quantity: 1, unit: 'tbsp' },
      { name: 'Bell pepper', quantity: 1, unit: 'ea' },
    ],
    steps: [
      'Brown ground beef with diced onion and bell pepper.',
      'Stir in chili powder and cumin, cook 1 minute.',
      'Add crushed tomatoes and beans.',
      'Simmer uncovered 45-60 minutes, stirring occasionally.',
      'Serve with shredded cheese, sour cream, and cornbread.',
    ],
    tags: ['Freezer-friendly', 'Make-ahead', 'Family Fav'],
    rating: 4.8, isFavorite: false, calories: 480,
  },
  {
    name: 'Sloppy Joes', emoji: '🍔',
    description: 'Sweet and tangy ground beef sandwiches the whole family will ask for again.',
    prepTime: 10, cookTime: 20, servings: 4, difficulty: 'easy',
    category: 'dinner', cuisine: 'American',
    ingredients: [
      { name: 'Ground beef', quantity: 500, unit: 'g' },
      { name: 'Ketchup', quantity: 0.5, unit: 'cup' },
      { name: 'Brown sugar', quantity: 2, unit: 'tbsp' },
      { name: 'Worcestershire sauce', quantity: 1, unit: 'tbsp' },
      { name: 'Onion', quantity: 1, unit: 'ea' },
      { name: 'Burger buns', quantity: 4, unit: 'ea' },
    ],
    steps: [
      'Brown ground beef with diced onion.',
      'Stir in ketchup, brown sugar, and Worcestershire sauce.',
      'Simmer 10 minutes until thickened.',
      'Spoon onto toasted burger buns and serve with fries or a side salad.',
    ],
    tags: ['Kids Love It', 'Quick', 'Weeknight'],
    rating: 4.6, isFavorite: false, calories: 500,
  },
  {
    name: 'Butter Chicken', emoji: '🍛',
    description: 'A rich, buttery tomato-cream curry with fall-apart tender chicken.',
    prepTime: 20, cookTime: 30, servings: 4, difficulty: 'medium',
    category: 'dinner', cuisine: 'Indian',
    ingredients: [
      { name: 'Chicken thighs', quantity: 600, unit: 'g' },
      { name: 'Butter', quantity: 4, unit: 'tbsp' },
      { name: 'Crushed tomatoes', quantity: 400, unit: 'g' },
      { name: 'Heavy cream', quantity: 0.5, unit: 'cup' },
      { name: 'Garam masala', quantity: 2, unit: 'tsp' },
      { name: 'Garlic and ginger paste', quantity: 2, unit: 'tbsp' },
      { name: 'Naan bread', quantity: 4, unit: 'ea' },
    ],
    steps: [
      'Sear chicken in butter until golden; set aside.',
      'Sauté garlic and ginger paste in the same pan.',
      'Add crushed tomatoes and garam masala, simmer 10 minutes.',
      'Blend sauce until smooth, then return to pan with chicken.',
      'Stir in cream and simmer until chicken is cooked through, about 10 minutes.',
      'Serve with naan and steamed rice.',
    ],
    tags: ['Family Fav', 'Spiced', 'Comfort Food'],
    rating: 4.9, isFavorite: false, calories: 590,
  },
  {
    name: 'Pad Thai', emoji: '🍜',
    description: 'Stir-fried rice noodles with shrimp, egg, and a tangy tamarind sauce.',
    prepTime: 20, cookTime: 15, servings: 4, difficulty: 'medium',
    category: 'dinner', cuisine: 'Thai',
    ingredients: [
      { name: 'Rice noodles', quantity: 250, unit: 'g' },
      { name: 'Shrimp, peeled', quantity: 300, unit: 'g' },
      { name: 'Eggs', quantity: 2, unit: 'ea' },
      { name: 'Bean sprouts', quantity: 2, unit: 'cups' },
      { name: 'Tamarind paste', quantity: 2, unit: 'tbsp' },
      { name: 'Fish sauce', quantity: 3, unit: 'tbsp' },
      { name: 'Brown sugar', quantity: 2, unit: 'tbsp' },
      { name: 'Crushed peanuts', quantity: 0.25, unit: 'cup' },
    ],
    steps: [
      'Soak rice noodles in warm water until pliable, then drain.',
      'Whisk tamarind paste, fish sauce, and brown sugar for the sauce.',
      'Stir-fry shrimp until pink; push to one side and scramble in the eggs.',
      'Add noodles and sauce, tossing to combine, 3-4 minutes.',
      'Fold in bean sprouts and toss briefly.',
      'Top with crushed peanuts and a lime wedge.',
    ],
    tags: ['Weeknight', 'High Protein', 'Bright & Fresh'],
    rating: 4.8, isFavorite: false, calories: 520,
  },
  {
    name: "Shepherd's Pie", emoji: '🥧',
    description: 'A cozy baked casserole of seasoned ground meat topped with mashed potatoes.',
    prepTime: 25, cookTime: 40, servings: 6, difficulty: 'medium',
    category: 'dinner', cuisine: 'British',
    ingredients: [
      { name: 'Ground lamb or beef', quantity: 600, unit: 'g' },
      { name: 'Potatoes', quantity: 1, unit: 'kg' },
      { name: 'Carrots, diced', quantity: 2, unit: 'ea' },
      { name: 'Peas', quantity: 1, unit: 'cup' },
      { name: 'Beef stock', quantity: 1, unit: 'cup' },
      { name: 'Butter', quantity: 3, unit: 'tbsp' },
      { name: 'Worcestershire sauce', quantity: 1, unit: 'tbsp' },
    ],
    steps: [
      'Boil potatoes until tender, then mash with butter and salt.',
      'Brown ground meat with carrots in a large pan.',
      'Stir in Worcestershire sauce and stock; simmer 10 minutes until thickened.',
      'Fold in peas and transfer to a baking dish.',
      'Spread mashed potatoes on top and rough up the surface with a fork.',
      'Bake at 400°F (200°C) for 20-25 minutes until golden.',
    ],
    tags: ['Comfort Food', 'Family Fav', 'Freezer-friendly'],
    rating: 4.7, isFavorite: false, calories: 570,
  },
  {
    name: 'Japanese Curry', emoji: '🍛',
    description: 'A mild, slightly sweet curry stew served over rice or with udon noodles.',
    prepTime: 15, cookTime: 40, servings: 4, difficulty: 'easy',
    category: 'dinner', cuisine: 'Japanese',
    ingredients: [
      { name: 'Chicken thighs or beef chunks', quantity: 500, unit: 'g' },
      { name: 'Japanese curry roux blocks', quantity: 0.5, unit: 'box' },
      { name: 'Potatoes', quantity: 2, unit: 'ea' },
      { name: 'Carrots', quantity: 2, unit: 'ea' },
      { name: 'Onion', quantity: 1, unit: 'ea' },
      { name: 'Rice', quantity: 2, unit: 'cups' },
    ],
    steps: [
      'Sauté onion until translucent, then brown the meat.',
      'Add potatoes, carrots, and enough water to cover.',
      'Simmer 20 minutes until vegetables are tender.',
      'Remove from heat and stir in curry roux blocks until dissolved.',
      'Simmer 5 more minutes until thickened.',
      'Serve over steamed rice.',
    ],
    tags: ['Family Fav', 'Kids Love It', 'One-pot'],
    rating: 4.7, isFavorite: false, calories: 560,
  },
  // ── Snacks ──
  {
    name: 'Hummus & Veggie Sticks', emoji: '🥕',
    description: 'Creamy homemade chickpea hummus with crunchy fresh vegetables.',
    prepTime: 10, cookTime: 0, servings: 6, difficulty: 'easy',
    category: 'snack', cuisine: 'Middle Eastern',
    ingredients: [
      { name: 'Chickpeas, cooked', quantity: 2, unit: 'cups' },
      { name: 'Tahini', quantity: 0.25, unit: 'cup' },
      { name: 'Lemon juice', quantity: 2, unit: 'tbsp' },
      { name: 'Garlic clove', quantity: 1, unit: 'ea' },
      { name: 'Olive oil', quantity: 3, unit: 'tbsp' },
      { name: 'Carrot and celery sticks', quantity: 3, unit: 'cups' },
    ],
    steps: [
      'Blend chickpeas, tahini, lemon juice, and garlic until smooth.',
      'Drizzle in olive oil while blending until creamy.',
      'Season with salt and a little water if too thick.',
      'Serve with carrot and celery sticks or pita chips.',
    ],
    tags: ['Vegetarian', 'No-cook', 'Healthy'],
    rating: 4.7, isFavorite: false, calories: 210,
  },
  {
    name: 'Trail Mix', emoji: '🥜',
    description: 'A customizable, energy-packed mix of nuts, dried fruit, and chocolate.',
    prepTime: 5, cookTime: 0, servings: 8, difficulty: 'easy',
    category: 'snack', cuisine: 'American',
    ingredients: [
      { name: 'Almonds', quantity: 1, unit: 'cup' },
      { name: 'Cashews', quantity: 1, unit: 'cup' },
      { name: 'Dried cranberries', quantity: 0.5, unit: 'cup' },
      { name: 'Mini chocolate chips', quantity: 0.5, unit: 'cup' },
      { name: 'Pretzel sticks', quantity: 1, unit: 'cup' },
    ],
    steps: [
      'Combine all ingredients in a large bowl.',
      'Toss to distribute evenly.',
      'Store in an airtight container or portion into snack bags.',
    ],
    tags: ['No-cook', 'On-the-go', 'Kids Love It'],
    rating: 4.6, isFavorite: false, calories: 260,
  },
  {
    name: 'Guacamole & Chips', emoji: '🥑',
    description: 'Fresh, chunky guacamole with lime and cilantro, perfect for dipping.',
    prepTime: 10, cookTime: 0, servings: 6, difficulty: 'easy',
    category: 'snack', cuisine: 'Mexican',
    ingredients: [
      { name: 'Ripe avocados', quantity: 3, unit: 'ea' },
      { name: 'Lime', quantity: 1, unit: 'ea' },
      { name: 'Red onion', quantity: 0.25, unit: 'ea' },
      { name: 'Cilantro', quantity: 0.25, unit: 'cup' },
      { name: 'Tomato, diced', quantity: 1, unit: 'ea' },
      { name: 'Tortilla chips', quantity: 4, unit: 'cups' },
    ],
    steps: [
      'Mash avocados to your preferred texture.',
      'Stir in lime juice, diced onion, cilantro, and tomato.',
      'Season with salt to taste.',
      'Serve immediately with tortilla chips.',
    ],
    tags: ['No-cook', 'Vegetarian', 'Party'],
    rating: 4.8, isFavorite: false, calories: 230,
  },
  {
    name: 'Korean Hotteok (Sweet Pancakes)', emoji: '🥞',
    description: 'Chewy Korean street-food pancakes filled with cinnamon-brown sugar syrup.',
    prepTime: 90, cookTime: 15, servings: 6, difficulty: 'medium',
    category: 'snack', cuisine: 'Korean',
    ingredients: [
      { name: 'Flour', quantity: 2, unit: 'cups' },
      { name: 'Glutinous rice flour', quantity: 0.25, unit: 'cup' },
      { name: 'Active dry yeast', quantity: 2, unit: 'tsp' },
      { name: 'Milk', quantity: 1, unit: 'cup' },
      { name: 'Brown sugar', quantity: 0.5, unit: 'cup' },
      { name: 'Cinnamon', quantity: 1, unit: 'tsp' },
      { name: 'Chopped walnuts', quantity: 0.25, unit: 'cup' },
    ],
    steps: [
      'Mix flour, rice flour, yeast, and warm milk into a soft dough. Let rise 1 hour.',
      'Combine brown sugar, cinnamon, and walnuts for the filling.',
      'Flatten a ball of dough, add a spoonful of filling, and seal into a ball.',
      'Fry on a griddle, flattening with a spatula, until golden on both sides.',
      'Serve warm — filling will be hot, so let cool slightly before biting in.',
    ],
    tags: ['Street Food', 'Sweet', 'Make-ahead dough'],
    rating: 4.7, isFavorite: false, calories: 290,
  },
  {
    name: 'Churros con Chocolate', emoji: '🍫',
    description: 'Crispy, cinnamon-sugared fried dough sticks with rich dipping chocolate.',
    prepTime: 15, cookTime: 20, servings: 6, difficulty: 'medium',
    category: 'snack', cuisine: 'Spanish',
    ingredients: [
      { name: 'Water', quantity: 1, unit: 'cup' },
      { name: 'Butter', quantity: 0.25, unit: 'cup' },
      { name: 'Flour', quantity: 1, unit: 'cup' },
      { name: 'Eggs', quantity: 2, unit: 'ea' },
      { name: 'Sugar', quantity: 0.5, unit: 'cup' },
      { name: 'Cinnamon', quantity: 1, unit: 'tsp' },
      { name: 'Dark chocolate, melted', quantity: 200, unit: 'g' },
      { name: 'Heavy cream', quantity: 0.5, unit: 'cup' },
    ],
    steps: [
      'Bring water and butter to a boil, then stir in flour until a dough forms.',
      'Beat in eggs one at a time until smooth and glossy.',
      'Pipe strips of dough into hot oil and fry until golden, 2-3 minutes.',
      'Toss warm churros in cinnamon sugar.',
      'Warm cream and pour over melted chocolate for a thick dipping sauce.',
    ],
    tags: ['Fried', 'Sweet', 'Party'],
    rating: 4.8, isFavorite: false, calories: 340,
  },
  {
    name: 'Caprese Skewers', emoji: '🍅',
    description: 'Bite-sized skewers of mozzarella, cherry tomatoes, and basil with balsamic glaze.',
    prepTime: 15, cookTime: 0, servings: 6, difficulty: 'easy',
    category: 'snack', cuisine: 'Italian',
    ingredients: [
      { name: 'Cherry tomatoes', quantity: 24, unit: 'ea' },
      { name: 'Fresh mozzarella balls', quantity: 24, unit: 'ea' },
      { name: 'Fresh basil leaves', quantity: 24, unit: 'ea' },
      { name: 'Balsamic glaze', quantity: 3, unit: 'tbsp' },
      { name: 'Olive oil', quantity: 1, unit: 'tbsp' },
    ],
    steps: [
      'Thread a tomato, basil leaf, and mozzarella ball onto small skewers.',
      'Arrange on a platter.',
      'Drizzle with olive oil and balsamic glaze just before serving.',
    ],
    tags: ['No-cook', 'Party', 'Vegetarian'],
    rating: 4.7, isFavorite: false, calories: 160,
  },
  {
    name: 'Energy Balls (No-Bake)', emoji: '⚡',
    description: 'No-bake oat and peanut butter bites for a quick, healthy pick-me-up.',
    prepTime: 15, cookTime: 0, servings: 12, difficulty: 'easy',
    category: 'snack', cuisine: 'American',
    ingredients: [
      { name: 'Rolled oats', quantity: 1, unit: 'cup' },
      { name: 'Peanut butter', quantity: 0.5, unit: 'cup' },
      { name: 'Honey', quantity: 0.33, unit: 'cup' },
      { name: 'Mini chocolate chips', quantity: 0.33, unit: 'cup' },
      { name: 'Chia seeds', quantity: 1, unit: 'tbsp' },
    ],
    steps: [
      'Combine all ingredients in a bowl until well mixed.',
      'Chill mixture in the fridge for 15 minutes to firm up.',
      'Roll into small balls.',
      'Store in the fridge in an airtight container for up to a week.',
    ],
    tags: ['No-bake', 'Healthy', 'Meal Prep'],
    rating: 4.7, isFavorite: false, calories: 140,
  },
  {
    name: 'Deviled Eggs', emoji: '🥚',
    description: 'Classic creamy deviled eggs with a touch of mustard and paprika.',
    prepTime: 15, cookTime: 10, servings: 6, difficulty: 'easy',
    category: 'snack', cuisine: 'American',
    ingredients: [
      { name: 'Eggs', quantity: 6, unit: 'ea' },
      { name: 'Mayonnaise', quantity: 0.25, unit: 'cup' },
      { name: 'Dijon mustard', quantity: 1, unit: 'tsp' },
      { name: 'Paprika', quantity: 0.5, unit: 'tsp' },
      { name: 'Chives', quantity: 1, unit: 'tbsp' },
    ],
    steps: [
      'Hard boil eggs, cool, peel, and slice in half lengthwise.',
      'Scoop out yolks and mash with mayonnaise and mustard.',
      'Pipe or spoon the yolk mixture back into the egg white halves.',
      'Sprinkle with paprika and chives before serving.',
    ],
    tags: ['Party', 'High Protein', 'Make-ahead'],
    rating: 4.7, isFavorite: false, calories: 80,
  },
  // ── Dessert ──
  {
    name: 'Tres Leches Cake', emoji: '🍰',
    description: 'An airy sponge cake soaked in three kinds of milk, topped with whipped cream.',
    prepTime: 20, cookTime: 30, servings: 10, difficulty: 'medium',
    category: 'dessert', cuisine: 'Mexican',
    ingredients: [
      { name: 'Flour', quantity: 1.5, unit: 'cups' },
      { name: 'Eggs', quantity: 5, unit: 'ea' },
      { name: 'Sugar', quantity: 1, unit: 'cup' },
      { name: 'Evaporated milk', quantity: 1, unit: 'can' },
      { name: 'Condensed milk', quantity: 1, unit: 'can' },
      { name: 'Heavy cream', quantity: 1.5, unit: 'cups' },
      { name: 'Vanilla extract', quantity: 1, unit: 'tsp' },
    ],
    steps: [
      'Bake a basic vanilla sponge cake in a 9x13 pan; let cool completely.',
      'Poke holes all over the cake with a fork.',
      'Whisk together evaporated milk, condensed milk, and 0.5 cup cream.',
      'Slowly pour the milk mixture over the cake, letting it soak in.',
      'Whip remaining cream with vanilla and spread over the top.',
      'Chill at least 2 hours before serving.',
    ],
    tags: ['Make-ahead', 'Party', 'Crowd Pleaser'],
    rating: 4.9, isFavorite: false, calories: 380,
  },
  {
    name: 'Mochi', emoji: '🍡',
    description: 'Chewy Japanese rice cakes with a sweet red bean or strawberry filling.',
    prepTime: 30, cookTime: 10, servings: 12, difficulty: 'medium',
    category: 'dessert', cuisine: 'Japanese',
    ingredients: [
      { name: 'Glutinous rice flour', quantity: 1, unit: 'cup' },
      { name: 'Sugar', quantity: 0.25, unit: 'cup' },
      { name: 'Water', quantity: 1, unit: 'cup' },
      { name: 'Cornstarch', quantity: 0.5, unit: 'cup' },
      { name: 'Sweet red bean paste', quantity: 1, unit: 'cup' },
    ],
    steps: [
      'Whisk rice flour, sugar, and water until smooth.',
      'Microwave in 1-minute intervals, stirring between, until thick and translucent.',
      'Dust a work surface generously with cornstarch and turn out the dough.',
      'Divide into small pieces, flatten, and wrap around a spoonful of red bean paste.',
      'Seal edges and dust off excess cornstarch.',
    ],
    tags: ['Gluten-free', 'Make-ahead', 'Festive'],
    rating: 4.6, isFavorite: false, calories: 150,
  },
  {
    name: 'Baklava', emoji: '🥮',
    description: 'Flaky layered phyllo pastry with chopped nuts and honey syrup.',
    prepTime: 30, cookTime: 45, servings: 16, difficulty: 'hard',
    category: 'dessert', cuisine: 'Greek',
    ingredients: [
      { name: 'Phyllo dough', quantity: 1, unit: 'package' },
      { name: 'Walnuts, chopped', quantity: 3, unit: 'cups' },
      { name: 'Butter, melted', quantity: 1, unit: 'cup' },
      { name: 'Honey', quantity: 1, unit: 'cup' },
      { name: 'Sugar', quantity: 0.5, unit: 'cup' },
      { name: 'Cinnamon', quantity: 1, unit: 'tsp' },
    ],
    steps: [
      'Mix walnuts with cinnamon and 2 tbsp sugar.',
      'Layer buttered phyllo sheets in a baking dish, 8-10 sheets deep.',
      'Sprinkle a layer of nut mixture, then repeat layering phyllo and nuts.',
      'Top with remaining phyllo sheets, brushing each with butter.',
      'Score into diamonds and bake at 350°F (175°C) for 45 minutes until golden.',
      'Simmer honey with sugar and pour over the hot baklava immediately after baking.',
    ],
    tags: ['Make-ahead', 'Festive', 'Nutty'],
    rating: 4.8, isFavorite: false, calories: 290,
  },
  {
    name: 'Canadian Butter Tarts', emoji: '🥧',
    description: 'Gooey, buttery-sweet mini tarts with a flaky pastry shell.',
    prepTime: 30, cookTime: 20, servings: 12, difficulty: 'medium',
    category: 'dessert', cuisine: 'Canadian',
    ingredients: [
      { name: 'Pie pastry rounds', quantity: 12, unit: 'ea' },
      { name: 'Brown sugar', quantity: 1, unit: 'cup' },
      { name: 'Butter, melted', quantity: 0.33, unit: 'cup' },
      { name: 'Eggs', quantity: 1, unit: 'ea' },
      { name: 'Corn syrup', quantity: 0.25, unit: 'cup' },
      { name: 'Vanilla extract', quantity: 1, unit: 'tsp' },
      { name: 'Raisins (optional)', quantity: 0.5, unit: 'cup' },
    ],
    steps: [
      'Press pastry rounds into a muffin tin.',
      'Whisk brown sugar, melted butter, egg, corn syrup, and vanilla.',
      'Sprinkle a few raisins into each pastry shell if using.',
      'Pour filling into each shell, filling about two-thirds full.',
      'Bake at 400°F (200°C) for 15-18 minutes until filling is bubbly and pastry golden.',
      'Cool before removing from the tin.',
    ],
    tags: ['Family Fav', 'Sweet', 'Make-ahead'],
    rating: 4.7, isFavorite: false, calories: 260,
  },
  {
    name: 'New York Cheesecake', emoji: '🍰',
    description: 'A dense, creamy classic cheesecake with a buttery graham cracker crust.',
    prepTime: 25, cookTime: 60, servings: 12, difficulty: 'hard',
    category: 'dessert', cuisine: 'American',
    ingredients: [
      { name: 'Graham cracker crumbs', quantity: 2, unit: 'cups' },
      { name: 'Butter, melted', quantity: 0.5, unit: 'cup' },
      { name: 'Cream cheese', quantity: 900, unit: 'g' },
      { name: 'Sugar', quantity: 1.25, unit: 'cups' },
      { name: 'Eggs', quantity: 4, unit: 'ea' },
      { name: 'Sour cream', quantity: 0.5, unit: 'cup' },
      { name: 'Vanilla extract', quantity: 1, unit: 'tsp' },
    ],
    steps: [
      'Mix graham crumbs with melted butter and press into a springform pan.',
      'Beat cream cheese and sugar until smooth.',
      'Add eggs one at a time, mixing on low after each.',
      'Blend in sour cream and vanilla.',
      'Pour over crust and bake at 325°F (160°C) in a water bath for 55-65 minutes.',
      'Cool completely, then chill at least 4 hours before slicing.',
    ],
    tags: ['Make-ahead', 'Party', 'Rich'],
    rating: 4.9, isFavorite: false, calories: 450,
  },
  {
    name: 'Tiramisu', emoji: '☕',
    description: 'Espresso-soaked ladyfingers layered with a silky mascarpone cream.',
    prepTime: 30, cookTime: 0, servings: 8, difficulty: 'medium',
    category: 'dessert', cuisine: 'Italian',
    ingredients: [
      { name: 'Ladyfinger cookies', quantity: 24, unit: 'ea' },
      { name: 'Mascarpone cheese', quantity: 500, unit: 'g' },
      { name: 'Eggs, separated', quantity: 4, unit: 'ea' },
      { name: 'Sugar', quantity: 0.5, unit: 'cup' },
      { name: 'Strong brewed coffee', quantity: 1.5, unit: 'cups' },
      { name: 'Cocoa powder', quantity: 2, unit: 'tbsp' },
    ],
    steps: [
      'Whisk egg yolks with sugar until pale, then fold in mascarpone.',
      'Whip egg whites to soft peaks and fold into the mascarpone mixture.',
      'Quickly dip each ladyfinger in coffee and layer in a dish.',
      'Spread half the mascarpone cream over the ladyfingers, then repeat layers.',
      'Dust generously with cocoa powder and chill at least 4 hours before serving.',
    ],
    tags: ['Make-ahead', 'No-bake', 'Party'],
    rating: 4.9, isFavorite: false, calories: 400,
  },
  {
    name: 'Apple Crumble', emoji: '🍎',
    description: 'Warm spiced apples under a buttery oat and brown sugar crumble topping.',
    prepTime: 15, cookTime: 40, servings: 6, difficulty: 'easy',
    category: 'dessert', cuisine: 'British-American',
    ingredients: [
      { name: 'Apples, sliced', quantity: 6, unit: 'ea' },
      { name: 'Rolled oats', quantity: 1, unit: 'cup' },
      { name: 'Flour', quantity: 0.75, unit: 'cup' },
      { name: 'Brown sugar', quantity: 0.75, unit: 'cup' },
      { name: 'Butter, cold', quantity: 0.5, unit: 'cup' },
      { name: 'Cinnamon', quantity: 1, unit: 'tsp' },
    ],
    steps: [
      'Toss apple slices with a sprinkle of sugar and cinnamon; spread in a baking dish.',
      'Combine oats, flour, brown sugar, and cinnamon.',
      'Cut in cold butter with a fork until crumbly.',
      'Sprinkle topping evenly over the apples.',
      'Bake at 375°F (190°C) for 35-40 minutes until golden and bubbling.',
      'Serve warm with vanilla ice cream.',
    ],
    tags: ['Comfort Food', 'Family Fav', 'Seasonal'],
    rating: 4.8, isFavorite: false, calories: 340,
  },
  {
    name: 'Banana Bread', emoji: '🍌',
    description: 'Moist, tender banana bread — the perfect way to use up ripe bananas.',
    prepTime: 15, cookTime: 60, servings: 10, difficulty: 'easy',
    category: 'dessert', cuisine: 'American',
    ingredients: [
      { name: 'Ripe bananas', quantity: 3, unit: 'ea' },
      { name: 'Butter, melted', quantity: 0.33, unit: 'cup' },
      { name: 'Sugar', quantity: 0.75, unit: 'cup' },
      { name: 'Eggs', quantity: 1, unit: 'ea' },
      { name: 'Flour', quantity: 1.5, unit: 'cups' },
      { name: 'Baking soda', quantity: 1, unit: 'tsp' },
      { name: 'Walnuts (optional)', quantity: 0.5, unit: 'cup' },
    ],
    steps: [
      'Mash bananas in a bowl, then stir in melted butter.',
      'Mix in sugar, egg, and vanilla.',
      'Sprinkle baking soda and salt over the mixture and stir in.',
      'Fold in flour just until combined, then add walnuts if using.',
      'Pour into a greased loaf pan and bake at 350°F (175°C) for 55-60 minutes.',
      'Cool in the pan 10 minutes, then transfer to a rack.',
    ],
    tags: ['Make-ahead', 'Family Fav', 'Uses ripe bananas'],
    rating: 4.8, isFavorite: false, calories: 290,
  },
];

export const useRecipesStore = create<RecipesState>()(
  persist(
    (set, get) => ({
      recipes: [],
      hasSeeded: false,
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
          hasSeeded: true,
        }),

      syncCatalogRecipes: () =>
        set((s) => {
          const existingNames = new Set(s.recipes.map((r) => r.name));
          const missing = DEMO.filter((r) => !existingNames.has(r.name));
          if (missing.length === 0) return { hasSeeded: true };
          return {
            recipes: [
              ...s.recipes,
              ...missing.map((r, i) => ({ ...r, id: `recipe-seed-catalog-${Date.now()}-${i}` })),
            ],
            hasSeeded: true,
          };
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
      partialize: (state) => ({ recipes: state.recipes, hasSeeded: state.hasSeeded }),
    }
  )
);
