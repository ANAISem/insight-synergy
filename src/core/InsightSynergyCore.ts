import { EventEmitter } from 'events';
import { EnhancedCognitiveCore } from './EnhancedCognitiveCore';
import { DebugIntegration } from './DebugIntegration';
import { InsightIntegrationLayer } from './InsightIntegrationLayer';
import { SystemConfig } from '../types/config';
import { SystemComponent } from '../types/component';
import { SystemEvent } from '../types/events';
import { SystemMetrics, OptimizationMetrics } from '../types/metrics';

// Erweitere die SystemConfig um fehlende Eigenschaften
interface ExtendedSystemConfig extends SystemConfig {
  debugLevel: 'low' | 'medium' | 'high';
  autoFix: boolean;
  adaptiveMode: boolean;
  optimizationThreshold: number;
}

/**
 * Hauptklasse für das Insight Synergy Core System
 * Integriert alle Komponenten und stellt die API bereit
 */
export class InsightSynergyCore extends EventEmitter {
  private readonly cognitiveCore: EnhancedCognitiveCore;
  private readonly debugIntegration: DebugIntegration;
  private readonly integrationLayer: InsightIntegrationLayer;
  private isActive: boolean = false;
  private config: ExtendedSystemConfig;
  private _startTime: number = 0;
  private componentsStatus: Record<string, boolean> = {};
  private optimizationScore: number = 0;
  private lastOptimizationTime: number = 0;

  constructor(config: Partial<ExtendedSystemConfig> = {}) {
    super();
    this.config = this.initializeConfig(config) as ExtendedSystemConfig;
    
    // Initialisieren der Kernkomponenten
    this.cognitiveCore = new EnhancedCognitiveCore();
    this.debugIntegration = new DebugIntegration(this.cognitiveCore, {
      debugLevel: this.config.debugLevel,
      autoFix: this.config.autoFix,
      optimizationThreshold: this.config.optimizationThreshold
    });
    this.integrationLayer = new InsightIntegrationLayer();
    
    // Event-Handler einrichten
    this.setupEventHandlers();
    
    // Startzeit initialisieren
    this._startTime = Date.now();
  }

  private initializeConfig(partialConfig: Partial<ExtendedSystemConfig>): ExtendedSystemConfig {
    // Standardkonfiguration
    const defaultConfig: ExtendedSystemConfig = {
      debug: false,
      logLevel: 'info',
      autoRecovery: true,
      eventTracking: {
        enabled: true,
        maxEvents: 1000,
        persistEvents: false
      },
      performanceMonitoring: {
        enabled: true,
        interval: 5000,
        thresholds: {
          cpu: 80,
          memory: 70
        }
      },
      // Füge fehlende Eigenschaften hinzu
      debugLevel: 'medium',
      autoFix: true,
      adaptiveMode: true,
      optimizationThreshold: 0.7
    };

    // Überschreibe Standardwerte mit bereitgestellten Werten
    return {
      ...defaultConfig,
      ...partialConfig
    };
  }

  private setupEventHandlers(): void {
    // Cognitive Core Events
    this.cognitiveCore.on('state-updated', this.handleCoreStateUpdate.bind(this));
    this.cognitiveCore.on('pattern-updated', this.handlePatternUpdate.bind(this));
    this.cognitiveCore.on('prediction-updated', this.handlePredictionUpdate.bind(this));
    this.cognitiveCore.on('anomaly-detected', this.handleAnomalyDetection.bind(this));
    this.cognitiveCore.on('error', this.handleComponentError.bind(this));

    // Debug Integration Events
    this.debugIntegration.on('debug-event-processed', this.handleDebugEvent.bind(this));
    this.debugIntegration.on('auto-fix-applied', this.handleAutoFix.bind(this));
    this.debugIntegration.on('debug-system-error', this.handleComponentError.bind(this));

    // Integration Layer Events
    this.integrationLayer.on('component-registered', this.handleComponentRegistration.bind(this));
    this.integrationLayer.on('event-processed', this.handleIntegrationEvent.bind(this));
    this.integrationLayer.on('component-status-changed', this.handleComponentStatusChange.bind(this));
    this.integrationLayer.on('error', this.handleComponentError.bind(this));
  }

  /**
   * Startet das Insight Synergy Core System
   */
  async start(): Promise<void> {
    if (this.isActive) return;
    
    console.log('Starte Insight Synergy Core System...');
    
    try {
      // Starte alle Komponenten in der richtigen Reihenfolge
      await this.integrationLayer.start();
      console.log('Integration Layer gestartet.');
      
      await this.cognitiveCore.start();
      console.log('Enhanced Cognitive Core gestartet.');
      
      await this.debugIntegration.start();
      console.log('Debug Integration gestartet.');
      
      this.isActive = true;
      console.log('Insight Synergy Core System erfolgreich gestartet.');
      
      this.emit('system-started');
    } catch (error) {
      console.error('Fehler beim Starten des Insight Synergy Core Systems:', error);
      this.emit('error', {
        component: 'InsightSynergyCore',
        message: 'Fehler beim Starten des Systems',
        error
      });
      
      // Versuche eine partielle Wiederherstellung
      await this.attemptRecovery();
    }
  }

  /**
   * Stoppt das Insight Synergy Core System
   */
  async stop(): Promise<void> {
    if (!this.isActive) return;
    
    console.log('Stoppe Insight Synergy Core System...');
    
    try {
      // Stoppe alle Komponenten in umgekehrter Reihenfolge
      await this.debugIntegration.stop();
      console.log('Debug Integration gestoppt.');
      
      await this.cognitiveCore.stop();
      console.log('Enhanced Cognitive Core gestoppt.');
      
      await this.integrationLayer.stop();
      console.log('Integration Layer gestoppt.');
      
      this.isActive = false;
      console.log('Insight Synergy Core System erfolgreich gestoppt.');
      
      this.emit('system-stopped');
    } catch (error) {
      console.error('Fehler beim Stoppen des Insight Synergy Core Systems:', error);
      this.emit('error', {
        component: 'InsightSynergyCore',
        message: 'Fehler beim Stoppen des Systems',
        error
      });
    }
  }

  /**
   * Versucht, das System nach einem Fehler wiederherzustellen
   */
  private async attemptRecovery(): Promise<void> {
    console.log('Versuche System-Wiederherstellung...');
    
    try {
      // Stoppe alle möglicherweise noch laufenden Komponenten
      await this.stop();
      
      // Versuche einen Neustart mit minimaler Konfiguration
      const minimalConfig = { ...this.config, autoFix: false, adaptiveMode: false };
      this.updateConfig(minimalConfig);
      
      await this.start();
      console.log('System-Wiederherstellung erfolgreich.');
    } catch (error) {
      console.error('Fehler bei der System-Wiederherstellung:', error);
      this.emit('recovery-failed', error);
    }
  }

  /**
   * Verarbeitet ein Ereignis im System
   */
  async processEvent(event: SystemEvent): Promise<void> {
    try {
      // Transformiere das Event für die neue Typendefinition
      const transformedEvent: SystemEvent = {
        ...event,
        // Ergänze fehlende Felder für die neue SystemEvent-Definition
        priority: event.priority || 0,
        message: event.message || ''
      };
      
      const processedEvent = this.prepareEventForIntegration(transformedEvent);
      await this.cognitiveCore.processEvent(processedEvent);
      this.emit('event-processed', event);
    } catch (error) {
      console.error('Fehler bei der Event-Verarbeitung:', error);
      this.emit('error', { source: 'event-processing', error });
      await this.attemptRecovery();
    }
  }

  /**
   * Bereitet ein Ereignis für die Integration vor
   */
  private prepareEventForIntegration(event: SystemEvent): SystemEvent {
    // Erstelle eine Kopie des Events mit den erforderlichen Feldern
    const preparedEvent: SystemEvent = {
      ...event,
      // Stelle sicher, dass alle erforderlichen Felder vorhanden sind
      priority: event.priority !== undefined ? event.priority : 1,
      message: event.message || `Event from ${event.source || 'unknown'}`
    };
    
    return preparedEvent;
  }

  /**
   * Verarbeitet Systemmetriken
   */
  async processMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      // Transformiere die Metriken für die neue Typendefinition
      const transformedMetrics: SystemMetrics = {
        ...metrics,
        // Ergänze fehlende Felder für die neue SystemMetrics-Definition
        activeConnections: metrics.activeConnections || 0,
        throughput: metrics.throughput || 0
      };
      
      await this.cognitiveCore.processMetrics(transformedMetrics);
      this.emit('metrics-processed', metrics);
    } catch (error) {
      console.error('Fehler bei der Metrik-Verarbeitung:', error);
      this.emit('error', { source: 'metrics-processing', error });
    }
  }

  /**
   * Registriert eine Komponente im Integrationslayer
   */
  async registerComponent(component: SystemComponent): Promise<void> {
    if (!this.isActive) {
      throw new Error('System ist nicht aktiv. Bitte starten Sie es zuerst mit .start()');
    }
    
    // Registriere die Komponente im System
    this.componentsStatus[component.id] = true;
    
    // Da die neue Integration Layer keine Component-Registrierung mehr unterstützt,
    // erstellen wir einfach eine Verbindung
    this.integrationLayer.registerConnection(component.id, {
      sendEvent: async (_: any) => {
        console.log(`Weiterleitung von Event an Komponente ${component.id}`);
        // Hier können wir spezifische Logik für Komponenten-Events hinzufügen
      },
      sendMetrics: async (_: any) => {
        console.log(`Weiterleitung von Metriken an Komponente ${component.id}`);
        // Hier können wir spezifische Logik für Komponenten-Metriken hinzufügen
      }
    });
    
    this.emit('component-registered', component);
  }

  /**
   * Aktualisiert die Systemkonfiguration
   */
  async updateConfig(newConfig: Partial<ExtendedSystemConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Aktualisiere die Konfiguration aller Komponenten
    await this.debugIntegration.updateConfig({
      debugLevel: this.config.debugLevel,
      autoFix: this.config.autoFix,
      optimizationThreshold: this.config.optimizationThreshold
    });
    
    this.emit('config-updated', this.config);
  }

  /**
   * Löst eine manuelle Optimierung aus
   */
  async forceOptimization(): Promise<OptimizationMetrics> {
    try {
      const optimizationResult = await this.cognitiveCore.forceOptimization();
      this.optimizationScore = optimizationResult.overallScore;
      this.lastOptimizationTime = Date.now();
      this.emit('optimization-complete', optimizationResult);
      
      // Konvertiere die Ergebnisse in das vom System erwartete Format
      return {
        performance: optimizationResult.performance,
        adaptationRate: optimizationResult.adaptationRate,
        systemHealth: optimizationResult.systemHealth,
        optimizationPotential: optimizationResult.optimizationPotential,
        overallScore: optimizationResult.overallScore
      };
    } catch (error) {
      console.error('Fehler bei der Optimierung:', error);
      this.emit('error', { source: 'optimization', error });
      return {
        performance: 50,
        adaptationRate: 50,
        systemHealth: 50,
        optimizationPotential: 50,
        overallScore: 50
      };
    }
  }

  /**
   * Löst eine manuelle Debug-Analyse aus
   */
  async forceDebugAnalysis(): Promise<void> {
    await this.debugIntegration.forceDebugAnalysis();
  }

  /**
   * Gibt den aktuellen System-Status zurück
   * @returns System-Status als JSON-Objekt
   */
  async getSystemStatus(): Promise<any> {
    const cognitiveState = await this.cognitiveCore.getState();
    const debugStatus = await this.debugIntegration.getDebugStatus();
    
    // Da wir keine Komponenten mehr haben, ersetzen wir den Komponentenstatus
    // durch die Anzahl der Verbindungen
    const integrationStatus = this.integrationLayer.getStatus();
    
    return {
      isActive: this.isActive,
      uptime: this.isActive ? (Date.now() - this._startTime) : 0,
      config: {
        debugLevel: this.config.logLevel,
        autoFix: this.config.autoRecovery,
        adaptiveMode: true
      },
      cognitiveCore: {
        phase: cognitiveState.currentPhase,
        metrics: cognitiveState.metrics,
        patterns: cognitiveState.patterns.length
      },
      debugSystem: {
        isActive: debugStatus.isActive,
        errorCount: debugStatus.errors?.length || 0,
        fixesApplied: debugStatus.fixesApplied || 0
      },
      integration: {
        connectionCount: integrationStatus.connectionCount,
        connections: integrationStatus.connections
      },
      components: this.componentsStatus,
      optimizationScore: this.optimizationScore,
      lastOptimizationTime: this.lastOptimizationTime
    };
  }

  /**
   * Gibt aktuelle System-Metriken für Monitoring zurück
   * @returns Detaillierte Metriken als JSON-Objekt
   */
  async getMetrics(): Promise<any> {
    const baseMetrics: any = {
      timestamp: Date.now(),
      uptime: this.isActive ? (Date.now() - this._startTime) : 0,
      isActive: this.isActive,
      optimizationScore: this.optimizationScore,
      lastOptimizationTime: this.lastOptimizationTime
    };
    
    try {
      // Füge Komponentenmetriken hinzu, falls verfügbar
      if (this.isActive) {
        // Da wir keine getComponentCount und getRegisteredTypes-Methoden mehr haben,
        // verwenden wir direkt die Informationen aus getStatus
        const integrationStatus = this.integrationLayer.getStatus();
        baseMetrics.apiCallCount = integrationStatus.connectionCount || 0;
        baseMetrics.integrationCount = integrationStatus.connections?.length || 0;
      }
      
      return baseMetrics;
    } catch (error) {
      console.error('Fehler beim Sammeln von Metriken:', error);
      return baseMetrics;
    }
  }

  // Event Handler
  
  private handleCoreStateUpdate(state: any): void {
    this.emit('core-state-updated', state);
  }
  
  private handlePatternUpdate(pattern: any): void {
    this.emit('pattern-detected', pattern);
  }
  
  private handlePredictionUpdate(prediction: any): void {
    this.emit('prediction-generated', prediction);
  }
  
  private handleAnomalyDetection(anomaly: any): void {
    this.emit('anomaly-detected', anomaly);
  }
  
  private handleDebugEvent(event: any): void {
    this.emit('debug-event', event);
  }
  
  private handleAutoFix(fixData: any): void {
    this.emit('auto-fix-applied', fixData);
  }
  
  private handleComponentRegistration(component: any): void {
    this.emit('component-registered', component);
  }
  
  private handleIntegrationEvent(event: any): void {
    this.emit('integration-event', event);
  }
  
  private handleComponentStatusChange(statusData: any): void {
    this.emit('component-status-changed', statusData);
  }
  
  private handleComponentError(error: any): void {
    console.error('Komponentenfehler:', error);
    this.emit('component-error', error);
  }
} 