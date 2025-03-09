const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Express App konfigurieren
const app = express();
const PORT = 3000;

// Middleware einrichten
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Einfache API-Endpunkte
app.get('/', (req, res) => {
  // Wenn ein HTML-Request über den Browser kommt, sende das Dashboard
  if(req.headers.accept && req.headers.accept.includes('text/html')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    // Ansonsten sende JSON für API-Clients
    res.json({
      status: 'Insight Synergy läuft im Minimalmodus',
      message: 'Willkommen bei Insight Synergy! Die Anwendung wurde erfolgreich gestartet.'
    });
  }
});

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    mode: 'minimized',
    timestamp: new Date(),
    version: '1.0.0',
    config: {
      debugLevel: 'medium',
      autoFix: true,
      adaptiveMode: true,
      optimizationThreshold: 0.7
    },
    cognitiveCore: {
      metrics: {
        performance: Math.random() * 20 + 65,
        adaptationRate: Math.random() * 15 + 70,
        systemHealth: Math.random() * 25 + 60,
        optimizationPotential: Math.random() * 40 + 30,
        overallScore: Math.random() * 20 + 70,
        cpuUsage: Math.random() * 30 + 40,
        memoryUsage: Math.random() * 25 + 50
      },
      patterns: [
        {
          name: 'Ereignis-Korrelationsmuster',
          description: 'Korrelation zwischen Systemlast und Fehlerraten erkannt',
          confidence: 0.85
        }
      ]
    },
    integrationLayer: {
      componentCount: 3
    }
  });
});

app.post('/events', (req, res) => {
  console.log('Event empfangen:', req.body);
  res.json({ success: true, received: req.body });
});

app.post('/optimize', (req, res) => {
  console.log('Optimierung angefordert');
  // Simuliere kurze Verarbeitungszeit
  setTimeout(() => {
    res.json({
      success: true,
      performance: Math.random() * 10 + 80,
      systemHealth: Math.random() * 15 + 75,
      message: 'Optimierung erfolgreich abgeschlossen'
    });
  }, 1000);
});

app.post('/debug', (req, res) => {
  console.log('Debug-Analyse angefordert');
  // Simuliere kurze Verarbeitungszeit
  setTimeout(() => {
    res.json({
      success: true,
      findings: [],
      message: 'Debug-Analyse erfolgreich abgeschlossen'
    });
  }, 800);
});

// Server starten
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                INSIGHT SYNERGY SERVER (MINIMAL)               ║
╠═══════════════════════════════════════════════════════════════╣
║ 🚀 Server läuft auf http://localhost:${PORT}                    ║
║ 🧠 Insight Synergy Core im Minimalmodus                        ║
║ 🌐 Dashboard verfügbar unter http://localhost:${PORT}           ║
╚═══════════════════════════════════════════════════════════════╝
  `);
}); 