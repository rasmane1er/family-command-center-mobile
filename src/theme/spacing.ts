export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Semantic
  screenPadding: 20,
  cardPadding: 16,
  cardRadius: 16,
  cardRadiusLarge: 24,
  cardRadiusSmall: 10,
  buttonRadius: 12,
  inputRadius: 12,
  avatarSize: 48,
  avatarSizeLarge: 72,
  avatarSizeSmall: 36,
  iconSize: 24,
  iconSizeLarge: 32,
  iconSizeSmall: 18,
  tabBarHeight: 80,
  headerHeight: 56,
  statusBarOffset: 44,
};

export const shadows = {
  sm: {
    shadowColor: '#0F2952',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F2952',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#0F2952',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
  card: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};

export type Spacing = typeof spacing;
export type Shadows = typeof shadows;
