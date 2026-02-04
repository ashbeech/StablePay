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
import { SendScreen } from '../features/payments';
import { useAppStore } from '../store';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Send: undefined;
  // Future screens:
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
          animation: 'slide_from_right',
        }}
      >
        {!isOnboardingComplete ? (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{
              gestureEnabled: false, // Can't swipe back during onboarding
              animation: 'fade',
            }}
          />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="Send"
              component={SendScreen}
              options={{
                presentation: 'card',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
