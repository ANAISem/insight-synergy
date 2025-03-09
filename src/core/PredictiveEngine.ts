import { OptimizationMetrics } from './types';

interface Prediction {
  metrics: OptimizationMetrics;
  confidence: number;
  timestamp: number;
}

interface TrendAnalysis {
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
  factors: string[];
}

export class PredictiveEngine {
  private readonly historyWindow: number = 100;
  private readonly predictionHistory: Prediction[] = [];
  private readonly confidenceThreshold: number = 0.7;

  async predict(currentMetrics: OptimizationMetrics): Promise<Prediction> {
    // Validate input metrics
    if (!currentMetrics) {
      currentMetrics = {
        performanceScore: 0.5,
        adaptationRate: 0.5,
        systemHealth: 0.5,
        optimizationPotential: 0.5
      };
    }

    // Analysiere historische Daten
    const historicalTrend = this.analyzeHistoricalTrend();
    
    // Berechne Vorhersage
    const prediction = await this.calculatePrediction(currentMetrics, historicalTrend);
    
    // Speichere Vorhersage
    this.storePrediction(prediction);
    
    return prediction;
  }

  private analyzeHistoricalTrend(): TrendAnalysis {
    if (this.predictionHistory.length < 2) {
      return {
        trend: 'stable',
        confidence: 0.5,
        factors: ['Insufficient historical data']
      };
    }

    const recentPredictions = this.predictionHistory.slice(-10);
    
    // Berechne Trend-Metriken
    const trends = {
      performance: this.calculateMetricTrend(recentPredictions, 'performanceScore'),
      adaptation: this.calculateMetricTrend(recentPredictions, 'adaptationRate'),
      health: this.calculateMetricTrend(recentPredictions, 'systemHealth'),
      potential: this.calculateMetricTrend(recentPredictions, 'optimizationPotential')
    };

    // Bestimme Gesamttrend
    const overallTrend = this.determineOverallTrend(trends);
    
    return {
      trend: overallTrend.trend,
      confidence: overallTrend.confidence,
      factors: this.identifyInfluencingFactors(trends)
    };
  }

  private async calculatePrediction(
    currentMetrics: OptimizationMetrics,
    trend: TrendAnalysis
  ): Promise<Prediction> {
    // Implementiere Vorhersage-Logik
    const predictedMetrics = this.extrapolateTrend(currentMetrics, trend);
    const confidence = this.calculateConfidence(currentMetrics, trend);

    return {
      metrics: predictedMetrics,
      confidence,
      timestamp: Date.now()
    };
  }

  private calculateMetricTrend(predictions: Prediction[], metric: keyof OptimizationMetrics) {
    if (predictions.length < 2) {
      return {
        direction: 0,
        magnitude: 0,
        stability: 0.5
      };
    }

    const values = predictions.map(p => p.metrics[metric]);
    const deltas = values.slice(1).map((v, i) => v - values[i]);
    
    const averageDelta = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
    const variance = this.calculateVariance(deltas);
    
    return {
      direction: Math.sign(averageDelta),
      magnitude: Math.abs(averageDelta),
      stability: 1 / (1 + variance)
    };
  }

  private determineOverallTrend(trends: any) {
    const trendScores = {
      improving: 0,
      stable: 0,
      declining: 0
    };

    // Gewichte die verschiedenen Trends
    Object.values(trends).forEach((trend: any) => {
      if (trend.direction > 0) trendScores.improving += trend.magnitude * trend.stability;
      else if (trend.direction < 0) trendScores.declining += trend.magnitude * trend.stability;
      else trendScores.stable += trend.stability;
    });

    // Bestimme den dominanten Trend
    const maxScore = Math.max(...Object.values(trendScores));
    const trend = Object.keys(trendScores).find(
      key => trendScores[key as keyof typeof trendScores] === maxScore
    ) as 'improving' | 'stable' | 'declining';

    return {
      trend,
      confidence: maxScore / (Object.values(trendScores).reduce((a, b) => a + b, 0))
    };
  }

  private identifyInfluencingFactors(trends: any): string[] {
    const factors: string[] = [];
    
    // Identifiziere signifikante Faktoren
    Object.entries(trends).forEach(([metric, trend]: [string, any]) => {
      if (Math.abs(trend.direction) * trend.magnitude > 0.1) {
        factors.push(`${metric} (${trend.direction > 0 ? 'positive' : 'negative'} impact)`);
      }
    });
    
    return factors;
  }

  private extrapolateTrend(
    currentMetrics: OptimizationMetrics,
    trend: TrendAnalysis
  ): OptimizationMetrics {
    // Initialize default metrics if currentMetrics is undefined
    const metrics = currentMetrics || {
      performanceScore: 0.5,
      adaptationRate: 0.5,
      systemHealth: 0.5,
      optimizationPotential: 0.5
    };

    const trendFactor = trend.trend === 'improving' ? 1.1 :
                       trend.trend === 'declining' ? 0.9 : 1.0;

    return {
      performanceScore: Math.min(1, Math.max(0, metrics.performanceScore * trendFactor)),
      adaptationRate: Math.min(1, Math.max(0, metrics.adaptationRate * trendFactor)),
      systemHealth: Math.min(1, Math.max(0, metrics.systemHealth * trendFactor)),
      optimizationPotential: Math.min(1, Math.max(0, metrics.optimizationPotential * trendFactor))
    };
  }

  private calculateConfidence(
    metrics: OptimizationMetrics,
    trend: TrendAnalysis
  ): number {
    // Berechne Konfidenz basierend auf verschiedenen Faktoren
    const factors = [
      this.predictionHistory.length / this.historyWindow, // Datenverfügbarkeit
      trend.confidence, // Trend-Stabilität
      this.calculateMetricsReliability(metrics) // Metrik-Zuverlässigkeit
    ];

    const baseConfidence = factors.reduce((acc, factor) => acc * factor, 1);
    
    // Wende Konfidenz-Schwellenwert an
    return baseConfidence >= this.confidenceThreshold ? baseConfidence : 0;
  }

  private calculateMetricsReliability(metrics: OptimizationMetrics): number {
    // Prüfe Metrik-Zuverlässigkeit
    const validMetrics = Object.values(metrics).filter(
      value => value >= 0 && value <= 1
    ).length;

    return validMetrics / Object.keys(metrics).length;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private storePrediction(prediction: Prediction): void {
    this.predictionHistory.push(prediction);
    
    // Halte History-Fenster ein
    if (this.predictionHistory.length > this.historyWindow) {
      this.predictionHistory.shift();
    }
  }
} 