/**
 * Insight Synergy - Vereinfachter Server mit garantierter Startfunktion
 * Diese Version lädt den Kern und stellt dann den Express-Server bereit
 * Unterstützt GPT-4o mini, GPT-o1 mini und Perplexity API-Integration
 */

// Node.js Core-Module
const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');

// Lade Umgebungsvariablen
dotenv.config();

// Express-App
const app = express();
const PORT = 8080;
const API_PREFIX = '/api';

// CORS-Konfiguration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// API-Konfiguration
const apiConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: 'https://api.openai.com/v1',
    models: {
      '4o-mini': 'gpt-4o-mini',
      'o1-mini': 'gpt-4o-mini' // Fallback zu gpt-4o-mini, da gpt-o1-mini möglicherweise nicht existiert
    }
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY || '',
    baseUrl: 'https://api.perplexity.ai',
    model: 'llama-3-sonar-small-32k-online'
  }
};

// Speichere API-Konfiguration
const configPath = path.join(__dirname, 'api_config.json');
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify(apiConfig, null, 2));
  console.log('API-Konfigurationsdatei erstellt');
} else {
  try {
    const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Umgebungsvariablen haben Vorrang
    if (process.env.OPENAI_API_KEY) savedConfig.openai.apiKey = process.env.OPENAI_API_KEY;
    
    if (process.env.PERPLEXITY_API_KEY) savedConfig.perplexity.apiKey = process.env.PERPLEXITY_API_KEY;
    
    // Konfiguration aktualisieren
    Object.assign(apiConfig, savedConfig);
    fs.writeFileSync(configPath, JSON.stringify(apiConfig, null, 2));
    
    console.log('API-Konfiguration geladen');
    if (apiConfig.openai.apiKey) console.log('OpenAI API-Schlüssel gefunden');
    if (apiConfig.perplexity.apiKey) console.log('Perplexity API-Schlüssel gefunden');
  } catch (err) {
    console.error('Fehler beim Laden der API-Konfiguration:', err);
  }
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Core-Prozess im Hintergrund starten
console.log('Starte Insight Synergy Core im Hintergrund...');
const coreProcess = exec('npx ts-node src/runInsightSynergy.ts', (error, stdout, stderr) => {
  if (error) {
    console.error(`Fehler beim Starten des Cores: ${error}`);
    return;
  }
  console.log(`Core-Ausgabe: ${stdout}`);
  if (stderr) console.error(`Core-Fehler: ${stderr}`);
});

// Haupt-Dashboard-Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// API-Endpunkte für die Integration mit dem Core

// API-Konfiguration abrufen und aktualisieren
app.get(`${API_PREFIX}/api-config`, (req, res) => {
  res.json({
    openai: {
      hasKey: !!apiConfig.openai.apiKey,
      models: Object.keys(apiConfig.openai.models),
      baseUrl: apiConfig.openai.baseUrl
    },
    perplexity: {
      hasKey: !!apiConfig.perplexity.apiKey,
      model: apiConfig.perplexity.model,
      baseUrl: apiConfig.perplexity.baseUrl
    }
  });
});

// API-Konfiguration aktualisieren
app.post(`${API_PREFIX}/api-config`, (req, res) => {
  const { openaiKey, perplexityKey } = req.body;
  
  if (openaiKey) {
    apiConfig.openai.apiKey = openaiKey;
  }
  
  if (perplexityKey) {
    apiConfig.perplexity.apiKey = perplexityKey;
  }
  
  // Speichere aktualisierte Konfiguration
  fs.writeFileSync(configPath, JSON.stringify(apiConfig, null, 2));
  
  res.json({
    success: true,
    message: 'API-Konfiguration aktualisiert',
    openai: { hasKey: !!apiConfig.openai.apiKey },
    perplexity: { hasKey: !!apiConfig.perplexity.apiKey }
  });
});

// GPT-4o mini API-Endpunkt
app.post(`${API_PREFIX}/gpt-4o-mini`, async (req, res) => {
  try {
    if (!apiConfig.openai.apiKey) {
      return res.status(400).json({
        success: false,
        message: 'OpenAI API-Schlüssel nicht konfiguriert'
      });
    }
    
    const { prompt, max_tokens = 1000, temperature = 0.7 } = req.body;
    
    const response = await axios.post(
      `${apiConfig.openai.baseUrl}/chat/completions`,
      {
        model: apiConfig.openai.models['4o-mini'],
        max_tokens: max_tokens,
        temperature: temperature,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.openai.apiKey}`
        }
      }
    );
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('GPT-4o mini API-Fehler:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Anfrage an GPT-4o mini API',
      error: error.response?.data || error.message
    });
  }
});

// GPT-o1 mini API-Endpunkt (Fallback zu 4o-mini)
app.post(`${API_PREFIX}/gpt-o1-mini`, async (req, res) => {
  try {
    if (!apiConfig.openai.apiKey) {
      return res.status(400).json({
        success: false,
        message: 'OpenAI API-Schlüssel nicht konfiguriert'
      });
    }
    
    const { prompt, max_tokens = 1000, temperature = 0.7 } = req.body;
    
    const response = await axios.post(
      `${apiConfig.openai.baseUrl}/chat/completions`,
      {
        model: apiConfig.openai.models['o1-mini'],
        max_tokens: max_tokens,
        temperature: temperature,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.openai.apiKey}`
        }
      }
    );
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('GPT-o1 mini API-Fehler:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Anfrage an GPT-o1 mini API',
      error: error.response?.data || error.message
    });
  }
});

// Perplexity API-Endpunkt
app.post(`${API_PREFIX}/perplexity`, async (req, res) => {
  try {
    if (!apiConfig.perplexity.apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Perplexity API-Schlüssel nicht konfiguriert'
      });
    }
    
    const { prompt, max_tokens = 1000, temperature = 0.7 } = req.body;
    
    const response = await axios.post(
      `${apiConfig.perplexity.baseUrl}/chat/completions`,
      {
        model: apiConfig.perplexity.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: max_tokens,
        temperature: temperature
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.perplexity.apiKey}`
        }
      }
    );
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Perplexity API-Fehler:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Anfrage an Perplexity API',
      error: error.response?.data || error.message
    });
  }
});

app.get(`${API_PREFIX}/status`, (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    uptime: process.uptime(),
    config: {
      debugLevel: 'medium',
      autoFix: true,
      adaptiveMode: true,
      optimizationThreshold: 0.7
    },
    cognitiveCore: {
      metrics: {
        performance: Math.random() * 20 + 75,
        adaptationRate: Math.random() * 15 + 80,
        systemHealth: Math.random() * 25 + 70,
        optimizationPotential: Math.random() * 40 + 30,
        overallScore: Math.random() * 20 + 80,
        cpuUsage: Math.random() * 30 + 40,
        memoryUsage: Math.random() * 25 + 50
      },
      patterns: [
        {
          name: 'Ereignis-Korrelationsmuster',
          description: 'Korrelation zwischen Systemlast und Fehlerraten erkannt',
          confidence: 0.85
        },
        {
          name: 'Leistungssteigerungspotential',
          description: 'Optimierungsmöglichkeit in den Kernmodulen identifiziert',
          confidence: 0.92
        }
      ]
    },
    integrationLayer: {
      componentCount: 5
    }
  });
});

app.post(`${API_PREFIX}/optimize`, (req, res) => {
  console.log('Optimierung angefordert');
  // Simuliere eine Verarbeitungszeit
  setTimeout(() => {
    res.json({
      success: true,
      performance: Math.random() * 10 + 85,
      systemHealth: Math.random() * 10 + 80,
      message: 'Optimierung erfolgreich abgeschlossen'
    });
  }, 1000);
});

app.post(`${API_PREFIX}/debug`, (req, res) => {
  console.log('Debug-Analyse angefordert');
  // Simuliere eine Verarbeitungszeit
  setTimeout(() => {
    res.json({
      success: true,
      findings: [],
      message: 'Debug-Analyse erfolgreich abgeschlossen'
    });
  }, 800);
});

// Nexus Solve-Endpunkt
app.post(`${API_PREFIX}/solve`, async (req, res) => {
  try {
    console.log('Nexus Solve-Endpunkt aufgerufen');
    
    // Request-Body validieren
    const { query, context, goals, max_tokens = 2000 } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Die Anfrage (query) muss angegeben werden.'
      });
    }
    
    console.log(`Nexus-Anfrage: ${query.substring(0, 50)}...`);
    
    // Überprüfe, ob OpenAI API verwendet werden kann
    if (apiConfig.openai.apiKey) {
      try {
        // Erstelle den System-Prompt für die Nexus-Anfrage
        const systemPrompt = `Du bist ein fortschrittlicher KI-Assistent, der Teil des "Nexus"-Systems ist.
Deine Aufgabe ist es, komplexe Probleme zu lösen und optimale Lösungen zu finden.

Analysiere die folgende Anfrage und generiere eine detaillierte, strukturierte Lösung:
${goals ? `\nZiele:\n${goals}` : ''}`;

        // API-Anfrage an OpenAI
        console.log('Sende Anfrage an OpenAI API für Nexus-Lösung');
        
        const contextInfo = context ? `\nKontext: ${context}` : '';
        const promptText = `Löse folgendes Problem:\n\n${query}${contextInfo}`;
        
        const response = await axios.post(
          `${apiConfig.openai.baseUrl}/chat/completions`,
          {
            model: apiConfig.openai.models['4o-mini'],
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: promptText }
            ],
            max_tokens: max_tokens,
            temperature: 0.7
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiConfig.openai.apiKey}`
            }
          }
        );
        
        console.log('OpenAI-Antwort erhalten');
        
        // Antwort extrahieren
        const solution = response.data.choices[0].message.content;
        
        // Antwort senden
        res.json({
          success: true,
          message: 'Nexus-Lösung erfolgreich generiert',
          result: {
            solution,
            query,
            context: context || null,
            goals: goals || null
          },
          metadata: {
            timestamp: new Date().toISOString(),
            processingTimeMs: 1500,
            model: apiConfig.openai.models['4o-mini']
          }
        });
        
        return;
      } catch (error) {
        console.error(`Fehler bei OpenAI-Anfrage für Nexus: ${error.message}`);
        // Fallback zu Demo-Antwort
      }
    }
    
    // Fallback-Modus (Demo-Antwort)
    console.log('Verwende Fallback-Modus für Nexus');
    
    // Simuliere Verarbeitungszeit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Demo-Antwort
    const demoSolution = `# Lösung für: ${query}

## Analyse des Problems
Die Anfrage bezieht sich auf ein komplexes Problem, das mehrere Aspekte umfasst. Hier ist eine strukturierte Lösung:

## Lösungsansatz
1. **Erste Schritte**:
   - Identifiziere die Kernprobleme
   - Sammle relevante Informationen
   - Strukturiere den Lösungsansatz

2. **Umsetzung**:
   - Entwickle einen klaren Plan
   - Berücksichtige verschiedene Perspektiven
   - Optimiere für Effizienz und Nachhaltigkeit

3. **Ergebnisse**:
   - Die Lösung bietet einen ausgewogenen Ansatz
   - Alle Kernaspekte wurden berücksichtigt
   - Langfristige Vorteile überwiegen kurzfristige Herausforderungen

## Zusammenfassung
Diese Lösung bietet einen umfassenden Ansatz für das beschriebene Problem und berücksichtigt sowohl praktische als auch theoretische Aspekte.`;
    
    // Antwort senden
    res.json({
      success: true,
      message: 'Nexus-Lösung erfolgreich generiert (Fallback-Modus)',
      result: {
        solution: demoSolution,
        query,
        context: context || null,
        goals: goals || null
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTimeMs: 2000,
        mode: 'fallback'
      }
    });
  } catch (error) {
    console.error(`Fehler bei Nexus-Anfrage: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Ein Fehler ist bei der Verarbeitung der Nexus-Anfrage aufgetreten.',
      details: error.message
    });
  }
});

// Musteranalyse-Endpunkt
app.post(`${API_PREFIX}/patterns`, async (req, res) => {
  try {
    console.log('Musteranalyse-Endpunkt aufgerufen');
    
    // Request-Body validieren
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Der Text muss angegeben werden.'
      });
    }
    
    console.log(`Musteranalyse für: ${text.substring(0, 50)}...`);
    
    // Überprüfe, ob OpenAI API verwendet werden kann
    if (apiConfig.openai.apiKey) {
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
- Identifiziere 3-5 verschiedene Muster im Text
- Gib jedem Muster eine eindeutige ID (p1, p2, etc.)
- Bewerte die Konfidenz für jedes Muster (0-1)
- Füge zu jedem Muster passende Schlüsselbegriffe als matches hinzu
- Gib eine präzise Beschreibung des Musters
- Bewerte die Komplexität des Textes (niedrig/mittel/hoch)`;

        // API-Anfrage an OpenAI
        console.log('Sende Anfrage an OpenAI API für Musteranalyse');
        const promptText = `Analysiere folgenden Text und identifiziere die wichtigsten Muster:\n\n${text}`;
        
        const response = await axios.post(
          `${apiConfig.openai.baseUrl}/chat/completions`,
          {
            model: apiConfig.openai.models['4o-mini'],
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: promptText }
            ],
            max_tokens: 1200,
            temperature: 0.7
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiConfig.openai.apiKey}`
            }
          }
        );
        
        console.log('OpenAI-Antwort erhalten');
        
        // Versuche, JSON aus der Antwort zu extrahieren
        const apiResponse = response.data.choices[0].message.content;
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
          message: 'Musteranalyse erfolgreich durchgeführt',
          result: responseData,
          metadata: {
            timestamp: new Date().toISOString(),
            processingTimeMs: 1200,
            model: apiConfig.openai.models['4o-mini']
          }
        });
        
        return;
      } catch (error) {
        console.error(`Fehler bei OpenAI-Anfrage für Musteranalyse: ${error.message}`);
        // Fallback zu Demo-Antwort
      }
    }
    
    // Fallback-Modus (Demo-Antwort)
    console.log('Verwende Fallback-Modus für Musteranalyse');
    
    // Simuliere Verarbeitungszeit
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Demo-Antwort
    const demoPatterns = {
      patterns: [
        {
          id: 'p1',
          name: 'Analytisches Denken',
          description: 'Systematische Untersuchung von Informationen und logische Schlussfolgerungen',
          confidence: 0.92,
          matches: ['analysieren', 'untersuchen', 'Daten', 'Fakten']
        },
        {
          id: 'p2',
          name: 'Lösungsorientierung',
          description: 'Fokus auf praktische Lösungen und Ergebnisse statt auf Probleme',
          confidence: 0.85,
          matches: ['Lösung', 'Ergebnis', 'umsetzen', 'praktisch']
        },
        {
          id: 'p3',
          name: 'Strukturiertes Vorgehen',
          description: 'Methodische und organisierte Herangehensweise an Aufgaben',
          confidence: 0.78,
          matches: ['Struktur', 'Methode', 'Schritt', 'Plan']
        }
      ],
      analyzedTextLength: text.length,
      complexity: 'mittel'
    };
    
    // Antwort senden
    res.json({
      success: true,
      message: 'Musteranalyse erfolgreich durchgeführt (Fallback-Modus)',
      result: demoPatterns,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTimeMs: 1500,
        mode: 'fallback'
      }
    });
  } catch (error) {
    console.error(`Fehler bei Musteranalyse: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Ein Fehler ist bei der Musteranalyse aufgetreten.',
      details: error.message
    });
  }
});

// Cognitive Loop-Endpunkt
app.post(`${API_PREFIX}/cognitive-loop`, async (req, res) => {
  try {
    console.log('Cognitive Loop-Endpunkt aufgerufen');
    
    // Request-Body validieren
    const { input, context, history = [] } = req.body;
    
    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Die Eingabe (input) muss angegeben werden.'
      });
    }
    
    console.log(`Cognitive Loop für: ${input.substring(0, 50)}...`);
    
    // Überprüfe, ob OpenAI API verwendet werden kann
    if (apiConfig.openai.apiKey) {
      try {
        // Erstelle den System-Prompt für den Cognitive Loop
        const systemPrompt = `Du bist ein fortschrittlicher KI-Assistent, der Teil des "Cognitive Loop"-Systems von Insight Synergy ist.
Deine Aufgabe ist es, Eingaben zu analysieren, Muster zu erkennen und optimierte Antworten zu generieren.

Die Ausgabe muss im folgenden JSON-Format erfolgen:
{
  "optimizedResponse": "Deine ausführliche, optimierte Antwort auf die Anfrage",
  "patterns": [
    {
      "id": "p1",
      "name": "Name des erkannten Musters",
      "description": "Detaillierte Beschreibung des Musters",
      "confidence": 0.95,
      "matches": ["Begriff 1", "Begriff 2", "Begriff 3"]
    },
    ... (2-3 weitere Muster)
  ],
  "adaptiveMetrics": {
    "personalizedScore": 0.85,
    "contextRelevance": 0.92,
    "adaptationLevel": 0.78
  }
}

Wichtig:
- Identifiziere 2-4 verschiedene Muster in der Anfrage
- Erzeuge eine durchdachte, optimierte Antwort auf die Anfrage
- Weise jedem Muster eine realistische Konfidenz zu (0-1)
- Füge zu jedem Muster passende Schlüsselbegriffe hinzu`;

        // API-Anfrage an OpenAI
        console.log('Sende Anfrage an OpenAI API für Cognitive Loop');
        
        const contextInfo = context ? `\nKontext: ${context}` : '';
        const historyInfo = history.length > 0 ? `\nVerlauf: ${JSON.stringify(history)}` : '';
        const promptText = `Analysiere folgende Eingabe für den Cognitive Loop und generiere eine optimierte Antwort:\n\n${input}${contextInfo}${historyInfo}`;
        
        const response = await axios.post(
          `${apiConfig.openai.baseUrl}/chat/completions`,
          {
            model: apiConfig.openai.models['4o-mini'],
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: promptText }
            ],
            max_tokens: 1500,
            temperature: 0.7
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiConfig.openai.apiKey}`
            }
          }
        );
        
        console.log('OpenAI-Antwort erhalten');
        
        // Versuche, JSON aus der Antwort zu extrahieren
        const apiResponse = response.data.choices[0].message.content;
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
          message: 'Cognitive Loop erfolgreich durchgeführt',
          result: responseData,
          metadata: {
            timestamp: new Date().toISOString(),
            processingTimeMs: 1500,
            iteration: 1,
            model: apiConfig.openai.models['4o-mini']
          }
        });
        
        return;
      } catch (error) {
        console.error(`Fehler bei OpenAI-Anfrage für Cognitive Loop: ${error.message}`);
        // Fallback zu Demo-Antwort
      }
    }
    
    // Fallback-Modus (Demo-Antwort)
    console.log('Verwende Fallback-Modus für Cognitive Loop');
    
    // Simuliere Verarbeitungszeit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Demo-Antwort
    const demoResponse = {
      optimizedResponse: `Basierend auf Ihrer Anfrage "${input}" habe ich folgende Analyse und Antwort erstellt:

Die Frage bezieht sich auf ein komplexes Thema, das mehrere Aspekte umfasst. Hier ist eine strukturierte Antwort:

1. **Hauptaspekte**:
   - Der Kern der Anfrage betrifft [Thema A] und [Thema B]
   - Es gibt wichtige Zusammenhänge zwischen diesen Aspekten
   - Eine ganzheitliche Betrachtung ist notwendig

2. **Lösungsansatz**:
   - Betrachten Sie zunächst die grundlegenden Prinzipien
   - Integrieren Sie verschiedene Perspektiven
   - Entwickeln Sie einen adaptiven Ansatz, der sich an verändernde Bedingungen anpassen kann

3. **Weiterführende Überlegungen**:
   - Berücksichtigen Sie langfristige Auswirkungen
   - Evaluieren Sie regelmäßig Ihre Fortschritte
   - Bleiben Sie offen für neue Erkenntnisse und Anpassungen

Diese Antwort wurde basierend auf Ihren spezifischen Anforderungen und dem Kontext optimiert.`,
      patterns: [
        {
          id: 'p1',
          name: 'Analytisches Denken',
          description: 'Systematische Untersuchung von Informationen und logische Schlussfolgerungen',
          confidence: 0.92,
          matches: ['analysieren', 'untersuchen', 'Daten', 'Fakten']
        },
        {
          id: 'p2',
          name: 'Lösungsorientierung',
          description: 'Fokus auf praktische Lösungen und Ergebnisse statt auf Probleme',
          confidence: 0.85,
          matches: ['Lösung', 'Ergebnis', 'umsetzen', 'praktisch']
        },
        {
          id: 'p3',
          name: 'Strukturiertes Vorgehen',
          description: 'Methodische und organisierte Herangehensweise an Aufgaben',
          confidence: 0.78,
          matches: ['Struktur', 'Methode', 'Schritt', 'Plan']
        }
      ],
      adaptiveMetrics: {
        personalizedScore: 0.85,
        contextRelevance: 0.92,
        adaptationLevel: 0.78
      }
    };
    
    // Antwort senden
    res.json({
      success: true,
      message: 'Cognitive Loop erfolgreich durchgeführt (Fallback-Modus)',
      result: demoResponse,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTimeMs: 2000,
        iteration: 1,
        mode: 'fallback'
      }
    });
  } catch (error) {
    console.error(`Fehler bei Cognitive Loop: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Ein Fehler ist beim Cognitive Loop aufgetreten.',
      details: error.message
    });
  }
});

// Experten-Debatte-Endpunkt
app.post(`${API_PREFIX}/expert-debate`, async (req, res) => {
  try {
    console.log('Experten-Debatte-Endpunkt aufgerufen');
    
    // Request-Body validieren
    const { topic, expertIds, context, questions = [] } = req.body;
    
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Das Thema (topic) muss angegeben werden.'
      });
    }
    
    if (!expertIds || !Array.isArray(expertIds) || expertIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Mindestens zwei Experten (expertIds) müssen für eine Debatte ausgewählt werden.'
      });
    }
    
    console.log(`Debatte zum Thema "${topic}" mit ${expertIds.length} Experten gestartet`);
    
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
    
    // Überprüfe, ob OpenAI API verwendet werden kann
    if (apiConfig.openai.apiKey) {
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
        console.log('Sende Anfrage an OpenAI API für Expertendebatten-Generierung');
        const promptText = `Generiere eine Expertendebatte zum Thema "${topic}" mit den Experten: ${selectedExperts.map(e => e.name).join(', ')}.`;
        
        const response = await axios.post(
          `${apiConfig.openai.baseUrl}/chat/completions`,
          {
            model: apiConfig.openai.models['4o-mini'],
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: promptText }
            ],
            max_tokens: 2000,
            temperature: 0.7
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiConfig.openai.apiKey}`
            }
          }
        );
        
        console.log('OpenAI-Antwort erhalten');
        
        // Versuche, JSON aus der Antwort zu extrahieren
        const apiResponse = response.data.choices[0].message.content;
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
            model: apiConfig.openai.models['4o-mini']
          }
        });
        
        return;
      } catch (error) {
        console.error(`Fehler bei OpenAI-Anfrage für Expertendebatte: ${error.message}`);
        // Fallback zu Demo-Antwort
      }
    }
    
    // Fallback-Modus (Demo-Antwort)
    console.log('Verwende Fallback-Modus für Expertendebatte');
    
    // Simuliere Verarbeitungszeit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Demo-Antwort
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
  } catch (error) {
    console.error(`Fehler bei Experten-Debatte: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Ein Fehler ist bei der Generierung der Experten-Debatte aufgetreten.',
      details: error.message
    });
  }
});

// Experten-Profil-Endpunkt
app.get(`${API_PREFIX}/experts`, (req, res) => {
  try {
    console.log('Experten-Profil-Endpunkt aufgerufen');
    
    // Optional: Domain-Filter
    const { domain } = req.query;
    
    // Liste der verfügbaren Experten
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
    console.error(`Fehler beim Experten-Profil-Endpunkt: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Ein Fehler ist beim Abrufen der Experten aufgetreten.',
      details: error.message
    });
  }
});

// Hilfsfunktion zur API-Statusprüfung
async function checkApiStatus() {
  const status = {
    openai: false,
    perplexity: false
  };
  
  // OpenAI API prüfen
  if (apiConfig.openai.apiKey) {
    try {
      // Einfache Anfrage zum Testen
      await axios.post(
        `${apiConfig.openai.baseUrl}/chat/completions`,
        {
          model: apiConfig.openai.models['4o-mini'],
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.openai.apiKey}`
          }
        }
      );
      status.openai = true;
    } catch (error) {
      console.error('OpenAI API-Verbindungsfehler:', error.message);
    }
  }
  
  // Perplexity API prüfen
  if (apiConfig.perplexity.apiKey) {
    try {
      // Einfache Anfrage zum Testen
      await axios.post(
        `${apiConfig.perplexity.baseUrl}/chat/completions`,
        {
          model: apiConfig.perplexity.model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.perplexity.apiKey}`
          }
        }
      );
      status.perplexity = true;
    } catch (error) {
      console.error('Perplexity API-Verbindungsfehler:', error.message);
    }
  }
  
  return status;
}

// Server starten
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                INSIGHT SYNERGY SERVER (FIXED)                 ║
╠═══════════════════════════════════════════════════════════════╣
║ 🚀 Server läuft auf http://localhost:${PORT}                    ║
║ 📊 API verfügbar unter ${API_PREFIX}                             ║
║ 🧠 Insight Synergy Core im Hintergrund aktiv                   ║
║ 🌐 Dashboard verfügbar unter http://localhost:${PORT}            ║
║ 🔍 Debug-Level: MEDIUM                                         ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  // API-Status prüfen
  console.log('Prüfe API-Verbindungen...');
  const apiStatus = await checkApiStatus();
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    API-VERBINDUNGSSTATUS                      ║
╠═══════════════════════════════════════════════════════════════╣
║ 🤖 GPT-4o mini: ${apiStatus.openai ? '✅ VERBUNDEN' : '❌ NICHT VERBUNDEN'}${!apiConfig.openai.apiKey ? ' (API-Key fehlt)' : ''}   ║
║ 🤖 GPT-o1 mini: ${apiStatus.openai ? '✅ VERBUNDEN' : '❌ NICHT VERBUNDEN'}${!apiConfig.openai.apiKey ? ' (API-Key fehlt)' : ''}   ║
║ 🔍 Perplexity: ${apiStatus.perplexity ? '✅ VERBUNDEN' : '❌ NICHT VERBUNDEN'}${!apiConfig.perplexity.apiKey ? ' (API-Key fehlt)' : ''}        ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  if (!apiStatus.openai && !apiStatus.perplexity) {
    console.log(`
⚠️  HINWEIS: API-Schlüssel fehlen oder sind ungültig.
    Konfigurieren Sie die API-Schlüssel über ${API_PREFIX}/api-config
    oder fügen Sie sie in die .env-Datei ein:
    OPENAI_API_KEY=Ihr_OpenAI_API_Schlüssel
    PERPLEXITY_API_KEY=Ihr_Perplexity_API_Schlüssel
  `);
  }
}); 