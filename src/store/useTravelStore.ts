import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  name: string;
  destination: string;
  emoji: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  color: string;
  attendeeIds: string[];
  itinerary: ItineraryItem[];
  packingList: PackingItem[];
  status: TripStatus;
  notes?: string;
}

interface TravelStore {
  trips: Trip[];
  addTrip: (trip: Omit<Trip, 'id' | 'itinerary' | 'packingList' | 'spent'>) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  addItineraryItem: (tripId: string, item: Omit<ItineraryItem, 'id'>) => void;
  togglePackingItem: (tripId: string, itemId: string) => void;
  addPackingItem: (tripId: string, item: Omit<PackingItem, 'id'>) => void;
  seedDemoData: () => void;
}

export const useTravelStore = create<TravelStore>()(
  persist(
    (set) => ({
      trips: [],

      addTrip: (trip) => set((s) => ({
        trips: [...s.trips, { ...trip, id: `trip-${Date.now()}`, itinerary: [], packingList: [], spent: 0 }],
      })),

      updateTrip: (id, updates) => set((s) => ({
        trips: s.trips.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      })),

      deleteTrip: (id) => set((s) => ({ trips: s.trips.filter((t) => t.id !== id) })),

      addItineraryItem: (tripId, item) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, itinerary: [...t.itinerary, { ...item, id: `itin-${Date.now()}` }] }
            : t
        ),
      })),

      togglePackingItem: (tripId, itemId) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, packingList: t.packingList.map((p) => (p.id === itemId ? { ...p, isPacked: !p.isPacked } : p)) }
            : t
        ),
      })),

      addPackingItem: (tripId, item) => set((s) => ({
        trips: s.trips.map((t) =>
          t.id === tripId
            ? { ...t, packingList: [...t.packingList, { ...item, id: `pack-${Date.now()}` }] }
            : t
        ),
      })),

      seedDemoData: () => set((s) => {
        if (s.trips.length > 0) return s;
        const trips: Trip[] = [
          {
            id: 'trip-1',
            name: 'Hawaii Family Vacation',
            destination: 'Maui, Hawaii',
            emoji: '🌺',
            startDate: '2026-08-10',
            endDate: '2026-08-17',
            budget: 8000,
            spent: 3240,
            color: '#2980B9',
            attendeeIds: ['member-1', 'member-2', 'member-3', 'member-4'],
            status: 'planning',
            notes: 'Book luau dinner by end of month!',
            itinerary: [
              { id: 'i-1', date: '2026-08-10', time: '08:00', title: 'Flight to Maui', location: 'DFW → OGG', type: 'transport', cost: 1800 },
              { id: 'i-2', date: '2026-08-10', time: '14:00', title: 'Check in — Grand Wailea', location: 'Wailea, Maui', type: 'accommodation', cost: 4200, notes: 'Ocean view rooms x2' },
              { id: 'i-3', date: '2026-08-11', time: '09:00', title: 'Road to Hana Tour', location: 'Hana Highway', type: 'activity', cost: 0 },
              { id: 'i-4', date: '2026-08-12', time: '07:30', title: 'Snorkeling at Molokini', location: 'Molokini Crater', type: 'activity', cost: 320 },
              { id: 'i-5', date: '2026-08-13', time: '19:00', title: 'Luau Dinner', location: 'Old Lahaina Luau', type: 'dining', cost: 480 },
              { id: 'i-6', date: '2026-08-17', time: '10:00', title: 'Flight Home', location: 'OGG → DFW', type: 'transport', notes: '2 hr drive to airport' },
            ],
            packingList: [
              { id: 'p-1', name: 'Passports', category: 'Documents', isPacked: true, quantity: 4 },
              { id: 'p-2', name: 'Sunscreen SPF 50+', category: 'Health', isPacked: true, quantity: 3 },
              { id: 'p-3', name: 'Snorkel Gear', category: 'Activities', isPacked: false, quantity: 4 },
              { id: 'p-4', name: 'Beach Towels', category: 'Beach', isPacked: false, quantity: 4 },
              { id: 'p-5', name: 'Sandals', category: 'Clothing', isPacked: false, quantity: 8 },
              { id: 'p-6', name: 'Travel Insurance Docs', category: 'Documents', isPacked: false, quantity: 1 },
              { id: 'p-7', name: 'Swimsuits', category: 'Clothing', isPacked: true, quantity: 8 },
              { id: 'p-8', name: 'Camera', category: 'Electronics', isPacked: false, quantity: 1 },
              { id: 'p-9', name: 'Kids Activity Books', category: 'Entertainment', isPacked: false, quantity: 2 },
              { id: 'p-10', name: 'First Aid Kit', category: 'Health', isPacked: false, quantity: 1 },
            ],
          },
          {
            id: 'trip-2',
            name: 'Disney World',
            destination: 'Orlando, Florida',
            emoji: '🏰',
            startDate: '2025-12-26',
            endDate: '2025-12-31',
            budget: 5000,
            spent: 5000,
            color: '#8E44AD',
            attendeeIds: ['member-1', 'member-2', 'member-3', 'member-4'],
            status: 'completed',
            itinerary: [
              { id: 'di-1', date: '2025-12-26', time: '07:00', title: 'Drive to Orlando', location: 'Home → MCO', type: 'transport' },
              { id: 'di-2', date: '2025-12-26', time: '15:00', title: 'Check in — Disney Boardwalk', location: 'Disney Boardwalk', type: 'accommodation', cost: 2800 },
              { id: 'di-3', date: '2025-12-27', time: '08:00', title: 'Magic Kingdom All Day', location: 'Magic Kingdom', type: 'activity', cost: 800 },
            ],
            packingList: [],
            notes: 'Best trip ever! Kids loved every minute.',
          },
        ];
        return { trips };
      }),
    }),
    { name: 'travel-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
