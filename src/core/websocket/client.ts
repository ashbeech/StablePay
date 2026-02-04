/**
 * WebSocket Client
 *
 * Manages the connection to the relay server with:
 * - Automatic reconnection with exponential backoff
 * - Authentication via signed message
 * - Ping/pong keep-alive
 * - Message queuing when disconnected
 */

import { ethers } from 'ethers';
import {
  RELAY_SERVER_URL,
  type ClientMessage,
  type ServerMessage,
  type ConnectionState,
  type WebSocketState,
} from './types';

// Reconnection settings
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL = 30000; // 30 seconds

type MessageHandler = (message: ServerMessage) => void;
type StateChangeHandler = (state: WebSocketState) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private state: WebSocketState = {
    connectionState: 'disconnected',
    isAuthenticated: false,
    reconnectAttempts: 0,
  };

  private privateKey: string | null = null;
  private address: string | null = null;

  private messageHandlers: Set<MessageHandler> = new Set();
  private stateChangeHandlers: Set<StateChangeHandler> = new Set();

  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private messageQueue: ClientMessage[] = [];

  /**
   * Initialize the client with wallet credentials
   */
  initialize(privateKey: string, address: string): void {
    this.privateKey = privateKey;
    this.address = address;
  }

  /**
   * Connect to the relay server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    if (!this.privateKey || !this.address) {
      console.error('[WS] Client not initialized');
      return;
    }

    this.updateState({ connectionState: 'connecting' });

    try {
      this.ws = new WebSocket(RELAY_SERVER_URL);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('[WS] Connection error:', error);
      this.updateState({
        connectionState: 'error',
        lastError: 'Failed to connect',
      });
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.clearTimers();
    this.state.reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.updateState({
      connectionState: 'disconnected',
      isAuthenticated: false,
    });
  }

  /**
   * Send a message to the server
   */
  send(message: ClientMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      // Queue message for later if not connected
      this.messageQueue.push(message);
      console.log('[WS] Message queued (not connected)');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[WS] Send error:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * Subscribe to incoming messages
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    // Immediately call with current state
    handler(this.state);
    return () => this.stateChangeHandlers.delete(handler);
  }

  /**
   * Get current connection state
   */
  getState(): WebSocketState {
    return { ...this.state };
  }

  /**
   * Check if connected and authenticated
   */
  isReady(): boolean {
    return (
      this.state.connectionState === 'connected' && this.state.isAuthenticated
    );
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private handleOpen(): void {
    console.log('[WS] Connected, authenticating...');
    this.updateState({
      connectionState: 'authenticating',
      reconnectAttempts: 0,
    });
    this.authenticate();
  }

  private async authenticate(): Promise<void> {
    if (!this.privateKey || !this.address) return;

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `${this.address}${timestamp}`;
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));

      const wallet = new ethers.Wallet(this.privateKey);
      const signature = await wallet.signMessage(ethers.getBytes(messageHash));

      this.send({
        type: 'auth',
        payload: {
          address: this.address,
          timestamp,
          signature,
        },
      });
    } catch (error) {
      console.error('[WS] Auth error:', error);
      this.updateState({
        connectionState: 'error',
        lastError: 'Authentication failed',
      });
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as ServerMessage;

      // Handle auth responses
      if (message.type === 'auth_success') {
        console.log('[WS] Authenticated');
        this.updateState({
          connectionState: 'connected',
          isAuthenticated: true,
        });
        this.startPingTimer();
        this.flushMessageQueue();
      } else if (message.type === 'auth_error') {
        console.error('[WS] Auth failed:', message.payload.error);
        this.updateState({
          connectionState: 'error',
          isAuthenticated: false,
          lastError: message.payload.error,
        });
        this.disconnect();
        return;
      }

      // Handle pong
      if (message.type === 'pong') {
        return; // Just a keep-alive response
      }

      // Dispatch to handlers
      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('[WS] Handler error:', error);
        }
      });
    } catch (error) {
      console.error('[WS] Message parse error:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('[WS] Disconnected:', event.code, event.reason);
    this.clearTimers();
    this.ws = null;

    this.updateState({
      connectionState: 'disconnected',
      isAuthenticated: false,
    });

    // Auto-reconnect if not intentional disconnect
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    console.error('[WS] Error:', event);
    this.updateState({
      connectionState: 'error',
      lastError: 'Connection error',
    });
  }

  private scheduleReconnect(): void {
    if (this.state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[WS] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.state.reconnectAttempts),
      MAX_RECONNECT_DELAY,
    );

    console.log(`[WS] Reconnecting in ${delay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.updateState({
        reconnectAttempts: this.state.reconnectAttempts + 1,
      });
      this.connect();
    }, delay);
  }

  private startPingTimer(): void {
    this.pingTimer = setInterval(() => {
      this.send({
        type: 'ping',
        payload: { timestamp: Date.now() },
      });
    }, PING_INTERVAL);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private updateState(partial: Partial<WebSocketState>): void {
    this.state = { ...this.state, ...partial };
    this.stateChangeHandlers.forEach(handler => {
      try {
        handler(this.state);
      } catch (error) {
        console.error('[WS] State handler error:', error);
      }
    });
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();
