/**
 * StablePay Logo Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../app/theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
}

export function Logo({ size = 'medium', showTagline = false }: LogoProps) {
  const iconSize = size === 'small' ? 32 : size === 'medium' ? 48 : 64;
  const fontSize =
    size === 'small'
      ? typography.fontSize.lg
      : size === 'medium'
      ? typography.fontSize.xxl
      : typography.fontSize.xxxl;

  return (
    <View style={styles.container}>
      <View style={[styles.icon, { width: iconSize, height: iconSize }]}>
        <Text style={[styles.iconText, { fontSize: iconSize * 0.5 }]}>$</Text>
      </View>
      <Text style={[styles.name, { fontSize }]}>StablePay</Text>
      {showTagline && <Text style={styles.tagline}>E2EE Payments</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  icon: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconText: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  name: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
});
