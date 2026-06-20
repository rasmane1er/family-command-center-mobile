import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AIAssistantScreen } from '../screens/ai/AIAssistantScreen';
import { AIMemoryScreen } from '../screens/ai/AIMemoryScreen';
import { ParentingCoachScreen } from '../screens/ai/ParentingCoachScreen';
import { NegotiatorScreen } from '../screens/ai/NegotiatorScreen';
import { DigitalTwinScreen } from '../screens/ai/DigitalTwinScreen';

const Stack = createNativeStackNavigator();

export function AINavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
      <Stack.Screen name="AIMemory" component={AIMemoryScreen} />
      <Stack.Screen name="ParentingCoach" component={ParentingCoachScreen} />
      <Stack.Screen name="Negotiator" component={NegotiatorScreen} />
      <Stack.Screen name="DigitalTwin" component={DigitalTwinScreen} />
    </Stack.Navigator>
  );
}
