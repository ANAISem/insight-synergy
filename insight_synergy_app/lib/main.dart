import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/api_service.dart';
import 'providers/chat_provider.dart';
import 'providers/auth_provider.dart';
import 'screens/chat_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
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
        ChangeNotifierProxyProvider<ApiService, AuthProvider>(
          create: (context) => AuthProvider(
            apiService: Provider.of<ApiService>(context, listen: false),
          ),
          update: (context, apiService, previous) =>
              previous ?? AuthProvider(apiService: apiService),
        ),
        ChangeNotifierProxyProvider<ApiService, ChatProvider>(
          create: (context) => ChatProvider(
            apiService: Provider.of<ApiService>(context, listen: false),
          ),
          update: (context, apiService, previous) =>
              previous ?? ChatProvider(apiService: apiService),
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
