/**
 * API Konfigurationsmodul
 * 
 * Zentrales Modul für API-bezogene Konfigurationen und Einstellungen.
 * Wird von allen API-Clients verwendet, um konsistente Konfiguration sicherzustellen.
 */

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// API-Basis-URLs
export const API_CONFIG = {
  // Insight Core API
  insightCore: {
    baseUrl: process.env.NEXT_PUBLIC_INSIGHT_CORE_API_URL || '/api/insight-core',
    timeout: 60000, // 60 Sekunden Timeout für Lösungsgenerierung
    defaultModel: 'gpt-4o',
  },
  
  // Nexus API für Expertendebatten
  nexus: {
    baseUrl: process.env.NEXT_PUBLIC_NEXUS_API_URL || '/api/nexus',
    timeout: 30000,
    wsUrl: process.env.NEXT_PUBLIC_NEXUS_WS_URL || null, // WebSocket URL
  },
  
  // Cognitive Loop API
  cognitiveLoop: {
    baseUrl: process.env.NEXT_PUBLIC_COGNITIVE_LOOP_API_URL || '/api/cognitive-loop',
    timeout: 10000,
  },
  
  // Stripe für Zahlungen
  stripe: {
    publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    paymentEndpoint: '/api/payments',
    timeout: 15000,
  }
};

/**
 * Erstellt eine Axios-Instanz mit der angegebenen Konfiguration
 */
export function createApiClient(config: {
  baseUrl: string;
  timeout?: number;
  withCredentials?: boolean;
}) {
  const axiosConfig: AxiosRequestConfig = {
    baseURL: config.baseUrl,
    timeout: config.timeout || 30000,
    withCredentials: config.withCredentials || false,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Erstelle Axios-Instanz
  const instance = axios.create(axiosConfig);
  
  // Request Interceptor für Auth-Token
  instance.interceptors.request.use(
    async (config) => {
      // Hier würden wir das Auth-Token aus dem Session/Cookie-System hinzufügen
      // Beispiel:
      // const token = await getAuthToken();
      // if (token) {
      //   config.headers.Authorization = `Bearer ${token}`;
      // }
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  // Response Interceptor für Fehlerbehandlung
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      // Angepasste Fehlerbehandlung
      if (error.response) {
        // Der Request wurde gemacht und der Server hat mit einem Status-Code geantwortet
        const status = error.response.status;
        
        // Authentifizierungsfehler
        if (status === 401) {
          // Leite zur Login-Seite weiter, wenn nicht authentifiziert
          if (typeof window !== 'undefined') {
            // Speichere die aktuelle URL für Redirect nach dem Login
            localStorage.setItem('redirectAfterLogin', window.location.pathname);
            // Leite zur Login-Seite weiter
            window.location.href = '/auth/login';
          }
        }
        
        // Für 403 (Forbidden) - Berechtigungsfehler
        if (status === 403) {
          console.error('Zugriff verweigert:', error.response.data);
        }
        
        // Für 429 (Too Many Requests) - Rate Limiting
        if (status === 429) {
          console.error('Zu viele Anfragen. Bitte warten Sie einen Moment.');
        }
      } else if (error.request) {
        // Der Request wurde gemacht, aber keine Antwort erhalten
        console.error('Keine Antwort vom Server erhalten:', error.request);
      } else {
        // Beim Setup des Requests ist etwas schiefgegangen
        console.error('Fehler beim Einrichten der Anfrage:', error.message);
      }
      
      return Promise.reject(error);
    }
  );
  
  return instance;
}

/**
 * Generische Funktion zum Abrufen von Daten mit Typisierung
 */
export async function fetchApi<T>(
  client: ReturnType<typeof createApiClient>,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  data?: any
): Promise<T> {
  try {
    const response = await client.request({
      url: endpoint,
      method,
      data,
    });
    
    return response.data as T;
  } catch (error) {
    // Fehlerbehandlung mit Rethrow
    if (axios.isAxiosError(error) && error.response) {
      throw {
        message: error.response.data?.message || 'Ein Fehler ist aufgetreten',
        status: error.response.status,
        endpoint,
      };
    }
    
    throw {
      message: 'Es konnte keine Verbindung zum Server hergestellt werden',
      status: 500,
      endpoint,
    };
  }
}

/**
 * Test-Funktion, um die API-Verfügbarkeit zu prüfen
 */
export async function testApiConnection(baseUrl: string): Promise<boolean> {
  try {
    const client = createApiClient({ baseUrl });
    await client.get('/status');
    return true;
  } catch (error) {
    console.error('API-Verbindungstest fehlgeschlagen:', error);
    return false;
  }
} 