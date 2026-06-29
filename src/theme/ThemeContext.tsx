import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/useAppStore';

/* ── Light palette (existing) ── */
export const lightColors = {
  primary: '#0F2952',
  primaryLight: '#1E4A8A',
  primaryDark: '#081730',
  secondary: '#F5A623',
  secondaryLight: '#FFD166',
  accent: '#00D4AA',
  accentLight: '#4EECD0',

  success: '#27AE60',
  successLight: '#D5F5E3',
  warning: '#F39C12',
  warningLight: '#FEF9E7',
  danger: '#E74C3C',
  dangerLight: '#FDEDEC',
  info: '#2980B9',
  infoLight: '#D6EAF8',

  background: '#F0F3F9',
  backgroundDark: '#0D1B2A',
  card: '#FFFFFF',
  cardDark: '#132338',
  border: '#E4EAF2',
  borderDark: '#1E3A5F',
  surface: '#F8FAFD',

  text: '#0D1B2A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  textDark: '#F4F6FB',

  gradientPrimary: ['#0F2952', '#1E4A8A'] as const,
  gradientSecondary: ['#F5A623', '#FF8C42'] as const,
  gradientAccent: ['#00D4AA', '#0099CC'] as const,
  gradientSuccess: ['#27AE60', '#1ABC9C'] as const,
  gradientDanger: ['#E74C3C', '#C0392B'] as const,
  gradientDark: ['#0D1B2A', '#132338'] as const,
  gradientSunrise: ['#0F2952', '#1E4A8A', '#F5A623'] as const,

  categories: {
    food: '#FF6B6B', transport: '#4ECDC4', housing: '#45B7D1',
    health: '#96CEB4', education: '#FFEAA7', entertainment: '#DDA0DD',
    savings: '#27AE60', utilities: '#95A5A6', clothing: '#F39C12', other: '#BDC3C7',
  },
  avatars: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F5A623', '#00D4AA'],
  gold: '#FFD700', silver: '#C0C0C0', bronze: '#CD7F32',
  militaryGreen: '#4A5E3A', militaryGreenLight: '#6B8C5A',
};

/* ── Dark palette ── */
export const darkColors = {
  primary: '#4A8FD9',
  primaryLight: '#6EB0F5',
  primaryDark: '#2060B0',
  secondary: '#F5A623',
  secondaryLight: '#FFD166',
  accent: '#00D4AA',
  accentLight: '#4EECD0',

  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#292000',
  danger: '#F87171',
  dangerLight: '#2D0A0A',
  info: '#60A5FA',
  infoLight: '#0C1E3A',

  background: '#080E1A',
  backgroundDark: '#040810',
  card: '#0F1929',
  cardDark: '#0A1220',
  border: '#1A2D4A',
  borderDark: '#122240',
  surface: '#0C1525',

  text: '#E2EAF5',
  textSecondary: '#7A9CC0',
  textMuted: '#4A6A8A',
  textInverse: '#0D1B2A',
  textDark: '#F4F6FB',

  gradientPrimary: ['#0A1E3D', '#1040A0'] as const,
  gradientSecondary: ['#F5A623', '#FF8C42'] as const,
  gradientAccent: ['#00D4AA', '#0099CC'] as const,
  gradientSuccess: ['#059669', '#0D9488'] as const,
  gradientDanger: ['#DC2626', '#B91C1C'] as const,
  gradientDark: ['#040810', '#080E1A'] as const,
  gradientSunrise: ['#0A1E3D', '#1040A0', '#F5A623'] as const,

  categories: {
    food: '#FF6B6B', transport: '#4ECDC4', housing: '#45B7D1',
    health: '#96CEB4', education: '#FFEAA7', entertainment: '#DDA0DD',
    savings: '#34D399', utilities: '#95A5A6', clothing: '#F39C12', other: '#BDC3C7',
  },
  avatars: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F5A623', '#00D4AA'],
  gold: '#FFD700', silver: '#C0C0C0', bronze: '#CD7F32',
  militaryGreen: '#5A7A4A', militaryGreenLight: '#7AAC6A',
};

export interface ThemeColors {
  primary: string; primaryLight: string; primaryDark: string;
  secondary: string; secondaryLight: string; accent: string; accentLight: string;
  success: string; successLight: string; warning: string; warningLight: string;
  danger: string; dangerLight: string; info: string; infoLight: string;
  background: string; backgroundDark: string; card: string; cardDark: string;
  border: string; borderDark: string; surface: string;
  text: string; textSecondary: string; textMuted: string; textInverse: string; textDark: string;
  gradientPrimary: readonly [string, string];
  gradientSecondary: readonly [string, string];
  gradientAccent: readonly [string, string];
  gradientSuccess: readonly [string, string];
  gradientDanger: readonly [string, string];
  gradientDark: readonly [string, string];
  gradientSunrise: readonly [string, string, string];
  categories: { food: string; transport: string; housing: string; health: string; education: string; entertainment: string; savings: string; utilities: string; clothing: string; other: string };
  avatars: string[];
  gold: string; silver: string; bronze: string;
  militaryGreen: string; militaryGreenLight: string;
}

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeSetting = useAppStore((s) => s.settings.theme);
  const systemScheme = useColorScheme();

  const isDark = useMemo(() => {
    if (themeSetting === 'dark') return true;
    if (themeSetting === 'light') return false;
    return systemScheme === 'dark';
  }, [themeSetting, systemScheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    colors: isDark ? darkColors : lightColors,
    isDark,
  }), [isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
