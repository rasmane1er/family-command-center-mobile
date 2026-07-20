import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { RoleGuard } from '../components/auth/RoleGuard';
import { SubscriptionGate } from '../components/common/SubscriptionGate';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

import { AIAssistantScreen } from '../screens/ai/AIAssistantScreen';
import { AIMemoryScreen } from '../screens/ai/AIMemoryScreen';
import { ParentingCoachScreen } from '../screens/ai/ParentingCoachScreen';
import { NegotiatorScreen } from '../screens/ai/NegotiatorScreen';
import { DigitalTwinScreen } from '../screens/ai/DigitalTwinScreen';
import { FamilySafetyAssistantScreen } from '../screens/ai/FamilySafetyAssistantScreen';
import { withScreenErrorBoundary } from './withScreenErrorBoundary';

const Stack = createNativeStackNavigator();

export function AINavigator() {
  const { t } = useTranslation('ai');
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AIAssistant" component={withScreenErrorBoundary(AIAssistantScreen)} />

      <Stack.Screen name="AIMemory">
        {(props) => (
          <ErrorBoundary>
            <RoleGuard
              allowParent
              allowGrandparent
              title={t('gates.memoryRestrictedTitle')}
              message={t('gates.memoryRestrictedMsg')}
            >
              <AIMemoryScreen {...props} />
            </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="ParentingCoach">
        {(props) => (
          <ErrorBoundary>
            <RoleGuard
              allowParent
              title={t('gates.coachRestrictedTitle')}
              message={t('gates.coachRestrictedMsg')}
            >
              <ParentingCoachScreen {...props} />
            </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="Negotiator">
        {(props) => (
          <ErrorBoundary>
            <RoleGuard
              allowParent
              title={t('gates.negotiatorRestrictedTitle')}
              message={t('gates.negotiatorRestrictedMsg')}
            >
              <NegotiatorScreen {...props} />
            </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="DigitalTwin">
        {(props) => (
          <ErrorBoundary>
            <SubscriptionGate requiredTier="family_pro" featureName={t('gates.digitalTwinFeatureName')}>
              <RoleGuard
                allowParent
                title={t('gates.digitalTwinRestrictedTitle')}
                message={t('gates.digitalTwinRestrictedMsg')}
              >
                <DigitalTwinScreen {...props} />
              </RoleGuard>
            </SubscriptionGate>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilySafetyAssistant">
        {(props) => (
          <ErrorBoundary>
            <RoleGuard
              allowParent
              allowGrandparent
              title={t('gates.safetyRestrictedTitle')}
              message={t('gates.safetyRestrictedMsg')}
            >
              <FamilySafetyAssistantScreen {...props} />
            </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}