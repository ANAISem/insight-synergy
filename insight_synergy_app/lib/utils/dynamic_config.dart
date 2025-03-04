import 'dart:convert';
import 'dart:io';
import 'dart:developer' as developer;
import 'package:path/path.dart' as path;
import 'package:http/http.dart' as http;
import './config.dart';

class DynamicConfig {
  // Standardkonfiguration aus config.dart
  static String _apiBaseUrl = AppConfig.apiBaseUrl;
  static String _wsBaseUrl = AppConfig.wsBaseUrl;
  
  // Getter für die dynamischen Konfigurationswerte
  static String get apiBaseUrl => _apiBaseUrl;
  static String get wsBaseUrl => _wsBaseUrl;
  
  // Flag, ob die Konfiguration bereits geladen wurde
  static bool _initialized = false;
  
  // Liste der zu testenden Ports für den Fallback-Mechanismus
  static final List<int> _fallbackPorts = [8001, 8000, 8002, 8003, 8004, 8005];
  
  // Konfigurationsdatei
  static final String _configPath = path.join(
    Directory.current.path, 
    '../../../shared_config.json'
  );
  
  // Initialisiert die dynamische Konfiguration
  static Future<void> initialize() async {
    if (_initialized) return;
    
    developer.log('Initialisiere dynamische Konfiguration...', name: 'dynamic_config');
    
    try {
      // Versuche zuerst, die Konfigurationsdatei zu lesen
      await _loadFromConfigFile();
      
      // Teste die Verbindung
      if (!await _testConnection()) {
        developer.log('Verbindung mit geladener Konfiguration fehlgeschlagen, versuche Fallback...', 
          name: 'dynamic_config');
        await _tryFallbackPorts();
      }
    } catch (e) {
      developer.log('Fehler beim Laden der Konfiguration: $e', name: 'dynamic_config');
      developer.log('Versuche Fallback-Mechanismus...', name: 'dynamic_config');
      await _tryFallbackPorts();
    }
    
    _initialized = true;
    developer.log('Dynamische Konfiguration initialisiert: API=$_apiBaseUrl, WS=$_wsBaseUrl', 
      name: 'dynamic_config');
  }
  
  // Lädt die Konfiguration aus der Konfigurationsdatei
  static Future<void> _loadFromConfigFile() async {
    developer.log('Versuche Konfigurationsdatei zu laden: $_configPath', name: 'dynamic_config');
    
    try {
      final file = File(_configPath);
      if (await file.exists()) {
        final content = await file.readAsString();
        final config = jsonDecode(content);
        
        _apiBaseUrl = config['backend_url'];
        _wsBaseUrl = config['ws_url'];
        
        developer.log('Konfiguration erfolgreich geladen: API=$_apiBaseUrl, WS=$_wsBaseUrl', 
          name: 'dynamic_config');
        return;
      }
    } catch (e) {
      developer.log('Fehler beim Lesen der Konfigurationsdatei: $e', name: 'dynamic_config');
      throw e;
    }
    
    throw Exception('Konfigurationsdatei nicht gefunden');
  }
  
  // Testet die Verbindung zum Backend
  static Future<bool> _testConnection() async {
    developer.log('Teste Verbindung zu $_apiBaseUrl', name: 'dynamic_config');
    
    try {
      final response = await http
          .get(Uri.parse('$_apiBaseUrl/health'))
          .timeout(Duration(seconds: 3));
      
      return response.statusCode == 200;
    } catch (e) {
      developer.log('Verbindungstest fehlgeschlagen: $e', name: 'dynamic_config');
      return false;
    }
  }
  
  // Testet verschiedene Fallback-Ports
  static Future<void> _tryFallbackPorts() async {
    developer.log('Starte Fallback-Mechanismus mit ${_fallbackPorts.length} Ports', 
      name: 'dynamic_config');
    
    for (final port in _fallbackPorts) {
      final baseUrl = 'http://localhost:$port';
      developer.log('Teste Port $port: $baseUrl', name: 'dynamic_config');
      
      try {
        final response = await http
            .get(Uri.parse('$baseUrl/health'))
            .timeout(Duration(seconds: 2));
        
        if (response.statusCode == 200) {
          _apiBaseUrl = baseUrl;
          _wsBaseUrl = 'ws://localhost:$port/ws';
          developer.log('Erfolgreiche Verbindung zu Port $port hergestellt', name: 'dynamic_config');
          return;
        }
      } catch (e) {
        developer.log('Port $port nicht erreichbar: $e', name: 'dynamic_config');
        // Versuche den nächsten Port
      }
    }
    
    // Falls kein Port funktioniert, behalte die ursprüngliche Konfiguration bei
    developer.log('Kein funktionierender Port gefunden, behalte Standardkonfiguration', 
      name: 'dynamic_config');
    _apiBaseUrl = AppConfig.apiBaseUrl;
    _wsBaseUrl = AppConfig.wsBaseUrl;
  }
} 