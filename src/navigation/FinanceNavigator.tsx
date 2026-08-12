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
import { AccountDetailScreen } from '../screens/finance/AccountDetailScreen';
import { ImportStatementScreen } from '../screens/finance/ImportStatementScreen';
import { UtilityTrackerScreen } from '../screens/finance/UtilityTrackerScreen';
import { ConnectBankScreen } from '../screens/finance/ConnectBankScreen';
import { TransactionsScreen } from '../screens/finance/TransactionsScreen';
import { SpendingInsightsScreen } from '../screens/finance/SpendingInsightsScreen';
import { ReceiptScannerScreen } from '../screens/finance/ReceiptScannerScreen';
import { TaxCenterScreen } from '../screens/finance/TaxCenterScreen';
import { TaxOrganizerScreen } from '../screens/finance/TaxOrganizerScreen';
import { withScreenErrorBoundary } from './withScreenErrorBoundary';

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
        <Stack.Screen name="FinanceDashboard" component={withScreenErrorBoundary(FinanceDashboardScreen)} />
        <Stack.Screen name="Budgeting" component={withScreenErrorBoundary(BudgetingScreen)} />
        <Stack.Screen name="Bills" component={withScreenErrorBoundary(BillsScreen)} />
        <Stack.Screen name="Subscriptions" component={withScreenErrorBoundary(SubscriptionsScreen)} />
        <Stack.Screen name="Assets" component={withScreenErrorBoundary(AssetsScreen)} />
        <Stack.Screen name="WealthBuilder" component={withScreenErrorBoundary(WealthBuilderScreen)} />
        <Stack.Screen name="InsuranceManager" component={withScreenErrorBoundary(InsuranceManagerScreen)} />
        <Stack.Screen name="DebtPayoff" component={withScreenErrorBoundary(DebtPayoffScreen)} />
        <Stack.Screen name="DebtDetail" component={withScreenErrorBoundary(DebtDetailScreen)} options={{ title: t('debt.detailsTitle') }} />
        <Stack.Screen name="AccountDetail" component={withScreenErrorBoundary(AccountDetailScreen)} />
        <Stack.Screen name="ImportStatement" component={withScreenErrorBoundary(ImportStatementScreen)} />
        <Stack.Screen name="UtilityTracker" component={withScreenErrorBoundary(UtilityTrackerScreen)} />
        <Stack.Screen name="ConnectBank" component={withScreenErrorBoundary(ConnectBankScreen)} />
        <Stack.Screen name="Transactions" component={withScreenErrorBoundary(TransactionsScreen)} options={{ title: t('transactions.title') }} />
        <Stack.Screen name="SpendingInsights" component={withScreenErrorBoundary(SpendingInsightsScreen)} options={{ title: t('spending.title') }} />
        <Stack.Screen name="ReceiptScanner" component={withScreenErrorBoundary(ReceiptScannerScreen)} options={{ headerShown: false }} />
        <Stack.Screen name="TaxCenter" component={withScreenErrorBoundary(TaxCenterScreen)} options={{ headerShown: false }} />
        <Stack.Screen name="TaxOrganizer" component={withScreenErrorBoundary(TaxOrganizerScreen)} />
      </Stack.Navigator>
    </SubscriptionGate>
  );
}
