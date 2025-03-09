import * as tf from '@tensorflow/tfjs';
import { OptimizationMetrics } from './types';

interface LayerConfig {
  units: number;
  activation: string;
}

export class NeuralNetwork {
  private model!: tf.Sequential;
  private readonly inputShape: number;
  private readonly layerConfigs: LayerConfig[];
  private readonly learningRate: number;
  private readonly optimizer: tf.Optimizer;

  constructor() {
    this.inputShape = 10; // Anzahl der Eingabe-Features
    this.layerConfigs = [
      { units: 64, activation: 'relu' },
      { units: 32, activation: 'relu' },
      { units: 16, activation: 'relu' },
      { units: 4, activation: 'sigmoid' } // Ausgabe-Layer für OptimizationMetrics
    ];
    this.learningRate = 0.001;
    this.optimizer = tf.train.adam(this.learningRate);
    this.initializeModel();
  }

  private initializeModel(): void {
    this.model = tf.sequential();

    // Input Layer
    this.model.add(tf.layers.dense({
      units: this.layerConfigs[0].units,
      activation: this.layerConfigs[0].activation as any,
      inputShape: [this.inputShape]
    }));

    // Hidden Layers
    for (let i = 1; i < this.layerConfigs.length; i++) {
      this.model.add(tf.layers.dense({
        units: this.layerConfigs[i].units,
        activation: this.layerConfigs[i].activation as any
      }));
    }

    // Kompiliere Modell
    this.model.compile({
      optimizer: this.optimizer,
      loss: 'meanSquaredError',
      metrics: ['accuracy']
    });
  }

  async train(data: OptimizationMetrics): Promise<void> {
    const inputTensor = this.preprocessInput(data);
    const targetTensor = this.preprocessTarget(data);

    await this.model.fit(inputTensor, targetTensor, {
      epochs: 10,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs?.loss}`);
        }
      }
    });

    // Bereinige Tensoren
    inputTensor.dispose();
    targetTensor.dispose();
  }

  async predict(input: any): Promise<OptimizationMetrics> {
    const inputTensor = this.preprocessInput(input);
    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    
    const result = await prediction.array() as number[][];
    
    // Bereinige Tensoren
    inputTensor.dispose();
    prediction.dispose();

    return this.postprocessPrediction(result[0]);
  }

  private preprocessInput(data: any): tf.Tensor2D {
    // Konvertiere Eingabedaten in Tensor
    const features = this.extractFeatures(data);
    return tf.tensor2d([features]);
  }

  private preprocessTarget(data: OptimizationMetrics): tf.Tensor2D {
    // Konvertiere Zieldaten in Tensor
    const targets = [
      data.performanceScore,
      data.adaptationRate,
      data.systemHealth,
      data.optimizationPotential
    ];
    return tf.tensor2d([targets]);
  }

  private extractFeatures(data: any): number[] {
    // Extrahiere relevante Features aus den Daten
    const features = [];
    
    // Systemmetriken
    if (data.currentLoad) features.push(data.currentLoad);
    if (data.responseTime) features.push(data.responseTime);
    if (data.errorRate) features.push(data.errorRate);
    
    // Ressourcennutzung
    if (data.resourceUsage) {
      features.push(data.resourceUsage.cpu);
      features.push(data.resourceUsage.memory);
      features.push(data.resourceUsage.network);
    }
    
    // Fülle restliche Features mit 0
    while (features.length < this.inputShape) {
      features.push(0);
    }
    
    return features;
  }

  private postprocessPrediction(prediction: number[]): OptimizationMetrics {
    return {
      performanceScore: prediction[0],
      adaptationRate: prediction[1],
      systemHealth: prediction[2],
      optimizationPotential: prediction[3]
    };
  }

  async save(path: string): Promise<void> {
    await this.model.save(`file://${path}`);
  }

  async load(path: string): Promise<void> {
    const loadedModel = await tf.loadLayersModel(`file://${path}`);
    if (loadedModel instanceof tf.Sequential) {
      this.model = loadedModel;
    } else {
      throw new Error('Loaded model is not a Sequential model');
    }
  }
} 