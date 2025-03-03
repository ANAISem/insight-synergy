import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:nexus_frontend/core/exceptions/api_exception.dart';

/// Service für API-Anfragen an den Server
class ApiService {
  final http.Client _httpClient;
  final String baseUrl;
  final String apiKey;

  ApiService({
    http.Client? httpClient,
    required this.baseUrl,
    required this.apiKey,
  }) : _httpClient = httpClient ?? http.Client();

  /// Führt eine GET-Anfrage an die angegebene URL aus
  Future<dynamic> get(
    String endpoint, {
    Map<String, String>? headers,
    Map<String, String>? queryParameters,
  }) async {
    final Uri uri = Uri.parse('$baseUrl/$endpoint');
    final Uri uriWithQuery = queryParameters != null
        ? uri.replace(queryParameters: queryParameters)
        : uri;

    try {
      final response = await _httpClient.get(
        uriWithQuery,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $apiKey',
          ...?headers,
        },
      );

      _checkResponse(response);
      return jsonDecode(response.body);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        500, 
        e.toString(), 
        'Fehler bei GET-Anfrage: ${e.toString()}'
      );
    }
  }

  /// Führt eine POST-Anfrage an die angegebene URL aus
  Future<dynamic> post(
    String endpoint, {
    required Map<String, dynamic> data,
    Map<String, String>? headers,
  }) async {
    try {
      final response = await _httpClient.post(
        Uri.parse('$baseUrl/$endpoint'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $apiKey',
          ...?headers,
        },
        body: jsonEncode(data),
      );

      _checkResponse(response);
      return jsonDecode(response.body);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        500, 
        e.toString(), 
        'Fehler bei POST-Anfrage: ${e.toString()}'
      );
    }
  }

  /// Führt eine PUT-Anfrage an die angegebene URL aus
  Future<dynamic> put(
    String endpoint, {
    required Map<String, dynamic> data,
    Map<String, String>? headers,
  }) async {
    try {
      final response = await _httpClient.put(
        Uri.parse('$baseUrl/$endpoint'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $apiKey',
          ...?headers,
        },
        body: jsonEncode(data),
      );

      _checkResponse(response);
      return jsonDecode(response.body);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        500, 
        e.toString(), 
        'Fehler bei PUT-Anfrage: ${e.toString()}'
      );
    }
  }

  /// Führt eine DELETE-Anfrage an die angegebene URL aus
  Future<dynamic> delete(
    String endpoint, {
    Map<String, String>? headers,
  }) async {
    try {
      final response = await _httpClient.delete(
        Uri.parse('$baseUrl/$endpoint'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $apiKey',
          ...?headers,
        },
      );

      _checkResponse(response);
      return jsonDecode(response.body);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        500, 
        e.toString(), 
        'Fehler bei DELETE-Anfrage: ${e.toString()}'
      );
    }
  }

  /// Überprüft die API-Antwort auf Fehler
  void _checkResponse(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message;
      try {
        final responseData = jsonDecode(response.body);
        message = responseData['message'] ?? 'Unbekannter API-Fehler';
      } catch (_) {
        message = 'Fehler bei der API-Anfrage: ${response.statusCode}';
      }

      throw ApiException(
        response.statusCode,
        response.body,
        message,
      );
    }
  }
  
  // Spezifische API-Methoden für die Nexus-Backend-API
  
  Future<dynamic> searchKnowledge(String query) {
    return get('search', queryParameters: {'query': query});
  }
  
  Future<dynamic> queryKnowledge(String input, {int maxResults = 5}) {
    return post('knowledge/query', data: {
      'input': input,
      'max_results': maxResults
    });
  }
  
  Future<dynamic> storeKnowledge(Map<String, dynamic> knowledgeItem) {
    return post('documents', data: knowledgeItem);
  }
  
  Future<List<String>> getSuggestions(String input) async {
    final response = await get(
      'search/suggestions',
      queryParameters: {'query': input, 'max_suggestions': '5'},
    );
    
    return (response['suggestions'] as List).cast<String>();
  }
  
  Future<dynamic> getCacheStats() {
    return get('system/cache/stats');
  }
} 