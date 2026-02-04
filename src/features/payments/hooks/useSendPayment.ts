/**
 * Send Payment Hook
 *
 * Manages the state and logic for sending a payment.
 */

import { useState, useCallback } from 'react';
import { useAppStore } from '../../../store';
import {
  sendPayment,
  validatePayment,
} from '../../wallet/services/walletService';
import { isValidAddress } from '../../../core/blockchain';

interface SendPaymentState {
  recipientInput: string;
  resolvedAddress: string | null;
  resolvedUsername: string | null;
  amount: string;
  memo: string;
  isLookingUp: boolean;
  isSending: boolean;
  lookupError: string | null;
  sendError: string | null;
}

export function useSendPayment() {
  const { balance, selectedNetwork } = useAppStore();

  const [state, setState] = useState<SendPaymentState>({
    recipientInput: '',
    resolvedAddress: null,
    resolvedUsername: null,
    amount: '',
    memo: '',
    isLookingUp: false,
    isSending: false,
    lookupError: null,
    sendError: null,
  });

  /**
   * Update recipient input and resolve address
   */
  const setRecipient = useCallback(async (input: string) => {
    setState(prev => ({
      ...prev,
      recipientInput: input,
      resolvedAddress: null,
      resolvedUsername: null,
      lookupError: null,
    }));

    if (!input) return;

    // Direct address input
    if (input.startsWith('0x')) {
      if (isValidAddress(input)) {
        setState(prev => ({
          ...prev,
          resolvedAddress: input,
        }));
      }
      return;
    }

    // @username or 6-digit ID - would need WebSocket lookup
    // For Phase 2, we'll just support direct addresses
    // Phase 3 will add username/ID lookup via WebSocket
    if (input.startsWith('@') || /^\d{6}$/.test(input)) {
      setState(prev => ({
        ...prev,
        lookupError:
          'Username/ID lookup coming in Phase 3. Use 0x address for now.',
      }));
    }
  }, []);

  /**
   * Update payment amount
   */
  const setAmount = useCallback((amount: string) => {
    setState(prev => ({
      ...prev,
      amount,
      sendError: null,
    }));
  }, []);

  /**
   * Update memo
   */
  const setMemo = useCallback((memo: string) => {
    setState(prev => ({
      ...prev,
      memo,
    }));
  }, []);

  /**
   * Validate the current payment
   */
  const validate = useCallback((): { isValid: boolean; error?: string } => {
    if (!state.resolvedAddress) {
      return { isValid: false, error: 'Please enter a valid recipient' };
    }

    return validatePayment(state.resolvedAddress, state.amount, balance);
  }, [state.resolvedAddress, state.amount, balance]);

  /**
   * Send the payment
   */
  const send = useCallback(async (): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> => {
    const validation = validate();
    if (!validation.isValid) {
      setState(prev => ({
        ...prev,
        sendError: validation.error || 'Invalid payment',
      }));
      return { success: false, error: validation.error };
    }

    setState(prev => ({ ...prev, isSending: true, sendError: null }));

    try {
      const txHash = await sendPayment(
        state.resolvedAddress!,
        state.amount,
        selectedNetwork,
      );

      setState(prev => ({ ...prev, isSending: false }));
      return { success: true, txHash };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Payment failed';
      setState(prev => ({
        ...prev,
        isSending: false,
        sendError: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [state.resolvedAddress, state.amount, selectedNetwork, validate]);

  /**
   * Reset the form
   */
  const reset = useCallback(() => {
    setState({
      recipientInput: '',
      resolvedAddress: null,
      resolvedUsername: null,
      amount: '',
      memo: '',
      isLookingUp: false,
      isSending: false,
      lookupError: null,
      sendError: null,
    });
  }, []);

  return {
    ...state,
    balance,
    setRecipient,
    setAmount,
    setMemo,
    validate,
    send,
    reset,
  };
}
