/**
 * Insight Synergy OpenAI API Server
 * Configured to use the OpenAI API with GPT-4o-mini and GPT-O1-mini models
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');

// Setup Express app
const app = express();
const PORT = 8090; // Changed to 8090 to avoid conflicts
app.use(express.json());

// Configure APIs
const API_CONFIG = {
  // OpenAI API Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: 'https://api.openai.com/v1',
    models: {
      '4o-mini': 'gpt-4o-mini',
      'o1-mini': 'gpt-4o'  // Using best match for o1-mini
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

// OpenAI 4o-mini model endpoint 
app.post('/api/openai/4o-mini', async (req, res) => {
  if (!hasOpenAIKey) {
    return res.status(400).json({
      success: false,
      message: 'OpenAI API key not configured'
    });
  }
  
  try {
    const { prompt, max_tokens = 1000, temperature = 0.7 } = req.body;
    
    const response = await openaiAPI.post('/chat/completions', {
      model: API_CONFIG.openai.models['4o-mini'],
      messages: [{ role: 'user', content: prompt }],
      max_tokens: max_tokens,
      temperature: temperature
    });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Error querying OpenAI API',
      error: error.response?.data || error.message
    });
  }
});

// OpenAI o1-mini model endpoint
app.post('/api/openai/o1-mini', async (req, res) => {
  if (!hasOpenAIKey) {
    return res.status(400).json({
      success: false,
      message: 'OpenAI API key not configured'
    });
  }
  
  try {
    const { prompt, max_tokens = 1000, temperature = 0.7 } = req.body;
    
    const response = await openaiAPI.post('/chat/completions', {
      model: API_CONFIG.openai.models['o1-mini'],
      messages: [{ role: 'user', content: prompt }],
      max_tokens: max_tokens,
      temperature: temperature
    });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Error querying OpenAI API',
      error: error.response?.data || error.message
    });
  }
});

// Perplexity API endpoint
app.post('/api/perplexity', async (req, res) => {
  if (!hasPerplexityKey) {
    return res.status(400).json({
      success: false,
      message: 'Perplexity API key not configured'
    });
  }
  
  try {
    const { prompt, max_tokens = 1000, temperature = 0.7 } = req.body;
    
    const response = await perplexityAPI.post('/chat/completions', {
      model: API_CONFIG.perplexity.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: max_tokens,
      temperature: temperature
    });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Perplexity API error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Error querying Perplexity API',
      error: error.response?.data || error.message
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║            INSIGHT SYNERGY OPENAI SERVER                      ║
╠═══════════════════════════════════════════════════════════════╣
║ 🚀 Server running on http://localhost:${PORT}                   ║
║ 📡 API endpoints:                                             ║
║   GET  /api/status           - Check API connectivity         ║
║   POST /api/openai/4o-mini   - Use OpenAI GPT-4o-mini model   ║
║   POST /api/openai/o1-mini   - Use OpenAI GPT-4o model        ║
║   POST /api/perplexity       - Use Perplexity API             ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
