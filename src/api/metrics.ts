import { Router } from 'express';
import { performance } from 'perf_hooks';
import os from 'os';
import { InsightSynergyCore } from '../core/InsightSynergyCore';

// Startzeit der Anwendung für Uptime-Berechnung
const startTime = performance.now();

// Counter für API-Anfragen
let totalRequests = 0;
let errorRequests = 0;

// Letzter bekannter Speicherverbrauch
let lastMemoryUsage = process.memoryUsage();

export function createMetricsRouter(insightCore: InsightSynergyCore): Router {
  const router = Router();

  // Middleware zum Zählen von Anfragen
  router.use((_req, res, next) => {
    totalRequests++;
    
    // Ursprüngliche Funktion für das Ende einer Antwort speichern
    const originalEnd = res.end;
    
    // Methode überschreiben, um Fehleranfragen zu zählen
    res.end = function(...args: any[]) {
      if (res.statusCode >= 400) {
        errorRequests++;
      }
      // Explizites Casting für die typensichere Anwendung von args
      originalEnd.apply(res, args as [any, any, any]);
    } as any;
    
    next();
  });

  /**
   * @route GET /api/metrics
   * @description Prometheus Metrics Endpoint
   * @returns {String} Prometheus formatted metrics
   */
  router.get('/', async (_req, res) => {
    try {
      // Aktuelle Systemmetriken aktualisieren
      lastMemoryUsage = process.memoryUsage();
      
      // System-Status vom Insight Synergy Core - nur wenn benötigt
      // const coreStatus = await insightCore.getSystemStatus();
      const moduleMetrics = insightCore.getMetrics ? await insightCore.getMetrics() : {};
      
      // Beginn der Prometheus-Metrikausgabe
      let output = '';
      
      // Format-Funktion für Prometheus-Metriken
      const addMetric = (name: string, value: number, help: string, type: string, labels: Record<string, string> = {}) => {
        const labelString = Object.entries(labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        
        output += `# HELP ${name} ${help}\n`;
        output += `# TYPE ${name} ${type}\n`;
        output += `${name}${labelString ? `{${labelString}}` : ''} ${value}\n`;
      };
      
      // System-Uptime
      addMetric(
        'insight_synergy_uptime_seconds',
        (performance.now() - startTime) / 1000,
        'System uptime in seconds',
        'gauge'
      );
      
      // Anzahl der CPU-Kerne
      addMetric(
        'insight_synergy_cpu_cores',
        os.cpus().length,
        'Number of CPU cores',
        'gauge'
      );
      
      // CPU-Last (1, 5, 15 Minuten)
      const loadAvg = os.loadavg();
      addMetric(
        'insight_synergy_load_average',
        loadAvg[0],
        'System load average',
        'gauge',
        { period: '1min' }
      );
      addMetric(
        'insight_synergy_load_average',
        loadAvg[1],
        'System load average',
        'gauge',
        { period: '5min' }
      );
      addMetric(
        'insight_synergy_load_average',
        loadAvg[2],
        'System load average',
        'gauge',
        { period: '15min' }
      );
      
      // Speichernutzung
      addMetric(
        'insight_synergy_memory_usage_bytes',
        lastMemoryUsage.rss,
        'Memory usage in bytes',
        'gauge',
        { type: 'rss' }
      );
      addMetric(
        'insight_synergy_memory_usage_bytes',
        lastMemoryUsage.heapTotal,
        'Memory usage in bytes',
        'gauge',
        { type: 'heapTotal' }
      );
      addMetric(
        'insight_synergy_memory_usage_bytes',
        lastMemoryUsage.heapUsed,
        'Memory usage in bytes',
        'gauge',
        { type: 'heapUsed' }
      );
      addMetric(
        'insight_synergy_memory_usage_bytes',
        lastMemoryUsage.external,
        'Memory usage in bytes',
        'gauge',
        { type: 'external' }
      );
      
      // API-Anfragen
      addMetric(
        'insight_synergy_http_requests_total',
        totalRequests,
        'Total number of HTTP requests',
        'counter'
      );
      addMetric(
        'insight_synergy_http_errors_total',
        errorRequests,
        'Total number of HTTP error responses',
        'counter'
      );
      
      // Insight Synergy Core Metrics, falls verfügbar
      if (moduleMetrics) {
        // Verarbeite jede Metrik aus dem Core
        Object.entries(moduleMetrics).forEach(([key, value]) => {
          if (typeof value === 'number') {
            const metricName = `insight_synergy_core_${key}`
              .replace(/[^a-zA-Z0-9_]/g, '_')
              .toLowerCase();
            
            addMetric(
              metricName,
              value,
              `Insight Synergy Core metric: ${key}`,
              'gauge'
            );
          }
        });
      }
      
      // Antwort mit Prometheus-formatierten Metriken senden
      res.header('Content-Type', 'text/plain; version=0.0.4');
      res.status(200).send(output);
    } catch (error) {
      console.error('Fehler beim Generieren der Prometheus-Metriken:', error);
      res.status(500).send('# Fehler beim Generieren der Metriken');
    }
  });

  return router;
} 