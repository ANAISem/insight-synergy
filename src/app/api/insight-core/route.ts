/**
 * API-Proxy für Insight Core
 * 
 * Diese Route leitet Anfragen an den Insight Core Backend-Service weiter
 * und handhabt Authentifizierung, CORS und Fehlerbehandlung.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Insight Core Backend-URL aus Umgebungsvariablen
const INSIGHT_CORE_API_URL = process.env.INSIGHT_CORE_API_URL || 'http://localhost:8000';

/**
 * GET-Handler für API-Anfragen
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleApiRequest(request, 'GET', params?.path);
}

/**
 * POST-Handler für API-Anfragen
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleApiRequest(request, 'POST', params?.path);
}

/**
 * PUT-Handler für API-Anfragen
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleApiRequest(request, 'PUT', params?.path);
}

/**
 * PATCH-Handler für API-Anfragen
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleApiRequest(request, 'PATCH', params?.path);
}

/**
 * DELETE-Handler für API-Anfragen
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleApiRequest(request, 'DELETE', params?.path);
}

/**
 * Gemeinsame Funktion zur Handhabung aller API-Anfragen
 */
async function handleApiRequest(
  request: NextRequest,
  method: string,
  pathSegments: string[] = []
) {
  try {
    // Baue die URL für die Weiterleitung zusammen
    const url = new URL(request.nextUrl.pathname.replace(/^\/api\/insight-core/, ''), INSIGHT_CORE_API_URL);
    
    // Kopiere Query-Parameter
    url.search = request.nextUrl.search;
    
    // Hole das JWT-Token für die Authentifizierung
    const token = await getToken({ req: request as any });
    
    // Bereite die Anfrage-Header vor
    const headers = new Headers(request.headers);
    
    // Entferne Host-Header, da er vom Fetch-API gesetzt wird
    headers.delete('host');
    
    // Füge Authentifizierungsheader hinzu, wenn ein Token vorhanden ist
    if (token) {
      headers.set('Authorization', `Bearer ${token.accessToken}`);
    }
    
    // Lese den Request-Body für nicht-GET-Anfragen
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      body = await request.text();
    }
    
    // Führe die Anfrage an das Backend durch
    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
      cache: 'no-store',
    });
    
    // Erstelle eine neue Response mit den Daten aus dem Backend
    const backendResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    });
    
    return backendResponse;
  } catch (error) {
    console.error('API-Proxy-Fehler:', error);
    
    // Gib einen Fehler zurück, wenn etwas schiefgeht
    return NextResponse.json(
      { 
        error: 'Ein Fehler ist beim Zugriff auf den Backend-Service aufgetreten',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
} 