import 'package:flutter/material.dart';

/// Zentrale Sammlung aller Farben für die App
class AppColors {
  // Primärfarben
  static const Color primary = Color(0xFF2C3E50);
  static const Color primaryDark = Color(0xFF3498DB);
  
  // Sekundärfarben
  static const Color secondary = Color(0xFF16A085);
  static const Color secondaryDark = Color(0xFF1ABC9C);
  
  // Hintergrundfarben
  static const Color backgroundLight = Color(0xFFF5F7FA);
  static const Color backgroundDark = Color(0xFF121212);
  
  // Textfarben
  static const Color textDark = Color(0xFF2C3E50);
  static const Color textLight = Color(0xFFECF0F1);
  static const Color textGrey = Color(0xFF95A5A6);
  
  // Statusfarben
  static const Color success = Color(0xFF27AE60);
  static const Color successDark = Color(0xFF2ECC71);
  static const Color error = Color(0xFFE74C3C);
  static const Color errorDark = Color(0xFFE74C3C);
  static const Color warning = Color(0xFFF39C12);
  static const Color info = Color(0xFF3498DB);
  
  // Zusätzliche Farben für die Wissensvisualisierung
  static const List<Color> knowledgeNodeColors = [
    Color(0xFF3498DB), // Blau
    Color(0xFF2ECC71), // Grün
    Color(0xFF9B59B6), // Lila
    Color(0xFFE67E22), // Orange
    Color(0xFFE74C3C), // Rot
    Color(0xFF1ABC9C), // Türkis
  ];
  
  // Graph-Farben
  static const Color nodeBorder = Color(0xFF34495E);
  static const Color nodeLabel = Color(0xFF2C3E50);
  static const Color edgeLine = Color(0xFF7F8C8D);
  
  // Farbverläufe
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF2C3E50), Color(0xFF3498DB)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient secondaryGradient = LinearGradient(
    colors: [Color(0xFF16A085), Color(0xFF1ABC9C)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
} 