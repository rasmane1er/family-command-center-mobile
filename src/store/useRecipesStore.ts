import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    (set) => ({
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
    }),
    { name: 'recipes-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
