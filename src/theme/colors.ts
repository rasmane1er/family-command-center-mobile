export const colors = {
  // Brand
  primary: '#0F2952',
  primaryLight: '#1E4A8A',
  primaryDark: '#081730',
  secondary: '#F5A623',
  secondaryLight: '#FFD166',
  accent: '#00D4AA',
  accentLight: '#4EECD0',

  // Status
  success: '#27AE60',
  successLight: '#D5F5E3',
  warning: '#F39C12',
  warningLight: '#FEF9E7',
  danger: '#E74C3C',
  dangerLight: '#FDEDEC',
  info: '#2980B9',
  infoLight: '#D6EAF8',

  // Neutrals
  background: '#F0F3F9',
  backgroundDark: '#0D1B2A',
  card: '#FFFFFF',
  cardDark: '#132338',
  border: '#E4EAF2',
  borderDark: '#1E3A5F',
  surface: '#F8FAFD',

  // Text
  text: '#0D1B2A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  textDark: '#F4F6FB',

  // Gradients (used as arrays)
  gradientPrimary: ['#0F2952', '#1E4A8A'] as const,
  gradientSecondary: ['#F5A623', '#FF8C42'] as const,
  gradientAccent: ['#00D4AA', '#0099CC'] as const,
  gradientSuccess: ['#27AE60', '#1ABC9C'] as const,
  gradientDanger: ['#E74C3C', '#C0392B'] as const,
  gradientDark: ['#0D1B2A', '#132338'] as const,
  gradientSunrise: ['#0F2952', '#1E4A8A', '#F5A623'] as const,

  // Category colors for charts/tags
  categories: {
    food: '#FF6B6B',
    transport: '#4ECDC4',
    housing: '#45B7D1',
    health: '#96CEB4',
    education: '#FFEAA7',
    entertainment: '#DDA0DD',
    savings: '#27AE60',
    utilities: '#95A5A6',
    clothing: '#F39C12',
    other: '#BDC3C7',
  },

  // Member avatar colors
  avatars: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F5A623', '#00D4AA'],

  // Special
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  militaryGreen: '#4A5E3A',
  militaryGreenLight: '#6B8C5A',
};

export type Colors = typeof colors;
