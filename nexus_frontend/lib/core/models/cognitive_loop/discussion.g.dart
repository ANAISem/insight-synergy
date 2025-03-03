// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'discussion.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Discussion _$DiscussionFromJson(Map<String, dynamic> json) => Discussion(
      id: json['id'] as String,
      topicId: json['topicId'] as String?,
      title: json['title'] as String,
      description: json['description'] as String,
      status: json['status'] as String,
      createdAt: Discussion._dateTimeFromJson(json['created_at'] as String),
      updatedAt: Discussion._dateTimeFromJson(json['updated_at'] as String),
      participants: (json['participants'] as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList(),
      messageCount: (json['message_count'] as num).toInt(),
      summary: json['summary'] as String?,
    );

Map<String, dynamic> _$DiscussionToJson(Discussion instance) =>
    <String, dynamic>{
      'id': instance.id,
      'topicId': instance.topicId,
      'title': instance.title,
      'description': instance.description,
      'status': instance.status,
      'created_at': Discussion._dateTimeToJson(instance.createdAt),
      'updated_at': Discussion._dateTimeToJson(instance.updatedAt),
      'participants': instance.participants,
      'message_count': instance.messageCount,
      'summary': instance.summary,
    };
