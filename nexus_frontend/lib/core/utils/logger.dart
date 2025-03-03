import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';

/// Zentrale Logger-Klasse für die App
class AppLogger {
  static final Logger _logger = Logger(
    printer: PrettyPrinter(
      methodCount: 0,
      errorMethodCount: 8,
      lineLength: 120,
      colors: true,
      printEmojis: true,
      printTime: true,
    ),
    level: kDebugMode ? Level.verbose : Level.warning,
  );

  /// Debug-Log
  static void d(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.d(message, error: error, stackTrace: stackTrace);
  }

  /// Info-Log
  static void i(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.i(message, error: error, stackTrace: stackTrace);
  }

  /// Warning-Log
  static void w(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.w(message, error: error, stackTrace: stackTrace);
  }

  /// Error-Log
  static void e(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.e(message, error: error, stackTrace: stackTrace);
  }
  
  /// Performance-Messung mit automatischem Logging
  static Future<T> measurePerformance<T>(
    String operationName,
    Future<T> Function() operation,
  ) async {
    final stopwatch = Stopwatch()..start();
    try {
      final result = await operation();
      stopwatch.stop();
      i('$operationName abgeschlossen in ${stopwatch.elapsedMilliseconds}ms');
      return result;
    } catch (e, stackTrace) {
      stopwatch.stop();
      AppLogger.e('$operationName fehlgeschlagen nach ${stopwatch.elapsedMilliseconds}ms', e, stackTrace);
      rethrow;
    }
  }
} 