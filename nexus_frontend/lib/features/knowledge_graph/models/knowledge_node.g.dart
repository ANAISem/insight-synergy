// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'knowledge_node.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

KnowledgeNode _$KnowledgeNodeFromJson(Map<String, dynamic> json) =>
    KnowledgeNode(
      id: json['id'] as String,
      label: json['label'] as String,
      description: json['description'] as String?,
      type: $enumDecode(_$KnowledgeNodeTypeEnumMap, json['type'],
          unknownValue: KnowledgeNodeType.custom),
      importance: (json['importance'] as num?)?.toDouble() ?? 1.0,
      referenceId: json['referenceId'] as String?,
      properties: json['properties'] as Map<String, dynamic>? ?? {},
    );

Map<String, dynamic> _$KnowledgeNodeToJson(KnowledgeNode instance) =>
    <String, dynamic>{
      'id': instance.id,
      'label': instance.label,
      'description': instance.description,
      'type': _$KnowledgeNodeTypeEnumMap[instance.type]!,
      'importance': instance.importance,
      'referenceId': instance.referenceId,
      'properties': instance.properties,
    };

const _$KnowledgeNodeTypeEnumMap = {
  KnowledgeNodeType.concept: 'concept',
  KnowledgeNodeType.document: 'document',
  KnowledgeNodeType.entity: 'entity',
  KnowledgeNodeType.tag: 'tag',
  KnowledgeNodeType.custom: 'custom',
};
