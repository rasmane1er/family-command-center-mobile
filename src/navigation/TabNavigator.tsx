import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';
import { shadows } from '../theme/spacing';
import { useNotificationsStore } from '../store/useNotificationsStore';
import { useFamilyStore } from '../store/useFamilyStore';
import { useFinanceStore } from '../store/useFinanceStore';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { FamilyNavigator } from './FamilyNavigator';
import { FinanceNavigator } from './FinanceNavigator';
import { OperationsNavigator } from './OperationsNavigator';
import { AINavigator } from './AINavigator';

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  const unreadNotifications = useNotificationsStore((s) => s.notifications.filter((n) => !n.isRead).length);
  const pendingTasks = useFamilyStore((s) => s.tasks.filter((t) => t.status !== 'completed').length);
  const overdueBills = useFinanceStore((s) => s.bills.filter((b) => b.status === 'overdue').length);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.card,
          borderTopWidth: 0,
          ...shadows.lg,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={90}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, { filled: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }> = {
            Home: { filled: 'home', outline: 'home-outline' },
            Family: { filled: 'people', outline: 'people-outline' },
            Finance: { filled: 'wallet', outline: 'wallet-outline' },
            Operations: { filled: 'grid', outline: 'grid-outline' },
            'AI Assistant': { filled: 'sparkles', outline: 'sparkles-outline' },
          };
          const iconSet = icons[route.name];
          if (!iconSet) return null;

          if (route.name === 'AI Assistant') {
            return (
              <View style={[styles.aiIconBg, focused && styles.aiIconBgActive]}>
                <Ionicons
                  name={focused ? iconSet.filled : iconSet.outline}
                  size={22}
                  color={focused ? '#fff' : color}
                />
              </View>
            );
          }

          return (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons
                name={focused ? iconSet.filled : iconSet.outline}
                size={22}
                color={focused ? colors.primary : color}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined }} />
      <Tab.Screen name="Family" component={FamilyNavigator} options={{ tabBarBadge: pendingTasks > 9 ? '9+' : pendingTasks > 0 ? pendingTasks : undefined }} />
      <Tab.Screen name="Finance" component={FinanceNavigator} options={{ tabBarBadge: overdueBills > 0 ? overdueBills : undefined }} />
      <Tab.Screen name="Operations" component={OperationsNavigator} />
      <Tab.Screen name="AI Assistant" component={AINavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  iconContainerActive: {
    backgroundColor: '#E8EEF9',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  aiIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
  },
  aiIconBgActive: {
    backgroundColor: colors.primary,
    ...shadows.md,
  },
});
