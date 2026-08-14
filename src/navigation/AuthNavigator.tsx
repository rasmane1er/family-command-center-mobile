import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';
import { MfaChallengeScreen } from '../screens/auth/MfaChallengeScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '../screens/settings/TermsOfServiceScreen';
import { useAuthStore } from '../store/useAuthStore';
import { withScreenErrorBoundary } from './withScreenErrorBoundary';

const Stack = createNativeStackNavigator();

export function AuthNavigator() {
  const pendingVerificationEmail = useAuthStore((s) => s.pendingVerificationEmail);
  const mfaChallenge = useAuthStore((s) => s.mfaChallenge);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {pendingVerificationEmail ? (
        <Stack.Screen name="EmailVerification" component={withScreenErrorBoundary(EmailVerificationScreen)} />
      ) : mfaChallenge ? (
        <Stack.Screen name="MfaChallenge" component={withScreenErrorBoundary(MfaChallengeScreen)} />
      ) : (
        <>
          <Stack.Screen name="SignIn" component={withScreenErrorBoundary(SignInScreen)} />
          <Stack.Screen name="SignUp" component={withScreenErrorBoundary(SignUpScreen)} />
          <Stack.Screen name="ForgotPassword" component={withScreenErrorBoundary(ForgotPasswordScreen)} />
          <Stack.Screen name="PrivacyPolicy" component={withScreenErrorBoundary(PrivacyPolicyScreen)} />
          <Stack.Screen name="TermsOfService" component={withScreenErrorBoundary(TermsOfServiceScreen)} />
        </>
      )}
    </Stack.Navigator>
  );
}
