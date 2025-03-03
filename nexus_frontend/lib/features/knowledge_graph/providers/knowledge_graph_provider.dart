import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'dart:math' as math;
import 'package:uuid/uuid.dart';

import '../../../core/services/api_service.dart';
import '../../../core/utils/logger.dart';
import '../models/knowledge_graph.dart';
import '../models/knowledge_node.dart';
import '../models/knowledge_edge.dart';
import '../../knowledge_base/models/knowledge_item.dart';

/// Status des Wissensgraphen
enum GraphStatus {
  initial,   // Anfangszustand
  loading,   // Wird geladen
  loaded,    // Erfolgreich geladen
  updating,  // Wird aktualisiert
  error,     // Fehler aufgetreten
}

/// Provider für den Wissensgraphen
class KnowledgeGraphProvider extends ChangeNotifier {
  final ApiService _apiService;
  final _uuid = Uuid();
  
  // Status und Fehlermeldung
  GraphStatus _status = GraphStatus.initial;
  String? _errorMessage;
  
  // Aktuelle Daten
  KnowledgeGraph? _currentGraph;
  String? _selectedNodeId;
  
  // Layout-Parameter für die Visualisierung
  double _forceDirectedSpring = 0.5;
  double _forceDirectedCharge = -30.0;
  double _forceDirectedDistance = 100.0;
  bool _layoutRunning = false;
  
  // Getters
  GraphStatus get status => _status;
  String? get errorMessage => _errorMessage;
  KnowledgeGraph? get currentGraph => _currentGraph;
  String? get selectedNodeId => _selectedNodeId;
  bool get hasGraph => _currentGraph != null;
  
  // Layout-Parameter Getters
  double get forceDirectedSpring => _forceDirectedSpring;
  double get forceDirectedCharge => _forceDirectedCharge;
  double get forceDirectedDistance => _forceDirectedDistance;
  bool get layoutRunning => _layoutRunning;
  
  KnowledgeGraphProvider(this._apiService);
  
  /// Lädt den Wissensgraphen vom Server
  Future<void> loadGraph(String graphId) async {
    _status = GraphStatus.loading;
    _errorMessage = null;
    notifyListeners();
    
    try {
      final response = await _apiService.get('/api/graph/$graphId');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _currentGraph = KnowledgeGraph.fromJson(data);
        _status = GraphStatus.loaded;
      } else {
        _errorMessage = 'Fehler beim Laden des Graphen: ${response.statusCode}';
        _status = GraphStatus.error;
        AppLogger.error(_errorMessage!);
      }
    } catch (e) {
      _errorMessage = 'Fehler beim Laden des Graphen: $e';
      _status = GraphStatus.error;
      AppLogger.error(_errorMessage!, error: e);
    }
    
    notifyListeners();
  }
  
  /// Speichert den aktuellen Graphen auf dem Server
  Future<void> saveGraph() async {
    if (_currentGraph == null) {
      AppLogger.warning('Kein Graph zum Speichern vorhanden');
      return;
    }
    
    _status = GraphStatus.updating;
    notifyListeners();
    
    try {
      final response = await _apiService.put(
        '/api/graph/${_currentGraph!.id}',
        body: jsonEncode(_currentGraph!.toJson()),
      );
      
      if (response.statusCode == 200) {
        _status = GraphStatus.loaded;
      } else {
        _errorMessage = 'Fehler beim Speichern des Graphen: ${response.statusCode}';
        _status = GraphStatus.error;
        AppLogger.error(_errorMessage!);
      }
    } catch (e) {
      _errorMessage = 'Fehler beim Speichern des Graphen: $e';
      _status = GraphStatus.error;
      AppLogger.error(_errorMessage!, error: e);
    }
    
    notifyListeners();
  }
  
  /// Erstellt einen neuen Graphen
  void createNewGraph(String name, {String? description}) {
    final newGraph = KnowledgeGraph(
      id: _uuid.v4(),
      name: name,
      description: description,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    
    _currentGraph = newGraph;
    _status = GraphStatus.loaded;
    _selectedNodeId = null;
    notifyListeners();
  }
  
  /// Fügt einen neuen Knoten zum Graphen hinzu
  void addNode(KnowledgeNode node) {
    if (_currentGraph == null) return;
    
    _currentGraph = _currentGraph!.addNode(node);
    notifyListeners();
  }
  
  /// Erstellt einen neuen Knoten mit einer spezifischen Position
  void createNode({
    required String label,
    required KnowledgeNodeType type,
    String? description,
    String? referenceId,
    double importance = 1.0,
    Map<String, dynamic>? properties,
  }) {
    if (_currentGraph == null) return;
    
    final node = KnowledgeNode(
      id: _uuid.v4(),
      label: label,
      description: description,
      type: type,
      importance: importance,
      referenceId: referenceId,
      properties: properties,
    );
    
    _currentGraph = _currentGraph!.addNode(node);
    notifyListeners();
  }
  
  /// Fügt eine neue Kante zum Graphen hinzu
  void addEdge(KnowledgeEdge edge) {
    if (_currentGraph == null) return;
    
    _currentGraph = _currentGraph!.addEdge(edge);
    notifyListeners();
  }
  
  /// Erstellt eine neue Kante zwischen zwei Knoten
  void createEdge({
    required String sourceId,
    required String targetId,
    required RelationshipType type,
    String? label,
    double strength = 1.0,
    bool directed = true,
    Map<String, dynamic>? properties,
  }) {
    if (_currentGraph == null) return;
    
    final edge = KnowledgeEdge(
      id: _uuid.v4(),
      sourceId: sourceId,
      targetId: targetId,
      type: type,
      label: label,
      strength: strength,
      directed: directed,
      properties: properties,
    );
    
    _currentGraph = _currentGraph!.addEdge(edge);
    notifyListeners();
  }
  
  /// Aktualisiert einen vorhandenen Knoten
  void updateNode(KnowledgeNode updatedNode) {
    if (_currentGraph == null) return;
    
    _currentGraph = _currentGraph!.updateNode(updatedNode);
    notifyListeners();
  }
  
  /// Aktualisiert eine vorhandene Kante
  void updateEdge(KnowledgeEdge updatedEdge) {
    if (_currentGraph == null) return;
    
    _currentGraph = _currentGraph!.updateEdge(updatedEdge);
    notifyListeners();
  }
  
  /// Entfernt einen Knoten und alle verbundenen Kanten
  void removeNode(String nodeId) {
    if (_currentGraph == null) return;
    
    _currentGraph = _currentGraph!.removeNode(nodeId);
    
    if (_selectedNodeId == nodeId) {
      _selectedNodeId = null;
    }
    
    notifyListeners();
  }
  
  /// Entfernt eine Kante
  void removeEdge(String edgeId) {
    if (_currentGraph == null) return;
    
    _currentGraph = _currentGraph!.removeEdge(edgeId);
    notifyListeners();
  }
  
  /// Wählt einen Knoten aus
  void selectNode(String? nodeId) {
    _selectedNodeId = nodeId;
    notifyListeners();
  }
  
  /// Startet die Force-Directed-Layout-Berechnung
  void startForceDirectedLayout() {
    if (_layoutRunning || _currentGraph == null) return;
    
    _layoutRunning = true;
    notifyListeners();
    
    // Hier würde in einem echten Implementierungsdetail ein ausführlicher 
    // Force-Directed-Algorithmus starten, der die Positionen der Knoten
    // dynamisch berechnet und regelmäßig aktualisiert.
    // In dieser Version markieren wir es nur als laufend
  }
  
  /// Stoppt die Layout-Berechnung
  void stopForceDirectedLayout() {
    _layoutRunning = false;
    notifyListeners();
  }
  
  /// Aktualisiert die Layout-Parameter
  void updateLayoutParameters({
    double? spring,
    double? charge,
    double? distance,
  }) {
    if (spring != null) _forceDirectedSpring = spring;
    if (charge != null) _forceDirectedCharge = charge;
    if (distance != null) _forceDirectedDistance = distance;
    notifyListeners();
  }
  
  /// Konvertiert ein KnowledgeItem in einen Knoten
  KnowledgeNode knowledgeItemToNode(KnowledgeItem item) {
    return KnowledgeNode(
      id: 'item_${item.id}',
      label: item.title,
      description: item.contentPreview,
      type: KnowledgeNodeType.document,
      referenceId: item.id,
      properties: {
        'source': item.source,
        'language': item.language,
        'tags': item.tags,
      },
    );
  }
  
  /// Finde Verbindungen zwischen Wissensobjekten basierend auf gemeinsamen Tags
  Future<void> generateGraphFromKnowledgeItems(List<KnowledgeItem> items) async {
    if (items.isEmpty) return;
    
    createNewGraph('Wissensnetzwerk', description: 'Automatisch generiert aus Wissenselementen');
    
    // Erstelle Knoten für jedes Wissenselement
    for (final item in items) {
      final node = knowledgeItemToNode(item);
      addNode(node);
    }
    
    // Erstelle Knoten für häufig vorkommende Tags
    final tagFrequency = <String, int>{};
    for (final item in items) {
      for (final tag in item.tags) {
        tagFrequency[tag] = (tagFrequency[tag] ?? 0) + 1;
      }
    }
    
    // Nur häufige Tags hinzufügen (mindestens 2 Vorkommen)
    for (final entry in tagFrequency.entries) {
      if (entry.value >= 2) {
        final tagNode = KnowledgeNode(
          id: 'tag_${entry.key}',
          label: entry.key,
          type: KnowledgeNodeType.tag,
          importance: math.min(2.0, 0.5 + (entry.value / 10)),
        );
        addNode(tagNode);
      }
    }
    
    // Verbindungen zwischen Wissenselementen und Tags erstellen
    for (final item in items) {
      final nodeId = 'item_${item.id}';
      
      // Mit Tags verbinden
      for (final tag in item.tags) {
        final tagNodeId = 'tag_$tag';
        if (_currentGraph!.nodes.any((node) => node.id == tagNodeId)) {
          createEdge(
            sourceId: nodeId,
            targetId: tagNodeId,
            type: RelationshipType.tag,
            directed: true,
          );
        }
      }
      
      // Ähnliche Elemente verbinden (gemeinsame Tags)
      for (final otherItem in items) {
        if (item.id == otherItem.id) continue;
        
        final commonTags = item.tags.toSet().intersection(otherItem.tags.toSet());
        if (commonTags.length >= 2) {
          createEdge(
            sourceId: nodeId,
            targetId: 'item_${otherItem.id}',
            type: RelationshipType.similar,
            strength: 0.3 + (commonTags.length * 0.1),
            directed: false,
          );
        }
      }
    }
    
    notifyListeners();
  }
} 