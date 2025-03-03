import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService;
  User? _currentUser;
  String? _errorMessage;
  bool _isLoading = false;
  bool _isAuthenticated = false;

  AuthProvider({required ApiService apiService}) : _apiService = apiService;

  User? get currentUser => _currentUser;
  String? get errorMessage => _errorMessage;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;

  // Beim App-Start prüfen, ob ein Token vorhanden ist
  Future<bool> checkAuthentication() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _apiService.getToken();
      
      if (token != null) {
        // Mit dem Token versuchen, den aktuellen Benutzer abzurufen
        final response = await _apiService.getCurrentUser();
        
        if (response.success && response.data != null) {
          _currentUser = response.data;
          _isAuthenticated = true;
          _errorMessage = null;
          notifyListeners();
          return true;
        } else {
          // Token ist ungültig oder abgelaufen
          await _apiService.clearToken();
          _isAuthenticated = false;
          _errorMessage = null;
          notifyListeners();
          return false;
        }
      }
      
      _isAuthenticated = false;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Fehler bei der Authentifizierungsprüfung: $e';
      _isAuthenticated = false;
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Benutzer registrieren
  Future<bool> register(String username, String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.register(username, email, password);
      
      if (response.success && response.data != null) {
        // Registrierung erfolgreich
        _errorMessage = null;
        notifyListeners();
        return true;
      } else {
        // Fehler bei der Registrierung
        _errorMessage = response.error ?? 'Registrierung fehlgeschlagen';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Fehler bei der Registrierung: $e';
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Benutzer anmelden
  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final authResponse = await _apiService.login(username, password);
      
      if (authResponse.success && authResponse.data != null) {
        // Token ist bereits in apiService gespeichert
        
        // Benutzerinformationen abrufen
        final userResponse = await _apiService.getCurrentUser();
        if (userResponse.success && userResponse.data != null) {
          _currentUser = userResponse.data;
          _isAuthenticated = true;
          _errorMessage = null;
          notifyListeners();
          return true;
        } else {
          // Benutzerinformationen konnten nicht abgerufen werden
          _errorMessage = 'Benutzerinformationen konnten nicht abgerufen werden';
          _isAuthenticated = false;
          await _apiService.clearToken();
          notifyListeners();
          return false;
        }
      } else {
        // Fehler beim Login
        _errorMessage = authResponse.error ?? 'Login fehlgeschlagen';
        _isAuthenticated = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Fehler beim Login: $e';
      _isAuthenticated = false;
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Benutzer abmelden
  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _apiService.clearToken();
      _currentUser = null;
      _isAuthenticated = false;
      _errorMessage = null;
    } catch (e) {
      _errorMessage = 'Fehler beim Abmelden: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
} 