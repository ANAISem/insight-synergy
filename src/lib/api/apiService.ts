/**
 * API Service für Insight Synergy
 * 
 * Zentraler Service für alle API-Aufrufe mit Fehlerbehandlung, Caching und Retry-Logik.
 * Dient als Abstraktionsschicht zwischen Frontend-Komponenten und Backend-APIs.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { insightCoreApi } from './insightCore';
import { nexusApi } from './nexusAPI'; // Wird erstellt, wenn vorhanden

// Cache für API-Antworten
interface CacheEntry {
  data: any;
  expiry: number;
}

class ApiService {
  private axiosInstance: AxiosInstance;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTime = 5 * 60 * 1000; // 5 Minuten Standard-Cache-Zeit

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000, // 30 Sekunden Timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request Interceptor für Authentifizierung
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Token aus dem Session-Storage oder ähnlichem holen
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor für globale Fehlerbehandlung
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // Fehlerbehandlung basierend auf Status-Code
        if (error.response) {
          const { status } = error.response;
          
          // 401 Unauthorized: Token ist ungültig oder abgelaufen
          if (status === 401) {
            // Authentifizierung zurücksetzen und zur Login-Seite weiterleiten
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
          }
          
          // 403 Forbidden: Keine Berechtigungen
          if (status === 403) {
            console.error('Keine Berechtigung für diese Anfrage');
          }
          
          // 429 Too Many Requests: Rate Limiting
          if (status === 429) {
            console.error('Rate Limit erreicht. Bitte warten Sie einen Moment.');
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Führt eine GET-Anfrage durch mit optionalem Caching
   */
  async get<T>(url: string, config?: AxiosRequestConfig, useCache = true, cacheDuration?: number): Promise<T> {
    const cacheKey = `GET:${url}:${JSON.stringify(config)}`;
    
    // Prüfen, ob gecachte Daten vorhanden sind
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        console.log('Verwende gecachte Daten für:', url);
        return cached.data as T;
      }
    }
    
    // Anfrage ausführen
    try {
      const response = await this.axiosInstance.get<T>(url, config);
      
      // Daten cachen, wenn Caching aktiviert ist
      if (useCache) {
        this.cache.set(cacheKey, {
          data: response.data,
          expiry: Date.now() + (cacheDuration || this.cacheTime)
        });
      }
      
      return response.data;
    } catch (error) {
      this.handleError(error, url);
      throw error;
    }
  }

  /**
   * Führt eine POST-Anfrage durch
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error, url);
      throw error;
    }
  }

  /**
   * Führt eine PUT-Anfrage durch
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error, url);
      throw error;
    }
  }

  /**
   * Führt eine PATCH-Anfrage durch
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.patch<T>(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error, url);
      throw error;
    }
  }

  /**
   * Führt eine DELETE-Anfrage durch
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<T>(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error, url);
      throw error;
    }
  }

  /**
   * Führt eine Anfrage mit automatischem Retry bei Fehlern durch
   */
  async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries = 3,
    retryDelay = 1000,
    retryOn = [408, 429, 500, 502, 503, 504]
  ): Promise<T> {
    let retries = 0;
    
    const executeRequest = async (): Promise<T> => {
      try {
        return await requestFn();
      } catch (error) {
        if (axios.isAxiosError(error) && 
            error.response && 
            retryOn.includes(error.response.status) && 
            retries < maxRetries) {
          
          retries++;
          const delay = retryDelay * Math.pow(2, retries - 1); // Exponentielles Backoff
          console.log(`Wiederholungsversuch ${retries}/${maxRetries} nach ${delay}ms`);
          
          return new Promise<T>((resolve) => {
            setTimeout(() => resolve(executeRequest()), delay);
          });
        }
        
        throw error;
      }
    };
    
    return executeRequest();
  }

  /**
   * Leert den Cache vollständig oder für eine bestimmte URL
   */
  clearCache(url?: string): void {
    if (url) {
      // Lösche alle Einträge für diese URL, unabhängig von der Konfiguration
      for (const key of this.cache.keys()) {
        if (key.includes(`GET:${url}`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Kompletten Cache leeren
      this.cache.clear();
    }
  }

  /**
   * Zentrale Fehlerbehandlung für API-Anfragen
   */
  private handleError(error: any, url: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Netzwerkfehler (keine Verbindung zum Server)
      if (!axiosError.response) {
        console.error(`Netzwerkfehler bei Anfrage an ${url}: Server nicht erreichbar`);
        return;
      }
      
      // Server-Fehler mit Response
      console.error(`API-Fehler bei ${url}:`, {
        status: axiosError.response.status,
        statusText: axiosError.response.statusText,
        data: axiosError.response.data
      });
    } else {
      // Andere Fehler
      console.error(`Unbekannter Fehler bei API-Anfrage an ${url}:`, error);
    }
  }

  /**
   * Integriere Insight Core API-Aufrufe
   */
  insightCore = insightCoreApi;

  /**
   * Integriere Nexus API-Aufrufe, wenn verfügbar
   */
  nexus = nexusApi;
}

// Exportiere eine Singleton-Instanz
export const apiService = new ApiService();
export default apiService; 