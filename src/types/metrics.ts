/**
 * Definitionen für Metriken und Kennzahlen
 */

/**
 * Optimierungsmetriken, die von der ML-Engine generiert werden
 */
export interface OptimizationMetrics {
  /** Performance-Wert zwischen 0-100 */
  performance: number;
  
  /** Anpassungsfähigkeit zwischen 0-100 */
  adaptationRate: number;
  
  /** Systemgesundheit zwischen 0-100 */
  systemHealth: number;
  
  /** Optimierungspotenzial zwischen 0-100 */
  optimizationPotential: number;
  
  /** Gesamtbewertung zwischen 0-100 */
  overallScore: number;
}

/**
 * Systemmetriken, die zur Analyse verwendet werden
 */
export interface SystemMetrics {
  /** Zeitstempel der Metrik-Erfassung */
  timestamp: number;
  
  /** CPU-Auslastung in Prozent */
  cpuUsage: number;
  
  /** Speicherverbrauch in MB */
  memoryUsage: number;
  
  /** Aktive Verbindungen */
  activeConnections: number;
  
  /** Reaktionszeit in Millisekunden */
  responseTime: number;
  
  /** Fehlerrate in Prozent */
  errorRate: number;
  
  /** Durchsatz (Anfragen pro Sekunde) */
  throughput: number;
  
  /** Zusätzliche benutzerdefinierte Metriken */
  [key: string]: any;
} 