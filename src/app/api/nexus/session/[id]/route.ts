import { NextRequest, NextResponse } from 'next/server';
import { getInsightSynergyCore } from '@/lib/insightSynergy';
import { db } from '@/lib/db';

/**
 * GET /api/nexus/session/[id]
 * Ruft eine einzelne Nexus Session anhand ihrer ID ab.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Session aus der Datenbank abrufen
    const session = await db.nexusSessions.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(session);
  } catch (error) {
    console.error(`Error fetching nexus session ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/nexus/session/[id]
 * Aktualisiert eine vorhandene Nexus Session.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const core = await getInsightSynergyCore();
    const updateData = await req.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Prüfen, ob die Session existiert
    const existingSession = await db.nexusSessions.findUnique({
      where: { id: sessionId }
    });
    
    if (!existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Nicht erlaubte Felder entfernen
    delete updateData.id; // ID kann nicht geändert werden
    delete updateData.created; // Erstellungsdatum kann nicht geändert werden
    
    // Letzte Aktualisierung immer auf jetzt setzen
    updateData.lastUpdated = new Date();
    
    // Session in der Datenbank aktualisieren
    const updatedSession = await db.nexusSessions.update({
      where: { id: sessionId },
      data: updateData
    });
    
    // Den Core über die Aktualisierung informieren
    await core.events.emit('nexus-session-updated', { 
      sessionId, 
      updates: updateData 
    });
    
    return NextResponse.json({ 
      success: true,
      session: updatedSession
    });
  } catch (error) {
    console.error(`Error updating nexus session ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/nexus/session/[id]
 * Löscht eine Nexus Session.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const core = await getInsightSynergyCore();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Prüfen, ob die Session existiert
    const existingSession = await db.nexusSessions.findUnique({
      where: { id: sessionId }
    });
    
    if (!existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Session aus der Datenbank löschen
    await db.nexusSessions.delete({
      where: { id: sessionId }
    });
    
    // Den Core über die Löschung informieren
    await core.events.emit('nexus-session-deleted', { sessionId });
    
    return NextResponse.json({ 
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error(`Error deleting nexus session ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
} 