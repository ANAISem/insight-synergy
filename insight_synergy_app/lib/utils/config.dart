class AppConfig {
  // API-Konfiguration
  static const String apiBaseUrl = 'http://localhost:8001';
  static const String wsBaseUrl = 'ws://localhost:8001/ws';
  
  // Timeout-Einstellungen
  static const int connectionTimeoutSeconds = 10;
  static const int requestTimeoutSeconds = 15;
  
  // Feature-Flags
  static const bool enableWebsockets = true;
  static const bool enableOfflineSupport = true;
  
  // Versionsinfo
  static const String appVersion = '1.0.0';
  static const String buildNumber = '1';
  
  // Cache-Einstellungen
  static const int maxCachedMessages = 100;
  
  // Debug-Einstellungen
  static const bool verboseLogging = true;
} 