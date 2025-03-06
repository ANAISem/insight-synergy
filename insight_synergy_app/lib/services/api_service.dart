import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:developer' as developer;

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

  ApiService({required this.baseUrl}) {
    developer.log('ApiService initialisiert mit URL: $baseUrl', name: 'api_service');
  }

  // Standardheader für alle Anfragen
  Map<String, String> _getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  // Hilfsmethode für API-Anfragen mit besserer Fehlerprotokollierung
  Future<http.Response> _makeRequest(
    String path, 
    String method, 
    {Map<String, String>? headers, Object? body}
  ) async {
    final url = Uri.parse('$baseUrl$path');
    developer.log('API-Anfrage: $method $url', name: 'api_service');
    
    try {
      http.Response response;
      
      switch (method) {
        case 'GET':
          response = await http.get(url, headers: headers);
          break;
        case 'POST':
          response = await http.post(url, headers: headers, body: body);
          break;
        case 'PUT':
          response = await http.put(url, headers: headers, body: body);
          break;
        case 'DELETE':
          response = await http.delete(url, headers: headers);
          break;
        default:
          throw Exception('Nicht unterstützte HTTP-Methode: $method');
      }
      
      developer.log('API-Antwort: ${response.statusCode} - ${response.body.substring(0, response.body.length > 100 ? 100 : response.body.length)}...', name: 'api_service');
      return response;
    } catch (e) {
      developer.log('API-Fehler: $e', name: 'api_service', error: e);
      rethrow;
    }
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

  // Generisches GET mit Error-Handling
  Future<ApiResponse<T>> get<T>(String endpoint, T Function(dynamic json) fromJson) async {
    try {
      final headers = _getHeaders();
      
      final response = await _makeRequest(endpoint, 'GET', headers: headers);

      return _handleResponse(response, fromJson);
    } catch (e) {
      return ApiResponse.failure('Netzwerkfehler: ${e.toString()}');
    }
  }

  // Generisches POST mit Error-Handling
  Future<ApiResponse<T>> post<T>(
      String endpoint, dynamic body, T Function(dynamic json) fromJson) async {
    try {
      final headers = _getHeaders();
      
      final response = await _makeRequest(endpoint, 'POST', body: jsonEncode(body), headers: headers);

      return _handleResponse(response, fromJson);
    } catch (e) {
      return ApiResponse.failure('Netzwerkfehler: ${e.toString()}');
    }
  }

  // API-Antwort verarbeiten
  ApiResponse<T> _handleResponse<T>(
      http.Response response, T Function(dynamic json) fromJson) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      try {
        final jsonData = jsonDecode(response.body);
        return ApiResponse.success(fromJson(jsonData));
      } catch (e) {
        return ApiResponse.failure('JSON-Fehler: ${e.toString()}');
      }
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