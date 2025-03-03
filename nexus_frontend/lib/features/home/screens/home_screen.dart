import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/home_provider.dart';
import '../../../core/navigation/routes.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _mistralInputController = TextEditingController();
  String _mistralResponse = '';
  bool _isGenerating = false;

  @override
  void dispose() {
    _mistralInputController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<HomeProvider>(
      builder: (context, homeProvider, child) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Nexus Dashboard'),
            actions: [
              Switch(
                value: homeProvider.isOfflineMode,
                onChanged: (_) => homeProvider.toggleOfflineMode(),
              ),
              const SizedBox(width: 8),
              Text(
                homeProvider.isOfflineMode ? 'Offline' : 'Online',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(width: 16),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Status-Karte
                _buildStatusCard(homeProvider),
                
                const SizedBox(height: 24),
                
                // Hauptfunktionen
                Text(
                  'Hauptfunktionen',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 16),
                _buildFeatureGrid(context),
                
                const SizedBox(height: 24),
                
                // Mistral 7B Integration
                Text(
                  'Mistral 7B Offline-Integration',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 16),
                _buildMistralInterface(homeProvider),
                
                const SizedBox(height: 24),
                
                // Letzte Aktivitäten
                Text(
                  'Letzte Aktivitäten',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 16),
                _buildRecentActivities(homeProvider),
              ],
            ),
          ),
        );
      },
    );
  }
  
  Widget _buildStatusCard(HomeProvider homeProvider) {
    final Color statusColor = homeProvider.isMistralInitialized
        ? Colors.green
        : Colors.orange;
        
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info_outline, color: statusColor),
                const SizedBox(width: 8),
                Text(
                  'Systemstatus',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              homeProvider.statusMessage,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Icon(
                  homeProvider.isMistralInitialized
                      ? Icons.check_circle
                      : Icons.pending,
                  color: statusColor,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Text(
                  'Mistral 7B: ${homeProvider.isMistralInitialized ? 'Initialisiert' : 'Wird initialisiert...'}',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildFeatureGrid(BuildContext context) {
    final List<Map<String, dynamic>> features = [
      {
        'title': 'Wissensbasis',
        'icon': Icons.book,
        'color': Colors.blue,
        'route': AppRoutes.knowledgeBase,
      },
      {
        'title': 'Wissensgraph',
        'icon': Icons.hub,
        'color': Colors.purple,
        'route': AppRoutes.knowledgeGraph,
      },
      {
        'title': 'Suche',
        'icon': Icons.search,
        'color': Colors.orange,
        'route': AppRoutes.search,
      },
      {
        'title': 'Kognitive Schleife',
        'icon': Icons.sync,
        'color': Colors.green,
        'route': AppRoutes.cognitiveLoop,
      },
    ];
    
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.5,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: features.length,
      itemBuilder: (context, index) {
        final feature = features[index];
        return InkWell(
          onTap: () => Navigator.pushNamed(context, feature['route']),
          child: Card(
            color: feature['color'].withOpacity(0.1),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    feature['icon'],
                    size: 36,
                    color: feature['color'],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    feature['title'],
                    style: Theme.of(context).textTheme.titleMedium,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
  
  Widget _buildMistralInterface(HomeProvider homeProvider) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Frage an Mistral 7B',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _mistralInputController,
              decoration: const InputDecoration(
                hintText: 'Deine Frage an Mistral 7B...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
              enabled: homeProvider.isMistralInitialized,
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                ElevatedButton.icon(
                  onPressed: homeProvider.isMistralInitialized && !_isGenerating
                      ? () => _generateMistralResponse(homeProvider)
                      : null,
                  icon: Icon(_isGenerating ? Icons.pending : Icons.send),
                  label: Text(_isGenerating ? 'Generiere...' : 'Senden'),
                ),
              ],
            ),
            if (_mistralResponse.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),
              Text(
                'Antwort:',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceVariant,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_mistralResponse),
              ),
            ],
          ],
        ),
      ),
    );
  }
  
  Future<void> _generateMistralResponse(HomeProvider homeProvider) async {
    if (_mistralInputController.text.trim().isEmpty) return;
    
    setState(() {
      _isGenerating = true;
    });
    
    try {
      final response = await homeProvider.generateResponse(
        _mistralInputController.text.trim(),
      );
      
      setState(() {
        _mistralResponse = response;
        _isGenerating = false;
      });
    } catch (e) {
      setState(() {
        _mistralResponse = "Fehler bei der Generierung: $e";
        _isGenerating = false;
      });
    }
  }
  
  Widget _buildRecentActivities(HomeProvider homeProvider) {
    return Card(
      elevation: 2,
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: homeProvider.recentActivities.length,
        separatorBuilder: (context, index) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final activity = homeProvider.recentActivities[index];
          return ListTile(
            dense: true,
            leading: const Icon(Icons.history, size: 18),
            title: Text(
              activity,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          );
        },
      ),
    );
  }
} 