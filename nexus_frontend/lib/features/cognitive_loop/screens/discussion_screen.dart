import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:nexus_frontend/core/models/cognitive_loop/discussion.dart';
import 'package:nexus_frontend/core/models/cognitive_loop/discussion_message.dart';
import 'package:nexus_frontend/core/models/cognitive_loop/expert_profile.dart';
import 'package:nexus_frontend/core/services/cognitive_loop_service.dart';
import 'package:nexus_frontend/core/utils/error_handler.dart';
import 'package:nexus_frontend/features/cognitive_loop/widgets/bias_gauge.dart';
import 'package:nexus_frontend/features/cognitive_loop/widgets/discussion_message_item.dart';
import 'package:nexus_frontend/features/cognitive_loop/widgets/expert_chip.dart';
import 'package:nexus_frontend/features/cognitive_loop/widgets/progress_indicator_widget.dart';
import 'package:provider/provider.dart';

class DiscussionScreen extends StatefulWidget {
  final String discussionId;

  const DiscussionScreen({Key? key, required this.discussionId}) : super(key: key);

  @override
  _DiscussionScreenState createState() => _DiscussionScreenState();
}

class _DiscussionScreenState extends State<DiscussionScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  late CognitiveLoopService _cognitiveLoopService;
  late ErrorHandler _errorHandler;

  Discussion? _discussion;
  List<DiscussionMessage> _messages = [];
  List<ExpertProfile> _experts = [];
  bool _isLoading = true;
  bool _isSending = false;
  bool _websocketConnected = false;
  WebSocket? _websocket;
  
  double _progressScore = 0.0;
  Map<String, dynamic> _biasAssessment = {};
  List<String> _keyInsights = [];

  @override
  void initState() {
    super.initState();
    _cognitiveLoopService = Provider.of<CognitiveLoopService>(context, listen: false);
    _errorHandler = Provider.of<ErrorHandler>(context, listen: false);
    _loadData();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _disconnectWebsocket();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Diskussion laden
      _discussion = await _cognitiveLoopService.getDiscussion(widget.discussionId);
      
      // Nachrichten laden
      final messages = await _cognitiveLoopService.getDiscussionMessages(widget.discussionId);
      
      // Experten laden
      _experts = await _cognitiveLoopService.getExperts();
      
      // Analyse laden
      final analysis = await _cognitiveLoopService.getDiscussionAnalysis(widget.discussionId);
      
      if (mounted) {
        setState(() {
          _messages = messages;
          _progressScore = analysis.progressionScore;
          _biasAssessment = analysis.biasAssessment;
          _keyInsights = analysis.keyInsights;
          _isLoading = false;
        });
        
        // WebSocket verbinden
        _connectWebsocket();
        
        // Nach unten scrollen
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _scrollToBottom();
        });
      }
    } catch (e) {
      _errorHandler.handleError(e, context);
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _connectWebsocket() {
    try {
      final wsUrl = _cognitiveLoopService.getWebsocketUrl(widget.discussionId);
      _websocket = WebSocket(wsUrl);
      
      _websocket!.onOpen = () {
        if (mounted) {
          setState(() {
            _websocketConnected = true;
          });
        }
      };
      
      _websocket!.onMessage = (data) {
        final message = jsonDecode(data);
        _handleWebsocketMessage(message);
      };
      
      _websocket!.onClose = () {
        if (mounted) {
          setState(() {
            _websocketConnected = false;
          });
        }
      };
      
      _websocket!.onError = (error) {
        _errorHandler.showErrorSnackBar(
          context, 
          'Fehler bei der WebSocket-Verbindung: $error'
        );
        if (mounted) {
          setState(() {
            _websocketConnected = false;
          });
        }
      };
      
      _websocket!.connect();
    } catch (e) {
      _errorHandler.handleError(e, context);
    }
  }

  void _disconnectWebsocket() {
    _websocket?.close();
  }

  void _handleWebsocketMessage(Map<String, dynamic> message) {
    final messageType = message['type'];
    
    if (messageType == 'initial_data') {
      // Initiale Daten verarbeiten
      final discussionData = message['discussion'];
      final messagesData = message['messages'] as List;
      final analysisData = message['analysis'];
      
      if (mounted) {
        setState(() {
          _discussion = Discussion.fromJson(discussionData);
          _messages = messagesData.map((m) => DiscussionMessage.fromJson(m)).toList();
          
          if (analysisData != null) {
            _progressScore = analysisData['progression_score'] ?? 0.0;
            _biasAssessment = analysisData['bias_assessment'] ?? {};
            _keyInsights = List<String>.from(analysisData['key_insights'] ?? []);
          }
        });
        
        // Nach unten scrollen
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _scrollToBottom();
        });
      }
    } else if (messageType == 'new_message') {
      // Neue Nachricht verarbeiten
      final messageData = message['message'];
      final newMessage = DiscussionMessage.fromJson(messageData);
      
      if (mounted) {
        setState(() {
          _messages.add(newMessage);
          if (newMessage.senderId == 'user') {
            _isSending = false;
          }
        });
        
        // Nach unten scrollen
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _scrollToBottom();
        });
      }
    } else if (messageType == 'expert_response') {
      // Expertenantwort verarbeiten
      final messageData = message['message'];
      final expertMessage = DiscussionMessage.fromJson(messageData);
      
      if (mounted) {
        setState(() {
          _messages.add(expertMessage);
        });
        
        // Nach unten scrollen
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _scrollToBottom();
        });
      }
    } else if (messageType == 'analysis_update') {
      // Analyseaktualisierung verarbeiten
      final analysisData = message['analysis'];
      
      if (mounted && analysisData != null) {
        setState(() {
          _progressScore = analysisData['progression_score'] ?? 0.0;
          _biasAssessment = analysisData['bias_assessment'] ?? {};
          _keyInsights = List<String>.from(analysisData['key_insights'] ?? []);
        });
      }
    }
  }

  void _sendMessage() async {
    final messageText = _messageController.text.trim();
    if (messageText.isEmpty || _isSending) {
      return;
    }
    
    setState(() {
      _isSending = true;
    });
    
    // Wenn WebSocket verbunden, Nachricht über WebSocket senden
    if (_websocketConnected && _websocket != null) {
      try {
        _websocket!.send(jsonEncode({
          'type': 'new_message',
          'message': {
            'content': messageText,
            'sender_id': 'user',
            'sender_type': 'user'
          }
        }));
        
        // Eingabefeld leeren
        _messageController.clear();
      } catch (e) {
        _errorHandler.handleError(e, context);
        setState(() {
          _isSending = false;
        });
      }
    } 
    // Ansonsten Nachricht über REST-API senden
    else {
      try {
        final message = await _cognitiveLoopService.addMessage(
          widget.discussionId,
          messageText,
          'user',
          'user',
        );
        
        setState(() {
          _messages.add(message);
          _isSending = false;
        });
        
        // Eingabefeld leeren
        _messageController.clear();
        
        // Nach unten scrollen
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _scrollToBottom();
        });
        
        // Expertenantworten generieren
        _generateExpertResponses(message.id);
      } catch (e) {
        _errorHandler.handleError(e, context);
        setState(() {
          _isSending = false;
        });
      }
    }
  }

  Future<void> _generateExpertResponses(String messageId) async {
    try {
      final responses = await _cognitiveLoopService.generateExpertResponses(
        widget.discussionId,
        messageId,
      );
      
      if (mounted) {
        setState(() {
          _messages.addAll(responses);
        });
        
        // Nach unten scrollen
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _scrollToBottom();
        });
        
        // Analyse aktualisieren
        _updateAnalysis();
      }
    } catch (e) {
      _errorHandler.handleError(e, context);
    }
  }

  Future<void> _updateAnalysis() async {
    try {
      final analysis = await _cognitiveLoopService.getDiscussionAnalysis(widget.discussionId);
      
      if (mounted) {
        setState(() {
          _progressScore = analysis.progressionScore;
          _biasAssessment = analysis.biasAssessment;
          _keyInsights = analysis.keyInsights;
        });
      }
    } catch (e) {
      _errorHandler.handleError(e, context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_discussion?.title ?? 'Diskussion'),
        actions: [
          IconButton(
            icon: Icon(Icons.analytics_outlined),
            tooltip: 'Diskussionsanalyse',
            onPressed: () {
              _showDiscussionAnalysis();
            },
          ),
          IconButton(
            icon: Icon(Icons.info_outline),
            tooltip: 'Diskussionsdetails',
            onPressed: () {
              _showDiscussionDetails();
            },
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Fortschrittsindikator
                ProgressIndicatorWidget(
                  progress: _progressScore,
                  keyInsights: _keyInsights.isNotEmpty,
                  expertCount: _discussion?.participants.length ?? 0,
                ),
                
                // Nachrichten-Liste
                Expanded(
                  child: _messages.isEmpty
                      ? Center(
                          child: Text(
                            'Starte die Diskussion mit einer Nachricht',
                            style: TextStyle(
                              fontSize: 16.0,
                              color: Colors.grey,
                            ),
                          ),
                        )
                      : ListView.builder(
                          controller: _scrollController,
                          padding: EdgeInsets.all(16),
                          itemCount: _messages.length,
                          itemBuilder: (context, index) {
                            final message = _messages[index];
                            
                            // Finde den Experten für Experten-Nachrichten
                            ExpertProfile? expert;
                            if (message.senderType == 'expert') {
                              expert = _experts.firstWhere(
                                (e) => e.id == message.senderId,
                                orElse: () => ExpertProfile(
                                  id: message.senderId,
                                  name: 'Unbekannter Experte',
                                  expertiseArea: 'Unbekannt',
                                  description: '',
                                  biasProfile: {},
                                  confidenceLevel: 0.5,
                                ),
                              );
                            }
                            
                            return DiscussionMessageItem(
                              message: message,
                              expert: expert,
                              onReply: (messageId) {
                                // Noch zu implementieren
                              },
                            );
                          },
                        ),
                ),
                
                // Eingabefeld
                Container(
                  padding: EdgeInsets.all(8.0),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black12,
                        offset: Offset(0, -1),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _messageController,
                          decoration: InputDecoration(
                            hintText: 'Nachricht eingeben...',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24.0),
                              borderSide: BorderSide.none,
                            ),
                            filled: true,
                            fillColor: Theme.of(context).colorScheme.surface,
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: 16.0,
                              vertical: 8.0,
                            ),
                          ),
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _sendMessage(),
                          minLines: 1,
                          maxLines: 5,
                        ),
                      ),
                      SizedBox(width: 8.0),
                      IconButton(
                        icon: _isSending
                            ? SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    Theme.of(context).colorScheme.primary,
                                  ),
                                ),
                              )
                            : Icon(Icons.send),
                        onPressed: _isSending ? null : _sendMessage,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  void _showDiscussionAnalysis() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.7,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (context, scrollController) {
            return Container(
              padding: EdgeInsets.all(16),
              child: ListView(
                controller: scrollController,
                children: [
                  Text(
                    'Diskussionsanalyse',
                    style: Theme.of(context).textTheme.headline5,
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 16),
                  
                  // Fortschritt
                  Card(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Fortschritt',
                            style: Theme.of(context).textTheme.subtitle1,
                          ),
                          SizedBox(height: 8),
                          LinearProgressIndicator(
                            value: _progressScore,
                            backgroundColor: Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Theme.of(context).colorScheme.primary,
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            '${(_progressScore * 100).toStringAsFixed(0)}% abgeschlossen',
                            style: TextStyle(
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SizedBox(height: 16),
                  
                  // Bias-Bewertung
                  if (_biasAssessment.isNotEmpty) ...[
                    Card(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Bias-Bewertung',
                              style: Theme.of(context).textTheme.subtitle1,
                            ),
                            SizedBox(height: 16),
                            if (_biasAssessment['average_biases'] != null)
                              ..._buildBiasGauges(
                                _biasAssessment['average_biases'] as Map<String, dynamic>
                              ),
                            SizedBox(height: 8),
                            Text(
                              'Bias-Diversität: ${_biasAssessment['bias_diversity'] ?? 0}',
                              style: TextStyle(
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    SizedBox(height: 16),
                  ],
                  
                  // Schlüsselerkenntnisse
                  if (_keyInsights.isNotEmpty) ...[
                    Card(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Schlüsselerkenntnisse',
                              style: Theme.of(context).textTheme.subtitle1,
                            ),
                            SizedBox(height: 8),
                            ...List.generate(
                              _keyInsights.length,
                              (index) => Padding(
                                padding: EdgeInsets.symmetric(vertical: 4),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('• '),
                                    Expanded(
                                      child: Text(_keyInsights[index]),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    SizedBox(height: 16),
                  ],
                  
                  // Beteiligte Experten
                  Card(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Beteiligte Experten',
                            style: Theme.of(context).textTheme.subtitle1,
                          ),
                          SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _getParticipatingExperts().map((expert) {
                              return ExpertChip(
                                expert: expert,
                                onTap: () {
                                  _showExpertDetail(expert);
                                },
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  List<Widget> _buildBiasGauges(Map<String, dynamic> biases) {
    final widgets = <Widget>[];
    biases.forEach((biasType, value) {
      if (value is num) {
        widgets.add(
          Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: BiasGauge(
              biasType: _formatBiasType(biasType),
              value: value.toDouble(),
            ),
          ),
        );
      }
    });
    return widgets;
  }

  String _formatBiasType(String biasType) {
    // Konvertiert snake_case oder camelCase zu Wörtern mit Großbuchstaben
    return biasType
        .replaceAllMapped(RegExp(r'(_[a-z])'), (match) => ' ${match.group(0)!.substring(1).toUpperCase()}')
        .replaceAllMapped(RegExp(r'([A-Z])'), (match) => ' ${match.group(0)}')
        .trim()
        .replaceAll(RegExp(r'\s+'), ' ')
        .split(' ')
        .map((word) => word.isNotEmpty ? '${word[0].toUpperCase()}${word.substring(1)}' : '')
        .join(' ');
  }

  List<ExpertProfile> _getParticipatingExperts() {
    // Gibt die Liste der Experten zurück, die an der Diskussion teilgenommen haben
    final expertIds = <String>{};
    for (final message in _messages) {
      if (message.senderType == 'expert') {
        expertIds.add(message.senderId);
      }
    }
    
    return _experts.where((expert) => expertIds.contains(expert.id)).toList();
  }

  void _showExpertDetail(ExpertProfile expert) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(expert.name),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Fachgebiet: ${expert.expertiseArea}',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 8),
                Text(expert.description),
                SizedBox(height: 16),
                Text(
                  'Bias-Profil:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 8),
                ..._buildBiasGauges(expert.biasProfile),
                SizedBox(height: 8),
                Text(
                  'Konfidenzlevel: ${(expert.confidenceLevel * 100).toStringAsFixed(0)}%',
                  style: TextStyle(fontStyle: FontStyle.italic),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: Text('Schließen'),
            ),
          ],
        );
      },
    );
  }

  void _showDiscussionDetails() {
    if (_discussion == null) return;
    
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('Diskussionsdetails'),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Titel:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 4),
                Text(_discussion!.title),
                SizedBox(height: 16),
                
                Text(
                  'Beschreibung:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 4),
                Text(_discussion!.description),
                SizedBox(height: 16),
                
                Text(
                  'Status:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 4),
                Chip(
                  label: Text(
                    _discussion!.status == 'active' ? 'Aktiv' : 'Geschlossen',
                    style: TextStyle(
                      color: _discussion!.status == 'active'
                          ? Colors.white
                          : Colors.black87,
                    ),
                  ),
                  backgroundColor: _discussion!.status == 'active'
                      ? Colors.green
                      : Colors.grey[300],
                ),
                SizedBox(height: 16),
                
                Text(
                  'Erstellt am:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 4),
                Text(_formatDate(_discussion!.createdAt)),
                SizedBox(height: 8),
                
                Text(
                  'Letztes Update:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 4),
                Text(_formatDate(_discussion!.updatedAt)),
                SizedBox(height: 16),
                
                Text(
                  'Nachrichten: ${_discussion!.messageCount}',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: Text('Schließen'),
            ),
            if (_discussion!.status == 'active')
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  _closeDiscussion();
                },
                child: Text('Diskussion schließen'),
                style: TextButton.styleFrom(
                  primary: Colors.red,
                ),
              ),
          ],
        );
      },
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  void _closeDiscussion() async {
    try {
      final updatedDiscussion = await _cognitiveLoopService.closeDiscussion(widget.discussionId);
      
      if (mounted) {
        setState(() {
          _discussion = updatedDiscussion;
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Diskussion wurde geschlossen'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      _errorHandler.handleError(e, context);
    }
  }
}

class WebSocket {
  final String url;
  WebSocket? _socket;
  
  Function()? onOpen;
  Function(String)? onMessage;
  Function()? onClose;
  Function(dynamic)? onError;
  
  WebSocket(this.url);
  
  void connect() {
    try {
      _socket = WebSocket(url);
      
      _socket!.onOpen = () {
        if (onOpen != null) onOpen!();
      };
      
      _socket!.onMessage = (data) {
        if (onMessage != null) onMessage!(data);
      };
      
      _socket!.onClose = () {
        if (onClose != null) onClose!();
      };
      
      _socket!.onError = (error) {
        if (onError != null) onError!(error);
      };
    } catch (e) {
      if (onError != null) onError!(e);
    }
  }
  
  void send(String data) {
    _socket?.send(data);
  }
  
  void close() {
    _socket?.close();
  }
} 