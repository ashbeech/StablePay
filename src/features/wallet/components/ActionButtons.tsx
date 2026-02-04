/**
 * Pay/Receive Action Buttons
 *
 * Two large buttons for primary wallet actions.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from '../../../app/theme';

interface ActionButtonsProps {
  onPay: () => void;
  onReceive: () => void;
}

export function ActionButtons({ onPay, onReceive }: ActionButtonsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.payButton]}
        onPress={onPay}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonIcon}>↑</Text>
        <Text style={styles.buttonText}>PAY</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.receiveButton]}
        onPress={onReceive}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonIcon}>↓</Text>
        <Text style={styles.buttonText}>RECEIVE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    ...shadows.md,
  },
  payButton: {
    backgroundColor: colors.primary,
  },
  receiveButton: {
    backgroundColor: colors.success,
  },
  buttonIcon: {
    fontSize: 28,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  buttonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    letterSpacing: 1,
  },
});
