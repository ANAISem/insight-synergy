import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiResponse<T> {
  final T? data;
  final String? error;
  final bool success;

  ApiResponse({this.data, this.error, required this.success});

  factory ApiResponse.success(T data) {
    return ApiResponse(data: data, success: true);
  }

  factory ApiResponse.failure(String error) {
    return ApiResponse(error: error, success: false);
  }
}

class User {
  final String id;
  final String username;
  final String email;
  final bool isActive;

  User({required this.id, required this.username, required this.email, required this.isActive});

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      username: json['username'],
      email: json['email'],
      isActive: json['is_active'],
    );
  }
}

class AuthResponse {
  final String accessToken;
  final String tokenType;

  AuthResponse({required this.accessToken, required this.tokenType});

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['access_token'],
      tokenType: json['token_type'],
    );
  }
}

class Message {
  final String id;
  final String content;
  final String type;
  final DateTime timestamp;

  Message({required this.id, required this.content, required this.type, required this.timestamp});

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'],
      content: json['content'],
      type: json['type'],
      timestamp: DateTime.parse(json['timestamp']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'content': content,
      'type': type,
    };
  }
}

class ApiService {
  final String baseUrl;
  String? _token;

  ApiService({required this.baseUrl});

  // Token-Management
  Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  Future<String?> getToken() async {
    if (_token != null) return _token;
    
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  // Authentifizierungsheader erstellen
  Future<Map<String, String>> _getHeaders() async {
    final headers = {
      'Content-Type': 'application/json',
    };

    final token = await getToken();
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  // Registrierung eines neuen Benutzers
  Future<ApiResponse<User>> register(String username, String email, String password) async {
    final body = {
      'username': username,
      'email': email,
      'password': password,
    };

    return post('/register', body, (json) => User.fromJson(json));
  }

  // Login und Token abrufen
  Future<ApiResponse<AuthResponse>> login(String username, String password) async {
    // Für den Login müssen wir das Format ändern (FormData)
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/token'),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: {
          'username': username,
          'password': password,
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final jsonData = jsonDecode(response.body);
        final authResponse = AuthResponse.fromJson(jsonData);
        
        // Token speichern
        await setToken(authResponse.accessToken);
        
        return ApiResponse.success(authResponse);
      } else {
        String errorMessage;
        try {
          final errorJson = jsonDecode(response.body);
          errorMessage = errorJson['detail'] ?? 'Fehler: HTTP ${response.statusCode}';
        } catch (_) {
          errorMessage = 'Fehler: HTTP ${response.statusCode}';
        }
        return ApiResponse.failure(errorMessage);
      }
    } catch (e) {
      return ApiResponse.failure('Login fehlgeschlagen: ${e.toString()}');
    }
  }

  // Aktuellen Benutzer abrufen
  Future<ApiResponse<User>> getCurrentUser() async {
    return get('/users/me', (json) => User.fromJson(json));
  }

  // Nachrichten abrufen
  Future<ApiResponse<List<Message>>> getMessages({int limit = 100}) async {
    return get('/messages?limit=$limit', (json) {
      final List<dynamic> messageList = json;
      return messageList.map((item) => Message.fromJson(item)).toList();
    });
  }

  // Nachricht senden
  Future<ApiResponse<Message>> sendMessage(String content, {String type = 'user'}) async {
    final body = {
      'content': content,
      'type': type,
    };

    return post('/messages', body, (json) => Message.fromJson(json));
  }

  // Generisches GET mit Error-Handling und Authentifizierung
  Future<ApiResponse<T>> get<T>(String endpoint, T Function(dynamic json) fromJson) async {
    try {
      final headers = await _getHeaders();
      
      final response = await http.get(
        Uri.parse('$baseUrl$endpoint'),
        headers: headers,
      ).timeout(const Duration(seconds: 10));

      return _handleResponse(response, fromJson);
    } catch (e) {
      return ApiResponse.failure('Netzwerkfehler: ${e.toString()}');
    }
  }

  // Generisches POST mit Error-Handling und Authentifizierung
  Future<ApiResponse<T>> post<T>(
      String endpoint, dynamic body, T Function(dynamic json) fromJson) async {
    try {
      final headers = await _getHeaders();
      
      final response = await http.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 10));

      return _handleResponse(response, fromJson);
    } catch (e) {
      return ApiResponse.failure('Netzwerkfehler: ${e.toString()}');
    }
  }

  // Gemeinsames Handling der Antwort mit Fehlerbehandlung
  ApiResponse<T> _handleResponse<T>(
      http.Response response, T Function(dynamic json) fromJson) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      try {
        final jsonData = jsonDecode(response.body);
        final data = fromJson(jsonData);
        return ApiResponse.success(data);
      } catch (e) {
        return ApiResponse.failure('Fehler bei der Datenverarbeitung: ${e.toString()}');
      }
    } else if (response.statusCode == 401) {
      // Automatisch Token löschen bei Authentifizierungsfehlern
      clearToken();
      return ApiResponse.failure('Authentifizierung abgelaufen. Bitte erneut anmelden.');
    } else {
      String errorMessage;
      try {
        final errorJson = jsonDecode(response.body);
        errorMessage = errorJson['detail'] ?? 'Fehler: HTTP ${response.statusCode}';
      } catch (_) {
        errorMessage = 'Fehler: HTTP ${response.statusCode}';
      }
      return ApiResponse.failure(errorMessage);
    }
  }
} 