const express = require('express');
const cors = require('cors');
const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock API is running' });
});

// Root endpoint
app.get('/api', (req, res) => {
  res.json({ message: 'Mock API for Insight Synergy' });
});

// Expert profiles endpoint
app.get('/api/cognitive/profiles', (req, res) => {
  res.json({
    success: true,
    experts: [
      {
        id: 'exp-001',
        name: 'Dr. Tech Visionary',
        domain: 'Technologie',
        specialty: 'KI-Entwicklung & Zukunftstechnologien',
        background: 'Führender Forscher im Bereich künstliche Intelligenz mit Schwerpunkt auf ethischen Implikationen.',
        perspective: 'Techno-optimistisch, aber mit kritischem Blick auf gesellschaftliche Auswirkungen',
        avatar: '🧠',
        color: '#6366f1',
        expertise: 95,
        validatedCredentials: true
      },
      {
        id: 'exp-002',
        name: 'Prof. EcoThinker',
        domain: 'Umweltwissenschaften',
        specialty: 'Klimawandel & Nachhaltige Entwicklung',
        background: 'Langjährige Forschung zu Umweltauswirkungen verschiedener Technologien und Wirtschaftsmodelle.',
        perspective: 'Fokus auf langfristige ökologische Nachhaltigkeit und Systemwandel',
        avatar: '🌍',
        color: '#22c55e',
        expertise: 92,
        validatedCredentials: true
      }
    ]
  });
});

// Message generation endpoint
app.post('/api/live-expert-debate/message', (req, res) => {
  const { topic, expertName, expertDomain } = req.body;
  
  // Generate a mock response
  res.json({
    success: true,
    message: {
      content: `Als Experte für ${expertDomain} möchte ich anmerken, dass das Thema "${topic}" sehr interessant ist. Hier ist eine generierte Antwort von ${expertName}.`,
      references: ['Beispiel-Referenz 1', 'Beispiel-Referenz 2'],
      factChecked: true,
      factCheckResult: {
        isFactual: true,
        confidence: 0.85,
        sources: [
          {
            title: 'Beispiel-Quelle',
            url: 'https://example.com',
            reliability: 0.9
          }
        ]
      }
    }
  });
});

// Insight generation endpoint
app.post('/api/live-expert-debate/insight', (req, res) => {
  const { topic } = req.body;
  
  res.json({
    success: true,
    insight: {
      id: `insight-${Date.now()}`,
      title: 'Beispiel-Erkenntnis',
      description: `Diese Erkenntnis basiert auf der Diskussion zum Thema "${topic}".`,
      expert: 'Dr. Tech Visionary',
      confidence: 0.8,
      tags: ['Beispiel-Tag', 'Interessant', topic]
    }
  });
});

app.listen(port, () => {
  console.log(`Mock API server running at http://localhost:${port}/api`);
});
