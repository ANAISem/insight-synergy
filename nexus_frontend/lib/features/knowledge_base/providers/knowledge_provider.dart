import 'package:flutter/foundation.dart';
import '../../../core/services/api_service.dart';
import '../../../core/utils/logger.dart';
import '../models/knowledge_item.dart';

/// Status des Datenabrufs
enum KnowledgeStatus {
  initial,
  loading,
  loaded,
  error,
}

/// Provider für die Wissensbasis-Verwaltung
class KnowledgeProvider extends ChangeNotifier {
  final ApiService apiService;
  
  // Zustand
  KnowledgeStatus _status = KnowledgeStatus.initial;
  String? _errorMessage;
  List<KnowledgeItem> _knowledgeItems = [];
  
  // Filter und Sortierung
  String _searchQuery = '';
  List<String> _selectedTags = [];
  
  // Getters
  KnowledgeStatus get status => _status;
  String? get errorMessage => _errorMessage;
  List<KnowledgeItem> get items => _knowledgeItems;
  String get searchQuery => _searchQuery;
  List<String> get selectedTags => _selectedTags;
  
  // Konstruktor
  KnowledgeProvider({
    required this.apiService,
  });
  
  /// Lädt die Wissensbasis
  Future<void> loadKnowledgeItems() async {
    try {
      _status = KnowledgeStatus.loading;
      _errorMessage = null;
      notifyListeners();
      
      // API-Aufruf für alle Wissenseinheiten
      // TODO: Paging implementieren für große Datenmengen
      final response = await apiService.get('/knowledge/items');
      
      _knowledgeItems = (response['items'] as List)
          .map((item) => KnowledgeItem.fromJson(item))
          .toList();
      
      _status = KnowledgeStatus.loaded;
    } catch (e) {
      AppLogger.e('Fehler beim Laden der Wissensbasis', e);
      _status = KnowledgeStatus.error;
      _errorMessage = 'Fehler beim Laden der Wissensbasis: $e';
    } finally {
      notifyListeners();
    }
  }
  
  /// Führt eine Suche in der Wissensbasis durch
  Future<void> searchKnowledge(String query) async {
    try {
      _searchQuery = query;
      _status = KnowledgeStatus.loading;
      notifyListeners();
      
      if (query.isEmpty) {
        // Bei leerem Query alle Einträge laden
        await loadKnowledgeItems();
        return;
      }
      
      final response = await apiService.searchKnowledge(query);
      
      _knowledgeItems = (response['results'] as List)
          .map((item) => KnowledgeItem.fromJson(item))
          .toList();
      
      _status = KnowledgeStatus.loaded;
    } catch (e) {
      AppLogger.e('Fehler bei der Suche', e);
      _status = KnowledgeStatus.error;
      _errorMessage = 'Fehler bei der Suche: $e';
    } finally {
      notifyListeners();
    }
  }
  
  /// Fügt eine neue Wissenseinheit hinzu
  Future<bool> addKnowledgeItem({
    required String title,
    required String content,
    String? source,
    List<String>? tags,
  }) async {
    try {
      final response = await apiService.storeKnowledge({
        'content': content,
        'title': title,
        'source': source,
        'tags': tags,
      });
      
      // Neuen Eintrag zur lokalen Liste hinzufügen
      final newItem = KnowledgeItem.fromJson(response['item']);
      _knowledgeItems.add(newItem);
      
      notifyListeners();
      return true;
    } catch (e) {
      AppLogger.e('Fehler beim Hinzufügen einer Wissenseinheit', e);
      return false;
    }
  }
  
  /// Aktualisiert eine bestehende Wissenseinheit
  Future<bool> updateKnowledgeItem(KnowledgeItem item) async {
    try {
      final response = await apiService.put(
        '/knowledge/items/${item.id}',
        data: item.toJson(),
      );
      
      // Lokalen Eintrag aktualisieren
      final updatedItem = KnowledgeItem.fromJson(response['item']);
      final index = _knowledgeItems.indexWhere((i) => i.id == item.id);
      
      if (index != -1) {
        _knowledgeItems[index] = updatedItem;
        notifyListeners();
      }
      
      return true;
    } catch (e) {
      AppLogger.e('Fehler beim Aktualisieren einer Wissenseinheit', e);
      return false;
    }
  }
  
  /// Löscht eine Wissenseinheit
  Future<bool> deleteKnowledgeItem(String id) async {
    try {
      await apiService.delete('/knowledge/items/$id');
      
      // Eintrag aus lokaler Liste entfernen
      _knowledgeItems.removeWhere((item) => item.id == id);
      notifyListeners();
      
      return true;
    } catch (e) {
      AppLogger.e('Fehler beim Löschen einer Wissenseinheit', e);
      return false;
    }
  }
  
  /// Aktualisiert die ausgewählten Tags für die Filterung
  void updateSelectedTags(List<String> tags) {
    _selectedTags = tags;
    notifyListeners();
  }
  
  /// Gibt die gefilterte Liste der Wissenseinheiten zurück
  List<KnowledgeItem> getFilteredItems() {
    if (_selectedTags.isEmpty) {
      return _knowledgeItems;
    }
    
    return _knowledgeItems.where((item) {
      return _selectedTags.every((tag) => item.hasTag(tag));
    }).toList();
  }
  
  /// Gibt alle eindeutigen Tags aus der Wissensbasis zurück
  List<String> getAllTags() {
    final Set<String> allTags = {};
    
    for (final item in _knowledgeItems) {
      allTags.addAll(item.tags);
    }
    
    return allTags.toList()..sort();
  }
} 