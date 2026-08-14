import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWeatherStore } from '../../store/useWeatherStore';
import { useAuthStore } from '../../store/useAuthStore';

function weatherIcon(description: string): string {
  const d = description.toLowerCase();
  if (d.includes('sun') || d.includes('clear')) return '☀️';
  if (d.includes('cloud')) return '⛅';
  if (d.includes('rain') || d.includes('drizzle')) return '🌧️';
  if (d.includes('thunder') || d.includes('storm')) return '⛈️';
  if (d.includes('snow')) return '❄️';
  if (d.includes('fog') || d.includes('mist')) return '🌫️';
  return '🌤️';
}

export function WeatherWidget() {
  const weather = useWeatherStore((s) => s.weather);
  const isLoading = useWeatherStore((s) => s.isLoading);
  const refresh = useWeatherStore((s) => s.refresh);
  const fallbackCity = useAuthStore((s) => s.user?.city) || 'New York';

  if (isLoading && !weather) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color="#6366f1" size="small" />
        <Text style={styles.loadingText}>Getting your location…</Text>
      </View>
    );
  }

  if (!weather) return null;

  return (
    <Pressable accessibilityRole="button" style={styles.container} onPress={() => refresh(fallbackCity)}>
      <View style={styles.left}>
        <Text style={styles.icon}>{weatherIcon(weather.description)}</Text>
        <View>
          <Text style={styles.temp}>{weather.tempF}°F</Text>
          <Text style={styles.desc}>{weather.description}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.statRow}>
          <Ionicons name="arrow-up" size={11} color="#ef4444" />
          <Text style={styles.statText}>{weather.highF}°</Text>
          <Ionicons name="arrow-down" size={11} color="#3b82f6" style={{ marginLeft: 8 }} />
          <Text style={styles.statText}>{weather.lowF}°</Text>
        </View>
        <View style={styles.statRow}>
          <Ionicons name="water-outline" size={11} color="#64748b" />
          <Text style={styles.statText}>{weather.humidity}%</Text>
          <Ionicons name="partly-sunny-outline" size={11} color="#64748b" style={{ marginLeft: 8 }} />
          <Text style={styles.statText}>{weather.windMph} mph</Text>
        </View>
        {weather.rainAfter && (
          <View style={styles.rainRow}>
            <Text style={styles.rainText}>🌧 Rain after {weather.rainAfter}</Text>
          </View>
        )}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.3)" />
          <Text style={styles.cityText}>{weather.city}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingContainer: { justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 36 },
  temp: { fontSize: 22, fontWeight: '800', color: '#fff' },
  desc: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  right: { alignItems: 'flex-end', gap: 4 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginLeft: 2 },
  rainRow: { marginTop: 2 },
  rainText: { fontSize: 11, color: '#fbbf24' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  cityText: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
});
