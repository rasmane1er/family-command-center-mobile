import React from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainNavigator } from './MainNavigator';
import { withScreenErrorBoundary } from './withScreenErrorBoundary';

const Stack = createNativeStackNavigator();

export function AppNavigator({ navigationRef }: { navigationRef?: React.RefObject<NavigationContainerRef<any> | null> }) {
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={withScreenErrorBoundary(AuthNavigator)} />
        ) : !isOnboarded ? (
          <Stack.Screen name="Onboarding" component={withScreenErrorBoundary(OnboardingNavigator)} />
        ) : (
          <Stack.Screen name="Main" component={withScreenErrorBoundary(MainNavigator)} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
