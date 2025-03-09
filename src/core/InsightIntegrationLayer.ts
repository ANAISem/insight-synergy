import { EventEmitter } from 'events';
import { SystemEvent } from '../types/events';
import { SystemMetrics } from '../types/metrics';

/**
 * Integration Layer für externe Systeme und APIs
 */
export class InsightIntegrationLayer extends EventEmitter {
  private isActive: boolean = false;
  private connections: Map<string, any> = new Map();
  
  constructor() {
    super();
    console.log('Integration Layer initialisiert');
  }
  
  /**
   * Startet den Integration Layer
   */
  async start(): Promise<void> {
    this.isActive = true;
    console.log('Integration Layer gestartet');
    this.emit('integration-started');
    return Promise.resolve();
  }
  
  /**
   * Stoppt den Integration Layer
   */
  async stop(): Promise<void> {
    this.isActive = false;
    
    // Schließe alle aktiven Verbindungen
    for (const [name, connection] of this.connections.entries()) {
      try {
        if (connection.close) {
          await connection.close();
        }
        console.log(`Verbindung geschlossen: ${name}`);
      } catch (error) {
        console.error(`Fehler beim Schließen der Verbindung ${name}:`, error);
      }
    }
    
    this.connections.clear();
    console.log('Integration Layer gestoppt');
    this.emit('integration-stopped');
    return Promise.resolve();
  }
  
  /**
   * Verarbeitet ein Event und sendet es an externe Systeme
   */
  async processEvent(event: SystemEvent): Promise<void> {
    if (!this.isActive) {
      console.warn('Integration Layer ist nicht aktiv. Events werden nicht verarbeitet.');
      return;
    }
    
    console.log(`Integration Layer verarbeitet Event: ${event.type}`);
    
    // Emittiere für lokale Listener
    this.emit('event-processed', event);
    
    // Verarbeite das Event für jede aktive Verbindung
    for (const [name, connection] of this.connections.entries()) {
      try {
        if (connection.sendEvent) {
          await connection.sendEvent(event);
        }
      } catch (error) {
        console.error(`Fehler beim Senden des Events an ${name}:`, error);
      }
    }
  }
  
  /**
   * Verarbeitet Metriken und sendet sie an externe Systeme
   */
  async processMetrics(metrics: SystemMetrics): Promise<void> {
    if (!this.isActive) {
      console.warn('Integration Layer ist nicht aktiv. Metriken werden nicht verarbeitet.');
      return;
    }
    
    console.log(`Integration Layer verarbeitet Metriken: ${metrics.timestamp}`);
    
    // Emittiere für lokale Listener
    this.emit('metrics-processed', metrics);
    
    // Verarbeite die Metriken für jede aktive Verbindung
    for (const [name, connection] of this.connections.entries()) {
      try {
        if (connection.sendMetrics) {
          await connection.sendMetrics(metrics);
        }
      } catch (error) {
        console.error(`Fehler beim Senden der Metriken an ${name}:`, error);
      }
    }
  }
  
  /**
   * Registriert eine neue externe Verbindung
   */
  registerConnection(name: string, connection: any): void {
    if (this.connections.has(name)) {
      console.warn(`Verbindung ${name} existiert bereits und wird überschrieben.`);
    }
    
    this.connections.set(name, connection);
    console.log(`Neue Verbindung registriert: ${name}`);
    this.emit('connection-registered', { name, connection });
  }
  
  /**
   * Entfernt eine externe Verbindung
   */
  async removeConnection(name: string): Promise<boolean> {
    const connection = this.connections.get(name);
    
    if (!connection) {
      console.warn(`Verbindung ${name} existiert nicht.`);
      return false;
    }
    
    try {
      if (connection.close) {
        await connection.close();
      }
      
      this.connections.delete(name);
      console.log(`Verbindung entfernt: ${name}`);
      this.emit('connection-removed', { name });
      return true;
    } catch (error) {
      console.error(`Fehler beim Entfernen der Verbindung ${name}:`, error);
      return false;
    }
  }
  
  /**
   * Gibt den aktuellen Status des Integration Layers zurück
   */
  getStatus(): any {
    return {
      isActive: this.isActive,
      connections: Array.from(this.connections.keys()),
      connectionCount: this.connections.size
    };
  }
} 