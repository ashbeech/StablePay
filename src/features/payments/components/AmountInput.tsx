/**
 * Amount Input Component
 *
 * A large, prominent input for entering payment amounts.
 * Shows currency symbol and handles decimal formatting.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../../app/theme';

interface AmountInputProps {
  value: string;
  onChangeValue: (value: string) => void;
  currency?: string;
  maxDecimals?: number;
  placeholder?: string;
}

export function AmountInput({
  value,
  onChangeValue,
  currency = 'dUSDT',
  maxDecimals = 2,
  placeholder = '0.00',
}: AmountInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeText = useCallback(
    (text: string) => {
      // Remove any non-numeric characters except decimal point
      let cleaned = text.replace(/[^0-9.]/g, '');

      // Ensure only one decimal point
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
      }

      // Limit decimal places
      if (parts.length === 2 && parts[1].length > maxDecimals) {
        cleaned = parts[0] + '.' + parts[1].slice(0, maxDecimals);
      }

      // Prevent leading zeros (except for decimals like 0.xx)
      if (cleaned.length > 1 && cleaned[0] === '0' && cleaned[1] !== '.') {
        cleaned = cleaned.slice(1);
      }

      onChangeValue(cleaned);
    },
    [maxDecimals, onChangeValue],
  );

  const handleClear = useCallback(() => {
    onChangeValue('');
  }, [onChangeValue]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
        ]}
      >
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectTextOnFocus
        />
        <Text style={styles.currency}>{currency}</Text>
      </View>

      {value.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  currencySymbol: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    padding: 0,
  },
  currency: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  clearButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  clearButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
  },
});
