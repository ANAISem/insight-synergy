import 'package:flutter_test/flutter_test.dart';
import 'package:insight_synergy_app/providers/chat_provider.dart';
import 'package:insight_synergy_app/services/api_service.dart';
import 'package:insight_synergy_app/utils/config.dart';

void main() {
  group('ChatProvider Tests', () {
    late ChatProvider chatProvider;

    setUp(() {
      final apiService = ApiService(baseUrl: AppConfig.apiBaseUrl);
      chatProvider = ChatProvider(apiService: apiService);
    });

    test('ChatProvider initialisiert korrekt', () {
      expect(chatProvider.isConnected, false);
      expect(chatProvider.isLoading, false);
      expect(chatProvider.error, null);
      expect(chatProvider.messages, isEmpty);
    });

    test('Nachricht hinzufügen und senden (HTTP-Fallback)', () async {
      // Simulieren einer HTTP-Nachricht (ohne WebSocket-Verbindung)
      await chatProvider.sendMessageHttp('Test-Nachricht');
      
      // Überprüfe, ob mindestens die Benutzernachricht hinzugefügt wurde
      expect(chatProvider.messages.length, greaterThanOrEqualTo(1));
      expect(chatProvider.messages.first.content, 'Test-Nachricht');
      expect(chatProvider.messages.first.sender.toString(), 'MessageSender.user');
    });

    // WebSocket-Verbindungstest (dieser Test könnte fehlschlagen, wenn kein Server läuft)
    test('WebSocket Verbindung versuchen', () async {
      // Dies ist ein "Best-Effort"-Test - er könnte fehlschlagen, wenn kein Server läuft
      try {
        await chatProvider.connectToWebSocket(AppConfig.wsBaseUrl);
        // Wir erwarten nicht zwingend eine Verbindung, aber der Code sollte ausgeführt werden
      } catch (e) {
        // Fehler beim Verbinden wird erwartet, wenn kein Server läuft
        expect(chatProvider.isConnected, false);
      }
    });

    tearDown(() {
      chatProvider.disconnect();
    });
  });
} 