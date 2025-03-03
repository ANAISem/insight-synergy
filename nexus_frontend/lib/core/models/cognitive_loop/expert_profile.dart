import 'package:json_annotation/json_annotation.dart';

part 'expert_profile.g.dart';

@JsonSerializable()
class ExpertProfile {
  final String id;
  final String name;
  @JsonKey(name: 'expertise_area')
  final String expertiseArea;
  final String description;
  @JsonKey(name: 'bias_profile')
  final Map<String, dynamic> biasProfile;
  @JsonKey(name: 'confidence_level')
  final double confidenceLevel;
  @JsonKey(name: 'avatar_url')
  final String? avatarUrl;

  ExpertProfile({
    required this.id,
    required this.name,
    required this.expertiseArea,
    required this.description,
    required this.biasProfile,
    required this.confidenceLevel,
    this.avatarUrl,
  });

  factory ExpertProfile.fromJson(Map<String, dynamic> json) => _$ExpertProfileFromJson(json);

  Map<String, dynamic> toJson() => _$ExpertProfileToJson(this);

  /// Returns the dominant bias type in the expert's profile
  String? get dominantBiasType {
    if (biasProfile.isEmpty) return null;
    
    String? dominantType;
    double maxValue = 0.0;
    
    biasProfile.forEach((type, value) {
      if (value is num && value > maxValue) {
        maxValue = value.toDouble();
        dominantType = type;
      }
    });
    
    return dominantType;
  }

  /// Returns the dominant bias value in the expert's profile
  double? get dominantBiasValue {
    if (biasProfile.isEmpty || dominantBiasType == null) return null;
    
    final value = biasProfile[dominantBiasType];
    return value is num ? value.toDouble() : null;
  }

  /// Returns a short description of the expert (first 100 chars)
  String get shortDescription {
    if (description.length <= 100) return description;
    return description.substring(0, 97) + '...';
  }

  /// Returns true if the expert has a high confidence level
  bool get isHighConfidence => confidenceLevel >= 0.8;

  /// Returns true if the expert has a low confidence level
  bool get isLowConfidence => confidenceLevel <= 0.4;

  /// Returns the avatar URL or a default one if not provided
  String get avatar {
    return avatarUrl ?? 'https://ui-avatars.com/api/?name=${Uri.encodeComponent(name)}&background=random';
  }

  /// Returns bias values formatted for easier display
  Map<String, double> get formattedBiasProfile {
    final result = <String, double>{};
    
    biasProfile.forEach((type, value) {
      if (value is num) {
        result[type] = value.toDouble();
      }
    });
    
    return result;
  }

  /// Returns a formatted display of the confidence level as a percentage
  String get formattedConfidenceLevel {
    return '${(confidenceLevel * 100).toStringAsFixed(0)}%';
  }

  ExpertProfile copyWith({
    String? id,
    String? name,
    String? expertiseArea,
    String? description,
    Map<String, dynamic>? biasProfile,
    double? confidenceLevel,
    String? avatarUrl,
  }) {
    return ExpertProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      expertiseArea: expertiseArea ?? this.expertiseArea,
      description: description ?? this.description,
      biasProfile: biasProfile ?? this.biasProfile,
      confidenceLevel: confidenceLevel ?? this.confidenceLevel,
      avatarUrl: avatarUrl ?? this.avatarUrl,
    );
  }
} 