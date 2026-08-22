import { apiRequest } from '../api/client';
import type { Caregiver, Booking } from '../types';

export function fetchCaregivers(): Promise<{ caregivers: Caregiver[] }> {
  return apiRequest('/childcare/caregivers');
}

export function createCaregiver(caregiver: Caregiver): Promise<{ caregiver: Caregiver }> {
  return apiRequest('/childcare/caregivers', { method: 'POST', body: JSON.stringify(caregiver) });
}

export function updateCaregiverRemote(id: string, updates: Partial<Caregiver>): Promise<{ caregiver: Caregiver }> {
  return apiRequest(`/childcare/caregivers/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteCaregiverRemote(id: string): Promise<void> {
  return apiRequest(`/childcare/caregivers/${id}`, { method: 'DELETE' });
}

export function fetchBookings(): Promise<{ bookings: Booking[] }> {
  return apiRequest('/childcare/bookings');
}

export function createBooking(booking: Booking): Promise<{ booking: Booking }> {
  return apiRequest('/childcare/bookings', { method: 'POST', body: JSON.stringify(booking) });
}

export function updateBookingRemote(id: string, updates: Partial<Booking>): Promise<{ booking: Booking }> {
  return apiRequest(`/childcare/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}
