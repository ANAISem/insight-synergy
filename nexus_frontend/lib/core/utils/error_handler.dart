import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'logger.dart';

/// Zentrale Fehlerbehandlungsklasse für die gesamte Anwendung
class ErrorHandler {
  final Logger _logger = Logger('ErrorHandler');
  
  // Singleton-Pattern
  static final ErrorHandler _instance = ErrorHandler._internal();
  factory ErrorHandler() => _instance;
  ErrorHandler._internal();
  
  /// Behandelt API-Fehler und gibt eine benutzerfreundliche Nachricht zurück
  String handleApiError(dynamic error) {
    _logger.error('API-Fehler aufgetreten', error);
    
    if (error is ApiException) {
      return _handleApiException(error);
    } else if (error is SocketException || error is TimeoutException) {
      return 'Verbindungsfehler: Bitte überprüfen Sie Ihre Internetverbindung.';
    } else {
      return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
    }
  }
  
  /// Behandelt spezifische API-Ausnahmen
  String _handleApiException(ApiException exception) {
    switch (exception.statusCode) {
      case 400:
        return 'Ungültige Anfrage: ${exception.message}';
      case 401:
        return 'Authentifizierungsfehler: Bitte melden Sie sich erneut an.';
      case 403:
        return 'Zugriff verweigert: Sie haben keine Berechtigung für diese Aktion.';
      case 404:
        return 'Ressource nicht gefunden: ${exception.message}';
      case 422:
        return 'Validierungsfehler: ${exception.message}';
      case 429:
        return 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Serverfehler: Der Server konnte Ihre Anfrage nicht verarbeiten. Bitte versuchen Sie es später erneut.';
      default:
        return 'Fehler (${exception.statusCode}): ${exception.message}';
    }
  }
  
  /// Zeigt einen Fehler-Snackbar im aktuellen Kontext an
  void showErrorSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red.shade700,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }
  
  /// Zeigt einen Fehler-Dialog an
  Future<void> showErrorDialog(BuildContext context, String title, String message) async {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text(title),
          content: SingleChildScrollView(
            child: ListBody(
              children: <Widget>[
                Text(message),
              ],
            ),
          ),
          actions: <Widget>[
            TextButton(
              child: const Text('OK'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
          ],
        );
      },
    );
  }
  
  /// Globaler Fehlerhandler für unbehandelte Ausnahmen
  void setupGlobalErrorHandling() {
    FlutterError.onError = (FlutterErrorDetails details) {
      _logger.error('Unbehandelte Ausnahme in Flutter-Framework', details.exception, details.stack);
      
      // Im Debug-Modus Flutter-Standardbehandlung beibehalten
      FlutterError.dumpErrorToConsole(details);
    };
    
    // Unbehandelte asynchrone Fehler auffangen
    PlatformDispatcher.instance.onError = (error, stack) {
      _logger.error('Unbehandelte asynchrone Ausnahme', error, stack);
      return true;
    };
  }
  
  /// Verarbeitet einen Fehler und reagiert entsprechend im aktuellen Kontext
  void processError(BuildContext context, dynamic error, {String customMessage = ''}) {
    String errorMessage = handleApiError(error);
    if (customMessage.isNotEmpty) {
      errorMessage = '$customMessage: $errorMessage';
    }
    
    // Kritische Fehler mit Dialog anzeigen, andere mit Snackbar
    if (error is ApiException && 
        (error.statusCode == 401 || error.statusCode == 403 || error.statusCode >= 500)) {
      showErrorDialog(context, 'Fehler', errorMessage);
    } else {
      showErrorSnackBar(context, errorMessage);
    }
  }
  
  /// Fehlerbehandlung für Wissens-Graph-spezifische Fehler
  String handleKnowledgeGraphError(dynamic error) {
    _logger.error('Wissensgraph-Fehler aufgetreten', error);
    
    if (error.toString().contains('layout')) {
      return 'Fehler beim Layouting des Graphen. Versuchen Sie einen anderen Algorithmus.';
    } else if (error.toString().contains('node')) {
      return 'Fehler bei der Knotenverarbeitung. Versuchen Sie den Graphen neu zu laden.';
    } else if (error.toString().contains('edge')) {
      return 'Fehler bei den Kantenverbindungen. Überprüfen Sie die Verbindungen zwischen den Knoten.';
    } else {
      return 'Fehler im Wissensgraphen: ${error.toString()}';
    }
  }
} 