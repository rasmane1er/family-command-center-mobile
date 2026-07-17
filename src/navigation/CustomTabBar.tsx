import React from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StackActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
const { width: _w } = Dimensions.get('window');

const TAB_META: Record<string, {
  icon:   keyof typeof Ionicons.glyphMap;
  filled: keyof typeof Ionicons.glyphMap;
  tKey:   string;
}> = {
  Home:          { icon: 'home-outline',    filled: 'home',      tKey: 'tabs.home'   },
  Family:        { icon: 'people-outline',  filled: 'people',    tKey: 'tabs.family' },
  Finance:       { icon: 'wallet-outline',  filled: 'wallet',    tKey: 'tabs.finance'},
  Operations:    { icon: 'grid-outline',    filled: 'grid',      tKey: 'tabs.ops'    },
  'AI Assistant':{ icon: 'sparkles-outline',filled: 'sparkles',  tKey: 'tabs.ai'     },
};

// Single rendering path for every tab — previously the AI tab alone got a
// filled gradient pill on selection while the other four just tinted their
// icon background, so the row looked inconsistent depending on which tab
// was active. All five tabs now share the exact same selected-state
// treatment; only the icon/label per tab differs.
function TabItem({
  route, focused, badge, onPress, onLongPress,
}: { route: any; focused: boolean; badge?: number | string; onPress: () => void; onLongPress: () => void }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const meta  = TAB_META[route.name];
  const scale = useSharedValue(1);
  const BRAND    = colors.primary;
  const INACTIVE = colors.textMuted;

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(0.88, { stiffness: 600, damping: 15 }, () => {
      scale.value = withSpring(1, { stiffness: 400, damping: 20 });
    });
    // Matches the tactile "selection changed" feedback of native iOS/Android
    // tab bars — a detail every polished production app has and a bare
    // Pressable doesn't give you for free.
    Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  const label = t(meta.tKey);
  const a11yProps = {
    accessibilityRole: 'tab' as const,
    accessibilityLabel: label,
    accessibilityState: { selected: focused },
  };
  const hitSlop = { top: 6, bottom: 6, left: 4, right: 4 };

  return (
    <Pressable onPress={handlePress} onLongPress={onLongPress} style={s.tabItem} hitSlop={hitSlop} {...a11yProps}>
      <Animated.View style={animStyle}>
        <LinearGradient
          colors={focused ? ['#0F2952', '#1D4ED8'] : isDark ? ['#1A2A45', '#162240'] : ['#E8EEF9', '#DDE6F5']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tabPill}
        >
          <Ionicons name={focused ? meta.filled : meta.icon} size={22} color={focused ? '#fff' : BRAND} />
          {badge ? (
            <View style={[s.badge, { backgroundColor: colors.danger, borderColor: colors.card }]}>
              <Text style={s.badgeTxt}>{typeof badge === 'number' && badge > 9 ? '9+' : badge}</Text>
            </View>
          ) : null}
        </LinearGradient>
        <Text style={[s.label, { color: focused ? BRAND : INACTIVE }, focused && { fontWeight: '700' }]} numberOfLines={1}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const HIDDEN_SCREENS = new Set(['ReceiptScanner', 'EnterPairingCode', 'RegisterChildDevice', 'ScanItem', 'GuardianChat', 'BlockedSites']);

function getActiveNestedRoute(tabRoute: BottomTabBarProps['state']['routes'][number]): string | undefined {
  const nested = tabRoute.state;
  if (!nested || nested.index == null) return undefined;
  const active = nested.routes[nested.index];
  return active?.name;
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Hide tab bar for specific full-screen nested routes
  const activeNestedRoute = getActiveNestedRoute(state.routes[state.index]);
  if (activeNestedRoute && HIDDEN_SCREENS.has(activeNestedRoute)) return null;

  return (
    <View style={[s.container, { bottom: (insets.bottom || 12) + 10 }]}>
      <View style={[s.surface, { borderColor: colors.border }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={85} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
        )}

        <View style={s.tabs} accessibilityRole="tablist">
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const { options } = descriptors[route.key];
            const badge = options.tabBarBadge;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!event.defaultPrevented) {
                // Reset this tab's nested stack to its root screen whenever
                // it's tapped — whether it was already focused (classic
                // "tap again to scroll to top") or you're switching into it
                // from a different tab. Without the second case, a deep link
                // into a nested screen (e.g. Dashboard's "Budgeting" quick
                // action) leaves that tab permanently stuck on that screen
                // until some other navigation resets it — tapping the tab
                // icon should always show that section's home screen.
                const nestedState = state.routes[index]?.state;
                const isNestedDeep = nestedState && nestedState.index != null && nestedState.index > 0;
                if (isNestedDeep) {
                  navigation.dispatch({ ...StackActions.popToTop(), target: nestedState.key });
                }
                if (!isFocused) {
                  navigation.navigate(route.name);
                }
              }
            };
            const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

            return (
              <TabItem key={route.key} route={route} focused={isFocused}
                badge={badge} onPress={onPress} onLongPress={onLongPress} />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Shadow-casting outer wrapper — kept separate from the rounded/clipped
  // inner surface below because Android's `elevation` shadow gets cut off if
  // the same view also has `overflow: hidden` for corner clipping.
  container: {
    position: 'absolute', left: 16, right: 16,
    borderRadius: 28,
    shadowColor: '#0F2952', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16, shadowRadius: 20, elevation: 20,
  },
  surface: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tabs: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: 12, paddingBottom: 12 },
  tabItem: { flex: 1, alignItems: 'center', paddingBottom: 2 },
  // Same pill every tab uses when selected (previously only the AI tab had
  // this — see the TabItem comment above).
  tabPill: { width: 52, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  label: { fontSize: 10, fontWeight: '500', marginTop: 4, letterSpacing: 0.1 },
  badge: { position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, paddingHorizontal: 2 },
  badgeTxt: { fontSize: 8, fontWeight: '900', color: '#fff' },
});
