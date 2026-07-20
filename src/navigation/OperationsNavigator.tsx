import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { RoleGuard } from '../components/auth/RoleGuard';
import { SubscriptionGate } from '../components/common/SubscriptionGate';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

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
import { withScreenErrorBoundary } from './withScreenErrorBoundary';

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
        <Stack.Screen name="OperationsDashboard" component={withScreenErrorBoundary(OperationsDashboardScreen)} />
        <Stack.Screen name="Vehicles" component={withScreenErrorBoundary(VehiclesScreen)} />
        <Stack.Screen name="Pantry" component={withScreenErrorBoundary(PantryScreen)} />
        <Stack.Screen name="ScanItem" component={withScreenErrorBoundary(ScanItemScreen)} />

        <Stack.Screen name="MealPlanning">
          {(props) => (
            <ErrorBoundary>
            <SubscriptionGate requiredTier="premium" featureName={t('gates.mealPlanningFeature')}>
              <MealPlanningScreen {...props} />
            </SubscriptionGate>
            </ErrorBoundary>
          )}
        </Stack.Screen>

        <Stack.Screen name="Documents">
          {(props) => (
            <ErrorBoundary>
            <SubscriptionGate requiredTier="premium" featureName={t('gates.documentVaultFeature')}>
              <DocumentsScreen {...props} />
            </SubscriptionGate>
            </ErrorBoundary>
          )}
        </Stack.Screen>

        <Stack.Screen name="Emergency" component={withScreenErrorBoundary(EmergencyScreen)} />
        <Stack.Screen name="EmergencyMode" component={withScreenErrorBoundary(EmergencyModeScreen)} />
        <Stack.Screen name="Rewards" component={withScreenErrorBoundary(RewardsScreen)} />

        <Stack.Screen name="Automation">
          {(props) => (
            <ErrorBoundary>
            <SubscriptionGate requiredTier="family_pro" featureName={t('gates.smartAutomationFeature')}>
              <AutomationScreen {...props} />
            </SubscriptionGate>
            </ErrorBoundary>
          )}
        </Stack.Screen>

        <Stack.Screen name="Marketplace" component={withScreenErrorBoundary(MarketplaceScreen)} />
        {/* Also registered here (in addition to FamilyNavigator) so
            Marketplace's "Open in Tasks" can do a plain same-stack
            navigation.navigate('Tasks') instead of hopping into a sibling
            tab's nested stack — same screen, same store, just reachable
            without cross-navigator ambiguity from this stack too. */}
        <Stack.Screen name="Tasks" component={withScreenErrorBoundary(TasksScreen)} />
        <Stack.Screen name="TimeEconomy" component={withScreenErrorBoundary(TimeEconomyScreen)} />
        <Stack.Screen name="SmartHome" component={withScreenErrorBoundary(SmartHomeScreen)} />
        <Stack.Screen name="ConnectHueBridge" component={withScreenErrorBoundary(ConnectHueBridgeScreen)} />

        <Stack.Screen name="ShoppingList">
          {(props) => (
            <ErrorBoundary>
            <SubscriptionGate requiredTier="premium" featureName={t('gates.shoppingIntelligenceFeature')}>
              <ShoppingListScreen {...props} />
            </SubscriptionGate>
            </ErrorBoundary>
          )}
        </Stack.Screen>

        <Stack.Screen name="Recipes" component={withScreenErrorBoundary(RecipesScreen)} />

        <Stack.Screen name="TravelPlanning">
          {(props) => (
            <ErrorBoundary>
            <SubscriptionGate requiredTier="family_pro" featureName={t('gates.travelPlanningFeature')}>
              <TravelPlanningScreen {...props} />
            </SubscriptionGate>
            </ErrorBoundary>
          )}
        </Stack.Screen>

        <Stack.Screen name="PetTracker">
          {(props) => (
            <ErrorBoundary>
            <SubscriptionGate requiredTier="premium" featureName={t('gates.petTrackerFeature')}>
              <PetTrackerScreen {...props} />
            </SubscriptionGate>
            </ErrorBoundary>
          )}
        </Stack.Screen>

        <Stack.Screen name="HomeMaintenance" component={withScreenErrorBoundary(HomeMaintenanceScreen)} />

        <Stack.Screen name="ChildcareManager">
          {(props) => (
            <ErrorBoundary>
            <SubscriptionGate requiredTier="family_pro" featureName={t('gates.childcareManagerFeature')}>
              <ChildcareManagerScreen {...props} />
            </SubscriptionGate>
            </ErrorBoundary>
          )}
        </Stack.Screen>

        <Stack.Screen name="HomeInventory">
          {(props) => (
            <ErrorBoundary>
            <SubscriptionGate requiredTier="premium" featureName={t('gates.homeInventoryFeature')}>
              <HomeInventoryScreen {...props} />
            </SubscriptionGate>
            </ErrorBoundary>
          )}
        </Stack.Screen>

        <Stack.Screen name="CarpoolManager" component={withScreenErrorBoundary(CarpoolManagerScreen)} />
      </Stack.Navigator>
    </RoleGuard>
  );
}