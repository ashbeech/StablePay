/**
 * Recipient Input Component
 *
 * Input field for entering recipient address, @username, or 6-digit ID.
 * Shows validation state and lookup results.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../../app/theme';
import { isValidAddress, shortenAddress } from '../../../core/blockchain';

interface RecipientInputProps {
  value: string;
  onChangeValue: (value: string) => void;
  resolvedAddress?: string | null;
  resolvedUsername?: string | null;
  isLookingUp?: boolean;
  error?: string | null;
  placeholder?: string;
}

export function RecipientInput({
  value,
  onChangeValue,
  resolvedAddress,
  resolvedUsername,
  isLookingUp = false,
  error,
  placeholder = '@username, 6-digit ID, or 0x address',
}: RecipientInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeText = useCallback(
    (text: string) => {
      // Trim whitespace
      onChangeValue(text.trim());
    },
    [onChangeValue],
  );

  // Determine the display state
  const isAddress = value.startsWith('0x');
  const isUsername = value.startsWith('@');
  const isSixDigit = /^\d{6}$/.test(value);

  const showResolved = !isLookingUp && !error && resolvedAddress;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {isLookingUp && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.loader}
          />
        )}
      </View>

      {/* Status message below input */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {showResolved && (
        <View style={styles.resolvedContainer}>
          <Text style={styles.resolvedLabel}>Sending to:</Text>
          <Text style={styles.resolvedAddress}>
            {resolvedUsername ? `@${resolvedUsername} · ` : ''}
            {shortenAddress(resolvedAddress)}
          </Text>
        </View>
      )}

      {/* Hint for input format */}
      {!value && !error && (
        <Text style={styles.hintText}>
          Enter a @username, 6-digit ID, or wallet address
        </Text>
      )}

      {/* Show validation status for direct address input */}
      {isAddress && !isLookingUp && !error && (
        <Text
          style={[
            styles.validationText,
            isValidAddress(value) ? styles.validText : styles.invalidText,
          ]}
        >
          {isValidAddress(value)
            ? '✓ Valid address'
            : '✗ Invalid address format'}
        </Text>
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
  inputContainerError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    padding: 0,
  },
  loader: {
    marginLeft: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  resolvedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  resolvedLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  resolvedAddress: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
  },
  hintText: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  validationText: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  validText: {
    color: colors.success,
  },
  invalidText: {
    color: colors.error,
  },
});
