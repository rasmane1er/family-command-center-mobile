import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SubscriptionGate } from '../components/common/SubscriptionGate';
import { FinanceDashboardScreen } from '../screens/finance/FinanceDashboardScreen';
import { BudgetingScreen } from '../screens/finance/BudgetingScreen';
import { BillsScreen } from '../screens/finance/BillsScreen';
import { SubscriptionsScreen } from '../screens/finance/SubscriptionsScreen';
import { AssetsScreen } from '../screens/finance/AssetsScreen';
import { WealthBuilderScreen } from '../screens/finance/WealthBuilderScreen';
import { InsuranceManagerScreen } from '../screens/finance/InsuranceManagerScreen';
import { DebtPayoffScreen } from '../screens/finance/DebtPayoffScreen';
import { DebtDetailScreen } from '../screens/finance/DebtDetailScreen';
import { UtilityTrackerScreen } from '../screens/finance/UtilityTrackerScreen';
import { ConnectBankScreen } from '../screens/finance/ConnectBankScreen';
import { TransactionsScreen } from '../screens/finance/TransactionsScreen';
import { SpendingInsightsScreen } from '../screens/finance/SpendingInsightsScreen';
import { ReceiptScannerScreen } from '../screens/finance/ReceiptScannerScreen';
import { TaxCenterScreen } from '../screens/finance/TaxCenterScreen';

const Stack = createNativeStackNavigator();

export function FinanceNavigator() {
  const { t } = useTranslation('finance');
  return (
    <SubscriptionGate
      requiredTier="premium"
      featureName={t('gates.financeToolsTitle')}
      description={t('gates.financeToolsDesc')}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="FinanceDashboard" component={FinanceDashboardScreen} />
        <Stack.Screen name="Budgeting" component={BudgetingScreen} />
        <Stack.Screen name="Bills" component={BillsScreen} />
        <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
        <Stack.Screen name="Assets" component={AssetsScreen} />
        <Stack.Screen name="WealthBuilder" component={WealthBuilderScreen} />
        <Stack.Screen name="InsuranceManager" component={InsuranceManagerScreen} />
        <Stack.Screen name="DebtPayoff" component={DebtPayoffScreen} />
        <Stack.Screen name="DebtDetail" component={DebtDetailScreen} options={{ title: t('debt.detailsTitle') }} />
        <Stack.Screen name="UtilityTracker" component={UtilityTrackerScreen} />
        <Stack.Screen name="ConnectBank" component={ConnectBankScreen} />
        <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ title: t('transactions.title') }} />
        <Stack.Screen name="SpendingInsights" component={SpendingInsightsScreen} options={{ title: t('spending.title') }} />
        <Stack.Screen name="ReceiptScanner" component={ReceiptScannerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TaxCenter" component={TaxCenterScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </SubscriptionGate>
  );
}
