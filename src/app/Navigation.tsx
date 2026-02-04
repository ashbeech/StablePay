/**
 * Navigation Configuration
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '../features/onboarding';
import { HomeScreen } from '../features/wallet';
import {
  SendScreen,
  ReceiveScreen,
  RequestDetailsScreen,
} from '../features/payments';
<<<<<<< HEAD
=======
import { ProfileScreen } from '../features/profile';
>>>>>>> 5aae11a (Add Profile screen, WebSocket client plumbing, and SQLite transaction cache)
import { useAppStore } from '../store';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Send: undefined;
  Receive: undefined;
  RequestDetails: { requestId: string };
<<<<<<< HEAD
  // Future screens:
  // Profile: undefined;
=======
  Profile: undefined;
>>>>>>> 5aae11a (Add Profile screen, WebSocket client plumbing, and SQLite transaction cache)
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function Navigation() {
  const { isOnboardingComplete } = useAppStore();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        {!isOnboardingComplete ? (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
<<<<<<< HEAD
            options={{
              gestureEnabled: false,
              animation: 'fade',
            }}
=======
            options={{ gestureEnabled: false, animation: 'fade' }}
>>>>>>> 5aae11a (Add Profile screen, WebSocket client plumbing, and SQLite transaction cache)
          />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Send" component={SendScreen} />
            <Stack.Screen name="Receive" component={ReceiveScreen} />
            <Stack.Screen
              name="RequestDetails"
              component={RequestDetailsScreen}
<<<<<<< HEAD
              options={{
                presentation: 'modal',
              }}
=======
              options={{ presentation: 'modal' }}
>>>>>>> 5aae11a (Add Profile screen, WebSocket client plumbing, and SQLite transaction cache)
            />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
