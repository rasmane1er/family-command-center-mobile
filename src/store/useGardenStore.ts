import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as gardenService from '../services/gardenService';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type PlantType = 'vegetable' | 'fruit' | 'herb' | 'flower' | 'tree' | 'shrub' | 'indoor' | 'lawn';
export type PlantStatus = 'seed' | 'seedling' | 'growing' | 'flowering' | 'harvesting' | 'dormant' | 'dead';
export type WateringFrequency = 'daily' | 'every-2-days' | 'every-3-days' | 'weekly' | 'bi-weekly' | 'monthly';

export interface Plant {
  id: string;
  name: string;
  type: PlantType;
  location: string;
  status: PlantStatus;
  plantedDate: string;
  harvestDate?: string;
  wateringFrequency: WateringFrequency;
  lastWatered?: string;
  nextWatering?: string;
  sunlight: 'full-sun' | 'partial-shade' | 'full-shade';
  notes: string;
  emoji: string;
  createdAt: string;
}

export interface GardenTask {
  id: string;
  plantId?: string;
  title: string;
  dueDate: string;
  completed: boolean;
  category: 'watering' | 'fertilizing' | 'pruning' | 'harvesting' | 'planting' | 'pest-control' | 'other';
  createdAt: string;
  // True for a watering reminder derived live from a plant's own watering
  // schedule, rather than something the family typed in manually — see
  // getAutoWateringTasks(). Never persisted; regenerated on every read.
  auto?: boolean;
}

interface GardenState {
  plants: Plant[];
  tasks: GardenTask[];
  addPlant: (plant: Omit<Plant, 'id' | 'createdAt'>) => void;
  updatePlant: (id: string, updates: Partial<Plant>) => void;
  waterPlant: (id: string) => void;
  removePlant: (id: string) => void;
  addTask: (task: Omit<GardenTask, 'id' | 'createdAt'>) => void;
  completeTask: (id: string) => void;
  removeTask: (id: string) => void;
  getPlantsNeedingWater: () => Plant[];
  getTasksDueToday: () => GardenTask[];
  // Auto-generates a "Water {plant}" reminder for every plant whose
  // schedule says it's due, so the Tasks tab surfaces watering without the
  // family having to separately duplicate it as a manual task — that's the
  // "automated" half of the watering flow. Skips any plant that already has
  // its own incomplete manually-created watering task, so nothing doubles up.
  getAutoWateringTasks: () => GardenTask[];
  fetchFromServer: () => Promise<void>;
}

function calcNextWatering(freq: WateringFrequency, from: Date): string {
  const d = new Date(from);
  switch (freq) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'every-2-days': d.setDate(d.getDate() + 2); break;
    case 'every-3-days': d.setDate(d.getDate() + 3); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'bi-weekly': d.setDate(d.getDate() + 14); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
  }
  return d.toISOString();
}

export const useGardenStore = create<GardenState>()(
  persist(
    (set, get) => ({
  // A fresh family's garden starts empty — GardenPlannerScreen already has
  // a real "No plants yet, tap + to add" empty state for this. Shipping
  // the same 7 hardcoded demo plants to every family regardless of what
  // they actually planted was never real data, just a permanent fake
  // default (same issue already fixed this way in useEmergencyStore).
  plants: [],
  tasks: [],

  addPlant: (plant) => {
    const newPlant: Plant = { ...plant, id: generateId(), createdAt: new Date().toISOString() };
    set((s) => ({ plants: [...s.plants, newPlant] }));
    gardenService.createPlant(newPlant).catch(() => {
      set((s) => ({ plants: s.plants.filter((p) => p.id !== newPlant.id) }));
    });
  },

  updatePlant: (id, updates) => {
    const prev = get().plants;
    set((s) => ({
      plants: s.plants.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    gardenService.updatePlantRemote(id, updates).catch(() => { set({ plants: prev }); });
  },

  waterPlant: (id) => {
    const prev = get().plants;
    const now = new Date();
    const plant = prev.find((p) => p.id === id);
    if (!plant) return;
    const updates = { lastWatered: now.toISOString(), nextWatering: calcNextWatering(plant.wateringFrequency, now) };
    set((s) => ({
      plants: s.plants.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    gardenService.updatePlantRemote(id, updates).catch(() => { set({ plants: prev }); });
  },

  removePlant: (id) => {
    const prev = get().plants;
    set((s) => ({ plants: s.plants.filter((p) => p.id !== id) }));
    gardenService.deletePlantRemote(id).catch(() => { set({ plants: prev }); });
  },

  addTask: (task) => {
    const newTask: GardenTask = { ...task, id: generateId(), createdAt: new Date().toISOString() };
    set((s) => ({ tasks: [...s.tasks, newTask] }));
    gardenService.createGardenTask(newTask).catch(() => {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== newTask.id) }));
    });
  },

  completeTask: (id) => {
    const prev = get().tasks;
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, completed: true } : t)),
    }));
    gardenService.completeGardenTaskRemote(id).catch(() => { set({ tasks: prev }); });
  },

  removeTask: (id) => {
    const prev = get().tasks;
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    gardenService.deleteGardenTaskRemote(id).catch(() => { set({ tasks: prev }); });
  },

  getPlantsNeedingWater: () => {
    const now = new Date();
    return get().plants.filter((p) => {
      if (!p.nextWatering) return false;
      return new Date(p.nextWatering) <= now;
    });
  },

  getTasksDueToday: () => {
    const todayStr = new Date().toDateString();
    return get().tasks.filter(
      (t) => !t.completed && new Date(t.dueDate).toDateString() === todayStr
    );
  },

  getAutoWateringTasks: () => {
    const { plants, tasks } = get();
    const now = new Date();
    return plants
      .filter((p) => p.nextWatering && new Date(p.nextWatering) <= now)
      .filter((p) => !tasks.some((t) => !t.completed && t.category === 'watering' && t.plantId === p.id))
      .map((p) => ({
        id: `auto-water-${p.id}`,
        plantId: p.id,
        title: `Water ${p.name}`,
        dueDate: p.nextWatering!,
        completed: false,
        category: 'watering' as const,
        createdAt: p.nextWatering!,
        auto: true,
      }));
  },

  fetchFromServer: async () => {
    try {
      const [{ plants }, { tasks }] = await Promise.all([
        gardenService.fetchPlants(),
        gardenService.fetchGardenTasks(),
      ]);
      set({ plants, tasks });
    } catch {
      // offline or backend unreachable — keep whatever is already local.
    }
  },
    }),
    {
      name: 'family-command-center-garden',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ plants: state.plants, tasks: state.tasks }),
    }
  )
);
