/**
 * API Wrapper für Insight Synergy
 * 
 * Diese Klasse vereinheitlicht die Kommunikation zwischen Frontend und Backend und bietet
 * standardisierte Fehlerbehandlung, Caching und Authentifizierung.
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { InsightCoreApiError } from './insightCore';

// Cache-Storage
interface CacheEntry {
  data: any;
  expiry: number;
}

class ApiCache {
  private cache: Record<string, CacheEntry> = {};
  private defaultTtl: number = 5 * 60 * 1000; // 5 Minuten in Millisekunden
  
  set(key: string, data: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTtl);
    this.cache[key] = { data, expiry };
  }
  
  get(key: string): any | null {
    const entry = this.cache[key];
    if (!entry) return null;
    
    if (entry.expiry < Date.now()) {
      delete this.cache[key];
      return null;
    }
    
    return entry.data;
  }
  
  invalidate(keyPattern?: RegExp): void {
    if (!keyPattern) {
      this.cache = {};
      return;
    }
    
    Object.keys(this.cache).forEach(key => {
      if (keyPattern.test(key)) {
        delete this.cache[key];
      }
    });
  }
}

export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  withCredentials?: boolean;
  defaultHeaders?: Record<string, string>;
  cacheTtl?: number;
  retryCount?: number;
}

export class ApiWrapper {
  private axios = axios.create();
  private cache = new ApiCache();
  private config: ApiConfig;
  
  constructor(config: ApiConfig) {
    this.config = {
      timeout: 30000, // 30 Sekunden
      withCredentials: true,
      retryCount: 1,
      ...config
    };
    
    this.setupAxios();
  }
  
  private setupAxios(): void {
    this.axios.defaults.baseURL = this.config.baseUrl;
    this.axios.defaults.timeout = this.config.timeout;
    this.axios.defaults.withCredentials = this.config.withCredentials;
    
    if (this.config.defaultHeaders) {
      Object.entries(this.config.defaultHeaders).forEach(([key, value]) => {
        this.axios.defaults.headers.common[key] = value;
      });
    }
    
    // Request-Interceptor für Token-Handling
    this.axios.interceptors.request.use(
      (config) => {
        // Hier könnte man z.B. einen Auth-Token aus dem localStorage holen
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response-Interceptor für einheitliche Fehlerbehandlung
    this.axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        
        // Bei 401 (Unauthorized) könnte man z.B. einen Token-Refresh versuchen
        if (error.response?.status === 401 && !originalRequest._retry && this.config.retryCount) {
          originalRequest._retry = true;
          
          try {
            // Hier Token-Refresh-Logik einbauen
            const newToken = await this.refreshToken();
            if (newToken) {
              // Mit neuem Token erneut versuchen
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.axios(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token-Refresh fehlgeschlagen:', refreshError);
            // Ausloggen oder andere Fehlerbehandlung
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(this.normalizeError(error));
      }
    );
  }
  
  /**
   * Normalisiert Axios-Fehler in ein einheitliches Format
   */
  private normalizeError(error: AxiosError): InsightCoreApiError {
    const status = error.response?.status || 500;
    const endpoint = error.config?.url || 'unknown';
    const message = error.response?.data?.message || error.message || 'Unbekannter Fehler';
    
    return new InsightCoreApiError(message, status, endpoint);
  }
  
  /**
   * Erneuert den Auth-Token (Beispiel-Implementierung)
   */
  private async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return null;
      
      // Hier würde der tatsächliche API-Aufruf zum Token-Refresh stattfinden
      const response = await this.axios.post('/auth/refresh', { refreshToken });
      const newToken = response.data.token;
      
      if (newToken) {
        localStorage.setItem('auth_token', newToken);
        return newToken;
      }
      
      return null;
    } catch (error) {
      console.error('Token-Refresh fehlgeschlagen:', error);
      return null;
    }
  }
  
  /**
   * Generische GET-Anfrage mit Caching-Option
   */
  async get<T>(endpoint: string, params?: any, useCache: boolean = false): Promise<T> {
    const cacheKey = useCache ? `GET:${endpoint}:${JSON.stringify(params || {})}` : '';
    
    if (useCache) {
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) return cachedData;
    }
    
    try {
      const response = await this.axios.get<T>(endpoint, { params });
      
      if (useCache) {
        this.cache.set(cacheKey, response.data, this.config.cacheTtl);
      }
      
      return response.data;
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }
  
  /**
   * Generische POST-Anfrage
   */
  async post<T>(endpoint: string, data?: any, invalidateCache?: RegExp): Promise<T> {
    try {
      const response = await this.axios.post<T>(endpoint, data);
      
      // Invalidiere relevante Cache-Einträge, falls nötig
      if (invalidateCache) {
        this.cache.invalidate(invalidateCache);
      }
      
      return response.data;
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }
  
  /**
   * Generische PUT-Anfrage
   */
  async put<T>(endpoint: string, data?: any, invalidateCache?: RegExp): Promise<T> {
    try {
      const response = await this.axios.put<T>(endpoint, data);
      
      // Invalidiere relevante Cache-Einträge, falls nötig
      if (invalidateCache) {
        this.cache.invalidate(invalidateCache);
      }
      
      return response.data;
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }
  
  /**
   * Generische DELETE-Anfrage
   */
  async delete<T>(endpoint: string, params?: any, invalidateCache?: RegExp): Promise<T> {
    try {
      const response = await this.axios.delete<T>(endpoint, { params });
      
      // Invalidiere relevante Cache-Einträge, falls nötig
      if (invalidateCache) {
        this.cache.invalidate(invalidateCache);
      }
      
      return response.data;
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }
  
  /**
   * Generische PATCH-Anfrage
   */
  async patch<T>(endpoint: string, data?: any, invalidateCache?: RegExp): Promise<T> {
    try {
      const response = await this.axios.patch<T>(endpoint, data);
      
      // Invalidiere relevante Cache-Einträge, falls nötig
      if (invalidateCache) {
        this.cache.invalidate(invalidateCache);
      }
      
      return response.data;
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }
  
  /**
   * Standardisierte Fehlerbehandlung
   */
  private handleRequestError(error: any): InsightCoreApiError {
    if (axios.isAxiosError(error)) {
      return this.normalizeError(error);
    }
    
    return new InsightCoreApiError(
      error.message || 'Unbekannter Fehler',
      500,
      'unknown'
    );
  }
  
  /**
   * Sendet eine Datei an den Server
   */
  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
    }
    
    try {
      const response = await this.axios.post<T>(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }
  
  /**
   * Lädt eine Datei vom Server herunter
   */
  async downloadFile(endpoint: string, params?: any): Promise<Blob> {
    try {
      const response = await this.axios.get(endpoint, {
        params,
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }
  
  /**
   * Löscht alle Cache-Einträge
   */
  clearCache(): void {
    this.cache.invalidate();
  }
}

// Konfiguration für Insight Core API
const insightCoreApiConfig: ApiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_INSIGHT_CORE_API_URL || '/api/insight-core',
  cacheTtl: 10 * 60 * 1000, // 10 Minuten
  defaultHeaders: {
    'Content-Type': 'application/json',
    'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
  }
};

// Konfiguration für Nexus API
const nexusApiConfig: ApiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_NEXUS_API_URL || '/api/nexus',
  cacheTtl: 5 * 60 * 1000, // 5 Minuten
  defaultHeaders: {
    'Content-Type': 'application/json',
    'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
  }
};

// Singleton-Instanzen für APIs
export const insightCoreApiWrapper = new ApiWrapper(insightCoreApiConfig);
export const nexusApiWrapper = new ApiWrapper(nexusApiConfig);

export default ApiWrapper; 