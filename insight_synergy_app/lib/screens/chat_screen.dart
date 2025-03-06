import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/chat_provider.dart';
import '../models/message_model.dart';
import '../widgets/message_bubble.dart';
import '../utils/config.dart';
import 'dart:developer' as developer;

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isConnecting = false;

  @override
  void initState() {
    super.initState();
    // Verzögerte Verbindung zum Server
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _connectToServer();
    });
  }

  Future<void> _connectToServer() async {
    setState(() {
      _isConnecting = true;
    });

    try {
      // Verbindung zum Server herstellen
      // Zunächst versuchen wir es mit WebSocket
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      
      // Einige Debug-Informationen anzeigen
      developer.log('Versuche Verbindung zum Server: ${AppConfig.wsBaseUrl}', name: 'chat_screen');
      developer.log('WebSocket aktiviert: ${AppConfig.enableWebsockets}', name: 'chat_screen');
      
      await chatProvider.connectToWebSocket(AppConfig.wsBaseUrl);

      // Wenn keine WebSocket-Verbindung hergestellt werden konnte,
      // versuchen wir es mit HTTP und fügen eine Systemmeldung hinzu
      if (!chatProvider.isConnected) {
        developer.log('WebSocket-Verbindung fehlgeschlagen, verwende HTTP-Fallback', name: 'chat_screen');
        await chatProvider.loadMessagesFromApi();
        await chatProvider.sendMessageHttp('WebSocket nicht verfügbar. Verwende HTTP-Fallback.');
      } else {
        developer.log('WebSocket-Verbindung erfolgreich hergestellt', name: 'chat_screen');
      }
    } catch (e) {
      if (!mounted) return;
      developer.log('Fehler beim Verbinden: $e', name: 'chat_screen', error: e);
      
      // Zeige Fehler und biete Wiederverbindung an
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Verbindungsfehler: $e'),
          action: SnackBarAction(
            label: 'Erneut versuchen',
            onPressed: _connectToServer,
          ),
          duration: const Duration(seconds: 10),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isConnecting = false;
        });
      }
    }
  }

  // Nachrichten zurücksetzen
  Future<void> _resetChat() async {
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    
    // WebSocket-Verbindung trennen
    chatProvider.disconnect();
    
    // Chat zurücksetzen
    chatProvider.clearMessages();
    
    // Neu verbinden
    _connectToServer();
  }

  void _sendMessage() {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    
    if (chatProvider.isConnected) {
      chatProvider.sendMessage(message);
    } else {
      chatProvider.sendMessageHttp(message);
    }
    
    _messageController.clear();
    
    // Scrolle zum Ende der Liste
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Insight Synergy - Offline Chat'),
        backgroundColor: Colors.blueGrey[800],
        actions: [
          // Status-Indikator
          Consumer<ChatProvider>(
            builder: (context, chatProvider, _) {
              return Padding(
                padding: const EdgeInsets.all(8.0),
                child: Icon(
                  chatProvider.isConnected ? Icons.wifi : Icons.wifi_off,
                  color: chatProvider.isConnected ? Colors.green : Colors.red,
                ),
              );
            },
          ),
          // Reset-Button
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _resetChat,
            tooltip: 'Chat zurücksetzen',
          ),
        ],
      ),
      body: Column(
        children: [
          // Lade-Indikator
          if (_isConnecting)
            const LinearProgressIndicator(),
            
          // Fehlermeldung
          Consumer<ChatProvider>(
            builder: (context, chatProvider, _) {
              if (chatProvider.error != null) {
                return Container(
                  color: Colors.red[100],
                  padding: const EdgeInsets.all(8.0),
                  child: Row(
                    children: [
                      Icon(Icons.error, color: Colors.red[900]),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          chatProvider.error!,
                          style: TextStyle(color: Colors.red[900]),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.refresh),
                        onPressed: _connectToServer,
                        tooltip: 'Erneut versuchen',
                      ),
                    ],
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),
          
          // Chat-Nachrichten
          Expanded(
            child: Consumer<ChatProvider>(
              builder: (context, chatProvider, _) {
                if (chatProvider.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }
                
                if (chatProvider.messages.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.chat_bubble_outline, size: 48, color: Colors.grey),
                        const SizedBox(height: 16),
                        Text(
                          'Keine Nachrichten',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Senden Sie eine Nachricht, um zu beginnen',
                          style: TextStyle(color: Colors.grey[500], fontSize: 12),
                        ),
                      ],
                    ),
                  );
                }
                
                return ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(8.0),
                  itemCount: chatProvider.messages.length,
                  itemBuilder: (context, index) {
                    final message = chatProvider.messages[index];
                    return MessageBubble(message: message);
                  },
                );
              },
            ),
          ),
          
          // Nachrichteneingabe
          Consumer<ChatProvider>(
            builder: (context, chatProvider, _) {
              final bool isOffline = !chatProvider.isConnected && !chatProvider.isOfflineMode;
              
              return Container(
                padding: const EdgeInsets.all(8.0),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 4,
                      offset: const Offset(0, -1),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _messageController,
                        decoration: InputDecoration(
                          hintText: isOffline ? 'Offline - Nachrichten werden später gesendet' : 'Nachricht eingeben...',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                        ),
                        textInputAction: TextInputAction.send,
                        onSubmitted: (value) => _sendMessage(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.send),
                      onPressed: chatProvider.isLoading ? null : _sendMessage,
                      color: Colors.blue,
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
} 