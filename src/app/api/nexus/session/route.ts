import { NextRequest, NextResponse } from 'next/server';
import { getInsightSynergyCore } from '@/lib/insightSynergy';
import { Expert } from '@/components/nexus/NexusChatInterface';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';

/**
 * POST /api/nexus/session
 * Erstellt eine neue Nexus Session mit den angegebenen Experten.
 */
export async function POST(req: NextRequest) {
  try {
    const core = await getInsightSynergyCore();
    const { title, experts } = await req.json();
    
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Generiere eine eindeutige Session-ID
    const sessionId = uuidv4();
    
    // Standardexperten verwenden, falls keine angegeben sind
    const selectedExperts = experts || [
      {
        id: 'tech-expert',
        name: 'Tech Expert',
        avatar: '/avatars/tech-expert.png',
        expertise: ['Technical Implementation', 'Code Architecture', 'Performance'],
        bio: 'Specializes in technical implementation details and system architecture optimization.',
        characteristics: ['Precise', 'Detail-oriented', 'Systematic']
      },
      {
        id: 'ux-expert',
        name: 'UX Specialist',
        avatar: '/avatars/ux-expert.png',
        expertise: ['User Experience', 'Interface Design', 'Usability'],
        bio: 'Focuses on creating seamless user experiences and intuitive interface designs.',
        characteristics: ['Creative', 'User-focused', 'Empathetic']
      },
      {
        id: 'system-architect',
        name: 'System Architect',
        avatar: '/avatars/system-architect.png',
        expertise: ['System Design', 'Integration', 'Scalability'],
        bio: 'Expert in designing scalable system architectures and complex integrations.',
        characteristics: ['Strategic', 'Visionary', 'Analytical']
      },
      {
        id: 'ai-specialist',
        name: 'AI Specialist',
        avatar: '/avatars/ai-specialist.png',
        expertise: ['Machine Learning', 'Neural Networks', 'Data Science'],
        bio: 'Specializes in advanced AI algorithms and cognitive system implementation.',
        characteristics: ['Innovative', 'Research-oriented', 'Technical']
      }
    ];
    
    // Session-Daten für die Datenbank vorbereiten
    const sessionData = {
      id: sessionId,
      title,
      description: `Multi-expert collaborative session: ${title}`,
      created: new Date(),
      lastUpdated: new Date(),
      participants: selectedExperts,
      messages: [],
      status: 'active',
      tags: ['insight-synergy', 'multi-expert'],
      settings: {
        debateMode: true,
        cognitiveAnalysis: true,
        realTimeProcessing: true,
        autoSummarize: false
      }
    };
    
    // In der Datenbank speichern
    await db.nexusSessions.create(sessionData);
    
    // Den Core über die neue Session informieren
    await core.events.emit('nexus-session-created', { sessionId, title });
    
    return NextResponse.json({ 
      sessionId,
      success: true,
      message: 'Session created successfully'
    });
  } catch (error) {
    console.error('Error creating nexus session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nexus/session
 * Ruft alle verfügbaren Nexus Sessions ab.
 */
export async function GET(req: NextRequest) {
  try {
    // Abfrage-Parameter für Filterung und Sortierung
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    
    // Basis-Abfrage erstellen
    const query: any = {};
    
    // Status-Filter hinzufügen, falls angegeben
    if (status) {
      query.status = status;
    }
    
    // Sessions aus der Datenbank abrufen
    const sessions = await db.nexusSessions.findMany({
      where: query,
      orderBy: { lastUpdated: 'desc' },
      take: limit,
      skip: offset
    });
    
    // Gesamtanzahl für Pagination
    const total = await db.nexusSessions.count({ where: query });
    
    return NextResponse.json({
      sessions,
      pagination: {
        total,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Error fetching nexus sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
} 