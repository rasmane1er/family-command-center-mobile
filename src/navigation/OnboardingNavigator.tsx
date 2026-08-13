import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/onboarding/SplashScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { MemberSetupScreen } from '../screens/onboarding/MemberSetupScreen';
import { HomeSetupScreen } from '../screens/onboarding/HomeSetupScreen';
import { VehicleSetupScreen } from '../screens/onboarding/VehicleSetupScreen';
import { FinancialSetupScreen } from '../screens/onboarding/FinancialSetupScreen';
import { GoalsSetupScreen } from '../screens/onboarding/GoalsSetupScreen';
import { ChildConnectScreen } from '../screens/onboarding/ChildConnectScreen';
import { withScreenErrorBoundary } from './withScreenErrorBoundary';

const Stack = createNativeStackNavigator();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: false }}>
      <Stack.Screen name="Splash" component={withScreenErrorBoundary(SplashScreen)} />
      <Stack.Screen name="Welcome" component={withScreenErrorBoundary(WelcomeScreen)} />
      <Stack.Screen name="MemberSetup" component={withScreenErrorBoundary(MemberSetupScreen)} />
      <Stack.Screen name="HomeSetup" component={withScreenErrorBoundary(HomeSetupScreen)} />
      <Stack.Screen name="VehicleSetup" component={withScreenErrorBoundary(VehicleSetupScreen)} />
      <Stack.Screen name="FinancialSetup" component={withScreenErrorBoundary(FinancialSetupScreen)} />
      <Stack.Screen name="GoalsSetup" component={withScreenErrorBoundary(GoalsSetupScreen)} />
      <Stack.Screen name="ChildConnect" component={withScreenErrorBoundary(ChildConnectScreen)} />
    </Stack.Navigator>
  );
}
