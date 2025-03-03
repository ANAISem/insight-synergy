import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:graphview/graphview.dart';

import '../models/knowledge_node.dart';
import '../models/knowledge_edge.dart';
import '../providers/knowledge_graph_provider.dart';
import '../../../core/theme/app_theme.dart';
import 'node_widget.dart';
import 'edge_widget.dart';

/// Widget zur Visualisierung des Wissensgraphen
class KnowledgeGraphView extends StatefulWidget {
  final double width;
  final double height;
  final bool interactive;
  final bool showControls;
  
  const KnowledgeGraphView({
    Key? key,
    this.width = double.infinity,
    this.height = 500,
    this.interactive = true,
    this.showControls = true,
  }) : super(key: key);

  @override
  State<KnowledgeGraphView> createState() => _KnowledgeGraphViewState();
}

class _KnowledgeGraphViewState extends State<KnowledgeGraphView> {
  final Graph graph = Graph()..isTree = false;
  late Algorithm algorithm;
  final double _nodeWidth = 140;
  final double _nodeHeight = 60;
  double _zoom = 1.0;
  Offset _offset = Offset.zero;

  @override
  void initState() {
    super.initState();
    // Force-directed Layout initialisieren
    algorithm = FruchtermanReingoldAlgorithm(
      iterations: 1000,
      repulsionStrength: 0.3,
      maxRepulsiveForceDistance: 300,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final appTheme = AppTheme.of(context);
    final graphProvider = Provider.of<KnowledgeGraphProvider>(context);
    
    if (graphProvider.currentGraph == null) {
      return SizedBox(
        width: widget.width,
        height: widget.height,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.account_tree_outlined, size: 64, color: Colors.grey[400]),
              const SizedBox(height: 16),
              const Text('Kein Wissensgraph verfügbar'),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () {
                  // Beispiel-Graph erstellen
                  _createSampleGraph(graphProvider);
                },
                child: const Text('Beispiel-Graph erstellen'),
              ),
            ],
          ),
        ),
      );
    }

    // Graph aus dem Provider-Daten aufbauen
    _buildGraphFromProvider(graphProvider);

    return Scaffold(
      backgroundColor: appTheme.graphBackgroundColor,
      body: Stack(
        children: [
          // Graph-Visualisierung
          GestureDetector(
            onScaleStart: (details) {
              // Aktuellen Zoom-Wert speichern
              _zoom = 1.0;
            },
            onScaleUpdate: (details) {
              setState(() {
                // Zoom und Offset aktualisieren für Panning und Zooming
                _zoom = details.scale;
                _offset += details.focalPointDelta;
              });
            },
            child: InteractiveViewer(
              constrained: false,
              boundaryMargin: const EdgeInsets.all(double.infinity),
              minScale: 0.1,
              maxScale: 2.5,
              child: GraphView(
                graph: graph,
                algorithm: algorithm,
                paint: Paint()
                  ..color = appTheme.edgeColors.related
                  ..strokeWidth = 1.0
                  ..style = PaintingStyle.stroke,
                builder: (Node node) {
                  // Baue Knoten-Widget
                  final nodeId = node.key!.value as String;
                  final graphNode = graphProvider.currentGraph!.nodes
                      .firstWhere((n) => n.id == nodeId);
                  
                  return NodeWidget(
                    node: graphNode,
                    isSelected: nodeId == graphProvider.selectedNodeId,
                    onTap: () {
                      graphProvider.selectNode(nodeId);
                    },
                    width: _nodeWidth,
                    height: _nodeHeight,
                  );
                },
              ),
            ),
          ),

          // Steuerelemente
          Positioned(
            right: 16,
            bottom: 16,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Zoom-Steuerung
                Card(
                  elevation: 4,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove),
                          onPressed: () {
                            // Zoom verringern
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.add),
                          onPressed: () {
                            // Zoom erhöhen
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.center_focus_strong),
                          onPressed: () {
                            // Ansicht zentrieren
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(height: 8),
                
                // Layout-Steuerung
                Card(
                  elevation: 4,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.autorenew),
                          onPressed: () {
                            setState(() {
                              algorithm = FruchtermanReingoldAlgorithm();
                            });
                          },
                          tooltip: 'Layout neu berechnen',
                        ),
                        IconButton(
                          icon: const Icon(Icons.account_tree),
                          onPressed: () {
                            setState(() {
                              var config = BuchheimWalkerConfiguration();
                              algorithm = BuchheimWalkerAlgorithm(
                                config,
                                TreeEdgeRenderer(config)
                              );
                            });
                          },
                          tooltip: 'Hierarchisches Layout',
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Neuen Knoten hinzufügen
          _showAddNodeDialog(context, graphProvider);
        },
        child: const Icon(Icons.add),
        tooltip: 'Neuen Knoten hinzufügen',
      ),
    );
  }

  /// Baut den Graph aus den Daten des Providers auf
  void _buildGraphFromProvider(KnowledgeGraphProvider provider) {
    if (provider.currentGraph == null) return;

    // Graph leeren
    graph.nodes.clear();
    graph.edges.clear();

    // Knoten hinzufügen
    for (final node in provider.currentGraph!.nodes) {
      graph.addNode(Node.Id(node.id));
    }

    // Kanten hinzufügen
    for (final edge in provider.currentGraph!.edges) {
      final sourceNode = graph.getNodeUsingId(edge.sourceId);
      final targetNode = graph.getNodeUsingId(edge.targetId);
      
      if (sourceNode != null && targetNode != null) {
        graph.addEdge(
          sourceNode, 
          targetNode,
        );
      }
    }
  }

  /// Erstellt ein Paint-Objekt für eine Kante basierend auf dem Typ
  Paint _getPaintForEdge(KnowledgeEdge edge, BuildContext context) {
    final appTheme = AppTheme.of(context);
    Color color;
    
    // Farbe je nach Beziehungstyp wählen
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
        color = appTheme.edgeColors.custom;
        break;
      default:
        color = appTheme.edgeColors.related;
    }
    
    return Paint()
      ..color = color
      ..strokeWidth = 1.5 + (edge.strength * 1.0) // Stärke beeinflusst die Breite
      ..style = PaintingStyle.stroke;
  }

  /// Beispiel-Graph zum Testen erstellen
  void _createSampleGraph(KnowledgeGraphProvider provider) {
    provider.createNewGraph('Beispiel-Wissensgraph', 
      description: 'Ein automatisch erstellter Beispiel-Graph');
    
    // Einige Beispiel-Knoten erstellen
    provider.createNode(
      label: 'Machine Learning',
      type: KnowledgeNodeType.concept,
      description: 'Bereich der KI, der das automatische Lernen aus Daten ermöglicht',
    );
    
    provider.createNode(
      label: 'Python',
      type: KnowledgeNodeType.entity,
      description: 'Programmiersprache für ML und Data Science',
    );
    
    provider.createNode(
      label: 'TensorFlow',
      type: KnowledgeNodeType.entity,
      description: 'Open-Source-Bibliothek für maschinelles Lernen',
    );
    
    provider.createNode(
      label: 'Neural Networks',
      type: KnowledgeNodeType.concept,
      description: 'Algorithmen, die vom menschlichen Gehirn inspiriert sind',
    );
    
    provider.createNode(
      label: 'Deep Learning',
      type: KnowledgeNodeType.concept,
      description: 'Teilbereich des ML mit mehrschichtigen neuronalen Netzen',
    );
    
    // Einige Beziehungen erstellen
    final nodes = provider.currentGraph!.nodes;
    
    provider.createEdge(
      sourceId: nodes[0].id, // Machine Learning
      targetId: nodes[3].id, // Neural Networks
      type: RelationshipType.includes,
      label: 'beinhaltet',
    );
    
    provider.createEdge(
      sourceId: nodes[0].id, // Machine Learning
      targetId: nodes[4].id, // Deep Learning
      type: RelationshipType.includes,
      label: 'beinhaltet',
    );
    
    provider.createEdge(
      sourceId: nodes[1].id, // Python
      targetId: nodes[0].id, // Machine Learning
      type: RelationshipType.references,
      label: 'wird verwendet für',
    );
    
    provider.createEdge(
      sourceId: nodes[1].id, // Python
      targetId: nodes[2].id, // TensorFlow
      type: RelationshipType.references,
      label: 'wird verwendet für',
    );
    
    provider.createEdge(
      sourceId: nodes[2].id, // TensorFlow
      targetId: nodes[3].id, // Neural Networks
      type: RelationshipType.references,
      label: 'implementiert',
    );
    
    provider.createEdge(
      sourceId: nodes[3].id, // Neural Networks
      targetId: nodes[4].id, // Deep Learning
      type: RelationshipType.causes,
      label: 'ermöglicht',
    );
  }

  /// Dialog zum Hinzufügen eines neuen Knotens
  void _showAddNodeDialog(BuildContext context, KnowledgeGraphProvider provider) {
    String nodeLabel = '';
    KnowledgeNodeType nodeType = KnowledgeNodeType.concept;
    String? nodeDescription;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Neuen Knoten hinzufügen'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Bezeichnung',
                  hintText: 'Name des Knotens',
                ),
                onChanged: (value) => nodeLabel = value,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<KnowledgeNodeType>(
                decoration: const InputDecoration(
                  labelText: 'Typ',
                ),
                value: nodeType,
                items: KnowledgeNodeType.values
                    .map((type) => DropdownMenuItem(
                          value: type,
                          child: Text(_getNodeTypeName(type)),
                        ))
                    .toList(),
                onChanged: (value) {
                  if (value != null) {
                    nodeType = value;
                  }
                },
              ),
              const SizedBox(height: 16),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Beschreibung (optional)',
                  hintText: 'Kurze Beschreibung des Knotens',
                ),
                maxLines: 3,
                onChanged: (value) => nodeDescription = value,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Abbrechen'),
          ),
          ElevatedButton(
            onPressed: () {
              if (nodeLabel.isNotEmpty) {
                provider.createNode(
                  label: nodeLabel,
                  type: nodeType,
                  description: nodeDescription,
                );
                Navigator.of(context).pop();
              }
            },
            child: const Text('Hinzufügen'),
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

// Hilfsmethode, um dunklere Farben zu erzeugen
extension ColorExtension on Color {
  Color darker([double amount = 0.1]) {
    assert(amount >= 0 && amount <= 1);
    
    final hsl = HSLColor.fromColor(this);
    final hslDark = hsl.withLightness((hsl.lightness - amount).clamp(0.0, 1.0));
    
    return hslDark.toColor();
  }
} 