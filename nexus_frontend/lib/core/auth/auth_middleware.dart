import 'package:flutter/material.dart';
import 'package:nexus_frontend/core/auth/auth_provider.dart';
import 'package:nexus_frontend/core/navigation/app_router.dart';
import 'package:nexus_frontend/core/navigation/routes.dart';
import 'package:provider/provider.dart';

/// Die AuthMiddleware ist verantwortlich für die Überprüfung des Authentifizierungsstatus
/// und die Steuerung des Zugriffs auf geschützte Routen in der Anwendung.
class AuthMiddleware {
  /// Singleton-Instanz der AuthMiddleware
  static final AuthMiddleware _instance = AuthMiddleware._internal();
  
  /// Factory-Konstruktor, der die Singleton-Instanz zurückgibt
  factory AuthMiddleware() => _instance;
  
  /// Privater Konstruktor für die Singleton-Implementierung
  AuthMiddleware._internal();
  
  /// Liste der Routen, die ohne Authentifizierung zugänglich sind
  final List<String> _publicRoutes = [
    Routes.login,
    Routes.splash,
    Routes.register,
    Routes.forgotPassword,
  ];
  
  /// Prüft, ob eine bestimmte Route ohne Authentifizierung zugänglich ist
  bool isPublicRoute(String route) {
    return _publicRoutes.contains(route);
  }
  
  /// Überprüft, ob ein Benutzer Zugriff auf eine bestimmte Route hat
  /// basierend auf seinem Authentifizierungsstatus
  bool hasAccess(BuildContext context, String route) {
    // Zugriff auf den AuthProvider
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    // Wenn es sich um eine öffentliche Route handelt, immer Zugriff gewähren
    if (isPublicRoute(route)) {
      return true;
    }
    
    // Für geschützte Routen, Zugriff nur gewähren, wenn der Benutzer authentifiziert ist
    return authProvider.isAuthenticated;
  }
  
  /// Route-Observer zur Überwachung der Navigation und Durchsetzung
  /// von Zugriffsbeschränkungen
  RouteObserver<PageRoute> createRouteObserver(BuildContext context) {
    return RouteObserver<PageRoute>();
  }
  
  /// Middleware-Funktion, die vor jeder Navigation aufgerufen wird
  /// und den Zugriff basierend auf dem Authentifizierungsstatus steuert
  Route<dynamic>? onGenerateRoute(
    RouteSettings settings, 
    BuildContext context, 
    Function(RouteSettings) appRouteGenerator
  ) {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final String routeName = settings.name ?? '';
    
    // Wenn der Benutzer nicht authentifiziert ist und versucht,
    // auf eine geschützte Route zuzugreifen, zur Login-Seite umleiten
    if (!isPublicRoute(routeName) && !authProvider.isAuthenticated) {
      return MaterialPageRoute(
        builder: (_) => AppRouter.loginScreen(),
        settings: const RouteSettings(name: Routes.login),
      );
    }
    
    // Wenn der Benutzer bereits authentifiziert ist und versucht,
    // auf die Login- oder Registrierungsseite zuzugreifen, zum Dashboard umleiten
    if ((routeName == Routes.login || routeName == Routes.register) && 
        authProvider.isAuthenticated) {
      return MaterialPageRoute(
        builder: (_) => AppRouter.homeScreen(),
        settings: const RouteSettings(name: Routes.home),
      );
    }
    
    // Wenn keine besonderen Bedingungen zutreffen, normale Routengenerierung verwenden
    return appRouteGenerator(settings);
  }
  
  /// Navigiert zu einer Seite und überprüft die Zugriffsberechtigungen
  void navigateTo(BuildContext context, String routeName, {Object? arguments}) {
    // Prüfen, ob der Benutzer Zugriff auf die Route hat
    if (hasAccess(context, routeName)) {
      Navigator.of(context).pushNamed(routeName, arguments: arguments);
    } else {
      // Wenn kein Zugriff, zur Login-Seite umleiten
      Navigator.of(context).pushReplacementNamed(Routes.login);
    }
  }
  
  /// Token-Validierung beim App-Start durchführen
  Future<void> validateTokenOnStartup(BuildContext context) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    // Versuchen, den gespeicherten Token zu validieren
    final bool isValid = await authProvider.validateStoredToken();
    
    // Navigieren basierend auf dem Validierungsergebnis
    if (!isValid) {
      // Wenn der Token ungültig ist, zur Login-Seite navigieren
      Navigator.of(context).pushReplacementNamed(Routes.login);
    } else if (ModalRoute.of(context)?.settings.name == Routes.splash) {
      // Wenn auf dem Splash-Screen und der Token gültig ist, zur Startseite navigieren
      Navigator.of(context).pushReplacementNamed(Routes.home);
    }
  }
  
  /// Behandelt den Ablauf des Tokens während der App-Nutzung
  void handleTokenExpiration(BuildContext context) {
    // Token zurücksetzen und Benutzer zur Login-Seite umleiten
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    authProvider.logout();
    
    // Zur Login-Seite navigieren und alle vorherigen Routen entfernen
    Navigator.of(context).pushNamedAndRemoveUntil(
      Routes.login,
      (route) => false,
      arguments: {'message': 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'}
    );
  }
} 