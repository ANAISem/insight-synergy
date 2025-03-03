/// AppRoutes: Definiert alle Navigationspfade für die Nexus App
class AppRoutes {
  // Hauptrouten
  static const String home = '/';
  static const String knowledgeBase = '/knowledge-base';
  static const String search = '/search';
  static const String knowledgeGraph = '/knowledge-graph';
  static const String cognitiveLoop = '/cognitive-loop';
  static const String settings = '/settings';
  
  // Unterrouten
  static const String knowledgeBaseDetail = '/knowledge-base/detail';
  static const String knowledgeBaseCreate = '/knowledge-base/create';
  static const String knowledgeBaseEdit = '/knowledge-base/edit';
  
  static const String knowledgeGraphDetail = '/knowledge-graph/detail';
  static const String knowledgeGraphCreate = '/knowledge-graph/create';
  static const String knowledgeGraphEdit = '/knowledge-graph/edit';
  
  static const String searchResults = '/search/results';
  static const String searchAdvanced = '/search/advanced';
  
  // Einstellungen
  static const String initialRoute = home;
} 