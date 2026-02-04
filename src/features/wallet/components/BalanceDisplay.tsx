/**
 * Balance Display Component
 *
 * Shows the user's current balance prominently.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '../../../app/theme';

interface BalanceDisplayProps {
  balance: string;
  currency?: string;
  isLoading?: boolean;
}

export function BalanceDisplay({
  balance,
  currency = 'dUSDT',
  isLoading = false,
}: BalanceDisplayProps) {
  // Format balance with dollar sign and proper decimals
  const formattedBalance = formatBalance(balance);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <>
          <Text style={styles.balance}>${formattedBalance}</Text>
          <Text style={styles.currency}>{currency}</Text>
        </>
      )}
    </View>
  );
}

function formatBalance(balance: string): string {
  const num = parseFloat(balance);
  if (isNaN(num)) return '0.00';

  // Format with commas and 2 decimal places
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  balance: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  currency: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
