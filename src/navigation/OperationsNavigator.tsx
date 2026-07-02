import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RoleGuard } from '../components/auth/RoleGuard';
import { SubscriptionGate } from '../components/common/SubscriptionGate';

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
import { ConnectHueBridgeScreen } from '../screens/operations/ConnectHueBridgeScreen';
import { EmergencyModeScreen } from '../screens/operations/EmergencyModeScreen';
import { ShoppingListScreen } from '../screens/operations/ShoppingListScreen';
import { RecipesScreen } from '../screens/operations/RecipesScreen';
import { TravelPlanningScreen } from '../screens/operations/TravelPlanningScreen';
import { PetTrackerScreen } from '../screens/operations/PetTrackerScreen';
import { HomeMaintenanceScreen } from '../screens/operations/HomeMaintenanceScreen';
import { ChildcareManagerScreen } from '../screens/operations/ChildcareManagerScreen';
import { HomeInventoryScreen } from '../screens/operations/HomeInventoryScreen';
import { CarpoolManagerScreen } from '../screens/operations/CarpoolManagerScreen';

const Stack = createNativeStackNavigator();

export function OperationsNavigator() {
  return (
    <RoleGuard
      allowParent
      title="Operations Restricted"
      message="Operations tools are only available to parents, guardians, or admins."
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="OperationsDashboard" component={OperationsDashboardScreen} />
        <Stack.Screen name="Vehicles" component={VehiclesScreen} />
        <Stack.Screen name="Pantry" component={PantryScreen} />

        <Stack.Screen name="MealPlanning">
          {(props) => (
            <SubscriptionGate requiredTier="premium" featureName="Meal Planning">
              <MealPlanningScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="Documents">
          {(props) => (
            <SubscriptionGate requiredTier="premium" featureName="Document Vault">
              <DocumentsScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="Emergency" component={EmergencyScreen} />
        <Stack.Screen name="EmergencyMode" component={EmergencyModeScreen} />
        <Stack.Screen name="Rewards" component={RewardsScreen} />

        <Stack.Screen name="Automation">
          {(props) => (
            <SubscriptionGate requiredTier="family_pro" featureName="Smart Automation">
              <AutomationScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
        <Stack.Screen name="TimeEconomy" component={TimeEconomyScreen} />
        <Stack.Screen name="SmartHome" component={SmartHomeScreen} />
        <Stack.Screen name="ConnectHueBridge" component={ConnectHueBridgeScreen} />

        <Stack.Screen name="ShoppingList">
          {(props) => (
            <SubscriptionGate requiredTier="premium" featureName="Shopping Intelligence">
              <ShoppingListScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="Recipes" component={RecipesScreen} />

        <Stack.Screen name="TravelPlanning">
          {(props) => (
            <SubscriptionGate requiredTier="family_pro" featureName="Travel Planning">
              <TravelPlanningScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="PetTracker">
          {(props) => (
            <SubscriptionGate requiredTier="premium" featureName="Pet Tracker">
              <PetTrackerScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="HomeMaintenance" component={HomeMaintenanceScreen} />

        <Stack.Screen name="ChildcareManager">
          {(props) => (
            <SubscriptionGate requiredTier="family_pro" featureName="Childcare Manager">
              <ChildcareManagerScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="HomeInventory">
          {(props) => (
            <SubscriptionGate requiredTier="premium" featureName="Home Inventory">
              <HomeInventoryScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="CarpoolManager" component={CarpoolManagerScreen} />
      </Stack.Navigator>
    </RoleGuard>
  );
}