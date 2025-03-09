/**
 * Repräsentiert eine Systemkomponente
 */
export interface SystemComponent {
  /**
   * Eindeutige ID der Komponente
   */
  id: string;

  /**
   * Anzeigename der Komponente
   */
  name: string;

  /**
   * Beschreibung der Komponente
   */
  description?: string;

  /**
   * Typ der Komponente
   */
  type: 'core' | 'integration' | 'analytics' | 'ui' | 'storage' | 'custom';

  /**
   * Version der Komponente
   */
  version?: string;

  /**
   * Priorität der Komponente (höhere Werte = höhere Priorität)
   */
  priority?: number;

  /**
   * Abhängigkeiten von anderen Komponenten
   */
  dependencies?: string[];

  /**
   * Zusätzliche Konfiguration oder Metadaten für die Komponente
   */
  [key: string]: any;
} 