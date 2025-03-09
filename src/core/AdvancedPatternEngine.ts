import { EventEmitter } from 'events';
import { SystemEvent } from '../types/events';
import { SystemMetrics } from '../types/metrics';

/**
 * Engine zur Erkennung von Mustern in Systemmetriken und -events
 * Verwendet einfache regelbasierte Algorithmen statt komplexer ML-Modelle
 */
export class AdvancedPatternEngine extends EventEmitter {
  // Speicherung historischer Daten für Musteranalyse
  private metricsHistory: SystemMetrics[] = [];
  private eventsHistory: SystemEvent[] = [];
  
  // Maximale Anzahl historischer Datenpunkte
  private readonly maxHistorySize = 1000;
  
  // Schwellenwerte für Anomalieerkennung
  private readonly thresholds = {
    cpuUsage: 80, // Prozent
    memoryUsage: 80, // Prozent
    responseTime: 500, // ms
    errorRate: 5 // Prozent
  };
  
  constructor() {
    super();
    console.log('Advanced Pattern Engine initialisiert');
  }
  
  /**
   * Verarbeitet neue Systemmetriken
   */
  async processMetrics(metrics: SystemMetrics): Promise<void> {
    // Füge Metrik zur Historie hinzu
    this.metricsHistory.push(metrics);
    
    // Begrenze Historiengröße
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
    
    // Prüfe auf Anomalien
    const anomalies = this.detectMetricAnomalies(metrics);
    
    // Wenn Anomalien gefunden wurden, emittiere ein Event
    if (anomalies.length > 0) {
      this.emit('anomaly-detected', { metrics, anomalies });
    }
    
    // Erkenne Muster
    const patterns = this.detectMetricPatterns();
    
    // Wenn Muster gefunden wurden, emittiere ein Event
    if (patterns.length > 0) {
      this.emit('pattern-detected', { patterns });
    }
  }
  
  /**
   * Verarbeitet neue Systemevents
   */
  async processEvent(event: SystemEvent): Promise<void> {
    // Füge Event zur Historie hinzu
    this.eventsHistory.push(event);
    
    // Begrenze Historiengröße
    if (this.eventsHistory.length > this.maxHistorySize) {
      this.eventsHistory.shift();
    }
    
    // Erkenne Muster in Events
    const patterns = this.detectEventPatterns();
    
    // Wenn Muster gefunden wurden, emittiere ein Event
    if (patterns.length > 0) {
      this.emit('pattern-detected', { patterns });
    }
  }
  
  /**
   * Erkennt Anomalien in den Metriken
   */
  private detectMetricAnomalies(metrics: SystemMetrics): string[] {
    const anomalies: string[] = [];
    
    // Prüfe auf CPU-Auslastung über Schwellenwert
    if (metrics.cpuUsage > this.thresholds.cpuUsage) {
      anomalies.push(`Hohe CPU-Auslastung: ${metrics.cpuUsage}%`);
    }
    
    // Prüfe auf Speicherverbrauch über Schwellenwert
    if (metrics.memoryUsage > this.thresholds.memoryUsage) {
      anomalies.push(`Hoher Speicherverbrauch: ${metrics.memoryUsage}%`);
    }
    
    // Prüfe auf langsame Reaktionszeit
    if (metrics.responseTime > this.thresholds.responseTime) {
      anomalies.push(`Langsame Reaktionszeit: ${metrics.responseTime}ms`);
    }
    
    // Prüfe auf hohe Fehlerrate
    if (metrics.errorRate > this.thresholds.errorRate) {
      anomalies.push(`Hohe Fehlerrate: ${metrics.errorRate}%`);
    }
    
    return anomalies;
  }
  
  /**
   * Erkennt Muster in Metriken
   * In dieser einfachen Implementierung werden nur Trends erkannt
   */
  private detectMetricPatterns(): any[] {
    // Benötigt mindestens 10 Datenpunkte für Trendeererkennung
    if (this.metricsHistory.length < 10) {
      return [];
    }
    
    const patterns = [];
    const lastTen = this.metricsHistory.slice(-10);
    
    // Prüfe auf steigenden CPU-Trend
    if (this.isIncreasingTrend(lastTen.map(m => m.cpuUsage))) {
      patterns.push({
        type: 'trend',
        metric: 'cpuUsage',
        direction: 'increasing',
        description: 'Steigender CPU-Nutzungstrend erkannt'
      });
    }
    
    // Prüfe auf steigenden Speicherverbrauch
    if (this.isIncreasingTrend(lastTen.map(m => m.memoryUsage))) {
      patterns.push({
        type: 'trend',
        metric: 'memoryUsage',
        direction: 'increasing',
        description: 'Steigender Speicherverbrauchstrend erkannt'
      });
    }
    
    return patterns;
  }
  
  /**
   * Erkennt Muster in Events
   * In dieser einfachen Implementierung werden wiederholte Fehler erkannt
   */
  private detectEventPatterns(): any[] {
    // Benötigt mindestens 5 Events für Mustererkennung
    if (this.eventsHistory.length < 5) {
      return [];
    }
    
    const patterns = [];
    const lastFive = this.eventsHistory.slice(-5);
    
    // Zähle Fehler-Events
    const errorCount = lastFive.filter(e => e.type === 'error').length;
    
    // Wenn mehr als 3 der letzten 5 Events Fehler waren
    if (errorCount >= 3) {
      patterns.push({
        type: 'frequency',
        eventType: 'error',
        count: errorCount,
        timeframe: '5 events',
        description: 'Häufige Fehler-Events erkannt'
      });
    }
    
    return patterns;
  }
  
  /**
   * Prüft, ob eine Reihe von Werten einen steigenden Trend aufweist
   */
  private isIncreasingTrend(values: number[]): boolean {
    if (values.length < 2) return false;
    
    // Berechne lineare Regression
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
    
    // Steigung der Regressionsgeraden
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Wenn die Steigung positiv ist, ist der Trend steigend
    return slope > 0.1; // Minimale Steigung, um als Trend zu gelten
  }
} 