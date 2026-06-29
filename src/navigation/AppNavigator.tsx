import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainNavigator } from './MainNavigator';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !isOnboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
