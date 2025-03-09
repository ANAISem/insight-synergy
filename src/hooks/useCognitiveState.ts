import { useState, useEffect } from 'react';

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
  analyzePatterns: (text: string) => PatternResult[];
  optimizeResponse: (text: string, context?: string) => string;
  getInsights: (context?: string) => string;
  recordUserFeedback: (feedback: string, rating: number) => void;
  isConnected: boolean;
}

/**
 * Hook für die Verbindung zum kognitiven Backend
 */
export const useCognitiveState = (): CognitiveStateReturn => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>(DEFAULT_METRICS);
  const [isConnected, setIsConnected] = useState(false);
  
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

  // Initialisierung und Verbindung zum Backend
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/status`);
        if (response.ok) {
          setIsConnected(true);
          console.log('Erfolgreich mit dem Backend verbunden');
          
          // Metriken abrufen, wenn die Verbindung hergestellt ist
          try {
            const metricsResponse = await fetch(`${BACKEND_URL}/api/metrics`);
            if (metricsResponse.ok) {
              const metrics = await metricsResponse.json();
              setPerformanceMetrics(metrics.performance || DEFAULT_METRICS);
            }
          } catch (err) {
            console.warn('Fehler beim Abrufen der Metriken:', err);
            // Standard-Metriken beibehalten
          }
        }
      } catch (err) {
        console.warn('Verbindung zum Backend nicht möglich:', err);
        setIsConnected(false);
      }
    };
    
    checkConnection();
    
    // Periodische Überprüfung der Verbindung alle 30 Sekunden
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, [BACKEND_URL]);

  // Funktion zur Musteranalyse
  const analyzePatterns = (text: string): PatternResult[] => {
    if (!text || text.length < 5) return [];
    
    // Mock-Implementierung - würde in einer tatsächlichen Anwendung mit dem Backend kommunizieren
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
  const optimizeResponse = (text: string, context?: string): string => {
    // In einer tatsächlichen Anwendung würde dies mit dem Backend kommunizieren
    if (context && context.length > 0) {
      return `Optimiert mit Kontext: ${text}`;
    }
    return `Optimiert: ${text}`;
  };

  // Funktion zum Abrufen von Insights
  const getInsights = (context?: string): string => {
    // In einer tatsächlichen Anwendung würde dies mit dem Backend kommunizieren
    return 'Basierend auf Ihren Interaktionsmustern empfehlen wir, mehr strukturierte Prozesse zu implementieren und Datenanalysen zu nutzen.';
  };

  // Funktion zur Aufzeichnung von Benutzerfeedback
  const recordUserFeedback = (feedback: string, rating: number): void => {
    // In einer tatsächlichen Anwendung würde dies mit dem Backend kommunizieren
    console.log('Feedback aufgezeichnet:', { feedback, rating });
  };

  return {
    performanceMetrics,
    analyzePatterns,
    optimizeResponse,
    getInsights,
    recordUserFeedback,
    isConnected
  };
}; 