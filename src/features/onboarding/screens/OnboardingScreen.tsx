/**
 * Onboarding Screen
 *
 * Two-stage flow:
 * 1. Welcome + wallet generation (with loading state)
 * 2. Recovery phrase display with mandatory "I've Saved My Phrase" confirmation
 *
 * If app closes before confirmation, this screen shows again on next launch.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../../app/theme';
import { Button, Logo } from '../../../shared/components';
import { RecoveryPhraseDisplay } from '../components/RecoveryPhraseDisplay';
import { useWalletGeneration } from '../hooks/useWalletGeneration';

type OnboardingStage = 'welcome' | 'generating' | 'recovery';

export function OnboardingScreen() {
  const [stage, setStage] = useState<OnboardingStage>('welcome');
  const [isConfirming, setIsConfirming] = useState(false);

  const {
    isGenerating,
    mnemonic,
    error,
    generateWallet,
    confirmPhraseSaved,
    getMnemonicWords,
  } = useWalletGeneration();

  // Auto-generate wallet on mount
  useEffect(() => {
    handleStartOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartOnboarding = async () => {
    setStage('generating');
    try {
      await generateWallet();
      setStage('recovery');
    } catch (err) {
      setStage('welcome');
      Alert.alert('Error', 'Failed to create wallet. Please try again.');
    }
  };

  const handleConfirmSaved = async () => {
    setIsConfirming(true);
    try {
      const success = await confirmPhraseSaved();
      if (!success) {
        Alert.alert('Error', 'Failed to save. Please try again.');
      }
      // Navigation will happen automatically via app state change
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Stage 1 & 2: Welcome / Generating
  if (stage === 'welcome' || stage === 'generating') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Logo size="large" showTagline />

          <View style={styles.loadingContainer}>
            {stage === 'generating' || isGenerating ? (
              <>
                <Text style={styles.loadingText}>Creating your wallet...</Text>
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                  style={styles.spinner}
                />
              </>
            ) : error ? (
              <>
                <Text style={styles.errorText}>{error}</Text>
                <Button
                  title="Try Again"
                  onPress={handleStartOnboarding}
                  style={styles.retryButton}
                />
              </>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Stage 3: Recovery Phrase
  const words = getMnemonicWords();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.title}>Save Your Recovery Phrase</Text>
        </View>

        <Text style={styles.description}>
          This is the <Text style={styles.bold}>ONLY way</Text> to recover your
          wallet. Write it down and store it somewhere safe. Never share it with
          anyone.
        </Text>

        <RecoveryPhraseDisplay words={words} />

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Important:</Text>
          <Text style={styles.warningText}>
            • If you lose this phrase, you lose access to your funds forever
          </Text>
          <Text style={styles.warningText}>
            • Never share your recovery phrase with anyone
          </Text>
          <Text style={styles.warningText}>
            • StablePay cannot recover your wallet for you
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="I've Saved My Phrase"
            onPress={handleConfirmSaved}
            loading={isConfirming}
            size="large"
          />
          <Text style={styles.noSkipText}>
            You must save your phrase to continue
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  spinner: {
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: typography.fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    marginTop: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  warningIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  bold: {
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  warningBox: {
    backgroundColor: colors.warning + '15',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: spacing.xl,
  },
  noSkipText: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
