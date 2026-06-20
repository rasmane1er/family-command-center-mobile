import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FamilyProfilesScreen } from '../screens/family/FamilyProfilesScreen';
import { CalendarScreen } from '../screens/family/CalendarScreen';
import { TasksScreen } from '../screens/family/TasksScreen';
import { SchoolCenterScreen } from '../screens/family/SchoolCenterScreen';

const Stack = createNativeStackNavigator();

export function FamilyNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FamilyProfiles" component={FamilyProfilesScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="SchoolCenter" component={SchoolCenterScreen} />
    </Stack.Navigator>
  );
}
