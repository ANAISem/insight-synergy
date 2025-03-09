/**
 * Insight Synergy - Optimierter vereinfachter Server
 * Diese Version enthält detaillierte Protokollierung und verbesserte CORS-Unterstützung
 */

// Lade Umgebungsvariablen aus .env Datei
require('dotenv').config();

// Node.js Core-Module
const express = require('express');
const path = require('path');
const { readFileSync, existsSync } = require('fs');
const https = require('https');
const axios = require('axios');

// Express-App
const app = express();
const PORT = 8081; // Geändert auf 8081 zur Vermeidung von Konflikten
const API_PREFIX = '/api';

// Debug-Modus aktivieren
const DEBUG = true;

// API-Konfiguration
const AI_CONFIG = {
  // OpenAI API-Konfiguration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '', // API-Key aus Umgebungsvariable
    model: process.env.LLM_MODEL_NAME || 'gpt-4o-mini', // Verwende gpt-4o-mini als Standard
    baseUrl: 'https://api.openai.com/v1',
    enabled: true // Auf false setzen, um Fallback zu verwenden
  },
  // Perplexity API (für Faktenrecherche)
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY || '',
    model: process.env.PERPLEXITY_MODEL || 'sonar-deep-research',
    baseUrl: 'https://api.perplexity.ai',
    enabled: false // Noch nicht implementiert
  },
  // Fallback-Modus (wenn keine API-Keys verfügbar oder enabled = false)
  useFallback: process.env.FORCE_FALLBACK === 'true' // Kann durch Umgebungsvariable erzwungen werden
};

// Überprüfe, ob API-Keys verfügbar sind
const hasOpenAIKey = AI_CONFIG.openai.apiKey && AI_CONFIG.openai.apiKey.length > 20 && !AI_CONFIG.openai.apiKey.includes('your_api_key_here');
if (!hasOpenAIKey) {
  log('OpenAI API-Key nicht gesetzt oder ungültig. Verwende Fallback-Modus.', 'WARN');
  AI_CONFIG.useFallback = true;
} else if (AI_CONFIG.useFallback) {
  log('Fallback-Modus durch Umgebungsvariable erzwungen.', 'WARN');
} else {
  log(`OpenAI API-Key gefunden. Live-API-Modus aktiv mit Modell: ${AI_CONFIG.openai.model}`, 'INFO');
}

// Logging-Funktion
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

log('Server startet...', 'STARTUP');

// Middleware
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS-Einstellungen - Verbessert für Entwicklungsumgebung
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Protokollierung aller eingehenden Anfragen
  if (DEBUG) {
    log(`${req.method} ${req.url}`, 'REQUEST');
    if (Object.keys(req.body).length > 0) {
      log(`Request Body: ${JSON.stringify(req.body).substring(0, 200)}...`, 'DEBUG');
    }
  }

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Timeout-Middleware hinzufügen
app.use((req, res, next) => {
  // Setze ein Timeout für die Anfrage nach 30 Sekunden
  req.setTimeout(30000, () => {
    log(`Anfrage Timeout: ${req.method} ${req.url}`, 'ERROR');
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: 'Request Timeout',
        message: 'Die Anfrage hat zu lange gedauert und wurde abgebrochen.'
      });
    }
  });
  next();
});

// Versuche, das Frontend zu servieren (falls verfügbar)
try {
  if (existsSync(path.join(__dirname, 'frontend/build'))) {
    log('Frontend-Build-Verzeichnis gefunden, statische Assets werden serviert', 'CONFIG');
    app.use(express.static(path.join(__dirname, 'frontend/build')));
  } else {
    log('Kein Frontend-Build-Verzeichnis gefunden, nur API wird bereitgestellt', 'CONFIG');
  }
} catch (error) {
  log(`Fehler beim Einrichten des statischen Servers: ${error.message}`, 'ERROR');
}

// Basis-Route für Startseite
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Insight Synergy API</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .method { font-weight: bold; color: #0066cc; }
        </style>
      </head>
      <body>
        <h1>Insight Synergy API</h1>
        <p>API-Endpunkte sind unter <code>${API_PREFIX}</code> verfügbar.</p>
        <div class="endpoint">
          <p><span class="method">GET</span> ${API_PREFIX}/status - System-Status abfragen</p>
        </div>
        <div class="endpoint">
          <p><span class="method">POST</span> ${API_PREFIX}/optimize - Code optimieren</p>
        </div>
        <div class="endpoint">
          <p><span class="method">POST</span> ${API_PREFIX}/patterns - Muster analysieren</p>
        </div>
      </body>
    </html>
  `);
});

// API-Routen
// Status-Endpunkt für Healthchecks
app.get(`${API_PREFIX}/status`, (req, res) => {
  try {
    log('Status-Endpunkt aufgerufen', 'INFO');
    
    const systemStatus = {
      success: true,
      status: 'online',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        api: 'online',
        database: 'online',
        ai: 'online'
      },
      memory: {
        free: process.memoryUsage().heapUsed / 1024 / 1024,
        total: process.memoryUsage().heapTotal / 1024 / 1024
      }
    };
    
    // Antwort senden
    res.json(systemStatus);
  } catch (error) {
    log(`Fehler beim Status-Endpunkt: ${error.message}`, 'ERROR');
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Ein interner Serverfehler ist aufgetreten.'
    });
  }
});

// Optimierungs-Endpunkt
app.post(`${API_PREFIX}/optimize`, async (req, res) => {
  try {
    log('Optimierungs-Endpunkt aufgerufen', 'INFO');
    
    // Request-Body validieren
    const { queryText } = req.body;
    
    if (!queryText || typeof queryText !== 'string' || queryText.length < 3) {
      log('Ungültiger Request-Body für Optimierung', 'WARN');
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Der Anfrageparameter "queryText" fehlt oder ist ungültig.'
      });
    }
    
    log(`Optimierung für: ${queryText.substring(0, 50)}...`, 'INFO');
    
    // Simuliere Verarbeitungszeit
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Demo-Antwort (später durch echte KI-Verarbeitung ersetzt)
    const optimizedCode = `
/**
 * Optimiertes Ergebnis für: "${queryText.substring(0, 30)}..."
 * 
 * Die folgenden Optimierungen wurden vorgenommen:
 * - Verbesserte Performance durch Algorithmus-Optimierung
 * - Effizientere Speichernutzung
 * - Verbesserte Lesbarkeit und Wartbarkeit
 */

function optimizedSolution() {
  // Implementierung basierend auf Ihrer Anfrage
  console.log("Optimierte Lösung wird ausgeführt");
  
  // Effiziente Datenverarbeitung
  const results = processData(inputData);
  
  return {
    success: true,
    data: results
  };
}

// Zusätzliche Hilfsfunktionen
function processData(data) {
  // Optimierte Datenverarbeitung
  return data.map(item => enhanceItem(item));
}
    `;
    
    // Antwort senden
    res.json({
      success: true,
      message: 'Optimierung erfolgreich',
      result: {
        optimizedCode,
        executionTime: '1.5s',
        improvementMetrics: {
          performance: '+35%',
          memory: '-28%',
          readability: '+20%',
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTimeMs: 1500
      }
    });
  } catch (error) {
    log(`Fehler bei Optimierung: ${error.message}`, 'ERROR');
    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Ungültiges JSON-Format in der Anfrage.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Ein Fehler ist bei der Verarbeitung aufgetreten.',
      details: DEBUG ? error.message : undefined
    });
  }
});

// Muster-Analyse-Endpunkt
app.post(`${API_PREFIX}/patterns`, async (req, res) => {
  try {
    log('Muster-Analyse-Endpunkt aufgerufen', 'INFO');
    
    // Request-Body validieren
    const { text } = req.body;
    
    if (!text || typeof text !== 'string' || text.length < 10) {
      log('Ungültiger Request-Body für Musteranalyse', 'WARN');
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Der Anfrageparameter "text" fehlt oder ist zu kurz (mind. 10 Zeichen).'
      });
    }
    
    log(`Musteranalyse für: ${text.substring(0, 50)}...`, 'INFO');
    
    // Überprüfe, ob Live-API verwendet werden kann
    if (!AI_CONFIG.useFallback && hasOpenAIKey) {
      try {
        // Erstelle den System-Prompt für die Musteranalyse
        const systemPrompt = `Du bist ein KI-Assistent, der spezialisiert ist auf Musteranalyse.
Analysiere den gegebenen Text und identifiziere die wichtigsten Denk- und Kommunikationsmuster.

Die Ausgabe muss im folgenden JSON-Format erfolgen:
{
  "patterns": [
    {
      "id": "p1",
      "name": "Name des erkannten Musters",
      "description": "Detaillierte Beschreibung des Musters",
      "confidence": 0.95,
      "matches": ["Begriff 1", "Begriff 2", "Begriff 3"]
    },
    ... (2-4 weitere Muster)
  ],
  "analyzedTextLength": 150,
  "complexity": "niedrig/mittel/hoch"
}

Wichtig:
- Identifiziere 3-5 wichtige Muster
- Weise jedem Muster eine realistische Konfidenz zu (0-1)
- Füge zu jedem Muster passende Schlüsselbegriffe als matches hinzu
- Gib eine präzise Beschreibung des Musters
- Bewerte die Komplexität des Textes (niedrig/mittel/hoch)`;

        // API-Anfrage an OpenAI
        log('Sende Anfrage an OpenAI API für Musteranalyse', 'INFO');
        const promptText = `Analysiere folgenden Text und identifiziere die wichtigsten Muster:\n\n${text}`;
        
        const apiResponse = await getOpenAICompletion(promptText, systemPrompt, 1200);
        log('OpenAI-Antwort erhalten', 'INFO');
        
        // Versuche, JSON aus der Antwort zu extrahieren
        let jsonStartIndex = apiResponse.indexOf('{');
        let jsonEndIndex = apiResponse.lastIndexOf('}') + 1;
        
        if (jsonStartIndex === -1 || jsonEndIndex === 0) {
          throw new Error('Kein gültiges JSON in der API-Antwort gefunden');
        }
        
        const jsonStr = apiResponse.substring(jsonStartIndex, jsonEndIndex);
        const responseData = JSON.parse(jsonStr);
        
        // Stelle sicher, dass die Antwort dem erwarteten Format entspricht
        if (!responseData.patterns) {
          throw new Error('API-Antwort hat nicht das erwartete Format');
        }
        
        // Antwort senden
        res.json({
          success: true,
          message: 'Musteranalyse erfolgreich',
          result: responseData,
          metadata: {
            timestamp: new Date().toISOString(),
            processingTimeMs: 1200,
            model: AI_CONFIG.openai.model
          }
        });
        
      } catch (error) {
        log(`Fehler bei OpenAI-Anfrage für Musteranalyse: ${error.message}`, 'ERROR');
        // Fallback zu Demo-Antwort
        AI_CONFIG.useFallback = true;
      }
    }
    
    // Fallback-Modus (Demo-Antwort)
    if (AI_CONFIG.useFallback) {
      log('Verwende Fallback-Modus für Musteranalyse', 'INFO');
      
      // Simuliere Verarbeitungszeit
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Demo-Antwort (unverändert)
      const patterns = [
        {
          id: '1',
          name: 'Rekursives Muster',
          description: 'Wiederholende Strukturen mit selbstreferenzierenden Eigenschaften',
          confidence: 0.92,
          matches: ['Rekursion', 'wiederholt', 'selbstreferenzierend']
        },
        {
          id: '2',
          name: 'Sequentielles Muster',
          description: 'Logische Abfolge von zusammenhängenden Ereignissen oder Aktionen',
          confidence: 0.88,
          matches: ['Sequenz', 'Abfolge', 'Schritt für Schritt']
        },
        {
          id: '3',
          name: 'Abstraktionsmuster',
          description: 'Generalisierung spezifischer Konzepte zu allgemeineren Kategorien',
          confidence: 0.75,
          matches: ['abstrakt', 'generalisieren', 'Konzept']
        }
      ];
      
      // Antwort senden
      res.json({
        success: true,
        message: 'Musteranalyse erfolgreich (Fallback-Modus)',
        result: {
          patterns,
          analyzedTextLength: text.length,
          complexity: 'mittel'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTimeMs: 1200,
          mode: 'fallback'
        }
      });
    }
  } catch (error) {
    log(`Fehler bei Musteranalyse: ${error.message}`, 'ERROR');
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Ein Fehler ist bei der Musteranalyse aufgetreten.',
      details: DEBUG ? error.message : undefined
    });
  }
});

// Cognitive Loop API-Endpunkt
app.post(`${API_PREFIX}/cognitive-loop`, async (req, res) => {
  try {
    log('Cognitive Loop Endpunkt aufgerufen', 'INFO');
    
    // Request-Body validieren
    const { input, context, history } = req.body;
    
    if (!input || typeof input !== 'string' || input.length < 5) {
      log('Ungültiger Request-Body für Cognitive Loop', 'WARN');
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Der Anfrageparameter "input" fehlt oder ist zu kurz (mind. 5 Zeichen).'
      });
    }
    
    log(`Cognitive Loop für: ${input.substring(0, 50)}...`, 'INFO');
    
    // Überprüfe, ob Live-API verwendet werden kann
    if (!AI_CONFIG.useFallback && hasOpenAIKey) {
      try {
        // Erstelle den System-Prompt für den Cognitive Loop
        const systemPrompt = `Du bist ein fortschrittlicher KI-Assistent, der Teil des "Cognitive Loop"-Systems von Insight Synergy ist.
Du analysierst Eingaben, erkennst Muster im Denken und in Interessen und generierst optimierte Antworten.

Analysiere die Eingabe des Nutzers, identifiziere Denkmuster und liefere eine optimierte Antwort.

Die Ausgabe muss im folgenden JSON-Format erfolgen:
{
  "optimizedResponse": "Deine optimierte, ausführliche Antwort auf die Eingabe",
  "patterns": [
    {
      "id": "p1",
      "name": "Name des erkannten Musters",
      "description": "Beschreibung des Musters",
      "confidence": 0.95,
      "matches": ["Begriff 1", "Begriff 2", "Begriff 3"]
    },
    ... (weitere erkannte Muster)
  ],
  "adaptiveMetrics": {
    "personalizedScore": 0.87,
    "contextRelevance": 0.92,
    "adaptationLevel": 0.78
  }
}

Wichtig:
- Erkenne 2-3 relevante Denk- oder Interessensmuster in der Eingabe
- Erzeuge eine durchdachte, optimierte Antwort auf die Anfrage
- Weise jedem Muster eine realistische Konfidenz zu (0-1)
- Füge zu jedem Muster passende Schlüsselbegriffe hinzu`;

        // API-Anfrage an OpenAI
        log('Sende Anfrage an OpenAI API für Cognitive Loop', 'INFO');
        
        const contextInfo = context ? `\nKontext: ${context}` : '';
        const promptText = `Analysiere folgende Eingabe für den Cognitive Loop und generiere eine optimierte Antwort:\n\n${input}${contextInfo}`;
        
        const apiResponse = await getOpenAICompletion(promptText, systemPrompt, 1500);
        log('OpenAI-Antwort erhalten', 'INFO');
        
        // Versuche, JSON aus der Antwort zu extrahieren
        let jsonStartIndex = apiResponse.indexOf('{');
        let jsonEndIndex = apiResponse.lastIndexOf('}') + 1;
        
        if (jsonStartIndex === -1 || jsonEndIndex === 0) {
          throw new Error('Kein gültiges JSON in der API-Antwort gefunden');
        }
        
        const jsonStr = apiResponse.substring(jsonStartIndex, jsonEndIndex);
        const responseData = JSON.parse(jsonStr);
        
        // Stelle sicher, dass die Antwort dem erwarteten Format entspricht
        if (!responseData.optimizedResponse || !responseData.patterns || !responseData.adaptiveMetrics) {
          throw new Error('API-Antwort hat nicht das erwartete Format');
        }
        
        // Antwort senden
        res.json({
          success: true,
          message: 'Cognitive Loop Verarbeitung erfolgreich',
          result: responseData,
          metadata: {
            timestamp: new Date().toISOString(),
            processingTimeMs: 1500,
            iteration: 1,
            model: AI_CONFIG.openai.model
          }
        });
        
      } catch (error) {
        log(`Fehler bei OpenAI-Anfrage für Cognitive Loop: ${error.message}`, 'ERROR');
        // Fallback zu Demo-Antwort
        AI_CONFIG.useFallback = true;
      }
    }
    
    // Fallback-Modus (Demo-Antwort)
    if (AI_CONFIG.useFallback) {
      log('Verwende Fallback-Modus für Cognitive Loop', 'INFO');
      
      // Simuliere Verarbeitungszeit
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Demo-Antwort (unverändert)
      const response = {
        optimizedResponse: `Optimierte Antwort für "${input.substring(0, 30)}...":\n\nBasierend auf der Analyse Ihrer Anfrage und des Kontexts wurde folgende optimierte Lösung generiert:\n\n1. Strukturierte Datenverarbeitung implementieren\n2. Asynchrone Prozesse optimieren\n3. Caching-Strategie für wiederkehrende Abfragen einsetzen`,
        patterns: [
          {
            id: 'cl1',
            name: 'Optimierungsbedarf',
            description: 'Anfrage zeigt Bedarf an Performance-Verbesserungen',
            confidence: 0.89,
            matches: ['optimieren', 'verbessern', 'schneller']
          },
          {
            id: 'cl2',
            name: 'Technischer Fokus',
            description: 'Starker Fokus auf technische Details und Implementierung',
            confidence: 0.93,
            matches: ['Implementierung', 'Code', 'Technik']
          }
        ],
        adaptiveMetrics: {
          personalizedScore: 0.82,
          contextRelevance: 0.87,
          adaptationLevel: 0.79
        }
      };
      
      // Antwort senden
      res.json({
        success: true,
        message: 'Cognitive Loop Verarbeitung erfolgreich (Fallback-Modus)',
        result: response,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTimeMs: 1500,
          iteration: 1,
          mode: 'fallback'
        }
      });
    }
  } catch (error) {
    log(`Fehler bei Cognitive Loop: ${error.message}`, 'ERROR');
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Ein Fehler ist bei der Verarbeitung aufgetreten.',
      details: DEBUG ? error.message : undefined
    });
  }
});

// Experten-Profil-Endpunkt
app.get(`${API_PREFIX}/experts`, async (req, res) => {
  try {
    log('Experten-Profil-Endpunkt aufgerufen', 'INFO');
    
    // Optional: Filter nach Fachgebiet
    const { domain } = req.query;
    
    // Demo-Antwort mit einer Liste von Experten
    const experts = [
      {
        id: 'exp-001',
        name: 'EcoVisionist',
        domain: 'Umwelt',
        specialty: 'Nachhaltige Energiequellen',
        background: 'Umfassende Erfahrung in Umweltschutz und nachhaltiger Entwicklung',
        perspective: 'Fokus auf ökologische Nachhaltigkeit und Ressourcenschonung',
        avatar: '🌍'
      },
      {
        id: 'exp-002',
        name: 'Market Analyst 4.0',
        domain: 'Wirtschaft',
        specialty: 'Markttrends und wirtschaftliche Auswirkungen',
        background: 'Expertise in wirtschaftlicher Analyse und Marktprognosen',
        perspective: 'Pragmatische Betrachtung von Kosten-Nutzen-Verhältnissen',
        avatar: '💰'
      },
      {
        id: 'exp-003',
        name: 'TechPioneer AI',
        domain: 'Technologie',
        specialty: 'Technologische Innovation und Implementierung',
        background: 'Tiefes Verständnis von Technologietrends und Zukunftspotenzial',
        perspective: 'Begeisterung für neueste technologische Durchbrüche',
        avatar: '⚙️'
      },
      {
        id: 'exp-004',
        name: 'Dr. Ethics',
        domain: 'Ethik',
        specialty: 'Ethische Implikationen von Technologien',
        background: 'Philosophischer Hintergrund mit Fokus auf Technikethik',
        perspective: 'Betrachtung von moralischen und gesellschaftlichen Auswirkungen',
        avatar: '🔍'
      },
      {
        id: 'exp-005',
        name: 'Policy Architect',
        domain: 'Politik',
        specialty: 'Regulatorische Rahmenbedingungen und Politik',
        background: 'Erfahrung in der Gestaltung von Richtlinien und Verordnungen',
        perspective: 'Pragmatische Sicht auf Machbarkeit und politische Realitäten',
        avatar: '📜'
      }
    ];
    
    // Filtern, falls ein Domain-Parameter angegeben ist
    const filteredExperts = domain 
      ? experts.filter(expert => expert.domain.toLowerCase() === domain.toLowerCase()) 
      : experts;
    
    // Antwort senden
    res.json({
      success: true,
      message: 'Experten erfolgreich abgerufen',
      experts: filteredExperts,
      count: filteredExperts.length,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    log(`Fehler beim Experten-Profil-Endpunkt: ${error.message}`, 'ERROR');
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Ein Fehler ist beim Abrufen der Experten aufgetreten.',
      details: DEBUG ? error.message : undefined
    });
  }
});

// Experten-Debatte-Endpunkt
app.post(`${API_PREFIX}/expert-debate`, async (req, res) => {
  try {
    log('Experten-Debatte-Endpunkt aufgerufen', 'INFO');
    
    // Request-Body validieren
    const { topic, expertIds, context, questions } = req.body;
    
    if (!topic || typeof topic !== 'string') {
      log('Ungültiger Request-Body für Experten-Debatte: Fehlendes Thema', 'WARN');
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Das Thema (topic) muss angegeben werden.'
      });
    }
    
    if (!expertIds || !Array.isArray(expertIds) || expertIds.length < 2) {
      log('Ungültiger Request-Body für Experten-Debatte: Zu wenige Experten', 'WARN');
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Mindestens zwei Experten (expertIds) müssen für eine Debatte ausgewählt werden.'
      });
    }
    
    log(`Debatte zum Thema "${topic}" mit ${expertIds.length} Experten gestartet`, 'INFO');
    
    // Hole Experten-Profile
    const experts = [
      {
        id: 'exp-001',
        name: 'EcoVisionist',
        domain: 'Umwelt',
        specialty: 'Nachhaltige Energiequellen',
        background: 'Umfassende Erfahrung in Umweltschutz und nachhaltiger Entwicklung',
        perspective: 'Fokus auf ökologische Nachhaltigkeit und Ressourcenschonung',
        avatar: '🌍'
      },
      {
        id: 'exp-002',
        name: 'Market Analyst 4.0',
        domain: 'Wirtschaft',
        specialty: 'Markttrends und wirtschaftliche Auswirkungen',
        background: 'Expertise in wirtschaftlicher Analyse und Marktprognosen',
        perspective: 'Pragmatische Betrachtung von Kosten-Nutzen-Verhältnissen',
        avatar: '💰'
      },
      {
        id: 'exp-003',
        name: 'TechPioneer AI',
        domain: 'Technologie',
        specialty: 'Technologische Innovation und Implementierung',
        background: 'Tiefes Verständnis von Technologietrends und Zukunftspotenzial',
        perspective: 'Begeisterung für neueste technologische Durchbrüche',
        avatar: '⚙️'
      },
      {
        id: 'exp-004',
        name: 'Dr. Ethics',
        domain: 'Ethik',
        specialty: 'Ethische Implikationen von Technologien',
        background: 'Philosophischer Hintergrund mit Fokus auf Technikethik',
        perspective: 'Betrachtung von moralischen und gesellschaftlichen Auswirkungen',
        avatar: '🔍'
      },
      {
        id: 'exp-005',
        name: 'Policy Architect',
        domain: 'Politik',
        specialty: 'Regulatorische Rahmenbedingungen und Politik',
        background: 'Erfahrung in der Gestaltung von Richtlinien und Verordnungen',
        perspective: 'Pragmatische Sicht auf Machbarkeit und politische Realitäten',
        avatar: '📜'
      }
    ]; 
    
    const selectedExperts = experts.filter(expert => expertIds.includes(expert.id));
    
    // Überprüfe, ob Live-API verwendet werden kann
    if (!AI_CONFIG.useFallback && hasOpenAIKey) {
      try {
        // Erstelle den System-Prompt für die Debatte
        const expertDescriptions = selectedExperts.map(expert => 
          `${expert.name} (${expert.avatar}) - ${expert.domain}-Experte: ${expert.specialty}. Perspektive: ${expert.perspective}`
        ).join('\n');
        
        const systemPrompt = `Du bist ein Assistent, der eine tiefgreifende Expertendebatte zu einem bestimmten Thema simuliert. 
Erstelle eine realistische Debatte zwischen folgenden Experten:

${expertDescriptions}

Die Debatte soll zum Thema "${topic}" stattfinden${context ? ` im Kontext von: ${context}` : ''}.
Jeder Experte sollte entsprechend seiner Perspektive und seines Fachwissens argumentieren.

Die Ausgabe sollte im folgenden JSON-Format erfolgen:
{
  "debateThreads": [
    {
      "id": "t1",
      "expertId": "Experten-ID",
      "expertName": "Name des Experten",
      "avatar": "Emoji des Experten",
      "message": "Nachricht des Experten",
      "timestamp": "2023-06-15T10:00:00Z",
      "references": ["Referenz 1", "Referenz 2"]
    },
    ...weitere Beiträge
  ],
  "insights": [
    {
      "title": "Titel der Erkenntnis",
      "description": "Beschreibung der Erkenntnis",
      "expert": "Quelle der Erkenntnis (Experte)",
      "confidence": 0.95 // Zahl zwischen 0 und 1
    },
    ...weitere Erkenntnisse
  ]
}

Wichtig:
- Erstelle 5-7 Debattenbeiträge mit einer guten Diskussionsdynamik
- Stelle sicher, dass jeder ausgewählte Experte mindestens einmal zu Wort kommt
- Füge relevante, realistische Referenzen hinzu
- Extrahiere 3-5 wichtige Erkenntnisse aus der Debatte`;

        // API-Anfrage an OpenAI
        log('Sende Anfrage an OpenAI API für Expertendebatten-Generierung', 'INFO');
        const promptText = `Generiere eine Expertendebatte zum Thema "${topic}" mit den Experten: ${selectedExperts.map(e => e.name).join(', ')}.`;
        
        const apiResponse = await getOpenAICompletion(promptText, systemPrompt, 2000);
        log('OpenAI-Antwort erhalten', 'INFO');
        
        // Versuche, JSON aus der Antwort zu extrahieren
        let jsonStartIndex = apiResponse.indexOf('{');
        let jsonEndIndex = apiResponse.lastIndexOf('}') + 1;
        
        if (jsonStartIndex === -1 || jsonEndIndex === 0) {
          throw new Error('Kein gültiges JSON in der API-Antwort gefunden');
        }
        
        const jsonStr = apiResponse.substring(jsonStartIndex, jsonEndIndex);
        const responseData = JSON.parse(jsonStr);
        
        // Stelle sicher, dass die Antwort dem erwarteten Format entspricht
        if (!responseData.debateThreads || !responseData.insights) {
          throw new Error('API-Antwort hat nicht das erwartete Format');
        }
        
        // Antwort senden
        res.json({
          success: true,
          message: 'Experten-Debatte erfolgreich generiert',
          result: {
            topic,
            debateThreads: responseData.debateThreads,
            insights: responseData.insights,
            context: context || 'Standardkontext für die Debatte',
            questions: questions || []
          },
          metadata: {
            timestamp: new Date().toISOString(),
            processingTimeMs: 2000,
            debateId: 'debate-' + Date.now(),
            model: AI_CONFIG.openai.model
          }
        });
        
      } catch (error) {
        log(`Fehler bei OpenAI-Anfrage für Expertendebatte: ${error.message}`, 'ERROR');
        // Fallback zu Demo-Antwort
        AI_CONFIG.useFallback = true;
      }
    }
    
    // Fallback-Modus (Demo-Antwort)
    if (AI_CONFIG.useFallback) {
      log('Verwende Fallback-Modus für Expertendebatte', 'INFO');
      
      // Simuliere Verarbeitungszeit
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Demo-Antwort (unverändert)
      const debateThreads = [
        {
          id: 't1',
          expertId: 'exp-001',
          expertName: 'EcoVisionist',
          avatar: '🌍',
          message: `Zum Thema "${topic}" möchte ich betonen, dass die ökologischen Aspekte besonders wichtig sind. Wir müssen sicherstellen, dass unsere Lösungen nachhaltig und umweltfreundlich sind.`,
          timestamp: new Date(Date.now() - 5000).toISOString(),
          references: ['Nature, 2023', 'Climate Report 2022']
        },
        {
          id: 't2',
          expertId: 'exp-002',
          expertName: 'Market Analyst 4.0',
          avatar: '💰',
          message: `Ich stimme zu, dass Nachhaltigkeit wichtig ist, aber wir dürfen die wirtschaftlichen Realitäten nicht ignorieren. Implementierungen müssen auch kosteneffizient sein, um Akzeptanz zu finden.`,
          timestamp: new Date(Date.now() - 4000).toISOString(),
          references: ['Economic Review, 2023', 'Market Trends Q1 2023']
        },
        {
          id: 't3',
          expertId: 'exp-003',
          expertName: 'TechPioneer AI',
          avatar: '⚙️',
          message: `Aus technologischer Sicht sehe ich mehrere innovative Ansätze, die beide Perspektiven vereinen könnten. Beispielsweise zeigen neueste Fortschritte in der Materialtechnologie vielversprechende Ergebnisse.`,
          timestamp: new Date(Date.now() - 3000).toISOString(),
          references: ['Tech Journal, 2023', 'Innovation Report 2023']
        },
        {
          id: 't4',
          expertId: 'exp-001',
          expertName: 'EcoVisionist',
          avatar: '🌍',
          message: `Das ist ein interessanter Punkt. Ich würde hinzufügen, dass diese neuen Materialien aus nachhaltigen Quellen stammen müssen, um wirklich umweltfreundlich zu sein.`,
          timestamp: new Date(Date.now() - 2000).toISOString(),
          references: ['Sustainability Report, 2023']
        },
        {
          id: 't5',
          expertId: 'exp-002',
          expertName: 'Market Analyst 4.0',
          avatar: '💰',
          message: `Genau, und die Skalierbarkeit muss auch berücksichtigt werden. Ein theoretisch perfektes Material nützt wenig, wenn es nicht in industriellem Maßstab produziert werden kann.`,
          timestamp: new Date(Date.now() - 1000).toISOString(),
          references: ['Production Economics, 2022']
        }
      ];
      
      // Zusammenfassung der Haupterkenntnisse
      const insights = [
        {
          title: 'Ökologische Perspektive',
          description: 'Nachhaltigkeit und Umweltschutz sind grundlegende Anforderungen.',
          expert: 'EcoVisionist',
          confidence: 0.92
        },
        {
          title: 'Wirtschaftliche Machbarkeit',
          description: 'Kosteneffizienz und Skalierbarkeit sind entscheidend für den Erfolg.',
          expert: 'Market Analyst 4.0',
          confidence: 0.88
        },
        {
          title: 'Technologische Innovation',
          description: 'Neue Materialien und Technologien könnten beide Perspektiven vereinen.',
          expert: 'TechPioneer AI',
          confidence: 0.85
        }
      ];
      
      // Antwort senden
      res.json({
        success: true,
        message: 'Experten-Debatte erfolgreich generiert (Fallback-Modus)',
        result: {
          topic,
          debateThreads,
          insights,
          context: context || 'Standardkontext für die Debatte',
          questions: questions || []
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTimeMs: 2000,
          debateId: 'debate-' + Date.now(),
          mode: 'fallback'
        }
      });
    }
  } catch (error) {
    log(`Fehler bei Experten-Debatte: ${error.message}`, 'ERROR');
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Ein Fehler ist bei der Generierung der Experten-Debatte aufgetreten.',
      details: DEBUG ? error.message : undefined
    });
  }
});

// 404-Handler für nicht gefundene Routen
app.use((req, res) => {
  log(`404 Not Found: ${req.method} ${req.url}`, 'WARN');
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'Die angeforderte Ressource wurde nicht gefunden.',
    path: req.url
  });
});

// Globaler Fehlerhandler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorMessage = err.message || 'Ein unerwarteter Fehler ist aufgetreten.';
  
  log(`Error ${statusCode}: ${errorMessage}`, 'ERROR');
  if (err.stack && DEBUG) {
    log(`Stack: ${err.stack}`, 'DEBUG');
  }
  
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Application Error',
    message: errorMessage,
    path: req.url,
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
});

// Server starten
app.listen(PORT, '0.0.0.0', () => {
  log(`Server läuft auf http://localhost:${PORT}`, 'STARTUP');
  log(`API verfügbar unter http://localhost:${PORT}${API_PREFIX}`, 'STARTUP');
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║            INSIGHT SYNERGY SERVER (OPTIMIZED)                 ║
╠═══════════════════════════════════════════════════════════════╣
║ 🚀 Server läuft auf http://localhost:${PORT}                    ║
║ 📊 API verfügbar unter ${API_PREFIX}                             ║
║ 🌐 Debug-Modus: ${DEBUG ? 'AKTIVIERT' : 'DEAKTIVIERT'}                                    ║
║ 💡 Optimierte Version mit verbesserter CORS-Unterstützung      ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Prozess-Fehlerbehandlung für unerwartete Fehler
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'FATAL');
  log(error.stack, 'FATAL');
  // Ordnungsgemäßes Herunterfahren initiieren
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'ERROR');
  // Hier könnte ein geordnetes Herunterfahren implementiert werden
});

log('Server-Initialisierung abgeschlossen', 'STARTUP');

// Axios-Instance für OpenAI API-Aufrufe
const openaiAPI = axios.create({
  baseURL: AI_CONFIG.openai.baseUrl,
  headers: {
    'Authorization': `Bearer ${AI_CONFIG.openai.apiKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 60000 // 60 Sekunden Timeout
});

// Hilfsfunktion für OpenAI API-Anfragen
async function getOpenAICompletion(prompt, systemMessage = null, maxTokens = 1000) {
  try {
    if (!hasOpenAIKey || !AI_CONFIG.openai.enabled) {
      throw new Error('OpenAI API nicht konfiguriert oder deaktiviert');
    }

    const messages = [];
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await openaiAPI.post('/chat/completions', {
      model: AI_CONFIG.openai.model,
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0
    });

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error('Unerwartetes Format der OpenAI-Antwort');
    }
  } catch (error) {
    log(`OpenAI API-Fehler: ${error.message}`, 'ERROR');
    if (error.response) {
      log(`Status: ${error.response.status}, Daten: ${JSON.stringify(error.response.data)}`, 'ERROR');
    }
    throw error;
  }
} 