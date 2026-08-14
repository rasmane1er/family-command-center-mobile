import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDailyBrief } from '../../hooks/useDailyBrief';
import { useWeatherStore } from '../../store/useWeatherStore';
import { useAuthStore } from '../../store/useAuthStore';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function weatherIcon(description: string): string {
  const d = description.toLowerCase();
  if (d.includes('sun') || d.includes('clear')) return '☀️';
  if (d.includes('cloud'))  return '⛅';
  if (d.includes('rain') || d.includes('drizzle')) return '🌧️';
  if (d.includes('thunder') || d.includes('storm')) return '⛈️';
  if (d.includes('snow'))  return '❄️';
  if (d.includes('fog') || d.includes('mist')) return '🌫️';
  return '🌤️';
}

export function DailyBriefCard() {
  const { brief, isLoading, error, refresh } = useDailyBrief();
  const weather    = useWeatherStore((s) => s.weather);
  const fetchWeather = useWeatherStore((s) => s.fetch);
  const refreshWeather = useWeatherStore((s) => s.refresh);
  const city       = useAuthStore((s) => s.user?.city);
  const [expanded, setExpanded] = useState(true);

  // Fetch weather when the card mounts — auto-detects GPS location,
  // falls back to stored city. This is the sole trigger now that the
  // standalone WeatherWidget has been removed.
  useEffect(() => {
    fetchWeather(city).catch(() => {});
  }, []);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }

  function handleRefresh() {
    refresh();
    refreshWeather(city).catch(() => {});
  }

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['#0f2952', '#1a3a6e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header row */}
        <Pressable accessibilityRole="button" style={styles.header} onPress={toggle}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>🌅</Text>
            <Text style={styles.headerTitle}>Daily Brief</Text>
          </View>
          <View style={styles.headerRight}>
            {weather && (
              <Text style={styles.weatherChip}>
                {weatherIcon(weather.description)} {weather.tempF}°F
                {weather.rainAfter ? `  🌧 after ${weather.rainAfter}` : ''}
              </Text>
            )}
            <Pressable accessibilityRole="button" onPress={handleRefresh} hitSlop={8} style={{ marginLeft: 10 }}>
              <Ionicons name="refresh" size={16} color="rgba(255,255,255,0.5)" />
            </Pressable>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="rgba(255,255,255,0.5)"
              style={{ marginLeft: 6 }}
            />
          </View>
        </Pressable>

        {/* Body */}
        {expanded && (
          <>

            {isLoading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" />
                <Text style={styles.loadingText}>Generating your brief…</Text>
              </View>
            )}

            {error && !isLoading && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {brief && !isLoading && (
              <>
                <Text style={styles.greeting}>{brief.greeting}</Text>
                <Text style={styles.summary}>{brief.summary}</Text>

                <View style={styles.divider} />

                {brief.items.map((item, i) => (
                  <View key={i} style={styles.itemRow}>
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    <Text style={styles.itemText}>{item.text}</Text>
                  </View>
                ))}

                {brief.tip && (
                  <View style={styles.tipRow}>
                    <Ionicons name="bulb-outline" size={14} color="#fbbf24" />
                    <Text style={styles.tipText}>{brief.tip}</Text>
                  </View>
                )}
              </>
            )}

            {!brief && !isLoading && !error && (
              <Pressable accessibilityRole="button" onPress={handleRefresh} style={styles.emptyRow}>
                <Text style={styles.emptyText}>Tap to generate your morning brief</Text>
              </Pressable>
            )}
          </>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginTop: 12 },
  card: { borderRadius: 18, padding: 16, overflow: 'hidden' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIcon:  { fontSize: 18 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  weatherChip: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  loadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  loadingText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  errorText:   { fontSize: 13, color: '#fca5a5', marginTop: 10 },

  greeting:    { fontSize: 17, fontWeight: '800', color: '#fff', marginTop: 14 },
  summary:     { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, lineHeight: 19 },
  divider:     { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },

  itemRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
  itemIcon:    { fontSize: 16, width: 22, textAlign: 'center', marginTop: 1 },
  itemText:    { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19 },

  tipRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 10, backgroundColor: 'rgba(251,191,36,0.12)', borderRadius: 10, padding: 10 },
  tipText:     { flex: 1, fontSize: 12, color: '#fbbf24', lineHeight: 18 },

  emptyRow:    { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  emptyText:   { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
});
