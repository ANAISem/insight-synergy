import 'package:flutter/material.dart';
import '../../../core/services/mistral_service.dart';

/// Provider für die Verwaltung der Cognitive Loop-Funktionalität
class CognitiveLoopProvider with ChangeNotifier {
  final MistralService _mistralService;
  bool _isLoading = false;
  String? _error;
  
  CognitiveLoopProvider({required MistralService mistralService})
      : _mistralService = mistralService;
  
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  /// Sendet eine Anfrage an den Cognitive Loop
  Future<ChatResponse> sendCognitiveLoopRequest(ChatRequest request) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();
      
      final response = await _mistralService.cognitiveLoop(request);
      
      _isLoading = false;
      notifyListeners();
      
      return response;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }
  
  /// Überprüft den Status des Mistral-Modells
  Future<StatusResponse> checkMistralStatus() async {
    try {
      return await _mistralService.checkStatus();
    } catch (e) {
      _error = "Fehler bei der Statusprüfung: ${e.toString()}";
      notifyListeners();
      rethrow;
    }
  }
  
  /// Setzt den Fehlerzustand zurück
  void resetError() {
    _error = null;
    notifyListeners();
  }
}