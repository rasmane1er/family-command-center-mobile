import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { HealthHubScreen } from '../screens/health/HealthHubScreen';
import { MedicationManagerScreen } from '../screens/health/MedicationManagerScreen';
import { SleepTrackerScreen } from '../screens/health/SleepTrackerScreen';
import { WorkoutTrackerScreen } from '../screens/health/WorkoutTrackerScreen';
import { CommandWallScreen } from '../screens/dashboard/CommandWallScreen';
import { NotificationsScreen } from '../screens/dashboard/NotificationsScreen';
import { SearchScreen } from '../screens/dashboard/SearchScreen';
import { WeeklyReportScreen } from '../screens/dashboard/WeeklyReportScreen';

const Stack = createNativeStackNavigator();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="HealthHub" component={HealthHubScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="MedicationManager" component={MedicationManagerScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="SleepTracker" component={SleepTrackerScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="WorkoutTracker" component={WorkoutTrackerScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CommandWall" component={CommandWallScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
