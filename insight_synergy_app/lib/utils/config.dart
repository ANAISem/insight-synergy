import 'dart:io' show Platform;

class AppConfig {
  // API-Konfiguration
  static const String apiBaseUrl = 'http://localhost:8009';
  static const String wsBaseUrl = 'ws://localhost:8009/ws';
  
  // Feature Flags
  static const bool enableInsightCore = false;  // Optional aktivierbar
  
  // Cache-Einstellungen
  static const int maxCachedMessages = 200;
  
  // Zeitüberschreitungen in Millisekunden
  static const int connectionTimeout = 10000;
  static const int longPollTimeout = 60000;
  
  // UI-Konfiguration
  static const double maxMessageWidth = 0.8; // Prozentsatz der Bildschirmbreite
  
  // Plattformspezifische Einstellungen
  static bool get isMobile => Platform.isAndroid || Platform.isIOS;
  static bool get isDesktop => Platform.isMacOS || Platform.isWindows || Platform.isLinux;
  
  // String-Formatierungen für die App
  static const Map<String, String> errorMessages = {
    'connection_failed': 'Verbindung zum Server fehlgeschlagen.',
    'api_error': 'Ein Fehler ist bei der API-Anfrage aufgetreten.',
  };
  
  // LLM-Konfiguration
  static const Map<String, dynamic> llmConfig = {
    'temperature': 0.7,
    'max_tokens': 2000,
    'top_p': 0.95
  };
} 