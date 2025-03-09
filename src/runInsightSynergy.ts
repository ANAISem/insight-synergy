import { InsightSynergyCore } from './core/InsightSynergyCore';
import { SystemEvent, EventType, EventPriority } from './types/events';
import { SystemMetrics } from './types/metrics';

// Erstelle eine Instanz des Insight Synergy Core Systems
const insightCore = new InsightSynergyCore({
  debugLevel: 'medium',
  autoFix: true,
  adaptiveMode: true
});

// Event-Listener für System-Events
insightCore.on('system-started', () => {
  console.log('🚀 Insight Synergy Core System wurde erfolgreich gestartet');
  console.log('-----------------------------------------------------------');
  console.log('Das System sammelt und analysiert jetzt Daten in Echtzeit.');
  console.log('Optimierung und Debugging erfolgen automatisch.');
  console.log('-----------------------------------------------------------');
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

// Starte das System
async function startSystem() {
  try {
    await insightCore.start();
    
    // Simuliere einige System-Events und -Metriken
    simulateData();
    
    console.log('\n📊 System-Status kann mit `getStatus()` abgerufen werden');
    console.log('⚙️ Manuelle Optimierung kann mit `optimize()` ausgelöst werden');
    console.log('🛑 System kann mit `stop()` gestoppt werden\n');
    
    // Füge globale Funktionen für einfache Interaktion hinzu
    (global as any).insightCore = insightCore;
    (global as any).getStatus = getSystemStatus;
    (global as any).optimize = forceOptimization;
    (global as any).stop = stopSystem;
    
  } catch (error) {
    console.error('Fehler beim Starten des Systems:', error);
  }
}

async function getSystemStatus() {
  const status = await insightCore.getSystemStatus();
  console.log('\n📊 Aktueller System-Status:');
  console.log('---------------------------');
  console.log(`Aktiv: ${status.isActive ? 'Ja' : 'Nein'}`);
  console.log(`Debug-Level: ${status.config.debugLevel}`);
  console.log(`Auto-Fix: ${status.config.autoFix ? 'Aktiviert' : 'Deaktiviert'}`);
  console.log(`Adaptiver Modus: ${status.config.adaptiveMode ? 'Aktiviert' : 'Deaktiviert'}`);
  console.log(`Performance-Score: ${status.cognitiveCore.metrics.performance.toFixed(2)}`);
  console.log(`System-Gesundheit: ${status.cognitiveCore.metrics.systemHealth.toFixed(2)}`);
  console.log(`Erkannte Muster: ${status.cognitiveCore.patterns.length}`);
  console.log(`Registrierte Komponenten: ${status.integrationLayer.componentCount}`);
  return status;
}

async function forceOptimization() {
  console.log('🔄 Manuelle Optimierung wird gestartet...');
  try {
    const result = await insightCore.forceOptimization();
    console.log('✅ Optimierung abgeschlossen!');
    console.log(`📈 Neuer Performance-Score: ${result.performance.toFixed(2)}`);
    console.log(`🔋 System-Gesundheit: ${result.systemHealth.toFixed(2)}`);
    return result;
  } catch (error) {
    console.error('❌ Fehler bei der Optimierung:', error);
    return null;
  }
}

async function stopSystem() {
  console.log('🛑 Stoppe Insight Synergy System...');
  try {
    await insightCore.stop();
    console.log('✅ System erfolgreich gestoppt.');
  } catch (error) {
    console.error('❌ Fehler beim Stoppen des Systems:', error);
  }
}

// Simuliert regelmäßige Daten für das Demo-System
function simulateData() {
  // Generiere zufällige Metriken in regelmäßigen Abständen
  setInterval(async () => {
    try {
      const metrics: SystemMetrics = {
        timestamp: Date.now(),
        cpuUsage: Math.random() * 80 + 10,
        memoryUsage: Math.random() * 70 + 20,
        responseTime: Math.random() * 200 + 50,
        errorRate: Math.random() * 5,
        activeConnections: Math.floor(Math.random() * 100),
        throughput: Math.floor(Math.random() * 1000)
      };

      await insightCore.processMetrics(metrics);
    } catch (error) {
      console.error('Fehler bei der Metrikverarbeitung:', error);
    }
  }, 5000);

  // Generiere zufällige Events in regelmäßigen Abständen
  setInterval(async () => {
    try {
      const eventTypes = [
        EventType.INFO,
        EventType.WARNING,
        EventType.ERROR,
        EventType.DEBUG,
        EventType.SYSTEM,
        EventType.USER
      ];
      const randomIndex = Math.floor(Math.random() * eventTypes.length);
      const eventType = eventTypes[randomIndex];

      const event: SystemEvent = {
        id: `event-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: Date.now(),
        type: eventType,
        source: 'simulator',
        data: { value: Math.random() },
        priority: Math.floor(Math.random() * 4) as EventPriority,
        message: `Simuliertes Ereignis vom Typ ${eventType}`
      };

      await insightCore.processEvent(event);
    } catch (error) {
      console.error('Fehler bei der Eventverarbeitung:', error);
    }
  }, 8000);

  // Simuliere ab und zu eine Systemalert
  setInterval(async () => {
    try {
      const metrics: SystemMetrics = {
        timestamp: Date.now(),
        cpuUsage: 95, // Hohe CPU-Auslastung
        memoryUsage: 90, // Hoher Speicherverbrauch
        responseTime: 800, // Langsame Reaktionszeit
        errorRate: 15, // Erhöhte Fehlerrate
        activeConnections: 200,
        throughput: 500
      };

      const event: SystemEvent = {
        id: `alert-${Date.now()}`,
        timestamp: Date.now(),
        type: EventType.SYSTEM,
        source: 'monitoring',
        data: { level: 'critical', metrics },
        priority: EventPriority.CRITICAL,
        message: "Systemalert: Hohe Ressourcenauslastung"
      };

      await insightCore.processMetrics(metrics);
      await insightCore.processEvent(event);
    } catch (error) {
      console.error('Fehler bei der Alertsimulation:', error);
    }
  }, 15000);
}

// Starte das System
startSystem().catch(console.error); 