import 'package:json_annotation/json_annotation.dart';

part 'knowledge_edge.g.dart';

/// Typ der Beziehung zwischen Wissensknoten
enum RelationshipType {
  related,     // Allgemeine Beziehung
  references,  // Verweist auf
  includes,    // Beinhaltet/Teil von
  causes,      // Verursacht/Führt zu
  opposes,     // Steht im Gegensatz zu
  similar,     // Ähnlich zu
  instance,    // Instanz von
  tag,         // Hat Tag/Kategorie
  custom,      // Benutzerdefinierte Beziehung
}

/// Modell für eine Kante im Wissensgraphen
@JsonSerializable()
class KnowledgeEdge {
  /// Eindeutige ID der Kante
  final String id;
  
  /// ID des Quellknotens
  final String sourceId;
  
  /// ID des Zielknotens
  final String targetId;
  
  /// Typ der Beziehung
  @JsonKey(unknownEnumValue: RelationshipType.custom)
  final RelationshipType type;
  
  /// Optionale Beschreibung der Beziehung
  final String? label;
  
  /// Stärke der Beziehung (beeinflusst visuelle Darstellung)
  @JsonKey(defaultValue: 1.0)
  final double strength;
  
  /// Gerichtet oder ungerichtet
  @JsonKey(defaultValue: true)
  final bool directed;
  
  /// Zusätzliche Eigenschaften
  @JsonKey(defaultValue: {})
  final Map<String, dynamic> properties;
  
  KnowledgeEdge({
    required this.id,
    required this.sourceId,
    required this.targetId,
    required this.type,
    this.label,
    this.strength = 1.0,
    this.directed = true,
    Map<String, dynamic>? properties,
  }) : this.properties = properties ?? {};
  
  /// Fabrikmethode für die JSON-Deserialisierung
  factory KnowledgeEdge.fromJson(Map<String, dynamic> json) =>
      _$KnowledgeEdgeFromJson(json);
  
  /// Konvertierung in JSON für die Serialisierung
  Map<String, dynamic> toJson() => _$KnowledgeEdgeToJson(this);
  
  /// Erstellt eine Kopie der Kante mit aktualisierten Werten
  KnowledgeEdge copyWith({
    String? id,
    String? sourceId,
    String? targetId,
    RelationshipType? type,
    String? label,
    double? strength,
    bool? directed,
    Map<String, dynamic>? properties,
  }) {
    return KnowledgeEdge(
      id: id ?? this.id,
      sourceId: sourceId ?? this.sourceId,
      targetId: targetId ?? this.targetId,
      type: type ?? this.type,
      label: label ?? this.label,
      strength: strength ?? this.strength,
      directed: directed ?? this.directed,
      properties: properties ?? this.properties,
    );
  }
  
  /// Freundlichere Darstellung für Debugging
  @override
  String toString() {
    return 'KnowledgeEdge(id: $id, source: $sourceId, target: $targetId, type: $type)';
  }
} 