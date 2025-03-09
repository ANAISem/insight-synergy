import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, createAdminClient } from '@/lib/supabase/client';

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
    
    // Sessions-Daten aus der Anfrage lesen
    const sessionData = await request.json();
    
    // Formatieren der Daten für die Datenbank
    const userSession = {
      user_id: userId,
      title: sessionData.title || 'Unbenannte Sitzung',
      content: sessionData.content || {},
      model_used: sessionData.model_used || 'unknown',
      tokens_used: sessionData.tokens_used || 0
    };
    
    // Sitzung in der Datenbank speichern
    const { data: insertedSession, error } = await adminClient
      .from('user_sessions')
      .insert(userSession)
      .select('id')
      .single();
    
    if (error) {
      console.error('Fehler beim Speichern der Sitzung:', error);
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Sitzung' },
        { status: 500 }
      );
    }
    
    // Erfolgreiche Antwort
    return NextResponse.json({
      id: insertedSession.id,
      message: 'Sitzung erfolgreich gespeichert'
    });
  } catch (error) {
    console.error('Unerwarteter Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
    
    // URL-Parameter für Paginierung
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const page = parseInt(url.searchParams.get('page') || '0');
    const offset = page * limit;
    
    // Admin-Client für Datenbankoperationen
    const adminClient = createAdminClient();
    
    // Sitzungen des Benutzers abrufen
    const { data: sessions, error, count } = await adminClient
      .from('user_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Fehler beim Abrufen der Sitzungen:', error);
      return NextResponse.json(
        { error: 'Fehler beim Abrufen der Sitzungen' },
        { status: 500 }
      );
    }
    
    // Erfolgreiche Antwort
    return NextResponse.json({
      sessions,
      count,
      page,
      limit
    });
  } catch (error) {
    console.error('Unerwarteter Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 