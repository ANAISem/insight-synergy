/**
 * API-Manager-Service
 * Verwaltet API-Verbindungen mit Fallback-Optionen, Diagnose und automatischer Endpunkt-Auswahl
 */

import { toast } from '@/components/ui/use-toast';
import { i18nService } from './i18n.service';

export interface ApiEndpoint {
  url: string;
  name: string;
  priority: number;
  isAvailable: boolean;
  lastCheck: Date | null;
  responseTime?: number;
}

export interface ApiStatus {
  isConnected: boolean;
  currentEndpoint: ApiEndpoint | null;
  lastError: string | null;
  diagnosticInfo: {
    networkConnected: boolean;
    lastCheckTime: Date | null;
    endpointsChecked: number;
    totalEndpoints: number;
    endpointDetails: Array<{
      name: string;
      status: 'available' | 'unavailable' | 'unknown';
      responseTime?: number;
    }>;
  };
}

export interface ApiManagerConfig {
  maxRetries: number;
  retryDelay: number;
  checkInterval: number;
  useLocalCache: boolean;
  timeout: number;
}

class ApiManagerService {
  private endpoints: ApiEndpoint[] = [];
  private status: ApiStatus = {
    isConnected: false,
    currentEndpoint: null,
    lastError: null,
    diagnosticInfo: {
      networkConnected: false,
      lastCheckTime: null,
      endpointsChecked: 0,
      totalEndpoints: 0,
      endpointDetails: []
    }
  };
  private config: ApiManagerConfig = {
    maxRetries: 3,
    retryDelay: 2000,
    checkInterval: 60000,
    useLocalCache: true,
    timeout: 10000
  };
  private checkInProgress = false;
  private diagnosisInProgress = false;
  private refreshTimer: NodeJS.Timeout | null = null;
  private mockData: Record<string, any> = {};
  private t = (key: string, params?: Record<string, string>) => i18nService.translate(key, params);
  private apiKeys: { openai?: string; perplexity?: string } = {};

  constructor() {
    console.log('API Manager wird initialisiert');
    console.log('Umgebungsvariablen:', {
      NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY?.substring(0, 10) + '...',
      NEXT_PUBLIC_PERPLEXITY_API_KEY: process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY?.substring(0, 10) + '...',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
    });

    // Initialisiere Standard-API-Endpunkte
    this.endpoints = [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com',
        name: 'Primärer Endpunkt',
        priority: 1,
        isAvailable: false,
        lastCheck: null
      },
      {
        url: process.env.NEXT_PUBLIC_BACKUP_API_URL || 'https://backup-api.example.com',
        name: 'Backup Endpunkt',
        priority: 2,
        isAvailable: false,
        lastCheck: null
      },
      // Direkte Verbindung zur OpenAI API
      {
        url: 'https://api.openai.com/v1',
        name: 'OpenAI API',
        priority: 0, // Höchste Priorität
        isAvailable: false,
        lastCheck: null
      },
      // Direkte Verbindung zur Perplexity API
      {
        url: 'https://api.perplexity.ai',
        name: 'Perplexity API',
        priority: 0, // Gleiche hohe Priorität
        isAvailable: false,
        lastCheck: null
      }
    ];

    this.status.diagnosticInfo.totalEndpoints = this.endpoints.length;

    // API-Schlüssel aus Umgebungsvariablen oder localStorage holen
    this.apiKeys = {
      openai: localStorage.getItem('openai_api_key') || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
      perplexity: localStorage.getItem('perplexity_api_key') || process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || ''
    };

    console.log('Geladene API-Schlüssel:', {
      openai: this.apiKeys.openai ? this.apiKeys.openai.substring(0, 10) + '...' : 'nicht gesetzt',
      perplexity: this.apiKeys.perplexity ? this.apiKeys.perplexity.substring(0, 10) + '...' : 'nicht gesetzt'
    });

    // Mock-Daten für Offline-Betrieb vorbereiten
    this.initMockData();
    
    // Initialisiere die API-Verbindung
    this.initialize().catch(error => {
      console.error('Fehler bei der API-Initialisierung:', error);
      // Zeige Toast-Nachricht mit Fehlermeldung
      toast({
        variant: 'destructive',
        title: this.t('api.error.initialization'),
        description: String(error)
      });
    });
  }

  /**
   * Initialisierung des API-Managers, prüft Verfügbarkeit aller Endpunkte
   */
  async initialize(): Promise<boolean> {
    console.log('Initialisiere API-Manager...');
    
    try {
      // Prüfe ob API-Schlüssel vorhanden sind
      if (!this.apiKeys.openai && !this.apiKeys.perplexity) {
        console.error('Keine API-Schlüssel gefunden');
        this.status.lastError = 'Keine API-Schlüssel konfiguriert';
        return false;
      }
      
      // Prüfe Netzwerkverbindung zuerst
      console.log('Prüfe Netzwerkverbindung...');
      this.status.diagnosticInfo.networkConnected = await this.checkNetworkConnectivity();
      
      if (!this.status.diagnosticInfo.networkConnected) {
        this.status.lastError = this.t('api.error.no_network');
        console.error('Netzwerkverbindung nicht verfügbar');
        return false;
      }
      
      console.log('Netzwerkverbindung verfügbar, prüfe Endpunkte...');
      
      // Prüfe alle verfügbaren Endpunkte
      const availableEndpoint = await this.findAvailableEndpoint();
      
      if (availableEndpoint) {
        console.log('Verfügbarer Endpunkt gefunden:', availableEndpoint.name);
        this.status.isConnected = true;
        this.status.currentEndpoint = availableEndpoint;
        
        // Starte regelmäßige Überprüfung
        this.startPeriodicChecks();
        
        // Zeige Erfolgs-Toast
        toast({
          title: this.t('api.connection.established'),
          description: this.t('api.connection.ready')
        });
        
        return true;
      } else {
        console.error('Kein verfügbarer Endpunkt gefunden');
        this.status.lastError = this.t('api.error.no_endpoint');
        return false;
      }
    } catch (error) {
      console.error('Fehler bei der Initialisierung:', error);
      this.status.lastError = String(error);
      return false;
    }
  }

  /**
   * Führt einen API-Aufruf mit automatischem Fallback durch
   */
  async callApi<T>(path: string, options: RequestInit = {}): Promise<T> {
    // Wenn keine Verbindung besteht, versuche zuerst eine zu etablieren
    if (!this.status.isConnected && !this.checkInProgress) {
      await this.findAvailableEndpoint();
    }
    
    // Falls immer noch keine Verbindung besteht, prüfe auf Mock-Daten
    if (!this.status.isConnected) {
      if (this.config.useLocalCache && this.mockData[path]) {
        console.log(`Verwende Cache-Daten für ${path}`);
        return Promise.resolve(this.mockData[path] as T);
      }
      throw new Error(this.t('api.error.no_connection'));
    }
    
    // Standardeinstellungen für Anfragen
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: this.config.timeout,
      ...options
    };
    
    // API-Aufruf mit dem aktuellen Endpunkt
    try {
      const endpoint = this.status.currentEndpoint;
      if (!endpoint) throw new Error(this.t('api.error.no_endpoint'));
      
      // Füge API-Schlüssel für spezifische Endpunkte hinzu
      if (endpoint.name === 'OpenAI API' && this.apiKeys.openai) {
        (defaultOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${this.apiKeys.openai}`;
      } else if (endpoint.name === 'Perplexity API' && this.apiKeys.perplexity) {
        (defaultOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${this.apiKeys.perplexity}`;
      }
      
      const startTime = Date.now();
      const response = await fetch(`${endpoint.url}/${path}`, defaultOptions);
      const endTime = Date.now();
      
      // Aktualisiere Antwortzeit für Monitoring
      endpoint.responseTime = endTime - startTime;
      
      if (!response.ok) {
        // Bei Server-Fehler, versuche alternative Endpunkte
        if (response.status >= 500) {
          console.error(`Server-Fehler bei Endpunkt ${endpoint.name}: ${response.status}`);
          endpoint.isAvailable = false;
          return this.fallbackApiCall(path, defaultOptions);
        }
        
        // Bei Client-Fehlern (400er), Fehler zurückgeben aber Endpunkt als verfügbar markieren
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error?.message || `${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('API-Aufruf fehlgeschlagen:', error);
      
      // Wenn der Fehler auf eine Netzwerkproblem hinweist, versuche alternative Endpunkte
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return this.fallbackApiCall(path, defaultOptions);
      }
      
      throw error;
    }
  }
  
  /**
   * Versucht einen Fallback auf alternative API-Endpunkte
   */
  private async fallbackApiCall<T>(path: string, options: RequestInit): Promise<T> {
    // Aktuellen Endpunkt als nicht verfügbar markieren
    if (this.status.currentEndpoint) {
      this.status.currentEndpoint.isAvailable = false;
    }
    
    // Versuche einen neuen Endpunkt zu finden
    const newEndpoint = await this.findAvailableEndpoint();
    
    if (!newEndpoint) {
      // Wenn kein Endpunkt verfügbar ist, versuche Cache-Daten zu verwenden
      if (this.config.useLocalCache && this.mockData[path]) {
        console.log(`Verwende Cache-Daten für ${path} nach Fallback-Versuch`);
        return Promise.resolve(this.mockData[path] as T);
      }
      throw new Error(this.t('api.error.all_endpoints_unavailable'));
    }
    
    // Versuche den Aufruf mit dem neuen Endpunkt
    try {
      const response = await fetch(`${newEndpoint.url}/${path}`, options);
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('Fallback-API-Aufruf fehlgeschlagen:', error);
      
      // Cache-Daten als letzte Option
      if (this.config.useLocalCache && this.mockData[path]) {
        console.log(`Verwende Cache-Daten für ${path} nach fehlgeschlagenem Fallback`);
        return Promise.resolve(this.mockData[path] as T);
      }
      
      throw error;
    }
  }

  /**
   * Sucht nach einem verfügbaren API-Endpunkt
   */
  async findAvailableEndpoint(): Promise<ApiEndpoint | null> {
    if (this.checkInProgress) {
      console.log('Endpunkt-Prüfung läuft bereits, bitte warten...');
      return this.status.currentEndpoint;
    }
    
    this.checkInProgress = true;
    this.status.diagnosticInfo.lastCheckTime = new Date();
    this.status.diagnosticInfo.endpointsChecked = 0;
    
    try {
      // Sortiere Endpunkte nach Priorität
      const sortedEndpoints = [...this.endpoints].sort((a, b) => a.priority - b.priority);
      
      for (const endpoint of sortedEndpoints) {
        this.status.diagnosticInfo.endpointsChecked++;
        endpoint.lastCheck = new Date();
        
        try {
          console.log(`Prüfe Endpunkt: ${endpoint.name} (${endpoint.url})`);
          
          // Spezielle Prüfungen für OpenAI und Perplexity
          let testPath = 'status';
          let headers: Record<string, string> = { 'Accept': 'application/json' };
          
          if (endpoint.name === 'OpenAI API') {
            testPath = 'models';
            if (this.apiKeys.openai) {
              headers['Authorization'] = `Bearer ${this.apiKeys.openai}`;
            } else {
              console.warn('OpenAI API-Schlüssel fehlt, überspringe Endpunkt');
              this.updateEndpointStatus(endpoint.name, 'unavailable');
              endpoint.isAvailable = false;
              continue;
            }
          } else if (endpoint.name === 'Perplexity API') {
            testPath = 'models';
            if (this.apiKeys.perplexity) {
              headers['Authorization'] = `Bearer ${this.apiKeys.perplexity}`;
            } else {
              console.warn('Perplexity API-Schlüssel fehlt, überspringe Endpunkt');
              this.updateEndpointStatus(endpoint.name, 'unavailable');
              endpoint.isAvailable = false;
              continue;
            }
          }
          
          const startTime = Date.now();
          const response = await fetch(`${endpoint.url}/${testPath}`, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(this.config.timeout)
          });
          const endTime = Date.now();
          
          endpoint.responseTime = endTime - startTime;
          
          // Aktualisiere Statusdetails
          this.updateEndpointStatus(endpoint.name, response.ok ? 'available' : 'unavailable', endpoint.responseTime);
          
          if (response.ok) {
            console.log(`Endpunkt ${endpoint.name} ist verfügbar`);
            endpoint.isAvailable = true;
            this.status.isConnected = true;
            this.status.currentEndpoint = endpoint;
            this.status.lastError = null;
            return endpoint;
          }
          
          console.log(`Endpunkt ${endpoint.name} nicht verfügbar, Status: ${response.status}`);
          endpoint.isAvailable = false;
        } catch (error) {
          console.error(`Fehler beim Prüfen von Endpunkt ${endpoint.name}:`, error);
          endpoint.isAvailable = false;
          this.updateEndpointStatus(endpoint.name, 'unavailable');
        }
      }
      
      // Kein Endpunkt verfügbar
      this.status.isConnected = false;
      this.status.currentEndpoint = null;
      this.status.lastError = this.t('api.error.all_endpoints_unavailable');
      
      console.error('Alle API-Endpunkte sind nicht verfügbar');
      return null;
    } finally {
      this.checkInProgress = false;
    }
  }
  
  /**
   * Prüft die Netzwerkverbindung durch einen Ping an einen zuverlässigen Service
   */
  private async checkNetworkConnectivity(): Promise<boolean> {
    // Liste mit zuverlässigen Endpoints für Konnektivitätstests
    const reliableServices = [
      'https://www.cloudflare.com/cdn-cgi/trace',
      'https://www.google.com/generate_204',
      'https://www.apple.com'
    ];
    
    for (const service of reliableServices) {
      try {
        const response = await fetch(service, { 
          method: 'HEAD',
          mode: 'no-cors',
          signal: AbortSignal.timeout(5000)
        });
        return true;
      } catch (error) {
        console.warn(`Netzwerkprüfung mit ${service} fehlgeschlagen`);
      }
    }
    
    return false;
  }
  
  /**
   * Führt eine ausführliche Diagnose der API-Verbindungsprobleme durch
   */
  async diagnoseConnectionIssues(): Promise<{
    networkConnected: boolean;
    firewallIssue: boolean;
    dnsIssue: boolean;
    serverIssue: boolean;
    endpointDetails: Array<{
      name: string;
      status: 'available' | 'unavailable' | 'unknown';
      responseTime?: number;
      error?: string;
      statusCode?: number;
    }>;
    recommendations: string[];
  }> {
    if (this.diagnosisInProgress) {
      return {
        networkConnected: this.status.diagnosticInfo.networkConnected,
        firewallIssue: false,
        dnsIssue: false,
        serverIssue: false,
        endpointDetails: this.status.diagnosticInfo.endpointDetails,
        recommendations: [this.t('api.diagnosis.in_progress')]
      };
    }
    
    this.diagnosisInProgress = true;
    toast({
      title: this.t('api.diagnosis.started'),
      description: this.t('api.diagnosis.please_wait'),
    });
    
    try {
      // Prüfe Netzwerkverbindung
      const networkConnected = await this.checkNetworkConnectivity();
      
      let firewallIssue = false;
      let dnsIssue = false;
      let serverIssue = false;
      const endpointDetails: Array<{
        name: string;
        status: 'available' | 'unavailable' | 'unknown';
        responseTime?: number;
        error?: string;
        statusCode?: number;
      }> = [];
      
      // Wenn Netzwerk verfügbar ist, prüfe jeden Endpunkt detailliert
      if (networkConnected) {
        for (const endpoint of this.endpoints) {
          try {
            const startTime = Date.now();
            
            // Versuche erst einen DNS-Lookup durch einen einfachen Ping
            const pingResponse = await fetch(`${endpoint.url}/ping`, {
              method: 'HEAD',
              signal: AbortSignal.timeout(2000)
            }).catch(e => {
              // DNS-Fehler erkennen
              if (e instanceof TypeError && e.message.includes('fetch')) {
                dnsIssue = true;
                throw new Error('DNS_RESOLUTION_FAILED');
              }
              throw e;
            });
            
            // Versuche dann einen vollständigen API-Aufruf
            const apiResponse = await fetch(`${endpoint.url}/status`, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(this.config.timeout)
            });
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            // Prüfe auf Server-Probleme
            if (apiResponse.status >= 500) {
              serverIssue = true;
              endpointDetails.push({
                name: endpoint.name,
                status: 'unavailable',
                responseTime,
                statusCode: apiResponse.status,
                error: this.t('api.diagnosis.server_error')
              });
              continue;
            }
            
            // Prüfe auf Zugriffsprobleme (könnte Firewall sein)
            if (apiResponse.status === 403) {
              firewallIssue = true;
              endpointDetails.push({
                name: endpoint.name,
                status: 'unavailable',
                responseTime,
                statusCode: apiResponse.status,
                error: this.t('api.diagnosis.access_denied')
              });
              continue;
            }
            
            // Erfolgreiche Verbindung
            endpointDetails.push({
              name: endpoint.name,
              status: apiResponse.ok ? 'available' : 'unavailable',
              responseTime,
              statusCode: apiResponse.status
            });
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Spezielle Fehlertypen erkennen
            if (errorMessage.includes('DNS_RESOLUTION_FAILED')) {
              endpointDetails.push({
                name: endpoint.name,
                status: 'unavailable',
                error: this.t('api.diagnosis.dns_error')
              });
            } else if (errorMessage.includes('AbortError') || errorMessage.includes('timeout')) {
              endpointDetails.push({
                name: endpoint.name,
                status: 'unavailable',
                error: this.t('api.diagnosis.timeout')
              });
            } else {
              endpointDetails.push({
                name: endpoint.name,
                status: 'unavailable',
                error: errorMessage
              });
            }
          }
        }
      }
      
      // Erstelle Empfehlungen basierend auf Diagnoseergebnissen
      const recommendations: string[] = [];
      
      if (!networkConnected) {
        recommendations.push(this.t('api.diagnosis.check_network'));
      }
      
      if (dnsIssue) {
        recommendations.push(this.t('api.diagnosis.dns_recommendation'));
      }
      
      if (firewallIssue) {
        recommendations.push(this.t('api.diagnosis.firewall_recommendation'));
      }
      
      if (serverIssue) {
        recommendations.push(this.t('api.diagnosis.server_recommendation'));
      }
      
      if (networkConnected && !dnsIssue && !firewallIssue && !serverIssue && endpointDetails.every(e => e.status === 'unavailable')) {
        recommendations.push(this.t('api.diagnosis.api_recommendation'));
      }
      
      // Aktualisiere Status mit Diagnoseergebnissen
      this.status.diagnosticInfo.networkConnected = networkConnected;
      this.status.diagnosticInfo.endpointDetails = endpointDetails.map(d => ({
        name: d.name,
        status: d.status,
        responseTime: d.responseTime
      }));
      
      return {
        networkConnected,
        firewallIssue,
        dnsIssue,
        serverIssue,
        endpointDetails,
        recommendations
      };
    } finally {
      this.diagnosisInProgress = false;
    }
  }
  
  /**
   * Startet regelmäßige Überprüfungen der Endpunkte
   */
  private startPeriodicChecks() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    this.refreshTimer = setInterval(async () => {
      if (!this.status.isConnected && !this.checkInProgress) {
        console.log('Regelmäßige Endpunkt-Überprüfung...');
        await this.findAvailableEndpoint();
      }
    }, this.config.checkInterval);
  }
  
  /**
   * Aktualisiert einen Endpunkt-Status in der Diagnoseinfo
   */
  private updateEndpointStatus(endpointName: string, status: 'available' | 'unavailable' | 'unknown', responseTime?: number) {
    const endpointDetail = this.status.diagnosticInfo.endpointDetails.find(e => e.name === endpointName);
    
    if (endpointDetail) {
      endpointDetail.status = status;
      if (responseTime !== undefined) {
        endpointDetail.responseTime = responseTime;
      }
    } else {
      this.status.diagnosticInfo.endpointDetails.push({
        name: endpointName,
        status,
        responseTime
      });
    }
  }
  
  /**
   * Initialisiert Mock-Daten für den Offline-Betrieb
   */
  private initMockData() {
    this.mockData = {
      'debates/status': {
        status: 'ok',
        version: '1.0.0',
        message: 'API ist offline, verwende Mock-Daten'
      },
      'debates/list': {
        debates: [
          { id: 'mock-debate-1', title: 'Klimawandel', experts: 3, messages: 24 },
          { id: 'mock-debate-2', title: 'Künstliche Intelligenz', experts: 4, messages: 32 }
        ]
      }
    };
  }
  
  /**
   * Fügt Mock-Daten für einen bestimmten Pfad hinzu
   */
  addMockData(path: string, data: any) {
    this.mockData[path] = data;
  }
  
  /**
   * Gibt die aktuelle API-Konfiguration zurück
   */
  getConfig(): ApiManagerConfig {
    return { ...this.config };
  }
  
  /**
   * Aktualisiert die API-Konfiguration
   */
  updateConfig(config: Partial<ApiManagerConfig>) {
    this.config = { ...this.config, ...config };
    
    // Wenn Intervall geändert wurde, Timer neu starten
    if (config.checkInterval && this.refreshTimer) {
      this.startPeriodicChecks();
    }
  }
  
  /**
   * Gibt den aktuellen API-Status zurück
   */
  getStatus(): ApiStatus {
    return { ...this.status };
  }
  
  /**
   * Fügt einen neuen API-Endpunkt hinzu
   */
  addEndpoint(endpoint: Omit<ApiEndpoint, 'isAvailable' | 'lastCheck'>) {
    const newEndpoint: ApiEndpoint = {
      ...endpoint,
      isAvailable: false,
      lastCheck: null
    };
    
    this.endpoints.push(newEndpoint);
    this.status.diagnosticInfo.totalEndpoints = this.endpoints.length;
  }

  // API-Direktverbindung für spezifische Anfragen an OpenAI
  async callOpenAI<T>(endpoint: string, data: any): Promise<T> {
    if (!this.apiKeys.openai) {
      throw new Error('OpenAI API-Schlüssel fehlt');
    }
    
    const openAIEndpoint = this.endpoints.find(e => e.name === 'OpenAI API');
    if (!openAIEndpoint) {
      throw new Error('OpenAI Endpunkt nicht konfiguriert');
    }
    
    try {
      const response = await fetch(`${openAIEndpoint.url}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKeys.openai}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('OpenAI API-Aufruf fehlgeschlagen:', error);
      throw error;
    }
  }
  
  // API-Direktverbindung für spezifische Anfragen an Perplexity
  async callPerplexity<T>(endpoint: string, data: any): Promise<T> {
    if (!this.apiKeys.perplexity) {
      throw new Error('Perplexity API-Schlüssel fehlt');
    }
    
    const perplexityEndpoint = this.endpoints.find(e => e.name === 'Perplexity API');
    if (!perplexityEndpoint) {
      throw new Error('Perplexity Endpunkt nicht konfiguriert');
    }
    
    try {
      const response = await fetch(`${perplexityEndpoint.url}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKeys.perplexity}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Perplexity API-Aufruf fehlgeschlagen:', error);
      throw error;
    }
  }

  // Hilfsmethode zum Überprüfen und Aktualisieren der API-Schlüssel
  updateApiKeys(keys: { openai?: string; perplexity?: string }) {
    if (keys.openai) {
      this.apiKeys.openai = keys.openai;
    }
    
    if (keys.perplexity) {
      this.apiKeys.perplexity = keys.perplexity;
    }
    
    // Nachdem Schlüssel aktualisiert wurden, prüfe Endpunkte erneut
    return this.findAvailableEndpoint();
  }
}

// Singleton-Instanz exportieren
export const apiManager = new ApiManagerService(); 