/**
 * Navigation Configuration
 *
 * Handles routing between screens based on app state:
 * - Onboarding: Shown if user hasn't completed wallet setup
 * - Main: Home screen and authenticated routes
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '../features/onboarding';
import { HomeScreen } from '../features/wallet';
import { useAppStore } from '../store';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  // Future screens:
  // Send: undefined;
  // Receive: undefined;
  // Profile: undefined;
  // RequestDetails: { requestId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function Navigation() {
  const { isOnboardingComplete } = useAppStore();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {!isOnboardingComplete ? (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{
              gestureEnabled: false, // Can't swipe back during onboarding
            }}
          />
        ) : (
          <Stack.Screen name="Home" component={HomeScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
