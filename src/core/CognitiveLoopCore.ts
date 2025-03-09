import { EventEmitter } from 'events';
import { SystemMetrics } from '../types/metrics';
import { SystemEvent, EventType, EventPriority } from '../types/events';
import { OptimizationMetrics } from '../types/metrics';

/**
 * Basis Cognitive Loop Core
 * Einfache Implementierung ohne komplexe ML-Funktionen
 */
export class CognitiveLoopCore extends EventEmitter {
  private isActive: boolean = false;
  private lastMetrics: SystemMetrics | null = null;
  private lastEvent: SystemEvent | null = null;
  
  constructor() {
    super();
    console.log('Cognitive Loop Core initialisiert');
  }
  
  /**
   * Startet den Core
   */
  async start(): Promise<void> {
    this.isActive = true;
    console.log('Cognitive Loop Core gestartet');
    this.emit('state-update', { isActive: this.isActive });
  }
  
  /**
   * Stoppt den Core
   */
  async stop(): Promise<void> {
    this.isActive = false;
    console.log('Cognitive Loop Core gestoppt');
    this.emit('state-update', { isActive: this.isActive });
  }
  
  /**
   * Verarbeitet Systemmetriken
   */
  async processMetrics(metrics: SystemMetrics): Promise<void> {
    if (!this.isActive) return;
    
    this.lastMetrics = metrics;
    
    // Einfache Analyse durchführen
    const optimizationMetrics = this.analyzeMetrics(metrics);
    
    // Events emittieren
    this.emit('metrics-processed', metrics);
    this.emit('optimization-metrics', optimizationMetrics);
  }
  
  /**
   * Verarbeitet Systemevents
   */
  async processEvent(event: SystemEvent): Promise<void> {
    if (!this.isActive) return;
    
    this.lastEvent = event;
    
    // Einfache Analyse durchführen
    this.analyzeEvent(event);
    
    // Event emittieren
    this.emit('event-processed', event);
  }
  
  /**
   * Einfache Metrik-Analyse
   */
  private analyzeMetrics(metrics: SystemMetrics): OptimizationMetrics {
    // Berechne Performance-Score basierend auf CPU und Memory
    const performance = 100 - (metrics.cpuUsage + metrics.memoryUsage) / 2;
    
    // Berechne Adaptationsrate basierend auf Reaktionszeit
    const adaptationRate = 100 - Math.min(100, metrics.responseTime / 10);
    
    // Berechne Systemgesundheit basierend auf Fehlerrate
    const systemHealth = 100 - metrics.errorRate * 10;
    
    // Berechne Optimierungspotential
    const optimizationPotential = 
      metrics.cpuUsage > 70 || 
      metrics.memoryUsage > 70 || 
      metrics.responseTime > 500 || 
      metrics.errorRate > 5 
        ? 80 
        : 30;
    
    // Berechne Gesamtscore
    const overallScore = (performance + adaptationRate + systemHealth + (100 - optimizationPotential)) / 4;
    
    return {
      performance: Math.max(0, Math.min(100, Math.round(performance))),
      adaptationRate: Math.max(0, Math.min(100, Math.round(adaptationRate))),
      systemHealth: Math.max(0, Math.min(100, Math.round(systemHealth))),
      optimizationPotential: Math.max(0, Math.min(100, Math.round(optimizationPotential))),
      overallScore: Math.max(0, Math.min(100, Math.round(overallScore)))
    };
  }
  
  /**
   * Einfache Event-Analyse
   */
  private analyzeEvent(event: SystemEvent): void {
    // Je nach Event-Typ unterschiedliche Aktionen ausführen
    switch (event.type) {
      case EventType.ERROR:
        if (event.priority >= EventPriority.HIGH) {
          this.emit('critical-error', event);
        }
        break;
      
      case EventType.PERFORMANCE:
        this.emit('performance-issue', event);
        break;
      
      default:
        // Nichts zu tun
        break;
    }
  }
  
  /**
   * Gibt den aktuellen Status zurück
   */
  getStatus(): any {
    return {
      isActive: this.isActive,
      lastMetricsTimestamp: this.lastMetrics?.timestamp,
      lastEventTimestamp: this.lastEvent?.timestamp
    };
  }
} 