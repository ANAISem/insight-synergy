import 'package:json_annotation/json_annotation.dart';
import 'knowledge_node.dart';
import 'knowledge_edge.dart';

part 'knowledge_graph.g.dart';

/// Modell für den Wissensgraphen, der Knoten und Kanten enthält
@JsonSerializable()
class KnowledgeGraph {
  /// Eindeutige ID des Graphen
  final String id;
  
  /// Name des Graphen
  final String name;
  
  /// Optionale Beschreibung des Graphen
  final String? description;
  
  /// Liste der Knoten im Graphen
  @JsonKey(defaultValue: [])
  final List<KnowledgeNode> nodes;
  
  /// Liste der Kanten im Graphen
  @JsonKey(defaultValue: [])
  final List<KnowledgeEdge> edges;
  
  /// Erstellungszeitpunkt des Graphen
  final DateTime createdAt;
  
  /// Zeitpunkt der letzten Aktualisierung
  final DateTime updatedAt;
  
  /// Metadaten für den Graphen
  @JsonKey(defaultValue: {})
  final Map<String, dynamic> metadata;
  
  KnowledgeGraph({
    required this.id,
    required this.name,
    this.description,
    List<KnowledgeNode>? nodes,
    List<KnowledgeEdge>? edges,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, dynamic>? metadata,
  }) : 
    this.nodes = nodes ?? [],
    this.edges = edges ?? [],
    this.createdAt = createdAt ?? DateTime.now(),
    this.updatedAt = updatedAt ?? DateTime.now(),
    this.metadata = metadata ?? {};
  
  /// Fabrikmethode für die JSON-Deserialisierung
  factory KnowledgeGraph.fromJson(Map<String, dynamic> json) =>
      _$KnowledgeGraphFromJson(json);
  
  /// Konvertierung in JSON für die Serialisierung
  Map<String, dynamic> toJson() => _$KnowledgeGraphToJson(this);
  
  /// Erstellt eine Kopie des Graphen mit aktualisierten Werten
  KnowledgeGraph copyWith({
    String? id,
    String? name,
    String? description,
    List<KnowledgeNode>? nodes,
    List<KnowledgeEdge>? edges,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, dynamic>? metadata,
  }) {
    return KnowledgeGraph(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      nodes: nodes ?? this.nodes,
      edges: edges ?? this.edges,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      metadata: metadata ?? this.metadata,
    );
  }
  
  /// Hinzufügen eines neuen Knotens
  KnowledgeGraph addNode(KnowledgeNode node) {
    final updatedNodes = List<KnowledgeNode>.from(nodes);
    updatedNodes.add(node);
    return copyWith(
      nodes: updatedNodes,
      updatedAt: DateTime.now(),
    );
  }
  
  /// Aktualisieren eines Knotens
  KnowledgeGraph updateNode(KnowledgeNode updatedNode) {
    final updatedNodes = nodes.map((node) => 
      node.id == updatedNode.id ? updatedNode : node
    ).toList();
    
    return copyWith(
      nodes: updatedNodes,
      updatedAt: DateTime.now(),
    );
  }
  
  /// Entfernen eines Knotens und seiner verbundenen Kanten
  KnowledgeGraph removeNode(String nodeId) {
    final updatedNodes = nodes.where((node) => node.id != nodeId).toList();
    final updatedEdges = edges.where((edge) => 
      edge.sourceId != nodeId && edge.targetId != nodeId
    ).toList();
    
    return copyWith(
      nodes: updatedNodes,
      edges: updatedEdges,
      updatedAt: DateTime.now(),
    );
  }
  
  /// Hinzufügen einer neuen Kante
  KnowledgeGraph addEdge(KnowledgeEdge edge) {
    final updatedEdges = List<KnowledgeEdge>.from(edges);
    updatedEdges.add(edge);
    return copyWith(
      edges: updatedEdges,
      updatedAt: DateTime.now(),
    );
  }
  
  /// Aktualisieren einer Kante
  KnowledgeGraph updateEdge(KnowledgeEdge updatedEdge) {
    final updatedEdges = edges.map((edge) => 
      edge.id == updatedEdge.id ? updatedEdge : edge
    ).toList();
    
    return copyWith(
      edges: updatedEdges,
      updatedAt: DateTime.now(),
    );
  }
  
  /// Entfernen einer Kante
  KnowledgeGraph removeEdge(String edgeId) {
    final updatedEdges = edges.where((edge) => edge.id != edgeId).toList();
    
    return copyWith(
      edges: updatedEdges,
      updatedAt: DateTime.now(),
    );
  }
  
  /// Abrufen aller verbundenen Kanten für einen Knoten
  List<KnowledgeEdge> getEdgesForNode(String nodeId) {
    return edges.where((edge) => 
      edge.sourceId == nodeId || edge.targetId == nodeId
    ).toList();
  }
  
  /// Abrufen aller direkt verbundenen Knoten
  List<KnowledgeNode> getConnectedNodes(String nodeId) {
    final connectedNodeIds = <String>{};
    
    for (final edge in edges) {
      if (edge.sourceId == nodeId) {
        connectedNodeIds.add(edge.targetId);
      } else if (edge.targetId == nodeId) {
        connectedNodeIds.add(edge.sourceId);
      }
    }
    
    return nodes.where((node) => connectedNodeIds.contains(node.id)).toList();
  }
  
  /// Freundlichere Darstellung für Debugging
  @override
  String toString() {
    return 'KnowledgeGraph(id: $id, name: $name, nodes: ${nodes.length}, edges: ${edges.length})';
  }
} 