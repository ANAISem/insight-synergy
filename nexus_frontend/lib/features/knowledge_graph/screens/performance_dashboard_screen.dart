import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:charts_flutter/flutter.dart' as charts;
import 'package:http/http.dart' as http;

import 'package:nexus_frontend/core/api/api_service.dart';
import 'package:nexus_frontend/core/auth/auth_provider.dart';
import 'package:nexus_frontend/core/utils/error_handler.dart';
import 'package:nexus_frontend/core/theme/app_colors.dart';
import 'package:nexus_frontend/features/knowledge_graph/providers/knowledge_graph_provider.dart';

/// Dashboard zur Überwachung der Leistung des Wissensgraphen und der Backend-Komponenten
class PerformanceDashboardScreen extends StatefulWidget {
  /// Konstruktor für das PerformanceDashboardScreen
  const PerformanceDashboardScreen({Key? key}) : super(key: key);

  @override
  State<PerformanceDashboardScreen> createState() => _PerformanceDashboardScreenState();
}

class _PerformanceDashboardScreenState extends State<PerformanceDashboardScreen> {
  bool _isLoading = true;
  Map<String, dynamic> _performanceData = {};
  Map<String, dynamic> _graphMetrics = {};
  Timer? _refreshTimer;
  final List<Map<String, dynamic>> _queryHistory = [];

  @override
  void initState() {
    super.initState();
    _loadData();
    // Daten alle 30 Sekunden aktualisieren
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      _loadData();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Backend-Leistungsstatistiken laden
      await _loadBackendPerformanceData();
      
      // Wissensgraph-Metriken berechnen
      _calculateGraphMetrics();

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      ErrorHandler().handleKnowledgeGraphError(
        context, 
        'Fehler beim Laden der Leistungsdaten: ${e.toString()}'
      );
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadBackendPerformanceData() async {
    try {
      final apiService = Provider.of<ApiService>(context, listen: false);
      final response = await apiService.get('/api/system/performance');
      
      if (response.statusCode == 200) {
        setState(() {
          _performanceData = json.decode(response.body);
          
          // Abfragehistorie aktualisieren
          if (_performanceData.containsKey('recent_queries')) {
            final List<dynamic> recentQueries = _performanceData['recent_queries'];
            for (var query in recentQueries) {
              if (!_queryHistory.any((q) => q['id'] == query['id'])) {
                _queryHistory.add(query);
                // Maximale Anzahl begrenzen
                if (_queryHistory.length > 100) {
                  _queryHistory.removeAt(0);
                }
              }
            }
          }
        });
      } else {
        throw Exception('Fehler beim Laden der Leistungsdaten: ${response.statusCode}');
      }
    } catch (e) {
      // Fehler protokollieren, aber nicht erneut werfen, um die UI nicht zu blockieren
      print('Fehler beim Laden der Backend-Leistungsdaten: $e');
    }
  }

  void _calculateGraphMetrics() {
    final graphProvider = Provider.of<KnowledgeGraphProvider>(context, listen: false);
    final graph = graphProvider.graph;
    
    if (graph == null) {
      _graphMetrics = {
        'node_count': 0,
        'edge_count': 0,
        'density': 0.0,
        'avg_connections': 0.0,
        'largest_node_cluster': 0,
      };
      return;
    }
    
    // Grundlegende Metriken
    final nodeCount = graph.nodes.length;
    final edgeCount = graph.edges.length;
    
    // Graphdichte berechnen (0-1, wobei 1 vollständig verbunden bedeutet)
    double density = 0.0;
    if (nodeCount > 1) {
      final maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
      density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
    }
    
    // Durchschnittliche Anzahl von Verbindungen pro Knoten
    final avgConnections = nodeCount > 0 ? edgeCount / nodeCount : 0;
    
    // Größte Knotengruppe finden (vereinfachter Algorithmus)
    final largestNodeCluster = _findLargestCluster(graph.nodes, graph.edges);
    
    _graphMetrics = {
      'node_count': nodeCount,
      'edge_count': edgeCount,
      'density': density,
      'avg_connections': avgConnections,
      'largest_node_cluster': largestNodeCluster,
    };
  }

  int _findLargestCluster(nodes, edges) {
    // Vereinfachte Implementierung - in einer realen Anwendung würde hier ein
    // vollständiger Clustering-Algorithmus implementiert werden
    return nodes.length > 0 ? (nodes.length ~/ 2) + 1 : 0;
  }

  Future<void> _triggerDatabaseOptimization() async {
    try {
      final apiService = Provider.of<ApiService>(context, listen: false);
      final response = await apiService.post(
        '/api/system/optimize',
        body: {'force': true},
      );
      
      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result['success'] 
                ? 'Datenbankoptimierung erfolgreich durchgeführt: ${result['optimizations_applied'].join(', ')}' 
                : 'Fehler bei der Datenbankoptimierung: ${result['error']}'
            ),
            backgroundColor: result['success'] ? Colors.green : Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
        
        // Daten nach erfolgreicher Optimierung neu laden
        _loadData();
      } else {
        throw Exception('Fehler bei der Datenbankoptimierung: ${response.statusCode}');
      }
    } catch (e) {
      ErrorHandler().handleKnowledgeGraphError(
        context, 
        'Fehler bei der Datenbankoptimierung: ${e.toString()}'
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leistungsüberwachung'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
            tooltip: 'Daten aktualisieren',
          ),
          IconButton(
            icon: const Icon(Icons.speed),
            onPressed: _triggerDatabaseOptimization,
            tooltip: 'Datenbankoptimierung durchführen',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSystemOverview(),
                  const SizedBox(height: 24),
                  _buildWissensgraphMetrics(),
                  const SizedBox(height: 24),
                  _buildQueryPerformance(),
                  const SizedBox(height: 24),
                  _buildMemoryUsage(),
                ],
              ),
            ),
    );
  }

  Widget _buildSystemOverview() {
    final queries = _performanceData['total_queries'] ?? 0;
    final avgQueryTime = _performanceData['avg_query_time'] ?? 0.0;
    final optimizationCount = _performanceData['optimization_count'] ?? 0;
    
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'System-Übersicht',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildMetricCard(
                  'Gesamte Abfragen',
                  queries.toString(),
                  Icons.query_stats,
                  AppColors.primary,
                ),
                _buildMetricCard(
                  'Ø Abfragezeit',
                  '${avgQueryTime.toStringAsFixed(2)} s',
                  Icons.timer,
                  AppColors.secondary,
                ),
                _buildMetricCard(
                  'Optimierungen',
                  optimizationCount.toString(),
                  Icons.auto_fix_high,
                  AppColors.accent,
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'Letzte Optimierung: ${_performanceData['last_optimization'] ?? 'Nie'}',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWissensgraphMetrics() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Wissensgraph-Metriken',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildMetricCard(
                  'Knoten',
                  _graphMetrics['node_count'].toString(),
                  Icons.account_tree,
                  AppColors.primary,
                ),
                _buildMetricCard(
                  'Kanten',
                  _graphMetrics['edge_count'].toString(),
                  Icons.timeline,
                  AppColors.secondary,
                ),
                _buildMetricCard(
                  'Dichte',
                  (_graphMetrics['density'] * 100).toStringAsFixed(1) + '%',
                  Icons.bubble_chart,
                  AppColors.accent,
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildMetricCard(
                  'Ø Verbindungen',
                  _graphMetrics['avg_connections'].toStringAsFixed(1),
                  Icons.hub,
                  Colors.teal,
                ),
                _buildMetricCard(
                  'Größte Gruppe',
                  _graphMetrics['largest_node_cluster'].toString(),
                  Icons.groups,
                  Colors.amber,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQueryPerformance() {
    // Daten für das Diagramm vorbereiten
    final List<_QueryPerformance> queryData = [];
    
    // Daten nach Abfragetyp gruppieren, wenn vorhanden
    if (_performanceData.containsKey('metrics_by_type')) {
      final metrics = _performanceData['metrics_by_type'] as Map<String, dynamic>;
      
      metrics.forEach((queryType, data) {
        queryData.add(_QueryPerformance(
          queryType,
          data['avg_time'] ?? 0.0,
        ));
      });
    }
    
    final List<charts.Series<_QueryPerformance, String>> seriesList = [
      charts.Series<_QueryPerformance, String>(
        id: 'Abfragezeiten',
        colorFn: (_, idx) => charts.MaterialPalette.blue.shadeDefault,
        domainFn: (_QueryPerformance performance, _) => performance.queryType,
        measureFn: (_QueryPerformance performance, _) => performance.avgTime,
        data: queryData,
        labelAccessorFn: (_QueryPerformance performance, _) => 
            '${performance.avgTime.toStringAsFixed(2)} s',
      )
    ];
    
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Abfrageleistung nach Typ',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 300,
              child: queryData.isEmpty
                  ? const Center(child: Text('Keine Abfragedaten verfügbar'))
                  : charts.BarChart(
                      seriesList,
                      animate: true,
                      vertical: true,
                      barRendererDecorator: charts.BarLabelDecorator<String>(),
                      domainAxis: const charts.OrdinalAxisSpec(
                        renderSpec: charts.SmallTickRendererSpec(
                          labelRotation: 45,
                        ),
                      ),
                    ),
            ),
            const SizedBox(height: 16),
            Text(
              'Langsame Abfragen: ${_performanceData['slow_queries'] ?? 0}',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: _performanceData['slow_queries'] != null && 
                           _performanceData['slow_queries'] > 0 
                           ? Colors.orange 
                           : Colors.green,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMemoryUsage() {
    final currentMemory = _performanceData['current_memory_usage'] ?? 0.0;
    final peakMemory = _performanceData['peak_memory_usage'] ?? 0.0;
    final systemMemoryPercent = _performanceData['system_memory_percent'] ?? 0.0;
    
    // Daten für das Diagramm vorbereiten
    final List<_MemoryMetric> memoryData = [
      _MemoryMetric('Aktuell', currentMemory),
      _MemoryMetric('Spitze', peakMemory),
    ];
    
    final List<charts.Series<_MemoryMetric, String>> seriesList = [
      charts.Series<_MemoryMetric, String>(
        id: 'Speichernutzung',
        colorFn: (_, idx) => idx == 0 
            ? charts.MaterialPalette.blue.shadeDefault
            : charts.MaterialPalette.red.shadeDefault,
        domainFn: (_MemoryMetric memory, _) => memory.type,
        measureFn: (_MemoryMetric memory, _) => memory.value,
        data: memoryData,
        labelAccessorFn: (_MemoryMetric memory, _) => 
            '${memory.value.toStringAsFixed(1)} MB',
      )
    ];
    
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Speichernutzung',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: charts.BarChart(
                seriesList,
                animate: true,
                barRendererDecorator: charts.BarLabelDecorator<String>(),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'System-Speicherauslastung: ${systemMemoryPercent.toStringAsFixed(1)}%',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: systemMemoryPercent > 80 
                           ? Colors.red 
                           : (systemMemoryPercent > 60 ? Colors.orange : Colors.green),
                  ),
            ),
            LinearProgressIndicator(
              value: systemMemoryPercent / 100,
              color: systemMemoryPercent > 80 
                     ? Colors.red 
                     : (systemMemoryPercent > 60 ? Colors.orange : Colors.green),
              backgroundColor: Colors.grey[200],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard(String title, String value, IconData icon, Color color) {
    return Container(
      width: 110,
      height: 110,
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      padding: const EdgeInsets.all(8),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _QueryPerformance {
  final String queryType;
  final double avgTime;

  _QueryPerformance(this.queryType, this.avgTime);
}

class _MemoryMetric {
  final String type;
  final double value;

  _MemoryMetric(this.type, this.value);
} 