import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { RoleGuard } from '../components/auth/RoleGuard';
import { SubscriptionGate } from '../components/common/SubscriptionGate';

import { AIAssistantScreen } from '../screens/ai/AIAssistantScreen';
import { AIMemoryScreen } from '../screens/ai/AIMemoryScreen';
import { ParentingCoachScreen } from '../screens/ai/ParentingCoachScreen';
import { NegotiatorScreen } from '../screens/ai/NegotiatorScreen';
import { DigitalTwinScreen } from '../screens/ai/DigitalTwinScreen';
import { FamilySafetyAssistantScreen } from '../screens/ai/FamilySafetyAssistantScreen';

const Stack = createNativeStackNavigator();

export function AINavigator() {
  const { t } = useTranslation('ai');
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />

      <Stack.Screen name="AIMemory">
        {(props) => (
          <RoleGuard
            allowParent
            allowGrandparent
            title={t('gates.memoryRestrictedTitle')}
            message={t('gates.memoryRestrictedMsg')}
          >
            <AIMemoryScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="ParentingCoach">
        {(props) => (
          <RoleGuard
            allowParent
            title={t('gates.coachRestrictedTitle')}
            message={t('gates.coachRestrictedMsg')}
          >
            <ParentingCoachScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="Negotiator">
        {(props) => (
          <RoleGuard
            allowParent
            title={t('gates.negotiatorRestrictedTitle')}
            message={t('gates.negotiatorRestrictedMsg')}
          >
            <NegotiatorScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="DigitalTwin">
        {(props) => (
          <SubscriptionGate requiredTier="family_pro" featureName={t('gates.digitalTwinFeatureName')}>
            <RoleGuard
              allowParent
              title={t('gates.digitalTwinRestrictedTitle')}
              message={t('gates.digitalTwinRestrictedMsg')}
            >
              <DigitalTwinScreen {...props} />
            </RoleGuard>
          </SubscriptionGate>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilySafetyAssistant">
        {(props) => (
          <RoleGuard
            allowParent
            allowGrandparent
            title={t('gates.safetyRestrictedTitle')}
            message={t('gates.safetyRestrictedMsg')}
          >
            <FamilySafetyAssistantScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}