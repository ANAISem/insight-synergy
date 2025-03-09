import { NextRequest, NextResponse } from 'next/server';

// Adresse der Insight Core Backend-API
const INSIGHT_CORE_API_URL = process.env.INSIGHT_CORE_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // Status vom Insight Core Backend abrufen
    const response = await fetch(`${INSIGHT_CORE_API_URL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Kurzes Timeout setzen, damit die Anfrage nicht zu lange dauert
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      // Fallback-Status, wenn die API nicht erreichbar ist
      return NextResponse.json({
        status: 'offline',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        perplexity_available: false,
        primary_model_available: false,
        fallback_model_available: false,
        is_core_available: false,
        models: {
          primary: 'gpt-o1-mini',
          fallback: 'gpt-4o-mini',
          is_core: 'insight-synergy-core'
        }
      });
    }
    
    // API-Antwort
    const apiResponse = await response.json();
    
    // Erfolgreiche Antwort
    return NextResponse.json(apiResponse);
  } catch (error) {
    console.error('Fehler bei der Statusabfrage:', error);
    
    // Fallback-Status bei Fehlern
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      perplexity_available: false,
      primary_model_available: false,
      fallback_model_available: false,
      is_core_available: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      models: {
        primary: 'gpt-o1-mini',
        fallback: 'gpt-4o-mini',
        is_core: 'insight-synergy-core'
      }
    });
  }
} 