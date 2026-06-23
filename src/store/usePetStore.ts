import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

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
  addPet: (p: Omit<Pet, 'id'>) => void;
  deletePet: (id: string) => void;
  addEvent: (e: Omit<PetEvent, 'id'>) => void;
  toggleEvent: (id: string) => void;
  deleteEvent: (id: string) => void;
  seedDemoData: () => void;
}

export const usePetStore = create<PetState>((set) => ({
  pets: [],
  events: [],
  addPet: (p) => set((s) => ({ pets: [{ ...p, id: generateId() }, ...s.pets] })),
  deletePet: (id) => set((s) => ({ pets: s.pets.filter((p) => p.id !== id), events: s.events.filter((e) => e.petId !== id) })),
  addEvent: (e) => set((s) => ({ events: [{ ...e, id: generateId() }, ...s.events] })),
  toggleEvent: (id) => set((s) => ({ events: s.events.map((e) => e.id === id ? { ...e, isDone: !e.isDone } : e) })),
  deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
  seedDemoData: () => {
    const pets: Pet[] = [
      { id: 'pet1', familyId: 'demo-family', name: 'Buddy', species: 'dog', breed: 'Golden Retriever', dateOfBirth: '2020-03-15', weight: 65, vetName: 'Dr. Smith', vetPhone: '555-0180', avatarColor: '#F5A623', emoji: '🐕', notes: 'Loves fetch, allergic to chicken' },
      { id: 'pet2', familyId: 'demo-family', name: 'Luna', species: 'cat', breed: 'Tabby Mix', dateOfBirth: '2021-07-20', weight: 9, vetName: 'Dr. Smith', vetPhone: '555-0180', avatarColor: '#8E44AD', emoji: '🐈', notes: 'Indoor only, shy around strangers' },
    ];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const events: PetEvent[] = [
      { id: 'ev1', petId: 'pet1', type: 'vet', title: "Buddy's Annual Checkup", date: nextWeek, isDone: false, cost: 120, notes: 'Bring vaccination records' },
      { id: 'ev2', petId: 'pet1', type: 'grooming', title: 'Grooming appointment', date: tomorrow, isDone: false, cost: 65 },
      { id: 'ev3', petId: 'pet2', type: 'vaccine', title: "Luna's Rabies Booster", date: nextWeek, isDone: false, cost: 45 },
      { id: 'ev4', petId: 'pet1', type: 'medication', title: 'Heartworm medication', date: new Date().toISOString().split('T')[0], isDone: true, cost: 25, notes: 'Monthly - Heartgard Plus' },
    ];
    set({ pets, events });
  },
}));
