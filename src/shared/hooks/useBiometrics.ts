/**
 * Biometrics Hook
 *
 * Handles biometric authentication for securing transactions.
 */

import { useState, useEffect, useCallback } from 'react';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true,
});

export type BiometricType = 'FaceID' | 'TouchID' | 'Biometrics' | 'None';

export function useBiometrics() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('None');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    setIsChecking(true);
    try {
      const { available, biometryType } =
        await rnBiometrics.isSensorAvailable();
      setIsAvailable(available);
      if (available) {
        switch (biometryType) {
          case BiometryTypes.FaceID:
            setBiometricType('FaceID');
            break;
          case BiometryTypes.TouchID:
            setBiometricType('TouchID');
            break;
          case BiometryTypes.Biometrics:
            setBiometricType('Biometrics');
            break;
          default:
            setBiometricType('None');
        }
      }
    } catch {
      setIsAvailable(false);
      setBiometricType('None');
    } finally {
      setIsChecking(false);
    }
  };

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
      } catch {
        return false;
      }
    },
    [],
  );

  const getBiometricName = useCallback((): string => {
    switch (biometricType) {
      case 'FaceID':
        return 'Face ID';
      case 'TouchID':
        return 'Touch ID';
      case 'Biometrics':
        return 'Biometric';
      default:
        return 'Passcode';
    }
  }, [biometricType]);

  return {
    isAvailable,
    biometricType,
    isChecking,
    authenticate,
    getBiometricName,
    checkBiometrics,
  };
}
