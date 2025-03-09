import { useState, useEffect, useCallback } from 'react';

// Standard-Performance-Metriken
const DEFAULT_METRICS = {
  adaptationRate: 0.75,
  patternRecognitionAccuracy: 0.82,
  optimizationEfficiency: 0.68,
  learningProgress: 0.79
};

// Typdefinitionen
export interface PerformanceMetrics {
  adaptationRate: number;
  patternRecognitionAccuracy: number;
  optimizationEfficiency: number;
  learningProgress: number;
}

export interface PatternResult {
  id: string;
  name: string;
  confidence: number;
  matches: string[];
  description: string;
}

interface CognitiveStateReturn {
  performanceMetrics: PerformanceMetrics;
  analyzePatterns: (text: string) => Promise<PatternResult[]>;
  optimizeResponse: (text: string) => Promise<string>;
  getInsights: (context?: string) => Promise<string>;
  recordUserFeedback: (feedback: string, rating: number) => Promise<boolean>;
  isConnected: boolean;
  connectionStatus: 'online' | 'offline' | 'connecting';
  lastError: string | null;
}

// Erweiterte Fetch-Funktion mit Retry-Mechanismus
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (response.ok) return response;
    
    if (retries > 0 && [408, 500, 502, 503, 504].includes(response.status)) {
      console.log(`Retry attempt for ${url}, ${retries} attempts left`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`Network error for ${url}, retrying... ${retries} attempts left`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

/**
 * Hook für die Verbindung zum kognitiven Backend
 */
export const useCognitiveState = (): CognitiveStateReturn => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>(DEFAULT_METRICS);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'connecting'>('connecting');
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Verwende REACT_APP_API_URL aus der Umgebung oder Fallback auf den neuen Port 8080
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
  
  console.log('API URL:', API_URL); // Debug-Ausgabe

  // Initialisierung und Verbindung zum Backend
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setConnectionStatus('connecting');
        console.log('Überprüfe Verbindung zu:', `${API_URL}/status`);
        
        // Nutze fetchWithRetry für die StatusAbfrage
        const response = await fetchWithRetry(`${API_URL}/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          // Ein kurzes Timeout für den Status-Check
          signal: AbortSignal.timeout(3000)
        }, 2, 500);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Backend-Status:', data);
          
          setIsConnected(true);
          setConnectionStatus('online');
          setLastError(null);
          console.log('Erfolgreich mit dem Backend verbunden');
          
          // Metriken aus der Antwort extrahieren falls vorhanden
          if (data.services && data.memory) {
            // Neue API-Format
            const memoryHealth = Math.min(1, data.memory.free / data.memory.total);
            const servicesOnline = Object.values(data.services).filter(s => s === 'online').length;
            const totalServices = Object.keys(data.services).length;
            const serviceHealth = servicesOnline / totalServices;
            
            // Wir berechnen synthetische Metriken basierend auf den verfügbaren Daten
            setPerformanceMetrics({
              adaptationRate: 0.85, // Standardwert
              patternRecognitionAccuracy: 0.8 * serviceHealth + 0.2,
              optimizationEfficiency: 0.7 * memoryHealth + 0.3,
              learningProgress: 0.75 * serviceHealth + 0.25 
            });
          }
          else if (data.cognitiveCore && data.cognitiveCore.metrics) {
            // Legacy API-Format
            const backendMetrics = data.cognitiveCore.metrics;
            
            // Konvertiere Metriken in das erwartete Format (0-1 Bereich)
            setPerformanceMetrics({
              adaptationRate: backendMetrics.adaptationRate / 100,
              patternRecognitionAccuracy: backendMetrics.performance / 100,
              optimizationEfficiency: backendMetrics.optimizationPotential / 100,
              learningProgress: backendMetrics.overallScore / 100
            });
          }
        } else {
          console.warn('Backend-Antwort nicht ok:', response.status);
          setIsConnected(false);
          setConnectionStatus('offline');
          setLastError(`Backend-Fehler: ${response.status} ${response.statusText}`);
        }
      } catch (err: any) {
        console.warn('Verbindung zum Backend nicht möglich:', err);
        setIsConnected(false);
        setConnectionStatus('offline');
        setLastError(`Verbindungsfehler: ${err.message || 'Unbekannter Fehler'}`);
      }
    };
    
    checkConnection();
    
    // Periodische Überprüfung der Verbindung alle 30 Sekunden
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, [API_URL]);

  // Funktion zur Musteranalyse
  const analyzePatterns = useCallback(async (text: string): Promise<PatternResult[]> => {
    if (!text || text.length < 5) return [];
    
    console.log('Analysiere Text:', text);
    
    // Offline-Fallback: Lokale Muster-Erkennung
    if (!isConnected) {
      console.log('Offline-Modus: Verwende lokale Musteranalyse');
      return [
        {
          id: 'offline-p1',
          name: 'Prozessorientiertes Denken',
          confidence: 0.87,
          matches: ['Prozess', 'Ablauf', 'Schritte'],
          description: 'Fokussiert auf sequentielle Abläufe und Prozessoptimierung (Offline-Modus)'
        },
        {
          id: 'offline-p2',
          name: 'Analytischer Ansatz',
          confidence: 0.92,
          matches: ['Analyse', 'untersuchen', 'Daten'],
          description: 'Systematische Untersuchung von Daten und Fakten (Offline-Modus)'
        }
      ];
    }
    
    try {
      // Echte API-Kommunikation
      const response = await fetchWithRetry(`${API_URL}/patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(10000)
      }, 2, 1000);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.result && data.result.patterns) {
          // Konvertiere API-Antwort ins benötigte Format
          return data.result.patterns.map((p: any) => ({
            id: p.id,
            name: p.name,
            confidence: p.confidence,
            matches: p.matches || [],
            description: p.description
          }));
        }
      }
      
      // Wenn die API-Antwort nicht das erwartete Format hat, nutze Fallback
      console.warn('Unerwartetes Format der API-Antwort, nutze Fallback');
      setLastError('API-Antwort hat nicht das erwartete Format');
      return getOfflinePatterns(text);
      
    } catch (err: any) {
      console.error('Fehler bei der Musteranalyse:', err);
      setLastError(`Fehler bei der Musteranalyse: ${err.message || 'Unbekannter Fehler'}`);
      return getOfflinePatterns(text);
    }
  }, [API_URL, isConnected]);

  // Fallback-Funktionen für den Offline-Modus
  const getOfflinePatterns = (text: string): PatternResult[] => {
    const mockPatterns: PatternResult[] = [
      {
        id: 'p1',
        name: 'Prozessorientiertes Denken',
        confidence: 0.87,
        matches: ['Prozess', 'Ablauf', 'Schritte'],
        description: 'Fokussiert auf sequentielle Abläufe und Prozessoptimierung'
      },
      {
        id: 'p2',
        name: 'Analytischer Ansatz',
        confidence: 0.92,
        matches: ['Analyse', 'untersuchen', 'Daten'],
        description: 'Systematische Untersuchung von Daten und Fakten'
      }
    ];
    
    return mockPatterns;
  };

  // Funktion zur Optimierung von Antworten
  const optimizeResponse = useCallback(async (text: string): Promise<string> => {
    if (!isConnected) {
      console.warn('Keine Verbindung zum Backend, verwende lokale Optimierung');
      return `Lokale Optimierung (Offline-Modus): ${text}`;
    }
    
    try {
      console.log('Optimierung angefordert für:', text);
      const response = await fetchWithRetry(`${API_URL}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ queryText: text }),
        signal: AbortSignal.timeout(20000)
      }, 3, 1000);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Optimierung erhalten:', data);
        
        if (data.success && data.result && data.result.optimizedCode) {
          setLastError(null);
          return data.result.optimizedCode;
        }
        
        setLastError('Unerwartetes Format der API-Antwort');
        return `Optimierung ohne Code: ${text}`;
      } else {
        const errorText = `Fehler bei der Optimierung: HTTP ${response.status}`;
        console.warn(errorText);
        setLastError(errorText);
        return `Fehler bei der Optimierung (${response.status}): ${text}`;
      }
    } catch (err: any) {
      const errorText = `API-Fehler: ${err.message || 'Unbekannter Fehler'}`;
      console.error('Fehler beim API-Aufruf für Optimierung:', err);
      setLastError(errorText);
      return `API-Fehler bei Optimierung: ${text}`;
    }
  }, [API_URL, isConnected]);

  // Funktion zum Abrufen von Insights
  const getInsights = useCallback(async (context?: string): Promise<string> => {
    // In dieser vereinfachten Version geben wir einen statischen Text zurück
    if (!isConnected) {
      return 'Offline-Modus: Insights sind im Offline-Modus nicht verfügbar.';
    }
    
    return 'Basierend auf Ihren Interaktionsmustern empfehlen wir, mehr strukturierte Prozesse zu implementieren und Datenanalysen zu nutzen.';
  }, [isConnected]);

  // Funktion zur Aufzeichnung von Benutzerfeedback
  const recordUserFeedback = useCallback(async (feedback: string, rating: number): Promise<boolean> => {
    // In dieser vereinfachten Version loggen wir nur das Feedback
    console.log('Feedback aufgezeichnet:', { feedback, rating });
    return true;
  }, []);

  return {
    performanceMetrics,
    analyzePatterns,
    optimizeResponse,
    getInsights,
    recordUserFeedback,
    isConnected,
    connectionStatus,
    lastError
  };
}; 