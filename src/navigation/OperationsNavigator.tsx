import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OperationsDashboardScreen } from '../screens/operations/OperationsDashboardScreen';
import { VehiclesScreen } from '../screens/operations/VehiclesScreen';
import { PantryScreen } from '../screens/operations/PantryScreen';
import { MealPlanningScreen } from '../screens/operations/MealPlanningScreen';
import { DocumentsScreen } from '../screens/operations/DocumentsScreen';
import { EmergencyScreen } from '../screens/operations/EmergencyScreen';
import { RewardsScreen } from '../screens/operations/RewardsScreen';
import { AutomationScreen } from '../screens/operations/AutomationScreen';
import { MarketplaceScreen } from '../screens/operations/MarketplaceScreen';
import { TimeEconomyScreen } from '../screens/operations/TimeEconomyScreen';
import { SmartHomeScreen } from '../screens/operations/SmartHomeScreen';
import { EmergencyModeScreen } from '../screens/operations/EmergencyModeScreen';
import { ShoppingListScreen } from '../screens/operations/ShoppingListScreen';
import { RecipesScreen } from '../screens/operations/RecipesScreen';

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
      <Stack.Screen name="EmergencyMode" component={EmergencyModeScreen} />
      <Stack.Screen name="Rewards" component={RewardsScreen} />
      <Stack.Screen name="Automation" component={AutomationScreen} />
      <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
      <Stack.Screen name="TimeEconomy" component={TimeEconomyScreen} />
      <Stack.Screen name="SmartHome" component={SmartHomeScreen} />
      <Stack.Screen name="ShoppingList" component={ShoppingListScreen} />
      <Stack.Screen name="Recipes" component={RecipesScreen} />
    </Stack.Navigator>
  );
}
