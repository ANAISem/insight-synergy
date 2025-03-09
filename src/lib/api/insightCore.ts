/**
 * Insight Core API Client
 * 
 * Stellt eine vollständige Client-Bibliothek für die Kommunikation mit der Insight Core API bereit.
 * Unterstützt Lösungsgenerierung, Faktenrecherche, Credits-Tracking und mehr.
 */

import { insightCoreApiWrapper } from './apiWrapper';

// API-Fehlerklasse
export class InsightCoreApiError extends Error {
  status: number;
  endpoint: string;
  
  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = 'InsightCoreApiError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

// Typdefinitionen
export interface SolutionRequest {
  prompt: string;
  context?: string;
  factCheck?: boolean;
  modelName?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface SolutionResponse {
  solution: string;
  factChecked: boolean;
  sources?: {
    title: string;
    url: string;
    snippet: string;
  }[];
  creditsUsed: number;
  modelUsed: string;
  processingTime: number;
  createdAt: string;
}

export interface FactCheckRequest {
  statements: string[];
  context?: string;
  deepSearch?: boolean;
}

export interface FactCheckResponse {
  results: {
    statement: string;
    verified: boolean;
    confidence: number;
    sources?: {
      title: string;
      url: string;
      snippet: string;
    }[];
  }[];
  creditsUsed: number;
  processingTime: number;
}

export interface UserCredits {
  available: number;
  used: {
    total: number;
    thisMonth: number;
    thisWeek: number;
    today: number;
  };
  subscription: {
    plan: string;
    renewalDate?: string;
    freeCreditsPerDay: number;
  };
  transactions: {
    id: string;
    amount: number;
    type: 'usage' | 'purchase' | 'refund' | 'bonus';
    description: string;
    timestamp: string;
  }[];
}

export interface ApiStatus {
  status: 'online' | 'degraded' | 'offline';
  message?: string;
  latency: number;
  models: {
    name: string;
    available: boolean;
  }[];
  factCheckService: {
    status: 'online' | 'degraded' | 'offline';
    latency: number;
  };
}

// Insight Core API Client
export class InsightCoreApi {
  /**
   * Generiert eine Lösung basierend auf dem Prompt und optionalem Kontext
   */
  async generateSolution(request: SolutionRequest): Promise<SolutionResponse> {
    return insightCoreApiWrapper.post<SolutionResponse>('/solutions', request);
  }
  
  /**
   * Überprüft Aussagen auf ihre faktische Richtigkeit
   */
  async factCheck(request: FactCheckRequest): Promise<FactCheckResponse> {
    return insightCoreApiWrapper.post<FactCheckResponse>('/fact-check', request);
  }
  
  /**
   * Ruft den aktuellen Credits-Stand des Nutzers ab
   */
  async getUserCredits(): Promise<UserCredits> {
    return insightCoreApiWrapper.get<UserCredits>('/credits', undefined, true);
  }
  
  /**
   * Ruft den Status der API ab
   */
  async getApiStatus(): Promise<ApiStatus> {
    return insightCoreApiWrapper.get<ApiStatus>('/status');
  }
  
  /**
   * Ruft eine Liste der verfügbaren Modelle ab
   */
  async getAvailableModels(): Promise<{ name: string; description: string; maxTokens: number; costPerRequest: number }[]> {
    return insightCoreApiWrapper.get<any>('/models', undefined, true);
  }
  
  /**
   * Kauft Credits für den Nutzer
   */
  async purchaseCredits(amount: number): Promise<{ success: boolean; transaction: any }> {
    return insightCoreApiWrapper.post<any>('/credits/purchase', { amount }, /^GET:\/credits/);
  }
  
  /**
   * Ruft die Nutzungsstatistiken des Nutzers ab
   */
  async getUserStats(): Promise<any> {
    return insightCoreApiWrapper.get<any>('/user/stats', undefined, true);
  }
  
  /**
   * Ruft die Geschichte der vom Nutzer generierten Lösungen ab
   */
  async getSolutionHistory(page: number = 1, limit: number = 10): Promise<any> {
    return insightCoreApiWrapper.get<any>(`/solutions/history`, { page, limit }, true);
  }
  
  /**
   * Exportiert eine Lösung als PDF
   */
  async exportSolutionAsPdf(solutionId: string): Promise<Blob> {
    return insightCoreApiWrapper.downloadFile(`/solutions/${solutionId}/export`, { format: 'pdf' });
  }
  
  /**
   * Speichert eine Lösung in der Sammlung des Nutzers
   */
  async saveSolution(solutionId: string, collectionName?: string): Promise<any> {
    return insightCoreApiWrapper.post<any>(`/solutions/${solutionId}/save`, { collectionName });
  }
  
  /**
   * Bewertet eine Lösung
   */
  async rateSolution(solutionId: string, rating: number, feedback?: string): Promise<any> {
    return insightCoreApiWrapper.post<any>(`/solutions/${solutionId}/rate`, { rating, feedback });
  }
  
  /**
   * Ruft Sammlungen des Nutzers ab
   */
  async getUserCollections(): Promise<any> {
    return insightCoreApiWrapper.get<any>('/user/collections', undefined, true);
  }
  
  /**
   * Lädt eine Datei für die Kontextanalyse hoch
   */
  async uploadContextFile(file: File, description?: string): Promise<any> {
    return insightCoreApiWrapper.uploadFile<any>('/context/upload', file, { description });
  }
}

// Singleton-Instanz exportieren
export const insightCoreApi = new InsightCoreApi();

export default insightCoreApi; 