import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../models/knowledge_node.dart';

/// Widget zur Anzeige eines Knotens im Wissensgraphen
class NodeWidget extends StatelessWidget {
  final KnowledgeNode node;
  final bool isSelected;
  final VoidCallback onTap;
  final double width;
  final double height;

  const NodeWidget({
    Key? key,
    required this.node,
    required this.isSelected,
    required this.onTap,
    this.width = 140,
    this.height = 60,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final appTheme = AppTheme.of(context);
    final theme = Theme.of(context);

    // Farbe basierend auf Knotentyp bestimmen
    Color primaryColor;
    IconData? nodeIcon;

    switch (node.type) {
      case KnowledgeNodeType.concept:
        primaryColor = appTheme.nodeColors.concept;
        nodeIcon = Icons.lightbulb_outline;
        break;
      case KnowledgeNodeType.document:
        primaryColor = appTheme.nodeColors.document;
        nodeIcon = Icons.description_outlined;
        break;
      case KnowledgeNodeType.entity:
        primaryColor = appTheme.nodeColors.entity;
        nodeIcon = Icons.public;
        break;
      case KnowledgeNodeType.tag:
        primaryColor = appTheme.nodeColors.tag;
        nodeIcon = Icons.local_offer_outlined;
        break;
      case KnowledgeNodeType.custom:
      default:
        primaryColor = appTheme.nodeColors.custom;
        nodeIcon = Icons.data_object;
    }

    // Textfarbe basierend auf Hintergrundfarbe
    final color = HSLColor.fromColor(primaryColor);
    final textColor = color.lightness > 0.6 ? Colors.black : Colors.white;

    // Wichtigkeit des Knotens beeinflusst die Größe
    final scale = 0.7 + (node.importance * 0.3);
    final effectiveWidth = width * scale;
    final effectiveHeight = height * scale;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: effectiveWidth,
        height: effectiveHeight,
        decoration: BoxDecoration(
          color: primaryColor,
          borderRadius: BorderRadius.circular(8),
          boxShadow: [
            BoxShadow(
              color: isSelected
                  ? theme.colorScheme.primary.withOpacity(0.7)
                  : Colors.black26,
              blurRadius: isSelected ? 8 : 3,
              spreadRadius: isSelected ? 2 : 0,
            ),
          ],
          border: isSelected
              ? Border.all(
                  color: theme.colorScheme.primary,
                  width: 2.5,
                )
              : null,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Icon wenn vorhanden
            if (nodeIcon != null)
              Icon(
                nodeIcon,
                color: textColor,
                size: 16,
              ),
              
            // Knotenlabel
            Text(
              node.label,
              style: TextStyle(
                color: textColor,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                fontSize: 12,
              ),
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              maxLines: 2,
            ),
          ],
        ),
      ),
    );
  }
} 