import { EventEmitter } from 'events';
import { OptimizationMetrics } from '../types/metrics';

/**
 * Konfiguration für Modelle
 */
interface ModelConfig {
  inputSize: number;
  outputSize: number;
  type: string;
}

/**
 * Eine einfache ML-Engine, die statt TensorFlow.js regelbasierte Algorithmen verwendet
 */
export class AdvancedMLEngine extends EventEmitter {
  private readonly modelConfigs: Map<string, ModelConfig> = new Map();

  constructor() {
    super();
    this.initializeModels();
  }

  /**
   * Initialisiert die verfügbaren Modellkonfigurationen
   */
  private initializeModels(): void {
    console.log('Initialisiere ML-Modelle...');

    // LSTM Modell-Konfiguration
    this.modelConfigs.set('LSTM', {
      inputSize: 10,
      outputSize: 4,
      type: 'LSTM'
    });

    // Transformer Modell-Konfiguration
    this.modelConfigs.set('Transformer', {
      inputSize: 10,
      outputSize: 4,
      type: 'Transformer'
    });

    // CNN Modell-Konfiguration
    this.modelConfigs.set('CNN', {
      inputSize: 10,
      outputSize: 4,
      type: 'CNN'
    });

    // MLP Modell-Konfiguration
    this.modelConfigs.set('MLP', {
      inputSize: 10,
      outputSize: 4,
      type: 'MLP'
    });
  }

  /**
   * Führt eine Vorhersage durch - verwendet eine einfache regelbasierte Implementierung
   * statt echter neuronaler Netze
   */
  async predict(input: number[], modelType: string = 'LSTM'): Promise<OptimizationMetrics> {
    try {
      console.log(`Führe Vorhersage mit ${modelType} Modell durch...`);
      
      // Einfache Validierung der Eingabe
      if (!input || input.length === 0) {
        console.warn('Keine numerischen Features extrahiert, verwende Standardwerte');
        return this.getDefaultMetrics();
      }

      // Padding der Eingabe auf die konfigurierte Eingabegröße
      const paddedInput = this.padInput(input, 10);
      console.log(`Input für Vorhersage vorbereitet (Länge: ${paddedInput.length})`);

      // Einfache Heuristik-basierte Vorhersage anstelle eines ML-Modells
      return this.computeHeuristicPrediction(paddedInput, modelType);
    } catch (error) {
      console.error(`Fehler bei der Vorhersage mit ${modelType} Modell:`, error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Einfache heuristische Berechnung basierend auf den Eingabewerten
   */
  private computeHeuristicPrediction(input: number[], modelType: string): OptimizationMetrics {
    // Berechne Durchschnitt aller Eingabewerte für die Skalierung
    const avg = input.reduce((sum, val) => sum + val, 0) / input.length;
    
    // Berechne Varianz für die Stabilität
    const variance = input.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / input.length;
    
    // Berechne Min/Max für Bereichsanalyse
    const min = Math.min(...input);
    const max = Math.max(...input);
    const range = max - min;

    // Normalisiere Werte auf 0-100 Basis
    const normalizeToPercent = (value: number, lowBound = 0, highBound = 100): number => {
      return Math.max(lowBound, Math.min(highBound, value * 100));
    };

    // Jedes Modell kann leicht unterschiedliche Gewichtungen haben
    let performanceWeight = 1.0;
    let adaptationWeight = 1.0;
    let stabilityWeight = 1.0;
    let potentialWeight = 1.0;

    switch (modelType) {
      case 'LSTM':
        // LSTM ist gut für Sequenzen, betont Stabilität
        stabilityWeight = 1.2;
        break;
      case 'Transformer':
        // Transformer ist gut für komplexe Muster, betont Potenzial
        potentialWeight = 1.2;
        break;
      case 'CNN':
        // CNN ist gut für Musterverarbeitung, betont Performance
        performanceWeight = 1.2;
        break;
      case 'MLP':
        // MLP ist vielseitig, betont Anpassungsfähigkeit
        adaptationWeight = 1.2;
        break;
    }

    // Berechne gewichtete Metrikwerte basierend auf Eingabestatistiken
    const performance = normalizeToPercent(avg * 0.6 + (1 - variance) * 0.4) * performanceWeight;
    const adaptationRate = normalizeToPercent(range * 0.5 + max * 0.5) * adaptationWeight;
    const systemHealth = normalizeToPercent((1 - variance) * 0.7 + avg * 0.3) * stabilityWeight;
    const optimizationPotential = normalizeToPercent(max * 0.8 + range * 0.2) * potentialWeight;

    // Berechne Gesamtbewertung
    const overallScore = (performance + adaptationRate + systemHealth + optimizationPotential) / 4;

    return {
      performance: Math.round(performance),
      adaptationRate: Math.round(adaptationRate),
      systemHealth: Math.round(systemHealth),
      optimizationPotential: Math.round(optimizationPotential),
      overallScore: Math.round(overallScore)
    };
  }

  /**
   * Füllt die Eingabe auf die gewünschte Länge auf
   */
  private padInput(input: number[], targetLength: number): number[] {
    if (input.length >= targetLength) {
      return input.slice(0, targetLength);
    }
    
    console.log(`Padding input from length ${input.length} to ${targetLength}`);
    
    // Fülle mit Nullen auf bis zur Ziellänge
    const padding = new Array(targetLength - input.length).fill(0);
    return [...input, ...padding];
  }

  /**
   * Liefert Standardmetriken zurück
   */
  private getDefaultMetrics(): OptimizationMetrics {
    return {
      performance: 50,
      adaptationRate: 50,
      systemHealth: 50,
      optimizationPotential: 50,
      overallScore: 50
    };
  }
} 