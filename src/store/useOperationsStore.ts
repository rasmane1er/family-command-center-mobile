import { enqueueSync } from '../sync/enqueueSync';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { PantryItem, ShoppingList, MealPlan, Asset, Vehicle, Document } from '../types';

interface OperationsState {
  pantryItems: PantryItem[];
  shoppingLists: ShoppingList[];
  mealPlans: MealPlan[];
  assets: Asset[];
  vehicles: Vehicle[];
  documents: Document[];

  addPantryItem: (item: PantryItem) => void;
  updatePantryItem: (id: string, updates: Partial<PantryItem>) => void;
  deletePantryItem: (id: string) => void;
  addShoppingList: (list: ShoppingList) => void;
  updateShoppingList: (id: string, updates: Partial<ShoppingList>) => void;
  setMealPlan: (plan: MealPlan) => void;
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  addVehicle: (v: Vehicle) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  addDocument: (d: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  seedDemoData: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useOperationsStore = create<OperationsState>()(
  persist(
    (set) => ({
  pantryItems: [],
  shoppingLists: [],
  mealPlans: [],
  assets: [],
  vehicles: [],
  documents: [],

  addPantryItem: (item) => {
  set((s) => ({ pantryItems: [...s.pantryItems, item] }));

  enqueueSync({
    entity: 'operations',
    action: 'create',
    payload: { type: 'pantryItem', data: item },
  });
},
  updatePantryItem: (id, updates) =>
    set((s) => ({ pantryItems: s.pantryItems.map((i) => (i.id === id ? { ...i, ...updates } : i)) })),
  deletePantryItem: (id) => {
  set((s) => ({ pantryItems: s.pantryItems.filter((i) => i.id !== id) }));

  enqueueSync({
    entity: 'operations',
    action: 'delete',
    payload: { type: 'pantryItem', id },
  });
},
  addShoppingList: (list) => set((s) => ({ shoppingLists: [...s.shoppingLists, list] })),
  updateShoppingList: (id, updates) =>
    set((s) => ({ shoppingLists: s.shoppingLists.map((l) => (l.id === id ? { ...l, ...updates } : l)) })),
  setMealPlan: (plan) =>
    set((s) => {
      const exists = s.mealPlans.find((p) => p.id === plan.id);
      return {
        mealPlans: exists
          ? s.mealPlans.map((p) => (p.id === plan.id ? plan : p))
          : [...s.mealPlans, plan],
      };
    }),
  addAsset: (asset) => set((s) => ({ assets: [...s.assets, asset] })),
  updateAsset: (id, updates) =>
    set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)) })),
  deleteAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),
  addVehicle: (v) => {
  set((s) => ({ vehicles: [...s.vehicles, v] }));

  enqueueSync({
    entity: 'operations',
    action: 'create',
    payload: { type: 'vehicle', data: v },
  });
},
  updateVehicle: (id, updates) =>
    set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)) })),
  deleteVehicle: (id) => set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) })),
  addDocument: (d) => {
  set((s) => ({ documents: [...s.documents, d] }));

  enqueueSync({
    entity: 'operations',
    action: 'create',
    payload: { type: 'document', data: d },
  });
},
  updateDocument: (id, updates) =>
    set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)) })),
  deleteDocument: (id) => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

  seedDemoData: () => {
    const familyId = 'demo-family';
    const now = new Date().toISOString();
    const today = new Date();

    const pantryItems: PantryItem[] = [
      { id: generateId(), familyId, name: 'Chicken Breast', category: 'Meat', quantity: 4, unit: 'lbs', expiryDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), location: 'Refrigerator', minQuantity: 2, updatedAt: now },
      { id: generateId(), familyId, name: 'Brown Rice', category: 'Grains', quantity: 5, unit: 'lbs', location: 'Pantry', minQuantity: 1, updatedAt: now },
      { id: generateId(), familyId, name: 'Whole Milk', category: 'Dairy', quantity: 1, unit: 'gallon', expiryDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), location: 'Refrigerator', minQuantity: 0.5, updatedAt: now },
      { id: generateId(), familyId, name: 'Eggs', category: 'Dairy', quantity: 12, unit: 'count', expiryDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(), location: 'Refrigerator', minQuantity: 6, updatedAt: now },
      { id: generateId(), familyId, name: 'Olive Oil', category: 'Condiments', quantity: 1, unit: 'bottle', location: 'Pantry', minQuantity: 1, updatedAt: now },
      { id: generateId(), familyId, name: 'Pasta', category: 'Grains', quantity: 3, unit: 'boxes', location: 'Pantry', minQuantity: 1, updatedAt: now },
      { id: generateId(), familyId, name: 'Tomato Sauce', category: 'Canned', quantity: 4, unit: 'cans', location: 'Pantry', minQuantity: 2, updatedAt: now },
      { id: generateId(), familyId, name: 'Mixed Vegetables', category: 'Frozen', quantity: 2, unit: 'bags', location: 'Freezer', minQuantity: 1, updatedAt: now },
      { id: generateId(), familyId, name: 'Orange Juice', category: 'Beverages', quantity: 0.5, unit: 'gallon', expiryDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), location: 'Refrigerator', minQuantity: 1, updatedAt: now },
      { id: generateId(), familyId, name: 'Greek Yogurt', category: 'Dairy', quantity: 3, unit: 'cups', expiryDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(), location: 'Refrigerator', minQuantity: 2, updatedAt: now },
    ];

    const vehicles: Vehicle[] = [
      {
        id: 'vehicle-1',
        familyId,
        make: 'Toyota',
        model: 'Camry',
        year: 2021,
        color: 'Silver',
        licensePlate: 'ABC 1234',
        vin: '1HGCM82633A123456',
        mileage: 35420,
        fuelType: 'Gasoline',
        insuranceExpiry: new Date(today.getFullYear(), today.getMonth() + 6, 1).toISOString(),
        registrationExpiry: new Date(today.getFullYear() + 1, 2, 15).toISOString(),
        lastService: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        nextService: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        primaryDriver: 'member-1',
      },
      {
        id: 'vehicle-2',
        familyId,
        make: 'Honda',
        model: 'CR-V',
        year: 2022,
        color: 'Blue',
        licensePlate: 'XYZ 5678',
        mileage: 22180,
        fuelType: 'Gasoline',
        insuranceExpiry: new Date(today.getFullYear(), today.getMonth() + 4, 1).toISOString(),
        registrationExpiry: new Date(today.getFullYear() + 1, 5, 30).toISOString(),
        lastService: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        nextService: new Date(today.getTime() + 135 * 24 * 60 * 60 * 1000).toISOString(),
        primaryDriver: 'member-2',
      },
    ];

    const documents: Document[] = [
      { id: generateId(), familyId, memberId: 'member-1', title: "Marcus's Passport", category: 'identity', expiryDate: '2029-03-15', issuer: 'US Department of State', isShared: false, isSensitive: true, createdAt: now, updatedAt: now },
      { id: generateId(), familyId, memberId: 'member-2', title: "Sarah's Driver License", category: 'identity', expiryDate: '2027-07-22', issuer: 'Illinois DMV', isShared: false, isSensitive: true, createdAt: now, updatedAt: now },
      { id: generateId(), familyId, title: 'Home Insurance Policy', category: 'insurance', expiryDate: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString(), issuer: 'State Farm', isShared: true, isSensitive: false, createdAt: now, updatedAt: now },
      { id: generateId(), familyId, title: 'Birth Certificates', category: 'identity', isShared: true, isSensitive: true, notes: 'All 4 family members', createdAt: now, updatedAt: now },
      { id: generateId(), familyId, title: 'Mortgage Documents', category: 'financial', isShared: true, isSensitive: true, issuer: 'First National Bank', createdAt: now, updatedAt: now },
      { id: generateId(), familyId, memberId: 'member-3', title: "Aiden's School Records", category: 'education', isShared: false, isSensitive: false, createdAt: now, updatedAt: now },
    ];

    const assets: Asset[] = [
      { id: generateId(), familyId, name: 'Family Home', category: 'Real Estate', value: 485000, purchaseDate: '2019-06-15', purchasePrice: 380000, location: '123 Maple Street', createdAt: now },
      { id: generateId(), familyId, name: 'MacBook Pro', category: 'Electronics', value: 2200, purchaseDate: '2023-01-10', purchasePrice: 2499, warrantyExpiry: '2025-01-10', createdAt: now },
      { id: generateId(), familyId, name: 'Living Room Furniture', category: 'Furniture', value: 3500, purchaseDate: '2021-03-20', purchasePrice: 4200, createdAt: now },
    ];

    set({ pantryItems, vehicles, documents, assets });
  },
    }),
    {
      name: 'family-command-center-operations',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        pantryItems: state.pantryItems,
        shoppingLists: state.shoppingLists,
        mealPlans: state.mealPlans,
        assets: state.assets,
        vehicles: state.vehicles,
        documents: state.documents,
      }),
    }
  )
);
