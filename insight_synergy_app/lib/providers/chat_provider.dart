import 'dart:convert';
import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/message_model.dart';
import '../services/api_service.dart' as api_service;
import '../services/storage_service.dart';
import '../utils/config.dart';
import 'package:http/http.dart' as http;

class ChatProvider with ChangeNotifier {
  final api_service.ApiService _apiService;
  final StorageService _storageService = StorageService();
  WebSocketChannel? _channel;
  StreamSubscription? _mainSubscription;
  bool _isConnected = false;
  List<Message> _messages = [];
  bool _isLoading = false;
  String? _error;
  bool _isReconnecting = false;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 5;
  bool _isOfflineMode = false;
  Timer? _pingTimer;
  int _consecutivePingFailures = 0;
  String? _serverUrl;
  Timer? _reconnectTimer;
  bool _isDisposed = false;
  bool _isLocalModelConnected = false;

  // Getter
  List<Message> get messages => _messages;
  bool get isConnected => _isConnected;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isOfflineMode => _isOfflineMode;
  bool get isLocalModelConnected => _isLocalModelConnected;

  ChatProvider({required api_service.ApiService apiService}) : _apiService = apiService {
    _loadCachedMessages();
    
    // Prüfe, ob der Offline-Modus aktiviert werden soll
    if (AppConfig.preferOfflineMode) {
      _isOfflineMode = true;
      print('Offline-Modus ist standardmäßig aktiviert.');
    }
    
    // Automatische Verbindung zum lokalen Mistral-Modell
    if (AppConfig.useLocalModelByDefault) {
      _connectToLocalModel();
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    _cleanupConnection();
    super.dispose();
  }

  void _cleanupConnection() {
    _mainSubscription?.cancel();
    _mainSubscription = null;
    _pingTimer?.cancel();
    _pingTimer = null;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _channel?.sink.close();
    _channel = null;
  }

  Future<void> _loadCachedMessages() async {
    try {
      final cachedMessages = await _storageService.getCachedMessages();
      if (cachedMessages.isNotEmpty && !_isDisposed) {
        _messages = cachedMessages;
        notifyListeners();
        if (AppConfig.verboseLogging) {
          print('${cachedMessages.length} Nachrichten aus dem Cache geladen');
        }
      }
    } catch (e) {
      print('Fehler beim Laden der Nachrichten aus dem Cache: $e');
    }
  }

  Future<void> _cacheMessages() async {
    if (_messages.isNotEmpty) {
      await _storageService.cacheMessages(_messages);
      await _storageService.trimCache();
    }
  }

  Future<bool> _waitForConnection() async {
    if (_channel == null) return false;
    
    try {
      Completer<bool> connectionCompleter = Completer();
      late StreamSubscription subscription;
      
      // Erstelle einen broadcast Stream, der mehrfach abgehört werden kann
      final broadcastStream = _channel!.stream.asBroadcastStream();
      
      // Timeout nach 5 Sekunden
      Timer(const Duration(seconds: 5), () {
        if (!connectionCompleter.isCompleted) {
          subscription.cancel();
          connectionCompleter.complete(false);
        }
      });

      subscription = broadcastStream.listen(
        (data) {
          try {
            final jsonData = jsonDecode(data);
            if (jsonData['type'] == 'pong' || 
                jsonData['type'] == 'heartbeat' || 
                jsonData['type'] == 'messages' ||
                jsonData['type'] == 'message') {
              if (!connectionCompleter.isCompleted) {
                print('Verbindung erfolgreich etabliert: ${jsonData['type']} empfangen');
                subscription.cancel();
                connectionCompleter.complete(true);
              }
            }
          } catch (e) {
            print('Fehler beim Verarbeiten der Verbindungsantwort: $e');
          }
        },
        onError: (error) {
          print('Verbindungsfehler: $error');
          if (!connectionCompleter.isCompleted) {
            subscription.cancel();
            connectionCompleter.complete(false);
          }
        },
        onDone: () {
          print('Verbindung geschlossen während des Verbindungsaufbaus');
          if (!connectionCompleter.isCompleted) {
            subscription.cancel();
            connectionCompleter.complete(false);
          }
        },
      );

      // Sende initial einen Ping
      _channel!.sink.add(jsonEncode({
        'type': 'ping',
        'timestamp': DateTime.now().toIso8601String()
      }));
      
      final connected = await connectionCompleter.future;
      
      if (connected) {
        // Wenn die Verbindung erfolgreich war, setze den Hauptlistener auf den broadcast Stream
        _mainSubscription = broadcastStream.listen(
          (data) => _handleWebSocketMessage(data),
          onError: (error) => _handleConnectionError(error),
          onDone: () => _handleConnectionClosed(),
        );
      }
      
      return connected;
    } catch (e) {
      print('Fehler beim Verbindungsaufbau: $e');
      return false;
    }
  }

  void _handleWebSocketMessage(dynamic data) {
    if (_isDisposed) return;
    
    try {
      final jsonData = jsonDecode(data);
      
      switch(jsonData['type']) {
        case 'message':
          _addMessage(Message.fromJson(jsonData['data']));
          _cacheMessages();
          break;
        case 'clear_messages':
          clearMessages();
          break;
        case 'error':
          _setError(jsonData['message']);
          break;
        case 'heartbeat':
        case 'pong':
          _consecutivePingFailures = 0;
          break;
      }
    } catch (e) {
      print('Fehler beim Verarbeiten der Nachricht: $e');
    }
  }

  void _handleConnectionError(dynamic error) {
    if (_isDisposed) return;
    
    _setError('WebSocket-Fehler: $error');
    _isConnected = false;
    _isOfflineMode = true;
    notifyListeners();
    
    if (_serverUrl != null) {
      _attemptReconnect(_serverUrl!);
    }
  }

  void _handleConnectionClosed() {
    if (_isDisposed) return;
    
    _isConnected = false;
    _isOfflineMode = true;
    notifyListeners();
    
    if (_serverUrl != null) {
      _attemptReconnect(_serverUrl!);
    }
  }

  void _startPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 15), (timer) {
      if (!_isConnected || _channel == null || _isDisposed) {
        timer.cancel();
        return;
      }

      try {
        _channel!.sink.add(jsonEncode({'type': 'ping'}));
        
        // Prüfe nach 10 Sekunden, ob wir eine Antwort erhalten haben
        Future.delayed(const Duration(seconds: 10), () {
          if (_isDisposed) return;
          
          if (_consecutivePingFailures > 0) {
            _consecutivePingFailures++;
            if (_consecutivePingFailures >= 3) {
              _handleConnectionError('Keine Ping-Antwort erhalten');
            }
          }
        });
      } catch (e) {
        print('Fehler beim Senden des Pings: $e');
      }
    });
  }

  Future<void> _attemptReconnect(String url) async {
    if (_isReconnecting || _isDisposed) return;
    
    _isReconnecting = true;
    _reconnectAttempts++;

    if (_reconnectAttempts > _maxReconnectAttempts) {
      _setError('Maximale Anzahl an Wiederverbindungsversuchen erreicht');
      _isReconnecting = false;
      return;
    }

    print('Verbindung verloren. Versuche Wiederverbindung in 2 Sekunden (Versuch $_reconnectAttempts/$_maxReconnectAttempts)');
    
    // Speichere aktuelle Nachrichten
    await _cacheMessages();
    
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(seconds: math.min(30, math.pow(2, _reconnectAttempts).toInt())), () async {
      if (_isDisposed) return;
      _isReconnecting = false;
      await connectToWebSocket(url);
    });
  }

  Future<void> connectToWebSocket(String url) async {
    if (_isReconnecting || _isDisposed) return;

    try {
      _cleanupConnection();
      _setLoading(true);
      print('Versuche Verbindung aufzubauen zu: $url');
      
      if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        Uri uri = Uri.parse(url);
        String wsScheme = url.startsWith('https://') ? 'wss://' : 'ws://';
        String host = uri.host;
        int port = uri.port;
        String portStr = port > 0 ? ':$port' : '';
        String path = uri.path.isEmpty ? '/ws' : uri.path;
        url = '$wsScheme$host$portStr$path';
        print('Korrigierte WebSocket-URL: $url');
      }

      _serverUrl = url;
      _channel = WebSocketChannel.connect(Uri.parse(url));
      
      // Warte auf die erste Verbindung
      bool connected = await _waitForConnection();
      if (!connected || _isDisposed) {
        print('Initiale Verbindung fehlgeschlagen');
        throw Exception('Initiale Verbindung fehlgeschlagen');
      }

      print('Verbindung erfolgreich hergestellt');
      _isConnected = true;
      _isOfflineMode = false;
      _reconnectAttempts = 0;
      _consecutivePingFailures = 0;

      _setLoading(false);
      _setError(null);
      
      if (!_isDisposed) {
        _addMessage(Message.system('Verbindung zum Server hergestellt'));
        _startPingTimer();
      }

    } catch (e) {
      print('Verbindungsfehler: $e');
      _handleConnectionError(e);
    }
  }

  void _setError(String? error) {
    _error = error;
    if (!_isDisposed) notifyListeners();
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    if (!_isDisposed) notifyListeners();
  }

  void _addMessage(Message message) {
    _messages.add(message);
    if (!_isDisposed) notifyListeners();
  }

  // Nachrichten von der API laden (ohne Authentifizierung)
  Future<bool> loadMessagesFromApi() async {
    try {
      _setLoading(true);

      final response = await _apiService.getMessages();

      if (response.success && response.data != null) {
        _messages = response.data!.map((apiMessage) => Message(
          id: apiMessage.id,
          content: apiMessage.content,
          sender: apiMessage.type == 'user' ? MessageSender.user : MessageSender.system,
          timestamp: apiMessage.timestamp,
        )).toList();

        _messages.sort((a, b) => a.timestamp.compareTo(b.timestamp));

        await _cacheMessages();

        _setLoading(false);
        _setError(null);
        notifyListeners();
        return true;
      } else {
        _setError(response.error ?? 'Fehler beim Laden der Nachrichten');
        _setLoading(false);
        notifyListeners();
        return false;
      }
    } catch (e) {
      _setError('Fehler beim Laden der Nachrichten: ${e.toString()}');
      _setLoading(false);
      notifyListeners();
      return false;
    }
  }

  // Verbindung zum WebSocket herstellen (ohne Authentifizierung)
  Future<void> connectToWebSocket(String url) async {
    try {
      _setLoading(true);
      print('Versuche Verbindung zu WebSocket: $url');
      
      if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        Uri uri = Uri.parse(url);
        String wsScheme = url.startsWith('https://') ? 'wss://' : 'ws://';
        String host = uri.host;
        int port = uri.port;
        String portStr = port > 0 ? ':$port' : '';
        String path = uri.path.isEmpty ? '/ws' : uri.path;
        url = '$wsScheme$host$portStr$path';
        print('Korrigierte WebSocket-URL: $url');
      }

      // Speichere die URL für Wiederverbindungsversuche
      _serverUrl = url;
      
      print('Verbinde zu WebSocket mit finaler URL: $url');
      _channel = WebSocketChannel.connect(Uri.parse(url));

      bool connectionSuccessful = await _testConnection();

      if (!connectionSuccessful) {
        print('WebSocket-Verbindung konnte nicht hergestellt werden: Timeout');
        _setError('WebSocket-Verbindung konnte nicht hergestellt werden: Timeout');
        _isConnected = false;
        _isOfflineMode = true;
        _setLoading(false);
        await loadMessagesFromApi();
        notifyListeners();
        return;
      }

      _isConnected = true;
      _isOfflineMode = false;
      _reconnectAttempts = 0;
      _consecutivePingFailures = 0;

      _channel!.stream.listen(
        (dynamic data) {
          try {
            final jsonData = jsonDecode(data);
            if (jsonData['type'] == 'message') {
              _addMessage(Message.fromJson(jsonData['data']));
              _cacheMessages();
            } else if (jsonData['type'] == 'error') {
              _setError(jsonData['message']);
            } else if (jsonData['type'] == 'heartbeat') {
              // Heartbeat vom Server empfangen - Verbindung ist aktiv
              print('Heartbeat vom Server empfangen');
              _consecutivePingFailures = 0;
            } else if (jsonData['type'] == 'pong') {
              // Pong vom Server empfangen - Verbindung ist aktiv
              print('Pong vom Server empfangen');
              _consecutivePingFailures = 0;
            }
          } catch (e) {
            _setError('Fehler beim Verarbeiten der Nachricht: ${e.toString()}');
          }
        },
        onError: (error) {
          _setError('WebSocket-Fehler: $error');
          _isConnected = false;
          _isOfflineMode = true;
          notifyListeners();
          _attemptReconnect(_serverUrl!);
        },
        onDone: () {
          _isConnected = false;
          _isOfflineMode = true;
          notifyListeners();
          _attemptReconnect(_serverUrl!);
        },
      );

      _setLoading(false);
      _setError(null);

      _addMessage(Message.system('Verbindung zum Server hergestellt'));

      _startPingTimer();

      _syncPendingMessages();
    } catch (e) {
      _setError('Verbindungsfehler: ${e.toString()}');
      _isConnected = false;
      _isOfflineMode = true;
      _setLoading(false);
      notifyListeners();

      await loadMessagesFromApi();

      _attemptReconnect(url);
    }
  }
  
  // Ping-Timer starten, um die Verbindung aktiv zu halten
  void _startPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 15), (timer) {
      if (_isConnected && _channel != null) {
        try {
          _channel!.sink.add(jsonEncode({'type': 'ping'}));
          print('Ping gesendet');
          
          bool receivedResponse = false;
          
          // Timeout für die Pong-Antwort (10 Sekunden)
          Future.delayed(const Duration(seconds: 10), () {
            if (!receivedResponse && _isConnected) {
              _consecutivePingFailures++;
              print('Keine Pong-Antwort erhalten. Fehler: $_consecutivePingFailures/3');
              
              if (_consecutivePingFailures >= 3) {
                print('Zu viele fehlgeschlagene Pings. Verbindung wird als unterbrochen markiert.');
                _isConnected = false;
                _isOfflineMode = true;
                notifyListeners();
                
                final url = _serverUrl;
                if (url != null) {
                  _attemptReconnect(url);
                }
              }
            }
          });
          
          // Listener für Pong-Antworten
          // Alte Subscription beenden, falls vorhanden
          _pingSubscription?.cancel();
          
          _pingSubscription = _channel!.stream.listen((data) {
            try {
              final jsonData = jsonDecode(data);
              if (jsonData['type'] == 'pong' || jsonData['type'] == 'heartbeat') {
                print('Pong/Heartbeat empfangen - Verbindung ist aktiv');
                receivedResponse = true;
                _consecutivePingFailures = 0; // Zurücksetzen bei erfolgreicher Antwort
              }
            } catch (e) {
              print('Fehler beim Verarbeiten der Pong-Antwort: $e');
            }
          }, onDone: () {
            _pingSubscription?.cancel();
          }, onError: (e) {
            print('Fehler im Pong-Listener: $e');
            _pingSubscription?.cancel();
          });
        } catch (e) {
          print('Fehler beim Senden des Pings: $e');
        }
      }
    });
  }
  
  // Test der WebSocket-Verbindung
  Future<bool> _testConnection() async {
    try {
      // Warte maximal 30 Sekunden auf eine erfolgreiche Verbindung
      Completer<bool> completer = Completer<bool>();
      
      // Timeout nach 30 Sekunden
      Future.delayed(const Duration(seconds: 30), () {
        if (!completer.isCompleted) {
          print('WebSocket-Verbindungstest: Timeout nach 30 Sekunden');
          completer.complete(false);
        }
      });
      
      // Sende ein Ping, um die Verbindung zu testen
      print('WebSocket-Verbindungstest: Sende Ping');
      _channel!.sink.add(jsonEncode({
        'type': 'ping',
        'timestamp': DateTime.now().toIso8601String(),
      }));
      
      // Erste Nachricht oder Fehler abfangen
      var subscription = _channel!.stream.listen(
        (data) {
          print('WebSocket-Verbindungstest: Antwort erhalten: $data');
          if (!completer.isCompleted) {
            try {
              final jsonData = jsonDecode(data);
              // Auf Pong oder andere valide Nachrichten prüfen
              if (jsonData['type'] == 'pong' || jsonData['type'] == 'heartbeat') {
                print('WebSocket-Verbindungstest: Pong/Heartbeat empfangen - Verbindung erfolgreich');
                completer.complete(true);
              } else if (jsonData['type'] == 'message' || jsonData['type'] == 'messages') {
                print('WebSocket-Verbindungstest: ${jsonData['type']} empfangen - Verbindung erfolgreich');
                completer.complete(true);
              } else {
                print('WebSocket-Verbindungstest: Unbekannte Nachricht empfangen, akzeptiere trotzdem');
                completer.complete(true); // Auch andere Nachrichten akzeptieren
              }
            } catch (e) {
              print('WebSocket-Verbindungstest: Fehler beim Parsen der Antwort: $e');
              // Nur bei schwerwiegenden Fehlern als fehlgeschlagen werten
              if (e.toString().contains('Connection closed') || 
                  e.toString().contains('WebSocket not connected')) {
                completer.complete(false);
              } else {
                print('WebSocket-Verbindungstest: Nicht-kritischer Fehler - Verbindung wird akzeptiert');
                completer.complete(true); // Bei anderen Fehlern als erfolgreich werten
              }
            }
          }
        },
        onError: (error) {
          print('WebSocket-Verbindungstest: Fehler: $error');
          if (!completer.isCompleted) {
            completer.complete(false);
          }
        },
        onDone: () {
          print('WebSocket-Verbindungstest: Verbindung geschlossen während des Tests');
          if (!completer.isCompleted) {
            completer.complete(false);
          }
        },
      );
      
      bool result = await completer.future;
      
      // Bei Fehlschlag, Subscription abbrechen
      if (!result) {
        print('WebSocket-Verbindungstest: Fehlgeschlagen - Subscription wird geschlossen');
        await subscription.cancel();
      } else {
        print('WebSocket-Verbindungstest: Erfolgreich - Verbindung wurde etabliert');
      }
      
      return result;
    } catch (e) {
      print('Schwerwiegender Fehler beim Testen der Verbindung: $e');
      return false;
    }
  }

  // Automatische Wiederverbindung mit exponentieller Verzögerung
  void _attemptReconnect(String url) {
    if (_isReconnecting || _reconnectAttempts >= _maxReconnectAttempts) {
      if (_reconnectAttempts >= _maxReconnectAttempts) {
        print('Maximale Anzahl von Wiederverbindungsversuchen erreicht: $_reconnectAttempts');
        _addMessage(Message.system('Verbindung konnte nicht wiederhergestellt werden. Bitte App neu starten oder offline weiterarbeiten.'));
        _isOfflineMode = true; // Wechsle explizit in den Offline-Modus
        notifyListeners();
      }
      return;
    }
    
    _isReconnecting = true;
    _reconnectAttempts++;
    
    // Exponentielles Backoff: 2^n Sekunden Wartezeit mit max 60 Sekunden
    int backoffSeconds = math.min(60, math.pow(2, _reconnectAttempts).toInt());
    
    print('Verbindung verloren. Versuche Wiederverbindung in $backoffSeconds Sekunden (Versuch $_reconnectAttempts/$_maxReconnectAttempts)');
    _addMessage(Message.system('Verbindung verloren. Versuche erneut zu verbinden in $backoffSeconds Sekunden (Versuch $_reconnectAttempts/$_maxReconnectAttempts)...'));
    
    Future.delayed(Duration(seconds: backoffSeconds), () {
      if (!_isConnected) {
        print('Starte Wiederverbindungsversuch $_reconnectAttempts');
        connectToWebSocket(url);
      }
      _isReconnecting = false;
    });
  }

  // Ausstehende Nachrichten synchronisieren
  Future<void> _syncPendingMessages() async {
    if (!_isConnected) return;
    
    try {
      final pendingMessages = await _storageService.getPendingMessages();
      
      if (pendingMessages.isEmpty) return;
      
      print('Synchronisiere ${pendingMessages.length} ausstehende Nachrichten');
      
      for (final message in pendingMessages) {
        // Nur Benutzernachrichten erneut senden
        if (message.sender == MessageSender.user) {
          await sendMessage(message.content);
        }
      }
      
      // Ausstehende Nachrichten löschen, nachdem sie gesendet wurden
      await _storageService.clearPendingMessages();
      
      _addMessage(Message.system('${pendingMessages.length} Nachrichten synchronisiert'));
    } catch (e) {
      print('Fehler bei der Synchronisierung ausstehender Nachrichten: $e');
    }
  }

  // Verbindung zum lokalen Mistral-Modell herstellen
  Future<void> _connectToLocalModel() async {
    try {
      final response = await http.get(
        Uri.parse('${AppConfig.ollamaBaseUrl}/tags'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(Duration(seconds: 5));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final models = data['models'] ?? [];
        
        bool mistralAvailable = false;
        for (var model in models) {
          if (model['name'] == AppConfig.mistralModelName) {
            mistralAvailable = true;
            break;
          }
        }
        
        if (mistralAvailable) {
          _addMessage(Message.system('Verbindung zum lokalen Mistral-Modell hergestellt.'));
          _isLocalModelConnected = true;
        } else {
          _addMessage(Message.system('Mistral-Modell nicht gefunden. Bitte installieren Sie es mit "ollama pull mistral".'));
        }
      }
    } catch (e) {
      print('Fehler bei der Verbindung zum lokalen Modell: $e');
      _addMessage(Message.system('Verbindung zum lokalen Modell nicht möglich. Die App läuft mit eingeschränkter Funktionalität.'));
    }
  }
  
  // Lokales Mistral-Modell für Chat-Anfragen verwenden
  Future<void> useLocalModelForChat(String message) async {
    try {
      final userMessage = Message.user(message);
      _addMessage(userMessage);
      
      _setLoading(true);
      
      final response = await http.post(
        Uri.parse('${AppConfig.ollamaBaseUrl}/generate'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'model': AppConfig.mistralModelName,
          'prompt': message,
          'temperature': AppConfig.llmConfig['temperature'],
          'max_tokens': AppConfig.llmConfig['max_tokens'],
        }),
      ).timeout(Duration(seconds: 60));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final responseText = data['response'] ?? 'Keine Antwort erhalten.';
        
        final assistantMessage = Message.system(responseText);
        _addMessage(assistantMessage);
      } else {
        _addMessage(Message.system('Fehler bei der Kommunikation mit dem lokalen Modell: ${response.statusCode}'));
      }
      
      _setLoading(false);
    } catch (e) {
      print('Fehler bei der Verwendung des lokalen Modells: $e');
      _addMessage(Message.system('Fehler bei der Verwendung des lokalen Modells. Bitte überprüfen Sie die Installation.'));
      _setLoading(false);
    }
  }

  // Nachricht senden
  Future<void> sendMessage(String content) async {
    // Nutze immer das lokale Modell, wenn im Offline-Modus oder wenn lokales Modell konfiguriert ist
    if (_isOfflineMode || AppConfig.useLocalModelByDefault) {
      await useLocalModelForChat(content);
      return;
    }

    final message = Message.user(content);
    _addMessage(message);
    
    if (!_isConnected) {
      // Im Offline-Modus speichern wir die Nachricht für später
      print('Offline-Modus: Speichere Nachricht für spätere Synchronisierung');
      await _storageService.addPendingMessage(message);
      _addMessage(Message.system('Nachricht wird gesendet, sobald die Verbindung wiederhergestellt ist'));
      
      // Fallback: Versuche, die Nachricht über das lokale Modell zu verarbeiten
      await useLocalModelForChat(content);
      return;
    }

    try {
      // Sende die Nachricht über WebSocket
      _channel!.sink.add(jsonEncode({
        'type': 'message',
        'data': message.toJson(),
      }));
    } catch (e) {
      print('Fehler beim Senden der Nachricht über WebSocket: $e');
      _setError('Fehler beim Senden der Nachricht: ${e.toString()}');
      
      // Bei Fehlern speichern wir die Nachricht für später
      await _storageService.addPendingMessage(message);
      
      // Fallback: Versuche, die Nachricht über das lokale Modell zu verarbeiten
      await useLocalModelForChat(content);
    }
  }
  
  // Nachricht über HTTP-API senden (Fallback)
  Future<void> sendMessageHttp(String content) async {
    try {
      final response = await _apiService.sendMessage(content);
      
      if (response.success && response.data != null) {
        // Antwort vom Server als Nachricht hinzufügen
        _addMessage(Message(
          id: response.data!.id,
          content: response.data!.content,
          sender: MessageSender.system,
          timestamp: response.data!.timestamp,
        ));
        
        // Erfolg melden
        print('Nachricht erfolgreich über HTTP-API gesendet');
      } else {
        print('Fehler beim Senden der Nachricht über HTTP-API: ${response.error}');
      }
    } catch (e) {
      print('Fehler beim Senden der Nachricht über HTTP-API: $e');
    }
  }

  // Verbindung schließen
  void disconnect() {
    _pingTimer?.cancel();
    if (_channel != null) {
      _channel!.sink.close();
      _channel = null;
    }
    _isConnected = false;
    notifyListeners();
  }

  // Zum Offline-Modus wechseln
  void switchToOfflineMode() {
    if (!_isOfflineMode) {
      _isOfflineMode = true;
      _isConnected = false;
      _addMessage(Message.system('Offline-Modus aktiviert. Lokales Mistral-Modell wird verwendet.'));
      
      // Verbindung zum lokalen Modell herstellen
      _connectToLocalModel();
      
      notifyListeners();
    }
  }

  // Verbindung zum Server wiederherstellen
  Future<void> reconnect(String url) async {
    _reconnectAttempts = 0;
    _isOfflineMode = false;
    await connectToWebSocket(url);
  }

  // Nachrichten löschen
  Future<void> clearMessages() async {
    _messages = [];
    await _storageService.cacheMessages([]);
    if (!_isDisposed) notifyListeners();
  }
} 