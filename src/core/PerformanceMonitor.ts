/**
 * PerformanceMonitor für Insight Synergy
 * 
 * Ermöglicht die Messung und Optimierung der Anwendungsleistung
 * durch Tracking von Operationen, Speichernutzung und Ausführungszeiten.
 */

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private memoryUsage: MemoryUsageMetrics[] = [];
  private samplingInterval: number = 60000; // 1 Minute
  private maxSamples: number = 100; // Maximale Anzahl an Samples für Memory-Tracking
  private isMonitoring: boolean = false;

  private constructor() {}

  /**
   * Gibt die Singleton-Instanz des PerformanceMonitors zurück
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Startet das kontinuierliche Monitoring der Speichernutzung
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.trackMemoryUsage();
    
    setInterval(() => {
      this.trackMemoryUsage();
    }, this.samplingInterval);
  }

  /**
   * Stoppt das kontinuierliche Monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
  }

  /**
   * Startet die Zeitmessung für eine Operation
   * @param operationName Name der zu messenden Operation
   * @returns Eine eindeutige ID für diese Messung
   */
  public startMeasurement(operationName: string): string {
    const id = `${operationName}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.metrics.set(id, {
      operationName,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      memory: {
        before: this.getCurrentMemoryUsage(),
        after: null,
        difference: null
      }
    });
    return id;
  }

  /**
   * Beendet die Zeitmessung für eine Operation
   * @param id Die ID der zu beendenden Messung
   * @returns Die gemessene Dauer in Millisekunden
   */
  public endMeasurement(id: string): number | null {
    const metric = this.metrics.get(id);
    if (!metric || metric.endTime !== null) return null;

    const endTime = Date.now();
    const duration = endTime - metric.startTime;
    const currentMemory = this.getCurrentMemoryUsage();

    metric.endTime = endTime;
    metric.duration = duration;
    metric.memory.after = currentMemory;
    metric.memory.difference = {
      rss: currentMemory.rss - metric.memory.before.rss,
      heapTotal: currentMemory.heapTotal - metric.memory.before.heapTotal,
      heapUsed: currentMemory.heapUsed - metric.memory.before.heapUsed,
      external: currentMemory.external - metric.memory.before.external
    };

    this.metrics.set(id, metric);
    return duration;
  }

  /**
   * Gibt die gesammelten Performance-Metriken zurück
   */
  public getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Gibt den historischen Speicherverbrauch zurück
   */
  public getMemoryUsageHistory(): MemoryUsageMetrics[] {
    return [...this.memoryUsage];
  }

  /**
   * Gibt Statistiken zu einer bestimmten Operation zurück
   * @param operationName Name der Operation
   */
  public getOperationStats(operationName: string): OperationStats {
    const relevantMetrics = Array.from(this.metrics.values())
      .filter(m => m.operationName === operationName && m.duration !== null);

    if (relevantMetrics.length === 0) {
      return {
        operationName,
        callCount: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalDuration: 0,
        avgMemoryIncrease: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 }
      };
    }

    const durations = relevantMetrics.map(m => m.duration!);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const memoryIncreases = relevantMetrics
      .filter(m => m.memory.difference !== null)
      .map(m => m.memory.difference!);

    return {
      operationName,
      callCount: relevantMetrics.length,
      avgDuration: totalDuration / relevantMetrics.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalDuration,
      avgMemoryIncrease: this.calculateAvgMemoryIncrease(memoryIncreases)
    };
  }

  /**
   * Optimiert die Performance für eine bestimmte Operation basierend auf den Messungen
   * @param operationName Name der zu optimierenden Operation
   * @returns Optimierungsvorschläge
   */
  public getOptimizationSuggestions(operationName: string): OptimizationSuggestion[] {
    const stats = this.getOperationStats(operationName);
    const suggestions: OptimizationSuggestion[] = [];

    // Performance-Optimierungsvorschläge basierend auf Ausführungszeit
    if (stats.avgDuration > 1000) {
      suggestions.push({
        type: 'PERFORMANCE',
        severity: 'HIGH',
        message: `${operationName} ist langsam (durchschnittlich ${stats.avgDuration.toFixed(2)}ms). Überprüfen Sie Algorithmen auf Optimierungspotenzial.`,
        details: `Operation wurde ${stats.callCount} mal aufgerufen mit Zeiten zwischen ${stats.minDuration}ms und ${stats.maxDuration}ms.`
      });
    } else if (stats.avgDuration > 500) {
      suggestions.push({
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        message: `${operationName} könnte optimiert werden (durchschnittlich ${stats.avgDuration.toFixed(2)}ms).`,
        details: `Operation wurde ${stats.callCount} mal aufgerufen.`
      });
    }

    // Memory-Optimierungsvorschläge basierend auf Speicherverbrauch
    if (stats.avgMemoryIncrease.heapUsed > 10 * 1024 * 1024) { // Mehr als 10MB
      suggestions.push({
        type: 'MEMORY',
        severity: 'HIGH',
        message: `${operationName} verbraucht viel Speicher (durchschnittlich ${(stats.avgMemoryIncrease.heapUsed / (1024 * 1024)).toFixed(2)}MB).`,
        details: 'Überprüfen Sie mögliche Speicherlecks oder ineffiziente Datenstrukturen.'
      });
    } else if (stats.avgMemoryIncrease.heapUsed > 1 * 1024 * 1024) { // Mehr als 1MB
      suggestions.push({
        type: 'MEMORY',
        severity: 'MEDIUM',
        message: `${operationName} verbraucht erheblichen Speicher (durchschnittlich ${(stats.avgMemoryIncrease.heapUsed / (1024 * 1024)).toFixed(2)}MB).`,
        details: 'Erwägen Sie Optimierungen der Datenstrukturen.'
      });
    }

    return suggestions;
  }

  /**
   * Misst die aktuelle Speichernutzung
   */
  private trackMemoryUsage(): void {
    const memoryUsage = this.getCurrentMemoryUsage();
    
    this.memoryUsage.push({
      timestamp: Date.now(),
      ...memoryUsage
    });

    // Älteste Einträge entfernen, wenn Maximum erreicht
    if (this.memoryUsage.length > this.maxSamples) {
      this.memoryUsage.shift();
    }
  }

  /**
   * Liest die aktuelle Speichernutzung aus
   */
  private getCurrentMemoryUsage(): MemoryValues {
    const memoryUsage = process.memoryUsage();
    return {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external
    };
  }

  /**
   * Berechnet den durchschnittlichen Speicheranstieg
   */
  private calculateAvgMemoryIncrease(memoryIncreases: MemoryValues[]): MemoryValues {
    if (memoryIncreases.length === 0) {
      return { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 };
    }

    return {
      rss: memoryIncreases.reduce((sum, m) => sum + m.rss, 0) / memoryIncreases.length,
      heapTotal: memoryIncreases.reduce((sum, m) => sum + m.heapTotal, 0) / memoryIncreases.length,
      heapUsed: memoryIncreases.reduce((sum, m) => sum + m.heapUsed, 0) / memoryIncreases.length,
      external: memoryIncreases.reduce((sum, m) => sum + m.external, 0) / memoryIncreases.length
    };
  }
}

// Typdefinitionen

interface MemoryValues {
  rss: number;      // Resident Set Size - gesamter vom Prozess belegter Arbeitsspeicher
  heapTotal: number; // Von V8 reservierter Heap-Speicher
  heapUsed: number;  // Aktuell vom V8-Heap verwendeter Speicher
  external: number;  // Von V8 verwalteter Speicher außerhalb des Heaps
}

interface MemoryUsageMetrics extends MemoryValues {
  timestamp: number;
}

interface PerformanceMetric {
  operationName: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;
  memory: {
    before: MemoryValues;
    after: MemoryValues | null;
    difference: MemoryValues | null;
  };
}

interface OperationStats {
  operationName: string;
  callCount: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  totalDuration: number;
  avgMemoryIncrease: MemoryValues;
}

interface OptimizationSuggestion {
  type: 'PERFORMANCE' | 'MEMORY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  details: string;
} 