import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OperationsDashboardScreen } from '../screens/operations/OperationsDashboardScreen';
import { VehiclesScreen } from '../screens/operations/VehiclesScreen';
import { PantryScreen } from '../screens/operations/PantryScreen';
import { MealPlanningScreen } from '../screens/operations/MealPlanningScreen';
import { DocumentsScreen } from '../screens/operations/DocumentsScreen';
import { EmergencyScreen } from '../screens/operations/EmergencyScreen';
import { RewardsScreen } from '../screens/operations/RewardsScreen';

const Stack = createNativeStackNavigator();

export function OperationsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OperationsDashboard" component={OperationsDashboardScreen} />
      <Stack.Screen name="Vehicles" component={VehiclesScreen} />
      <Stack.Screen name="Pantry" component={PantryScreen} />
      <Stack.Screen name="MealPlanning" component={MealPlanningScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="Emergency" component={EmergencyScreen} />
      <Stack.Screen name="Rewards" component={RewardsScreen} />
    </Stack.Navigator>
  );
}
