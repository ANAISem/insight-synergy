import 'package:flutter/material.dart';

import '../../features/home/screens/home_screen.dart';
//import '../../features/knowledge_base/screens/knowledge_base_screen.dart';
//import '../../features/search/screens/search_screen.dart';
import '../../features/knowledge_graph/screens/knowledge_graph_screen.dart';
//import '../../features/knowledge_management/screens/knowledge_management_screen.dart';
//import '../../features/settings/screens/settings_screen.dart';
import '../../features/cognitive_loop/screens/cognitive_loop_screen.dart';
import 'routes.dart';

/// Zentrale Router-Konfiguration für die App-Navigation
class AppRouter {
  static String get initialRoute => AppRoutes.home;
  
  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case AppRoutes.home:
        return MaterialPageRoute(
          builder: (_) => const HomeScreen(),
          settings: settings,
        );
        
      case AppRoutes.knowledgeBase:
        // Temporärer Fallback, bis KnowledgeBaseScreen implementiert ist
        return MaterialPageRoute(
          builder: (_) => const Scaffold(
            body: Center(
              child: Text('Wissensbasis wird noch implementiert'),
            ),
          ),
          settings: settings,
        );
        
      case AppRoutes.search:
        final query = settings.arguments as String?;
        // Temporärer Fallback, bis SearchScreen implementiert ist
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(
              child: Text('Suche wird noch implementiert (Query: ${query ?? "keine"})'),
            ),
          ),
          settings: settings,
        );
        
      case AppRoutes.knowledgeGraph:
        final nodeId = settings.arguments as String?;
        return MaterialPageRoute(
          builder: (_) => KnowledgeGraphScreen(initialNodeId: nodeId),
          settings: settings,
        );
        
      case AppRoutes.cognitiveLoop:
        return MaterialPageRoute(
          builder: (_) => const CognitiveLoopScreen(),
          settings: settings,
        );
        
      case AppRoutes.settings:
        // Temporärer Fallback, bis SettingsScreen implementiert ist
        return MaterialPageRoute(
          builder: (_) => const Scaffold(
            body: Center(
              child: Text('Einstellungen werden noch implementiert'),
            ),
          ),
          settings: settings,
        );
        
      default:
        // Fallback-Route bei unbekanntem Pfad
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(
              child: Text('Keine Route definiert für ${settings.name}'),
            ),
          ),
          settings: settings,
        );
    }
  }
  
  /// Navigation zur Home-Seite
  static void navigateToHome(BuildContext context) {
    Navigator.pushNamedAndRemoveUntil(
      context,
      AppRoutes.home,
      (route) => false,
    );
  }
  
  /// Navigation zur Wissensbasis
  static void navigateToKnowledgeBase(BuildContext context) {
    Navigator.pushNamed(context, AppRoutes.knowledgeBase);
  }
  
  /// Navigation zur Suchfunktion
  static void navigateToSearch(BuildContext context, {String? initialQuery}) {
    Navigator.pushNamed(
      context,
      AppRoutes.search,
      arguments: initialQuery,
    );
  }
  
  /// Navigation zur Wissensvisualisierung
  static void navigateToKnowledgeGraph(BuildContext context, {String? nodeId}) {
    Navigator.pushNamed(
      context,
      AppRoutes.knowledgeGraph,
      arguments: nodeId,
    );
  }
  
  /// Navigation zu den Einstellungen
  static void navigateToSettings(BuildContext context) {
    Navigator.pushNamed(context, AppRoutes.settings);
  }
  
  /// Navigation zur kognitiven Schleife
  static void navigateToCognitiveLoop(BuildContext context) {
    Navigator.pushNamed(context, AppRoutes.cognitiveLoop);
  }
} 