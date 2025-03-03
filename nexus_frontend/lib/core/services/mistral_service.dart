import 'dart:convert';
import 'package:http/http.dart' as http;

import '../exceptions/api_exception.dart';
import 'package:flutter/foundation.dart';

/// Service für die Kommunikation mit dem Mistral-Backend
class MistralService {
  final String baseUrl;
  
  MistralService({required this.baseUrl});
  
  /// Führt einen Chat mit dem Mistral-Modell durch
  Future<ChatResponse> chat(ChatRequest request) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/mistral/chat'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode(request.toJson()),
      );
      
      if (response.statusCode == 200) {
        return ChatResponse.fromJson(jsonDecode(response.body));
      } else {
        throw ApiException(
          response.statusCode,
          response.body,
          'Fehler beim Chat-API-Aufruf'
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        500,
        e.toString(),
        'Interner Fehler beim Chat-API-Aufruf'
      );
    }
  }
  
  /// Generiert Text mit dem Mistral-Modell
  Future<ChatResponse> generateText(TextGenerationRequest request) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/mistral/generate'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode(request.toJson()),
      );
      
      if (response.statusCode == 200) {
        return ChatResponse.fromJson(jsonDecode(response.body));
      } else {
        throw ApiException(
          response.statusCode,
          response.body,
          'Fehler beim Knowledge-API-Aufruf'
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        500,
        e.toString(),
        'Interner Fehler beim Knowledge-API-Aufruf'
      );
    }
  }
  
  /// Führt einen Cognitive Loop mit dem Mistral-Modell durch
  Future<ChatResponse> cognitiveLoop(ChatRequest request) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/mistral/cognitive-loop'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode(request.toJson()),
      );
      
      if (response.statusCode == 200) {
        return ChatResponse.fromJson(jsonDecode(response.body));
      } else {
        throw ApiException(
          response.statusCode,
          response.body,
          'Fehler beim Cognitive Loop'
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        500,
        e.toString(),
        'Interner Fehler beim Cognitive Loop'
      );
    }
  }
  
  /// Überprüft den Status des Mistral-Modells
  Future<StatusResponse> checkStatus() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/mistral/status'),
        headers: {
          'Content-Type': 'application/json',
        },
      );
      
      if (response.statusCode == 200) {
        return StatusResponse.fromJson(jsonDecode(response.body));
      } else {
        throw ApiException(
          response.statusCode,
          response.body,
          'Fehler bei der Statusabfrage'
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        500,
        e.toString(),
        'Interner Fehler bei der Statusabfrage'
      );
    }
  }
}

/// Anfrage für Chat-Anfragen
class ChatRequest {
  final List<Message> messages;
  final double temperature;
  final int maxTokens;
  
  ChatRequest({
    required this.messages,
    this.temperature = 0.7,
    this.maxTokens = 2000,
  });
  
  Map<String, dynamic> toJson() {
    return {
      'messages': messages.map((msg) => msg.toJson()).toList(),
      'temperature': temperature,
      'max_tokens': maxTokens,
    };
  }
}

/// Nachricht im Chat
class Message {
  final String role;
  final String content;
  
  Message({
    required this.role,
    required this.content,
  });
  
  Map<String, dynamic> toJson() {
    return {
      'role': role,
      'content': content,
    };
  }
}

/// Anfrage für Textgenerierung
class TextGenerationRequest {
  final String prompt;
  final String? systemPrompt;
  final double temperature;
  final int maxTokens;
  
  TextGenerationRequest({
    required this.prompt,
    this.systemPrompt,
    this.temperature = 0.7,
    this.maxTokens = 2000,
  });
  
  Map<String, dynamic> toJson() {
    final Map<String, dynamic> json = {
      'prompt': prompt,
      'temperature': temperature,
      'max_tokens': maxTokens,
    };
    
    if (systemPrompt != null) {
      json['system_prompt'] = systemPrompt;
    }
    
    return json;
  }
}

/// Antwort für Chat und Textgenerierung
class ChatResponse {
  final String response;
  final Map<String, dynamic>? usage;
  final String model;
  
  ChatResponse({
    required this.response,
    this.usage,
    required this.model,
  });
  
  factory ChatResponse.fromJson(Map<String, dynamic> json) {
    return ChatResponse(
      response: json['response'],
      usage: json['usage'],
      model: json['model'],
    );
  }
}

/// Antwort für Statusabfragen
class StatusResponse {
  final String status;
  final String modelName;
  final Map<String, dynamic>? details;
  
  StatusResponse({
    required this.status,
    required this.modelName,
    this.details,
  });
  
  factory StatusResponse.fromJson(Map<String, dynamic> json) {
    return StatusResponse(
      status: json['status'],
      modelName: json['model_name'],
      details: json['details'],
    );
  }
}