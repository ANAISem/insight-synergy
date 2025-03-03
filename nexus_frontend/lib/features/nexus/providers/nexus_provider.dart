import 'package:flutter/foundation.dart';
import '../../../core/services/nexus_service.dart';

/// Provider für The Nexus, verwaltet den Zustand und kommuniziert mit dem Backend
class NexusProvider extends ChangeNotifier {
  final NexusService _nexusService;
  bool _isLoading = false;
  String? _error;

  NexusProvider(this._nexusService);

  /// Gibt zurück, ob gerade eine Anfrage verarbeitet wird
  bool get isLoading => _isLoading;
  
  /// Gibt den aktuellen Fehlerstatus zurück (null wenn kein Fehler)
  String? get error => _error;

  /// Analysiert eine Anfrage mit dem Analyse-Modus von The Nexus
  Future<NexusResponse> analyzeQuery(NexusRequest request) async {
    _setLoading(true);
    _clearError();
    
    try {
      final response = await _nexusService.analyzeQuery(request);
      _setLoading(false);
      return response;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      rethrow;
    }
  }

  /// Generiert eine Lösung für ein Problem mit The Nexus
  Future<NexusResponse> generateSolution(NexusRequest request) async {
    _setLoading(true);
    _clearError();
    
    try {
      final response = await _nexusService.generateSolution(request);
      _setLoading(false);
      return response;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      rethrow;
    }
  }

  /// Prüft den Status des Nexus-Services und des Mistral-Modells
  Future<bool> checkStatus() async {
    _setLoading(true);
    _clearError();
    
    try {
      final isAvailable = await _nexusService.checkStatus();
      _setLoading(false);
      return isAvailable;
    } catch (e) {
      _setLoading(false);
      _setError('Nexus-Dienst nicht erreichbar: ${e.toString()}');
      return false;
    }
  }

  /// Setzt den aktuellen Fehlerstatus
  void _setError(String errorMsg) {
    _error = errorMsg;
    notifyListeners();
  }

  /// Löscht den aktuellen Fehlerstatus
  void _clearError() {
    _error = null;
    notifyListeners();
  }

  /// Setzt den Ladestatus
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
} 