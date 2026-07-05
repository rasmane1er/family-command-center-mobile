import { apiRequest } from '../api/client';
import type { Pet, PetEvent } from '../store/usePetStore';

export function fetchPets(): Promise<{ pets: Pet[]; events: PetEvent[] }> {
  return apiRequest('/pets');
}

export function createPet(p: Pet): Promise<{ pet: Pet }> {
  return apiRequest('/pets', { method: 'POST', body: JSON.stringify(p) });
}

export function deletePetRemote(id: string): Promise<void> {
  return apiRequest(`/pets/${id}`, { method: 'DELETE' });
}

export function createEvent(e: PetEvent): Promise<{ event: PetEvent }> {
  return apiRequest('/pets/events', { method: 'POST', body: JSON.stringify(e) });
}

export function updateEventRemote(id: string, updates: Partial<PetEvent>): Promise<{ event: PetEvent }> {
  return apiRequest(`/pets/events/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteEventRemote(id: string): Promise<void> {
  return apiRequest(`/pets/events/${id}`, { method: 'DELETE' });
}
