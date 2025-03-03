// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'expert_profile.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ExpertProfile _$ExpertProfileFromJson(Map<String, dynamic> json) =>
    ExpertProfile(
      id: json['id'] as String,
      name: json['name'] as String,
      expertiseArea: json['expertise_area'] as String,
      description: json['description'] as String,
      biasProfile: json['bias_profile'] as Map<String, dynamic>,
      confidenceLevel: (json['confidence_level'] as num).toDouble(),
      avatarUrl: json['avatar_url'] as String?,
    );

Map<String, dynamic> _$ExpertProfileToJson(ExpertProfile instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'expertise_area': instance.expertiseArea,
      'description': instance.description,
      'bias_profile': instance.biasProfile,
      'confidence_level': instance.confidenceLevel,
      'avatar_url': instance.avatarUrl,
    };
