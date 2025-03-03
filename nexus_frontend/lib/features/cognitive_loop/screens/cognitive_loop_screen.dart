import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/services/mistral_service.dart';
import '../providers/cognitive_loop_provider.dart';

class CognitiveLoopScreen extends StatefulWidget {
  const CognitiveLoopScreen({Key? key}) : super(key: key);

  @override
  _CognitiveLoopScreenState createState() => _CognitiveLoopScreenState();
}

class _CognitiveLoopScreenState extends State<CognitiveLoopScreen> {
  final TextEditingController _questionController = TextEditingController();
  final FocusNode _questionFocus = FocusNode();
  final List<Message> _messages = [];
  bool _isProcessing = false;
  int _currentStep = 0;
  late CognitiveLoopProvider _provider;
  
  final List<String> _steps = [
    "1. Frage verstehen",
    "2. Kontext analysieren",
    "3. Wissensdatenbank durchsuchen",
    "4. Informationen verknüpfen",
    "5. Antwort generieren",
  ];

  @override
  void initState() {
    super.initState();
    _provider = Provider.of<CognitiveLoopProvider>(context, listen: false);
  }

  @override
  void dispose() {
    _questionController.dispose();
    _questionFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Kognitive Schleife',
      body: Column(
        children: [
          // Header mit Erklärung
          Container(
            padding: const EdgeInsets.all(16),
            color: Theme.of(context).colorScheme.surfaceVariant,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mistral 7B Kognitive Schleife',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  'Die kognitive Schleife verbindet deine Fragen mit der Wissensdatenbank und generiert Antworten mit Hilfe von Mistral 7B.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          
          // Chat-Bereich
          Expanded(
            child: _messages.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      return _buildMessageBubble(message);
                    },
                  ),
          ),
          
          // Prozess-Indikator
          if (_isProcessing) _buildProcessIndicator(),
          
          // Eingabefeld und Senden-Button
          _buildInputArea(),
        ],
      ),
    );
  }
  
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.sync,
            size: 64,
            color: Theme.of(context).colorScheme.primary.withOpacity(0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'Stelle eine Frage, um die kognitive Schleife zu starten',
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              'Die kognitive Schleife verarbeitet deine Frage in mehreren Schritten und liefert eine fundierte Antwort.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildMessageBubble(Message message) {
    final bool isUser = message.isFromUser;
    
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            CircleAvatar(
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: const Icon(Icons.psychology, color: Colors.white),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isUser
                    ? Theme.of(context).colorScheme.primary.withOpacity(0.1)
                    : Theme.of(context).colorScheme.surfaceVariant,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isUser
                      ? Theme.of(context).colorScheme.primary.withOpacity(0.5)
                      : Theme.of(context).colorScheme.outline.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isUser ? 'Du' : 'Mistral 7B',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isUser
                          ? Theme.of(context).colorScheme.primary
                          : Theme.of(context).colorScheme.secondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(message.content),
                ],
              ),
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: const Icon(Icons.person, color: Colors.white),
            ),
          ],
        ],
      ),
    );
  }
  
  Widget _buildProcessIndicator() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Verarbeitung läuft...',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 16),
          LinearProgressIndicator(
            value: _currentStep / (_steps.length - 1),
            backgroundColor: Theme.of(context).colorScheme.surface,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: 8),
          Text(
            _steps[_currentStep],
            style: TextStyle(
              fontSize: 14,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 5,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _questionController,
              focusNode: _questionFocus,
              decoration: const InputDecoration(
                hintText: 'Stelle eine Frage...',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              textInputAction: TextInputAction.send,
              enabled: !_isProcessing,
              onSubmitted: (_) => _submitQuestion(),
              maxLines: 1,
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: _isProcessing ? null : _submitQuestion,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.all(16),
              shape: const CircleBorder(),
            ),
            child: const Icon(Icons.send),
          ),
        ],
      ),
    );
  }
  
  void _submitQuestion() {
    final question = _questionController.text.trim();
    if (question.isEmpty) return;
    
    setState(() {
      _messages.add(Message(content: question, isFromUser: true));
      _questionController.clear();
      _isProcessing = true;
      _currentStep = 0;
    });
    
    _processCognitiveLoop(question);
  }
  
  Future<void> _processCognitiveLoop(String question) async {
    try {
      // Simuliere die kognitiven Schritte visuell
      for (int i = 0; i < _steps.length; i++) {
        await Future.delayed(const Duration(milliseconds: 800));
        setState(() {
          _currentStep = i;
        });
      }
      
      // Erstelle eine echte Anfrage an das Backend
      final chatRequest = ChatRequest(
        messages: [
          Message(
            role: 'user',
            content: question,
          ),
        ],
      );
      
      // Verwende den Provider, um die Anfrage zu senden
      final response = await _provider.sendCognitiveLoopRequest(chatRequest);
      
      setState(() {
        _messages.add(Message(content: response.response, isFromUser: false));
        _isProcessing = false;
      });
    } catch (e) {
      // Fehlerbehandlung
      setState(() {
        _messages.add(Message(
          content: 'Es ist ein Fehler aufgetreten: ${e.toString()}',
          isFromUser: false,
        ));
        _isProcessing = false;
      });
    }
  }
}

class Message {
  final String content;
  final bool isFromUser;
  
  Message({
    required this.content,
    required this.isFromUser,
  });
} 