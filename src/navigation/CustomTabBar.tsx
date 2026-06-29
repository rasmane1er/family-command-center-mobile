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

function TabItem({
  route, focused, badge, onPress, onLongPress,
}: { route: any; focused: boolean; badge?: number | string; onPress: () => void; onLongPress: () => void }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const meta  = TAB_META[route.name];
  const isAI  = route.name === 'AI Assistant';
  const scale = useSharedValue(1);
  const BRAND    = colors.primary;
  const INACTIVE = colors.textMuted;

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(0.88, { stiffness: 600, damping: 15 }, () => {
      scale.value = withSpring(1, { stiffness: 400, damping: 20 });
    });
    onPress();
  };

  const label = t(meta.tKey);

  if (isAI) {
    return (
      <Pressable onPress={handlePress} onLongPress={onLongPress} style={s.aiTabWrap}>
        <Animated.View style={animStyle}>
          <LinearGradient
            colors={focused ? ['#0F2952', '#1D4ED8'] : isDark ? ['#1A2A45', '#162240'] : ['#E8EEF9', '#DDE6F5']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.aiPill}
          >
            <Ionicons name={focused ? meta.filled : meta.icon} size={22} color={focused ? '#fff' : BRAND} />
            {badge ? <View style={s.aiBadge}><Text style={s.aiBadgeTxt}>{badge}</Text></View> : null}
          </LinearGradient>
          <Text style={[s.aiLabel, { color: focused ? BRAND : INACTIVE }, focused && { fontWeight: '700' }]}>{label}</Text>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress} onLongPress={onLongPress} style={s.tabItem}>
      <Animated.View style={[s.tabContent, animStyle]}>
        <View style={[s.iconWrap, focused && { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={focused ? meta.filled : meta.icon} size={22} color={focused ? BRAND : INACTIVE} />
          {badge ? (
            <View style={s.badge}><Text style={s.badgeTxt}>{typeof badge === 'number' && badge > 9 ? '9+' : badge}</Text></View>
          ) : null}
        </View>
        <Text style={[s.label, { color: focused ? BRAND : INACTIVE }, focused && { fontWeight: '700' }]} numberOfLines={1}>{label}</Text>
        {focused && <View style={[s.activeLine, { backgroundColor: BRAND }]} />}
      </Animated.View>
    </Pressable>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <View style={[s.container, { paddingBottom: insets.bottom || 8, borderTopColor: colors.border }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={85} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
      )}

      <View style={s.tabs}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const badge = options.tabBarBadge;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!event.defaultPrevented) {
              if (isFocused) {
                const nestedState = state.routes[index]?.state;
                const isNestedDeep = nestedState && nestedState.index != null && nestedState.index > 0;
                if (isNestedDeep) {
                  navigation.dispatch({ ...StackActions.popToTop(), target: nestedState.key });
                }
              } else {
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
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#0F2952', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 20,
  },
  tabs: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: 10 },
  tabItem:    { flex: 1, alignItems: 'center' },
  tabContent: { alignItems: 'center', paddingBottom: 2, position: 'relative' },
  iconWrap:   { width: 46, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  label:      { fontSize: 10, fontWeight: '500', marginTop: 3, letterSpacing: 0.1 },
  activeLine: { width: 16, height: 2.5, borderRadius: 2, marginTop: 3 },
  badge:    { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', paddingHorizontal: 2 },
  badgeTxt: { fontSize: 8, fontWeight: '900', color: '#fff' },
  aiTabWrap: { flex: 1, alignItems: 'center', paddingBottom: 2 },
  aiPill:    { width: 52, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  aiBadge:   { position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: 7, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  aiBadgeTxt:{ fontSize: 7, fontWeight: '900', color: '#fff' },
  aiLabel:   { fontSize: 10, fontWeight: '500', marginTop: 4, letterSpacing: 0.1 },
});
