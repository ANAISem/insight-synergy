import { EventEmitter } from 'events';
import { AutoDebugSystem } from './AutoDebugSystem';
import { EnhancedCognitiveCore } from './EnhancedCognitiveCore';
import { SystemMetrics } from '../types/metrics';
import { SystemEvent, EventType } from '../types/events';

interface DebugIntegrationConfig {
  debugLevel: 'low' | 'medium' | 'high';
  autoFix: boolean;
  collectMetrics: boolean;
  optimizationThreshold: number;
}

interface DebugEvent {
  type: 'error' | 'warning' | 'info';
  source: string;
  message: string;
  stackTrace?: string;
  timestamp: number;
  metadata: any;
}

interface ErrorProcessedData {
  error: Error;
  timestamp: number;
}

interface FixAppliedData {
  fix: {
    type: string;
    description: string;
  };
  timestamp: number;
}

/**
 * Debug-Integration für die Überwachung und Fehlerbehebung
 */
export class DebugIntegration extends EventEmitter {
  private readonly debugSystem: AutoDebugSystem;
  private readonly cognitiveCore: EnhancedCognitiveCore;
  private config: DebugIntegrationConfig;
  private isActive: boolean = false;
  private metricsHistory: SystemMetrics[] = [];
  private readonly MAX_HISTORY = 1000;
  private isEnabled: boolean = false;
  private logLevel: number = 3; // Default: Info
  private events: SystemEvent[] = [];
  private metrics: SystemMetrics[] = [];
  private readonly maxStoredItems: number = 100;

  constructor(
    cognitiveCore: EnhancedCognitiveCore,
    config: Partial<DebugIntegrationConfig> = {}
  ) {
    super();
    this.cognitiveCore = cognitiveCore;
    this.config = {
      debugLevel: config.debugLevel || 'medium',
      autoFix: config.autoFix !== undefined ? config.autoFix : true,
      collectMetrics: config.collectMetrics !== undefined ? config.collectMetrics : true,
      optimizationThreshold: config.optimizationThreshold || 0.7
    };
    
    // Erstelle das AutoDebugSystem mit der autoFix-Einstellung
    this.debugSystem = new AutoDebugSystem(this.config.autoFix);
    
    this.setupEventHandlers();
    console.log('Debug Integration initialisiert');
  }

  private setupEventHandlers(): void {
    this.cognitiveCore.on('error', this.handleCoreError.bind(this));
    this.cognitiveCore.on('state-updated', this.handleCoreStateUpdate.bind(this));
    this.cognitiveCore.on('anomaly-detected', this.handleAnomalyDetection.bind(this));
    
    this.debugSystem.on('error-processed', (data: ErrorProcessedData) => {
      this.emit('debug-event', {
        type: 'error',
        source: 'debug-system',
        message: `Fehler verarbeitet: ${data.error.message}`,
        timestamp: data.timestamp,
        metadata: data
      });
    });
    
    this.debugSystem.on('fix-applied', (data: FixAppliedData) => {
      this.emit('auto-fix', {
        type: data.fix.type,
        source: 'debug-system',
        description: data.fix.description,
        timestamp: data.timestamp,
        metadata: data
      });
    });
  }

  async start(): Promise<void> {
    this.isActive = true;
    await this.debugSystem.start();
    console.log('Debug Integration gestartet');
  }

  async stop(): Promise<void> {
    this.isActive = false;
    await this.debugSystem.stop();
    console.log('Debug Integration gestoppt');
  }

  private async handleCoreError(error: Error): Promise<void> {
    if (!this.isActive) return;
    
    // Verarbeite den Fehler mit dem AutoDebugSystem
    await this.debugSystem.processError(error);
  }

  private async handleCoreStateUpdate(state: any): Promise<void> {
    if (!this.config.collectMetrics) return;

    const metrics: SystemMetrics = {
      cpuUsage: state.metrics?.cpuUsage || 0,
      memoryUsage: state.metrics?.memoryUsage || 0,
      responseTime: state.metrics?.responseTime || 0,
      errorRate: state.metrics?.errorRate || 0,
      timestamp: Date.now(),
      activeConnections: state.metrics?.activeConnections || 0,
      throughput: state.metrics?.throughput || 0
    };

    this.updateMetricsHistory(metrics);
    await this.analyzeMetrics(metrics);
  }

  private async handleAnomalyDetection(anomaly: any): Promise<void> {
    const debugEvent: DebugEvent = {
      type: 'warning',
      source: 'cognitive-core',
      message: `Anomaly detected: ${anomaly.type}`,
      timestamp: Date.now(),
      metadata: { anomaly }
    };

    await this.debugSystem.processError(debugEvent);
    this.emit('anomaly-processed', { anomaly, debugEvent });
  }

  private updateMetricsHistory(metrics: SystemMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.MAX_HISTORY) {
      this.metricsHistory.shift();
    }
  }

  private async analyzeMetrics(metrics: SystemMetrics): Promise<void> {
    await this.debugSystem.processError({
      id: 'perf-' + Date.now(),
      type: 'performance' as EventType,
      data: metrics,
      timestamp: Date.now(),
      source: 'debug-integration',
      priority: 1,
      message: 'Performance metrics collected'
    });
  }

  // Public API
  async getDebugStatus(): Promise<any> {
    const debugSystemStatus = this.debugSystem.getStatus();
    
    return {
      isActive: this.isActive,
      debugLevel: this.config.debugLevel,
      autoFix: this.config.autoFix,
      errors: this.debugSystem.getErrorHistory(),
      fixesApplied: debugSystemStatus.totalFixesApplied,
      metricsCollected: this.metricsHistory.length
    };
  }

  async updateConfig(newConfig: Partial<DebugIntegrationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', this.config);
  }

  async forceDebugAnalysis(): Promise<void> {
    const currentState = await this.cognitiveCore.getState();
    const metrics: SystemMetrics = {
      cpuUsage: currentState.metrics.systemHealth * 10,
      memoryUsage: currentState.metrics.adaptationRate * 100,
      responseTime: currentState.metrics.adaptationRate * 1000,
      errorRate: (1 - currentState.metrics.optimizationPotential) * 100,
      timestamp: Date.now(),
      activeConnections: Math.round(currentState.metrics.performance / 10),
      throughput: Math.round(currentState.metrics.overallScore / 5)
    };
    await this.analyzeMetrics(metrics);
  }

  async getMetricsHistory(): Promise<SystemMetrics[]> {
    return this.metricsHistory;
  }

  /**
   * Aktiviert die Debug-Integration
   */
  enable(level: number = 3): void {
    this.isEnabled = true;
    this.logLevel = level;
    console.log(`Debug Integration aktiviert (Level: ${level})`);
  }
  
  /**
   * Deaktiviert die Debug-Integration
   */
  disable(): void {
    this.isEnabled = false;
    console.log('Debug Integration deaktiviert');
  }
  
  /**
   * Verarbeitet ein Systemevent für Debug-Zwecke
   */
  processEvent(event: SystemEvent): void {
    if (!this.isEnabled) return;
    
    // Speichere Event für Debug-Historie
    this.events.unshift(event);
    
    // Begrenze die Anzahl gespeicherter Events
    if (this.events.length > this.maxStoredItems) {
      this.events = this.events.slice(0, this.maxStoredItems);
    }
    
    // Log basierend auf Level
    this.logEvent(event);
    
    // Emittiere Event für Listeners
    this.emit('debug-event', event);
  }
  
  /**
   * Verarbeitet Systemmetriken für Debug-Zwecke
   */
  processMetrics(metrics: SystemMetrics): void {
    if (!this.isEnabled) return;
    
    // Speichere Metriken für Debug-Historie
    this.metrics.unshift(metrics);
    
    // Begrenze die Anzahl gespeicherter Metriken
    if (this.metrics.length > this.maxStoredItems) {
      this.metrics = this.metrics.slice(0, this.maxStoredItems);
    }
    
    // Emittiere Metriken für Listeners
    this.emit('debug-metrics', metrics);
  }
  
  /**
   * Loggt ein Event basierend auf dem konfigurierten Log-Level
   */
  private logEvent(event: SystemEvent): void {
    const priority = event.priority;
    
    // Nur loggen, wenn Event-Priorität höher ist als konfiguriertes Level
    if (priority >= this.logLevel) {
      console.log(`[DEBUG] Event: ${event.type} - ${event.source} - ${event.message}`);
    }
  }
  
  /**
   * Analysiert einen Fehler und gibt Debug-Informationen zurück
   */
  analyzeError(error: any): any {
    if (!this.isEnabled) return null;
    
    const analysis = {
      timestamp: new Date(),
      error: {
        message: error.message || 'Unbekannter Fehler',
        stack: error.stack,
        type: error.name || 'Error'
      },
      context: {
        recentEvents: this.events.slice(0, 5),
        recentMetrics: this.metrics.slice(0, 3)
      },
      recommendations: this.generateRecommendations(error)
    };
    
    this.emit('error-analysis', analysis);
    return analysis;
  }
  
  /**
   * Generiert Empfehlungen zur Fehlerbehebung
   */
  private generateRecommendations(error: any): string[] {
    const recommendations: string[] = [
      'Überprüfen Sie die Protokolle auf vorherige Fehler oder Warnungen.'
    ];
    
    // Basierend auf Fehlertyp spezifische Empfehlungen hinzufügen
    if (error.name === 'TypeError') {
      recommendations.push('Überprüfen Sie die Typen aller Variablen und Parameter.');
    } else if (error.name === 'ReferenceError') {
      recommendations.push('Überprüfen Sie, ob alle Variablen korrekt deklariert wurden.');
    } else if (error.message?.includes('network') || error.message?.includes('connection')) {
      recommendations.push('Überprüfen Sie die Netzwerkverbindung und Firewall-Einstellungen.');
    }
    
    return recommendations;
  }
  
  /**
   * Gibt die aktuelle Debug-Konfiguration zurück
   */
  getConfig(): any {
    return {
      isEnabled: this.isEnabled,
      logLevel: this.logLevel,
      storedEvents: this.events.length,
      storedMetrics: this.metrics.length
    };
  }
  
  /**
   * Gibt die Debug-Historie zurück
   */
  getHistory(): any {
    return {
      events: this.events,
      metrics: this.metrics
    };
  }
} 