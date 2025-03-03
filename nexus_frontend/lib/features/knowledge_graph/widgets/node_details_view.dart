import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter/services.dart';

import '../models/knowledge_node.dart';
import '../providers/knowledge_graph_provider.dart';
import '../../knowledge_base/models/knowledge_item.dart';
import '../../knowledge_base/providers/knowledge_provider.dart';
import '../../../core/services/logger.dart';

/// Widget zur Anzeige von Details zu einem ausgewählten Knoten
class NodeDetailsView extends StatelessWidget {
  final bool showActions;
  final bool showRelatedNodes;
  final ScrollController? scrollController;
  
  const NodeDetailsView({
    Key? key,
    this.showActions = true,
    this.showRelatedNodes = true,
    this.scrollController,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final graphProvider = Provider.of<KnowledgeGraphProvider>(context);
    
    // Wenn kein Knoten ausgewählt ist
    if (graphProvider.selectedNodeId == null || graphProvider.currentGraph == null) {
      return Center(
        child: Text(
          'Kein Knoten ausgewählt',
          style: theme.textTheme.bodyLarge,
        ),
      );
    }
    
    // Finde den ausgewählten Knoten
    final selectedNode = graphProvider.currentGraph!.nodes.firstWhere(
      (node) => node.id == graphProvider.selectedNodeId,
      orElse: () => throw Exception('Ausgewählter Knoten nicht gefunden'),
    );
    
    // Finde alle mit diesem Knoten verbundenen Kanten
    final connectedEdges = graphProvider.currentGraph!.getEdgesForNode(selectedNode.id);
    
    // Finde alle verbundenen Knoten
    final connectedNodes = graphProvider.currentGraph!.getConnectedNodes(selectedNode.id);
    
    return SingleChildScrollView(
      controller: scrollController,
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildNodeHeader(context, selectedNode, theme),
          
          const SizedBox(height: 16),
          
          _buildNodeDetails(context, selectedNode, theme),
          
          if (showActions)
            _buildActions(context, selectedNode, theme),
          
          if (showRelatedNodes && connectedNodes.isNotEmpty)
            _buildRelatedNodesSection(context, connectedNodes, connectedEdges, theme, graphProvider),
        ],
      ),
    );
  }
  
  Widget _buildNodeHeader(BuildContext context, KnowledgeNode node, ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _buildNodeTypeIcon(node.type, theme),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                node.label,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        if (node.description != null)
          Padding(
            padding: const EdgeInsets.only(top: 8.0),
            child: Text(
              node.description!,
              style: theme.textTheme.bodyMedium,
            ),
          ),
      ],
    );
  }
  
  Widget _buildNodeDetails(BuildContext context, KnowledgeNode node, ThemeData theme) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildDetailRow('ID', node.id, theme, isCopiable: true),
            _buildDetailRow('Typ', _getNodeTypeName(node.type), theme),
            _buildDetailRow('Wichtigkeit', node.importance.toStringAsFixed(2), theme),
            
            if (node.referenceId != null)
              _buildDetailRow('Referenz-ID', node.referenceId!, theme, isCopiable: true),
              
            if (node.properties.isNotEmpty)
              _buildPropertiesSection(node.properties, theme),
              
            if (node.type == KnowledgeNodeType.document && node.referenceId != null)
              _buildKnowledgeItemPreview(context, node.referenceId!, theme),
          ],
        ),
      ),
    );
  }
  
  Widget _buildDetailRow(String label, String value, ThemeData theme, {bool isCopiable = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: theme.textTheme.bodyMedium,
            ),
          ),
          if (isCopiable)
            IconButton(
              icon: const Icon(Icons.copy, size: 16),
              splashRadius: 20,
              onPressed: () {
                Clipboard.setData(ClipboardData(text: value));
                ScaffoldMessenger.of(theme.scaffoldBackgroundColor as BuildContext).showSnackBar(
                  SnackBar(content: Text('$label kopiert')),
                );
              },
              tooltip: 'Kopieren',
            ),
        ],
      ),
    );
  }
  
  Widget _buildPropertiesSection(Map<String, dynamic> properties, ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8.0, bottom: 8.0),
          child: Text(
            'Eigenschaften:',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        ...properties.entries.map((entry) {
          final key = entry.key;
          final value = entry.value is List 
              ? (entry.value as List).join(', ') 
              : entry.value.toString();
              
          return Padding(
            padding: const EdgeInsets.only(left: 16.0, bottom: 4.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 84,
                  child: Text(
                    '$key:',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    value,
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ],
    );
  }
  
  Widget _buildKnowledgeItemPreview(BuildContext context, String knowledgeItemId, ThemeData theme) {
    // Versuche, das KnowledgeItem aus dem Provider zu holen
    return Padding(
      padding: const EdgeInsets.only(top: 16.0),
      child: Consumer<KnowledgeProvider>(
        builder: (context, knowledgeProvider, child) {
          // Suche das KnowledgeItem anhand seiner ID
          final knowledgeItem = knowledgeProvider.items.firstWhere(
            (item) => item.id == knowledgeItemId,
            orElse: () => KnowledgeItem(
              id: knowledgeItemId,
              title: 'Nicht gefunden',
              content: 'Dieses Wissenselement konnte nicht geladen werden.',
              source: 'unbekannt',
              createdAt: DateTime.now(),
              updatedAt: DateTime.now(),
            ),
          );
          
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Verknüpftes Wissenselement:',
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Card(
                elevation: 1,
                color: theme.colorScheme.surface,
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        knowledgeItem.title,
                        style: theme.textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        knowledgeItem.contentPreview,
                        style: theme.textTheme.bodyMedium,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton(
                            onPressed: () {
                              // Hier könnte eine Navigation zur vollständigen Ansicht implementiert werden
                              AppLogger.info('Navigation zu Wissenselement ${knowledgeItem.id}');
                            },
                            child: const Text('Details anzeigen'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
  
  Widget _buildActions(BuildContext context, KnowledgeNode node, ThemeData theme) {
    final graphProvider = Provider.of<KnowledgeGraphProvider>(context, listen: false);
    
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Aktionen:',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ElevatedButton.icon(
                icon: const Icon(Icons.edit),
                label: const Text('Bearbeiten'),
                onPressed: () {
                  // Hier könnte ein Dialog zum Bearbeiten des Knotens geöffnet werden
                  AppLogger.info('Knoten bearbeiten: ${node.id}');
                },
              ),
              OutlinedButton.icon(
                icon: const Icon(Icons.delete),
                label: const Text('Löschen'),
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Knoten löschen'),
                      content: Text(
                        'Möchten Sie den Knoten "${node.label}" wirklich löschen? '
                        'Alle verbundenen Kanten werden ebenfalls entfernt.',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Abbrechen'),
                        ),
                        TextButton(
                          onPressed: () {
                            graphProvider.removeNode(node.id);
                            Navigator.of(context).pop();
                          },
                          child: const Text('Löschen'),
                        ),
                      ],
                    ),
                  );
                },
              ),
              OutlinedButton.icon(
                icon: const Icon(Icons.add_link),
                label: const Text('Verknüpfen'),
                onPressed: () {
                  // Hier könnte ein Dialog zum Erstellen einer neuen Kante geöffnet werden
                  AppLogger.info('Neue Verknüpfung für Knoten: ${node.id}');
                },
              ),
              if (node.type == KnowledgeNodeType.document && node.referenceId != null)
                OutlinedButton.icon(
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('Öffnen'),
                  onPressed: () {
                    // Hier könnte das verknüpfte Dokument geöffnet werden
                    AppLogger.info('Dokument öffnen: ${node.referenceId}');
                  },
                ),
            ],
          ),
        ],
      ),
    );
  }
  
  Widget _buildRelatedNodesSection(
    BuildContext context, 
    List<KnowledgeNode> connectedNodes, 
    List<KnowledgeEdge> connectedEdges,
    ThemeData theme,
    KnowledgeGraphProvider graphProvider,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 16.0, bottom: 8.0),
          child: Text(
            'Verbundene Knoten:',
            style: theme.textTheme.titleMedium,
          ),
        ),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: connectedNodes.length,
          itemBuilder: (context, index) {
            final node = connectedNodes[index];
            
            // Finde die Kante, die diesen Knoten mit dem ausgewählten verbindet
            final edge = connectedEdges.firstWhere(
              (e) => e.sourceId == node.id || e.targetId == node.id,
              orElse: () => throw Exception('Verbindende Kante nicht gefunden'),
            );
            
            // Bestimme die Richtung (eingehend/ausgehend)
            final isIncoming = edge.targetId == graphProvider.selectedNodeId;
            final relationshipDescription = _getRelationshipDescription(edge.type, isIncoming);
            
            return Card(
              margin: const EdgeInsets.only(bottom: 8.0),
              child: ListTile(
                leading: _buildNodeTypeIcon(node.type, theme),
                title: Text(node.label),
                subtitle: Text(relationshipDescription),
                trailing: IconButton(
                  icon: const Icon(Icons.arrow_forward),
                  onPressed: () {
                    // Wechsle zum verbundenen Knoten
                    graphProvider.selectNode(node.id);
                  },
                  tooltip: 'Zu diesem Knoten wechseln',
                ),
                onTap: () {
                  // Wechsle zum verbundenen Knoten
                  graphProvider.selectNode(node.id);
                },
              ),
            );
          },
        ),
      ],
    );
  }
  
  Widget _buildNodeTypeIcon(KnowledgeNodeType type, ThemeData theme) {
    IconData iconData;
    Color iconColor;
    
    switch (type) {
      case KnowledgeNodeType.concept:
        iconData = Icons.lightbulb_outline;
        iconColor = Colors.amber;
        break;
      case KnowledgeNodeType.document:
        iconData = Icons.article_outlined;
        iconColor = Colors.blue;
        break;
      case KnowledgeNodeType.entity:
        iconData = Icons.person_outline;
        iconColor = Colors.green;
        break;
      case KnowledgeNodeType.tag:
        iconData = Icons.local_offer_outlined;
        iconColor = Colors.purple;
        break;
      case KnowledgeNodeType.custom:
        iconData = Icons.category_outlined;
        iconColor = Colors.grey;
        break;
    }
    
    return CircleAvatar(
      backgroundColor: iconColor.withOpacity(0.2),
      child: Icon(iconData, color: iconColor),
    );
  }
  
  String _getNodeTypeName(KnowledgeNodeType type) {
    switch (type) {
      case KnowledgeNodeType.concept:
        return 'Konzept';
      case KnowledgeNodeType.document:
        return 'Dokument';
      case KnowledgeNodeType.entity:
        return 'Entität';
      case KnowledgeNodeType.tag:
        return 'Tag';
      case KnowledgeNodeType.custom:
        return 'Benutzerdefiniert';
    }
  }
  
  String _getRelationshipDescription(RelationshipType type, bool isIncoming) {
    final direction = isIncoming ? 'von' : 'zu';
    
    switch (type) {
      case RelationshipType.related:
        return 'Verbunden $direction';
      case RelationshipType.references:
        return isIncoming ? 'Wird referenziert von' : 'Referenziert';
      case RelationshipType.includes:
        return isIncoming ? 'Wird beinhaltet von' : 'Beinhaltet';
      case RelationshipType.causes:
        return isIncoming ? 'Wird verursacht durch' : 'Verursacht';
      case RelationshipType.opposes:
        return 'Steht im Gegensatz zu';
      case RelationshipType.similar:
        return 'Ähnlich zu';
      case RelationshipType.instance:
        return isIncoming ? 'Ist Instanz von' : 'Hat Instanz';
      case RelationshipType.tag:
        return isIncoming ? 'Getaggt mit' : 'Tag für';
      case RelationshipType.custom:
        return 'Benutzerdefinierte Beziehung';
    }
  }
} 