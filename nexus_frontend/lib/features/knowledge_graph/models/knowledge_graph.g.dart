// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'knowledge_graph.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

KnowledgeGraph _$KnowledgeGraphFromJson(Map<String, dynamic> json) =>
    KnowledgeGraph(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      nodes: (json['nodes'] as List<dynamic>?)
              ?.map((e) => KnowledgeNode.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      edges: (json['edges'] as List<dynamic>?)
              ?.map((e) => KnowledgeEdge.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      updatedAt: json['updatedAt'] == null
          ? null
          : DateTime.parse(json['updatedAt'] as String),
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
    );

Map<String, dynamic> _$KnowledgeGraphToJson(KnowledgeGraph instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'nodes': instance.nodes,
      'edges': instance.edges,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'metadata': instance.metadata,
    };
