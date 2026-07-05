import { apiRequest } from '../api/client';
import type { GiftIdea } from '../store/useGiftStore';

interface CreateGiftInput extends Omit<GiftIdea, 'familyId'> {}
interface UpdateGiftInput extends Partial<Omit<GiftIdea, 'id' | 'familyId' | 'createdAt'>> {}

export function fetchGifts(): Promise<{ gifts: GiftIdea[] }> {
  return apiRequest('/gifts');
}

export function createGift(gift: CreateGiftInput): Promise<{ gift: GiftIdea }> {
  return apiRequest('/gifts', {
    method: 'POST',
    body: JSON.stringify(gift),
  });
}

export function updateGiftRemote(id: string, updates: UpdateGiftInput): Promise<{ gift: GiftIdea }> {
  return apiRequest(`/gifts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function deleteGiftRemote(id: string): Promise<void> {
  return apiRequest(`/gifts/${id}`, { method: 'DELETE' });
}
