import 'dart:io' show Platform;

class AppConfig {
  // API-Konfiguration
  static const String apiBaseUrl = 'http://localhost:8009';
  static const String wsBaseUrl = 'ws://localhost:8009/ws';
  
  // Ollama-Konfiguration (für direkten Zugriff auf lokales Modell)
  static const String ollamaBaseUrl = 'http://localhost:11434/api';
  static const String mistralModelName = 'mistral';
  
  // Offline-Modus-Einstellungen
  static const bool preferOfflineMode = true;
  static const bool useLocalModelByDefault = true;
  static const bool verboseLogging = true;
  
  // Maximale Anzahl von Nachrichten im Cache
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
    'connection_failed': 'Verbindung zum Server fehlgeschlagen. Die App läuft im Offline-Modus.',
    'local_model_failed': 'Lokales Modell konnte nicht geladen werden. Bitte prüfen Sie die Installation.',
  };
  
  // LLM-Konfiguration
  static const Map<String, dynamic> llmConfig = {
    'temperature': 0.7,
    'max_tokens': 2000,
    'top_p': 0.95,
    'use_local': true,
  };
} 