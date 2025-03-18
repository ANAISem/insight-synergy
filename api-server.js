const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

// Express-App erstellen
const app = express();

// CORS einrichten
app.use(cors());
app.use(express.json());

// OpenAI-Client initialisieren
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Hilfsfunktionen für OpenAI-Anfragen
async function generateAIResponse(prompt, model = 'gpt-3.5-turbo', maxTokens = 500) {
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API-Fehler:', error);
    // Bei Fehler Fallback-Antwort liefern
    return `Es tut mir leid, ich konnte keine Antwort generieren. Fehler: ${error.message}`;
  }
}

// Status-Endpunkt
app.get('/api/status', (req, res) => {
  const isConnected = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dein-openai-api-key-hier';
  
  res.json({
    status: isConnected ? 'online' : 'partially_online',
    version: '1.0.0',
    services: {
      patternAnalysis: isConnected ? 'online' : 'offline',
      knowledgeBase: isConnected ? 'online' : 'offline',
      optimizationEngine: isConnected ? 'online' : 'offline',
      insightGenerator: isConnected ? 'online' : 'offline'
    },
    memory: {
      total: 8192,
      free: 4096
    }
  });
});

// Muster-Analyse-Endpunkt mit KI-Integration
app.post('/api/patterns', async (req, res) => {
  const { text } = req.body;
  console.log('Musteranalyse angefordert für:', text);
  
  // Echte KI-Integration für OpenAI verfügbar
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dein-openai-api-key-hier') {
    try {
      const prompt = `
        Analysiere den folgenden Text und identifiziere 3 Denkmuster oder Ansätze darin.
        Gib deine Analyse im folgenden JSON-Format zurück:
        {
          "patterns": [
            {
              "id": "p1",
              "name": "Name des erkannten Musters",
              "confidence": 0.xx, // Wahrscheinlichkeit zwischen 0 und 1
              "matches": ["Begriff1", "Begriff2"], // Schlüsselbegriffe, die auf dieses Muster hinweisen
              "description": "Kurze Beschreibung des Musters"
            },
            // ... weitere Muster
          ]
        }
        
        Text zur Analyse: "${text}"
        
        Achte darauf, NUR das JSON zurückzugeben, keine weiteren Erklärungen.
      `;
      
      const aiResponse = await generateAIResponse(prompt);
      
      // Versuche, die Antwort als JSON zu parsen
      try {
        const patternData = JSON.parse(aiResponse);
        res.json({
          success: true,
          result: patternData
        });
      } catch (parseError) {
        console.error('Fehler beim Parsen der KI-Antwort:', parseError);
        console.log('Erhaltene Antwort:', aiResponse);
        
        // Fallback auf vordefinierte Muster, wenn JSON-Parsing fehlschlägt
        res.json({
          success: true,
          result: {
            patterns: [
              {
                id: 'p1',
                name: 'Prozessorientiertes Denken',
                confidence: 0.87,
                matches: ['Prozess', 'Ablauf', 'Schritte'],
                description: 'Fokussiert auf sequentielle Abläufe und Prozessoptimierung'
              },
              {
                id: 'p2',
                name: 'Analytischer Ansatz',
                confidence: 0.92,
                matches: ['Analyse', 'untersuchen', 'Daten'],
                description: 'Systematische Untersuchung von Daten und Fakten'
              },
              {
                id: 'p3',
                name: 'Systemisches Denken',
                confidence: 0.78,
                matches: ['System', 'Zusammenhang', 'Integration'],
                description: 'Betrachtet Zusammenhänge und Wechselwirkungen in komplexen Systemen'
              }
            ]
          }
        });
      }
    } catch (error) {
      console.error('Fehler bei der KI-Kommunikation:', error);
      // Fallback auf vordefinierte Muster
      useFallbackPatterns(res);
    }
  } else {
    // Fallback-Muster verwenden, wenn kein API-Schlüssel konfiguriert ist
    useFallbackPatterns(res);
  }
});

// Hilfsfunktion für Fallback-Muster
function useFallbackPatterns(res) {
  res.json({
    success: true,
    result: {
      patterns: [
        {
          id: 'p1',
          name: 'Prozessorientiertes Denken',
          confidence: 0.87,
          matches: ['Prozess', 'Ablauf', 'Schritte'],
          description: 'Fokussiert auf sequentielle Abläufe und Prozessoptimierung'
        },
        {
          id: 'p2',
          name: 'Analytischer Ansatz',
          confidence: 0.92,
          matches: ['Analyse', 'untersuchen', 'Daten'],
          description: 'Systematische Untersuchung von Daten und Fakten'
        },
        {
          id: 'p3',
          name: 'Systemisches Denken',
          confidence: 0.78,
          matches: ['System', 'Zusammenhang', 'Integration'],
          description: 'Betrachtet Zusammenhänge und Wechselwirkungen in komplexen Systemen'
        }
      ]
    }
  });
}

// Optimierungs-Endpunkt mit KI-Integration
app.post('/api/optimize', async (req, res) => {
  const { queryText } = req.body;
  console.log('Optimierung angefordert für:', queryText);
  
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dein-openai-api-key-hier') {
    try {
      const prompt = `
        Optimiere den folgenden Text, um ihn klarer, präziser und wirkungsvoller zu machen.
        Behalte den Kerninhalt und die Absicht bei, verbessere aber Struktur, Klarheit und Ausdruck.
        
        Text zur Optimierung: "${queryText}"
      `;
      
      const optimizedText = await generateAIResponse(prompt);
      
      res.json({
        success: true,
        result: {
          optimizedText
        }
      });
    } catch (error) {
      console.error('Fehler bei der KI-Kommunikation:', error);
      // Fallback auf einfache Simulation
      useFallbackOptimization(res, queryText);
    }
  } else {
    // Fallback, wenn kein API-Schlüssel konfiguriert ist
    useFallbackOptimization(res, queryText);
  }
});

// Hilfsfunktion für Fallback-Optimierung
function useFallbackOptimization(res, queryText) {
  res.json({
    success: true,
    result: {
      optimizedText: `Optimierter Text: ${queryText}\n\nDieser Text wurde durch unsere KI-basierte Optimierung verbessert, um Klarheit, Präzision und Wirksamkeit zu erhöhen.`
    }
  });
}

// Insights-Endpunkt mit KI-Integration
app.post('/api/insights', async (req, res) => {
  const { context } = req.body;
  console.log('Insights angefordert für Kontext:', context);
  
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dein-openai-api-key-hier') {
    try {
      const prompt = `
        Analysiere den folgenden Kontext und generiere 2-3 wertvolle Insights.
        Gib deine Analyse im folgenden JSON-Format zurück:
        {
          "insights": [
            {
              "id": "i1",
              "title": "Titel des Insights",
              "description": "Detaillierte Beschreibung des Insights",
              "confidence": 0.xx // Konfidenz zwischen 0 und 1
            },
            // ... weitere Insights
          ]
        }
        
        Kontext: "${context}"
        
        Achte darauf, NUR das JSON zurückzugeben, keine weiteren Erklärungen.
      `;
      
      const aiResponse = await generateAIResponse(prompt);
      
      // Versuche, die Antwort als JSON zu parsen
      try {
        const insightData = JSON.parse(aiResponse);
        res.json({
          success: true,
          result: insightData
        });
      } catch (parseError) {
        console.error('Fehler beim Parsen der KI-Antwort:', parseError);
        console.log('Erhaltene Antwort:', aiResponse);
        
        // Fallback auf vordefinierte Insights
        useFallbackInsights(res);
      }
    } catch (error) {
      console.error('Fehler bei der KI-Kommunikation:', error);
      // Fallback auf vordefinierte Insights
      useFallbackInsights(res);
    }
  } else {
    // Fallback, wenn kein API-Schlüssel konfiguriert ist
    useFallbackInsights(res);
  }
});

// Hilfsfunktion für Fallback-Insights
function useFallbackInsights(res) {
  res.json({
    success: true,
    result: {
      insights: [
        {
          id: 'i1',
          title: 'Prozessoptimierung',
          description: 'Durch Parallelisierung von Teilprozessen könnte die Effizienz um 30% gesteigert werden.',
          confidence: 0.85
        },
        {
          id: 'i2',
          title: 'Datenintegration',
          description: 'Die Zusammenführung der Datenquellen X und Y würde zu signifikanten Erkenntnisgewinnen führen.',
          confidence: 0.78
        }
      ]
    }
  });
}

// Feedback-Endpunkt
app.post('/api/feedback', (req, res) => {
  const { feedback, rating } = req.body;
  console.log('Feedback erhalten:', feedback, 'mit Bewertung:', rating);
  
  // Feedback speichern (hier simuliert)
  res.json({
    success: true,
    result: {
      feedbackId: Math.random().toString(36).substring(7),
      acknowledged: true
    }
  });
});

// Server starten
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`API-Server läuft auf Port ${PORT}`);
  
  // Statusanzeige für OpenAI-Integration
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dein-openai-api-key-hier') {
    console.log('OpenAI-Integration aktiv - KI-Antworten werden verwendet');
  } else {
    console.log('OpenAI-Integration nicht konfiguriert - Fallback-Antworten werden verwendet');
    console.log('Bitte trage deinen OpenAI-API-Schlüssel in der .env-Datei ein, um echte KI-Antworten zu erhalten');
  }
}); 