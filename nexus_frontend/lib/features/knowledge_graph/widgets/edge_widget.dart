import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../models/knowledge_edge.dart';

/// Widget für die Darstellung einer Kante im Wissensgraphen
class EdgeWidget extends StatelessWidget {
  final KnowledgeEdge edge;
  final bool isHighlighted;
  
  const EdgeWidget({
    Key? key,
    required this.edge,
    this.isHighlighted = false,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    final appTheme = AppTheme.of(context);
    
    // Farbe basierend auf Beziehungstyp
    Color color;
    switch (edge.type) {
      case RelationshipType.related:
        color = appTheme.edgeColors.related;
        break;
      case RelationshipType.references:
        color = appTheme.edgeColors.references;
        break;
      case RelationshipType.includes:
        color = appTheme.edgeColors.includes;
        break;
      case RelationshipType.causes:
        color = appTheme.edgeColors.causes;
        break;
      case RelationshipType.opposes:
        color = appTheme.edgeColors.opposes;
        break;
      case RelationshipType.similar:
        color = appTheme.edgeColors.similar;
        break;
      case RelationshipType.instance:
        color = appTheme.edgeColors.instance;
        break;
      case RelationshipType.tag:
        color = appTheme.edgeColors.tag;
        break;
      case RelationshipType.custom:
      default:
        color = appTheme.edgeColors.custom;
    }
    
    // Anpassen der Farbe und Dicke, wenn hervorgehoben
    final effectiveColor = isHighlighted 
        ? color 
        : color.withOpacity(0.7);
    
    final thickness = isHighlighted
        ? 2.0 + (edge.strength * 1.5)
        : 1.0 + (edge.strength * 1.0);
    
    return CustomPaint(
      painter: EdgePainter(
        color: effectiveColor,
        thickness: thickness,
        directed: edge.directed,
        label: edge.label,
      ),
    );
  }
}

/// Custom Painter für die Kanten
class EdgePainter extends CustomPainter {
  final Color color;
  final double thickness;
  final bool directed;
  final String? label;
  
  EdgePainter({
    required this.color,
    required this.thickness,
    required this.directed,
    this.label,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = thickness
      ..style = PaintingStyle.stroke;
    
    // Die Punkte werden von außen durch die graphview-Bibliothek definiert,
    // daher zeigen wir hier nur, wie wir die Linie zeichnen würden
    final start = Offset(0, 0);
    final end = Offset(size.width, size.height);
    
    // Linie zeichnen
    canvas.drawLine(start, end, paint);
    
    // Pfeil zeichnen, wenn es eine gerichtete Kante ist
    if (directed) {
      final arrowSize = 8.0 + (thickness * 0.5);
      
      // Vektor vom Start zum Ende
      final dx = end.dx - start.dx;
      final dy = end.dy - start.dy;
      final distance = size.width;
      
      // Normalisierter Richtungsvektor
      final nx = dx / distance;
      final ny = dy / distance;
      
      // Pfeilposition (etwas vor dem Endpunkt)
      final arrowX = end.dx - nx * arrowSize * 2;
      final arrowY = end.dy - ny * arrowSize * 2;
      final arrowPos = Offset(arrowX, arrowY);
      
      // Normaler Vektor (senkrecht zum Richtungsvektor)
      final px = -ny;
      final py = nx;
      
      // Pfeilspitzen
      final arrowPoint1 = Offset(
        arrowPos.dx + px * arrowSize - nx * arrowSize,
        arrowPos.dy + py * arrowSize - ny * arrowSize,
      );
      
      final arrowPoint2 = Offset(
        arrowPos.dx - px * arrowSize - nx * arrowSize,
        arrowPos.dy - py * arrowSize - ny * arrowSize,
      );
      
      // Pfeilspitzen zeichnen
      final arrowPath = Path()
        ..moveTo(end.dx, end.dy)
        ..lineTo(arrowPoint1.dx, arrowPoint1.dy)
        ..lineTo(arrowPoint2.dx, arrowPoint2.dy)
        ..close();
      
      canvas.drawPath(arrowPath, Paint()..color = color);
    }
    
    // Label zeichnen, wenn vorhanden
    if (label != null && label!.isNotEmpty) {
      final textPainter = TextPainter(
        text: TextSpan(
          text: label,
          style: TextStyle(
            color: color,
            fontSize: 10,
            fontWeight: FontWeight.w500,
            backgroundColor: Colors.white.withOpacity(0.7),
          ),
        ),
        textAlign: TextAlign.center,
        textDirection: TextDirection.ltr,
      );
      
      textPainter.layout(minWidth: 0, maxWidth: size.width * 0.8);
      
      // Text in der Mitte der Linie positionieren
      final textX = (start.dx + end.dx) / 2 - textPainter.width / 2;
      final textY = (start.dy + end.dy) / 2 - textPainter.height / 2;
      
      // Hintergrund für bessere Lesbarkeit
      final textBgRect = Rect.fromLTWH(
        textX - 2, 
        textY - 1,
        textPainter.width + 4,
        textPainter.height + 2,
      );
      
      canvas.drawRRect(
        RRect.fromRectAndRadius(textBgRect, const Radius.circular(2)),
        Paint()..color = Colors.white.withOpacity(0.7),
      );
      
      textPainter.paint(canvas, Offset(textX, textY));
    }
  }
  
  @override
  bool shouldRepaint(EdgePainter oldDelegate) {
    return oldDelegate.color != color ||
           oldDelegate.thickness != thickness ||
           oldDelegate.directed != directed ||
           oldDelegate.label != label;
  }
} 