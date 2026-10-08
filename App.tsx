import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AppNavigator } from './src/navigation/AppNavigator';
import { NotificationScheduler } from './src/components/NotificationScheduler';
import { AppInitializer } from './src/components/AppInitializer';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { requestPermissions } from './src/services/NotificationService';

export default function App() {
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    requestPermissions();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const route = data?.route as string | undefined;
      if (!route || !navigationRef.current) return;

      const nav = navigationRef.current;
      if (route === 'Bills') nav.navigate('Tabs', { screen: 'Finance' });
      else if (route === 'Pantry') nav.navigate('Tabs', { screen: 'Operations' });
      else if (route === 'MedicationManager') nav.navigate('MedicationManager');
      else if (route === 'BirthdayTracker') nav.navigate('Tabs', { screen: 'Family' });
      else if (route === 'GardenPlanner') nav.navigate('Tabs', { screen: 'Operations' });
      else if (route === 'Calendar') nav.navigate('Tabs', { screen: 'Home' });
      else if (route === 'Vehicles') nav.navigate('Tabs', { screen: 'Operations' });
    });

    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <ErrorBoundary>
          <NotificationScheduler />
          <AppInitializer />
          <AppNavigator navigationRef={navigationRef} />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
