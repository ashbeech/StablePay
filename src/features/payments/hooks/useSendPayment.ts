/**
 * Send Payment Hook
 *
 * Manages the state and logic for sending a payment.
 * Supports lookup by @username, 6-digit ID, or direct address.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../../../store';
import {
  sendPayment,
  validatePayment,
} from '../../wallet/services/walletService';
import { isValidAddress } from '../../../core/blockchain';
import { lookupAny, type UserProfile } from '../../../core/websocket';

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
  const { balance, selectedNetwork, isConnected } = useAppStore();
  const lookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Update recipient input and resolve address
   */
  const setRecipient = useCallback(
    async (input: string) => {
      // Clear any pending lookup
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
      }

      setState(prev => ({
        ...prev,
        recipientInput: input,
        resolvedAddress: null,
        resolvedUsername: null,
        lookupError: null,
        isLookingUp: false,
      }));

      if (!input) return;

      // Direct address input - validate immediately
      if (input.startsWith('0x')) {
        if (input.length === 42 && isValidAddress(input)) {
          setState(prev => ({
            ...prev,
            resolvedAddress: input,
          }));
        }
        return;
      }

      // @username or 6-digit ID - need WebSocket lookup
      const isUsername =
        input.startsWith('@') || /^[a-zA-Z][a-zA-Z0-9_]{2,}$/.test(input);
      const isSixDigit = /^\d{6}$/.test(input);

      if (isUsername || isSixDigit) {
        // Check if WebSocket is connected
        if (!isConnected) {
          setState(prev => ({
            ...prev,
            lookupError: 'Not connected to relay. Use 0x address instead.',
          }));
          return;
        }

        // Debounce the lookup
        setState(prev => ({ ...prev, isLookingUp: true }));

        lookupTimeoutRef.current = setTimeout(async () => {
          try {
            const user = await lookupAny(input);
            setState(prev => ({
              ...prev,
              isLookingUp: false,
              resolvedAddress: user.address,
              resolvedUsername: user.username,
              lookupError: null,
            }));
          } catch (error) {
            setState(prev => ({
              ...prev,
              isLookingUp: false,
              lookupError:
                error instanceof Error ? error.message : 'User not found',
            }));
          }
        }, 500); // 500ms debounce
      }
    },
    [isConnected],
  );

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
    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
    }
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
    isConnected,
    setRecipient,
    setAmount,
    setMemo,
    validate,
    send,
    reset,
  };
}
