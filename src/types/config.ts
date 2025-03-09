/**
 * System-Konfigurationsschnittstelle
 */
export interface SystemConfig {
  /**
   * Debug-Modus aktivieren (mehr Logging)
   */
  debug: boolean;

  /**
   * Log-Level (0-5, wobei 5 das detaillierteste Level ist)
   */
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace';

  /**
   * Automatische Wiederherstellung bei Fehlern aktivieren
   */
  autoRecovery: boolean;

  /**
   * URL des API-Endpunkts für externe Integration
   */
  apiEndpoint?: string;

  /**
   * Dateiverzeichnis für Speicherung/Persistenz
   */
  dataDir?: string;

  /**
   * Konfiguration der Ereignisverfolgung
   */
  eventTracking: {
    enabled: boolean;
    maxEvents: number;
    persistEvents: boolean;
  };

  /**
   * Konfiguration der Leistungsüberwachung
   */
  performanceMonitoring: {
    enabled: boolean;
    interval: number; // Millisekunden
    thresholds: {
      cpu: number; // Prozent
      memory: number; // Prozent
    };
  };

  /**
   * Zusätzliche benutzerdefinierte Konfigurationsoptionen
   */
  [key: string]: any;
} 