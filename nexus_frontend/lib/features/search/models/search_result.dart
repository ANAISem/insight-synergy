import 'package:json_annotation/json_annotation.dart';
import '../../knowledge_base/models/knowledge_item.dart';

part 'search_result.g.dart';

/// Modell für ein Suchergebnis
@JsonSerializable()
class SearchResult {
  /// Wissenselement, das gefunden wurde
  final KnowledgeItem item;
  
  /// Relevanz-Score für dieses Suchergebnis (0.0-1.0)
  @JsonKey(defaultValue: 0.0)
  final double relevanceScore;
  
  /// Hervorgehobene Textstellen (für Anzeige in Suchergebnissen)
  @JsonKey(defaultValue: [])
  final List<String> highlights;
  
  /// Kontext um den gefundenen Text (für Vorschau)
  final String? context;
  
  /// Metadata für dieses Suchergebnis
  @JsonKey(defaultValue: {})
  final Map<String, dynamic> metadata;
  
  /// Konstruktor
  SearchResult({
    required this.item,
    this.relevanceScore = 0.0,
    List<String>? highlights,
    this.context,
    Map<String, dynamic>? metadata,
  }) :
    this.highlights = highlights ?? [],
    this.metadata = metadata ?? {};
  
  /// Fabrikmethode für die JSON-Deserialisierung
  factory SearchResult.fromJson(Map<String, dynamic> json) =>
      _$SearchResultFromJson(json);
  
  /// Konvertierung in JSON für die Serialisierung
  Map<String, dynamic> toJson() => _$SearchResultToJson(this);
  
  /// Erstellt eine Kopie des Suchergebnisses mit aktualisierten Werten
  SearchResult copyWith({
    KnowledgeItem? item,
    double? relevanceScore,
    List<String>? highlights,
    String? context,
    Map<String, dynamic>? metadata,
  }) {
    return SearchResult(
      item: item ?? this.item,
      relevanceScore: relevanceScore ?? this.relevanceScore,
      highlights: highlights ?? this.highlights,
      context: context ?? this.context,
      metadata: metadata ?? this.metadata,
    );
  }
  
  /// Gibt den ersten Highlight-Text zurück oder einen Fallback
  String getDisplayHighlight() {
    if (highlights.isNotEmpty) {
      return highlights.first;
    }
    
    if (context != null && context!.isNotEmpty) {
      return context!;
    }
    
    return item.contentPreview;
  }
  
  /// Freundlichere Darstellung für Debugging
  @override
  String toString() {
    return 'SearchResult(item: ${item.title}, score: $relevanceScore)';
  }
} 