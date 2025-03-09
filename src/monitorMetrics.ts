/**
 * Insight Synergy - Metriken-Monitoring-Tool
 * 
 * Dieses Tool sammelt und exportiert Systemmetriken für das Monitoring.
 * Es kann als eigenständiger Prozess ausgeführt werden oder zusammen mit dem Hauptserver.
 */

import * as client from 'prom-client';
import { performance } from 'perf_hooks';
import * as os from 'os';
import { InsightSynergyCore } from './core/InsightSynergyCore';

// Startzeit für Uptime-Berechnung
const startTime = performance.now();

// Metrik-Registry erstellen
const register = new client.Registry();

// Standardmetriken aktivieren (CPU, Memory, Event Loop, ...)
client.collectDefaultMetrics({ register });

// Benutzerdefinierte Metriken definieren
const insightSynergyUptime = new client.Gauge({
  name: 'insight_synergy_uptime_seconds',
  help: 'Zeit seit dem Start des Insight Synergy Systems in Sekunden',
  registers: [register]
});

const insightSynergyCpuCores = new client.Gauge({
  name: 'insight_synergy_cpu_cores',
  help: 'Anzahl der verfügbaren CPU-Kerne',
  registers: [register]
});

const insightSynergyLoadAverage = new client.Gauge({
  name: 'insight_synergy_load_average',
  help: 'System-Load-Average',
  labelNames: ['period'],
  registers: [register]
});

const insightSynergyMemoryUsage = new client.Gauge({
  name: 'insight_synergy_memory_usage_bytes',
  help: 'Speichernutzung des Insight Synergy Systems in Bytes',
  labelNames: ['type'],
  registers: [register]
});

const insightSynergyHttpRequests = new client.Counter({
  name: 'insight_synergy_http_requests_total',
  help: 'Gesamtzahl der HTTP-Anfragen',
  registers: [register]
});

const insightSynergyHttpErrors = new client.Counter({
  name: 'insight_synergy_http_errors_total',
  help: 'Gesamtzahl der HTTP-Fehlerantworten',
  registers: [register]
});

const insightSynergyModuleStatus = new client.Gauge({
  name: 'insight_synergy_module_status',
  help: 'Status der verschiedenen Insight Synergy Module',
  labelNames: ['module', 'status'],
  registers: [register]
});

const insightSynergyOptimizationScore = new client.Gauge({
  name: 'insight_synergy_optimization_score',
  help: 'Optimierungsbewertung des Systems (0-1)',
  registers: [register]
});

// Insight Synergy Core initialisieren (falls nicht als eigenständiges Modul ausgeführt)
const insightCore = new InsightSynergyCore({
  debugLevel: process.env.DEBUG === 'true' ? 'high' : 'medium',
  autoFix: false,
  adaptiveMode: true
});

/**
 * Aktualisiert die Metriken für das Prometheus-Monitoring
 */
async function updateMetrics(): Promise<void> {
  try {
    // Uptime aktualisieren
    insightSynergyUptime.set((performance.now() - startTime) / 1000);
    
    // CPU-Kern-Anzahl setzen (ändert sich normalerweise nicht)
    insightSynergyCpuCores.set(os.cpus().length);
    
    // System-Load-Average aktualisieren
    const loadAvg = os.loadavg();
    insightSynergyLoadAverage.labels('1min').set(loadAvg[0]);
    insightSynergyLoadAverage.labels('5min').set(loadAvg[1]);
    insightSynergyLoadAverage.labels('15min').set(loadAvg[2]);
    
    // Speichernutzung aktualisieren
    const memoryUsage = process.memoryUsage();
    insightSynergyMemoryUsage.labels('rss').set(memoryUsage.rss);
    insightSynergyMemoryUsage.labels('heapTotal').set(memoryUsage.heapTotal);
    insightSynergyMemoryUsage.labels('heapUsed').set(memoryUsage.heapUsed);
    insightSynergyMemoryUsage.labels('external').set(memoryUsage.external);
    
    // Insight Synergy spezifische Metriken aktualisieren
    try {
      const systemStatus = await insightCore.getSystemStatus();
      
      // Module-Status aktualisieren
      if (systemStatus.modules) {
        Object.entries(systemStatus.modules).forEach(([module, status]) => {
          if (typeof status === 'object' && status !== null && 'status' in status) {
            insightSynergyModuleStatus.labels(module, String(status.status)).set(1);
          }
        });
      }
      
      // Optimierungsbewertung aktualisieren
      if (systemStatus.optimizationScore !== undefined) {
        insightSynergyOptimizationScore.set(systemStatus.optimizationScore);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Insight Synergy Metriken:', error);
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Metriken:', error);
  }
}

/**
 * Startet das Metriken-Update-Intervall und gibt die Prometheus-Registry zurück
 */
export function startMetricsCollection(intervalMs: number = 5000): client.Registry {
  // Initialen Metriken-Update durchführen
  updateMetrics();
  
  // Intervall für Metriken-Updates einrichten
  setInterval(updateMetrics, intervalMs);
  
  return register;
}

/**
 * Wenn direkt ausgeführt, aktualisiert dieses Skript regelmäßig die Metriken
 * und gibt sie auf der Konsole aus
 */
if (require.main === module) {
  console.log('Insight Synergy Metriken-Monitoring gestartet');
  console.log('Aktualisiere Metriken alle 5 Sekunden...\n');
  
  const register = startMetricsCollection(5000);
  
  // Alle 10 Sekunden aktuelle Metriken auf der Konsole ausgeben
  setInterval(async () => {
    console.clear();
    console.log('Insight Synergy Metriken-Monitoring\n');
    console.log('Zeit seit Start:', ((performance.now() - startTime) / 1000).toFixed(2), 'Sekunden');
    console.log('Metriken:');
    
    try {
      const metrics = await register.metrics();
      console.log(metrics);
    } catch (error) {
      console.error('Fehler beim Abrufen der Metriken:', error);
    }
  }, 10000);
}

// Registry und Funktionen exportieren
export { register, updateMetrics, insightSynergyHttpRequests, insightSynergyHttpErrors }; 