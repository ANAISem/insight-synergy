import 'dart:async';
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:nexus_frontend/core/constants/api_constants.dart';
import '../utils/logger.dart';
import 'api_service.dart';

/// Service für die Authentifizierung und Token-Verwaltung
class AuthService {
  final FlutterSecureStorage _secureStorage;
  final http.Client _httpClient;
  final ApiService apiService;
  
  /// Schlüssel für den Access-Token in der sicheren Speicherung
  static const String _accessTokenKey = 'access_token';
  
  /// Schlüssel für den Refresh-Token in der sicheren Speicherung
  static const String _refreshTokenKey = 'refresh_token';
  
  /// Schlüssel für SharedPreferences
  static const String _apiKeyKey = 'nexus_api_key';
  
  /// Erstellt eine neue Instanz des AuthService
  AuthService({
    FlutterSecureStorage? secureStorage,
    http.Client? httpClient,
    required this.apiService,
  })  : _secureStorage = secureStorage ?? const FlutterSecureStorage(),
        _httpClient = httpClient ?? http.Client();
  
  /// Meldet einen Benutzer mit E-Mail und Passwort an
  Future<void> login(String email, String password) async {
    final response = await _httpClient.post(
      Uri.parse(ApiConstants.loginEndpoint),
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    if (response.statusCode == 200) {
      final responseData = jsonDecode(response.body);
      await _saveTokens(
        responseData['accessToken'],
        responseData['refreshToken'],
      );
    } else {
      throw Exception('Anmeldung fehlgeschlagen: ${response.statusCode}');
    }
  }
  
  /// Registriert einen neuen Benutzer
  Future<void> register(
    String email,
    String password,
    String firstName,
    String lastName,
  ) async {
    final response = await _httpClient.post(
      Uri.parse(ApiConstants.registerEndpoint),
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'email': email,
        'password': password,
        'firstName': firstName,
        'lastName': lastName,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Registrierung fehlgeschlagen: ${response.statusCode}');
    }
  }
  
  /// Meldet den aktuellen Benutzer ab
  Future<void> logout() async {
    await _secureStorage.delete(key: _accessTokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
  }
  
  /// Prüft, ob ein Benutzer angemeldet ist
  Future<bool> isLoggedIn() async {
    final token = await getAccessToken();
    return token != null && !_isTokenExpired(token);
  }
  
  /// Gibt den aktuellen Access-Token zurück
  Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: _accessTokenKey);
  }
  
  /// Erneuert den Access-Token mit dem Refresh-Token
  Future<String?> refreshAccessToken() async {
    final refreshToken = await _secureStorage.read(key: _refreshTokenKey);
    if (refreshToken == null) return null;

    try {
      final response = await _httpClient.post(
        Uri.parse(ApiConstants.refreshTokenEndpoint),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'refreshToken': refreshToken,
        }),
      );

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        await _saveTokens(
          responseData['accessToken'],
          responseData['refreshToken'],
        );
        return responseData['accessToken'];
      } else {
        // Bei Fehler: Alle Tokens löschen (Abmeldung erzwingen)
        await logout();
        return null;
      }
    } catch (e) {
      await logout();
      return null;
    }
  }
  
  /// Gibt die Benutzer-ID aus dem aktuellen Token zurück
  Future<String?> getUserId() async {
    final token = await getAccessToken();
    if (token == null) return null;

    try {
      final Map<String, dynamic> decodedToken = JwtDecoder.decode(token);
      return decodedToken['userId'];
    } catch (e) {
      return null;
    }
  }
  
  /// Speichert die Tokens sicher
  Future<void> _saveTokens(String accessToken, String refreshToken) async {
    await _secureStorage.write(key: _accessTokenKey, value: accessToken);
    await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
  }
  
  /// Prüft, ob ein Token abgelaufen ist
  bool _isTokenExpired(String token) {
    try {
      return JwtDecoder.isExpired(token);
    } catch (e) {
      return true;
    }
  }
  
  /// API-Key in den SharedPreferences speichern
  Future<bool> saveApiKey(String apiKey) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final success = await prefs.setString(_apiKeyKey, apiKey);
      
      if (success) {
        AppLogger.i('API-Key gespeichert');
      } else {
        AppLogger.e('Fehler beim Speichern des API-Keys');
      }
      
      return success;
    } catch (e) {
      AppLogger.e('Fehler beim Speichern des API-Keys', e);
      return false;
    }
  }
  
  /// Gespeicherten API-Key abrufen
  Future<String?> getApiKey() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_apiKeyKey);
    } catch (e) {
      AppLogger.e('Fehler beim Abrufen des API-Keys', e);
      return null;
    }
  }
  
  /// API-Key aus den SharedPreferences löschen
  Future<bool> clearApiKey() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final success = await prefs.remove(_apiKeyKey);
      
      if (success) {
        AppLogger.i('API-Key gelöscht');
      } else {
        AppLogger.e('Fehler beim Löschen des API-Keys');
      }
      
      return success;
    } catch (e) {
      AppLogger.e('Fehler beim Löschen des API-Keys', e);
      return false;
    }
  }
  
  /// Prüfen, ob ein API-Key gespeichert ist
  Future<bool> hasApiKey() async {
    final apiKey = await getApiKey();
    return apiKey != null && apiKey.isNotEmpty;
  }
  
  /// Gültigkeit des API-Keys überprüfen
  Future<bool> validateApiKey(String apiKey) async {
    try {
      // API-Endpunkt für die Validierung des API-Keys aufrufen
      // Wir verwenden hier den Cache-Stats-Endpunkt als Test
      await apiService.getCacheStats();
      return true;
    } catch (e) {
      AppLogger.e('API-Key-Validierung fehlgeschlagen', e);
      return false;
    }
  }
} 