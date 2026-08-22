import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { PantryItem, MealPlan, Asset, Vehicle, Document } from '../types';
import * as assetService from '../services/assetService';
import * as pantryService from '../services/pantryService';
import * as vehicleService from '../services/vehicleService';
import * as documentService from '../services/documentService';
import { apiRequest } from '../api/client';

interface OperationsState {
  pantryItems: PantryItem[];
  mealPlans: MealPlan[];
  assets: Asset[];
  vehicles: Vehicle[];
  documents: Document[];
  isLoaded: boolean;

  addPantryItem: (item: PantryItem) => void;
  addPantryItemsBulk: (items: PantryItem[]) => void;
  updatePantryItem: (id: string, updates: Partial<PantryItem>) => void;
  deletePantryItem: (id: string) => void;
  setMealPlan: (plan: MealPlan, familyId?: string) => void;
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  addVehicle: (v: Vehicle) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  addDocument: (d: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  fetchFromServer: (familyId?: string) => Promise<void>;
}

import { generateId } from '../utils/generateId';

export const useOperationsStore = create<OperationsState>()(
  persist(
    (set, get) => ({
  pantryItems: [],
  mealPlans: [],
  assets: [],
  vehicles: [],
  documents: [],
  isLoaded: false,

  addPantryItem: (item) => {
    set((s) => ({ pantryItems: [...s.pantryItems, item] }));
    pantryService.createPantryItem(item).catch(() => {
      set((s) => ({ pantryItems: s.pantryItems.filter((i) => i.id !== item.id) }));
    });
  },
  addPantryItemsBulk: (items) => {
    set((s) => ({ pantryItems: [...s.pantryItems, ...items] }));
    pantryService.createPantryItemsBulk(items).catch(() => {
      const ids = new Set(items.map((i) => i.id));
      set((s) => ({ pantryItems: s.pantryItems.filter((i) => !ids.has(i.id)) }));
    });
  },
  updatePantryItem: (id, updates) => {
    const prev = get().pantryItems;
    set((s) => ({ pantryItems: s.pantryItems.map((i) => (i.id === id ? { ...i, ...updates } : i)) }));
    pantryService.updatePantryItemRemote(id, updates).catch(() => { set({ pantryItems: prev }); });
  },
  deletePantryItem: (id) => {
    const prev = get().pantryItems;
    set((s) => ({ pantryItems: s.pantryItems.filter((i) => i.id !== id) }));
    pantryService.deletePantryItemRemote(id).catch(() => { set({ pantryItems: prev }); });
  },
  setMealPlan: (plan, familyId) => {
    set((s) => {
      const exists = s.mealPlans.find((p) => p.weekStart === plan.weekStart);
      return {
        mealPlans: exists
          ? s.mealPlans.map((p) => (p.weekStart === plan.weekStart ? plan : p))
          : [...s.mealPlans, plan],
      };
    });
    const fid = familyId ?? plan.familyId;
    if (fid) {
      apiRequest(`/meal-plans/${fid}`, {
        method: 'PUT',
        body: JSON.stringify({ weekStart: plan.weekStart, meals: plan.meals }),
      }).catch(() => {});
    }
  },
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
    vehicleService.createVehicle(v).catch(() => {
      set((s) => ({ vehicles: s.vehicles.filter((x) => x.id !== v.id) }));
    });
  },
  updateVehicle: (id, updates) => {
    const prev = get().vehicles;
    set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)) }));
    vehicleService.updateVehicleRemote(id, updates).catch(() => { set({ vehicles: prev }); });
  },
  deleteVehicle: (id) => {
    const prev = get().vehicles;
    set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) }));
    vehicleService.deleteVehicleRemote(id).catch(() => { set({ vehicles: prev }); });
  },
  addDocument: (d) => {
    set((s) => ({ documents: [...s.documents, d] }));
    documentService.createDocument(d).catch(() => {
      set((s) => ({ documents: s.documents.filter((x) => x.id !== d.id) }));
    });
  },
  updateDocument: (id, updates) => {
    const prev = get().documents;
    set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)) }));
    documentService.updateDocumentRemote(id, updates).catch(() => { set({ documents: prev }); });
  },
  deleteDocument: (id) => {
    const prev = get().documents;
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
    documentService.deleteDocumentRemote(id).catch(() => { set({ documents: prev }); });
  },

  fetchFromServer: async (familyId) => {
    try {
      const [{ assets }, { items }, mealRes, { vehicles }, { documents }] = await Promise.all([
        assetService.fetchAssets(),
        pantryService.fetchPantryItems(),
        familyId
          ? apiRequest<{ mealPlans: MealPlan[] }>(`/meal-plans/${familyId}`).catch(() => ({ mealPlans: [] as MealPlan[] }))
          : Promise.resolve({ mealPlans: [] as MealPlan[] }),
        vehicleService.fetchVehicles(),
        documentService.fetchDocuments(),
      ]);
      set({ assets, pantryItems: items, mealPlans: mealRes.mealPlans, vehicles, documents, isLoaded: true });
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
        mealPlans: state.mealPlans,
        assets: state.assets,
        vehicles: state.vehicles,
        documents: state.documents,
        isLoaded: state.isLoaded,
      }),
    }
  )
);
