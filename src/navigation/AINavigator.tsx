import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />

      <Stack.Screen name="AIMemory">
        {(props) => (
          <RoleGuard
            allowParent
            allowGrandparent
            title="AI Memory Restricted"
            message="AI Memory is available to parents, guardians, admins, and grandparents."
          >
            <AIMemoryScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="ParentingCoach">
        {(props) => (
          <RoleGuard
            allowParent
            title="Parenting Coach Restricted"
            message="Parenting Coach is only available to parents, guardians, or admins."
          >
            <ParentingCoachScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="Negotiator">
        {(props) => (
          <RoleGuard
            allowParent
            title="Negotiator Restricted"
            message="Family negotiation tools are only available to parents, guardians, or admins."
          >
            <NegotiatorScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="DigitalTwin">
        {(props) => (
          <SubscriptionGate requiredTier="family_pro" featureName="Family Digital Twin">
            <RoleGuard
              allowParent
              title="Digital Twin Restricted"
              message="The Family Digital Twin is only available to parents, guardians, or admins."
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
            title="Family Safety Assistant Restricted"
            message="The Family Safety Assistant is only available to parents, guardians, admins, and grandparents."
          >
            <FamilySafetyAssistantScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}