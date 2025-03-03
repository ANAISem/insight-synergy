// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'discussion_message.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

DiscussionMessage _$DiscussionMessageFromJson(Map<String, dynamic> json) =>
    DiscussionMessage(
      id: json['id'] as String,
      discussionId: json['discussion_id'] as String,
      senderId: json['sender_id'] as String,
      senderType: json['sender_type'] as String,
      content: json['content'] as String,
      timestamp:
          DiscussionMessage._dateTimeFromJson(json['timestamp'] as String),
      references: (json['references'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      biasAnalysis: json['bias_analysis'] as Map<String, dynamic>?,
      confidenceScore: (json['confidence_score'] as num).toDouble(),
      sentimentAnalysis: json['sentiment_analysis'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$DiscussionMessageToJson(DiscussionMessage instance) =>
    <String, dynamic>{
      'id': instance.id,
      'discussion_id': instance.discussionId,
      'sender_id': instance.senderId,
      'sender_type': instance.senderType,
      'content': instance.content,
      'timestamp': DiscussionMessage._dateTimeToJson(instance.timestamp),
      'references': instance.references,
      'bias_analysis': instance.biasAnalysis,
      'confidence_score': instance.confidenceScore,
      'sentiment_analysis': instance.sentimentAnalysis,
    };
