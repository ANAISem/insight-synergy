import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/api_service.dart';
import 'providers/chat_provider.dart';
import 'screens/chat_screen.dart';
import 'screens/splash_screen.dart';
import 'utils/config.dart';
import 'utils/dynamic_config.dart';
import 'dart:developer' as developer;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialisiere die dynamische Konfiguration
  try {
    await DynamicConfig.initialize();
    developer.log('Dynamische Konfiguration initialisiert', name: 'main');
    developer.log('Verwende API URL: ${DynamicConfig.apiBaseUrl}', name: 'main');
    developer.log('Verwende WebSocket URL: ${DynamicConfig.wsBaseUrl}', name: 'main');
  } catch (e) {
    developer.log('Fehler bei der Initialisierung der dynamischen Konfiguration: $e', 
      name: 'main', error: e);
    developer.log('Verwende Standard-Konfiguration', name: 'main');
    developer.log('API URL: ${AppConfig.apiBaseUrl}', name: 'main');
    developer.log('WebSocket URL: ${AppConfig.wsBaseUrl}', name: 'main');
  }
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiService>(
          create: (_) {
            final api = ApiService(baseUrl: DynamicConfig.apiBaseUrl);
            developer.log('ApiService erstellt mit URL: ${DynamicConfig.apiBaseUrl}', name: 'main');
            return api;
          },
        ),
        ChangeNotifierProxyProvider<ApiService, ChatProvider>(
          create: (context) => ChatProvider(
            apiService: Provider.of<ApiService>(context, listen: false),
          ),
          update: (context, apiService, previous) =>
              previous ?? ChatProvider(apiService: apiService),
        ),
      ],
      child: MaterialApp(
        title: 'Insight Synergy',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          visualDensity: VisualDensity.adaptivePlatformDensity,
        ),
        home: const ChatScreen(),
        routes: {
          '/chat': (context) => const ChatScreen(),
        },
      ),
    );
  }
}
