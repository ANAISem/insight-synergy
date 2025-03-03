import 'dart:convert';

import '../exceptions/api_exception.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

/// Request-Klasse für Nexus-Anfragen
class NexusRequest {
  final String query;
  final String? context;
  final List<String>? goals;

  NexusRequest({
    required this.query,
    this.context,
    this.goals,
  });

  Map<String, dynamic> toJson() {
    return {
      'query': query,
      if (context != null) 'context': context,
      if (goals != null) 'goals': goals,
    };
  }
}

/// Response-Klasse für Nexus-Antworten
class NexusResponse {
  final String solution;
  final List<String> steps;
  final String model;
  final int? tokenCount;
  final double? processingTime;

  NexusResponse({
    required this.solution,
    required this.steps,
    required this.model,
    this.tokenCount,
    this.processingTime,
  });

  factory NexusResponse.fromJson(Map<String, dynamic> json) {
    return NexusResponse(
      solution: json['solution'],
      steps: List<String>.from(json['steps']),
      model: json['model'] ?? 'Mistral 7B',
      tokenCount: json['token_count'],
      processingTime: json['processing_time']?.toDouble(),
    );
  }
}

/// Service für die Kommunikation mit dem Nexus-Backend
class NexusService {
  final ApiService _apiService;
  final AuthService _authService;
  
  static const String _baseEndpoint = '/api/nexus';

  NexusService(this._apiService, this._authService);

  /// Analysiert eine Anfrage mit dem Analyse-Modus von The Nexus
  Future<NexusResponse> analyzeQuery(NexusRequest request) async {
    try {
      final token = await _authService.getToken();
      final response = await _apiService.post(
        '$_baseEndpoint/analyze',
        body: json.encode(request.toJson()),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decodedResponse = json.decode(response.body);
        return NexusResponse.fromJson(decodedResponse);
      } else {
        throw ApiException(
          response.statusCode,
          response.body,
          'Fehler bei der Analyse-Anfrage',
        );
      }
    } catch (e) {
      if (e is ApiException) {
        rethrow;
      }
      throw ApiException(
        500,
        e.toString(),
        'Unerwarteter Fehler bei der Nexus-Anfrage',
      );
    }
  }

  /// Generiert eine Lösung für ein Problem mit The Nexus
  Future<NexusResponse> generateSolution(NexusRequest request) async {
    try {
      final token = await _authService.getToken();
      final response = await _apiService.post(
        '$_baseEndpoint/solution',
        body: json.encode(request.toJson()),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decodedResponse = json.decode(response.body);
        return NexusResponse.fromJson(decodedResponse);
      } else {
        throw ApiException(
          response.statusCode,
          response.body,
          'Fehler bei der Lösungsgenerierung',
        );
      }
    } catch (e) {
      if (e is ApiException) {
        rethrow;
      }
      throw ApiException(
        500,
        e.toString(),
        'Unerwarteter Fehler bei der Nexus-Anfrage',
      );
    }
  }

  /// Prüft den Status des Nexus-Services und des Mistral-Modells
  Future<bool> checkStatus() async {
    try {
      final response = await _apiService.get('$_baseEndpoint/status');

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decodedResponse = json.decode(response.body);
        return decodedResponse['status'] == 'available';
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  /// Demo-Funktionalität für Tests ohne Backend-Verbindung
  Future<NexusResponse> generateDemoSolution(NexusRequest request) async {
    // Verzögerung simulieren
    await Future.delayed(const Duration(seconds: 2));
    
    return NexusResponse(
      solution: '''
# Lösungsvorschlag für: ${request.query}

## Analyse des Problems
${request.query} stellt ein komplexes Problem dar, das mehrere Facetten hat:
1. Die Hauptherausforderung liegt in der Strukturierung und Organisation der Daten
2. Es gibt verschiedene Stakeholder mit unterschiedlichen Interessen
3. Die Skalierbarkeit der Lösung muss berücksichtigt werden

## Empfohlene Lösung
Eine mehrstufige Strategie ist hier am sinnvollsten:

1. Zunächst sollten die Anforderungen klar definiert werden
2. Die Datenstrukturen müssen entsprechend modelliert werden
3. Ein iterativer Entwicklungsprozess ermöglicht kontinuierliches Feedback
4. Automatisierte Tests sichern die Qualität
5. Dokumentation für alle Beteiligten erstellen

## Technische Umsetzung
```dart
// Beispiel-Implementierung eines zentralen Datenmodells
class SolutionModel {
  final String id;
  final String title;
  final List<Step> steps;
  
  SolutionModel({
    required this.id,
    required this.title,
    required this.steps,
  });
}
```

## Nächste Schritte
1. Erstellen eines Prototyps
2. Sammeln von Feedback
3. Iterative Verbesserung
4. Ausrollen der Lösung
      ''',
      steps: [
        'Problem analysieren',
        'Strategie entwickeln',
        'Technische Lösung implementieren',
        'Qualitätssicherung durchführen',
        'Dokumentation erstellen',
      ],
      model: 'Mistral 7B (Demo)',
      processingTime: 1.5,
      tokenCount: 750,
    );
  }

  /// Demo-Funktionalität für Tests ohne Backend-Verbindung
  Future<NexusResponse> generateDemoAnalysis(NexusRequest request) async {
    // Verzögerung simulieren
    await Future.delayed(const Duration(seconds: 2));
    
    return NexusResponse(
      solution: '''
# Strukturierte Analyse von: ${request.query}

## Zerlegung des Problems
1. **Kernaspekte**:
   - Hauptfragestellung: ${request.query.split('.').first}
   - Komplexitätsgrad: Mittel bis hoch
   - Domänenspezifisches Wissen erforderlich: Ja

2. **Kontextuelle Faktoren**:
   ${request.context != null ? '- Berücksichtigter Kontext: ${request.context}' : '- Kein spezifischer Kontext angegeben'}
   - Relevante Einflussfaktoren: Technologie, Marktbedingungen, Ressourcenverfügbarkeit

## Hauptkomponenten der Analyse
1. **Technische Dimension**:
   - Erforderliche Technologien: Cloud-Infrastruktur, Datenbanksysteme, API-Management
   - Skalierbarkeitsanforderungen: Hoch
   - Integration mit bestehenden Systemen: Mittlerer Komplexitätsgrad

2. **Organisatorische Dimension**:
   - Stakeholder-Management: 5-7 Hauptbeteiligte
   - Change-Management-Bedarf: Signifikant
   - Schulungsbedarf: Moderat

3. **Wirtschaftliche Dimension**:
   - Investitionsbedarf: Mittel bis hoch
   - ROI-Zeitrahmen: 18-24 Monate
   - Risikofaktoren: Technologische Veralterung, Marktveränderungen

## Handlungsempfehlungen
1. Detaillierte Anforderungsanalyse durchführen
2. Proof-of-Concept für kritische Komponenten entwickeln
3. Stakeholder-Workshop zur Validierung der Anforderungen organisieren
4. Risikomanagement-Plan erstellen
5. Iterativen Implementierungsplan mit Meilensteinen entwickeln

## Entscheidungsmatrix
| Option | Vorteile | Nachteile | Empfehlungsgrad |
|--------|----------|-----------|-----------------|
| Option A | Schnelle Implementierung | Höhere Wartungskosten | Mittel |
| Option B | Höhere Flexibilität | Komplexere Umsetzung | Hoch |
| Option C | Kostengünstig | Eingeschränkte Funktionalität | Niedrig |
      ''',
      steps: [
        'Problemzerlegung',
        'Kontextanalyse',
        'Dimensionale Bewertung',
        'Handlungsempfehlungen',
        'Entscheidungsmatrix',
      ],
      model: 'Mistral 7B (Demo)',
      processingTime: 1.8,
      tokenCount: 820,
    );
  }
} 