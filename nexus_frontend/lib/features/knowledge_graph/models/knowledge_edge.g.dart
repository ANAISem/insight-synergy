// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'knowledge_edge.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

KnowledgeEdge _$KnowledgeEdgeFromJson(Map<String, dynamic> json) =>
    KnowledgeEdge(
      id: json['id'] as String,
      sourceId: json['sourceId'] as String,
      targetId: json['targetId'] as String,
      type: $enumDecode(_$RelationshipTypeEnumMap, json['type'],
          unknownValue: RelationshipType.custom),
      label: json['label'] as String?,
      strength: (json['strength'] as num?)?.toDouble() ?? 1.0,
      directed: json['directed'] as bool? ?? true,
      properties: json['properties'] as Map<String, dynamic>? ?? {},
    );

Map<String, dynamic> _$KnowledgeEdgeToJson(KnowledgeEdge instance) =>
    <String, dynamic>{
      'id': instance.id,
      'sourceId': instance.sourceId,
      'targetId': instance.targetId,
      'type': _$RelationshipTypeEnumMap[instance.type]!,
      'label': instance.label,
      'strength': instance.strength,
      'directed': instance.directed,
      'properties': instance.properties,
    };

const _$RelationshipTypeEnumMap = {
  RelationshipType.related: 'related',
  RelationshipType.references: 'references',
  RelationshipType.includes: 'includes',
  RelationshipType.causes: 'causes',
  RelationshipType.opposes: 'opposes',
  RelationshipType.similar: 'similar',
  RelationshipType.instance: 'instance',
  RelationshipType.tag: 'tag',
  RelationshipType.custom: 'custom',
};
