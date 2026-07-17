import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as petService from '../services/petService';

import { generateId } from '../utils/generateId';

export type PetSpecies = 'dog' | 'cat' | 'bird' | 'fish' | 'rabbit' | 'other';
export type PetEventType = 'vet' | 'grooming' | 'medication' | 'vaccine' | 'feeding' | 'other';

export interface Pet {
  id: string;
  familyId: string;
  name: string;
  species: PetSpecies;
  breed?: string;
  dateOfBirth?: string;
  weight?: number;
  vetName?: string;
  vetPhone?: string;
  notes?: string;
  avatarColor: string;
  emoji: string;
}

export interface PetEvent {
  id: string;
  petId: string;
  type: PetEventType;
  title: string;
  date: string;
  notes?: string;
  isDone: boolean;
  cost?: number;
}

interface PetState {
  pets: Pet[];
  events: PetEvent[];
  isLoaded: boolean;
  addPet: (p: Omit<Pet, 'id'>) => Promise<void>;
  deletePet: (id: string) => void;
  addEvent: (e: Omit<PetEvent, 'id'>) => Promise<void>;
  toggleEvent: (id: string) => void;
  deleteEvent: (id: string) => void;
  fetchFromServer: () => Promise<void>;
}

export const usePetStore = create<PetState>()(
  persist(
    (set, get) => ({
  pets: [],
  events: [],
  isLoaded: false,
  addPet: async (p) => {
    const newPet = { ...p, id: generateId() };
    set((s) => ({ pets: [newPet, ...s.pets] }));
    try {
      await petService.createPet(newPet);
    } catch {
      set((s) => ({ pets: s.pets.filter((x) => x.id !== newPet.id) }));
    }
  },
  deletePet: (id) => {
    const prev = get().pets;
    const prevEvents = get().events;
    set((s) => ({ pets: s.pets.filter((p) => p.id !== id), events: s.events.filter((e) => e.petId !== id) }));
    petService.deletePetRemote(id).catch(() => { set({ pets: prev, events: prevEvents }); });
  },
  addEvent: async (e) => {
    const newEvent = { ...e, id: generateId() };
    set((s) => ({ events: [newEvent, ...s.events] }));
    try {
      await petService.createEvent(newEvent);
    } catch {
      set((s) => ({ events: s.events.filter((x) => x.id !== newEvent.id) }));
    }
  },
  toggleEvent: (id) => {
    set((s) => ({ events: s.events.map((e) => e.id === id ? { ...e, isDone: !e.isDone } : e) }));
    const event = get().events.find((e) => e.id === id);
    if (event) petService.updateEventRemote(id, { isDone: event.isDone }).catch(() => {});
  },
  deleteEvent: (id) => {
    const prev = get().events;
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    petService.deleteEventRemote(id).catch(() => { set({ events: prev }); });
  },
  fetchFromServer: async () => {
    try {
      const { pets, events } = await petService.fetchPets();
      set({ pets, events, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
    }),
    {
      name: 'family-command-center-pets',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
