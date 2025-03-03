import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';

import 'package:nexus_frontend/core/config/api_config.dart';
import 'package:nexus_frontend/core/models/cognitive_loop/discussion.dart';
import 'package:nexus_frontend/core/models/cognitive_loop/discussion_message.dart';
import 'package:nexus_frontend/core/models/cognitive_loop/expert_profile.dart';
import 'package:nexus_frontend/core/models/cognitive_loop/discussion_analysis.dart';
import 'package:nexus_frontend/core/services/auth_service.dart';
import 'package:nexus_frontend/core/utils/api_exception.dart';

class CognitiveLoopService {
  final http.Client _httpClient;
  final AuthService _authService;
  final ApiConfig _apiConfig;

  CognitiveLoopService({
    required http.Client httpClient,
    required AuthService authService,
    required ApiConfig apiConfig,
  })  : _httpClient = httpClient,
        _authService = authService,
        _apiConfig = apiConfig;

  // Base URL für die Cognitive Loop API
  String get _baseUrl => '${_apiConfig.baseUrl}/api/cognitive';

  // Erzeugt Headers für API-Requests mit dem Auth-Token
  Future<Map<String, String>> _getHeaders() async {
    final token = await _authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  // WebSocket URL für Echtzeit-Kommunikation
  String getWebsocketUrl(String discussionId) {
    return '${_apiConfig.wsBaseUrl}/api/cognitive/discussions/$discussionId/ws';
  }

  // Fehlerbehandlung für API-Responses
  void _handleErrorResponse(http.Response response) {
    if (response.statusCode >= 400) {
      final Map<String, dynamic> body = jsonDecode(response.body);
      final errorMessage = body['detail'] ?? 'Unbekannter Fehler';
      throw ApiException(
        message: errorMessage,
        statusCode: response.statusCode,
        body: body,
      );
    }
  }

  // Listet alle Diskussionen auf
  Future<List<Discussion>> getDiscussions({
    int limit = 10,
    int offset = 0,
    String? status,
  }) async {
    final queryParams = {
      'limit': limit.toString(),
      'offset': offset.toString(),
      if (status != null) 'status': status,
    };

    final uri = Uri.parse('$_baseUrl/discussions').replace(queryParameters: queryParams);
    final response = await _httpClient.get(uri, headers: await _getHeaders());

    _handleErrorResponse(response);

    final List<dynamic> data = jsonDecode(response.body);
    return data.map((json) => Discussion.fromJson(json)).toList();
  }

  // Erzeugt eine neue Diskussion
  Future<Discussion> createDiscussion({
    required String title,
    required String description,
    required String initialQuestion,
    String? topicId,
    List<String>? initialExperts,
  }) async {
    final uri = Uri.parse('$_baseUrl/discussions');
    final body = jsonEncode({
      'title': title,
      'description': description,
      'initial_question': initialQuestion,
      if (topicId != null) 'topic_id': topicId,
      if (initialExperts != null) 'initial_experts': initialExperts,
    });

    final response = await _httpClient.post(
      uri,
      headers: await _getHeaders(),
      body: body,
    );

    _handleErrorResponse(response);

    final data = jsonDecode(response.body);
    return Discussion.fromJson(data);
  }

  // Ruft Details einer Diskussion ab
  Future<Discussion> getDiscussion(String discussionId) async {
    final uri = Uri.parse('$_baseUrl/discussions/$discussionId');
    final response = await _httpClient.get(uri, headers: await _getHeaders());

    _handleErrorResponse(response);

    final data = jsonDecode(response.body);
    return Discussion.fromJson(data);
  }

  // Ruft Nachrichten einer Diskussion ab
  Future<List<DiscussionMessage>> getDiscussionMessages(
    String discussionId, {
    int limit = 50,
    String? beforeId,
  }) async {
    final queryParams = {
      'limit': limit.toString(),
      if (beforeId != null) 'before_id': beforeId,
    };

    final uri = Uri.parse('$_baseUrl/discussions/$discussionId/messages')
        .replace(queryParameters: queryParams);
    final response = await _httpClient.get(uri, headers: await _getHeaders());

    _handleErrorResponse(response);

    final List<dynamic> data = jsonDecode(response.body);
    return data.map((json) => DiscussionMessage.fromJson(json)).toList();
  }

  // Fügt eine Nachricht zu einer Diskussion hinzu
  Future<DiscussionMessage> addMessage(
    String discussionId,
    String content,
    String senderId,
    String senderType, {
    List<String>? references,
  }) async {
    final uri = Uri.parse('$_baseUrl/discussions/$discussionId/messages');
    final body = jsonEncode({
      'content': content,
      'sender_id': senderId,
      'sender_type': senderType,
      if (references != null) 'references': references,
    });

    final response = await _httpClient.post(
      uri,
      headers: await _getHeaders(),
      body: body,
    );

    _handleErrorResponse(response);

    final data = jsonDecode(response.body);
    return DiscussionMessage.fromJson(data);
  }

  // Generiert Expertenantworten auf eine Nachricht
  Future<List<DiscussionMessage>> generateExpertResponses(
    String discussionId,
    String messageId, {
    List<String>? expertiseAreas,
    List<String>? focusPoints,
    int? maxExperts,
  }) async {
    final uri = Uri.parse('$_baseUrl/discussions/$discussionId/expert-response');
    final body = jsonEncode({
      'message_id': messageId,
      if (expertiseAreas != null) 'expertise_areas': expertiseAreas,
      if (focusPoints != null) 'focus_points': focusPoints,
      if (maxExperts != null) 'max_experts': maxExperts,
    });

    final response = await _httpClient.post(
      uri,
      headers: await _getHeaders(),
      body: body,
    );

    _handleErrorResponse(response);

    final List<dynamic> data = jsonDecode(response.body);
    return data.map((json) => DiscussionMessage.fromJson(json)).toList();
  }

  // Ruft die Analyse einer Diskussion ab
  Future<DiscussionAnalysis> getDiscussionAnalysis(String discussionId) async {
    final uri = Uri.parse('$_baseUrl/discussions/$discussionId/analysis');
    final response = await _httpClient.get(uri, headers: await _getHeaders());

    _handleErrorResponse(response);

    final data = jsonDecode(response.body);
    return DiscussionAnalysis.fromJson(data);
  }

  // Aktualisiert und gibt die Fortschrittsanalyse zurück
  Future<DiscussionAnalysis> updateDiscussionProgress(
    String discussionId, {
    List<String>? focusAreas,
    bool detailedAnalysis = false,
  }) async {
    final uri = Uri.parse('$_baseUrl/discussions/$discussionId/progress');
    final body = jsonEncode({
      if (focusAreas != null) 'focus_areas': focusAreas,
      'detailed_analysis': detailedAnalysis,
    });

    final response = await _httpClient.post(
      uri,
      headers: await _getHeaders(),
      body: body,
    );

    _handleErrorResponse(response);

    final data = jsonDecode(response.body);
    return DiscussionAnalysis.fromJson(data);
  }

  // Schließt eine Diskussion
  Future<Discussion> closeDiscussion(String discussionId, {String? summary}) async {
    final uri = Uri.parse('$_baseUrl/discussions/$discussionId/close');
    final body = summary != null ? jsonEncode({'summary': summary}) : null;

    final response = await _httpClient.post(
      uri,
      headers: await _getHeaders(),
      body: body,
    );

    _handleErrorResponse(response);

    final data = jsonDecode(response.body);
    return Discussion.fromJson(data);
  }

  // Sucht nach Diskussionen
  Future<List<Discussion>> searchDiscussions(String query, {int limit = 10}) async {
    final queryParams = {
      'query': query,
      'limit': limit.toString(),
    };

    final uri = Uri.parse('$_baseUrl/discussions/search')
        .replace(queryParameters: queryParams);
    final response = await _httpClient.get(uri, headers: await _getHeaders());

    _handleErrorResponse(response);

    final List<dynamic> data = jsonDecode(response.body);
    return data.map((json) => Discussion.fromJson(json)).toList();
  }

  // Listet verfügbare Experten auf
  Future<List<ExpertProfile>> getExperts() async {
    final uri = Uri.parse('$_baseUrl/experts');
    final response = await _httpClient.get(uri, headers: await _getHeaders());

    _handleErrorResponse(response);

    final List<dynamic> data = jsonDecode(response.body);
    return data.map((json) => ExpertProfile.fromJson(json)).toList();
  }

  // Ruft einen Experten anhand seiner ID ab
  Future<ExpertProfile> getExpert(String expertId) async {
    final uri = Uri.parse('$_baseUrl/experts/$expertId');
    final response = await _httpClient.get(uri, headers: await _getHeaders());

    _handleErrorResponse(response);

    final data = jsonDecode(response.body);
    return ExpertProfile.fromJson(data);
  }

  // Erstellt einen benutzerdefinierten Experten
  Future<ExpertProfile> createCustomExpert({
    required String name,
    required String expertiseArea,
    required String description,
    Map<String, dynamic>? biasProfile,
    double? confidenceLevel,
    String? avatarUrl,
  }) async {
    final uri = Uri.parse('$_baseUrl/experts');
    final body = jsonEncode({
      'name': name,
      'expertise_area': expertiseArea,
      'description': description,
      if (biasProfile != null) 'bias_profile': biasProfile,
      if (confidenceLevel != null) 'confidence_level': confidenceLevel,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
    });

    final response = await _httpClient.post(
      uri,
      headers: await _getHeaders(),
      body: body,
    );

    _handleErrorResponse(response);

    final data = jsonDecode(response.body);
    return ExpertProfile.fromJson(data);
  }

  // Passt die Bias-Profile eines Experten an
  Future<ExpertProfile> adjustExpertBias(
    String expertId,
    Map<String, double> biasAdjustments,
  ) async {
    final uri = Uri.parse('$_baseUrl/experts/$expertId/bias');
    final body = jsonEncode({
      'bias_adjustments': biasAdjustments,
    });

    final response = await _httpClient.put(
      uri,
      headers: await _getHeaders(),
      body: body,
    );

    _handleErrorResponse(response);

    final data = jsonDecode(response.body);
    return ExpertProfile.fromJson(data);
  }
} 