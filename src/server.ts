import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import responseTime from 'response-time';
import path from 'path';
import { InsightSynergyCore } from './core/InsightSynergyCore';
import { SystemEvent } from './types/events';
import { SystemMetrics } from './types/metrics';
import { createHealthRouter } from './api/health';
import { createMetricsRouter } from './api/metrics';
import { startMetricsCollection, insightSynergyHttpRequests, insightSynergyHttpErrors } from './monitorMetrics';

// Lade .env Konfiguration
dotenv.config();

// Express App konfigurieren
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware einrichten
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from 'public' directory

// Response-Time Middleware für Performance-Monitoring
app.use(responseTime((_req, res, _time) => {
  // Zähle Anfragen
  insightSynergyHttpRequests.inc(1);
  
  // Zähle Fehler
  if (res.statusCode >= 400) {
    insightSynergyHttpErrors.inc(1);
  }
}));

// Insight Synergy Core initialisieren
const insightCore = new InsightSynergyCore({
  debugLevel: process.env.DEBUG === 'true' ? 'high' : 'medium',
  autoFix: true,
  adaptiveMode: true
});

// Metrik-Sammlung starten
startMetricsCollection();

// Globale API-Route Präfix
const API_PREFIX = process.env.API_PREFIX || '/api';

// Health und Metrics API-Endpunkte einrichten
app.use(`${API_PREFIX}/health`, createHealthRouter(insightCore));
app.use(`${API_PREFIX}/metrics`, createMetricsRouter(insightCore));
app.use('/metrics', createMetricsRouter(insightCore)); // Prometheus konventioneller Pfad

// Haupt-Dashboard-Route
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API-Endpunkte
app.get(`${API_PREFIX}/status`, async (_req, res) => {
  try {
    const status = await insightCore.getSystemStatus();
    res.json(status);
  } catch (error) {
    console.error('Fehler beim Abrufen des Status:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.post(`${API_PREFIX}/optimize`, async (_req, res) => {
  try {
    const result = await insightCore.forceOptimization();
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Fehler bei der Optimierung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.post(`${API_PREFIX}/metrics`, async (req, res) => {
  try {
    const metrics: SystemMetrics = {
      ...req.body,
      priority: req.body.priority || 1,
      message: req.body.message || 'Metrics collected'
    };
    await insightCore.processMetrics(metrics);
    res.json({ success: true });
  } catch (error) {
    console.error('Fehler bei der Metrikverarbeitung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.post(`${API_PREFIX}/events`, async (req, res) => {
  try {
    const event: SystemEvent = {
      ...req.body,
      priority: req.body.priority || 1,
      message: req.body.message || 'Event processed'
    };
    await insightCore.processEvent(event);
    res.json({ success: true });
  } catch (error) {
    console.error('Fehler bei der Eventverarbeitung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.post(`${API_PREFIX}/config`, async (req, res) => {
  try {
    const config = req.body;
    await insightCore.updateConfig(config);
    res.json({ success: true, config });
  } catch (error) {
    console.error('Fehler bei der Konfigurationsänderung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.post(`${API_PREFIX}/debug`, async (_req, res) => {
  try {
    await insightCore.forceDebugAnalysis();
    res.json({ success: true });
  } catch (error) {
    console.error('Fehler bei der Debug-Analyse:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Ereignishandler für Core-Events registrieren
insightCore.on('system-started', () => {
  console.log('🚀 Insight Synergy Core System wurde erfolgreich gestartet');
});

insightCore.on('pattern-detected', (pattern) => {
  console.log('🔎 Neues Muster erkannt:', pattern.name || 'Unbenanntes Muster');
});

insightCore.on('anomaly-detected', (anomaly) => {
  console.log('⚠️ Anomalie entdeckt:', anomaly?.data?.message || 'Unbekannte Anomalie');
});

insightCore.on('auto-fix-applied', (fixData) => {
  console.log('🔧 Automatische Korrektur angewendet:', 
    fixData.fix?.description || 'Keine Beschreibung verfügbar');
});

insightCore.on('error', (error) => {
  console.error('❌ System-Fehler:', error.message);
});

// Server starten
async function startServer() {
  try {
    // Starte zuerst das Insight Synergy Core System
    await insightCore.start();
    
    // Stelle sicher, dass PORT eine Nummer ist
    const portNumber = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
    
    // Starte dann den Express-Server auf allen Schnittstellen (0.0.0.0)
    app.listen(portNumber, '0.0.0.0', () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                INSIGHT SYNERGY SERVER                         ║
╠═══════════════════════════════════════════════════════════════╣
║ 🚀 Server läuft auf http://localhost:${portNumber}               ║
║ 📊 API verfügbar unter ${API_PREFIX}                             ║
║ 🧠 Insight Synergy Core System ist aktiv                       ║
║ 🌐 Dashboard verfügbar unter http://localhost:${portNumber}       ║
║ 🔍 Debug-Level: ${process.env.DEBUG === 'true' ? 'HIGH' : 'MEDIUM'}                                    ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Fehler beim Starten des Servers:', error);
    process.exit(1);
  }
}

// Starte den Server
startServer(); 