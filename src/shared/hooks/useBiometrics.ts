/**
 * Biometrics Hook
 *
 * Handles biometric authentication for securing transactions.
 * Falls back to device passcode if biometrics not available.
 */

import { useState, useEffect, useCallback } from 'react';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true,
});

export type BiometricType = 'FaceID' | 'TouchID' | 'Biometrics' | 'None';

interface BiometricState {
  isAvailable: boolean;
  biometricType: BiometricType;
  isChecking: boolean;
}

export function useBiometrics() {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    biometricType: 'None',
    isChecking: true,
  });

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const { available, biometryType } =
        await rnBiometrics.isSensorAvailable();

      let type: BiometricType = 'None';
      if (available) {
        switch (biometryType) {
          case BiometryTypes.FaceID:
            type = 'FaceID';
            break;
          case BiometryTypes.TouchID:
            type = 'TouchID';
            break;
          case BiometryTypes.Biometrics:
            type = 'Biometrics';
            break;
          default:
            type = 'None';
        }
      }

      setState({
        isAvailable: available,
        biometricType: type,
        isChecking: false,
      });
    } catch (error) {
      console.error('Failed to check biometrics:', error);
      setState({
        isAvailable: false,
        biometricType: 'None',
        isChecking: false,
      });
    }
  };

  /**
   * Prompt the user for biometric authentication
   *
   * @param promptMessage - The message to show in the prompt
   * @returns true if authenticated, false otherwise
   */
  const authenticate = useCallback(
    async (
      promptMessage: string = 'Confirm your identity',
    ): Promise<boolean> => {
      try {
        const { success } = await rnBiometrics.simplePrompt({
          promptMessage,
          cancelButtonText: 'Cancel',
        });

        return success;
      } catch (error) {
        console.error('Biometric authentication failed:', error);
        return false;
      }
    },
    [],
  );

  /**
   * Get a human-readable name for the biometric type
   */
  const getBiometricName = useCallback((): string => {
    switch (state.biometricType) {
      case 'FaceID':
        return 'Face ID';
      case 'TouchID':
        return 'Touch ID';
      case 'Biometrics':
        return 'Biometric';
      default:
        return 'Passcode';
    }
  }, [state.biometricType]);

  return {
    ...state,
    authenticate,
    getBiometricName,
    checkBiometrics,
  };
}
