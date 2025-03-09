import { NextRequest, NextResponse } from 'next/server';
import { getInsightSynergyCore } from '@/lib/insightSynergy';
import { db } from '@/lib/db';

/**
 * PUT /api/nexus/session/[id]/status
 * Aktualisiert den Status einer Nexus Session (active, paused, completed).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const core = await getInsightSynergyCore();
    const { status } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    if (!status || !['active', 'paused', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (active, paused, completed)' },
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
    
    // Status in der Datenbank aktualisieren
    const updatedSession = await db.nexusSessions.update({
      where: { id: sessionId },
      data: { 
        status,
        lastUpdated: new Date() 
      }
    });
    
    // Den Core über die Statusänderung informieren
    await core.events.emit('nexus-session-status-changed', { 
      sessionId, 
      status,
      previousStatus: existingSession.status
    });
    
    return NextResponse.json({ 
      success: true,
      session: updatedSession
    });
  } catch (error) {
    console.error(`Error updating nexus session status ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update session status' },
      { status: 500 }
    );
  }
} 