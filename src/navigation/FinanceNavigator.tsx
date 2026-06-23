import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FinanceDashboardScreen } from '../screens/finance/FinanceDashboardScreen';
import { BudgetingScreen } from '../screens/finance/BudgetingScreen';
import { BillsScreen } from '../screens/finance/BillsScreen';
import { SubscriptionsScreen } from '../screens/finance/SubscriptionsScreen';
import { AssetsScreen } from '../screens/finance/AssetsScreen';
import { WealthBuilderScreen } from '../screens/finance/WealthBuilderScreen';
import { InsuranceManagerScreen } from '../screens/finance/InsuranceManagerScreen';

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
    </Stack.Navigator>
  );
}
