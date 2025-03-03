import 'package:flutter/foundation.dart';
import '../../../core/services/api_service.dart';
import '../../../core/utils/logger.dart';
import '../../knowledge_base/models/knowledge_item.dart';
import '../models/search_result.dart';

/// Status der Suche
enum SearchStatus {
  idle,
  searching,
  completed,
  error,
}

/// Provider für die Suchfunktionalität
class SearchProvider extends ChangeNotifier {
  final ApiService apiService;
  
  // Zustand
  SearchStatus _status = SearchStatus.idle;
  String? _errorMessage;
  List<SearchResult> _searchResults = [];
  String _currentQuery = '';
  int _totalResults = 0;
  bool _isLoadingMore = false;
  
  // Sucheinstellungen
  int _maxResultsPerPage = 10;
  int _currentPage = 1;
  bool _hasMoreResults = false;
  
  // Getters
  SearchStatus get status => _status;
  String? get errorMessage => _errorMessage;
  List<SearchResult> get results => _searchResults;
  String get currentQuery => _currentQuery;
  int get totalResults => _totalResults;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasMoreResults => _hasMoreResults;
  
  // Konstruktor
  SearchProvider({
    required this.apiService,
  });
  
  /// Führt eine neue Suche durch
  Future<void> search(String query, {bool reset = true}) async {
    if (query.isEmpty) {
      // Keine leere Suche durchführen
      return;
    }
    
    try {
      // Status aktualisieren
      _currentQuery = query;
      
      if (reset) {
        _status = SearchStatus.searching;
        _searchResults = [];
        _currentPage = 1;
        notifyListeners();
      } else {
        _isLoadingMore = true;
        notifyListeners();
      }
      
      // API-Anfrage durchführen
      final response = await apiService.post(
        '/knowledge/search',
        data: {
          'query': query,
          'max_results': _maxResultsPerPage,
          'page': _currentPage,
        },
      );
      
      // Ergebnisse verarbeiten
      final List<dynamic> resultsJson = response['results'] ?? [];
      final results = resultsJson
          .map((json) => SearchResult.fromJson(json))
          .toList();
      
      if (reset) {
        _searchResults = results;
      } else {
        _searchResults.addAll(results);
      }
      
      _totalResults = response['total_results'] ?? resultsJson.length;
      _hasMoreResults = _searchResults.length < _totalResults;
      _status = SearchStatus.completed;
    } catch (e) {
      AppLogger.e('Fehler bei der Suche', e);
      _status = SearchStatus.error;
      _errorMessage = 'Fehler bei der Suche: $e';
    } finally {
      _isLoadingMore = false;
      notifyListeners();
    }
  }
  
  /// Lädt weitere Suchergebnisse
  Future<void> loadMoreResults() async {
    if (_isLoadingMore || !_hasMoreResults) {
      return;
    }
    
    _currentPage++;
    await search(_currentQuery, reset: false);
  }
  
  /// Führt eine semantische Suche mit RAG-Antwort durch
  Future<Map<String, dynamic>> queryWithRAG(
    String query, {
    int maxContextDocs = 5,
  }) async {
    try {
      final response = await apiService.queryKnowledge(
        query,
        maxContextDocs: maxContextDocs,
      );
      
      return response;
    } catch (e) {
      AppLogger.e('Fehler bei der RAG-Abfrage', e);
      throw Exception('Fehler bei der RAG-Abfrage: $e');
    }
  }
  
  /// Ruft Suchvorschläge für eine Eingabe ab
  Future<List<String>> getSuggestions(String input) async {
    if (input.length < 2) {
      return [];
    }
    
    try {
      final response = await apiService.get(
        '/knowledge/suggestions',
        queryParameters: {'query': input, 'max_suggestions': '5'},
      );
      
      return (response['suggestions'] as List).cast<String>();
    } catch (e) {
      AppLogger.e('Fehler beim Abrufen von Suchvorschlägen', e);
      return [];
    }
  }
  
  /// Setzt den Suchzustand zurück
  void resetSearch() {
    _status = SearchStatus.idle;
    _searchResults = [];
    _currentQuery = '';
    _totalResults = 0;
    _currentPage = 1;
    _hasMoreResults = false;
    _errorMessage = null;
    notifyListeners();
  }
} 