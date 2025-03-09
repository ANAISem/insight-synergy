/**
 * Definitionen für System-Events
 */

/**
 * Typen von System-Events
 */
export enum EventType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  DEBUG = 'debug',
  SYSTEM = 'system',
  USER = 'user',
  PERFORMANCE = 'performance',
  SECURITY = 'security'
}

/**
 * Priorität von Events
 */
export enum EventPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Schnittstelle für System-Events
 */
export interface SystemEvent {
  /** Eindeutige ID des Events */
  id: string;
  
  /** Zeitstempel des Events */
  timestamp: number;
  
  /** Typ des Events */
  type: EventType;
  
  /** Priorität des Events */
  priority: EventPriority;
  
  /** Quelle des Events (z.B. Komponente oder Modul) */
  source: string;
  
  /** Nachricht/Beschreibung des Events */
  message: string;
  
  /** Zusätzliche Daten zum Event */
  data?: any;
} 