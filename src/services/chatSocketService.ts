import { io, Socket } from 'socket.io-client';
import { secureStorage } from '../storage/secureStorage';
import { refreshAccessToken } from '../api/client';
import { awsConfig } from '../config/aws';

export interface ChatThread {
  id: string;
  familyId: string;
  subject: string | null;
  category: string | null;
  status: 'OPEN' | 'PENDING' | 'RESOLVED';
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderType: 'user' | 'agent';
  senderId: string | null;
  senderName: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type JoinAck = { ok: boolean; error?: string };
type SendAck = { ok: boolean; error?: string; message?: ChatMessage };

type MessageListener = (message: ChatMessage) => void;
type ThreadStatusListener = (payload: { threadId: string; status: ChatThread['status'] }) => void;
type ConnectionListener = (status: ConnectionStatus) => void;

const ACK_TIMEOUT_MS = 8000;

// Thin wrapper around socket.io-client for the live-chat feature. Handles
// connecting with the current access token, retrying once via
// refreshAccessToken() on auth failure, and falling back to REST-only mode
// (resolve(false)) if that retry also fails.
class ChatSocketService {
  private socket: Socket | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private retriedAuth = false;
  private connectPromise: Promise<boolean> | null = null;

  private messageListeners = new Set<MessageListener>();
  private threadStatusListeners = new Set<ThreadStatusListener>();
  private connectionListeners = new Set<ConnectionListener>();

  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  async connect(): Promise<boolean> {
    if (this.socket?.connected) return true;
    if (this.connectPromise) return this.connectPromise;

    this.retriedAuth = false;
    const token = await secureStorage.getToken('access_token');
    if (!token) {
      this.setStatus('error');
      return false;
    }

    this.connectPromise = this.attemptConnect(token).finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise;
  }

  private attemptConnect(token: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Socket.IO's event callbacks run outside of any caller's try/catch
      // (they fire on the JS event loop independent of the async call stack
      // that invoked connect()), so an exception thrown inside one — a bad
      // payload, a native WebSocket hiccup, etc. — would otherwise be an
      // unhandled JS exception that crashes/red-screens the whole app rather
      // than just failing the chat feature. Every callback below is wrapped
      // so a failure degrades to REST-only mode instead.
      const guard = <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => {
        try {
          fn(...args);
        } catch {
          this.setStatus('error');
        }
      };

      let socket: Socket;
      try {
        this.teardownSocket();
        this.setStatus('connecting');

        socket = io(awsConfig.apiBaseUrl, {
          path: '/socket.io',
          transports: ['websocket'],
          auth: { token },
          reconnection: true,
        });
      } catch {
        this.setStatus('error');
        resolve(false);
        return;
      }

      this.socket = socket;
      let settled = false;

      socket.on('connect', guard(() => {
        if (settled) return;
        settled = true;
        this.setStatus('connected');
        resolve(true);
      }));

      socket.on('connect_error', guard(async () => {
        if (settled) return;

        if (!this.retriedAuth) {
          this.retriedAuth = true;
          const newToken = await refreshAccessToken().catch(() => null);
          if (newToken && !settled) {
            settled = true;
            resolve(await this.attemptConnect(newToken).catch(() => false));
            return;
          }
        }

        settled = true;
        this.setStatus('error');
        this.teardownSocket();
        resolve(false);
      }));

      socket.on('disconnect', guard(() => {
        this.setStatus('disconnected');
      }));

      socket.on('chat:message', guard((message: ChatMessage) => {
        this.messageListeners.forEach((listener) => listener(message));
      }));

      socket.on('chat:thread-status', guard((payload: { threadId: string; status: ChatThread['status'] }) => {
        this.threadStatusListeners.forEach((listener) => listener(payload));
      }));
    });
  }

  disconnect() {
    this.teardownSocket();
    this.setStatus('disconnected');
  }

  private teardownSocket() {
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch {
        // best-effort cleanup
      }
      this.socket = null;
    }
  }

  private setStatus(status: ConnectionStatus) {
    this.connectionStatus = status;
    this.connectionListeners.forEach((listener) => listener(status));
  }

  joinThread(threadId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => resolve(false), ACK_TIMEOUT_MS);
      try {
        this.socket.emit('chat:join', { threadId }, (ack: JoinAck) => {
          clearTimeout(timeout);
          resolve(!!ack?.ok);
        });
      } catch {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }

  sendMessage(threadId: string, body: string): Promise<SendAck> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ ok: false, error: 'not_connected' });
        return;
      }

      const timeout = setTimeout(() => resolve({ ok: false, error: 'timeout' }), ACK_TIMEOUT_MS);
      try {
        this.socket.emit('chat:message', { threadId, body }, (ack: SendAck) => {
          clearTimeout(timeout);
          resolve(ack ?? { ok: false, error: 'no_ack' });
        });
      } catch {
        clearTimeout(timeout);
        resolve({ ok: false, error: 'emit_failed' });
      }
    });
  }

  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onThreadStatus(listener: ThreadStatusListener): () => void {
    this.threadStatusListeners.add(listener);
    return () => this.threadStatusListeners.delete(listener);
  }

  onConnectionStatus(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }
}

export const chatSocketService = new ChatSocketService();
