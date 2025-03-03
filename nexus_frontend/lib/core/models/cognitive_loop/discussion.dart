import 'package:json_annotation/json_annotation.dart';

part 'discussion.g.dart';

@JsonSerializable()
class Discussion {
  final String id;
  final String? topicId;
  final String title;
  final String description;
  final String status;
  @JsonKey(name: 'created_at', fromJson: _dateTimeFromJson, toJson: _dateTimeToJson)
  final DateTime createdAt;
  @JsonKey(name: 'updated_at', fromJson: _dateTimeFromJson, toJson: _dateTimeToJson)
  final DateTime updatedAt;
  @JsonKey(name: 'participants')
  final List<Map<String, dynamic>> participants;
  @JsonKey(name: 'message_count')
  final int messageCount;
  final String? summary;

  Discussion({
    required this.id,
    this.topicId,
    required this.title,
    required this.description,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.participants,
    required this.messageCount,
    this.summary,
  });

  factory Discussion.fromJson(Map<String, dynamic> json) => _$DiscussionFromJson(json);

  Map<String, dynamic> toJson() => _$DiscussionToJson(this);

  static DateTime _dateTimeFromJson(String date) => DateTime.parse(date).toLocal();
  static String _dateTimeToJson(DateTime date) => date.toIso8601String();

  bool get isActive => status == 'active';
  bool get isClosed => status == 'closed';

  List<String> get expertIds {
    return participants
        .where((participant) => participant['type'] == 'expert')
        .map((participant) => participant['id'] as String)
        .toList();
  }

  List<String> get expertNames {
    return participants
        .where((participant) => participant['type'] == 'expert')
        .map((participant) => participant['name'] as String)
        .toList();
  }

  Discussion copyWith({
    String? id,
    String? topicId,
    String? title,
    String? description,
    String? status,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<Map<String, dynamic>>? participants,
    int? messageCount,
    String? summary,
  }) {
    return Discussion(
      id: id ?? this.id,
      topicId: topicId ?? this.topicId,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      participants: participants ?? this.participants,
      messageCount: messageCount ?? this.messageCount,
      summary: summary ?? this.summary,
    );
  }
} 