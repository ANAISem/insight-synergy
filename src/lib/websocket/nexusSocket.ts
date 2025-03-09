/**
 * Nexus WebSocket Client
 * 
 * Diese Klasse ermöglicht die Echtzeit-Kommunikation mit dem Nexus-Debattensystem 
 * über WebSockets. Sie bietet Funktionen für Verbindungsmanagement, Nachrichtenverarbeitung
 * und automatische Wiederverbindung.
 */

import { Expert, Message } from '../api/nexusAPI';

export interface SocketMessage {
  type: string;
  payload: any;
}

export interface ExpertTypingEvent {
  expertId: string;
  isTyping: boolean;
}

export interface ExpertMessageEvent {
  message: Message;
}

export interface DebateUpdateEvent {
  status: 'active' | 'paused' | 'completed';
  expertIds?: string[];
}

export type NexusSocketEventListener = (data: any) => void;

export class NexusSocket {
  private socket: WebSocket | null = null;
  private url: string;
  private debateId: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000; // ms
  private reconnectTimeoutId: number | null = null;
  private eventListeners: Map<string, NexusSocketEventListener[]> = new Map();
  private isConnecting: boolean = false;
  private lastPingTime: number = 0;
  private pingInterval: number | null = null;
  private isAuthenticated: boolean = false;
  
  constructor(debateId: string) {
    this.debateId = debateId;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_NEXUS_WS_HOST || window.location.host;
    this.url = `${protocol}//${host}/api/nexus/ws/debates/${debateId}`;
  }
  
  /**
   * Stellt eine Verbindung zum WebSocket-Server her
   */
  connect(authToken?: string): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }
    
    if (this.isConnecting) {
      return Promise.resolve();
    }
    
    this.isConnecting = true;
    
    return new Promise((resolve, reject) => {
      try {
        // Füge Auth-Token als URL-Parameter hinzu, falls vorhanden
        const connectionUrl = authToken 
          ? `${this.url}?token=${encodeURIComponent(authToken)}` 
          : this.url;
          
        this.socket = new WebSocket(connectionUrl);
        
        this.socket.onopen = () => {
          console.log('WebSocket-Verbindung hergestellt');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.setupHeartbeat();
          
          // Authentifizierung bei Bedarf
          if (authToken && !this.isAuthenticated) {
            this.authenticate(authToken);
          }
          
          this.emit('connection', { status: 'connected' });
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as SocketMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('Fehler beim Verarbeiten einer WebSocket-Nachricht:', error);
          }
        };
        
        this.socket.onclose = (event) => {
          this.isConnecting = false;
          this.isAuthenticated = false;
          
          if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
          }
          
          console.log(`WebSocket-Verbindung geschlossen: ${event.code} ${event.reason}`);
          
          // Versuche Wiederverbindung, außer bei bewusstem Schließen
          if (event.code !== 1000) {
            this.attemptReconnect();
          }
          
          this.emit('disconnection', { 
            code: event.code, 
            reason: event.reason,
            wasClean: event.wasClean
          });
          
          if (this.isConnecting) {
            reject(new Error(`Verbindung geschlossen: ${event.code} ${event.reason}`));
          }
        };
        
        this.socket.onerror = (error) => {
          this.isConnecting = false;
          console.error('WebSocket-Fehler:', error);
          this.emit('error', error);
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        console.error('Fehler beim Herstellen der WebSocket-Verbindung:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Versucht eine Wiederverbindung nach Verbindungsverlust
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Maximale Anzahl von Wiederverbindungsversuchen (${this.maxReconnectAttempts}) erreicht`);
      this.emit('reconnect_failed', { attempts: this.reconnectAttempts });
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`Versuche Wiederverbindung in ${delay}ms (Versuch ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    if (this.reconnectTimeoutId) {
      window.clearTimeout(this.reconnectTimeoutId);
    }
    
    this.reconnectTimeoutId = window.setTimeout(() => {
      this.emit('reconnecting', { attempt: this.reconnectAttempts });
      
      // Hole neues Auth-Token, falls nötig
      const authToken = localStorage.getItem('auth_token');
      this.connect(authToken)
        .then(() => {
          this.emit('reconnected', { attempts: this.reconnectAttempts });
        })
        .catch((error) => {
          console.error('Wiederverbindungsversuch fehlgeschlagen:', error);
          this.attemptReconnect();
        });
    }, delay);
  }
  
  /**
   * Richtet den Heartbeat für die Verbindung ein
   */
  private setupHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.lastPingTime = Date.now();
    
    // Sende alle 30 Sekunden einen Ping, um die Verbindung offen zu halten
    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.send('ping', {});
        this.lastPingTime = Date.now();
      }
    }, 30000);
  }
  
  /**
   * Authentifiziert die Verbindung
   */
  private authenticate(token: string): void {
    this.send('authenticate', { token });
  }
  
  /**
   * Verarbeitet eingehende Nachrichten
   */
  private handleMessage(message: SocketMessage): void {
    switch (message.type) {
      case 'pong':
        // Heartbeat-Antwort vom Server
        break;
        
      case 'authenticated':
        this.isAuthenticated = true;
        this.emit('authenticated', message.payload);
        break;
        
      case 'expert_typing':
        this.emit('expert_typing', message.payload as ExpertTypingEvent);
        break;
        
      case 'message':
        this.emit('message', message.payload as ExpertMessageEvent);
        break;
        
      case 'debate_update':
        this.emit('debate_update', message.payload as DebateUpdateEvent);
        break;
        
      case 'expert_joined':
        this.emit('expert_joined', message.payload as Expert);
        break;
        
      case 'expert_left':
        this.emit('expert_left', message.payload as { expertId: string });
        break;
        
      case 'error':
        console.error('Server-Fehler:', message.payload);
        this.emit('server_error', message.payload);
        break;
        
      default:
        console.log('Unbekannter Nachrichtentyp:', message.type, message.payload);
    }
  }
  
  /**
   * Sendet eine Nachricht an den Server
   */
  send(type: string, payload: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Versuch, eine Nachricht über eine nicht verbundene WebSocket zu senden');
      return false;
    }
    
    try {
      const message: SocketMessage = { type, payload };
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Fehler beim Senden einer WebSocket-Nachricht:', error);
      return false;
    }
  }
  
  /**
   * Sendet eine Nachricht an die Debatte
   */
  sendMessage(content: string): boolean {
    return this.send('user_message', { content });
  }
  
  /**
   * Signalisiert, dass der Nutzer tippt
   */
  sendTypingStatus(isTyping: boolean): boolean {
    return this.send('user_typing', { isTyping });
  }
  
  /**
   * Fordert eine bestimmte Expertenantwort an
   */
  requestExpertResponse(expertId: string, query?: string): boolean {
    return this.send('request_expert', { expertId, query });
  }
  
  /**
   * Pausiert oder setzt die Debatte fort
   */
  updateDebateStatus(status: 'active' | 'paused' | 'completed'): boolean {
    return this.send('update_status', { status });
  }
  
  /**
   * Bewertet eine Expertenantwort
   */
  rateMessage(messageId: string, rating: 'helpful' | 'neutral' | 'unhelpful'): boolean {
    return this.send('rate_message', { messageId, rating });
  }
  
  /**
   * Schließt die WebSocket-Verbindung
   */
  disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectTimeoutId) {
      window.clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.socket) {
      this.socket.close(1000, 'Client-Trennung');
      this.socket = null;
    }
    
    this.isAuthenticated = false;
  }
  
  /**
   * Registriert einen Event-Listener
   */
  on(event: string, callback: NexusSocketEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event)?.push(callback);
  }
  
  /**
   * Entfernt einen Event-Listener
   */
  off(event: string, callback: NexusSocketEventListener): void {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    
    if (listeners.length === 0) {
      this.eventListeners.delete(event);
    }
  }
  
  /**
   * Löst ein Event aus
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Fehler in Event-Listener für '${event}':`, error);
      }
    }
  }
  
  /**
   * Prüft, ob die Verbindung aktiv ist
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
  
  /**
   * Gibt Verbindungsstatistiken zurück
   */
  getStats(): {
    connected: boolean;
    authenticated: boolean;
    reconnectAttempts: number;
    lastPingTime: number;
    latency?: number;
  } {
    return {
      connected: this.isConnected(),
      authenticated: this.isAuthenticated,
      reconnectAttempts: this.reconnectAttempts,
      lastPingTime: this.lastPingTime,
      latency: this.lastPingTime ? Date.now() - this.lastPingTime : undefined
    };
  }
}

// Singleton-Manager für WebSocket-Verbindungen
export class NexusSocketManager {
  private static instance: NexusSocketManager;
  private connections: Map<string, NexusSocket> = new Map();
  
  private constructor() {}
  
  static getInstance(): NexusSocketManager {
    if (!NexusSocketManager.instance) {
      NexusSocketManager.instance = new NexusSocketManager();
    }
    
    return NexusSocketManager.instance;
  }
  
  /**
   * Gibt eine WebSocket-Verbindung für eine bestimmte Debatte zurück
   */
  getConnection(debateId: string): NexusSocket {
    if (!this.connections.has(debateId)) {
      this.connections.set(debateId, new NexusSocket(debateId));
    }
    
    return this.connections.get(debateId)!;
  }
  
  /**
   * Schließt eine bestimmte Verbindung
   */
  closeConnection(debateId: string): void {
    const connection = this.connections.get(debateId);
    if (connection) {
      connection.disconnect();
      this.connections.delete(debateId);
    }
  }
  
  /**
   * Schließt alle Verbindungen
   */
  closeAllConnections(): void {
    for (const [debateId, connection] of this.connections) {
      connection.disconnect();
    }
    
    this.connections.clear();
  }
}

// Hook für die Verwendung in React-Komponenten
export const useNexusSocket = (debateId: string): NexusSocket => {
  return NexusSocketManager.getInstance().getConnection(debateId);
}; 