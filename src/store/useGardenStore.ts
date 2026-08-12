import { create } from 'zustand';

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

const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString();
const daysAhead = (n: number) => new Date(today.getTime() + n * 86400000).toISOString();

const DEMO_PLANTS: Plant[] = [
  {
    id: generateId(),
    name: 'Cherry Tomatoes',
    type: 'vegetable',
    location: 'Backyard Raised Bed',
    status: 'growing',
    plantedDate: daysAgo(45),
    harvestDate: daysAhead(30),
    wateringFrequency: 'every-2-days',
    lastWatered: daysAgo(3),
    nextWatering: daysAgo(1),
    sunlight: 'full-sun',
    notes: 'Yellow variety, staked at 12 inches',
    emoji: '🍅',
    createdAt: daysAgo(45),
  },
  {
    id: generateId(),
    name: 'Basil',
    type: 'herb',
    location: 'Kitchen Window',
    status: 'growing',
    plantedDate: daysAgo(30),
    wateringFrequency: 'every-2-days',
    lastWatered: daysAgo(1),
    nextWatering: daysAhead(1),
    sunlight: 'full-sun',
    notes: 'Genovese variety, pinch flowers to extend harvest',
    emoji: '🌿',
    createdAt: daysAgo(30),
  },
  {
    id: generateId(),
    name: 'Sunflowers',
    type: 'flower',
    location: 'Front Bed',
    status: 'flowering',
    plantedDate: daysAgo(60),
    wateringFrequency: 'every-3-days',
    lastWatered: daysAgo(4),
    nextWatering: daysAgo(1),
    sunlight: 'full-sun',
    notes: 'Mammoth variety, 8 feet tall',
    emoji: '🌻',
    createdAt: daysAgo(60),
  },
  {
    id: generateId(),
    name: 'Blueberry Bush',
    type: 'shrub',
    location: 'Side Yard',
    status: 'harvesting',
    plantedDate: daysAgo(365),
    harvestDate: daysAhead(14),
    wateringFrequency: 'weekly',
    lastWatered: daysAgo(6),
    nextWatering: daysAhead(1),
    sunlight: 'full-sun',
    notes: 'Acidify soil annually, bird netting needed',
    emoji: '🫐',
    createdAt: daysAgo(365),
  },
  {
    id: generateId(),
    name: 'Mint',
    type: 'herb',
    location: 'Back Porch Pots',
    status: 'growing',
    plantedDate: daysAgo(20),
    wateringFrequency: 'every-2-days',
    lastWatered: daysAgo(2),
    nextWatering: today.toISOString(),
    sunlight: 'partial-shade',
    notes: 'Keep contained, spreads aggressively',
    emoji: '🌱',
    createdAt: daysAgo(20),
  },
  {
    id: generateId(),
    name: 'Lemon Tree',
    type: 'tree',
    location: 'Backyard',
    status: 'growing',
    plantedDate: daysAgo(180),
    wateringFrequency: 'weekly',
    lastWatered: daysAgo(8),
    nextWatering: daysAgo(1),
    sunlight: 'full-sun',
    notes: 'Meyer lemon, fertilize monthly',
    emoji: '🍋',
    createdAt: daysAgo(180),
  },
  {
    id: generateId(),
    name: 'Snake Plant',
    type: 'indoor',
    location: 'Living Room',
    status: 'growing',
    plantedDate: daysAgo(200),
    wateringFrequency: 'bi-weekly',
    lastWatered: daysAgo(10),
    nextWatering: daysAhead(4),
    sunlight: 'partial-shade',
    notes: 'Low maintenance, air purifier',
    emoji: '🪴',
    createdAt: daysAgo(200),
  },
];

const DEMO_TASKS: GardenTask[] = [
  {
    id: generateId(),
    title: 'Fertilize tomato plants',
    dueDate: today.toISOString(),
    completed: false,
    category: 'fertilizing',
    createdAt: daysAgo(2),
  },
  {
    id: generateId(),
    title: 'Harvest ripe blueberries',
    dueDate: today.toISOString(),
    completed: false,
    category: 'harvesting',
    createdAt: daysAgo(1),
  },
  {
    id: generateId(),
    title: 'Prune sunflower dead leaves',
    dueDate: daysAhead(2),
    completed: false,
    category: 'pruning',
    createdAt: daysAgo(3),
  },
  {
    id: generateId(),
    title: 'Apply neem oil for pests',
    dueDate: daysAhead(3),
    completed: false,
    category: 'pest-control',
    createdAt: daysAgo(1),
  },
  {
    id: generateId(),
    title: 'Plant fall garlic bulbs',
    dueDate: daysAhead(7),
    completed: false,
    category: 'planting',
    createdAt: daysAgo(0),
  },
];

export const useGardenStore = create<GardenState>()((set, get) => ({
  plants: DEMO_PLANTS,
  tasks: DEMO_TASKS,

  addPlant: (plant) =>
    set((s) => ({
      plants: [
        ...s.plants,
        { ...plant, id: generateId(), createdAt: new Date().toISOString() },
      ],
    })),

  updatePlant: (id, updates) =>
    set((s) => ({
      plants: s.plants.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  waterPlant: (id) =>
    set((s) => ({
      plants: s.plants.map((p) => {
        if (p.id !== id) return p;
        const now = new Date();
        return {
          ...p,
          lastWatered: now.toISOString(),
          nextWatering: calcNextWatering(p.wateringFrequency, now),
        };
      }),
    })),

  removePlant: (id) =>
    set((s) => ({ plants: s.plants.filter((p) => p.id !== id) })),

  addTask: (task) =>
    set((s) => ({
      tasks: [
        ...s.tasks,
        { ...task, id: generateId(), createdAt: new Date().toISOString() },
      ],
    })),

  completeTask: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, completed: true } : t)),
    })),

  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

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
}));
