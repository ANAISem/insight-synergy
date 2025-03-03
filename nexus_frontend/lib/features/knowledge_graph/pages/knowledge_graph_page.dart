import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/knowledge_graph_provider.dart';
import '../widgets/knowledge_graph_view.dart';
import '../widgets/node_details_view.dart';
import '../../../core/services/logger.dart';
import '../../knowledge_base/providers/knowledge_provider.dart';

class KnowledgeGraphPage extends StatefulWidget {
  const KnowledgeGraphPage({Key? key}) : super(key: key);

  @override
  State<KnowledgeGraphPage> createState() => _KnowledgeGraphPageState();
}

class _KnowledgeGraphPageState extends State<KnowledgeGraphPage> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  
  @override
  void initState() {
    super.initState();
    
    // Lade die Wissensbasis, falls noch nicht geladen
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadInitialData();
    });
  }
  
  Future<void> _loadInitialData() async {
    final knowledgeProvider = Provider.of<KnowledgeProvider>(context, listen: false);
    final graphProvider = Provider.of<KnowledgeGraphProvider>(context, listen: false);
    
    try {
      // Falls noch keine Wissenselemente geladen wurden, lade sie
      if (knowledgeProvider.status != KnowledgeStatus.loaded) {
        await knowledgeProvider.loadKnowledgeItems();
      }
      
      // Falls wir noch keinen Graphen haben, erstelle einen Beispielgraphen
      if (!graphProvider.hasGraph) {
        // Erstelle einen neuen leeren Graphen
        graphProvider.createNewGraph('Wissensnetzwerk', 
          description: 'Automatisch generiertes Wissensnetzwerk');
        
        // Generiere Graphen aus den Wissenselementen
        if (knowledgeProvider.items.isNotEmpty) {
          await graphProvider.generateGraphFromKnowledgeItems(knowledgeProvider.items);
        }
      }
    } catch (e) {
      AppLogger.error('Fehler beim Laden der Wissensgraph-Daten', error: e);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fehler beim Laden: $e')),
        );
      }
    }
  }
  
  void _showGraphSettings(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Grapheneinstellungen'),
        content: Consumer<KnowledgeGraphProvider>(
          builder: (context, provider, child) {
            return SizedBox(
              width: 400,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Layouts:', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  
                  // Springkraft einstellen
                  Row(
                    children: [
                      const SizedBox(width: 100, child: Text('Springkraft:')),
                      Expanded(
                        child: Slider(
                          value: provider.forceDirectedSpring,
                          min: 0.1,
                          max: 1.0,
                          divisions: 9,
                          label: provider.forceDirectedSpring.toStringAsFixed(1),
                          onChanged: (value) {
                            provider.updateLayoutParameters(spring: value);
                          },
                        ),
                      ),
                    ],
                  ),
                  
                  // Abstoßungskraft einstellen
                  Row(
                    children: [
                      const SizedBox(width: 100, child: Text('Abstoßung:')),
                      Expanded(
                        child: Slider(
                          value: provider.forceDirectedCharge.abs(),
                          min: 10.0,
                          max: 100.0,
                          divisions: 9,
                          label: provider.forceDirectedCharge.abs().toStringAsFixed(0),
                          onChanged: (value) {
                            provider.updateLayoutParameters(charge: -value);
                          },
                        ),
                      ),
                    ],
                  ),
                  
                  // Abstand einstellen
                  Row(
                    children: [
                      const SizedBox(width: 100, child: Text('Abstand:')),
                      Expanded(
                        child: Slider(
                          value: provider.forceDirectedDistance,
                          min: 50.0,
                          max: 200.0,
                          divisions: 10,
                          label: provider.forceDirectedDistance.toStringAsFixed(0),
                          onChanged: (value) {
                            provider.updateLayoutParameters(distance: value);
                          },
                        ),
                      ),
                    ],
                  ),
                  
                  const Divider(),
                  
                  ElevatedButton.icon(
                    icon: Icon(
                      provider.layoutRunning ? Icons.pause : Icons.play_arrow,
                    ),
                    label: Text(
                      provider.layoutRunning ? 'Layout pausieren' : 'Layout starten',
                    ),
                    onPressed: () {
                      if (provider.layoutRunning) {
                        provider.stopForceDirectedLayout();
                      } else {
                        provider.startForceDirectedLayout();
                      }
                      Navigator.of(context).pop();
                    },
                  ),
                ],
              ),
            );
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Schließen'),
          ),
        ],
      ),
    );
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    final isWideScreen = size.width > 1200;
    
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        title: const Text('Wissensgraph'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => _showGraphSettings(context),
            tooltip: 'Grapheneinstellungen',
          ),
          Consumer<KnowledgeGraphProvider>(
            builder: (context, provider, child) {
              return IconButton(
                icon: Icon(
                  provider.layoutRunning ? Icons.pause : Icons.play_arrow,
                ),
                onPressed: () {
                  if (provider.layoutRunning) {
                    provider.stopForceDirectedLayout();
                  } else {
                    provider.startForceDirectedLayout();
                  }
                },
                tooltip: provider.layoutRunning ? 'Layout pausieren' : 'Layout starten',
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              // Hier könnte ein Dialog zum Erstellen eines neuen Knotens geöffnet werden
              AppLogger.info('Neuen Knoten erstellen');
            },
            tooltip: 'Neuen Knoten erstellen',
          ),
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: () {
              final provider = Provider.of<KnowledgeGraphProvider>(context, listen: false);
              provider.saveGraph();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Graph gespeichert')),
              );
            },
            tooltip: 'Graph speichern',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              final knowledgeProvider = Provider.of<KnowledgeProvider>(context, listen: false);
              final graphProvider = Provider.of<KnowledgeGraphProvider>(context, listen: false);
              
              graphProvider.generateGraphFromKnowledgeItems(knowledgeProvider.items);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Graph neu generiert')),
              );
            },
            tooltip: 'Graph neu generieren',
          ),
        ],
      ),
      body: Consumer<KnowledgeGraphProvider>(
        builder: (context, provider, child) {
          if (provider.status == GraphStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }
          
          if (provider.status == GraphStatus.error) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Fehler: ${provider.errorMessage ?? "Unbekannter Fehler"}',
                    style: TextStyle(color: theme.colorScheme.error),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadInitialData,
                    child: const Text('Erneut versuchen'),
                  ),
                ],
              ),
            );
          }
          
          // Wide screen: Graph links, Details rechts
          if (isWideScreen) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Graph-Ansicht
                Expanded(
                  flex: 3,
                  child: Container(
                    padding: const EdgeInsets.all(16.0),
                    child: const KnowledgeGraphView(
                      showControls: false,
                    ),
                  ),
                ),
                
                // Vertikaler Teiler
                VerticalDivider(
                  width: 1,
                  thickness: 1,
                  color: theme.dividerColor,
                ),
                
                // Details-Ansicht
                Expanded(
                  flex: 1,
                  child: Container(
                    padding: const EdgeInsets.all(8.0),
                    child: const NodeDetailsView(),
                  ),
                ),
              ],
            );
          } else {
            // Schmales Layout: Graph oben, Details unten, oder als separate Seite
            return Column(
              children: [
                // Graph-Ansicht
                Expanded(
                  flex: 2,
                  child: Container(
                    padding: const EdgeInsets.all(16.0),
                    child: const KnowledgeGraphView(),
                  ),
                ),
                
                // Details ausklappbar machen
                if (provider.selectedNodeId != null) ...[
                  Divider(height: 1, thickness: 1, color: theme.dividerColor),
                  
                  Expanded(
                    flex: 1,
                    child: Container(
                      padding: const EdgeInsets.all(8.0),
                      child: const NodeDetailsView(),
                    ),
                  ),
                ],
              ],
            );
          }
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Öffne den Drawer für Filteroptionen
          _scaffoldKey.currentState?.openEndDrawer();
        },
        tooltip: 'Filter',
        child: const Icon(Icons.filter_list),
      ),
      endDrawer: Drawer(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Filteroption',
                  style: theme.textTheme.titleLarge,
                ),
                const SizedBox(height: 16),
                const Text('Knotentypen:'),
                CheckboxListTile(
                  title: const Text('Konzepte'),
                  value: true,
                  onChanged: (value) {},
                ),
                CheckboxListTile(
                  title: const Text('Dokumente'),
                  value: true,
                  onChanged: (value) {},
                ),
                CheckboxListTile(
                  title: const Text('Entitäten'),
                  value: true,
                  onChanged: (value) {},
                ),
                CheckboxListTile(
                  title: const Text('Tags'),
                  value: true,
                  onChanged: (value) {},
                ),
                
                const Divider(),
                
                const Text('Beziehungstypen:'),
                CheckboxListTile(
                  title: const Text('Verbunden'),
                  value: true,
                  onChanged: (value) {},
                ),
                CheckboxListTile(
                  title: const Text('Referenziert'),
                  value: true,
                  onChanged: (value) {},
                ),
                // Weitere Filteroptionen
                
                const Spacer(),
                
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () {},
                      child: const Text('Zurücksetzen'),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                      },
                      child: const Text('Anwenden'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
} 