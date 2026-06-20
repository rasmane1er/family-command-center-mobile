import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/onboarding/SplashScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { FamilySetupScreen } from '../screens/onboarding/FamilySetupScreen';
import { MemberSetupScreen } from '../screens/onboarding/MemberSetupScreen';
import { HomeSetupScreen } from '../screens/onboarding/HomeSetupScreen';
import { VehicleSetupScreen } from '../screens/onboarding/VehicleSetupScreen';
import { FinancialSetupScreen } from '../screens/onboarding/FinancialSetupScreen';
import { GoalsSetupScreen } from '../screens/onboarding/GoalsSetupScreen';

const Stack = createNativeStackNavigator();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="FamilySetup" component={FamilySetupScreen} />
      <Stack.Screen name="MemberSetup" component={MemberSetupScreen} />
      <Stack.Screen name="HomeSetup" component={HomeSetupScreen} />
      <Stack.Screen name="VehicleSetup" component={VehicleSetupScreen} />
      <Stack.Screen name="FinancialSetup" component={FinancialSetupScreen} />
      <Stack.Screen name="GoalsSetup" component={GoalsSetupScreen} />
    </Stack.Navigator>
  );
}
