import { create } from 'zustand';
import * as Location from 'expo-location';
import { apiRequest } from '../api/client';

export interface WeatherData {
  city: string;
  tempF: number;
  tempC: number;
  highF: number;
  lowF: number;
  highC: number;
  lowC: number;
  description: string;
  humidity: number;
  windMph: number;
  rainAfter: string | null;
}

interface WeatherStore {
  weather: WeatherData | null;
  fetchedAt: number | null;
  isLoading: boolean;
  error: string | null;
  // fetch() auto-detects GPS location; falls back to `fallbackCity` if denied/unavailable
  fetch: (fallbackCity?: string) => Promise<void>;
  // Force a refresh ignoring the cache (e.g. user taps refresh)
  refresh: (fallbackCity?: string) => Promise<void>;
}

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getCoords(): Promise<{ lat: number; lon: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    // Use last-known position first (instant). Falls back to a fresh fix if null.
    const last = await Location.getLastKnownPositionAsync({});
    if (last) return { lat: last.coords.latitude, lon: last.coords.longitude };
    const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return { lat: fresh.coords.latitude, lon: fresh.coords.longitude };
  } catch {
    return null;
  }
}

async function doFetch(fallbackCity = 'New York'): Promise<WeatherData> {
  const coords = await getCoords();
  if (coords) {
    return apiRequest<WeatherData>(
      `/weather?lat=${coords.lat}&lon=${coords.lon}`,
    );
  }
  return apiRequest<WeatherData>(`/weather?city=${encodeURIComponent(fallbackCity)}`);
}

export const useWeatherStore = create<WeatherStore>((set, get) => ({
  weather: null,
  fetchedAt: null,
  isLoading: false,
  error: null,

  fetch: async (fallbackCity = 'New York') => {
    const { fetchedAt, isLoading } = get();
    if (isLoading) return;
    if (fetchedAt && Date.now() - fetchedAt < CACHE_TTL) return;

    set({ isLoading: true, error: null });
    try {
      const data = await doFetch(fallbackCity);
      set({ weather: data, fetchedAt: Date.now(), isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Could not load weather' });
    }
  },

  refresh: async (fallbackCity = 'New York') => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const data = await doFetch(fallbackCity);
      set({ weather: data, fetchedAt: Date.now(), isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Could not load weather' });
    }
  },
}));
