import { apiRequest } from '../api/client';
import type { MarketplaceListing } from '../types';

export function fetchMarketplaceListings(): Promise<{ listings: MarketplaceListing[] }> {
  return apiRequest('/marketplace-listings');
}

export function createMarketplaceListing(listing: MarketplaceListing): Promise<{ listing: MarketplaceListing }> {
  return apiRequest('/marketplace-listings', { method: 'POST', body: JSON.stringify(listing) });
}

export function updateMarketplaceListingRemote(
  id: string,
  updates: Partial<MarketplaceListing>
): Promise<{ listing: MarketplaceListing }> {
  return apiRequest(`/marketplace-listings/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteMarketplaceListingRemote(id: string): Promise<void> {
  return apiRequest(`/marketplace-listings/${id}`, { method: 'DELETE' });
}
