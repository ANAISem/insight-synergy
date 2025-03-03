import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';

/// HomeProvider: Verwaltet den Zustand der Home-Ansicht und bietet eine 
/// Schnittstelle zur Mistral-7B-Integration.
class HomeProvider extends ChangeNotifier {
  bool _isOfflineMode = true;
  bool _isMistralInitialized = false;
  String _statusMessage = "Bereit für Offline-Nutzung mit Mistral 7B";
  List<String> _recentActivities = [];
  
  // Getter
  bool get isOfflineMode => _isOfflineMode;
  bool get isMistralInitialized => _isMistralInitialized;
  String get statusMessage => _statusMessage;
  List<String> get recentActivities => _recentActivities;
  
  HomeProvider() {
    _initializeProvider();
  }
  
  Future<void> _initializeProvider() async {
    try {
      // Lade gespeicherte Einstellungen
      final settingsBox = Hive.box('settings');
      _isOfflineMode = settingsBox.get('offline_mode', defaultValue: true);
      
      // Lade letzte Aktivitäten
      _loadRecentActivities();
      
      // Simuliere Mistral 7B Initialisierung im Offline-Modus
      if (_isOfflineMode) {
        _setStatusMessage("Initialisiere Mistral 7B...");
        await Future.delayed(const Duration(seconds: 2));
        _isMistralInitialized = true;
        _setStatusMessage("Mistral 7B erfolgreich initialisiert");
      }
      
      notifyListeners();
    } catch (e) {
      _setStatusMessage("Fehler bei der Initialisierung: $e");
    }
  }
  
  void _loadRecentActivities() {
    try {
      final Box settingsBox = Hive.box('settings');
      final List<dynamic>? savedActivities = settingsBox.get('recent_activities');
      
      if (savedActivities != null) {
        _recentActivities = savedActivities.cast<String>();
      } else {
        // Fallback für Demo-Zwecke
        _recentActivities = [
          "Wissenbasis 'ML-Grundlagen' erstellt",
          "3 Wissensgraphen aktualisiert",
          "Kognitive Schleife für 'Forschungsfragen' gestartet"
        ];
      }
    } catch (e) {
      debugPrint("Fehler beim Laden der Aktivitäten: $e");
    }
  }
  
  void addActivity(String activity) {
    _recentActivities.insert(0, activity);
    if (_recentActivities.length > 10) {
      _recentActivities.removeLast();
    }
    
    // Aktivitäten speichern
    try {
      final Box settingsBox = Hive.box('settings');
      settingsBox.put('recent_activities', _recentActivities);
    } catch (e) {
      debugPrint("Fehler beim Speichern der Aktivitäten: $e");
    }
    
    notifyListeners();
  }
  
  void toggleOfflineMode() {
    _isOfflineMode = !_isOfflineMode;
    
    // Speichere Einstellung
    final settingsBox = Hive.box('settings');
    settingsBox.put('offline_mode', _isOfflineMode);
    
    if (_isOfflineMode) {
      _setStatusMessage("Offline-Modus aktiviert. Mistral 7B wird verwendet.");
    } else {
      _setStatusMessage("Online-Modus aktiviert. Verbindung zum Backend wird hergestellt.");
    }
    
    notifyListeners();
  }
  
  void _setStatusMessage(String message) {
    _statusMessage = message;
    notifyListeners();
  }
  
  // Simulierte Mistral 7B Funktionen für Offline-Verwendung
  Future<String> generateResponse(String input) async {
    if (!_isOfflineMode || !_isMistralInitialized) {
      return "Mistral 7B ist nicht initialisiert oder der Offline-Modus ist deaktiviert.";
    }
    
    _setStatusMessage("Generiere Antwort mit Mistral 7B...");
    
    // Simuliere Antwortgenerierung
    await Future.delayed(const Duration(seconds: 1));
    
    final String response = "Dies ist eine simulierte Antwort von Mistral 7B auf: $input";
    _setStatusMessage("Mistral 7B-Antwort generiert");
    
    // Aktivität hinzufügen
    addActivity("Anfrage an Mistral 7B gesendet: ${input.substring(0, input.length > 20 ? 20 : input.length)}...");
    
    return response;
  }
} 