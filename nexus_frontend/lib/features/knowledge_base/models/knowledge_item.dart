import 'package:json_annotation/json_annotation.dart';

part 'knowledge_item.g.dart';

/// Modell für eine Wissenseinheit im System
@JsonSerializable()
class KnowledgeItem {
  /// Eindeutige ID des Wissenseintrags
  final String id;
  
  /// Titel des Wissenseintrags
  final String title;
  
  /// Hauptinhalt des Wissenseintrags
  final String content;
  
  /// Quelle des Wissens (URL, Buch, etc.)
  final String? source;
  
  /// Zeitpunkt der Erstellung des Eintrags
  final DateTime createdAt;
  
  /// Zeitpunkt der letzten Aktualisierung
  final DateTime updatedAt;
  
  /// Liste von Tags/Schlagwörtern für diesen Eintrag
  final List<String> tags;
  
  /// Sprache des Inhalts (ISO-Code)
  final String? language;
  
  /// Relevanz-Score (0.0-1.0), wird bei Suchergebnissen gesetzt
  @JsonKey(defaultValue: 0.0)
  final double relevanceScore;
  
  /// Zusätzliche Metadaten
  @JsonKey(defaultValue: {})
  final Map<String, dynamic> metadata;
  
  KnowledgeItem({
    required this.id,
    required this.title,
    required this.content,
    required this.createdAt,
    required this.updatedAt,
    this.source,
    List<String>? tags,
    this.language,
    this.relevanceScore = 0.0,
    Map<String, dynamic>? metadata,
  }) : 
    this.tags = tags ?? [],
    this.metadata = metadata ?? {};
  
  /// Fabrikmethode für die JSON-Deserialisierung
  factory KnowledgeItem.fromJson(Map<String, dynamic> json) => 
      _$KnowledgeItemFromJson(json);
  
  /// Konvertierung in JSON für die Serialisierung
  Map<String, dynamic> toJson() => _$KnowledgeItemToJson(this);
  
  /// Erstellt eine Kopie dieser Wissenseinheit mit aktualisierten Werten
  KnowledgeItem copyWith({
    String? id,
    String? title,
    String? content,
    String? source,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<String>? tags,
    String? language,
    double? relevanceScore,
    Map<String, dynamic>? metadata,
  }) {
    return KnowledgeItem(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      source: source ?? this.source,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      tags: tags ?? this.tags,
      language: language ?? this.language,
      relevanceScore: relevanceScore ?? this.relevanceScore,
      metadata: metadata ?? this.metadata,
    );
  }
  
  /// Kurze Zusammenfassung des Inhalts (für Previews)
  String get contentPreview {
    if (content.length <= 150) return content;
    return '${content.substring(0, 150)}...';
  }
  
  /// Überprüfen, ob die Wissenseinheit ein bestimmtes Tag enthält
  bool hasTag(String tag) {
    return tags.contains(tag.toLowerCase());
  }
  
  /// Freundlichere Darstellung für Debugging
  @override
  String toString() {
    return 'KnowledgeItem(id: $id, title: $title, tags: $tags, relevance: $relevanceScore)';
  }
} 