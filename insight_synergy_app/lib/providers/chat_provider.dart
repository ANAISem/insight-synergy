import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/message_model.dart';
import '../services/api_service.dart' as api_service;
import '../services/storage_service.dart';
import '../utils/config.dart';

class ChatProvider with ChangeNotifier {
  final api_service.ApiService _apiService;
  final StorageService _storageService = StorageService();
  WebSocketChannel? _channel;
  bool _isConnected = false;
  List<Message> _messages = [];
  bool _isLoading = false;
  String? _error;
  bool _isReconnecting = false;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 3;
  bool _isOfflineMode = false;
  Timer? _pingTimer;

  // Getter
  List<Message> get messages => _messages;
  bool get isConnected => _isConnected;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isOfflineMode => _isOfflineMode;

  ChatProvider({required api_service.ApiService apiService}) : _apiService = apiService {
    // Beim Start immer gecachte Nachrichten laden
    _loadCachedMessages();
  }

  // Nachrichten aus dem Cache laden
  Future<void> _loadCachedMessages() async {
    try {
      final cachedMessages = await _storageService.getCachedMessages();
      if (cachedMessages.isNotEmpty) {
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

  // Nachrichten im Cache speichern
  Future<void> _cacheMessages() async {
    if (_messages.isNotEmpty) {
      await _storageService.cacheMessages(_messages);
      await _storageService.trimCache();
    }
  }

  // Nachrichten von der API laden (mit Authentifizierung)
  Future<bool> loadMessagesFromApi() async {
    try {
      _setLoading(true);
      
      // Nachrichten über API abrufen
      final response = await _apiService.getMessages();
      
      if (response.success && response.data != null) {
        // Konvertiere API-Nachrichten in unser lokales Modell
        _messages = response.data!.map((apiMessage) => Message(
          id: apiMessage.id,
          content: apiMessage.content,
          sender: apiMessage.type == 'user' ? MessageSender.user : MessageSender.system,
          timestamp: apiMessage.timestamp,
        )).toList();
        
        // Nach Zeit sortieren (neueste zuletzt)
        _messages.sort((a, b) => a.timestamp.compareTo(b.timestamp));
        
        // Nachrichten im Cache speichern
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

  // Verbindung zum WebSocket herstellen
  Future<void> connectToWebSocket(String url) async {
    try {
      _setLoading(true);
      print('Versuche Verbindung zu WebSocket: $url');
      
      // Token für WebSocket-Authentifizierung abrufen
      final token = await _apiService.getToken();
      
      if (token != null) {
        // Token als Query-Parameter hinzufügen
        final uri = Uri.parse(url).replace(
          queryParameters: {'token': token},
        );
        _channel = WebSocketChannel.connect(uri);
      } else {
        _channel = WebSocketChannel.connect(Uri.parse(url));
      }
      
      // Prüfe sofort, ob die Verbindung erfolgreich war, indem wir auf den ersten Ping warten
      bool connectionSuccessful = await _testConnection();
      
      if (!connectionSuccessful) {
        print('WebSocket-Verbindung konnte nicht hergestellt werden: Timeout');
        _setError('WebSocket-Verbindung konnte nicht hergestellt werden: Timeout');
        _isConnected = false;
        _isOfflineMode = true;
        _setLoading(false);
        // Fallback zur HTTP-API
        await loadMessagesFromApi();
        notifyListeners();
        return;
      }
      
      _isConnected = true;
      _isOfflineMode = false;
      _reconnectAttempts = 0;
      
      // Auf eingehende Nachrichten hören
      _channel!.stream.listen(
        (dynamic data) {
          try {
            print('Empfangene WebSocket-Daten: $data');
            final jsonData = jsonDecode(data);
            if (jsonData['type'] == 'message') {
              _addMessage(Message.fromJson(jsonData['data']));
              
              // Nachrichten im Cache speichern
              _cacheMessages();
            } else if (jsonData['type'] == 'error') {
              _setError(jsonData['message']);
            }
          } catch (e) {
            print('Fehler beim Verarbeiten der Nachricht: $e');
            _setError('Fehler beim Verarbeiten der Nachricht: ${e.toString()}');
          }
        },
        onError: (error) {
          print('WebSocket-Fehler: $error');
          _setError('WebSocket-Fehler: $error');
          _isConnected = false;
          _isOfflineMode = true;
          notifyListeners();
          _attemptReconnect(url);
        },
        onDone: () {
          print('WebSocket-Verbindung geschlossen');
          _isConnected = false;
          _isOfflineMode = true;
          notifyListeners();
          _attemptReconnect(url);
        },
      );
      
      _setLoading(false);
      _setError(null);
      
      // Systemnachricht hinzufügen, wenn erfolgreich verbunden
      _addMessage(Message.system('Verbindung zum Server hergestellt'));
      
      // Ping-Timer starten, um die Verbindung aufrechtzuerhalten
      _startPingTimer();
      
      // Ausstehende Nachrichten senden, wenn wir online sind
      _syncPendingMessages();
    } catch (e) {
      print('Verbindungsfehler: $e');
      _setError('Verbindungsfehler: ${e.toString()}');
      _isConnected = false;
      _isOfflineMode = true;
      _setLoading(false);
      notifyListeners();
      
      // Fallback zur HTTP-API
      await loadMessagesFromApi();
      
      _attemptReconnect(url);
    }
  }
  
  // Ping-Timer starten, um die Verbindung aktiv zu halten
  void _startPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      if (_isConnected && _channel != null) {
        try {
          _channel!.sink.add(jsonEncode({
            'type': 'ping',
            'timestamp': DateTime.now().toIso8601String(),
          }));
          print('Ping gesendet');
        } catch (e) {
          print('Fehler beim Senden des Pings: $e');
        }
      }
    });
  }
  
  // Test der WebSocket-Verbindung
  Future<bool> _testConnection() async {
    try {
      // Warte maximal 5 Sekunden auf eine erfolgreiche Verbindung
      Completer<bool> completer = Completer<bool>();
      
      // Timeout nach 5 Sekunden
      Future.delayed(const Duration(seconds: 5), () {
        if (!completer.isCompleted) {
          print('WebSocket-Verbindungstest: Timeout nach 5 Sekunden');
          completer.complete(false);
        }
      });
      
      // Sende ein Ping, um die Verbindung zu testen
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
              if (jsonData['type'] == 'pong' || jsonData['type'] == 'message') {
                completer.complete(true);
              } else {
                completer.complete(true); // Auch andere Nachrichten akzeptieren
              }
            } catch (e) {
              print('WebSocket-Verbindungstest: Fehler beim Parsen der Antwort: $e');
              completer.complete(true); // Trotzdem als erfolgreich werten, wenn eine Antwort kam
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
          print('WebSocket-Verbindungstest: Verbindung geschlossen');
          if (!completer.isCompleted) {
            completer.complete(false);
          }
        },
      );
      
      bool result = await completer.future;
      
      // Wenn es ein Test war, schließe das Abo, wenn wir es nicht weiter nutzen
      if (!result) {
        subscription.cancel();
      }
      
      return result;
    } catch (e) {
      print('Fehler beim Testen der Verbindung: $e');
      return false;
    }
  }

  // Automatische Wiederverbindung
  void _attemptReconnect(String url) {
    if (_isReconnecting || _reconnectAttempts >= _maxReconnectAttempts) return;
    
    _isReconnecting = true;
    _reconnectAttempts++;
    
    _addMessage(Message.system('Verbindung verloren. Versuche erneut zu verbinden (Versuch $_reconnectAttempts/$_maxReconnectAttempts)...'));
    
    Future.delayed(const Duration(seconds: 5), () {
      if (!_isConnected) {
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

  // Nachricht senden
  Future<void> sendMessage(String content) async {
    final message = Message.user(content);
    _addMessage(message);
    
    if (!_isConnected) {
      // Im Offline-Modus speichern wir die Nachricht für später
      print('Offline-Modus: Speichere Nachricht für spätere Synchronisierung');
      await _storageService.addPendingMessage(message);
      _addMessage(Message.system('Nachricht wird gesendet, sobald die Verbindung wiederhergestellt ist'));
      
      // Fallback: Versuche, die Nachricht über die API zu senden
      await sendMessageHttp(content);
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
      
      // Fallback: Versuche, die Nachricht über die API zu senden
      await sendMessageHttp(content);
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

  @override
  void dispose() {
    _pingTimer?.cancel();
    disconnect();
    super.dispose();
  }

  // Nachricht hinzufügen
  void _addMessage(Message message) {
    _messages.add(message);
    notifyListeners();
    _cacheMessages();
  }

  // Ladestatus setzen
  void _setLoading(bool isLoading) {
    _isLoading = isLoading;
    notifyListeners();
  }

  // Fehler setzen
  void _setError(String? error) {
    _error = error;
    notifyListeners();
  }

  // Zum Offline-Modus wechseln
  void switchToOfflineMode() {
    if (!_isOfflineMode) {
      _isOfflineMode = true;
      _isConnected = false;
      _addMessage(Message.system('Offline-Modus aktiviert. Nachrichten werden lokal gespeichert.'));
      notifyListeners();
    }
  }

  // Verbindung zum Server wiederherstellen
  Future<void> reconnect(String url) async {
    _reconnectAttempts = 0;
    _isOfflineMode = false;
    await connectToWebSocket(url);
  }
} 