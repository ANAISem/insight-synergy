import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../providers/nexus_provider.dart';
import '../../../core/services/nexus_service.dart';

/// Screen für The Nexus, die Wissens- und Lösungsmaschine
class NexusScreen extends StatefulWidget {
  const NexusScreen({Key? key}) : super(key: key);

  @override
  _NexusScreenState createState() => _NexusScreenState();
}

class _NexusScreenState extends State<NexusScreen> {
  final TextEditingController _queryController = TextEditingController();
  final TextEditingController _contextController = TextEditingController();
  final List<String> _goals = [];
  final TextEditingController _goalController = TextEditingController();
  late NexusProvider _provider;
  
  bool _showSolution = false;
  NexusResponse? _currentSolution;
  bool _showContextInput = false;
  bool _isAnalysisMode = false;
  
  @override
  void initState() {
    super.initState();
    _provider = Provider.of<NexusProvider>(context, listen: false);
  }

  @override
  void dispose() {
    _queryController.dispose();
    _contextController.dispose();
    _goalController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'The Nexus',
      body: Consumer<NexusProvider>(
        builder: (context, provider, child) {
          return Column(
            children: [
              // Header mit Erklärung
              Container(
                padding: const EdgeInsets.all(16),
                color: Theme.of(context).colorScheme.surfaceVariant,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'The Nexus - Wissens- und Lösungsmaschine',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'The Nexus analysiert komplexe Probleme und generiert strukturierte Lösungen basierend auf Mistral 7B.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              
              // Hauptinhalt
              Expanded(
                child: _showSolution && _currentSolution != null
                    ? _buildSolutionView()
                    : _buildQueryInputView(),
              ),
            ],
          );
        },
      ),
    );
  }
  
  Widget _buildQueryInputView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Analyse- oder Lösungsmodus-Auswahl
          Row(
            children: [
              Expanded(
                child: SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment<bool>(
                      value: false,
                      label: Text('Lösungsmodus'),
                      icon: Icon(Icons.lightbulb_outline),
                    ),
                    ButtonSegment<bool>(
                      value: true,
                      label: Text('Analysemodus'),
                      icon: Icon(Icons.analytics_outlined),
                    ),
                  ],
                  selected: {_isAnalysisMode},
                  onSelectionChanged: (Set<bool> selection) {
                    setState(() {
                      _isAnalysisMode = selection.first;
                    });
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          // Hauptfrage-Eingabe
          Text(
            _isAnalysisMode ? 'Zu analysierende Fragestellung:' : 'Problem oder Fragestellung:',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _queryController,
            decoration: InputDecoration(
              hintText: _isAnalysisMode 
                  ? 'Beschreibe das zu analysierende Problem...'
                  : 'Beschreibe das Problem, für das du eine Lösung benötigst...',
              border: const OutlineInputBorder(),
              filled: true,
            ),
            maxLines: 4,
          ),
          const SizedBox(height: 16),
          
          // Kontext-Eingabe (optional)
          Row(
            children: [
              Text(
                'Zusätzlicher Kontext:',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(width: 8),
              Switch(
                value: _showContextInput,
                onChanged: (value) {
                  setState(() {
                    _showContextInput = value;
                  });
                },
              ),
            ],
          ),
          
          if (_showContextInput) ...[
            const SizedBox(height: 8),
            TextField(
              controller: _contextController,
              decoration: const InputDecoration(
                hintText: 'Füge relevanten Kontext hinzu (optional)...',
                border: OutlineInputBorder(),
                filled: true,
              ),
              maxLines: 3,
            ),
          ],
          
          // Zieldefinition (nur im Lösungsmodus)
          if (!_isAnalysisMode) ...[
            const SizedBox(height: 16),
            Text(
              'Ziele:',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _goalController,
                    decoration: const InputDecoration(
                      hintText: 'Definiere ein Ziel...',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: _addGoal,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () => _addGoal(_goalController.text),
                  icon: const Icon(Icons.add_circle_outline),
                  tooltip: 'Ziel hinzufügen',
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _goals.map((goal) => Chip(
                label: Text(goal),
                deleteIcon: const Icon(Icons.cancel),
                onDeleted: () => _removeGoal(goal),
              )).toList(),
            ),
          ],
          
          const SizedBox(height: 24),
          
          // Senden-Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _provider.isLoading ? null : _submitQuery,
              icon: _provider.isLoading 
                  ? const SizedBox(
                      width: 20, 
                      height: 20, 
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(_isAnalysisMode ? Icons.analytics : Icons.lightbulb),
              label: Text(_isAnalysisMode ? 'Analyse starten' : 'Lösung generieren'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
          
          // Fehleranzeige
          if (_provider.error != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.error_outline,
                    color: Theme.of(context).colorScheme.error,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _provider.error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
  
  Widget _buildSolutionView() {
    return Column(
      children: [
        // Fortschrittsanzeige
        Container(
          padding: const EdgeInsets.all(12),
          color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
          child: Row(
            children: [
              Icon(
                Icons.check_circle,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isAnalysisMode ? 'Analyse abgeschlossen' : 'Lösung generiert',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _currentSolution!.steps.map((step) {
                          return Padding(
                            padding: const EdgeInsets.only(right: 16),
                            child: Chip(
                              label: Text(step),
                              backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        
        // Lösungsinhalt
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isAnalysisMode ? 'Analyseergebnis:' : 'Lösungsvorschlag:',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 16),
                SelectableText(_currentSolution!.solution),
                
                // Modellangabe
                const SizedBox(height: 32),
                Text(
                  'Generiert mit ${_currentSolution!.model}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ),
        
        // Aktionsleiste
        Container(
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
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              OutlinedButton.icon(
                onPressed: () {
                  setState(() {
                    _showSolution = false;
                    _currentSolution = null;
                  });
                },
                icon: const Icon(Icons.edit),
                label: const Text('Neue Anfrage'),
              ),
              ElevatedButton.icon(
                onPressed: () {
                  // TODO: Implementiere Speicherfunktion
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Speicherfunktion noch nicht implementiert')),
                  );
                },
                icon: const Icon(Icons.save),
                label: const Text('Speichern'),
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  void _addGoal(String goal) {
    if (goal.trim().isEmpty) return;
    
    setState(() {
      _goals.add(goal.trim());
      _goalController.clear();
    });
  }
  
  void _removeGoal(String goal) {
    setState(() {
      _goals.remove(goal);
    });
  }
  
  void _submitQuery() async {
    final query = _queryController.text.trim();
    if (query.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Bitte gib eine Fragestellung ein')),
      );
      return;
    }
    
    final context = _showContextInput ? _contextController.text.trim() : null;
    final goals = _goals.isNotEmpty ? _goals : null;
    
    final request = NexusRequest(
      query: query,
      context: context,
      goals: goals,
    );
    
    try {
      final response = _isAnalysisMode
          ? await _provider.analyzeQuery(request)
          : await _provider.generateSolution(request);
      
      setState(() {
        _currentSolution = response;
        _showSolution = true;
      });
    } catch (e) {
      // Der Fehler wird bereits im Provider gesetzt
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Fehler: ${e.toString()}')),
      );
    }
  }
} 