import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, createAdminClient } from '@/lib/supabase/client';
import { NexusRequest } from '@/lib/insight-core/api-client';

// Adresse der Insight Core Backend-API
const INSIGHT_CORE_API_URL = process.env.INSIGHT_CORE_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    // Supabase-Client für Authentifizierung
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Prüfen, ob der Benutzer authentifiziert ist
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }
    
    // Benutzerdaten extrahieren
    const userId = session.user.id;
    
    // Admin-Client für Datenbankoperationen
    const adminClient = createAdminClient();
    
    // Benutzereinstellungen abrufen
    const { data: userSettings, error: settingsError } = await adminClient
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (settingsError) {
      console.error('Fehler beim Abrufen der Benutzereinstellungen:', settingsError);
      return NextResponse.json(
        { error: 'Fehler beim Abrufen der Benutzereinstellungen' },
        { status: 500 }
      );
    }
    
    // Benutzerguthaben abrufen
    const { data: userCredits, error: creditsError } = await adminClient
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (creditsError) {
      console.error('Fehler beim Abrufen des Benutzerguthabens:', creditsError);
      return NextResponse.json(
        { error: 'Fehler beim Abrufen des Benutzerguthabens' },
        { status: 500 }
      );
    }
    
    // Prüfen, ob der Benutzer genug Guthaben hat
    if (!userCredits || userCredits.available_credits <= 0) {
      return NextResponse.json(
        { error: 'Nicht genügend Guthaben' },
        { status: 402 }
      );
    }
    
    // API-Anfrage parsen
    const requestData: NexusRequest = await request.json();
    
    // Voreinstellungen aus Benutzereinstellungen anwenden
    const defaultModel = userSettings?.default_model || 'gpt-o1-mini';
    
    // Anfrage an Insight Core Backend senden
    const response = await fetch(`${INSIGHT_CORE_API_URL}/api/solutions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fehler bei der API-Anfrage:', errorText);
      return NextResponse.json(
        { error: 'Fehler bei der API-Anfrage' },
        { status: response.status }
      );
    }
    
    // API-Antwort
    const apiResponse = await response.json();
    
    // Kosten berechnen (vereinfacht)
    const tokensUsed = apiResponse.token_count || 0;
    const costPerToken = 0.000001; // Anpassbar je nach Modell
    const cost = tokensUsed * costPerToken;
    
    // API-Nutzung protokollieren
    await adminClient.from('api_usage').insert({
      user_id: userId,
      endpoint: 'solutions',
      tokens_used: tokensUsed,
      model_used: apiResponse.model_used,
      status: 'success',
      cost: cost
    });
    
    // Guthaben aktualisieren
    await adminClient.from('user_credits').update({
      available_credits: userCredits.available_credits - 1, // 1 Credit pro Anfrage
      updated_at: new Date().toISOString()
    }).eq('user_id', userId);
    
    // Transaktion protokollieren
    await adminClient.from('credit_transactions').insert({
      user_id: userId,
      amount: -1,
      transaction_type: 'api_usage',
      description: `API-Anfrage: Lösungsgenerierung`
    });
    
    // Erfolgreiche Antwort
    return NextResponse.json(apiResponse);
  } catch (error) {
    console.error('Unerwarteter Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 