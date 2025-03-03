import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

/// Knotenfarben für den Wissensgraphen
class NodeColors {
  final Color concept;
  final Color document;
  final Color entity;
  final Color tag;
  final Color custom;

  const NodeColors({
    required this.concept,
    required this.document,
    required this.entity,
    required this.tag,
    required this.custom,
  });

  static NodeColors light = const NodeColors(
    concept: Color(0xFFF57C00),  // Orange
    document: Color(0xFF1976D2),  // Blau
    entity: Color(0xFF388E3C),  // Grün
    tag: Color(0xFF7B1FA2),  // Lila
    custom: Color(0xFF607D8B),  // Blaugrau
  );

  static NodeColors dark = const NodeColors(
    concept: Color(0xFFFFB74D),  // Helles Orange
    document: Color(0xFF64B5F6),  // Helles Blau
    entity: Color(0xFF81C784),  // Helles Grün
    tag: Color(0xFFBA68C8),  // Helles Lila
    custom: Color(0xFF90A4AE),  // Helles Blaugrau
  );
}

/// Kantenfarben für den Wissensgraphen
class EdgeColors {
  final Color related;
  final Color references;
  final Color includes;
  final Color causes;
  final Color opposes;
  final Color similar;
  final Color instance;
  final Color tag;
  final Color custom;

  const EdgeColors({
    required this.related,
    required this.references,
    required this.includes,
    required this.causes,
    required this.opposes,
    required this.similar,
    required this.instance,
    required this.tag,
    required this.custom,
  });

  static EdgeColors light = const EdgeColors(
    related: Color(0xFF78909C),  // Blaugrau
    references: Color(0xFF1976D2),  // Blau
    includes: Color(0xFF388E3C),  // Grün
    causes: Color(0xFFD32F2F),  // Rot
    opposes: Color(0xFFC2185B),  // Pink
    similar: Color(0xFF7B1FA2),  // Lila
    instance: Color(0xFF5E35B1),  // Indigo
    tag: Color(0xFF00796B),  // Türkis
    custom: Color(0xFF455A64),  // Dunkelblaugrau
  );

  static EdgeColors dark = const EdgeColors(
    related: Color(0xFFB0BEC5),  // Helles Blaugrau
    references: Color(0xFF64B5F6),  // Helles Blau
    includes: Color(0xFF81C784),  // Helles Grün
    causes: Color(0xFFE57373),  // Helles Rot
    opposes: Color(0xFFF06292),  // Helles Pink
    similar: Color(0xFFBA68C8),  // Helles Lila
    instance: Color(0xFF9575CD),  // Helles Indigo
    tag: Color(0xFF4DB6AC),  // Helles Türkis
    custom: Color(0xFF78909C),  // Helles Dunkelblaugrau
  );
}

/// Zentrale Konfiguration für das App-Theme
class AppTheme {
  final ThemeData theme;
  final Color graphBackgroundColor;
  final NodeColors nodeColors;
  final EdgeColors edgeColors;

  AppTheme({
    required this.theme,
    required this.graphBackgroundColor,
    required this.nodeColors,
    required this.edgeColors,
  });

  // Factory-Methode, um die App-Theme aus dem BuildContext zu holen
  static AppTheme of(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? _darkAppTheme : _lightAppTheme;
  }

  static final _lightAppTheme = AppTheme(
    theme: lightTheme,
    graphBackgroundColor: const Color(0xFFF5F5F5),
    nodeColors: NodeColors.light,
    edgeColors: EdgeColors.light,
  );

  static final _darkAppTheme = AppTheme(
    theme: darkTheme,
    graphBackgroundColor: const Color(0xFF121212),
    nodeColors: NodeColors.dark,
    edgeColors: EdgeColors.dark,
  );

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.backgroundLight,
      colorScheme: ColorScheme.light(
        primary: AppColors.primary,
        onPrimary: Colors.white,
        secondary: AppColors.secondary,
        onSecondary: Colors.white,
        surface: Colors.white,
        background: AppColors.backgroundLight,
        error: AppColors.error,
      ),
      textTheme: GoogleFonts.robotoTextTheme(
        ThemeData.light().textTheme,
      ),
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        iconTheme: IconThemeData(color: AppColors.textDark),
      ),
      cardTheme: CardTheme(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.grey[100],
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppColors.primaryDark,
      scaffoldBackgroundColor: AppColors.backgroundDark,
      colorScheme: ColorScheme.dark(
        primary: AppColors.primaryDark,
        onPrimary: Colors.white,
        secondary: AppColors.secondaryDark,
        onSecondary: Colors.white,
        surface: const Color(0xFF1E1E1E),
        background: AppColors.backgroundDark,
        error: AppColors.errorDark,
      ),
      textTheme: GoogleFonts.robotoTextTheme(
        ThemeData.dark().textTheme,
      ),
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        elevation: 0,
        backgroundColor: Color(0xFF1E1E1E),
        foregroundColor: AppColors.textLight,
        iconTheme: IconThemeData(color: AppColors.textLight),
      ),
      cardTheme: CardTheme(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        color: const Color(0xFF2A2A2A),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryDark,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primaryDark,
          side: const BorderSide(color: AppColors.primaryDark),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF2A2A2A),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.primaryDark),
        ),
      ),
    );
  }
} 