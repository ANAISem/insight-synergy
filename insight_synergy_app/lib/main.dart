import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:io' show Platform, exit;
import 'services/api_service.dart';
import 'providers/chat_provider.dart';
import 'providers/auth_provider.dart';
import 'screens/chat_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'utils/config.dart';
import 'utils/dynamic_config.dart';
import 'dart:developer' as developer;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Prüfe, ob Ollama installiert ist (nur auf Desktop-Plattformen)
  if (AppConfig.isDesktop && AppConfig.useLocalModelByDefault) {
    await checkOllamaInstallation();
  }
  
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

// Prüft, ob Ollama installiert ist und das Mistral-Modell verfügbar ist
Future<void> checkOllamaInstallation() async {
  try {
    final result = await Process.run('which', ['ollama']);
    
    if (result.exitCode != 0) {
      // Ollama ist nicht installiert
      showOllamaInstallationDialog();
    } else {
      // Prüfe, ob das Mistral-Modell verfügbar ist
      final modelResult = await Process.run('ollama', ['list']);
      
      if (!modelResult.stdout.toString().contains(AppConfig.mistralModelName)) {
        // Mistral-Modell ist nicht verfügbar
        developer.log('Mistral-Modell nicht gefunden. Die App funktioniert möglicherweise nicht korrekt.', 
          name: 'main');
      } else {
        developer.log('Mistral-Modell gefunden. Die App ist bereit für den Offline-Modus.', 
          name: 'main');
      }
    }
  } catch (e) {
    developer.log('Fehler beim Prüfen der Ollama-Installation: $e', 
      name: 'main', error: e);
  }
}

// Zeigt einen Dialog an, wenn Ollama nicht installiert ist
void showOllamaInstallationDialog() {
  // In einer Flutter-App müsste dies über einen Dialog implementiert werden
  // Da dies vor der App-Initialisierung aufgerufen wird, geben wir hier nur eine Meldung aus
  developer.log('WARNUNG: Ollama ist nicht installiert. Die App benötigt Ollama für die volle Offline-Funktionalität.',
    name: 'main');
  developer.log('Bitte installieren Sie Ollama von https://ollama.com',
    name: 'main');
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
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => AuthProvider(),
        ),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return MaterialApp(
            title: 'Insight Synergy',
            theme: ThemeData(
              primarySwatch: Colors.blue,
              visualDensity: VisualDensity.adaptivePlatformDensity,
            ),
            home: FutureBuilder<bool>(
              future: authProvider.isLoggedIn(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const SplashScreen();
                }
                
                // Im Offline-Modus immer direkt zum Chat-Screen
                if (AppConfig.preferOfflineMode) {
                  return const ChatScreen();
                }
                
                final isLoggedIn = snapshot.data ?? false;
                if (isLoggedIn) {
                  return const ChatScreen();
                } else {
                  return const LoginScreen();
                }
              },
            ),
            routes: {
              '/login': (context) => const LoginScreen(),
              '/register': (context) => const RegisterScreen(),
              '/chat': (context) => const ChatScreen(),
            },
          );
        },
      ),
    );
  }
}
