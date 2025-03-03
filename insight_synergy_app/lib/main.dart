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

void main() {
  // Debug-Informationen ausgeben
  print('App startet mit folgender Konfiguration:');
  print('API URL: ${AppConfig.apiBaseUrl}');
  print('WebSocket URL: ${AppConfig.wsBaseUrl}');
  
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
            final api = ApiService(baseUrl: AppConfig.apiBaseUrl);
            print('ApiService erstellt mit URL: ${AppConfig.apiBaseUrl}');
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
              colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
              useMaterial3: true,
            ),
            initialRoute: '/',
            routes: {
              '/': (context) => const SplashScreen(),
              '/login': (context) => const LoginScreen(),
              '/register': (context) => const RegisterScreen(),
              '/chat': (context) => const ChatScreen(),
            },
            debugShowCheckedModeBanner: false,
          );
        },
      ),
    );
  }
}
