import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { RoleGuard } from '../components/auth/RoleGuard';
import { SubscriptionGate } from '../components/common/SubscriptionGate';

import { OperationsDashboardScreen } from '../screens/operations/OperationsDashboardScreen';
import { VehiclesScreen } from '../screens/operations/VehiclesScreen';
import { PantryScreen } from '../screens/operations/PantryScreen';
import { ScanItemScreen } from '../screens/operations/ScanItemScreen';
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
import { TasksScreen } from '../screens/family/TasksScreen';

const Stack = createNativeStackNavigator();

export function OperationsNavigator() {
  const { t } = useTranslation('ops');
  return (
    <RoleGuard
      allowParent
      title={t('gates.restrictedTitle')}
      message={t('gates.restrictedMsg')}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="OperationsDashboard" component={OperationsDashboardScreen} />
        <Stack.Screen name="Vehicles" component={VehiclesScreen} />
        <Stack.Screen name="Pantry" component={PantryScreen} />
        <Stack.Screen name="ScanItem" component={ScanItemScreen} />

        <Stack.Screen name="MealPlanning">
          {(props) => (
            <SubscriptionGate requiredTier="premium" featureName={t('gates.mealPlanningFeature')}>
              <MealPlanningScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="Documents">
          {(props) => (
            <SubscriptionGate requiredTier="premium" featureName={t('gates.documentVaultFeature')}>
              <DocumentsScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="Emergency" component={EmergencyScreen} />
        <Stack.Screen name="EmergencyMode" component={EmergencyModeScreen} />
        <Stack.Screen name="Rewards" component={RewardsScreen} />

        <Stack.Screen name="Automation">
          {(props) => (
            <SubscriptionGate requiredTier="family_pro" featureName={t('gates.smartAutomationFeature')}>
              <AutomationScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
        {/* Also registered here (in addition to FamilyNavigator) so
            Marketplace's "Open in Tasks" can do a plain same-stack
            navigation.navigate('Tasks') instead of hopping into a sibling
            tab's nested stack — same screen, same store, just reachable
            without cross-navigator ambiguity from this stack too. */}
        <Stack.Screen name="Tasks" component={TasksScreen} />
        <Stack.Screen name="TimeEconomy" component={TimeEconomyScreen} />
        <Stack.Screen name="SmartHome" component={SmartHomeScreen} />
        <Stack.Screen name="ConnectHueBridge" component={ConnectHueBridgeScreen} />

        <Stack.Screen name="ShoppingList">
          {(props) => (
            <SubscriptionGate requiredTier="premium" featureName={t('gates.shoppingIntelligenceFeature')}>
              <ShoppingListScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="Recipes" component={RecipesScreen} />

        <Stack.Screen name="TravelPlanning">
          {(props) => (
            <SubscriptionGate requiredTier="family_pro" featureName={t('gates.travelPlanningFeature')}>
              <TravelPlanningScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="PetTracker">
          {(props) => (
            <SubscriptionGate requiredTier="premium" featureName={t('gates.petTrackerFeature')}>
              <PetTrackerScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="HomeMaintenance" component={HomeMaintenanceScreen} />

        <Stack.Screen name="ChildcareManager">
          {(props) => (
            <SubscriptionGate requiredTier="family_pro" featureName={t('gates.childcareManagerFeature')}>
              <ChildcareManagerScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="HomeInventory">
          {(props) => (
            <SubscriptionGate requiredTier="premium" featureName={t('gates.homeInventoryFeature')}>
              <HomeInventoryScreen {...props} />
            </SubscriptionGate>
          )}
        </Stack.Screen>

        <Stack.Screen name="CarpoolManager" component={CarpoolManagerScreen} />
      </Stack.Navigator>
    </RoleGuard>
  );
}