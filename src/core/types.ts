// Metriken und Messungen
export interface OptimizationMetrics {
  performanceScore: number;
  adaptationRate: number;
  systemHealth: number;
  optimizationPotential: number;
}

export interface SystemState {
  performanceScore: number;
  adaptationRate: number;
  systemHealth: number;
  optimizationPotential: number;
  lastUpdate: Date;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  errorRate: number;
  timestamp: Date;
}

// Kognitive Muster und Profile
export interface CognitivePattern {
  id: string;
  name?: string;
  type: string;
  features: { name: string; value: number; weight: number }[];
  confidence: number;
  occurrences: number;
  lastUpdated: Date;
  metadata?: any;
}

export interface CognitiveProfile {
  userId: string;
  patterns: CognitivePattern[];
  preferences: { category: string; value: number }[];
  interests: { topic: string; score: number }[];
  learningRate: number;
  adaptationScore: number;
  lastUpdated: Date;
}

// Event-System
export interface SystemEvent {
  id?: string;
  type: string;
  source?: string;
  severity?: 'low' | 'medium' | 'high';
  data: any;
  timestamp: Date;
}

export interface EventHandler {
  handleEvent(event: SystemEvent): Promise<void>;
}

// Optimierung und Debugging
export interface OptimizationResult {
  before: OptimizationMetrics;
  after: OptimizationMetrics;
  improvements: string[];
  elapsedTime: number;
}

export interface DebugEvent {
  type: string;
  source: string;
  timestamp: Date;
  data: any;
  severity: 'low' | 'medium' | 'high';
}

export interface DebugRule {
  id: string;
  name: string;
  condition: (event: DebugEvent) => boolean;
  action: (event: DebugEvent) => Promise<any>;
  priority: number;
}

export interface OptimizationRule {
  id: string;
  name: string;
  condition: (metrics: SystemMetrics) => boolean;
  action: (metrics: SystemMetrics) => Promise<OptimizationMetrics>;
  priority: number;
}

// Komponenten und Integration
export interface SystemComponent {
  id: string;
  type: string;
  name: string;
  status: ComponentStatus;
  start(): Promise<void>;
  stop(): Promise<void>;
  process?(data: any): Promise<any>;
}

export type ComponentStatus = 'active' | 'inactive' | 'error' | 'initializing';

// Konfiguration und Einstellungen
export interface SystemConfig {
  optimizationInterval: number;
  debugLevel: 'low' | 'medium' | 'high';
  autoFix: boolean;
  optimizationThreshold: number;
  autoStart: boolean;
  dataCollectionEnabled: boolean;
  adaptiveMode: boolean;
  apiEndpoints: {
    modelService: string;
    coreApi: string;
  };
}

// Neuronales Netzwerk
export interface NeuralNetworkConfig {
  inputSize: number;
  outputSize: number;
  hiddenLayers: number[];
  learningRate: number;
  epochs: number;
  batchSize: number;
  activationFunction: string;
  lossFunction: string;
  optimizer: string;
  layers: number[];
  regularization?: {
    type: string;
    rate: number;
  };
}

export interface TrainingData {
  input: number[] | number[][];
  output: number[] | number[][];
}

// Pattern Recognition
export interface PatternMatchResult {
  pattern: CognitivePattern;
  similarity: number;
  context: any;
}

export interface PatternRecognitionConfig {
  minConfidence: number;
  maxPatterns: number;
  featureExtraction: FeatureExtractionConfig;
}

export interface FeatureExtractionConfig {
  method: 'statistical' | 'neural' | 'semantic';
  parameters: Map<string, number>;
}

// Integration Layer
export interface IntegrationEvent {
  type: string;
  source: SystemComponent;
  data: any;
  timestamp: Date;
}

// Adaptive System
export interface AdaptiveRule {
  id: string;
  condition: (context: any) => boolean;
  action: (context: any) => Promise<void>;
  priority: number;
}

export interface AdaptationResult {
  success: boolean;
  changes: string[];
  metrics: OptimizationMetrics;
}

// Error Handling
export interface ErrorContext {
  component: string;
  operation: string;
  timestamp: Date;
  stackTrace?: string;
  relatedEvents?: SystemEvent[];
}

export interface ErrorHandler {
  handleError(error: Error, context: ErrorContext): Promise<void>;
}

// Monitoring und Logging
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  message: string;
  timestamp: Date;
  context?: any;
}

export interface MonitoringConfig {
  interval: number;
  metrics: string[];
  alertThresholds: Map<string, number>;
}

export interface AlertConfig {
  condition: (metrics: SystemMetrics) => boolean;
  message: string;
  severity: 'low' | 'medium' | 'high';
  actions?: ((alert: any) => Promise<void>)[];
}

export interface DebugResult {
  issue: string;
  severity: 'low' | 'medium' | 'high';
  location: string;
  recommendation: string;
  autoFixAvailable: boolean;
  autoFix?: () => Promise<void>;
} 