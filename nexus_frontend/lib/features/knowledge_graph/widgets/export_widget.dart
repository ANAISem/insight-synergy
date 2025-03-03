import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:screenshot/screenshot.dart';
import 'dart:ui' as ui;

import 'package:nexus_frontend/core/theme/app_colors.dart';
import 'package:nexus_frontend/features/knowledge_graph/providers/knowledge_graph_provider.dart';
import 'package:nexus_frontend/features/knowledge_graph/models/knowledge_graph.dart';
import 'package:nexus_frontend/core/utils/error_handler.dart';

/// Widget zum Exportieren und Teilen des Wissensgraphen
class ExportWidget extends StatefulWidget {
  /// Schlüsselreferenz zum Erfassen des Graphen als Screenshot
  final GlobalKey graphKey;

  /// Konstruktor für das ExportWidget
  const ExportWidget({
    Key? key,
    required this.graphKey,
  }) : super(key: key);

  @override
  State<ExportWidget> createState() => _ExportWidgetState();
}

class _ExportWidgetState extends State<ExportWidget> {
  final ScreenshotController _screenshotController = ScreenshotController();
  bool _isExporting = false;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.all(8.0),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Wissensgraph exportieren',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _exportButton(
                  icon: Icons.image,
                  label: 'Als Bild',
                  onPressed: () => _exportAsImage(context),
                  color: AppColors.primary,
                ),
                _exportButton(
                  icon: Icons.share,
                  label: 'Teilen',
                  onPressed: () => _shareGraph(context),
                  color: AppColors.accent,
                ),
                _exportButton(
                  icon: Icons.code,
                  label: 'Als JSON',
                  onPressed: () => _exportAsJson(context),
                  color: AppColors.secondary,
                ),
              ],
            ),
            if (_isExporting)
              const Padding(
                padding: EdgeInsets.only(top: 16.0),
                child: Center(
                  child: CircularProgressIndicator(),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _exportButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
    required Color color,
  }) {
    return ElevatedButton.icon(
      icon: Icon(icon, color: Colors.white),
      label: Text(label),
      onPressed: _isExporting ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }

  Future<void> _exportAsImage(BuildContext context) async {
    if (widget.graphKey.currentContext == null) {
      _showErrorMessage('Graph konnte nicht als Bild exportiert werden.');
      return;
    }

    setState(() {
      _isExporting = true;
    });

    try {
      // Screenshot vom Graph erstellen
      RenderRepaintBoundary boundary = widget.graphKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
      ui.Image image = await boundary.toImage(pixelRatio: 3.0);
      ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      
      if (byteData == null) {
        throw Exception('Fehler beim Generieren des Bildes');
      }
      
      Uint8List pngBytes = byteData.buffer.asUint8List();
      
      // Temporäres Verzeichnis für die Datei erstellen
      final directory = await getApplicationDocumentsDirectory();
      final fileName = 'nexus_knowledge_graph_${DateTime.now().millisecondsSinceEpoch}.png';
      final filePath = '${directory.path}/$fileName';
      
      // Datei schreiben
      File file = File(filePath);
      await file.writeAsBytes(pngBytes);
      
      _showSuccessMessage('Graph als Bild exportiert: $filePath');
    } catch (e) {
      ErrorHandler().handleKnowledgeGraphError(
        context, 
        'Fehler beim Exportieren des Graphen: ${e.toString()}'
      );
    } finally {
      setState(() {
        _isExporting = false;
      });
    }
  }

  Future<void> _shareGraph(BuildContext context) async {
    if (widget.graphKey.currentContext == null) {
      _showErrorMessage('Graph konnte nicht geteilt werden.');
      return;
    }

    setState(() {
      _isExporting = true;
    });

    try {
      // Screenshot vom Graph erstellen
      RenderRepaintBoundary boundary = widget.graphKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
      ui.Image image = await boundary.toImage(pixelRatio: 3.0);
      ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      
      if (byteData == null) {
        throw Exception('Fehler beim Generieren des Bildes');
      }
      
      Uint8List pngBytes = byteData.buffer.asUint8List();
      
      // Temporäres Verzeichnis für die Datei erstellen
      final directory = await getApplicationDocumentsDirectory();
      final fileName = 'nexus_knowledge_graph_${DateTime.now().millisecondsSinceEpoch}.png';
      final filePath = '${directory.path}/$fileName';
      
      // Datei schreiben
      File file = File(filePath);
      await file.writeAsBytes(pngBytes);
      
      // Datei teilen
      final result = await Share.shareXFiles(
        [XFile(filePath)],
        text: 'Nexus Knowledge Graph',
        subject: 'Geteilter Wissensgraph',
      );
      
      if (result.status == ShareResultStatus.success) {
        _showSuccessMessage('Graph erfolgreich geteilt!');
      }
    } catch (e) {
      ErrorHandler().handleKnowledgeGraphError(
        context, 
        'Fehler beim Teilen des Graphen: ${e.toString()}'
      );
    } finally {
      setState(() {
        _isExporting = false;
      });
    }
  }

  Future<void> _exportAsJson(BuildContext context) async {
    setState(() {
      _isExporting = true;
    });

    try {
      final provider = Provider.of<KnowledgeGraphProvider>(context, listen: false);
      final graph = provider.graph;
      
      if (graph == null || graph.nodes.isEmpty) {
        _showErrorMessage('Kein Graph zum Exportieren vorhanden.');
        return;
      }
      
      // Graph als JSON exportieren
      final Map<String, dynamic> graphData = {
        'nodes': graph.nodes.map((node) => node.toJson()).toList(),
        'edges': graph.edges.map((edge) => edge.toJson()).toList(),
        'metadata': {
          'title': 'Nexus Knowledge Graph',
          'created_at': DateTime.now().toIso8601String(),
          'version': '1.0',
        }
      };
      
      final jsonString = jsonEncode(graphData);
      
      // Temporäres Verzeichnis für die Datei erstellen
      final directory = await getApplicationDocumentsDirectory();
      final fileName = 'nexus_knowledge_graph_${DateTime.now().millisecondsSinceEpoch}.json';
      final filePath = '${directory.path}/$fileName';
      
      // Datei schreiben
      File file = File(filePath);
      await file.writeAsBytes(utf8.encode(jsonString));
      
      // Datei teilen
      final result = await Share.shareXFiles(
        [XFile(filePath)],
        text: 'Nexus Knowledge Graph (JSON)',
        subject: 'Wissensgraph JSON Export',
      );
      
      if (result.status == ShareResultStatus.success) {
        _showSuccessMessage('Graph erfolgreich als JSON exportiert!');
      }
    } catch (e) {
      ErrorHandler().handleKnowledgeGraphError(
        context, 
        'Fehler beim Exportieren des Graphen als JSON: ${e.toString()}'
      );
    } finally {
      setState(() {
        _isExporting = false;
      });
    }
  }

  void _showSuccessMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showErrorMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }
} 