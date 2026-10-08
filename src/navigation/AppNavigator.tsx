import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainNavigator } from './MainNavigator';
import { LockScreen } from '../screens/auth/LockScreen';
import { PinSetupScreen } from '../screens/auth/PinSetupScreen';
import { SecurityScreen } from '../screens/auth/SecurityScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const { hasPinSet, isAuthenticated, checkShouldLock, setAuthenticated, updateLastActive } = useAuthStore();
  const appState = useRef(AppState.currentState);

  // Re-lock when app comes back from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (checkShouldLock()) {
          setAuthenticated(false);
        }
      }
      if (nextState === 'active') {
        updateLastActive();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  const showLock = isOnboarded && hasPinSet && !isAuthenticated;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {showLock ? (
          // Locked — show PIN/biometric gate
          <Stack.Screen name="Lock" component={LockScreen} />
        ) : !isOnboarded ? (
          // First-time setup
          <>
            <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
            <Stack.Screen name="PinSetup" component={PinSetupScreen} />
          </>
        ) : (
          // Authenticated & onboarded — full app
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen name="PinSetup" component={PinSetupScreen} options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="Security" component={SecurityScreen} options={{ animation: 'slide_from_right' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
