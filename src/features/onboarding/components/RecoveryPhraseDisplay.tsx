/**
 * Recovery Phrase Display Component
 *
 * Displays the 12-word recovery phrase in a numbered grid.
 * Includes copy to clipboard functionality.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { colors, spacing, borderRadius, typography } from '../../../app/theme';

interface RecoveryPhraseDisplayProps {
  words: string[];
}

export function RecoveryPhraseDisplay({ words }: RecoveryPhraseDisplayProps) {
  const handleCopy = async () => {
    const phrase = words.join(' ');
    Clipboard.setString(phrase);
    Alert.alert(
      'Copied',
      'Recovery phrase copied to clipboard. Make sure to store it securely and clear your clipboard.',
    );
  };

  // Split into two columns (6 words each)
  const leftColumn = words.slice(0, 6);
  const rightColumn = words.slice(6, 12);

  return (
    <View style={styles.container}>
      <View style={styles.phraseContainer}>
        <View style={styles.column}>
          {leftColumn.map((word, index) => (
            <View key={index} style={styles.wordRow}>
              <Text style={styles.wordNumber}>{index + 1}.</Text>
              <Text style={styles.word}>{word}</Text>
            </View>
          ))}
        </View>
        <View style={styles.column}>
          {rightColumn.map((word, index) => (
            <View key={index + 6} style={styles.wordRow}>
              <Text style={styles.wordNumber}>{index + 7}.</Text>
              <Text style={styles.word}>{word}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
        <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  phraseContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  column: {
    flex: 1,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  wordNumber: {
    width: 28,
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    fontWeight: typography.fontWeight.medium,
  },
  word: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  copyButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  copyButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
