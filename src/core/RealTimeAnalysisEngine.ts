import { EventEmitter } from 'events';
import { AdvancedPatternEngine } from './AdvancedPatternEngine';
import { ModelFactory } from './ModelFactory';
import { OptimizationMetrics, SystemMetrics } from '../types/metrics';
import { SystemEvent } from '../types/events';

/**
 * Repräsentiert ein Zeitfenster für die Echtzeit-Analyse
 */
interface AnalysisWindow {
  startTime: number;
  endTime: number;
  metrics: SystemMetrics[];
  events: SystemEvent[];
}

/**
 * Ergebnis einer Analyse eines Zeitfensters
 */
interface AnalysisResult {
  timestamp: number;
  metrics: OptimizationMetrics;
  patterns: any[];
  anomalies: any[];
  predictions: OptimizationMetrics;
}

export class RealTimeAnalysisEngine extends EventEmitter {
  private readonly patternEngine: AdvancedPatternEngine;
  private readonly windows: Map<string, AnalysisWindow>;
  private readonly windowSize: number = 60000; // 1 Minute
  private isAnalyzing: boolean = false;

  constructor() {
    super();
    this.patternEngine = new AdvancedPatternEngine();
    this.windows = new Map();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.patternEngine.on('pattern-detected', (pattern) => {
      this.emit('pattern-detected', pattern);
    });

    this.patternEngine.on('anomaly-detected', (anomaly) => {
      this.emit('anomaly-detected', anomaly);
    });
  }

  async start(): Promise<void> {
    this.isAnalyzing = true;
    this.startAnalysisLoop();
  }

  async stop(): Promise<void> {
    this.isAnalyzing = false;
  }

  async processMetrics(metrics: SystemMetrics): Promise<void> {
    await this.handleNewMetrics(metrics);
  }

  async processEvent(event: SystemEvent): Promise<void> {
    await this.handleNewEvent(event);
  }

  private async startAnalysisLoop(): Promise<void> {
    while (this.isAnalyzing) {
      try {
        await this.updateWindows();
        
        // Analysiere alle Fenster
        for (const window of this.windows.values()) {
          await this.analyzeWindow(window);
        }
        
        await this.sleep(10000); // Warte 10 Sekunden zwischen Analysezyklen
      } catch (error) {
        console.error('Fehler im Analysezyklus:', error);
      }
    }
  }

  private async updateWindows(): Promise<void> {
    const now = Date.now();
    
    // Erstelle ein neues Fenster für den aktuellen Zeitpunkt
    const currentWindowId = `window-${now}`;
    const currentWindow: AnalysisWindow = {
      startTime: now - this.windowSize,
      endTime: now,
      metrics: [],
      events: []
    };
    
    this.windows.set(currentWindowId, currentWindow);
    
    // Entferne alte Fenster, die nicht mehr relevant sind
    const maxWindowAge = this.windowSize * 2; // Behalte Fenster für doppelte Fenstergröße
    
    for (const [id, window] of this.windows.entries()) {
      if (now - window.endTime > maxWindowAge) {
        this.windows.delete(id);
      }
    }
    
    // Begrenze die Anzahl der Fenster auf 10
    if (this.windows.size > 10) {
      const windowIds = Array.from(this.windows.keys()).sort();
      const oldestWindowIds = windowIds.slice(0, windowIds.length - 10);
      
      for (const id of oldestWindowIds) {
        this.windows.delete(id);
      }
    }
  }

  private async handleNewMetrics(metrics: SystemMetrics): Promise<void> {
    // Füge die Metriken zu allen relevanten Fenstern hinzu
    for (const window of this.windows.values()) {
      if (metrics.timestamp >= window.startTime && 
          metrics.timestamp <= window.endTime) {
        window.metrics.push(metrics);
      }
    }
    
    // Leite die Metriken an die Mustererkennungs-Engine weiter
    await this.patternEngine.processMetrics(metrics);
  }

  private async handleNewEvent(event: SystemEvent): Promise<void> {
    // Füge das Ereignis zu allen relevanten Fenstern hinzu
    for (const window of this.windows.values()) {
      if (event.timestamp >= window.startTime && 
          event.timestamp <= window.endTime) {
        window.events.push(event);
      }
    }
    
    // Leite das Ereignis an die Mustererkennungs-Engine weiter
    await this.patternEngine.processEvent(event);
  }

  private async analyzeWindow(window: AnalysisWindow): Promise<void> {
    if (window.metrics.length === 0 && window.events.length === 0) {
      return; // Nichts zu analysieren
    }
    
    try {
      // Berechne Metriken für dieses Fenster
      const metrics = await this.calculateWindowMetrics(window);
      
      // Finde Muster mit Hilfe der Mustererkennungs-Engine
      // Da die neue AdvancedPatternEngine keine detectPatterns-Methode mehr hat,
      // nehmen wir die Muster direkt aus dem Fenster
      const patterns = window.events.map(e => ({
        type: e.type,
        timestamp: e.timestamp,
        source: e.source
      }));
      
      // Erkenne Anomalien
      const anomalies = await this.detectAnomalies(window);
      
      // Generiere Vorhersagen
      const predictions = await this.generatePredictions(window);
      
      // Erstelle Analyseergebnis
      const result: AnalysisResult = {
        timestamp: Date.now(),
        metrics,
        patterns,
        anomalies, 
        predictions
      };
      
      // Emittiere Analyseergebnis
      this.emit('analysis-complete', result);
    } catch (error) {
      console.error('Fehler bei der Fensteranalyse:', error);
    }
  }

  private extractWindowFeatures(window: AnalysisWindow): any[] {
    const features = [];
    
    // Berechne statistische Features
    if (window.metrics.length > 0) {
      features.push(this.calculateStatisticalFeatures(window.metrics));
    }
    
    // Berechne Trend-Features
    if (window.metrics.length > 1) {
      features.push(this.calculateTrendFeatures(window.metrics));
    }
    
    // Berechne Event-Features
    if (window.events.length > 0) {
      features.push(this.calculateEventFeatures(window.events));
    }
    
    return features;
  }

  private calculateStatisticalFeatures(metrics: SystemMetrics[]): any {
    // Extrahiere numerische Werte
    const cpuValues = metrics.map(m => m.cpuUsage);
    const memoryValues = metrics.map(m => m.memoryUsage);
    const responseTimeValues = metrics.map(m => m.responseTime);
    const errorRateValues = metrics.map(m => m.errorRate);
    
    // Berechne statistische Kennzahlen
    return {
      cpu: {
        mean: this.calculateMean(cpuValues),
        std: this.calculateStd(cpuValues)
      },
      memory: {
        mean: this.calculateMean(memoryValues),
        std: this.calculateStd(memoryValues)
      },
      responseTime: {
        mean: this.calculateMean(responseTimeValues),
        std: this.calculateStd(responseTimeValues)
      },
      errorRate: {
        mean: this.calculateMean(errorRateValues),
        std: this.calculateStd(errorRateValues)
      }
    };
  }

  private calculateTrendFeatures(metrics: SystemMetrics[]): any {
    // Extrahiere numerische Werte
    const cpuValues = metrics.map(m => m.cpuUsage);
    const memoryValues = metrics.map(m => m.memoryUsage);
    const responseTimeValues = metrics.map(m => m.responseTime);
    const errorRateValues = metrics.map(m => m.errorRate);
    
    // Berechne Trends
    return {
      cpu: {
        trend: this.calculateTrend(cpuValues),
        acceleration: this.calculateAcceleration(cpuValues)
      },
      memory: {
        trend: this.calculateTrend(memoryValues),
        acceleration: this.calculateAcceleration(memoryValues)
      },
      responseTime: {
        trend: this.calculateTrend(responseTimeValues),
        acceleration: this.calculateAcceleration(responseTimeValues)
      },
      errorRate: {
        trend: this.calculateTrend(errorRateValues),
        acceleration: this.calculateAcceleration(errorRateValues)
      }
    };
  }

  private calculateEventFeatures(events: SystemEvent[]): any {
    // Zähle Ereignisse nach Typ
    const typeCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    const priorityCounts = new Map<number, number>();
    
    for (const event of events) {
      // Zähle Event-Typen
      typeCounts.set(event.type as string, (typeCounts.get(event.type as string) || 0) + 1);
      
      // Zähle Event-Quellen
      sourceCounts.set(event.source, (sourceCounts.get(event.source) || 0) + 1);
      
      // Zähle Event-Prioritäten
      if (event.priority !== undefined) {
        priorityCounts.set(event.priority, (priorityCounts.get(event.priority) || 0) + 1);
      }
    }
    
    return {
      count: events.length,
      types: Object.fromEntries(typeCounts),
      sources: Object.fromEntries(sourceCounts),
      priorities: Object.fromEntries(priorityCounts)
    };
  }

  private calculateMean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateStd(values: number[]): number {
    const mean = this.calculateMean(values);
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(this.calculateMean(squareDiffs));
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Berechne lineare Regression
    const indices = Array.from({ length: values.length }, (_, i) => i);
    const n = values.length;
    
    // Berechne Mittelwerte
    const meanX = this.calculateMean(indices);
    const meanY = this.calculateMean(values);
    
    // Berechne Zähler und Nenner für die Steigung
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (indices[i] - meanX) * (values[i] - meanY);
      denominator += Math.pow(indices[i] - meanX, 2);
    }
    
    // Berechne Steigung (Trend)
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateAcceleration(values: number[]): number {
    if (values.length < 3) return 0;
    
    // Berechne erste Ableitung (Geschwindigkeit)
    const velocities = [];
    for (let i = 1; i < values.length; i++) {
      velocities.push(values[i] - values[i - 1]);
    }
    
    // Berechne zweite Ableitung (Beschleunigung)
    return this.calculateTrend(velocities);
  }

  private async detectAnomalies(window: AnalysisWindow): Promise<any[]> {
    if (window.metrics.length === 0) return [];
    
    const anomalies = [];
    
    // Berechne Anomalie-Schwellenwerte basierend auf historischen Daten
    const features = this.extractWindowFeatures(window);
    const thresholds = this.calculateAnomalyThresholds(features);
    
    // Prüfe jede Metrik auf Anomalien
    for (const metric of window.metrics) {
      const anomalyScores = this.calculateAnomalyScores(metric, thresholds);
      
      // Wenn irgendein Score über dem Schwellenwert liegt, markiere als Anomalie
      const anomalyThreshold = 2.0; // Z-Score > 2 wird als Anomalie betrachtet
      
      for (const [key, score] of Object.entries(anomalyScores)) {
        if (Math.abs(score) > anomalyThreshold) {
          anomalies.push({
            timestamp: metric.timestamp,
            metric: key,
            value: (metric as any)[key],
            score,
            threshold: anomalyThreshold
          });
        }
      }
    }
    
    return anomalies;
  }

  private calculateAnomalyThresholds(features: any): Map<string, { mean: number; std: number }> {
    const thresholds = new Map<string, { mean: number; std: number }>();
    
    // Extrahiere statistische Features für Schwellenwertberechnung
    const statisticalFeatures = features.find((f: any) => f.cpu?.mean !== undefined);
    
    if (statisticalFeatures) {
      // CPU-Auslastung
      thresholds.set('cpuUsage', {
        mean: statisticalFeatures.cpu.mean,
        std: statisticalFeatures.cpu.std
      });
      
      // Speicherverbrauch
      thresholds.set('memoryUsage', {
        mean: statisticalFeatures.memory.mean,
        std: statisticalFeatures.memory.std
      });
      
      // Reaktionszeit
      thresholds.set('responseTime', {
        mean: statisticalFeatures.responseTime.mean,
        std: statisticalFeatures.responseTime.std
      });
      
      // Fehlerrate
      thresholds.set('errorRate', {
        mean: statisticalFeatures.errorRate.mean,
        std: statisticalFeatures.errorRate.std
      });
    }
    
    return thresholds;
  }

  private calculateAnomalyScores(
    metrics: SystemMetrics,
    thresholds: Map<string, { mean: number; std: number }>
  ): Record<string, number> {
    const scores: Record<string, number> = {};
    
    // Berechne Z-Scores für jede Metrik
    for (const [key, threshold] of thresholds.entries()) {
      if (threshold.std !== 0) {
        const value = (metrics as any)[key];
        scores[key] = (value - threshold.mean) / threshold.std;
      } else {
        scores[key] = 0;
      }
    }
    
    return scores;
  }

  private async generatePredictions(window: AnalysisWindow): Promise<OptimizationMetrics> {
    try {
      // Extrahiere Features für die Vorhersage
      const features = this.extractWindowFeatures(window);
      
      // Flatten Features für ML-Modell
      const flatFeatures = this.flattenFeatures(features);
      
      if (flatFeatures.length === 0) {
        console.log('No numerical features extracted, using default values');
        return this.basicPredictionFallback();
      }
      
      // Verwende die ML-Engine für Vorhersagen
      const modelName = 'LSTM';
      
      try {
        const modelFactory = ModelFactory.getInstance();
        const mlEngine = await modelFactory.getModel();
        
        return await mlEngine.predict(flatFeatures, modelName);
      } catch (error) {
        console.error('Error generating predictions:', error);
        return this.basicPredictionFallback();
      }
    } catch (error) {
      console.error('Error during prediction generation:', error);
      return {
        performance: 50,
        adaptationRate: 50,
        systemHealth: 50,
        optimizationPotential: 50,
        overallScore: 50
      };
    }
  }

  private basicPredictionFallback(): OptimizationMetrics {
    // Basic prediction when ML engine is not available
    console.log('No numerical features extracted, using default values');
    
    return {
      performance: 50,
      adaptationRate: 50,
      systemHealth: 50,
      optimizationPotential: 50,
      overallScore: 50
    };
  }

  private flattenFeatures(features: any[]): number[] {
    const flattenedFeatures: number[] = [];
    
    const addValue = (value: any) => {
      if (typeof value === 'number' && !isNaN(value)) {
        flattenedFeatures.push(value);
      } else if (typeof value === 'object' && value !== null) {
        for (const subValue of Object.values(value)) {
          addValue(subValue);
        }
      }
    };
    
    features.forEach(addValue);
    return flattenedFeatures;
  }

  private async calculateWindowMetrics(window: AnalysisWindow): Promise<OptimizationMetrics> {
    // Extrahiere Features
    const features = this.extractWindowFeatures(window);
    
    if (features.length === 0) {
      return {
        performance: 50,
        adaptationRate: 50,
        systemHealth: 50,
        optimizationPotential: 50,
        overallScore: 50
      };
    }
    
    // Berechne einzelne Metriken
    const performance = this.calculatePerformanceScore(features);
    const adaptationRate = this.calculateAdaptationRate(features);
    const systemHealth = this.calculateSystemHealth(features);
    const optimizationPotential = this.calculateOptimizationPotential(features);
    
    // Berechne Gesamtwert
    const overallScore = Math.round((performance + adaptationRate + systemHealth + (100 - optimizationPotential)) / 4);
    
    return {
      performance,
      adaptationRate,
      systemHealth,
      optimizationPotential,
      overallScore
    };
  }

  private calculatePerformanceScore(features: any): number {
    // Implementiere Performance-Score-Berechnung
    const statisticalFeatures = features.find((f: any) => f.cpu?.mean !== undefined);
    
    if (!statisticalFeatures) return 50;
    
    // Berechne gewichteten Durchschnitt aus CPU, Speicher und Reaktionszeit
    const cpuScore = 100 - statisticalFeatures.cpu.mean * 100;
    const memoryScore = 100 - statisticalFeatures.memory.mean * 100;
    const responseTimeScore = Math.max(0, 100 - statisticalFeatures.responseTime.mean / 10);
    
    return Math.round((cpuScore * 0.4 + memoryScore * 0.3 + responseTimeScore * 0.3));
  }

  private calculateAdaptationRate(features: any): number {
    // Implementiere Adaptionsrate-Berechnung
    const trendFeatures = features.find((f: any) => f.cpu?.trend !== undefined);
    
    if (!trendFeatures) return 50;
    
    // Berechne basierend auf Trends und Beschleunigungen
    const cpuAdaptation = Math.abs(trendFeatures.cpu.trend) * 200;
    const memoryAdaptation = Math.abs(trendFeatures.memory.trend) * 200;
    const accelerationFactor = Math.max(
      Math.abs(trendFeatures.cpu.acceleration),
      Math.abs(trendFeatures.memory.acceleration)
    ) * 400;
    
    return Math.round(Math.min(100, cpuAdaptation + memoryAdaptation + accelerationFactor));
  }

  private calculateSystemHealth(features: any): number {
    // Implementiere Systemgesundheits-Berechnung
    const statisticalFeatures = features.find((f: any) => f.errorRate?.mean !== undefined);
    const eventFeatures = features.find((f: any) => f.count !== undefined);
    
    if (!statisticalFeatures) return 50;
    
    // Berechne basierend auf Fehlerrate und Event-Verteilung
    const errorRateHealth = 100 - statisticalFeatures.errorRate.mean * 1000;
    const stabilityFactor = statisticalFeatures.cpu.std * 100 + statisticalFeatures.memory.std * 100;
    const eventFactor = eventFeatures ? Math.min(30, eventFeatures.count) : 0;
    
    let healthScore = errorRateHealth - stabilityFactor - eventFactor;
    
    return Math.round(Math.max(0, Math.min(100, healthScore)));
  }

  private calculateOptimizationPotential(features: any): number {
    // Implementiere Optimierungspotenzial-Berechnung
    const statisticalFeatures = features.find((f: any) => f.cpu?.mean !== undefined);
    const trendFeatures = features.find((f: any) => f.cpu?.trend !== undefined);
    
    if (!statisticalFeatures || !trendFeatures) return 50;
    
    // Höhere Werte bei ineffizienter Ressourcennutzung
    const resourceUsage = statisticalFeatures.cpu.mean * 50 + statisticalFeatures.memory.mean * 50;
    const trendFactor = (trendFeatures.cpu.trend > 0 ? 20 : 0) + (trendFeatures.memory.trend > 0 ? 20 : 0);
    const variabilityFactor = statisticalFeatures.responseTime.std * 10;
    
    return Math.round(Math.max(0, Math.min(100, resourceUsage + trendFactor + variabilityFactor)));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 