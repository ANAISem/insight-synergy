import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/message_model.dart';
import '../utils/config.dart';

class StorageService {
  static const String _messagesKey = 'cached_messages';
  static const String _pendingMessagesKey = 'pending_messages';
  static const String _lastSyncKey = 'last_sync_timestamp';

  // Nachrichten im lokalen Speicher speichern
  Future<void> cacheMessages(List<Message> messages) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final messagesList = messages.map((message) => message.toJson()).toList();
      
      if (AppConfig.verboseLogging) {
        print('Speichere ${messages.length} Nachrichten im Cache');
      }
      
      await prefs.setString(_messagesKey, jsonEncode(messagesList));
      await prefs.setString(_lastSyncKey, DateTime.now().toIso8601String());
    } catch (e) {
      print('Fehler beim Cachen der Nachrichten: $e');
    }
  }

  // Nachrichten aus dem lokalen Speicher laden
  Future<List<Message>> getCachedMessages() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final messagesJson = prefs.getString(_messagesKey);
      
      if (messagesJson == null) {
        return [];
      }
      
      final messagesList = jsonDecode(messagesJson) as List;
      final messages = messagesList
          .map((msgJson) => Message.fromJson(msgJson as Map<String, dynamic>))
          .toList();
      
      if (AppConfig.verboseLogging) {
        print('${messages.length} Nachrichten aus dem Cache geladen');
      }
      
      return messages;
    } catch (e) {
      print('Fehler beim Laden der gecachten Nachrichten: $e');
      return [];
    }
  }

  // Nicht gesendete Nachrichten speichern
  Future<void> addPendingMessage(Message message) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      List<dynamic> pendingMessages = [];
      
      final pendingJson = prefs.getString(_pendingMessagesKey);
      if (pendingJson != null) {
        pendingMessages = jsonDecode(pendingJson);
      }
      
      pendingMessages.add(message.toJson());
      await prefs.setString(_pendingMessagesKey, jsonEncode(pendingMessages));
      
      if (AppConfig.verboseLogging) {
        print('Ausstehende Nachricht zum Cache hinzugefügt. Insgesamt: ${pendingMessages.length}');
      }
    } catch (e) {
      print('Fehler beim Speichern der ausstehenden Nachricht: $e');
    }
  }

  // Nicht gesendete Nachrichten abrufen
  Future<List<Message>> getPendingMessages() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final pendingJson = prefs.getString(_pendingMessagesKey);
      
      if (pendingJson == null) {
        return [];
      }
      
      final pendingList = jsonDecode(pendingJson) as List;
      return pendingList
          .map((msgJson) => Message.fromJson(msgJson as Map<String, dynamic>))
          .toList();
    } catch (e) {
      print('Fehler beim Laden der ausstehenden Nachrichten: $e');
      return [];
    }
  }

  // Nicht gesendete Nachrichten löschen
  Future<void> clearPendingMessages() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_pendingMessagesKey);
      
      if (AppConfig.verboseLogging) {
        print('Ausstehende Nachrichten gelöscht');
      }
    } catch (e) {
      print('Fehler beim Löschen der ausstehenden Nachrichten: $e');
    }
  }

  // Cache auf eine maximale Anzahl von Nachrichten beschränken
  Future<void> trimCache() async {
    try {
      final messages = await getCachedMessages();
      
      if (messages.length > AppConfig.maxCachedMessages) {
        final trimmedMessages = messages.sublist(
          messages.length - AppConfig.maxCachedMessages
        );
        await cacheMessages(trimmedMessages);
        
        if (AppConfig.verboseLogging) {
          print('Cache auf ${AppConfig.maxCachedMessages} Nachrichten begrenzt');
        }
      }
    } catch (e) {
      print('Fehler beim Begrenzen des Caches: $e');
    }
  }

  // Zeitstempel der letzten Synchronisierung abrufen
  Future<DateTime?> getLastSyncTimestamp() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final timestampStr = prefs.getString(_lastSyncKey);
      
      if (timestampStr == null) {
        return null;
      }
      
      return DateTime.parse(timestampStr);
    } catch (e) {
      print('Fehler beim Abrufen des letzten Sync-Zeitstempels: $e');
      return null;
    }
  }
} 