/**
 * Internationalisierungs-Service (i18n)
 * Ermöglicht die mehrsprachige Nutzung der Anwendung
 */

export interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

export interface I18nConfig {
  defaultLanguage: string;
  fallbackLanguage: string;
  availableLanguages: string[];
}

class I18nService {
  private translations: Translations = {};
  private currentLanguage: string;
  private config: I18nConfig = {
    defaultLanguage: 'de',
    fallbackLanguage: 'en',
    availableLanguages: ['de', 'en']
  };

  constructor() {
    // Setze die Standardsprache oder nutze die Browser-Sprache, falls verfügbar
    const browserLang = navigator.language.split('-')[0];
    this.currentLanguage = this.config.availableLanguages.includes(browserLang)
      ? browserLang
      : this.config.defaultLanguage;
    
    this.loadTranslations();
  }

  private async loadTranslations() {
    try {
      // Lade Übersetzungen für die aktuelle Sprache
      const translations = await this.fetchTranslations(this.currentLanguage);
      this.translations[this.currentLanguage] = translations;
      
      // Lade auch die Fallback-Sprache
      if (this.currentLanguage !== this.config.fallbackLanguage) {
        const fallbackTranslations = await this.fetchTranslations(this.config.fallbackLanguage);
        this.translations[this.config.fallbackLanguage] = fallbackTranslations;
      }
    } catch (error) {
      console.error('Fehler beim Laden der Übersetzungen:', error);
    }
  }

  private async fetchTranslations(language: string): Promise<{[key: string]: string}> {
    try {
      // In einer echten Anwendung würden wir die Übersetzungen von einem Server laden
      // Für diese Demo verwenden wir Beispiel-Übersetzungen
      return language === 'de' 
        ? { 
            // Deutsche Übersetzungen
            'fact_check.title': 'Faktenprüfung',
            'fact_check.factual': 'Faktisch korrekt',
            'fact_check.not_factual': 'Faktisch ungenau',
            'sources.title': 'Quellen',
            'sources.reliability': 'Zuverlässigkeit der Quelle',
            'analysis.title': 'Erweiterte Analyse',
            'analysis.key_points': 'Kernaussagen',
            'analysis.pareto': 'nach 80/20-Prinzip',
            'analysis.context': 'Kontextinformationen',
            'analysis.warnings': 'Sicherheitshinweise',
            'analysis.metrics': 'Qualitätsmetriken',
            'analysis.details': 'Analyse-Details',
            'analysis.category': 'Kategorie',
            'analysis.context_ratio': 'Kontext-Verhältnis',
            'analysis.word_count': 'Wortanzahl',
            'analysis.sentence_count': 'Sätze',
            'analysis.improvements': 'Verbesserungsvorschläge',
            'category.scientific': 'Wissenschaftlich',
            'category.practical': 'Praktisch',
            'category.general': 'Allgemein',
            'expert.not_found': 'Experte konnte nicht gefunden werden',
            'error.general': 'Ein Fehler ist aufgetreten',
            'warning.quality': 'Qualitätswarnung',
            'warning.unreliable': 'Diese Nachricht enthält möglicherweise unzuverlässige Informationen',
            'debate.title': 'Expertendiskussion',
            'connection.connected': 'Verbunden',
            'connection.disconnected': 'Nicht verbunden',
            'connection.reconnecting': 'Verbindung wird wiederhergestellt...',
            'connection.reconnect': 'Verbindung wiederherstellen',
            'connection.api_error': 'API-Fehler',
            'connection.unavailable': 'API ist nicht verfügbar',
            'connection.established': 'Verbindung hergestellt',
            'connection.ready': 'Bereit für die Expertendiskussion',
            'connection.try_reconnect': 'Versuchen Sie, die Verbindung wiederherzustellen',
            'connection.try_again': 'Erneut versuchen',
            'connection.attempt': 'Versuch {attempt} von {max}',
            'connection.offline_mode': 'Offline-Modus',
            'offline.title': 'Offline-Modus aktiv',
            'offline.description': 'Sie arbeiten derzeit im Offline-Modus mit eingeschränkter Funktionalität',
            'offline.demo_message1': 'Willkommen im Offline-Modus. Die Verbindung zur API ist nicht verfügbar.',
            'offline.demo_message2': 'Einige Funktionen sind eingeschränkt, aber Sie können trotzdem Nachrichten eingeben.',
            'offline.response': 'Dies ist eine Demo-Antwort im Offline-Modus. Versuchen Sie, die Verbindung wiederherzustellen, um alle Funktionen zu nutzen.',
            // API Manager Übersetzungen
            'api.error.no_network': 'Keine Netzwerkverbindung verfügbar',
            'api.error.no_connection': 'Keine Verbindung zur API',
            'api.error.no_endpoint': 'Kein API-Endpunkt verfügbar',
            'api.error.all_endpoints_unavailable': 'Alle API-Endpunkte sind nicht verfügbar',
            'api.diagnosis.started': 'API-Diagnose gestartet',
            'api.diagnosis.please_wait': 'Bitte warten Sie, während wir die Verbindungsprobleme analysieren',
            'api.diagnosis.in_progress': 'Diagnose wird durchgeführt',
            'api.diagnosis.server_error': 'Server-Fehler erkannt',
            'api.diagnosis.access_denied': 'Zugriff verweigert',
            'api.diagnosis.dns_error': 'DNS-Auflösungsfehler',
            'api.diagnosis.timeout': 'Zeitüberschreitung bei der Verbindung',
            'api.diagnosis.check_network': 'Überprüfen Sie Ihre Netzwerkverbindung',
            'api.diagnosis.dns_recommendation': 'DNS-Problem erkannt. Versuchen Sie, Ihre DNS-Einstellungen zu überprüfen oder einen anderen DNS-Server zu verwenden.',
            'api.diagnosis.firewall_recommendation': 'Mögliches Firewall-Problem erkannt. Überprüfen Sie Ihre Firewall-Einstellungen oder wenden Sie sich an Ihren Netzwerkadministrator.',
            'api.diagnosis.server_recommendation': 'Server-Probleme erkannt. Die API-Server könnten derzeit gewartet werden oder unter hoher Last stehen.',
            'api.diagnosis.api_recommendation': 'API-Endpunkte sind nicht erreichbar. Bitte wenden Sie sich an den Support oder versuchen Sie es später erneut.',
            'api.diagnosis.complete': 'API-Diagnose abgeschlossen',
            'api.diagnosis.results': 'Diagnose-Ergebnisse',
            'api.connect.title': 'API-Verbindung',
            'api.connect.manual': 'Manuelle Verbindung',
            'api.connect.endpoint': 'API-Endpunkt',
            'api.connect.add': 'Endpunkt hinzufügen',
            'api.connect.select': 'Verfügbaren Endpunkt auswählen',
            'api.connect.status': 'Verbindungsstatus',
            'api.connect.diagnose': 'Probleme diagnostizieren',
            'api.connect.reset': 'Verbindungen zurücksetzen',
            'message.send': 'Senden',
            'message.placeholder': 'Nachricht eingeben...',
            'message.empty': 'Noch keine Nachrichten',
            'typing.single': 'schreibt...',
            'typing.multiple': '{count} Experten schreiben...',
            'cognitive.initialized': 'Kognitiver Loop initialisiert',
            'cognitive.ready_to_learn': 'Bereit zu lernen und zu optimieren',
            'cognitive.init_error': 'Initialisierungsfehler',
            'cognitive.not_initialized': 'Kognitiver Loop nicht initialisiert',
            'cognitive.update_error': 'Fehler beim Aktualisieren des Kontexts',
            'cognitive.feedback_sent': 'Feedback gesendet',
            'cognitive.feedback_processing': 'Das Feedback wird verarbeitet und zur Optimierung verwendet',
            'cognitive.feedback_error': 'Fehler beim Senden des Feedbacks',
            'cognitive.analysis_error': 'Fehler bei der Analyse',
            'cognitive.optimization_complete': 'Optimierung abgeschlossen',
            'cognitive.models_improved': 'Modelle wurden basierend auf den Lerndaten verbessert',
            'cognitive.optimization_error': 'Fehler bei der Modelloptimierung',
            'cognitive.performance_error': 'Fehler beim Abrufen der Performance-Daten',
            'cognitive.discussion_analysis_error': 'Fehler bei der Diskussionsanalyse',
            // API-Diagnose Komponente
            'api.diagnosis.title': 'API-Verbindungsdiagnose',
            'api.diagnosis.description': 'Überprüfung und Diagnose der API-Verbindungsprobleme',
            'api.diagnosis.running': 'Diagnose wird durchgeführt...',
            'api.diagnosis.network_status': 'Netzwerkstatus',
            'api.diagnosis.network_connected': 'Netzwerkverbindung verfügbar',
            'api.diagnosis.network_disconnected': 'Keine Netzwerkverbindung',
            'api.diagnosis.endpoints': 'API-Endpunkte',
            'api.diagnosis.response_time': 'Antwortzeit',
            'api.diagnosis.issues': 'Erkannte Probleme',
            'api.diagnosis.issue_network': 'Netzwerkproblem',
            'api.diagnosis.issue_network_desc': 'Ihr Gerät hat keine Verbindung zum Internet. Überprüfen Sie Ihre WLAN- oder Mobilfunkverbindung.',
            'api.diagnosis.issue_dns': 'DNS-Auflösungsproblem',
            'api.diagnosis.issue_dns_desc': 'Die API-Domain konnte nicht aufgelöst werden. Dies könnte an DNS-Serverproblemen liegen.',
            'api.diagnosis.issue_firewall': 'Firewall-/Zugriffsproblem',
            'api.diagnosis.issue_firewall_desc': 'Der Zugriff auf die API wurde verweigert. Dies könnte an Firewall-Einstellungen oder Zugriffsberechtigungen liegen.',
            'api.diagnosis.issue_server': 'Server-Problem',
            'api.diagnosis.issue_server_desc': 'Die API-Server sind nicht verfügbar oder haben einen internen Fehler. Dies kann an Wartungsarbeiten oder Serverauslastung liegen.',
            'api.diagnosis.issue_api': 'API-Verbindungsproblem',
            'api.diagnosis.issue_api_desc': 'Die API-Endpunkte sind nicht erreichbar. Die Dienste könnten aktuell nicht verfügbar sein.',
            'api.diagnosis.recommendations': 'Empfehlungen',
            'api.diagnosis.rerun': 'Diagnose neu starten',
            'api.diagnosis.close': 'Schließen',
            'api.connect.available': 'Verfügbar',
            'api.connect.unavailable': 'Nicht verfügbar',
            'api.connect.unknown': 'Unbekannt',
            'api.connect.add_custom': 'Benutzerdefinierten Endpunkt hinzufügen',
            'api.connect.try_endpoint': 'Diesen Endpunkt versuchen',
            // Ergänzende API-Übersetzungen
            'api.error.unavailable': 'API ist nicht verfügbar',
            'api.diagnosis.check_connection': 'Bitte überprüfen Sie Ihre Verbindung oder führen Sie eine Diagnose durch',
            'api.diagnosis.run': 'Diagnose starten',
            'connection.lost': 'Verbindung verloren',
            'api.keys': {
              'setup': {
                de: 'API-Schlüssel Einrichtung',
                en: 'API Key Setup'
              },
              'description': {
                de: 'Bitte geben Sie Ihre API-Schlüssel für OpenAI und/oder Perplexity ein. Sie benötigen mindestens einen gültigen Schlüssel.',
                en: 'Please enter your API keys for OpenAI and/or Perplexity. You need at least one valid key.'
              },
              'key': {
                de: 'Schlüssel',
                en: 'Key'
              },
              'get': {
                de: 'Schlüssel holen',
                en: 'Get key'
              },
              'test': {
                de: 'Schlüssel testen',
                en: 'Test keys'
              },
              'testing': {
                de: 'Teste Schlüssel...',
                en: 'Testing keys...'
              },
              'save': {
                de: 'Speichern',
                en: 'Save'
              },
              'cancel': {
                de: 'Abbrechen',
                en: 'Cancel'
              },
              'invalid': {
                de: 'Ungültiger API-Schlüssel',
                en: 'Invalid API key'
              },
              'note': {
                de: 'Wichtige Information',
                en: 'Important Note'
              },
              'secure': {
                de: 'Ihre API-Schlüssel werden sicher im lokalen Speicher Ihres Browsers gespeichert.',
                en: 'Your API keys are securely stored in your browser\'s local storage.'
              },
              'need_one': {
                de: 'Sie benötigen mindestens einen gültigen API-Schlüssel (OpenAI oder Perplexity).',
                en: 'You need at least one valid API key (OpenAI or Perplexity).'
              },
              'error': {
                de: 'Verbindungsfehler',
                en: 'Connection Error'
              },
              'test_error': {
                de: 'Fehler beim Testen der API-Schlüssel',
                en: 'Error testing API keys'
              },
              'saved': {
                de: 'API-Schlüssel gespeichert',
                en: 'API keys saved'
              },
              'connection_ready': {
                de: 'Die API-Verbindung ist jetzt einsatzbereit',
                en: 'The API connection is now ready to use'
              }
            }
          }
        : { 
            // Englische Übersetzungen
            'fact_check.title': 'Fact Check',
            'fact_check.factual': 'Factually Correct',
            'fact_check.not_factual': 'Factually Inaccurate',
            'sources.title': 'Sources',
            'sources.reliability': 'Source Reliability',
            'analysis.title': 'Advanced Analysis',
            'analysis.key_points': 'Key Points',
            'analysis.pareto': 'based on 80/20 principle',
            'analysis.context': 'Contextual Information',
            'analysis.warnings': 'Safety Warnings',
            'analysis.metrics': 'Quality Metrics',
            'analysis.details': 'Analysis Details',
            'analysis.category': 'Category',
            'analysis.context_ratio': 'Context Ratio',
            'analysis.word_count': 'Word Count',
            'analysis.sentence_count': 'Sentences',
            'analysis.improvements': 'Suggested Improvements',
            'category.scientific': 'Scientific',
            'category.practical': 'Practical',
            'category.general': 'General',
            'expert.not_found': 'Expert could not be found',
            'error.general': 'An error occurred',
            'warning.quality': 'Quality Warning',
            'warning.unreliable': 'This message may contain unreliable information',
            'debate.title': 'Expert Discussion',
            'connection.connected': 'Connected',
            'connection.disconnected': 'Disconnected',
            'connection.reconnecting': 'Reconnecting...',
            'connection.reconnect': 'Reconnect',
            'connection.api_error': 'API Error',
            'connection.unavailable': 'API is unavailable',
            'connection.established': 'Connection established',
            'connection.ready': 'Ready for expert discussion',
            'connection.try_reconnect': 'Try to reconnect',
            'connection.try_again': 'Try again',
            'connection.attempt': 'Attempt {attempt} of {max}',
            'connection.offline_mode': 'Offline Mode',
            'offline.title': 'Offline Mode Active',
            'offline.description': 'You are currently working in offline mode with limited functionality',
            'offline.demo_message1': 'Welcome to offline mode. The connection to the API is unavailable.',
            'offline.demo_message2': 'Some features are limited, but you can still enter messages.',
            'offline.response': 'This is a demo response in offline mode. Try to reconnect to use all features.',
            // API Manager Translations
            'api.error.no_network': 'No network connection available',
            'api.error.no_connection': 'No connection to API',
            'api.error.no_endpoint': 'No API endpoint available',
            'api.error.all_endpoints_unavailable': 'All API endpoints are unavailable',
            'api.diagnosis.started': 'API diagnosis started',
            'api.diagnosis.please_wait': 'Please wait while we analyze connection issues',
            'api.diagnosis.in_progress': 'Diagnosis in progress',
            'api.diagnosis.server_error': 'Server error detected',
            'api.diagnosis.access_denied': 'Access denied',
            'api.diagnosis.dns_error': 'DNS resolution error',
            'api.diagnosis.timeout': 'Connection timeout',
            'api.diagnosis.check_network': 'Check your network connection',
            'api.diagnosis.dns_recommendation': 'DNS issue detected. Try checking your DNS settings or using a different DNS server.',
            'api.diagnosis.firewall_recommendation': 'Possible firewall issue detected. Check your firewall settings or contact your network administrator.',
            'api.diagnosis.server_recommendation': 'Server issues detected. The API servers might be under maintenance or high load.',
            'api.diagnosis.api_recommendation': 'API endpoints are not reachable. Please contact support or try again later.',
            'api.diagnosis.complete': 'API diagnosis complete',
            'api.diagnosis.results': 'Diagnosis results',
            'api.connect.title': 'API Connection',
            'api.connect.manual': 'Manual connection',
            'api.connect.endpoint': 'API endpoint',
            'api.connect.add': 'Add endpoint',
            'api.connect.select': 'Select available endpoint',
            'api.connect.status': 'Connection status',
            'api.connect.diagnose': 'Diagnose issues',
            'api.connect.reset': 'Reset connections',
            'message.send': 'Send',
            'message.placeholder': 'Type your message...',
            'message.empty': 'No messages yet',
            'typing.single': 'is typing...',
            'typing.multiple': '{count} experts are typing...',
            'cognitive.initialized': 'Cognitive Loop Initialized',
            'cognitive.ready_to_learn': 'Ready to learn and optimize',
            'cognitive.init_error': 'Initialization Error',
            'cognitive.not_initialized': 'Cognitive loop not initialized',
            'cognitive.update_error': 'Error updating context',
            'cognitive.feedback_sent': 'Feedback Sent',
            'cognitive.feedback_processing': 'The feedback is being processed and used for optimization',
            'cognitive.feedback_error': 'Error sending feedback',
            'cognitive.analysis_error': 'Error during analysis',
            'cognitive.optimization_complete': 'Optimization Complete',
            'cognitive.models_improved': 'Models have been improved based on learning data',
            'cognitive.optimization_error': 'Error optimizing models',
            'cognitive.performance_error': 'Error retrieving performance data',
            'cognitive.discussion_analysis_error': 'Error analyzing discussion',
            // API Diagnosis Component
            'api.diagnosis.title': 'API Connection Diagnosis',
            'api.diagnosis.description': 'Checking and diagnosing API connection issues',
            'api.diagnosis.running': 'Diagnosis in progress...',
            'api.diagnosis.network_status': 'Network Status',
            'api.diagnosis.network_connected': 'Network connection available',
            'api.diagnosis.network_disconnected': 'No network connection',
            'api.diagnosis.endpoints': 'API Endpoints',
            'api.diagnosis.response_time': 'Response time',
            'api.diagnosis.issues': 'Detected Issues',
            'api.diagnosis.issue_network': 'Network Issue',
            'api.diagnosis.issue_network_desc': 'Your device has no internet connection. Check your Wi-Fi or mobile data connection.',
            'api.diagnosis.issue_dns': 'DNS Resolution Issue',
            'api.diagnosis.issue_dns_desc': 'The API domain could not be resolved. This might be due to DNS server problems.',
            'api.diagnosis.issue_firewall': 'Firewall/Access Issue',
            'api.diagnosis.issue_firewall_desc': 'Access to the API was denied. This could be due to firewall settings or access permissions.',
            'api.diagnosis.issue_server': 'Server Issue',
            'api.diagnosis.issue_server_desc': 'The API servers are not available or have an internal error. This may be due to maintenance or server load.',
            'api.diagnosis.issue_api': 'API Connection Issue',
            'api.diagnosis.issue_api_desc': 'The API endpoints are not reachable. The services might be currently unavailable.',
            'api.diagnosis.recommendations': 'Recommendations',
            'api.diagnosis.rerun': 'Rerun diagnosis',
            'api.diagnosis.close': 'Close',
            'api.connect.available': 'Available',
            'api.connect.unavailable': 'Unavailable',
            'api.connect.unknown': 'Unknown',
            'api.connect.add_custom': 'Add custom endpoint',
            'api.connect.try_endpoint': 'Try this endpoint',
            // Additional API translations
            'api.error.unavailable': 'API is unavailable',
            'api.diagnosis.check_connection': 'Please check your connection or run a diagnosis',
            'api.diagnosis.run': 'Run diagnosis',
            'connection.lost': 'Connection lost',
            'connection.try_reconnect': 'Try to reconnect',
            'api.keys': {
              'setup': {
                de: 'API-Schlüssel Einrichtung',
                en: 'API Key Setup'
              },
              'description': {
                de: 'Bitte geben Sie Ihre API-Schlüssel für OpenAI und/oder Perplexity ein. Sie benötigen mindestens einen gültigen Schlüssel.',
                en: 'Please enter your API keys for OpenAI and/or Perplexity. You need at least one valid key.'
              },
              'key': {
                de: 'Schlüssel',
                en: 'Key'
              },
              'get': {
                de: 'Schlüssel holen',
                en: 'Get key'
              },
              'test': {
                de: 'Schlüssel testen',
                en: 'Test keys'
              },
              'testing': {
                de: 'Teste Schlüssel...',
                en: 'Testing keys...'
              },
              'save': {
                de: 'Speichern',
                en: 'Save'
              },
              'cancel': {
                de: 'Abbrechen',
                en: 'Cancel'
              },
              'invalid': {
                de: 'Ungültiger API-Schlüssel',
                en: 'Invalid API key'
              },
              'note': {
                de: 'Wichtige Information',
                en: 'Important Note'
              },
              'secure': {
                de: 'Ihre API-Schlüssel werden sicher im lokalen Speicher Ihres Browsers gespeichert.',
                en: 'Your API keys are securely stored in your browser\'s local storage.'
              },
              'need_one': {
                de: 'Sie benötigen mindestens einen gültigen API-Schlüssel (OpenAI oder Perplexity).',
                en: 'You need at least one valid API key (OpenAI or Perplexity).'
              },
              'error': {
                de: 'Verbindungsfehler',
                en: 'Connection Error'
              },
              'test_error': {
                de: 'Fehler beim Testen der API-Schlüssel',
                en: 'Error testing API keys'
              },
              'saved': {
                de: 'API-Schlüssel gespeichert',
                en: 'API keys saved'
              },
              'connection_ready': {
                de: 'Die API-Verbindung ist jetzt einsatzbereit',
                en: 'The API connection is now ready to use'
              }
            }
          };
    } catch (error) {
      console.error(`Fehler beim Laden der Übersetzungen für ${language}:`, error);
      return {};
    }
  }

  setLanguage(language: string): void {
    if (this.config.availableLanguages.includes(language)) {
      this.currentLanguage = language;
      if (!this.translations[language]) {
        this.loadTranslations();
      }
    } else {
      console.warn(`Sprache ${language} ist nicht verfügbar. Benutze ${this.currentLanguage}`);
    }
  }

  translate(key: string, params?: Record<string, string>): string {
    // Versuche die Übersetzung in der aktuellen Sprache zu finden
    let translation = this.translations[this.currentLanguage]?.[key];
    
    // Wenn nicht gefunden, versuche es mit der Fallback-Sprache
    if (!translation && this.translations[this.config.fallbackLanguage]) {
      translation = this.translations[this.config.fallbackLanguage][key];
    }
    
    // Wenn immer noch nicht gefunden, gib den Schlüssel zurück
    if (!translation) {
      return key;
    }
    
    // Ersetze Parameter in der Übersetzung
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(`{${paramKey}}`, value);
      });
    }
    
    return translation;
  }

  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  getAvailableLanguages(): string[] {
    return this.config.availableLanguages;
  }
}

// Singleton-Instanz exportieren
export const i18nService = new I18nService(); 