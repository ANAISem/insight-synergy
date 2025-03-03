import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:provider/provider.dart';

import 'core/theme/app_theme.dart';
import 'core/navigation/app_router.dart';
import 'core/services/api_service.dart';
import 'core/services/auth_service.dart';
import 'features/knowledge_base/providers/knowledge_provider.dart';
import 'features/search/providers/search_provider.dart';
import 'features/knowledge_graph/providers/knowledge_graph_provider.dart';
import 'features/home/screens/home_screen.dart';
import 'features/home/providers/home_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialisiere dotenv für Umgebungsvariablen
  await dotenv.load(fileName: '.env');
  
  // Initialisiere Hive für lokale Datenspeicherung
  await Hive.initFlutter();
  await Hive.openBox('settings');
  
  // Registriere Adapter für komplexe Datentypen
  // TODO: Registriere hier Hive-Adapter für KnowledgeNode und KnowledgeEdge wenn persistente Speicherung benötigt wird
  
  // Systemübergreifende UI-Einstellungen
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  
  runApp(const NexusApp());
}

class NexusApp extends StatelessWidget {
  const NexusApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final String apiBaseUrl = dotenv.env['API_BASE_URL'] ?? 'http://localhost:8000/api';
    final String apiKey = dotenv.env['API_KEY'] ?? '';
    
    return MultiProvider(
      providers: [
        // Basis-Services
        Provider<ApiService>(
          create: (_) => ApiService(
            baseUrl: apiBaseUrl,
            apiKey: apiKey,
          ),
        ),
        Provider<AuthService>(
          create: (context) => AuthService(
            apiService: context.read<ApiService>(),
          ),
        ),
        
        // Feature-spezifische Provider
        ChangeNotifierProvider<KnowledgeProvider>(
          create: (context) => KnowledgeProvider(
            apiService: context.read<ApiService>(),
          ),
        ),
        ChangeNotifierProvider<SearchProvider>(
          create: (context) => SearchProvider(
            apiService: context.read<ApiService>(),
          ),
        ),
        
        // Wissensgraph-Provider für die Visualisierung und Verwaltung von Knowledge-Graphen
        // Stellt Funktionen zum Laden, Manipulieren und Visualisieren von Graphen bereit
        ChangeNotifierProvider<KnowledgeGraphProvider>(
          create: (context) => KnowledgeGraphProvider(
            context.read<ApiService>(),
          ),
        ),
      ],
      child: MaterialApp(
        title: 'Nexus',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        initialRoute: AppRouter.initialRoute,
        onGenerateRoute: AppRouter.onGenerateRoute,
      ),
    );
  }
} 