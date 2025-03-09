/**
 * Insight Synergy Minimal Fixed Server
 * This is a minimal version focused on API connectivity with OpenAI and Perplexity
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');

// Setup Express app
const app = express();
const PORT = 8080;
app.use(express.json());

// Configure APIs
const API_CONFIG = {
  // OpenAI API Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: 'https://api.openai.com/v1',
    models: {
      '4o-mini': 'gpt-4o-mini',
      'o1-mini': 'gpt-4o-mini' // Fallback to gpt-4o-mini as gpt-o1-mini might not exist
    },
    enabled: true
  },
  // Perplexity API Configuration
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY || '',
    baseUrl: 'https://api.perplexity.ai',
    model: 'sonar-deep-research',
    enabled: true
  }
};

// Check API keys
const hasOpenAIKey = API_CONFIG.openai.apiKey && API_CONFIG.openai.apiKey.length > 20;
const hasPerplexityKey = API_CONFIG.perplexity.apiKey && API_CONFIG.perplexity.apiKey.length > 20;

console.log('API Status:');
console.log('- OpenAI API: ' + (hasOpenAIKey ? 'Available' : 'Not available'));
console.log('- Perplexity API: ' + (hasPerplexityKey ? 'Available' : 'Not available'));

// Set up the API clients
const openaiAPI = axios.create({
  baseURL: API_CONFIG.openai.baseUrl,
  headers: {
    'Authorization': `Bearer ${API_CONFIG.openai.apiKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

const perplexityAPI = axios.create({
  baseURL: API_CONFIG.perplexity.baseUrl,
  headers: {
    'Authorization': `Bearer ${API_CONFIG.perplexity.apiKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

// Endpoint to check API status
app.get('/api/status', async (req, res) => {
  const status = {
    openai: false,
    perplexity: false
  };
  
  // Check OpenAI API
  if (hasOpenAIKey) {
    try {
      // A minimal request to test connectivity
      await openaiAPI.post('/chat/completions', {
        model: API_CONFIG.openai.models['4o-mini'],
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      });
      status.openai = true;
    } catch (error) {
      console.error('OpenAI API connection error:', error.message);
    }
  }
  
  // Check Perplexity API
  if (hasPerplexityKey) {
    try {
      // A minimal request to test connectivity
      await perplexityAPI.post('/chat/completions', {
        model: API_CONFIG.perplexity.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      });
      status.perplexity = true;
    } catch (error) {
      console.error('Perplexity API connection error:', error.message);
    }
  }
  
  res.json({
    success: true,
    status: 'online',
    apis: status,
    message: 'Server is running with API connectivity checks'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          INSIGHT SYNERGY MINIMAL FIXED SERVER                 ║
╠═══════════════════════════════════════════════════════════════╣
║ 🚀 Server running on http://localhost:${PORT}                   ║
║ 🧪 Test API connectivity with GET /api/status                 ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
