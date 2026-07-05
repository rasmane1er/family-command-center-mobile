import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { TabNavigator } from './TabNavigator';

import { SettingsScreen } from '../screens/settings/SettingsScreen';
import HelpSupportScreen from '../screens/settings/HelpSupportScreen';
import { LiveChatScreen } from '../screens/settings/LiveChatScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '../screens/settings/TermsOfServiceScreen';
import { HealthHubScreen } from '../screens/health/HealthHubScreen';
import { MedicationManagerScreen } from '../screens/health/MedicationManagerScreen';
import { SleepTrackerScreen } from '../screens/health/SleepTrackerScreen';
import { WorkoutTrackerScreen } from '../screens/health/WorkoutTrackerScreen';

import { CommandWallScreen } from '../screens/dashboard/CommandWallScreen';
import { NotificationsScreen } from '../screens/dashboard/NotificationsScreen';
import { SearchScreen } from '../screens/dashboard/SearchScreen';
import { WeeklyReportScreen } from '../screens/dashboard/WeeklyReportScreen';
import { GeofenceScreen } from '../screens/family/guardian/GeofenceScreen';
import { MilitaryHubScreen } from '../screens/family/military/MilitaryHubScreen';
import { DeploymentTrackerScreen } from '../screens/family/military/DeploymentTrackerScreen';
import { PCSMoveScreen } from '../screens/family/military/PCSMoveScreen';
import { FamilyReadinessScreen } from '../screens/family/military/FamilyReadinessScreen';
import { SubscriptionGate } from '../components/common/SubscriptionGate';

import { useFamilyStore } from '../store/useFamilyStore';

const Stack = createNativeStackNavigator();

function ProtectedRoute({
  children,
  allowParent = false,
  allowChild = false,
  allowGrandparent = false,
}: {
  children: React.ReactNode;
  allowParent?: boolean;
  allowChild?: boolean;
  allowGrandparent?: boolean;
}) {
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);

  const activeMember = members.find((m) => m.id === activeMemberId);

  const isParent =
    activeMember?.role === 'parent' ||
    activeMember?.role === 'guardian' ||
    activeMember?.isAdmin === true;

  const isChild = activeMember?.role === 'child';
  const isGrandparent = activeMember?.role === 'grandparent';

  const allowed =
    (allowParent && isParent) ||
    (allowChild && isChild) ||
    (allowGrandparent && isGrandparent);

  if (!allowed) {
    return <TabNavigator />;
  }

  return <>{children}</>;
}

export function MainNavigator() {
  const { t } = useTranslation('onboarding');
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Core */}
      <Stack.Screen name="Tabs" component={TabNavigator} />

      {/* Shared */}
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />

      <Stack.Screen
        name="CommandWall"
        component={CommandWallScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="WeeklyReport"
        component={WeeklyReportScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Parent only */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Shared health */}
      <Stack.Screen
        name="HealthHub"
        component={HealthHubScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Parent + Child */}
      <Stack.Screen
        name="MedicationManager"
        options={{ animation: 'slide_from_right' }}
      >
        {(props) => (
          <ProtectedRoute allowParent allowChild>
            <MedicationManagerScreen {...props} />
          </ProtectedRoute>
        )}
      </Stack.Screen>

      <Stack.Screen
        name="SleepTracker"
        options={{ animation: 'slide_from_right' }}
      >
        {(props) => (
          <ProtectedRoute allowParent allowChild>
            <SleepTrackerScreen {...props} />
          </ProtectedRoute>
        )}
      </Stack.Screen>

      <Stack.Screen
        name="WorkoutTracker"
        options={{ animation: 'slide_from_right' }}
      >
        {(props) => (
          <ProtectedRoute allowParent allowChild>
            <WorkoutTrackerScreen {...props} />
          </ProtectedRoute>
        )}
      </Stack.Screen>

      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="LiveChat"
        component={LiveChatScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Full-screen map screens — no tab bar */}
      <Stack.Screen
        name="Geofence"
        component={GeofenceScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Military family tools — Family Pro only, same gating pattern as
          the other tier-gated feature groups below (see FinanceNavigator /
          OperationsNavigator). */}
      <Stack.Screen name="MilitaryHub" options={{ animation: 'slide_from_right' }}>
        {(props) => (
          <SubscriptionGate requiredTier="family_pro" featureName={t('military.title')}>
            <MilitaryHubScreen {...props} />
          </SubscriptionGate>
        )}
      </Stack.Screen>

      <Stack.Screen name="DeploymentTracker" options={{ animation: 'slide_from_right' }}>
        {(props) => (
          <SubscriptionGate requiredTier="family_pro" featureName={t('military.deployment')}>
            <DeploymentTrackerScreen {...props} />
          </SubscriptionGate>
        )}
      </Stack.Screen>

      <Stack.Screen name="PCSMove" options={{ animation: 'slide_from_right' }}>
        {(props) => (
          <SubscriptionGate requiredTier="family_pro" featureName={t('military.pcsFeature')}>
            <PCSMoveScreen {...props} />
          </SubscriptionGate>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyReadiness" options={{ animation: 'slide_from_right' }}>
        {(props) => (
          <SubscriptionGate requiredTier="family_pro" featureName={t('military.readinessFeature')}>
            <FamilyReadinessScreen {...props} />
          </SubscriptionGate>
        )}
      </Stack.Screen>

    </Stack.Navigator>
  );
}