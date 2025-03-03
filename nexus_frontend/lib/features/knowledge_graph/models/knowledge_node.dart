import 'package:json_annotation/json_annotation.dart';

part 'knowledge_node.g.dart';

/// Typ des Wissensknotens
enum KnowledgeNodeType {
  concept,   // Konzept oder Begriff
  document,  // Dokument oder Textstück
  entity,    // Benannte Entität
  tag,       // Tag oder Kategorie
  custom,    // Benutzerdefinierter Typ
}

/// Modell für einen Knoten im Wissensgraphen
@JsonSerializable()
class KnowledgeNode {
  /// Eindeutige ID des Knotens
  final String id;
  
  /// Name/Label des Knotens
  final String label;
  
  /// Beschreibung des Knotens
  final String? description;
  
  /// Typ des Knotens
  @JsonKey(unknownEnumValue: KnowledgeNodeType.custom)
  final KnowledgeNodeType type;
  
  /// Wichtigkeit des Knotens (beeinflusst visuelle Darstellung)
  @JsonKey(defaultValue: 1.0)
  final double importance;
  
  /// Referenz-ID (z.B. auf ein KnowledgeItem)
  final String? referenceId;
  
  /// Zusätzliche Eigenschaften
  @JsonKey(defaultValue: {})
  final Map<String, dynamic> properties;
  
  KnowledgeNode({
    required this.id,
    required this.label,
    this.description,
    required this.type,
    this.importance = 1.0,
    this.referenceId,
    Map<String, dynamic>? properties,
  }) : this.properties = properties ?? {};
  
  /// Fabrikmethode für die JSON-Deserialisierung
  factory KnowledgeNode.fromJson(Map<String, dynamic> json) =>
      _$KnowledgeNodeFromJson(json);
  
  /// Konvertierung in JSON für die Serialisierung
  Map<String, dynamic> toJson() => _$KnowledgeNodeToJson(this);
  
  /// Erstellt eine Kopie des Knotens mit aktualisierten Werten
  KnowledgeNode copyWith({
    String? id,
    String? label,
    String? description,
    KnowledgeNodeType? type,
    double? importance,
    String? referenceId,
    Map<String, dynamic>? properties,
  }) {
    return KnowledgeNode(
      id: id ?? this.id,
      label: label ?? this.label,
      description: description ?? this.description,
      type: type ?? this.type,
      importance: importance ?? this.importance,
      referenceId: referenceId ?? this.referenceId,
      properties: properties ?? this.properties,
    );
  }
  
  /// Freundlichere Darstellung für Debugging
  @override
  String toString() {
    return 'KnowledgeNode(id: $id, label: $label, type: $type)';
  }
} 