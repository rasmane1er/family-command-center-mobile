import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { HealthHubScreen } from '../screens/health/HealthHubScreen';
import { CommandWallScreen } from '../screens/dashboard/CommandWallScreen';

const Stack = createNativeStackNavigator();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="HealthHub" component={HealthHubScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CommandWall" component={CommandWallScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
