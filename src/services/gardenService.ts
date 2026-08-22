import { apiRequest } from '../api/client';
import type { Plant, GardenTask } from '../store/useGardenStore';

export function fetchPlants(): Promise<{ plants: Plant[] }> {
  return apiRequest('/garden/plants');
}

export function createPlant(plant: Plant): Promise<{ plant: Plant }> {
  return apiRequest('/garden/plants', { method: 'POST', body: JSON.stringify(plant) });
}

export function updatePlantRemote(id: string, updates: Partial<Plant>): Promise<{ plant: Plant }> {
  return apiRequest(`/garden/plants/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deletePlantRemote(id: string): Promise<void> {
  return apiRequest(`/garden/plants/${id}`, { method: 'DELETE' });
}

export function fetchGardenTasks(): Promise<{ tasks: GardenTask[] }> {
  return apiRequest('/garden/tasks');
}

export function createGardenTask(task: GardenTask): Promise<{ task: GardenTask }> {
  return apiRequest('/garden/tasks', { method: 'POST', body: JSON.stringify(task) });
}

export function completeGardenTaskRemote(id: string): Promise<{ task: GardenTask }> {
  return apiRequest(`/garden/tasks/${id}`, { method: 'PATCH' });
}

export function deleteGardenTaskRemote(id: string): Promise<void> {
  return apiRequest(`/garden/tasks/${id}`, { method: 'DELETE' });
}
