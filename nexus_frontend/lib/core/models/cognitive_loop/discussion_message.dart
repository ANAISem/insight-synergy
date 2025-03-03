import 'package:json_annotation/json_annotation.dart';

part 'discussion_message.g.dart';

@JsonSerializable()
class DiscussionMessage {
  final String id;
  @JsonKey(name: 'discussion_id')
  final String discussionId;
  @JsonKey(name: 'sender_id')
  final String senderId;
  @JsonKey(name: 'sender_type')
  final String senderType;
  final String content;
  @JsonKey(fromJson: _dateTimeFromJson, toJson: _dateTimeToJson)
  final DateTime timestamp;
  final List<String> references;
  @JsonKey(name: 'bias_analysis')
  final Map<String, dynamic>? biasAnalysis;
  @JsonKey(name: 'confidence_score')
  final double confidenceScore;
  @JsonKey(name: 'sentiment_analysis')
  final Map<String, dynamic>? sentimentAnalysis;

  DiscussionMessage({
    required this.id,
    required this.discussionId,
    required this.senderId,
    required this.senderType,
    required this.content,
    required this.timestamp,
    required this.references,
    this.biasAnalysis,
    required this.confidenceScore,
    this.sentimentAnalysis,
  });

  factory DiscussionMessage.fromJson(Map<String, dynamic> json) => _$DiscussionMessageFromJson(json);

  Map<String, dynamic> toJson() => _$DiscussionMessageToJson(this);

  static DateTime _dateTimeFromJson(String date) => DateTime.parse(date).toLocal();
  static String _dateTimeToJson(DateTime date) => date.toIso8601String();

  bool get isUserMessage => senderType == 'user';
  bool get isExpertMessage => senderType == 'expert';
  bool get hasReferences => references.isNotEmpty;
  bool get hasBiasAnalysis => biasAnalysis != null && biasAnalysis!.isNotEmpty;
  bool get hasSentimentAnalysis => sentimentAnalysis != null && sentimentAnalysis!.isNotEmpty;

  /// Returns a short excerpt of the content (first 50 chars)
  String get excerpt {
    if (content.length <= 50) return content;
    return content.substring(0, 47) + '...';
  }

  /// Returns the dominant bias type if available
  String? get dominantBiasType {
    if (!hasBiasAnalysis) return null;
    
    String? dominantType;
    double maxValue = 0.0;
    
    biasAnalysis!.forEach((type, value) {
      if (value is num && value > maxValue) {
        maxValue = value.toDouble();
        dominantType = type;
      }
    });
    
    return dominantType;
  }

  /// Returns the dominant bias value if available
  double? get dominantBiasValue {
    if (!hasBiasAnalysis || dominantBiasType == null) return null;
    
    final value = biasAnalysis![dominantBiasType];
    return value is num ? value.toDouble() : null;
  }

  /// Returns the message formatted for rendering in UI
  String get formattedContent {
    // This could be expanded to handle formatting, links, etc.
    return content;
  }

  DiscussionMessage copyWith({
    String? id,
    String? discussionId,
    String? senderId,
    String? senderType,
    String? content,
    DateTime? timestamp,
    List<String>? references,
    Map<String, dynamic>? biasAnalysis,
    double? confidenceScore,
    Map<String, dynamic>? sentimentAnalysis,
  }) {
    return DiscussionMessage(
      id: id ?? this.id,
      discussionId: discussionId ?? this.discussionId,
      senderId: senderId ?? this.senderId,
      senderType: senderType ?? this.senderType,
      content: content ?? this.content,
      timestamp: timestamp ?? this.timestamp,
      references: references ?? this.references,
      biasAnalysis: biasAnalysis ?? this.biasAnalysis,
      confidenceScore: confidenceScore ?? this.confidenceScore,
      sentimentAnalysis: sentimentAnalysis ?? this.sentimentAnalysis,
    );
  }
} 