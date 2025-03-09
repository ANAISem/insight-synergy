/**
 * Universal API Client für alle Insight Synergy Services
 * 
 * Bietet einheitliche Fehlerbehandlung, Authentifizierung und Logging
 * für alle API-Anfragen.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { toast } from '@/components/ui/use-toast';

// Typen für die Fehlerhandhabung
export interface ApiError {
  message: string;
  status: number;
  endpoint: string;
  details?: any;
  timestamp: string;
}

// Authentifizierungsspeicher
type TokenStore = {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
};

class ApiClientManager {
  private axiosInstance: AxiosInstance;
  private tokenStore: TokenStore = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  };
  private refreshingPromise: Promise<string> | null = null;
  
  constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000, // 30 Sekunden Timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    // Lade Token aus dem localStorage, falls vorhanden
    this.loadTokens();
    
    // Request Interceptor für Token-Injektion
    this.axiosInstance.interceptors.request.use(
      (config) => this.addAuthorizationHeader(config),
      (error) => Promise.reject(error)
    );
    
    // Response Interceptor für Fehlerbehandlung
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => this.handleApiError(error)
    );
  }
  
  /**
   * Fügt Authorization-Header zu Anfragen hinzu
   */
  private async addAuthorizationHeader(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    // Überprüfe, ob ein Token lädt oder aktualisiert werden muss
    if (this.refreshingPromise) {
      try {
        await this.refreshingPromise;
      } catch (error) {
        console.error('Token Refresh fehlgeschlagen:', error);
      }
    } else if (this.shouldRefreshToken()) {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        console.error('Token Refresh fehlgeschlagen:', error);
      }
    }
    
    // Setze den Authorization-Header, falls ein Token verfügbar ist
    if (this.tokenStore.accessToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${this.tokenStore.accessToken}`;
    }
    
    return config;
  }
  
  /**
   * Prüft, ob das Token aktualisiert werden sollte
   */
  private shouldRefreshToken(): boolean {
    if (!this.tokenStore.accessToken || !this.tokenStore.expiresAt) {
      return false;
    }
    
    // Token aktualisieren, wenn die Ablaufzeit weniger als 5 Minuten in der Zukunft liegt
    const fiveMinutesInMs = 5 * 60 * 1000;
    return this.tokenStore.expiresAt - Date.now() < fiveMinutesInMs;
  }
  
  /**
   * Aktualisiert das Access-Token mit dem Refresh-Token
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.tokenStore.refreshToken) {
      throw new Error('Kein Refresh-Token verfügbar');
    }
    
    if (!this.refreshingPromise) {
      this.refreshingPromise = new Promise<string>(async (resolve, reject) => {
        try {
          // Direkter Axios-Aufruf ohne Interceptors, um Loops zu vermeiden
          const response = await axios.post(`${this.axiosInstance.defaults.baseURL}/auth/refresh-token`, {
            refreshToken: this.tokenStore.refreshToken
          });
          
          const { accessToken, refreshToken, expiresIn } = response.data;
          
          this.tokenStore = {
            accessToken,
            refreshToken,
            expiresAt: Date.now() + expiresIn * 1000
          };
          
          this.saveTokens();
          resolve(accessToken);
        } catch (error) {
          this.clearTokens();
          reject(error);
        } finally {
          this.refreshingPromise = null;
        }
      });
    }
    
    return this.refreshingPromise;
  }
  
  /**
   * Behandelt API-Fehler einheitlich
   */
  private async handleApiError(error: AxiosError): Promise<any> {
    if (!error.response) {
      // Netzwerkfehler
      const apiError: ApiError = {
        message: 'Netzwerkfehler: Überprüfe deine Internetverbindung',
        status: 0,
        endpoint: error.config?.url || 'unknown',
        timestamp: new Date().toISOString()
      };
      
      this.logError(apiError);
      return Promise.reject(apiError);
    }
    
    const { status, data, config } = error.response;
    
    // Erstelle ein standardisiertes Fehlerobjekt
    const apiError: ApiError = {
      message: data?.message || 'Ein Fehler ist aufgetreten',
      status,
      endpoint: config.url || 'unknown',
      details: data,
      timestamp: new Date().toISOString()
    };
    
    // Behandle Authentifizierungsfehler
    if (status === 401) {
      // Wenn der Fehler nicht beim Token-Refresh aufgetreten ist
      if (!config.url?.includes('/auth/refresh-token')) {
        // Versuche Token zu aktualisieren
        try {
          await this.refreshAccessToken();
          // Wiederhole die ursprüngliche Anfrage
          const newConfig = { ...config };
          return this.axiosInstance(newConfig);
        } catch (refreshError) {
          // Wenn Token-Refresh fehlschlägt, Benutzer ausloggen
          this.clearTokens();
          this.redirectToLogin();
        }
      } else {
        // Fehler beim Token-Refresh, Benutzer ausloggen
        this.clearTokens();
        this.redirectToLogin();
      }
    }
    
    // Behandle weitere spezifische Fehlercodes
    if (status === 403) {
      apiError.message = 'Zugriff verweigert: Keine Berechtigung für diese Aktion';
      toast({
        variant: "destructive",
        title: "Zugriff verweigert",
        description: apiError.message,
      });
    } else if (status === 404) {
      apiError.message = 'Ressource nicht gefunden';
    } else if (status === 429) {
      apiError.message = 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.';
      toast({
        variant: "destructive",
        title: "Anfragelimit überschritten",
        description: apiError.message,
      });
    } else if (status >= 500) {
      apiError.message = 'Ein Server-Fehler ist aufgetreten. Bitte versuche es später erneut.';
      toast({
        variant: "destructive",
        title: "Server-Fehler",
        description: apiError.message,
      });
    }
    
    this.logError(apiError);
    return Promise.reject(apiError);
  }
  
  /**
   * Loggt Fehler für Analyse und Debugging
   */
  private logError(error: ApiError): void {
    // In Produktion würde hier ein zentrales Logging-System verwendet
    console.error(`API-Fehler: [${error.status}] ${error.message} - ${error.endpoint}`);
    
    // Telemetrie für schwerwiegende Fehler
    if (error.status >= 500 || error.status === 0) {
      // Hier würde die Fehlertelemetrie implementiert, z.B. Sentry
      // sendErrorTelemetry(error);
    }
  }
  
  /**
   * Speichert Tokens im localStorage
   */
  private saveTokens(): void {
    try {
      localStorage.setItem('auth_tokens', JSON.stringify({
        accessToken: this.tokenStore.accessToken,
        refreshToken: this.tokenStore.refreshToken,
        expiresAt: this.tokenStore.expiresAt
      }));
    } catch (error) {
      console.error('Fehler beim Speichern der Tokens:', error);
    }
  }
  
  /**
   * Lädt Tokens aus dem localStorage
   */
  private loadTokens(): void {
    try {
      const storedTokens = localStorage.getItem('auth_tokens');
      if (storedTokens) {
        this.tokenStore = JSON.parse(storedTokens);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Tokens:', error);
      this.clearTokens();
    }
  }
  
  /**
   * Löscht alle Tokens
   */
  private clearTokens(): void {
    this.tokenStore = {
      accessToken: null,
      refreshToken: null,
      expiresAt: null
    };
    
    try {
      localStorage.removeItem('auth_tokens');
    } catch (error) {
      console.error('Fehler beim Löschen der Tokens:', error);
    }
  }
  
  /**
   * Leitet zur Login-Seite weiter
   */
  private redirectToLogin(): void {
    // Redirect zur Login-Seite, falls wir nicht bereits dort sind
    if (window.location.pathname !== '/login') {
      window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
    }
  }
  
  /**
   * Speichert Authentifizierungsdaten nach erfolgreicher Anmeldung
   */
  public setAuthentication(accessToken: string, refreshToken: string, expiresIn: number): void {
    this.tokenStore = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000
    };
    
    this.saveTokens();
  }
  
  /**
   * Loggt den Benutzer aus
   */
  public logout(): void {
    this.clearTokens();
    window.location.href = '/login';
  }
  
  /**
   * Prüft, ob der Benutzer angemeldet ist
   */
  public isAuthenticated(): boolean {
    return !!this.tokenStore.accessToken && 
           !!this.tokenStore.expiresAt && 
           this.tokenStore.expiresAt > Date.now();
  }
  
  /**
   * Führt eine generische API-Anfrage durch
   */
  public async request<T>(method: string, endpoint: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance({
        method,
        url: endpoint,
        data
      });
      
      return response.data;
    } catch (error) {
      // Der Error wurde bereits durch den Interceptor behandelt
      throw error;
    }
  }
  
  /**
   * GET-Anfrage
   */
  public async get<T>(endpoint: string, params?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * POST-Anfrage
   */
  public async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.post(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * PUT-Anfrage
   */
  public async put<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.put(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * DELETE-Anfrage
   */
  public async delete<T>(endpoint: string): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.delete(endpoint);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

// API-Client-Instanzen für verschiedene Services
export const coreApiClient = new ApiClientManager(
  process.env.NEXT_PUBLIC_INSIGHT_CORE_API_URL || '/api/insight-core'
);

export const nexusApiClient = new ApiClientManager(
  process.env.NEXT_PUBLIC_NEXUS_API_URL || '/api/nexus'
);

export const cognitiveApiClient = new ApiClientManager(
  process.env.NEXT_PUBLIC_COGNITIVE_API_URL || '/api/cognitive'
);

// Auth API-Client ohne Token-Verwaltung
export const authApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AUTH_API_URL || '/api/auth',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}); 