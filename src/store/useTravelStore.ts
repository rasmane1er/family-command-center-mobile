import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as travelService from '../services/travelService';

export type TripStatus = 'planning' | 'upcoming' | 'active' | 'completed';
export type ItineraryItemType = 'transport' | 'accommodation' | 'activity' | 'dining' | 'other';

export interface PackingItem {
  id: string;
  name: string;
  category: string;
  isPacked: boolean;
  assignedTo?: string;
  quantity: number;
}

export interface ItineraryItem {
  id: string;
  date: string;
  time: string;
  title: string;
  location: string;
  type: ItineraryItemType;
  notes?: string;
  cost?: number;
}

export interface Trip {
  id: string;
  familyId: string;
  name: string;
  destination: string;
  emoji: string;
  startDate: string;
  endDate: string;
  budget: number;
  // No "spent" field — deliberately. It used to be a manually-set number
  // that never updated when itinerary items were added/priced, so it
  // silently drifted from reality. "Spent" is always
  // trip.itinerary.reduce((s,i)=>s+(i.cost ?? 0),0) computed live wherever
  // it's displayed — nothing to drift.
  color: string;
  attendeeIds: string[];
  itinerary: ItineraryItem[];
  packingList: PackingItem[];
  status: TripStatus;
  notes?: string;
}

interface TravelStore {
  trips: Trip[];
  isLoaded: boolean;
  addTrip: (trip: Omit<Trip, 'id' | 'itinerary' | 'packingList'>) => Promise<void>;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  addItineraryItem: (tripId: string, item: Omit<ItineraryItem, 'id'>) => void;
  deleteItineraryItem: (tripId: string, itemId: string) => void;
  togglePackingItem: (tripId: string, itemId: string) => void;
  addPackingItem: (tripId: string, item: Omit<PackingItem, 'id'>) => void;
  deletePackingItem: (tripId: string, itemId: string) => void;
  fetchFromServer: () => Promise<void>;
}

export const useTravelStore = create<TravelStore>()(
  persist(
    (set, get) => {
      const syncTrip = (tripId: string) => {
        const trip = get().trips.find((t) => t.id === tripId);
        if (trip) {
          travelService.updateTripRemote(tripId, { itinerary: trip.itinerary, packingList: trip.packingList }).catch(() => {});
        }
      };

      return {
      trips: [],
      isLoaded: false,

      addTrip: async (trip) => {
        const newTrip: Trip = { ...trip, id: `trip-${Date.now()}`, itinerary: [], packingList: [] };
        set((s) => ({ trips: [...s.trips, newTrip] }));
        try {
          await travelService.createTrip(newTrip);
        } catch {
          set((s) => ({ trips: s.trips.filter((t) => t.id !== newTrip.id) }));
        }
      },

      updateTrip: (id, updates) => {
        set((s) => ({ trips: s.trips.map((t) => (t.id === id ? { ...t, ...updates } : t)) }));
        travelService.updateTripRemote(id, updates).catch(() => {});
      },

      deleteTrip: (id) => {
        const prev = get().trips;
        set((s) => ({ trips: s.trips.filter((t) => t.id !== id) }));
        travelService.deleteTripRemote(id).catch(() => { set({ trips: prev }); });
      },

      addItineraryItem: (tripId, item) => {
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? { ...t, itinerary: [...t.itinerary, { ...item, id: `itin-${Date.now()}` }] }
              : t
          ),
        }));
        syncTrip(tripId);
      },

      deleteItineraryItem: (tripId, itemId) => {
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId ? { ...t, itinerary: t.itinerary.filter((i) => i.id !== itemId) } : t
          ),
        }));
        syncTrip(tripId);
      },

      togglePackingItem: (tripId, itemId) => {
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? { ...t, packingList: t.packingList.map((p) => (p.id === itemId ? { ...p, isPacked: !p.isPacked } : p)) }
              : t
          ),
        }));
        syncTrip(tripId);
      },

      deletePackingItem: (tripId, itemId) => {
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId ? { ...t, packingList: t.packingList.filter((p) => p.id !== itemId) } : t
          ),
        }));
        syncTrip(tripId);
      },

      addPackingItem: (tripId, item) => {
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? { ...t, packingList: [...t.packingList, { ...item, id: `pack-${Date.now()}` }] }
              : t
          ),
        }));
        syncTrip(tripId);
      },

      fetchFromServer: async () => {
        try {
          const { trips } = await travelService.fetchTrips();
          set({ trips, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },
      };
    },
    { name: 'travel-store', storage: createJSONStorage(() => mmkvStorage) }
  )
);
