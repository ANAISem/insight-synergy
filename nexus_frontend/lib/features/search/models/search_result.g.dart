// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'search_result.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SearchResult _$SearchResultFromJson(Map<String, dynamic> json) => SearchResult(
      item: KnowledgeItem.fromJson(json['item'] as Map<String, dynamic>),
      relevanceScore: (json['relevanceScore'] as num?)?.toDouble() ?? 0.0,
      highlights: (json['highlights'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      context: json['context'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
    );

Map<String, dynamic> _$SearchResultToJson(SearchResult instance) =>
    <String, dynamic>{
      'item': instance.item,
      'relevanceScore': instance.relevanceScore,
      'highlights': instance.highlights,
      'context': instance.context,
      'metadata': instance.metadata,
    };
