/**
 * Nexus WebSocket-Modul
 * 
 * Implementiert die Echtzeit-Kommunikation für das Nexus-Expertendebatten-System
 * mit Reconnect-Logik, Heartbeats und Nachrichtenverwaltung.
 */

import { API_CONFIG } from '../api/apiConfig';
import { v4 as uuidv4 } from 'uuid';

// Event-Typen, die vom Nexus-WebSocket-Service gesendet und empfangen werden
export enum NexusEventType {
  // Systemereignisse
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat',

  // Debattenereignisse
  EXPERT_JOINED = 'expert_joined',
  EXPERT_LEFT = 'expert_left',
  EXPERT_TYPING = 'expert_typing',
  EXPERT_MESSAGE = 'expert_message',
  USER_MESSAGE = 'user_message',
  DEBATE_STATUS_CHANGED = 'debate_status_changed',
  FACT_CHECK_RESULT = 'fact_check_result',
  DEBATE_COMPLETED = 'debate_completed',

  // Management-Ereignisse
  JOIN_DEBATE = 'join_debate',
  LEAVE_DEBATE = 'leave_debate',
  PAUSE_DEBATE = 'pause_debate',
  RESUME_DEBATE = 'resume_debate',
  RATE_MESSAGE = 'rate_message',
}

// Interface für WebSocket-Ereignisse
export interface NexusWebSocketEvent {
  type: NexusEventType;
  debateId?: string;
  payload?: any;
  timestamp: string;
  id: string;
}

// Interface für Event-Handler
export type NexusEventHandler = (event: NexusWebSocketEvent) => void;

/**
 * NexusWebSocket-Klasse für die Verwaltung der WebSocket-Verbindung
 */
export class NexusWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private debateId: string;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private heartbeatIntervalId: NodeJS.Timeout | null = null;
  private eventHandlers: Map<NexusEventType, NexusEventHandler[]> = new Map();
  private messageQueue: NexusWebSocketEvent[] = [];
  private userId: string;

  /**
   * Erstellt eine neue NexusWebSocket-Instanz
   */
  constructor(debateId: string, userId: string) {
    this.debateId = debateId;
    this.userId = userId;

    // Bestimme WebSocket-URL
    const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';
    
    // Verwende konfigurierte URL oder baue Standard-URL
    this.url = API_CONFIG.nexus.wsUrl || 
      `${wsProtocol}//${wsHost}/api/nexus/ws/debates/${debateId}?userId=${userId}`;
  }

  /**
   * Verbindet mit dem WebSocket-Server
   */
  connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.connected && this.ws) {
        resolve(true);
        return;
      }

      try {
        this.ws = new WebSocket(this.url);

        // Timeout für die Verbindung
        const connectionTimeout = setTimeout(() => {
          reject(new Error('Verbindung zum WebSocket-Server hat das Zeitlimit überschritten'));
          this.ws?.close();
        }, 10000);

        // Event-Handler für die Verbindung
        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.connected = true;
          this.reconnectAttempts = 0;
          console.log(`WebSocket-Verbindung hergestellt: ${this.url}`);
          
          // Starte Heartbeat
          this.startHeartbeat();
          
          // Trete der Debatte bei
          this.sendEvent({
            type: NexusEventType.JOIN_DEBATE,
            debateId: this.debateId,
            payload: { userId: this.userId },
            timestamp: new Date().toISOString(),
            id: uuidv4(),
          });

          // Sende alle Nachrichten in der Warteschlange
          this.flushMessageQueue();
          
          // Benachrichtige Listener über erfolgreiche Verbindung
          this.notifyEventHandlers({
            type: NexusEventType.CONNECT,
            timestamp: new Date().toISOString(),
            id: uuidv4(),
          });
          
          resolve(true);
        };

        // Event-Handler für eingehende Nachrichten
        this.ws.onmessage = (event) => {
          try {
            const wsEvent = JSON.parse(event.data) as NexusWebSocketEvent;
            this.notifyEventHandlers(wsEvent);
          } catch (error) {
            console.error('Fehler beim Parsen einer WebSocket-Nachricht:', error);
          }
        };

        // Event-Handler für Fehler
        this.ws.onerror = (error) => {
          console.error('WebSocket-Fehler:', error);
          this.notifyEventHandlers({
            type: NexusEventType.ERROR,
            payload: { message: 'WebSocket-Fehler aufgetreten' },
            timestamp: new Date().toISOString(),
            id: uuidv4(),
          });
          reject(error);
        };

        // Event-Handler für Verbindungsschließung
        this.ws.onclose = (event) => {
          this.connected = false;
          clearTimeout(connectionTimeout);
          this.stopHeartbeat();
          
          console.log(`WebSocket-Verbindung geschlossen (Code: ${event.code}): ${event.reason}`);
          
          this.notifyEventHandlers({
            type: NexusEventType.DISCONNECT,
            payload: { code: event.code, reason: event.reason },
            timestamp: new Date().toISOString(),
            id: uuidv4(),
          });

          // Versuche erneut zu verbinden, wenn es sich nicht um einen normalen Schließvorgang handelt
          if (event.code !== 1000 && event.code !== 1001) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Sendet ein Ereignis an den WebSocket-Server
   */
  sendEvent(event: NexusWebSocketEvent): boolean {
    if (!this.connected || !this.ws) {
      // Wenn nicht verbunden, füge das Ereignis zur Warteschlange hinzu
      this.messageQueue.push(event);
      console.log('WebSocket nicht verbunden, Nachricht in Warteschlange hinzugefügt');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(event));
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
    return this.sendEvent({
      type: NexusEventType.USER_MESSAGE,
      debateId: this.debateId,
      payload: { content, userId: this.userId },
      timestamp: new Date().toISOString(),
      id: uuidv4(),
    });
  }

  /**
   * Bewertet eine Expertennachricht
   */
  rateMessage(messageId: string, rating: 'helpful' | 'neutral' | 'unhelpful'): boolean {
    return this.sendEvent({
      type: NexusEventType.RATE_MESSAGE,
      debateId: this.debateId,
      payload: { messageId, rating, userId: this.userId },
      timestamp: new Date().toISOString(),
      id: uuidv4(),
    });
  }

  /**
   * Pausiert die Debatte
   */
  pauseDebate(): boolean {
    return this.sendEvent({
      type: NexusEventType.PAUSE_DEBATE,
      debateId: this.debateId,
      payload: { userId: this.userId },
      timestamp: new Date().toISOString(),
      id: uuidv4(),
    });
  }

  /**
   * Setzt die Debatte fort
   */
  resumeDebate(): boolean {
    return this.sendEvent({
      type: NexusEventType.RESUME_DEBATE,
      debateId: this.debateId,
      payload: { userId: this.userId },
      timestamp: new Date().toISOString(),
      id: uuidv4(),
    });
  }

  /**
   * Verlässt die Debatte
   */
  leaveDebate(): boolean {
    const result = this.sendEvent({
      type: NexusEventType.LEAVE_DEBATE,
      debateId: this.debateId,
      payload: { userId: this.userId },
      timestamp: new Date().toISOString(),
      id: uuidv4(),
    });
    
    // Schließe die Verbindung
    this.disconnect();
    
    return result;
  }

  /**
   * Registriert einen Event-Handler für einen bestimmten Event-Typ
   */
  on(eventType: NexusEventType, handler: NexusEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    
    this.eventHandlers.get(eventType)?.push(handler);
  }

  /**
   * Entfernt einen Event-Handler
   */
  off(eventType: NexusEventType, handler: NexusEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      return;
    }
    
    const handlers = this.eventHandlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Trennt die Verbindung zum WebSocket-Server
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client initiated disconnect');
      this.ws = null;
    }
    
    this.connected = false;
  }

  /**
   * Überprüft, ob die Verbindung hergestellt ist
   */
  isConnected(): boolean {
    return this.connected && this.ws !== null;
  }

  /**
   * Plant einen Reconnect-Versuch
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximale Anzahl an Wiederverbindungsversuchen erreicht');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Plane Wiederverbindung in ${delay}ms (Versuch ${this.reconnectAttempts})`);
    
    this.reconnectTimeoutId = setTimeout(() => {
      console.log(`Versuche Wiederverbindung (Versuch ${this.reconnectAttempts})`);
      this.connect()
        .catch((error) => {
          console.error('Wiederverbindung fehlgeschlagen:', error);
        });
    }, delay);
  }

  /**
   * Startet regelmäßige Heartbeats, um die Verbindung aufrechtzuerhalten
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatIntervalId = setInterval(() => {
      if (this.connected && this.ws) {
        this.sendEvent({
          type: NexusEventType.HEARTBEAT,
          timestamp: new Date().toISOString(),
          id: uuidv4(),
        });
      }
    }, 30000); // Alle 30 Sekunden
  }

  /**
   * Stoppt die Heartbeats
   */
  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  /**
   * Benachrichtigt alle registrierten Event-Handler über ein Ereignis
   */
  private notifyEventHandlers(event: NexusWebSocketEvent): void {
    // Handler für den spezifischen Event-Typ
    const typeHandlers = this.eventHandlers.get(event.type) || [];
    typeHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Fehler beim Ausführen eines Event-Handlers für ${event.type}:`, error);
      }
    });
    
    // Handler für ALLE Ereignistypen (wenn registriert)
    const allHandlers = this.eventHandlers.get('*' as NexusEventType) || [];
    allHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Fehler beim Ausführen eines ALL-Event-Handlers für ${event.type}:`, error);
      }
    });
  }

  /**
   * Sendet alle Nachrichten in der Warteschlange
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) {
      return;
    }
    
    console.log(`Sende ${this.messageQueue.length} Nachrichten aus der Warteschlange`);
    
    const messagesToSend = [...this.messageQueue];
    this.messageQueue = [];
    
    messagesToSend.forEach((message) => {
      this.sendEvent(message);
    });
  }
}

/**
 * Singleton-Map für die Verwaltung aktiver WebSocket-Verbindungen
 */
const activeConnections = new Map<string, NexusWebSocket>();

/**
 * Gibt eine WebSocket-Verbindung für eine Debatte zurück oder erstellt eine neue
 */
export function getNexusWebSocket(debateId: string, userId: string): NexusWebSocket {
  const key = `${debateId}:${userId}`;
  
  if (!activeConnections.has(key)) {
    const connection = new NexusWebSocket(debateId, userId);
    activeConnections.set(key, connection);
  }
  
  return activeConnections.get(key)!;
} 