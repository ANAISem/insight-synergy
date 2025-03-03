import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/knowledge_node.dart';
import '../models/knowledge_edge.dart';
import '../providers/knowledge_graph_provider.dart';
import '../../../core/theme/app_theme.dart';

/// Bildschirm zum Anzeigen und Bearbeiten der Knotendetails
class NodeDetailScreen extends StatefulWidget {
  final KnowledgeNode node;
  final VoidCallback onClose;

  const NodeDetailScreen({
    Key? key,
    required this.node,
    required this.onClose,
  }) : super(key: key);

  @override
  State<NodeDetailScreen> createState() => _NodeDetailScreenState();
}

class _NodeDetailScreenState extends State<NodeDetailScreen> {
  bool _isEditing = false;
  late TextEditingController _labelController;
  late TextEditingController _descriptionController;
  late KnowledgeNodeType _selectedType;
  late double _importance;

  @override
  void initState() {
    super.initState();
    _labelController = TextEditingController(text: widget.node.label);
    _descriptionController = TextEditingController(text: widget.node.description ?? '');
    _selectedType = widget.node.type;
    _importance = widget.node.importance;
  }

  @override
  void dispose() {
    _labelController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<KnowledgeGraphProvider>(context);
    final appTheme = AppTheme.of(context);
    final theme = Theme.of(context);

    // Farbe basierend auf Knotentyp
    Color primaryColor;
    switch (widget.node.type) {
      case KnowledgeNodeType.concept:
        primaryColor = appTheme.nodeColors.concept;
        break;
      case KnowledgeNodeType.document:
        primaryColor = appTheme.nodeColors.document;
        break;
      case KnowledgeNodeType.entity:
        primaryColor = appTheme.nodeColors.entity;
        break;
      case KnowledgeNodeType.tag:
        primaryColor = appTheme.nodeColors.tag;
        break;
      case KnowledgeNodeType.custom:
      default:
        primaryColor = appTheme.nodeColors.custom;
    }

    // Verbundene Knoten und Kanten
    final connectedNodes = provider.currentGraph?.getConnectedNodes(widget.node.id) ?? [];
    final edges = provider.currentGraph?.getEdgesForNode(widget.node.id) ?? [];

    return Card(
      elevation: 4,
      margin: const EdgeInsets.all(8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header mit Knotentyp und Aktionen
          Container(
            color: primaryColor,
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _getNodeTypeName(widget.node.type),
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Row(
                  children: [
                    IconButton(
                      icon: Icon(
                        _isEditing ? Icons.check : Icons.edit,
                        color: Colors.white,
                      ),
                      onPressed: () {
                        if (_isEditing) {
                          _saveChanges(provider);
                        }
                        setState(() {
                          _isEditing = !_isEditing;
                        });
                      },
                      tooltip: _isEditing ? 'Änderungen speichern' : 'Bearbeiten',
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: widget.onClose,
                      tooltip: 'Schließen',
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Inhalt
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _isEditing
                  ? _buildEditForm(context, widget.node)
                  : _buildDetailsView(context, widget.node, connectedNodes, edges),
            ),
          ),

          // Aktionsleiste
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                OutlinedButton.icon(
                  icon: const Icon(Icons.link),
                  label: const Text('Verknüpfen'),
                  onPressed: () {
                    _showConnectNodeDialog(context, provider);
                  },
                ),
                if (!_isEditing)
                  ElevatedButton.icon(
                    icon: const Icon(Icons.delete),
                    label: const Text('Löschen'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.error,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () {
                      _showDeleteConfirmDialog(context, provider);
                    },
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Baut das Formular zur Bearbeitung des Knotens
  Widget _buildEditForm(BuildContext context, KnowledgeNode node) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _labelController,
          decoration: const InputDecoration(
            labelText: 'Bezeichnung',
            hintText: 'Name des Knotens',
          ),
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<KnowledgeNodeType>(
          decoration: const InputDecoration(
            labelText: 'Typ',
          ),
          value: _selectedType,
          items: KnowledgeNodeType.values
              .map((type) => DropdownMenuItem(
                    value: type,
                    child: Text(_getNodeTypeName(type)),
                  ))
              .toList(),
          onChanged: (value) {
            if (value != null) {
              setState(() {
                _selectedType = value;
              });
            }
          },
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _descriptionController,
          decoration: const InputDecoration(
            labelText: 'Beschreibung',
            hintText: 'Beschreibung des Knotens',
          ),
          maxLines: 3,
        ),
        const SizedBox(height: 16),
        Text('Wichtigkeit: ${_importance.toStringAsFixed(2)}'),
        Slider(
          value: _importance,
          min: 0.5,
          max: 2.0,
          divisions: 15,
          label: _importance.toStringAsFixed(2),
          onChanged: (value) {
            setState(() {
              _importance = value;
            });
          },
        ),
        const SizedBox(height: 16),
        const Divider(),
        const Text(
          'Hinweis: Änderungen werden erst nach dem Speichern übernommen.',
          style: TextStyle(fontStyle: FontStyle.italic, fontSize: 12),
        ),
      ],
    );
  }

  /// Baut die Detailansicht des Knotens
  Widget _buildDetailsView(
    BuildContext context,
    KnowledgeNode node,
    List<KnowledgeNode> connectedNodes,
    List<KnowledgeEdge> edges,
  ) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Bezeichnung und ID
        Text(
          node.label,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          'ID: ${node.id}',
          style: theme.textTheme.bodySmall?.copyWith(
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 16),

        // Beschreibung
        const Text(
          'Beschreibung:',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        Text(
          node.description ?? 'Keine Beschreibung vorhanden',
          style: TextStyle(
            fontStyle: node.description == null ? FontStyle.italic : FontStyle.normal,
          ),
        ),
        const SizedBox(height: 16),

        // Eigenschaften
        const Text(
          'Eigenschaften:',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        _buildPropertyTable(node),
        const SizedBox(height: 16),

        // Verbindungen
        const Text(
          'Verbindungen:',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        if (connectedNodes.isEmpty)
          const Text(
            'Keine Verbindungen vorhanden',
            style: TextStyle(fontStyle: FontStyle.italic),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: connectedNodes.length,
            itemBuilder: (context, index) {
              final connectedNode = connectedNodes[index];
              // Finde die Kante zwischen den Knoten
              final edge = edges.firstWhere(
                (e) => e.sourceId == connectedNode.id || e.targetId == connectedNode.id,
                orElse: () => KnowledgeEdge(
                  id: '',
                  sourceId: node.id,
                  targetId: connectedNode.id,
                  type: RelationshipType.related,
                ),
              );

              return _buildConnectionItem(context, connectedNode, edge, node.id);
            },
          ),
      ],
    );
  }

  /// Baut eine Tabelle mit den Eigenschaften des Knotens
  Widget _buildPropertyTable(KnowledgeNode node) {
    // Standardeigenschaften
    final properties = [
      {'key': 'Typ', 'value': _getNodeTypeName(node.type)},
      {'key': 'Wichtigkeit', 'value': node.importance.toStringAsFixed(2)},
      if (node.referenceId != null)
        {'key': 'Referenz-ID', 'value': node.referenceId!},
    ];

    // Benutzerdefinierte Eigenschaften hinzufügen
    node.properties.forEach((key, value) {
      properties.add({'key': key, 'value': value.toString()});
    });

    return Table(
      columnWidths: const {
        0: IntrinsicColumnWidth(),
        1: FlexColumnWidth(),
      },
      children: properties.map((prop) {
        return TableRow(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4.0),
              child: Text(
                '${prop['key']}:',
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4.0, horizontal: 8.0),
              child: Text(prop['value'] as String),
            ),
          ],
        );
      }).toList(),
    );
  }

  /// Baut ein Listenelement für eine Verbindung
  Widget _buildConnectionItem(
    BuildContext context, 
    KnowledgeNode connectedNode, 
    KnowledgeEdge edge,
    String currentNodeId,
  ) {
    final appTheme = AppTheme.of(context);

    // Bestimme Farbe basierend auf Knotentyp
    Color nodeColor;
    switch (connectedNode.type) {
      case KnowledgeNodeType.concept:
        nodeColor = appTheme.nodeColors.concept;
        break;
      case KnowledgeNodeType.document:
        nodeColor = appTheme.nodeColors.document;
        break;
      case KnowledgeNodeType.entity:
        nodeColor = appTheme.nodeColors.entity;
        break;
      case KnowledgeNodeType.tag:
        nodeColor = appTheme.nodeColors.tag;
        break;
      case KnowledgeNodeType.custom:
      default:
        nodeColor = appTheme.nodeColors.custom;
    }

    // Bestimme Kantenfarbe basierend auf Beziehungstyp
    Color edgeColor;
    switch (edge.type) {
      case RelationshipType.related:
        edgeColor = appTheme.edgeColors.related;
        break;
      case RelationshipType.references:
        edgeColor = appTheme.edgeColors.references;
        break;
      case RelationshipType.includes:
        edgeColor = appTheme.edgeColors.includes;
        break;
      case RelationshipType.causes:
        edgeColor = appTheme.edgeColors.causes;
        break;
      case RelationshipType.opposes:
        edgeColor = appTheme.edgeColors.opposes;
        break;
      case RelationshipType.similar:
        edgeColor = appTheme.edgeColors.similar;
        break;
      case RelationshipType.instance:
        edgeColor = appTheme.edgeColors.instance;
        break;
      case RelationshipType.tag:
        edgeColor = appTheme.edgeColors.tag;
        break;
      case RelationshipType.custom:
      default:
        edgeColor = appTheme.edgeColors.custom;
    }

    // Bestimme Richtung und Beschreibungstext
    final isOutgoing = edge.sourceId == currentNodeId;
    final relationText = _getRelationshipText(edge.type, isOutgoing);
    
    // Pfeil-Symbol basierend auf Richtung
    final arrowIcon = isOutgoing
        ? '→'
        : edge.directed
            ? '←'
            : '↔';

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      color: Colors.grey[50],
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: nodeColor,
          child: Text(
            connectedNode.label.substring(0, 1),
            style: const TextStyle(color: Colors.white),
          ),
        ),
        title: Text(connectedNode.label),
        subtitle: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: edgeColor.withOpacity(0.2),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: edgeColor, width: 1),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '$relationText $arrowIcon',
                    style: TextStyle(
                      color: edgeColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            if (edge.label != null)
              Padding(
                padding: const EdgeInsets.only(left: 4),
                child: Text(
                  edge.label!,
                  style: const TextStyle(
                    fontStyle: FontStyle.italic,
                    fontSize: 12,
                  ),
                ),
              ),
          ],
        ),
        trailing: IconButton(
          icon: const Icon(Icons.close, size: 16),
          onPressed: () {
            // Entfernen der Verbindung
            final provider = Provider.of<KnowledgeGraphProvider>(context, listen: false);
            provider.removeEdge(edge.id);
          },
          tooltip: 'Verbindung entfernen',
        ),
        onTap: () {
          // Zu diesem Knoten wechseln
          final provider = Provider.of<KnowledgeGraphProvider>(context, listen: false);
          provider.selectNode(connectedNode.id);
        },
      ),
    );
  }

  /// Speichert die Änderungen am Knoten
  void _saveChanges(KnowledgeGraphProvider provider) {
    final updatedNode = widget.node.copyWith(
      label: _labelController.text,
      description: _descriptionController.text,
      type: _selectedType,
      importance: _importance,
    );

    provider.updateNode(updatedNode);
  }

  /// Dialog zum Verbinden des aktuellen Knotens mit einem anderen
  void _showConnectNodeDialog(BuildContext context, KnowledgeGraphProvider provider) {
    String? selectedNodeId;
    RelationshipType selectedRelationType = RelationshipType.related;
    bool isDirected = true;
    String? relationLabel;

    // Liste aller verfügbaren Knoten außer dem aktuellen
    final availableNodes = provider.currentGraph!.nodes
        .where((node) => node.id != widget.node.id)
        .toList();

    // Bereites vorhandene Verbindungen vor
    final existingConnections = provider.currentGraph!.getEdgesForNode(widget.node.id);
    final alreadyConnectedNodeIds = existingConnections
        .map((e) => e.sourceId == widget.node.id ? e.targetId : e.sourceId)
        .toSet();

    // Filtere bereits verbundene Knoten
    final connectableNodes = availableNodes
        .where((node) => !alreadyConnectedNodeIds.contains(node.id))
        .toList();

    if (connectableNodes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Keine weiteren Knoten zum Verbinden verfügbar'),
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            title: const Text('Knoten verbinden'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Zielknoten auswählen
                  const Text('Zielknoten:'),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    hint: const Text('Knoten auswählen'),
                    value: selectedNodeId,
                    items: connectableNodes.map((node) {
                      return DropdownMenuItem(
                        value: node.id,
                        child: Text(
                          node.label,
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        selectedNodeId = value;
                      });
                    },
                  ),
                  const SizedBox(height: 16),

                  // Beziehungstyp auswählen
                  const Text('Beziehungstyp:'),
                  DropdownButtonFormField<RelationshipType>(
                    value: selectedRelationType,
                    items: RelationshipType.values.map((type) {
                      return DropdownMenuItem(
                        value: type,
                        child: Text(_getRelationshipName(type)),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        selectedRelationType = value!;
                      });
                    },
                  ),
                  const SizedBox(height: 16),

                  // Gerichtete oder ungerichtete Beziehung
                  SwitchListTile(
                    title: const Text('Gerichtete Beziehung'),
                    subtitle: Text(
                      isDirected 
                          ? 'Vom aktuellen Knoten zum Zielknoten' 
                          : 'Bidirektionale Beziehung',
                    ),
                    value: isDirected,
                    onChanged: (value) {
                      setState(() {
                        isDirected = value;
                      });
                    },
                  ),
                  const SizedBox(height: 16),

                  // Optionale Beschreibung
                  TextField(
                    decoration: const InputDecoration(
                      labelText: 'Beschreibung (optional)',
                      hintText: 'z.B. "ist Teil von" oder "implementiert"',
                    ),
                    onChanged: (value) {
                      relationLabel = value;
                    },
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
                onPressed: selectedNodeId == null
                    ? null
                    : () {
                        provider.createEdge(
                          sourceId: widget.node.id,
                          targetId: selectedNodeId!,
                          type: selectedRelationType,
                          directed: isDirected,
                          label: relationLabel,
                          strength: 1.0,
                        );
                        Navigator.of(context).pop();
                      },
                child: const Text('Verbinden'),
              ),
            ],
          );
        },
      ),
    );
  }

  /// Dialog zur Bestätigung des Löschens
  void _showDeleteConfirmDialog(BuildContext context, KnowledgeGraphProvider provider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Knoten löschen'),
        content: Text(
          'Möchten Sie den Knoten "${widget.node.label}" wirklich löschen? '
          'Diese Aktion kann nicht rückgängig gemacht werden und entfernt auch alle Verbindungen zu diesem Knoten.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Abbrechen'),
          ),
          ElevatedButton(
            onPressed: () {
              provider.removeNode(widget.node.id);
              Navigator.of(context).pop();
              widget.onClose();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
              foregroundColor: Colors.white,
            ),
            child: const Text('Löschen'),
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

  /// Gibt den Namen für einen Beziehungstyp zurück
  String _getRelationshipName(RelationshipType type) {
    switch (type) {
      case RelationshipType.related:
        return 'Allgemeine Beziehung';
      case RelationshipType.references:
        return 'Referenziert';
      case RelationshipType.includes:
        return 'Beinhaltet';
      case RelationshipType.causes:
        return 'Verursacht';
      case RelationshipType.opposes:
        return 'Steht im Gegensatz zu';
      case RelationshipType.similar:
        return 'Ähnlich zu';
      case RelationshipType.instance:
        return 'Instanz von';
      case RelationshipType.tag:
        return 'Hat Tag/Kategorie';
      case RelationshipType.custom:
        return 'Benutzerdefiniert';
      default:
        return 'Unbekannt';
    }
  }

  /// Gibt den Beziehungstext basierend auf Typ und Richtung zurück
  String _getRelationshipText(RelationshipType type, bool isOutgoing) {
    if (isOutgoing) {
      switch (type) {
        case RelationshipType.related:
          return 'Verwandt mit';
        case RelationshipType.references:
          return 'Referenziert';
        case RelationshipType.includes:
          return 'Beinhaltet';
        case RelationshipType.causes:
          return 'Verursacht';
        case RelationshipType.opposes:
          return 'Gegensatz zu';
        case RelationshipType.similar:
          return 'Ähnlich zu';
        case RelationshipType.instance:
          return 'Oberklasse von';
        case RelationshipType.tag:
          return 'Hat Tag';
        case RelationshipType.custom:
          return 'Verbunden mit';
        default:
          return 'Verbunden mit';
      }
    } else {
      switch (type) {
        case RelationshipType.related:
          return 'Verwandt mit';
        case RelationshipType.references:
          return 'Referenziert von';
        case RelationshipType.includes:
          return 'Teil von';
        case RelationshipType.causes:
          return 'Verursacht von';
        case RelationshipType.opposes:
          return 'Gegensatz zu';
        case RelationshipType.similar:
          return 'Ähnlich zu';
        case RelationshipType.instance:
          return 'Instanz von';
        case RelationshipType.tag:
          return 'Tag von';
        case RelationshipType.custom:
          return 'Verbunden mit';
        default:
          return 'Verbunden mit';
      }
    }
  }
} 