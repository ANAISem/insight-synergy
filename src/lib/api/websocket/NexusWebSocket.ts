/**
 * Nexus WebSocket-Manager
 * 
 * Verwaltet die WebSocket-Verbindungen für Echtzeit-Expertendebatten.
 * Unterstützt automatische Wiederverbindung, Nachrichtenpufferung und Zustands-Tracking.
 */

import { supabase } from '../apiClient';
import { EventEmitter } from 'events';

// Event-Typen, die vom WebSocket-Manager emittiert werden
export enum WebSocketEvent {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  MESSAGE = 'message',
  EXPERT_TYPING = 'expert_typing',
  EXPERT_MESSAGE = 'expert_message',
  USER_JOIN = 'user_join',
  USER_LEAVE = 'user_leave',
  ERROR = 'error',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
}

// Nachrichtentypen, die über WebSocket empfangen werden können
export enum MessageType {
  EXPERT_MESSAGE = 'expert_message',
  EXPERT_TYPING = 'expert_typing',
  SYSTEM_MESSAGE = 'system_message',
  FACT_CHECK = 'fact_check',
  STATUS_UPDATE = 'status_update',
  USER_ACTION = 'user_action',
}

// Struktur für WebSocket-Nachrichten
export interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp: string;
  debateId: string;
}

export interface TypedEventEmitter extends EventEmitter {
  on(event: WebSocketEvent, listener: (data: any) => void): this;
  emit(event: WebSocketEvent, data: any): boolean;
}

interface ConnectionOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  debug?: boolean;
}

/**
 * Nexus WebSocket-Manager für eine einzelne Debatte
 */
export class NexusWebSocketManager {
  private ws: WebSocket | null = null;
  private debateId: string;
  private eventEmitter: TypedEventEmitter = new EventEmitter() as TypedEventEmitter;
  private reconnectCount: number = 0;
  private messageQueue: WebSocketMessage[] = [];
  private connectionPromise: Promise<boolean> | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private isAlive: boolean = false;
  private isConnecting: boolean = false;
  private isAuthenticated: boolean = false;
  
  private options: ConnectionOptions = {
    reconnectInterval: 3000,     // 3 Sekunden zwischen Wiederverbindungsversuchen
    maxReconnectAttempts: 10,    // Maximale Anzahl an Wiederverbindungsversuchen
    pingInterval: 30000,         // Ping alle 30 Sekunden
    debug: false,                // Debug-Logging
  };
  
  constructor(debateId: string, options: Partial<ConnectionOptions> = {}) {
    this.debateId = debateId;
    this.options = { ...this.options, ...options };
    
    // Bind-Methoden zum Kontext
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.sendPing = this.sendPing.bind(this);
  }
  
  /**
   * Stellt eine Verbindung zum WebSocket-Server her
   */
  public async connect(): Promise<boolean> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return true;
    }
    
    if (this.isConnecting) {
      return this.connectionPromise || Promise.resolve(false);
    }
    
    this.isConnecting = true;
    this.eventEmitter.emit(WebSocketEvent.CONNECTING, { debateId: this.debateId });
    
    this.connectionPromise = new Promise(async (resolve) => {
      try {
        // Authentifizierungstoken abrufen
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        
        if (!accessToken) {
          this.log('Keine Authentifizierung verfügbar');
          this.isConnecting = false;
          resolve(false);
          return;
        }
        
        // WebSocket-URL mit Authentifizierung
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/nexus/ws/debates/${this.debateId}?token=${encodeURIComponent(accessToken)}`;
        
        this.ws = new WebSocket(wsUrl);
        
        // Event-Listener hinzufügen
        this.ws.addEventListener('open', () => {
          this.handleOpen();
          resolve(true);
        });
        
        this.ws.addEventListener('message', this.handleMessage);
        this.ws.addEventListener('error', this.handleError);
        this.ws.addEventListener('close', (e) => {
          this.handleClose(e);
          if (!this.isAlive) {
            resolve(false);
          }
        });
        
      } catch (error) {
        this.log('Fehler beim Herstellen der WebSocket-Verbindung:', error);
        this.isConnecting = false;
        this.eventEmitter.emit(WebSocketEvent.ERROR, { error, debateId: this.debateId });
        resolve(false);
      }
    });
    
    return this.connectionPromise;
  }
  
  /**
   * Schließt die WebSocket-Verbindung
   */
  public disconnect(code: number = 1000, reason: string = 'Client disconnected'): void {
    this.clearPingInterval();
    
    if (this.ws) {
      this.ws.removeEventListener('open', this.handleOpen);
      this.ws.removeEventListener('message', this.handleMessage);
      this.ws.removeEventListener('error', this.handleError);
      this.ws.removeEventListener('close', this.handleClose);
      
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(code, reason);
      }
      
      this.ws = null;
    }
    
    this.isAlive = false;
    this.isConnecting = false;
    this.connectionPromise = null;
    this.eventEmitter.emit(WebSocketEvent.DISCONNECTED, { debateId: this.debateId, code, reason });
  }
  
  /**
   * Sendet eine Nachricht über den WebSocket
   */
  public send(type: MessageType, payload: any): boolean {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      debateId: this.debateId,
    };
    
    // Wenn nicht verbunden, zur Warteschlange hinzufügen
    if (!this.isAlive) {
      this.messageQueue.push(message);
      this.log(`Nachricht zur Warteschlange hinzugefügt (${this.messageQueue.length} ausstehend)`);
      return false;
    }
    
    try {
      this.ws?.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.log('Fehler beim Senden der Nachricht:', error);
      this.eventEmitter.emit(WebSocketEvent.ERROR, { error, debateId: this.debateId });
      this.messageQueue.push(message);
      return false;
    }
  }
  
  /**
   * Verarbeitet das Öffnen der WebSocket-Verbindung
   */
  private handleOpen(): void {
    this.log('WebSocket-Verbindung hergestellt');
    this.isAlive = true;
    this.isConnecting = false;
    this.reconnectCount = 0;
    
    // Starte Ping-Intervall
    this.startPingInterval();
    
    // Sende alle wartenden Nachrichten
    this.flushMessageQueue();
    
    this.eventEmitter.emit(WebSocketEvent.CONNECTED, { debateId: this.debateId });
  }
  
  /**
   * Verarbeitet eingehende WebSocket-Nachrichten
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // Allgemeines Nachrichtenereignis emittieren
      this.eventEmitter.emit(WebSocketEvent.MESSAGE, message);
      
      // Spezifisches Ereignis basierend auf dem Nachrichtentyp emittieren
      switch (message.type) {
        case MessageType.EXPERT_MESSAGE:
          this.eventEmitter.emit(WebSocketEvent.EXPERT_MESSAGE, message.payload);
          break;
        
        case MessageType.EXPERT_TYPING:
          this.eventEmitter.emit(WebSocketEvent.EXPERT_TYPING, message.payload);
          break;
          
        case MessageType.USER_ACTION:
          if (message.payload.action === 'join') {
            this.eventEmitter.emit(WebSocketEvent.USER_JOIN, message.payload);
          } else if (message.payload.action === 'leave') {
            this.eventEmitter.emit(WebSocketEvent.USER_LEAVE, message.payload);
          }
          break;
      }
    } catch (error) {
      this.log('Fehler beim Verarbeiten der Nachricht:', error);
      this.eventEmitter.emit(WebSocketEvent.ERROR, { error, data: event.data, debateId: this.debateId });
    }
  }
  
  /**
   * Verarbeitet WebSocket-Fehler
   */
  private handleError(event: Event): void {
    this.log('WebSocket-Fehler:', event);
    this.eventEmitter.emit(WebSocketEvent.ERROR, { event, debateId: this.debateId });
  }
  
  /**
   * Verarbeitet das Schließen der WebSocket-Verbindung
   */
  private handleClose(event: CloseEvent): void {
    this.isAlive = false;
    this.isConnecting = false;
    this.clearPingInterval();
    
    this.log(`WebSocket-Verbindung geschlossen: ${event.code} - ${event.reason}`);
    this.eventEmitter.emit(WebSocketEvent.DISCONNECTED, {
      debateId: this.debateId,
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });
    
    // Automatische Wiederverbindung, wenn es sich nicht um einen normalen Abschluss handelt
    if (event.code !== 1000 && event.code !== 1001) {
      this.attemptReconnect();
    }
  }
  
  /**
   * Versucht eine Wiederverbindung mit exponentieller Verzögerung
   */
  private attemptReconnect(): void {
    if (this.reconnectCount >= (this.options.maxReconnectAttempts || 10)) {
      this.log('Maximale Anzahl an Wiederverbindungsversuchen erreicht');
      return;
    }
    
    const delay = Math.min(
      30000, // Maximale Verzögerung von 30 Sekunden
      (this.options.reconnectInterval || 3000) * Math.pow(1.5, this.reconnectCount)
    );
    
    this.reconnectCount++;
    this.eventEmitter.emit(WebSocketEvent.RECONNECTING, {
      debateId: this.debateId,
      attempt: this.reconnectCount,
      delay,
    });
    
    this.log(`Versuche Wiederverbindung in ${delay}ms (Versuch ${this.reconnectCount})`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.log('Wiederverbindung fehlgeschlagen:', error);
      }
    }, delay);
  }
  
  /**
   * Startet das Ping-Intervall zur Verbindungsüberwachung
   */
  private startPingInterval(): void {
    this.clearPingInterval();
    this.lastPingTime = Date.now();
    
    this.pingInterval = setInterval(this.sendPing, this.options.pingInterval || 30000);
  }
  
  /**
   * Löscht das Ping-Intervall
   */
  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  /**
   * Sendet einen Ping, um die Verbindung am Leben zu halten
   */
  private sendPing(): void {
    if (!this.isAlive) return;
    
    try {
      this.ws?.send(JSON.stringify({
        type: 'ping',
        debateId: this.debateId,
        timestamp: new Date().toISOString(),
      }));
      
      this.lastPingTime = Date.now();
    } catch (error) {
      this.log('Fehler beim Senden des Pings:', error);
      
      // Wenn der Ping fehlschlägt, versuche eine Wiederverbindung
      this.isAlive = false;
      this.attemptReconnect();
    }
  }
  
  /**
   * Sendet alle Nachrichten in der Warteschlange
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;
    
    this.log(`Sende ${this.messageQueue.length} wartende Nachrichten`);
    
    for (const message of this.messageQueue) {
      try {
        this.ws?.send(JSON.stringify(message));
      } catch (error) {
        this.log('Fehler beim Senden der wartenden Nachricht:', error);
        this.eventEmitter.emit(WebSocketEvent.ERROR, { error, debateId: this.debateId });
        return; // Bei einem Fehler abbrechen, um die Reihenfolge zu erhalten
      }
    }
    
    // Warteschlange leeren
    this.messageQueue = [];
  }
  
  /**
   * Debug-Logging
   */
  private log(...args: any[]): void {
    if (this.options.debug) {
      console.log(`[NexusWS:${this.debateId}]`, ...args);
    }
  }
  
  /**
   * Event-Listener hinzufügen
   */
  public on(event: WebSocketEvent, listener: (data: any) => void): () => void {
    this.eventEmitter.on(event, listener);
    
    // Rückgabe einer Funktion zum Entfernen des Listeners
    return () => {
      this.eventEmitter.removeListener(event, listener);
    };
  }
  
  /**
   * Prüft, ob die Verbindung aktiv ist
   */
  public isConnected(): boolean {
    return this.isAlive;
  }
  
  /**
   * Gibt den aktuellen Zustand der Verbindung zurück
   */
  public getState(): {
    isAlive: boolean;
    isConnecting: boolean;
    reconnectCount: number;
    queuedMessages: number;
    lastPingTime: number;
  } {
    return {
      isAlive: this.isAlive,
      isConnecting: this.isConnecting,
      reconnectCount: this.reconnectCount,
      queuedMessages: this.messageQueue.length,
      lastPingTime: this.lastPingTime,
    };
  }
}

// Globaler WebSocket-Manager zum Teilen von Verbindungen
class NexusGlobalWebSocketManager {
  private connections: Map<string, NexusWebSocketManager> = new Map();
  
  /**
   * Holt oder erstellt eine WebSocket-Verbindung für eine bestimmte Debatte
   */
  public getConnection(debateId: string, options: ConnectionOptions = {}): NexusWebSocketManager {
    if (!this.connections.has(debateId)) {
      this.connections.set(debateId, new NexusWebSocketManager(debateId, options));
    }
    
    return this.connections.get(debateId)!;
  }
  
  /**
   * Schließt alle aktiven Verbindungen
   */
  public closeAll(): void {
    for (const connection of this.connections.values()) {
      connection.disconnect();
    }
    
    this.connections.clear();
  }
  
  /**
   * Entfernt eine spezifische Verbindung
   */
  public removeConnection(debateId: string): void {
    const connection = this.connections.get(debateId);
    if (connection) {
      connection.disconnect();
      this.connections.delete(debateId);
    }
  }
  
  /**
   * Gibt alle aktiven Verbindungen zurück
   */
  public getActiveConnections(): string[] {
    return Array.from(this.connections.keys());
  }
}

// Singleton-Instanz des globalen Managers exportieren
export const nexusWebSockets = new NexusGlobalWebSocketManager();

/**
 * Hook zum Verwenden der WebSocket-Verbindung in React-Komponenten
 */
export function useDebateWebSocket(debateId: string, options: ConnectionOptions = {}) {
  if (typeof window === 'undefined') {
    // Wenn wir auf dem Server sind, geben wir eine Mock-Implementierung zurück
    return {
      connect: async () => false,
      disconnect: () => {},
      send: () => false,
      on: () => () => {},
      isConnected: () => false,
      getState: () => ({
        isAlive: false,
        isConnecting: false,
        reconnectCount: 0,
        queuedMessages: 0,
        lastPingTime: 0,
      }),
    };
  }
  
  return nexusWebSockets.getConnection(debateId, options);
} 