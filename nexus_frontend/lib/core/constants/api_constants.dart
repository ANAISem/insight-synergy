/// Konstanten für API-Endpunkte
class ApiConstants {
  /// Die Basis-URL des Backends
  static const String baseUrl = 'http://localhost:3000';
  
  /// Pfad für Authentifizierungs-Endpunkte
  static const String authPath = '/api/auth';
  
  /// Login-Endpunkt
  static const String loginEndpoint = '$authPath/login';
  
  /// Registrierungs-Endpunkt
  static const String registerEndpoint = '$authPath/register';
  
  /// Refresh-Token-Endpunkt
  static const String refreshTokenEndpoint = '$authPath/refresh';
  
  /// Basis-Pfad für Markt-Endpunkte
  static const String marketPath = '/api/market';
  
  /// Basis-Pfad für Artikel-Endpunkte
  static const String articlesPath = '/api/articles';
  
  /// Basis-Pfad für Benutzer-Endpunkte
  static const String usersPath = '/api/users';
  
  /// Basis-Pfad für Benachrichtigungs-Endpunkte
  static const String notificationsPath = '/api/notifications';
} 