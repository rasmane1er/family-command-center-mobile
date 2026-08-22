import { apiRequest } from '../api/client';
import type { Recipe } from '../store/useRecipesStore';

export function fetchRecipes(): Promise<{ recipes: Recipe[] }> {
  return apiRequest('/recipes');
}

export function createRecipe(recipe: Recipe): Promise<{ recipe: Recipe }> {
  return apiRequest('/recipes', { method: 'POST', body: JSON.stringify(recipe) });
}

export function toggleRecipeFavoriteRemote(id: string): Promise<{ recipe: Recipe }> {
  return apiRequest(`/recipes/${id}/favorite`, { method: 'PATCH' });
}
