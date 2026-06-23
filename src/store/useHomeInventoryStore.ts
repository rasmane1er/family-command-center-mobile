import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

type InventoryRoom =
  | 'living_room'
  | 'kitchen'
  | 'master_bedroom'
  | 'bedroom_2'
  | 'bedroom_3'
  | 'bathroom'
  | 'garage'
  | 'office'
  | 'basement'
  | 'attic'
  | 'outdoor'
  | 'other';

type ItemCondition = 'excellent' | 'good' | 'fair' | 'poor';

type ItemCategory =
  | 'electronics'
  | 'furniture'
  | 'appliance'
  | 'jewelry'
  | 'clothing'
  | 'tools'
  | 'sports'
  | 'collectible'
  | 'other';

interface InventoryItem {
  id: string;
  familyId: string;
  room: InventoryRoom;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  category: ItemCategory;
  condition: ItemCondition;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  warrantyExpiry?: string;
  notes?: string;
}

interface HomeInventoryState {
  items: InventoryItem[];
  addItem: (i: Omit<InventoryItem, 'id'>) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  getTotalValue: () => number;
  getItemsByRoom: (room: InventoryRoom) => InventoryItem[];
  seedDemoData: () => void;
}

export const useHomeInventoryStore = create<HomeInventoryState>((set, get) => ({
  items: [],

  addItem: (i) =>
    set((s) => ({ items: [...s.items, { ...i, id: generateId() }] })),

  updateItem: (id, updates) =>
    set((s) => ({
      items: s.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),

  deleteItem: (id) =>
    set((s) => ({ items: s.items.filter((item) => item.id !== id) })),

  getTotalValue: () =>
    get().items.reduce((sum, item) => sum + (item.currentValue ?? 0), 0),

  getItemsByRoom: (room) =>
    get().items.filter((item) => item.room === room),

  seedDemoData: () => {
    const familyId = 'demo-family';
    const items: InventoryItem[] = [
      {
        id: generateId(),
        familyId,
        room: 'living_room',
        name: 'Samsung 65" TV',
        brand: 'Samsung',
        model: 'QN65Q80C',
        category: 'electronics',
        condition: 'excellent',
        purchaseDate: '2022-11-25',
        purchasePrice: 1999,
        currentValue: 1800,
        warrantyExpiry: '2027-11-25',
      },
      {
        id: generateId(),
        familyId,
        room: 'living_room',
        name: 'Sofa',
        brand: 'Pottery Barn',
        model: 'Comfort Grand',
        category: 'furniture',
        condition: 'good',
        purchaseDate: '2021-03-15',
        purchasePrice: 1800,
        currentValue: 1200,
      },
      {
        id: generateId(),
        familyId,
        room: 'kitchen',
        name: 'Refrigerator',
        brand: 'KitchenAid',
        model: 'KRFF507HPS',
        category: 'appliance',
        condition: 'good',
        purchaseDate: '2021-06-01',
        purchasePrice: 2100,
        currentValue: 1400,
        warrantyExpiry: '2026-06-01',
      },
      {
        id: generateId(),
        familyId,
        room: 'kitchen',
        name: 'Dishwasher',
        brand: 'Bosch',
        model: 'SHPM88Z75N',
        category: 'appliance',
        condition: 'good',
        purchaseDate: '2021-06-01',
        purchasePrice: 900,
        currentValue: 600,
        warrantyExpiry: '2026-06-01',
      },
      {
        id: generateId(),
        familyId,
        room: 'master_bedroom',
        name: 'MacBook Pro',
        brand: 'Apple',
        model: 'MacBook Pro 16"',
        serialNumber: 'SN-MBP2023',
        category: 'electronics',
        condition: 'excellent',
        purchaseDate: '2023-01-10',
        purchasePrice: 2499,
        currentValue: 2200,
        warrantyExpiry: '2026-01-10',
      },
      {
        id: generateId(),
        familyId,
        room: 'master_bedroom',
        name: 'King Bed',
        brand: 'Casper',
        model: 'Wave Hybrid King',
        category: 'furniture',
        condition: 'excellent',
        purchaseDate: '2022-04-20',
        purchasePrice: 1200,
        currentValue: 900,
      },
      {
        id: generateId(),
        familyId,
        room: 'garage',
        name: 'Lawn Mower',
        brand: 'Craftsman',
        model: 'M310 RP',
        category: 'tools',
        condition: 'good',
        purchaseDate: '2020-05-01',
        purchasePrice: 550,
        currentValue: 400,
        warrantyExpiry: '2025-05-01',
      },
      {
        id: generateId(),
        familyId,
        room: 'garage',
        name: 'Power Tools Set',
        brand: 'DeWalt',
        model: 'DCK940D2',
        category: 'tools',
        condition: 'good',
        purchaseDate: '2021-12-25',
        purchasePrice: 650,
        currentValue: 500,
      },
      {
        id: generateId(),
        familyId,
        room: 'office',
        name: 'Dell Monitor',
        brand: 'Dell',
        model: 'U2722D',
        category: 'electronics',
        condition: 'excellent',
        purchaseDate: '2022-08-15',
        purchasePrice: 500,
        currentValue: 350,
        warrantyExpiry: '2025-08-15',
      },
      {
        id: generateId(),
        familyId,
        room: 'office',
        name: 'Desk',
        brand: 'Uplift',
        model: 'V2 Standing Desk',
        category: 'furniture',
        condition: 'excellent',
        purchaseDate: '2022-01-05',
        purchasePrice: 800,
        currentValue: 600,
      },
      {
        id: generateId(),
        familyId,
        room: 'living_room',
        name: 'Coffee Table',
        brand: 'IKEA',
        model: 'STOCKHOLM',
        category: 'furniture',
        condition: 'good',
        purchaseDate: '2020-09-01',
        purchasePrice: 350,
        currentValue: 200,
      },
      {
        id: generateId(),
        familyId,
        room: 'kitchen',
        name: 'Stand Mixer',
        brand: 'KitchenAid',
        model: 'Artisan Series 5 Qt',
        category: 'appliance',
        condition: 'excellent',
        purchaseDate: '2021-11-28',
        purchasePrice: 450,
        currentValue: 380,
        warrantyExpiry: '2026-11-28',
      },
    ];
    set({ items });
  },
}));
