// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'knowledge_item.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

KnowledgeItem _$KnowledgeItemFromJson(Map<String, dynamic> json) =>
    KnowledgeItem(
      id: json['id'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      source: json['source'] as String?,
      tags: (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList(),
      language: json['language'] as String?,
      relevanceScore: (json['relevanceScore'] as num?)?.toDouble() ?? 0.0,
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
    );

Map<String, dynamic> _$KnowledgeItemToJson(KnowledgeItem instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'content': instance.content,
      'source': instance.source,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'tags': instance.tags,
      'language': instance.language,
      'relevanceScore': instance.relevanceScore,
      'metadata': instance.metadata,
    };
