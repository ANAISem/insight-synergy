import 'package:http/http.dart' as http;

/// Exception für Fehler bei API-Anfragen
class ApiException implements Exception {
  final int statusCode;
  final String responseBody;
  final String message;

  ApiException(this.statusCode, this.responseBody, this.message);

  @override
  String toString() {
    return 'ApiException: $message (Status: $statusCode)';
  }

  /// Gibt einen benutzerfreundlichen Fehlertext zurück
  String getUserFriendlyMessage() {
    switch (statusCode) {
      case 400:
        return 'Ungültige Anfrage. Bitte überprüfe deine Eingaben.';
      case 401:
        return 'Nicht autorisiert. Bitte melde dich erneut an.';
      case 403:
        return 'Zugriff verweigert. Du hast keine Berechtigung für diese Aktion.';
      case 404:
        return 'Ressource nicht gefunden. Die angeforderten Daten existieren nicht.';
      case 429:
        return 'Zu viele Anfragen. Bitte versuche es später erneut.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Serverfehler. Bitte versuche es später erneut.';
      default:
        if (statusCode >= 500) {
          return 'Serverfehler. Bitte versuche es später erneut.';
        } else if (statusCode >= 400) {
          return 'Anfragefehler. Bitte überprüfe deine Eingaben.';
        } else {
          return message;
        }
    }
  }

  /// Versucht, eine Fehlermeldung aus dem Antwort-Body zu extrahieren
  String? extractErrorFromBody() {
    try {
      // Einfache Prüfung, ob der responseBody ein JSON sein könnte
      if (responseBody.contains('{') && responseBody.contains('}')) {
        // Hier könnten wir den JSON parsen, um einen Fehler zu extrahieren
        // Dies ist vereinfacht, in der Praxis würden wir json.decode verwenden
        
        // Beispiel für Muster wie {"error": "Fehlermeldung"}
        final errorRegExp = RegExp(r'"error"\s*:\s*"([^"]+)"');
        final match = errorRegExp.firstMatch(responseBody);
        
        if (match != null && match.groupCount >= 1) {
          return match.group(1);
        }
        
        // Beispiel für Muster wie {"message": "Fehlermeldung"}
        final messageRegExp = RegExp(r'"message"\s*:\s*"([^"]+)"');
        final messageMatch = messageRegExp.firstMatch(responseBody);
        
        if (messageMatch != null && messageMatch.groupCount >= 1) {
          return messageMatch.group(1);
        }
      }
    } catch (e) {
      // Ignorieren, wenn die Extraktion fehlschlägt
    }
    
    return null;
  }
} 