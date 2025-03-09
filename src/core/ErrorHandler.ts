/**
 * ErrorHandler.ts
 * 
 * Zentrales Fehlerbehandlungssystem für Insight Synergy.
 * Bietet erweitertes Logging, Error-Kategorisierung und Self-Healing Mechanismen.
 */

// Standard-Fehlertypen
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  RESOURCE = 'RESOURCE',
  TIMEOUT = 'TIMEOUT',
  INTERNAL = 'INTERNAL',
  API = 'API',
  AUTH = 'AUTH',
  DATA = 'DATA',
  MODEL = 'MODEL',
  UNKNOWN = 'UNKNOWN'
}

// Schweregrade von Fehlern
export enum ErrorSeverity {
  LOW = 'LOW',         // Unbedenklich, kann ignoriert werden
  MEDIUM = 'MEDIUM',   // Beeinträchtigt bestimmte Funktionen
  HIGH = 'HIGH',       // Schwerwiegende Fehler, beeinträchtigt Kernfunktionen
  CRITICAL = 'CRITICAL'// Systemkritisch, erfordert sofortige Aufmerksamkeit
}

// Standard-Fehlerklasse mit erweiterten Eigenschaften
export class InsightError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  timestamp: number;
  context: Record<string, any>;
  causedBy?: Error;
  retryable: boolean;
  
  constructor(
    message: string, 
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Record<string, any> = {},
    causedBy?: Error,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'InsightError';
    this.type = type;
    this.severity = severity;
    this.timestamp = Date.now();
    this.context = context;
    this.causedBy = causedBy;
    this.retryable = retryable;
    
    // Stellt sicher, dass der Stack-Trace korrekt ist
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Formatiert den Fehler für die Anzeige/Protokollierung
   */
  toString(): string {
    let errorString = `[${this.severity}] ${this.type} Error: ${this.message}`;
    
    if (Object.keys(this.context).length > 0) {
      errorString += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
    }
    
    if (this.causedBy) {
      errorString += `\nCaused by: ${this.causedBy.message}`;
      if (this.causedBy.stack) {
        errorString += `\n${this.causedBy.stack}`;
      }
    }
    
    return errorString;
  }

  /**
   * Formatiert den Fehler als JSON-Objekt
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      causedBy: this.causedBy ? {
        message: this.causedBy.message,
        stack: this.causedBy.stack
      } : undefined,
      retryable: this.retryable,
      stack: this.stack
    };
  }
}

// Spezialisierte Fehlertypen
export class ValidationError extends InsightError {
  constructor(message: string, context: Record<string, any> = {}, causedBy?: Error) {
    super(
      message, 
      ErrorType.VALIDATION, 
      ErrorSeverity.MEDIUM,
      context,
      causedBy,
      true // Validation errors are often retryable
    );
    this.name = 'ValidationError';
  }
}

export class NetworkError extends InsightError {
  constructor(message: string, context: Record<string, any> = {}, causedBy?: Error) {
    super(
      message, 
      ErrorType.NETWORK, 
      ErrorSeverity.HIGH,
      context,
      causedBy,
      true // Network errors are often retryable
    );
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends InsightError {
  constructor(message: string, context: Record<string, any> = {}, causedBy?: Error) {
    super(
      message, 
      ErrorType.TIMEOUT, 
      ErrorSeverity.HIGH,
      context,
      causedBy,
      true // Timeout errors are often retryable
    );
    this.name = 'TimeoutError';
  }
}

export class ApiError extends InsightError {
  statusCode?: number;
  
  constructor(
    message: string, 
    statusCode?: number,
    context: Record<string, any> = {}, 
    causedBy?: Error
  ) {
    super(
      message, 
      ErrorType.API, 
      statusCode && statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      { ...context, statusCode },
      causedBy,
      statusCode ? [408, 429, 500, 502, 503, 504].includes(statusCode) : false
    );
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export class ModelError extends InsightError {
  constructor(message: string, context: Record<string, any> = {}, causedBy?: Error) {
    super(
      message, 
      ErrorType.MODEL, 
      ErrorSeverity.HIGH,
      context,
      causedBy,
      false // Model errors are usually not retryable without changes
    );
    this.name = 'ModelError';
  }
}

/**
 * Zentraler ErrorHandler für Insight Synergy
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: InsightError[] = [];
  private errorListeners: Map<string, ((error: InsightError) => void)[]> = new Map();
  private maxLogSize: number = 100;
  private retryStrategies: Map<ErrorType, RetryStrategy> = new Map();
  
  private constructor() {
    this.initDefaultRetryStrategies();
  }
  
  /**
   * Singleton-Instanz des ErrorHandlers
   */
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }
  
  /**
   * Verarbeitet einen Fehler
   * @param error Der zu verarbeitende Fehler
   * @param log Ob der Fehler protokolliert werden soll
   */
  public handleError(error: Error | InsightError, log: boolean = true): InsightError {
    let insightError: InsightError;
    
    // Konvertiere reguläre Fehler in InsightError-Objekte
    if (!(error instanceof InsightError)) {
      insightError = new InsightError(
        error.message,
        ErrorType.UNKNOWN,
        ErrorSeverity.MEDIUM,
        {},
        error
      );
    } else {
      insightError = error;
    }
    
    // Fehler protokollieren, wenn gewünscht
    if (log) {
      this.logError(insightError);
    }
    
    // Benachrichtige Listener
    this.notifyListeners(insightError);
    
    return insightError;
  }
  
  /**
   * Protokolliert einen Fehler im internen Log
   * @param error Der zu protokollierende Fehler
   */
  public logError(error: InsightError): void {
    this.errorLog.push(error);
    
    // Log-Größe begrenzen
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
    
    // Konsolenausgabe für Debugging
    console.error(error.toString());
  }
  
  /**
   * Gibt die letzten N protokollierten Fehler zurück
   * @param count Anzahl der zurückzugebenden Fehler
   */
  public getRecentErrors(count: number = 10): InsightError[] {
    return this.errorLog.slice(-Math.min(count, this.errorLog.length));
  }
  
  /**
   * Registriert einen Listener für einen bestimmten Fehlertyp
   * @param errorType Fehlertyp, auf den gehört werden soll
   * @param listener Callback-Funktion, die bei Fehlern aufgerufen wird
   */
  public addEventListener(errorType: ErrorType | 'ALL', listener: (error: InsightError) => void): void {
    const typeKey = errorType.toString();
    
    if (!this.errorListeners.has(typeKey)) {
      this.errorListeners.set(typeKey, []);
    }
    
    this.errorListeners.get(typeKey)!.push(listener);
  }
  
  /**
   * Entfernt einen Listener
   * @param errorType Fehlertyp des zu entfernenden Listeners
   * @param listener Der zu entfernende Listener
   */
  public removeEventListener(errorType: ErrorType | 'ALL', listener: (error: InsightError) => void): void {
    const typeKey = errorType.toString();
    
    if (this.errorListeners.has(typeKey)) {
      const listeners = this.errorListeners.get(typeKey)!;
      const index = listeners.indexOf(listener);
      
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * Führt einen Aufruf mit Retry-Logik aus
   * @param fn Die auszuführende Funktion
   * @param options Retry-Optionen
   */
  public async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const retryTypes = options.retryOnErrorTypes ?? [
      ErrorType.NETWORK, 
      ErrorType.TIMEOUT, 
      ErrorType.API
    ];
    let lastError: InsightError | null = null;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const insightError = this.handleError(
          error instanceof Error ? error : new Error(String(error))
        );
        lastError = insightError;
        
        // Prüfe, ob der Fehler erneut versucht werden sollte
        const shouldRetry = (
          attempt <= maxRetries && 
          (insightError.retryable || retryTypes.includes(insightError.type))
        );
        
        if (!shouldRetry) {
          break;
        }
        
        // Warte basierend auf der Retry-Strategie
        const waitTime = this.getRetryDelay(insightError.type, attempt);
        console.log(`Retrying after error: ${insightError.message}. Attempt ${attempt}/${maxRetries}, waiting ${waitTime}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError || new InsightError('Unknown error during retry');
  }
  
  /**
   * Setzt eine spezifische Retry-Strategie für einen Fehlertyp
   * @param errorType Fehlertyp
   * @param strategy Retry-Strategie
   */
  public setRetryStrategy(errorType: ErrorType, strategy: RetryStrategy): void {
    this.retryStrategies.set(errorType, strategy);
  }
  
  /**
   * Initialisiert die Standard-Retry-Strategien
   */
  private initDefaultRetryStrategies(): void {
    // Exponential Backoff für Netzwerkfehler
    this.retryStrategies.set(ErrorType.NETWORK, {
      type: 'exponential',
      baseDelay: 1000,
      maxDelay: 30000
    });
    
    // Konstante Wartezeit für Timeout-Fehler
    this.retryStrategies.set(ErrorType.TIMEOUT, {
      type: 'linear',
      baseDelay: 2000,
      increment: 2000
    });
    
    // Jittered Backoff für API-Fehler
    this.retryStrategies.set(ErrorType.API, {
      type: 'jittered',
      baseDelay: 1000,
      maxDelay: 10000
    });
    
    // Standard-Strategie für andere Fehlertypen
    this.retryStrategies.set(ErrorType.UNKNOWN, {
      type: 'fixed',
      delay: 3000
    });
  }
  
  /**
   * Berechnet die Wartezeit für einen Retry basierend auf der Strategie
   * @param errorType Fehlertyp
   * @param attempt Aktuelle Versuchsnummer
   */
  private getRetryDelay(errorType: ErrorType, attempt: number): number {
    const strategy = this.retryStrategies.get(errorType) || this.retryStrategies.get(ErrorType.UNKNOWN);
    
    if (!strategy) {
      return 1000; // Standardverzögerung, falls keine Strategie gefunden wird
    }
    
    switch (strategy.type) {
      case 'fixed':
        return strategy.delay;
        
      case 'linear':
        return strategy.baseDelay + (attempt - 1) * strategy.increment;
        
      case 'exponential':
        const delay = strategy.baseDelay * Math.pow(2, attempt - 1);
        return Math.min(delay, strategy.maxDelay);
        
      case 'jittered':
        const expDelay = strategy.baseDelay * Math.pow(2, attempt - 1);
        const capDelay = Math.min(expDelay, strategy.maxDelay);
        // Zufällige Verzögerung zwischen 50% und 100% des berechneten Werts
        return Math.floor(capDelay * 0.5 + Math.random() * capDelay * 0.5);
        
      default:
        return 1000;
    }
  }
  
  /**
   * Benachrichtigt alle Listener über einen neuen Fehler
   * @param error Der aufgetretene Fehler
   */
  private notifyListeners(error: InsightError): void {
    // Spezifische Listener benachrichtigen
    const typeListeners = this.errorListeners.get(error.type.toString());
    if (typeListeners) {
      typeListeners.forEach(listener => listener(error));
    }
    
    // Allgemeine Listener benachrichtigen
    const allListeners = this.errorListeners.get('ALL');
    if (allListeners) {
      allListeners.forEach(listener => listener(error));
    }
  }
}

// Typdefinitionen für Retry-Mechanismen
type RetryOptions = {
  maxRetries?: number;
  retryOnErrorTypes?: ErrorType[];
};

type FixedRetryStrategy = {
  type: 'fixed';
  delay: number;
};

type LinearRetryStrategy = {
  type: 'linear';
  baseDelay: number;
  increment: number;
};

type ExponentialRetryStrategy = {
  type: 'exponential';
  baseDelay: number;
  maxDelay: number;
};

type JitteredRetryStrategy = {
  type: 'jittered';
  baseDelay: number;
  maxDelay: number;
};

type RetryStrategy = 
  | FixedRetryStrategy
  | LinearRetryStrategy
  | ExponentialRetryStrategy
  | JitteredRetryStrategy; 