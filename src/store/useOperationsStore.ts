import { enqueueSync } from '../sync/enqueueSync';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { PantryItem, ShoppingList, MealPlan, Asset, Vehicle, Document } from '../types';
import * as assetService from '../services/assetService';

interface OperationsState {
  pantryItems: PantryItem[];
  shoppingLists: ShoppingList[];
  mealPlans: MealPlan[];
  assets: Asset[];
  vehicles: Vehicle[];
  documents: Document[];
  isLoaded: boolean;

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
  fetchFromServer: () => Promise<void>;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useOperationsStore = create<OperationsState>()(
  persist(
    (set, get) => ({
  pantryItems: [],
  shoppingLists: [],
  mealPlans: [],
  assets: [],
  vehicles: [],
  documents: [],
  isLoaded: false,

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
  addAsset: (asset) => {
    set((s) => ({ assets: [...s.assets, asset] }));
    assetService.createAsset(asset).catch(() => {
      set((s) => ({ assets: s.assets.filter((a) => a.id !== asset.id) }));
    });
  },
  updateAsset: (id, updates) => {
    const prev = get().assets;
    set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)) }));
    assetService.updateAssetRemote(id, updates).catch(() => { set({ assets: prev }); });
  },
  deleteAsset: (id) => {
    const prev = get().assets;
    set((s) => ({ assets: s.assets.filter((a) => a.id !== id) }));
    assetService.deleteAssetRemote(id).catch(() => { set({ assets: prev }); });
  },
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

  fetchFromServer: async () => {
    try {
      const { assets } = await assetService.fetchAssets();
      set({ assets, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
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
        isLoaded: state.isLoaded,
      }),
    }
  )
);
