/**
 * WebSocket-Client für Echtzeit-Debatten
 * 
 * Stellt eine zuverlässige WebSocket-Verbindung für Echtzeitkommunikation
 * mit Experten während Debatten bereit, inklusive automatischer Wiederverbindung,
 * Nachrichtenpufferung und Heartbeat-Mechanismen.
 */

import { toast } from '@/components/ui/use-toast';

// Event-Typen für DebateSocket
export enum DebateSocketEventType {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  RECONNECT = 'reconnect',
  RECONNECT_ATTEMPT = 'reconnect_attempt',
  ERROR = 'error',
  MESSAGE = 'message',
  TYPING_START = 'expert_typing_start',
  TYPING_END = 'expert_typing_end',
  MESSAGE_RECEIVED = 'message_received',
  FACT_CHECK_COMPLETE = 'fact_check_complete',
  DEBATE_STATUS = 'debate_status'
}

// Nachrichtentypen für die WebSocket-Kommunikation
export interface DebateSocketMessage {
  type: string;
  payload: any;
}

// Konfiguration für die WebSocket-Verbindung
export interface DebateSocketConfig {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

// Default-Konfiguration
const DEFAULT_CONFIG: DebateSocketConfig = {
  reconnectInterval: 2000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  debug: false,
};

/**
 * Handler für WebSocket-Events
 */
export type DebateSocketEventHandler = (data?: any) => void;

/**
 * DebateSocket-Klasse für zuverlässige WebSocket-Verbindungen
 */
export class DebateSocket {
  private socket: WebSocket | null = null;
  private url: string;
  private config: DebateSocketConfig;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: DebateSocketMessage[] = [];
  private eventHandlers: Map<string, DebateSocketEventHandler[]> = new Map();
  private isConnected: boolean = false;
  private manuallyDisconnected: boolean = false;
  private debateId: string;

  /**
   * Erstellt eine neue DebateSocket-Instanz
   * 
   * @param debateId Die ID der Debatte
   * @param config Optionale Konfiguration
   */
  constructor(debateId: string, config: Partial<DebateSocketConfig> = {}) {
    this.debateId = debateId;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Generiere die WebSocket-URL basierend auf der Umgebung
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBaseUrl = process.env.NEXT_PUBLIC_NEXUS_WS_URL || `${protocol}//${window.location.host}/api/nexus/ws`;
    this.url = `${wsBaseUrl}/debates/${debateId}`;
  }

  /**
   * Stellt eine Verbindung zum WebSocket-Server her
   */
  public connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) {
      this.debug('WebSocket-Verbindung bereits vorhanden oder wird aufgebaut');
      return;
    }

    this.manuallyDisconnected = false;
    this.debug(`Verbindung zu ${this.url} wird hergestellt...`);

    try {
      this.socket = new WebSocket(this.url);
      this.setupSocketEvents();
    } catch (error) {
      this.debug('Fehler beim Erstellen der WebSocket-Verbindung:', error);
      this.handleReconnect();
    }
  }

  /**
   * Richtet die Event-Handler für den Socket ein
   */
  private setupSocketEvents(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.debug('WebSocket-Verbindung hergestellt');
      
      // Starte Heartbeat
      this.startHeartbeat();
      
      // Leere die Nachrichtenwarteschlange
      this.flushMessageQueue();
      
      // Sende initiale Authentifizierung
      this.authenticate();
      
      // Löse das Connect-Event aus
      this.triggerEvent(DebateSocketEventType.CONNECT);
    };

    this.socket.onclose = (event) => {
      this.isConnected = false;
      this.stopHeartbeat();
      
      this.debug(`WebSocket-Verbindung geschlossen (Code: ${event.code}, Grund: ${event.reason})`);
      
      this.triggerEvent(DebateSocketEventType.DISCONNECT, {
        code: event.code,
        reason: event.reason,
      });
      
      // Versuche eine Wiederverbindung, wenn nicht manuell getrennt
      if (!this.manuallyDisconnected) {
        this.handleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      this.debug('WebSocket-Fehler:', error);
      this.triggerEvent(DebateSocketEventType.ERROR, error);
      
      // Bei Fehler nicht sofort trennen, das wird durch onclose gemacht
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event);
    };
  }

  /**
   * Verarbeitet eingehende WebSocket-Nachrichten
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.debug('Nachricht empfangen:', data);
      
      // Spezielle Behandlung für Heartbeat-Antworten
      if (data.type === 'heartbeat') {
        this.debug('Heartbeat empfangen');
        return;
      }
      
      // Löse das allgemeine Nachrichtenereignis aus
      this.triggerEvent(DebateSocketEventType.MESSAGE, data);
      
      // Löse das spezifische Event basierend auf dem Nachrichtentyp aus
      this.triggerEvent(data.type, data.payload);
    } catch (error) {
      this.debug('Fehler beim Verarbeiten der Nachricht:', error);
    }
  }

  /**
   * Authentifiziert den Socket nach der Verbindung
   */
  private authenticate(): void {
    const authToken = localStorage.getItem('auth_tokens') 
      ? JSON.parse(localStorage.getItem('auth_tokens') || '{}').accessToken 
      : null;
    
    if (authToken) {
      this.send('authenticate', { token: authToken, debateId: this.debateId });
    } else {
      this.debug('Keine Authentifizierung möglich: Kein Token verfügbar');
    }
  }

  /**
   * Startet den Heartbeat-Mechanismus
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setInterval(() => {
      this.debug('Sende Heartbeat...');
      this.send('heartbeat', { timestamp: Date.now() });
    }, this.config.heartbeatInterval);
  }

  /**
   * Stoppt den Heartbeat-Mechanismus
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Behandelt die Wiederverbindungslogik
   */
  private handleReconnect(): void {
    if (this.manuallyDisconnected) {
      this.debug('Keine Wiederverbindung, da manuell getrennt');
      return;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      this.debug('Maximale Anzahl an Wiederverbindungsversuchen erreicht');
      this.triggerEvent(DebateSocketEventType.ERROR, {
        message: 'Maximale Anzahl an Wiederverbindungsversuchen erreicht',
      });
      
      // Zeige Benutzerbenachrichtigung
      toast({
        variant: "destructive",
        title: "Verbindungsfehler",
        description: "Die Verbindung zur Debatte konnte nicht hergestellt werden. Bitte versuchen Sie es später erneut.",
      });
      
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.calculateReconnectDelay();
    
    this.debug(`Wiederverbindungsversuch ${this.reconnectAttempts} in ${delay}ms...`);
    this.triggerEvent(DebateSocketEventType.RECONNECT_ATTEMPT, {
      attempt: this.reconnectAttempts,
      delay,
    });
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Berechnet die Verzögerung für die Wiederverbindung mit exponentialem Backoff
   */
  private calculateReconnectDelay(): number {
    const baseDelay = this.config.reconnectInterval || 2000;
    const maxDelay = 30000; // 30 Sekunden maximale Verzögerung
    
    // Exponentielles Backoff mit Jitter für bessere Verteilung
    const exponentialDelay = Math.min(
      maxDelay,
      baseDelay * Math.pow(1.5, this.reconnectAttempts - 1)
    );
    
    // Füge zufälligen Jitter hinzu (±20%)
    const jitter = 0.2 * exponentialDelay;
    return Math.floor(exponentialDelay - jitter + Math.random() * jitter * 2);
  }

  /**
   * Beendet die WebSocket-Verbindung
   */
  public disconnect(): void {
    this.manuallyDisconnected = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close(1000, 'Normale Schließung');
    }
    
    this.socket = null;
    this.isConnected = false;
    this.debug('WebSocket-Verbindung getrennt');
  }

  /**
   * Sendet eine typisierte Nachricht
   */
  public send(type: string, payload: any = {}): boolean {
    const message: DebateSocketMessage = { type, payload };
    
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      // Füge die Nachricht zur Warteschlange hinzu, wenn keine Verbindung besteht
      this.messageQueue.push(message);
      this.debug('Nachricht zur Warteschlange hinzugefügt:', message);
      
      // Versuche zu verbinden, falls nicht bereits versucht
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        this.connect();
      }
      
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify(message));
      this.debug('Nachricht gesendet:', message);
      return true;
    } catch (error) {
      this.debug('Fehler beim Senden der Nachricht:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * Leert die Nachrichtenwarteschlange
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;
    
    this.debug(`Sende ${this.messageQueue.length} gepufferte Nachrichten`);
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message.type, message.payload);
      }
    }
  }

  /**
   * Registriert einen Event-Handler
   */
  public on(event: string, handler: DebateSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    
    this.eventHandlers.get(event)?.push(handler);
  }

  /**
   * Entfernt einen Event-Handler
   */
  public off(event: string, handler?: DebateSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) return;
    
    if (!handler) {
      // Entferne alle Handler für dieses Event
      this.eventHandlers.delete(event);
    } else {
      // Entferne nur den spezifischen Handler
      const handlers = this.eventHandlers.get(event) || [];
      const index = handlers.indexOf(handler);
      
      if (index !== -1) {
        handlers.splice(index, 1);
        
        if (handlers.length === 0) {
          this.eventHandlers.delete(event);
        } else {
          this.eventHandlers.set(event, handlers);
        }
      }
    }
  }

  /**
   * Löst ein Event mit Daten aus
   */
  private triggerEvent(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        this.debug(`Fehler im Event-Handler für ${event}:`, error);
      }
    });
  }

  /**
   * Debug-Logging mit Zeitstempel
   */
  private debug(...args: any[]): void {
    if (this.config.debug) {
      const timestamp = new Date().toISOString();
      console.log(`[DebateSocket ${timestamp}]`, ...args);
    }
  }

  /**
   * Prüft, ob die Socket-Verbindung hergestellt ist
   */
  public isConnectedStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Sendet eine Chat-Nachricht an die Debatte
   */
  public sendUserMessage(content: string): boolean {
    return this.send('user_message', { content, debateId: this.debateId });
  }

  /**
   * Meldet den Start einer Benutzereingabe
   */
  public sendTypingStart(): boolean {
    return this.send('user_typing_start', { debateId: this.debateId });
  }

  /**
   * Meldet das Ende einer Benutzereingabe
   */
  public sendTypingEnd(): boolean {
    return this.send('user_typing_end', { debateId: this.debateId });
  }

  /**
   * Bewertet eine Expertennachricht
   */
  public rateMessage(messageId: string, rating: 'helpful' | 'neutral' | 'unhelpful'): boolean {
    return this.send('rate_message', { messageId, rating, debateId: this.debateId });
  }
}

/**
 * Erstellt einen DebateSocket für die angegebene Debatte
 */
export function createDebateSocket(debateId: string, config?: Partial<DebateSocketConfig>): DebateSocket {
  return new DebateSocket(debateId, config);
}

// Exportiere Singleton zur Wiederverwendung
const debateSockets = new Map<string, DebateSocket>();

export function getDebateSocket(debateId: string, config?: Partial<DebateSocketConfig>): DebateSocket {
  if (!debateSockets.has(debateId)) {
    debateSockets.set(debateId, createDebateSocket(debateId, config));
  }
  
  return debateSockets.get(debateId)!;
} 