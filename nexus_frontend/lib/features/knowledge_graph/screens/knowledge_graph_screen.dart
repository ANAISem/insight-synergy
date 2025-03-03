import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/knowledge_graph_provider.dart';
import '../models/knowledge_node.dart';
import '../widgets/knowledge_graph_view.dart';
import 'node_detail_screen.dart';

/// Hauptbildschirm für die Wissensgraph-Visualisierung
class KnowledgeGraphScreen extends StatefulWidget {
  final String? initialNodeId;

  const KnowledgeGraphScreen({
    Key? key, 
    this.initialNodeId,
  }) : super(key: key);

  @override
  State<KnowledgeGraphScreen> createState() => _KnowledgeGraphScreenState();
}

class _KnowledgeGraphScreenState extends State<KnowledgeGraphScreen> {
  bool _showSettings = false;
  bool _showNodeDetail = false;

  @override
  void initState() {
    super.initState();
    
    // Wenn eine initiale Node-ID vorhanden ist, selektiere diese
    if (widget.initialNodeId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final provider = Provider.of<KnowledgeGraphProvider>(context, listen: false);
        provider.selectNode(widget.initialNodeId);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Wissensgraph'),
        actions: [
          // Aktionsmenü
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'settings':
                  setState(() {
                    _showSettings = !_showSettings;
                  });
                  break;
                case 'export':
                  _showExportDialog(context);
                  break;
                case 'import':
                  _showImportDialog(context);
                  break;
                case 'help':
                  _showHelpDialog(context);
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings),
                    SizedBox(width: 8),
                    Text('Einstellungen'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'export',
                child: Row(
                  children: [
                    Icon(Icons.file_download),
                    SizedBox(width: 8),
                    Text('Graph exportieren'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'import',
                child: Row(
                  children: [
                    Icon(Icons.file_upload),
                    SizedBox(width: 8),
                    Text('Graph importieren'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'help',
                child: Row(
                  children: [
                    Icon(Icons.help_outline),
                    SizedBox(width: 8),
                    Text('Hilfe'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Consumer<KnowledgeGraphProvider>(
        builder: (context, provider, child) {
          return Row(
            children: [
              // Hauptbereich: Graph-Visualisierung
              Expanded(
                flex: 3,
                child: KnowledgeGraphView(),
              ),
              
              // Seitenbereich für Details
              if (_showNodeDetail && provider.selectedNodeId != null)
                Expanded(
                  flex: 1,
                  child: NodeDetailScreen(
                    node: provider.currentGraph!.nodes.firstWhere(
                      (n) => n.id == provider.selectedNodeId,
                    ),
                    onClose: () {
                      setState(() {
                        _showNodeDetail = false;
                      });
                    },
                  ),
                ),
              
              // Einstellungsbereich
              if (_showSettings)
                Expanded(
                  flex: 1,
                  child: _buildSettingsPanel(provider),
                ),
            ],
          );
        },
      ),
      floatingActionButton: Consumer<KnowledgeGraphProvider>(
        builder: (context, provider, child) {
          // Detail-Ansicht zeigen, wenn ein Knoten ausgewählt ist
          if (provider.selectedNodeId != null) {
            return FloatingActionButton(
              onPressed: () {
                setState(() {
                  _showNodeDetail = !_showNodeDetail;
                });
              },
              tooltip: 'Knotendetails anzeigen',
              child: Icon(_showNodeDetail ? Icons.info_outline : Icons.info),
            );
          }
          
          return Container();
        },
      ),
    );
  }

  /// Einstellungsbereich für den Graphen
  Widget _buildSettingsPanel(KnowledgeGraphProvider provider) {
    return Card(
      elevation: 4,
      margin: const EdgeInsets.all(8),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header mit Schließen-Button
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Graph-Einstellungen',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () {
                    setState(() {
                      _showSettings = false;
                    });
                  },
                  tooltip: 'Einstellungen schließen',
                ),
              ],
            ),
            
            const Divider(),
            
            // Filteroptionen
            const Text(
              'Filter',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            
            // Knotentypen filtern
            const Text('Knotentypen:'),
            Wrap(
              spacing: 8,
              children: KnowledgeNodeType.values.map((type) {
                return FilterChip(
                  label: Text(_getNodeTypeName(type)),
                  selected: true, // TODO: Implementiere Filter-Logik
                  onSelected: (isSelected) {
                    // TODO: Filter anwenden
                  },
                );
              }).toList(),
            ),
            
            const SizedBox(height: 16),
            
            // Layout-Einstellungen
            const Text(
              'Layout',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            
            // Layout-Parameter
            ListTile(
              title: const Text('Layout-Animation'),
              trailing: Switch(
                value: provider.layoutRunning,
                onChanged: (value) {
                  if (value) {
                    provider.startForceDirectedLayout();
                  } else {
                    provider.stopForceDirectedLayout();
                  }
                },
              ),
            ),
            
            // Weitere Parameter
            const Text('Spring-Stärke:'),
            Slider(
              value: provider.forceDirectedSpring,
              min: 0.1,
              max: 1.0,
              divisions: 9,
              label: provider.forceDirectedSpring.toStringAsFixed(1),
              onChanged: (value) {
                provider.updateLayoutParameters(spring: value);
              },
            ),
            
            const Text('Abstoßungs-Stärke:'),
            Slider(
              value: -provider.forceDirectedCharge / 100.0,
              min: 0.1,
              max: 1.0,
              divisions: 9,
              label: (-provider.forceDirectedCharge / 100.0).toStringAsFixed(1),
              onChanged: (value) {
                provider.updateLayoutParameters(charge: -value * 100.0);
              },
            ),
            
            const Spacer(),
            
            // Aktionsbuttons
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                OutlinedButton.icon(
                  icon: const Icon(Icons.restart_alt),
                  label: const Text('Zurücksetzen'),
                  onPressed: () {
                    // Layout-Parameter zurücksetzen
                    provider.updateLayoutParameters(
                      spring: 0.5,
                      charge: -30.0,
                      distance: 100.0,
                    );
                  },
                ),
                ElevatedButton.icon(
                  icon: const Icon(Icons.save),
                  label: const Text('Speichern'),
                  onPressed: () async {
                    await provider.saveGraph();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Graph gespeichert'),
                        ),
                      );
                    }
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Dialog zum Exportieren des Graphen
  void _showExportDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Graph exportieren'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Wählen Sie das gewünschte Format:'),
            SizedBox(height: 16),
            RadioListTile(
              title: Text('JSON'),
              value: 'json',
              groupValue: 'json',
              onChanged: null,
            ),
            RadioListTile(
              title: Text('CSV'),
              value: 'csv',
              groupValue: 'json',
              onChanged: null,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Abbrechen'),
          ),
          ElevatedButton(
            onPressed: () {
              // TODO: Export-Logik implementieren
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Export-Funktion noch nicht implementiert'),
                ),
              );
            },
            child: const Text('Exportieren'),
          ),
        ],
      ),
    );
  }

  /// Dialog zum Importieren eines Graphen
  void _showImportDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Graph importieren'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Wählen Sie eine Datei zum Importieren:'),
            SizedBox(height: 16),
            // Dateiwähler würde hier implementiert werden
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Abbrechen'),
          ),
          ElevatedButton(
            onPressed: () {
              // TODO: Import-Logik implementieren
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Import-Funktion noch nicht implementiert'),
                ),
              );
            },
            child: const Text('Importieren'),
          ),
        ],
      ),
    );
  }

  /// Hilfedialog anzeigen
  void _showHelpDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Wissensgraph-Hilfe'),
        content: const SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Steuerung',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text('• Zoomen: Pinch-Geste oder Mausrad'),
              Text('• Verschieben: Ziehen mit dem Finger oder der Maus'),
              Text('• Knoten auswählen: Tippen/Klicken auf einen Knoten'),
              SizedBox(height: 16),
              
              Text(
                'Knotentypen',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text('• Konzept (Orange): Abstrakte Idee oder Begriff'),
              Text('• Dokument (Blau): Texte oder Dokumentationen'),
              Text('• Entität (Grün): Konkrete Objekte oder Personen'),
              Text('• Kategorie (Lila): Taxonomische Einordnung'),
              SizedBox(height: 16),
              
              Text(
                'Beziehungen',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text('• Allgemein (Grau): Unspezifische Verbindung'),
              Text('• Referenziert (Blau): Verweist auf etwas'),
              Text('• Beinhaltet (Grün): Hierarchische Beziehung'),
              Text('• Verursacht (Rot): Kausale Beziehung'),
              Text('• Gegensatz (Pink): Konträre Beziehung'),
            ],
          ),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Verstanden'),
          ),
        ],
      ),
    );
  }

  /// Gibt den deutschen Namen für einen Knotentyp zurück
  String _getNodeTypeName(KnowledgeNodeType type) {
    switch (type) {
      case KnowledgeNodeType.concept:
        return 'Konzept';
      case KnowledgeNodeType.document:
        return 'Dokument';
      case KnowledgeNodeType.entity:
        return 'Entität';
      case KnowledgeNodeType.tag:
        return 'Kategorie';
      case KnowledgeNodeType.custom:
        return 'Benutzerdefiniert';
      default:
        return 'Unbekannt';
    }
  }
} 