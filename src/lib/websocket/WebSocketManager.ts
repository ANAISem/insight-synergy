/**
 * WebSocket-Manager für Insight Synergy
 * 
 * Stellt eine robuste WebSocket-Verbindung mit automatischer Wiederverbindung,
 * Event-Handling und Nachrichtenverwaltung bereit.
 */

// Typen für WebSocket-Events und Nachrichten
export type WebSocketEventType = 
  | 'connect' 
  | 'disconnect' 
  | 'message' 
  | 'error' 
  | 'reconnect'
  | 'debate_update'
  | 'expert_typing'
  | 'expert_message'
  | 'fact_check_result';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  sessionId?: string;
}

// Event-Handler-Typ
type EventHandler = (event: WebSocketMessage) => void;

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private url: string;
  private autoReconnect: boolean;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number;
  private reconnectInterval: number;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Map<WebSocketEventType, Set<EventHandler>> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private sessionId: string | null = null;
  private isConnecting: boolean = false;

  /**
   * Erstellt einen neuen WebSocket-Manager
   */
  constructor(
    url: string, 
    autoReconnect: boolean = true, 
    maxReconnectAttempts: number = 10, 
    reconnectInterval: number = 3000,
    sessionId?: string
  ) {
    this.url = url;
    this.autoReconnect = autoReconnect;
    this.maxReconnectAttempts = maxReconnectAttempts;
    this.reconnectInterval = reconnectInterval;
    this.sessionId = sessionId || null;
  }

  /**
   * Stellt eine Verbindung zum WebSocket-Server her
   */
  public connect(): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket bereits verbunden oder verbindet gerade');
      return Promise.resolve();
    }

    if (this.isConnecting) {
      console.log('WebSocket-Verbindung bereits im Gange');
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        // Füge Session-ID als Query-Parameter hinzu, wenn vorhanden
        let connectionUrl = this.url;
        if (this.sessionId) {
          const separator = this.url.includes('?') ? '&' : '?';
          connectionUrl = `${this.url}${separator}sessionId=${this.sessionId}`;
        }

        this.socket = new WebSocket(connectionUrl);

        this.socket.onopen = () => {
          console.log('WebSocket verbunden');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.emitEvent('connect', { type: 'connect', payload: { connected: true }, timestamp: new Date().toISOString() });
          
          // Sende alle Nachrichten aus der Warteschlange
          this.flushQueue();
          
          resolve();
        };

        this.socket.onclose = (event) => {
          this.isConnecting = false;
          console.log(`WebSocket geschlossen: ${event.code} ${event.reason}`);
          this.emitEvent('disconnect', { 
            type: 'disconnect', 
            payload: { code: event.code, reason: event.reason }, 
            timestamp: new Date().toISOString() 
          });
          
          if (this.autoReconnect) {
            this.scheduleReconnect();
          }
        };

        this.socket.onerror = (error) => {
          this.isConnecting = false;
          console.error('WebSocket-Fehler:', error);
          this.emitEvent('error', { 
            type: 'error', 
            payload: { error }, 
            timestamp: new Date().toISOString() 
          });
          
          reject(error);
        };

        this.socket.onmessage = (messageEvent) => {
          try {
            const message = JSON.parse(messageEvent.data) as WebSocketMessage;
            console.log('WebSocket-Nachricht empfangen:', message.type);
            
            // Emittiere allgemeines 'message'-Event
            this.emitEvent('message', message);
            
            // Emittiere spezifisches Event basierend auf dem Nachrichtentyp
            // Vorausgesetzt, der message.type entspricht einem WebSocketEventType
            if (this.isValidEventType(message.type)) {
              this.emitEvent(message.type as WebSocketEventType, message);
            }
          } catch (error) {
            console.error('Fehler beim Parsen der WebSocket-Nachricht:', error);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        console.error('Fehler beim Verbinden mit WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Prüft, ob ein String ein gültiger Event-Typ ist
   */
  private isValidEventType(type: string): boolean {
    const validTypes: WebSocketEventType[] = [
      'connect', 'disconnect', 'message', 'error', 'reconnect',
      'debate_update', 'expert_typing', 'expert_message', 'fact_check_result'
    ];
    return validTypes.includes(type as WebSocketEventType);
  }

  /**
   * Plant eine Wiederverbindung nach einem Verbindungsabbruch
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Maximale Anzahl an Wiederverbindungsversuchen (${this.maxReconnectAttempts}) erreicht`);
      return;
    }

    const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts);
    console.log(`Wiederverbindung in ${delay}ms geplant (Versuch ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Versuche Wiederverbindung ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      this.emitEvent('reconnect', { 
        type: 'reconnect', 
        payload: { attempt: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts }, 
        timestamp: new Date().toISOString() 
      });
      
      this.connect().catch(() => {
        // Wenn die Verbindung fehlschlägt, plane den nächsten Versuch
        this.scheduleReconnect();
      });
    }, delay);
  }

  /**
   * Trennt die Verbindung zum WebSocket-Server
   */
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close(1000, 'Benutzer hat die Verbindung getrennt');
      this.socket = null;
    }
  }

  /**
   * Sendet eine Nachricht über die WebSocket-Verbindung
   */
  public send(messageType: string, data: any): void {
    const message: WebSocketMessage = {
      type: messageType,
      payload: data,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId || undefined
    };

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.log('WebSocket nicht verbunden, füge Nachricht zur Warteschlange hinzu');
      this.messageQueue.push(message);
      
      // Wenn keine Verbindung besteht, versuche zu verbinden
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        this.connect().catch(error => {
          console.error('Fehler beim automatischen Verbinden für Nachrichtenversand:', error);
        });
      }
    }
  }

  /**
   * Sendet alle Nachrichten aus der Warteschlange
   */
  private flushQueue(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.messageQueue.length > 0) {
      console.log(`Sende ${this.messageQueue.length} Nachrichten aus der Warteschlange`);
      
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          this.socket.send(JSON.stringify(message));
        }
      }
    }
  }

  /**
   * Registriert einen Event-Handler für ein bestimmtes Event
   */
  public on(event: WebSocketEventType, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    this.eventHandlers.get(event)?.add(handler);
  }

  /**
   * Entfernt einen Event-Handler für ein bestimmtes Event
   */
  public off(event: WebSocketEventType, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Löst ein Event aus und ruft alle registrierten Handler auf
   */
  private emitEvent(event: WebSocketEventType, data: WebSocketMessage): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Fehler im Event-Handler für '${event}':`, error);
        }
      });
    }
  }

  /**
   * Prüft, ob die WebSocket-Verbindung geöffnet ist
   */
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Aktualisiert die Session-ID für die Verbindung
   */
  public updateSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    
    // Wenn bereits verbunden, trenne die Verbindung und stelle eine neue her
    if (this.isConnected()) {
      this.disconnect();
      this.connect().catch(error => {
        console.error('Fehler beim Neuverbinden mit neuer Session-ID:', error);
      });
    }
  }
}

// Singleton-Instanz für die Debate-WebSocket-Verbindung
let debateSocketInstance: WebSocketManager | null = null;

/**
 * Erstellt oder gibt die Singleton-Instanz des Debate-WebSocket-Managers zurück
 */
export function getDebateSocket(sessionId?: string): WebSocketManager {
  if (!debateSocketInstance) {
    // Bestimme die WebSocket-URL basierend auf der Umgebung
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = process.env.NEXT_PUBLIC_NEXUS_WS_URL || 
      `${protocol}//${window.location.host}/api/nexus/ws/debates`;
    
    debateSocketInstance = new WebSocketManager(wsUrl, true, 10, 3000, sessionId);
  } else if (sessionId && debateSocketInstance.isConnected()) {
    // Wenn eine neue Session-ID übergeben wird, aktualisiere die bestehende Verbindung
    debateSocketInstance.updateSessionId(sessionId);
  }
  
  return debateSocketInstance;
}

// Hook für React-Komponenten
export function useDebateSocket(sessionId?: string): WebSocketManager {
  return getDebateSocket(sessionId);
} 