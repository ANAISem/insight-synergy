/**
 * API-Client für Insight Core
 * 
 * Bietet Methoden für die Kommunikation mit der Insight Core API
 * Unterstützt Authentifizierung, Fehlerbehandlung und Ratelimiting
 */

import { createBrowserClient } from '../supabase/client';

// Typen für API-Anfragen
export type NexusRequest = {
  query: string;
  context?: string;
  goals?: string[];
  max_tokens?: number;
};

export type NexusResponse = {
  solution: string;
  steps: string[];
  references?: string[];
  model: string;
  model_used: string;
  token_count?: number;
  processing_time?: number;
  facts_found?: boolean;
};

export type ApiStatus = {
  status: string;
  timestamp: string;
  version: string;
  perplexity_available: boolean;
  primary_model_available: boolean;
  fallback_model_available: boolean;
  is_core_available: boolean;
  models: {
    primary: string;
    fallback: string;
    is_core: string | null;
  };
};

/**
 * Insight Core API-Client
 */
export class InsightCoreApiClient {
  private readonly baseUrl: string;
  
  constructor() {
    // API-URL aus Umgebungsvariablen oder Standard-URL
    this.baseUrl = process.env.NEXT_PUBLIC_INSIGHT_CORE_API_URL || '/api/insight-core';
  }
  
  /**
   * Hilfsmethode für authentifizierte API-Aufrufe
   */
  private async callApi<T>(
    endpoint: string, 
    method: 'GET' | 'POST' = 'POST', 
    data?: any
  ): Promise<T> {
    try {
      const supabase = createBrowserClient();
      
      // Session für Auth-Token holen
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && endpoint !== 'status') {
        throw new Error('Nicht authentifiziert');
      }
      
      // API-Anfrage vorbereiten
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Auth-Token hinzufügen, wenn verfügbar
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      // Anfrage senden
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(data) : undefined,
      });
      
      // Bei Fehlern
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || 
          `API-Anfrage fehlgeschlagen: ${response.status} ${response.statusText}`
        );
      }
      
      // Erfolgreiche Antwort
      return await response.json() as T;
    } catch (error) {
      console.error(`Fehler bei API-Aufruf zu ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Generiert eine Lösung für ein Problem
   */
  async generateSolution(request: NexusRequest): Promise<NexusResponse> {
    return this.callApi<NexusResponse>('solutions', 'POST', request);
  }
  
  /**
   * Analysiert ein Problem
   */
  async analyzeProblem(request: NexusRequest): Promise<NexusResponse> {
    return this.callApi<NexusResponse>('analysis', 'POST', request);
  }
  
  /**
   * Speichert eine Benutzersitzung in der Datenbank
   */
  async saveSession(session: {
    title: string;
    content: Record<string, any>;
    model_used?: string;
    tokens_used?: number;
  }): Promise<{ id: string }> {
    return this.callApi<{ id: string }>('sessions', 'POST', session);
  }
  
  /**
   * Ruft den API-Status ab
   */
  async getApiStatus(): Promise<ApiStatus> {
    return this.callApi<ApiStatus>('status', 'GET');
  }
}

// Singleton-Instanz des API-Clients
export const insightCoreApi = new InsightCoreApiClient(); 