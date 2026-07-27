import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FinanceDashboardScreen } from '../screens/finance/FinanceDashboardScreen';
import { BudgetingScreen } from '../screens/finance/BudgetingScreen';
import { BillsScreen } from '../screens/finance/BillsScreen';
import { SubscriptionsScreen } from '../screens/finance/SubscriptionsScreen';
import { AssetsScreen } from '../screens/finance/AssetsScreen';
import { WealthBuilderScreen } from '../screens/finance/WealthBuilderScreen';
import { InsuranceManagerScreen } from '../screens/finance/InsuranceManagerScreen';
import { DebtPayoffScreen } from '../screens/finance/DebtPayoffScreen';
import { UtilityTrackerScreen } from '../screens/finance/UtilityTrackerScreen';
import { TaxOrganizerScreen } from '../screens/finance/TaxOrganizerScreen';

const Stack = createNativeStackNavigator();

export function FinanceNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FinanceDashboard" component={FinanceDashboardScreen} />
      <Stack.Screen name="Budgeting" component={BudgetingScreen} />
      <Stack.Screen name="Bills" component={BillsScreen} />
      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Stack.Screen name="Assets" component={AssetsScreen} />
      <Stack.Screen name="WealthBuilder" component={WealthBuilderScreen} />
      <Stack.Screen name="InsuranceManager" component={InsuranceManagerScreen} />
      <Stack.Screen name="DebtPayoff" component={DebtPayoffScreen} />
      <Stack.Screen name="UtilityTracker" component={UtilityTrackerScreen} />
      <Stack.Screen name="TaxOrganizer" component={TaxOrganizerScreen} />
    </Stack.Navigator>
  );
}
