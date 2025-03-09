/**
 * Nexus WebSocket API-Route für Expertendebatten
 * 
 * Diese Route implementiert eine WebSocket-Verbindung für Echtzeit-Kommunikation
 * in Expertendebatten. Sie verwendet Server-Sent Events für Streaming-Antworten.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

interface NexusClient {
  id: string;
  debateId: string;
  userId: string;
  controller: ReadableStreamDefaultController;
  lastActivity: number;
}

// Aktive WebSocket-Verbindungen nach Debatten-ID
const activeConnections = new Map<string, NexusClient[]>();

/**
 * GET-Handler für WebSocket-Verbindungen
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { debateId: string } }
) {
  const debateId = params.debateId;
  
  // Extrahiere Benutzer-ID aus der Anfrage
  const userId = new URL(request.url).searchParams.get('userId') || 'anonymous';
  
  // Erstelle eine neue ReadableStream-Instanz
  const stream = new ReadableStream({
    start: (controller) => {
      // Erstelle einen eindeutigen Client-Identifier
      const clientId = uuidv4();
      
      // Erstelle einen neuen Client
      const client: NexusClient = {
        id: clientId,
        debateId,
        userId,
        controller,
        lastActivity: Date.now()
      };
      
      // Füge den Client zu den aktiven Verbindungen hinzu
      if (!activeConnections.has(debateId)) {
        activeConnections.set(debateId, []);
      }
      
      activeConnections.get(debateId)?.push(client);
      
      // Log der Verbindung
      console.log(`WebSocket-Verbindung hergestellt: Client ${clientId} für Debatte ${debateId}`);
      
      // Sende eine Willkommensnachricht
      const connectEvent = {
        type: 'connect',
        debateId,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        payload: {
          clientId,
          message: 'Verbindung hergestellt'
        }
      };
      
      // Sende die Willkommensnachricht
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(connectEvent)}\n\n`));
      
      // Sende eine Nachricht an alle anderen Clients, dass ein neuer Benutzer beigetreten ist
      broadcastToDebate(debateId, {
        type: 'user_joined',
        debateId,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        payload: {
          userId
        }
      }, [clientId]);
      
      // Simuliere Beitritt eines Experten nach kurzer Zeit
      setTimeout(() => {
        broadcastToDebate(debateId, {
          type: 'expert_joined',
          debateId,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          payload: {
            expertId: 'exp1',
            name: 'Dr. Anna Schmidt'
          }
        });
      }, 1500);
      
      // Heartbeat-Intervall für Verbindungsprüfung
      const heartbeatInterval = setInterval(() => {
        // Sende Heartbeat alle 30 Sekunden
        try {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
            type: 'heartbeat',
            id: uuidv4(),
            timestamp: new Date().toISOString()
          })}\n\n`));
          
          // Aktualisiere Zeitstempel der letzten Aktivität
          client.lastActivity = Date.now();
        } catch (error) {
          // Verbindung wurde geschlossen
          clearInterval(heartbeatInterval);
          
          // Entferne den Client aus den aktiven Verbindungen
          removeClient(debateId, clientId);
        }
      }, 30000);
      
      // Bereinige die Verbindung, wenn der Client die Verbindung trennt
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        removeClient(debateId, clientId);
        console.log(`WebSocket-Verbindung getrennt: Client ${clientId} für Debatte ${debateId}`);
      });
    }
  });
  
  // Gib die Stream-Antwort zurück
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

/**
 * POST-Handler für eingehende Nachrichten über WebHooks
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { debateId: string } }
) {
  const debateId = params.debateId;
  
  try {
    // Parse den Anfragekörper
    const data = await request.json();
    
    // Sende eine Nachricht an alle verbundenen Clients
    broadcastToDebate(debateId, {
      ...data,
      id: data.id || uuidv4(),
      timestamp: data.timestamp || new Date().toISOString(),
      debateId
    });
    
    // Simuliere eine Expertenantwort nach einer Verzögerung, wenn es eine Benutzernachricht ist
    if (data.type === 'user_message') {
      handleUserMessage(debateId, data);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Verarbeiten der WebSocket-Nachricht:', error);
    return NextResponse.json({ success: false, error: 'Ungültiges Nachrichtenformat' }, { status: 400 });
  }
}

/**
 * Sendet eine Nachricht an alle Clients einer Debatte
 */
function broadcastToDebate(debateId: string, message: any, excludeClientIds: string[] = []) {
  const clients = activeConnections.get(debateId) || [];
  const messageStr = `data: ${JSON.stringify(message)}\n\n`;
  const encodedMessage = new TextEncoder().encode(messageStr);
  
  for (const client of clients) {
    if (!excludeClientIds.includes(client.id)) {
      try {
        client.controller.enqueue(encodedMessage);
      } catch (error) {
        // Verbindung ist wahrscheinlich geschlossen
        removeClient(debateId, client.id);
      }
    }
  }
}

/**
 * Entfernt einen Client aus den aktiven Verbindungen
 */
function removeClient(debateId: string, clientId: string) {
  const clients = activeConnections.get(debateId) || [];
  const updatedClients = clients.filter(client => client.id !== clientId);
  
  if (updatedClients.length > 0) {
    activeConnections.set(debateId, updatedClients);
  } else {
    activeConnections.delete(debateId);
  }
  
  // Teile allen anderen Clients mit, dass ein Benutzer die Debatte verlassen hat
  broadcastToDebate(debateId, {
    type: 'user_left',
    debateId,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    payload: {
      clientId
    }
  });
}

/**
 * Verarbeitet eine Benutzernachricht und erzeugt Expertenantworten
 */
function handleUserMessage(debateId: string, data: any) {
  const content = data.payload?.content;
  
  if (!content) return;
  
  // Simuliere, dass ein Experte tippt
  setTimeout(() => {
    broadcastToDebate(debateId, {
      type: 'expert_typing',
      debateId,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      payload: {
        expertId: 'exp1'
      }
    });
  }, 500);
  
  // Simuliere eine Expertenantwort nach einer Verzögerung
  setTimeout(() => {
    // Sende die Expertenantwort
    const messageId = uuidv4();
    broadcastToDebate(debateId, {
      type: 'expert_message',
      debateId,
      id: messageId,
      timestamp: new Date().toISOString(),
      payload: {
        id: messageId,
        expertId: 'exp1',
        content: `Zu Ihrer Frage "${content}" möchte ich Folgendes anmerken: Es ist wichtig, verschiedene Perspektiven zu berücksichtigen. Aus ethischer Sicht sollten wir bedenken, dass technologische Entwicklungen sowohl Chancen als auch Risiken mit sich bringen.`,
        isFactChecked: false
      }
    });
    
    // Simuliere ein Faktenprüfungsergebnis nach einer weiteren Verzögerung
    setTimeout(() => {
      broadcastToDebate(debateId, {
        type: 'fact_check_result',
        debateId,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        payload: {
          messageId,
          verified: true,
          sources: [
            {
              title: 'Ethik der Künstlichen Intelligenz',
              url: 'https://example.com/ai-ethics'
            }
          ]
        }
      });
    }, 2000);
    
    // Simuliere, dass ein zweiter Experte tippt
    setTimeout(() => {
      broadcastToDebate(debateId, {
        type: 'expert_typing',
        debateId,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        payload: {
          expertId: 'exp2'
        }
      });
      
      // Und dann eine Antwort sendet
      setTimeout(() => {
        broadcastToDebate(debateId, {
          type: 'expert_message',
          debateId,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          payload: {
            id: uuidv4(),
            expertId: 'exp2',
            content: `Aus technischer Perspektive möchte ich ergänzen, dass "${content}" verschiedene Implementierungsansätze erfordert. Die aktuellen KI-Modelle bieten bereits gute Lösungsansätze, haben aber auch Limitierungen bei komplexen Aufgaben.`,
            isFactChecked: true,
            references: [
              {
                title: 'Aktuelle Entwicklungen im Bereich KI',
                url: 'https://example.com/ai-developments'
              }
            ]
          }
        });
      }, 2000);
    }, 3000);
  }, 3000);
}

/**
 * Bereinigungsjob für inaktive Verbindungen
 */
function startCleanupJob() {
  setInterval(() => {
    const now = Date.now();
    
    activeConnections.forEach((clients, debateId) => {
      const inactiveClients = clients.filter(client => now - client.lastActivity > 60000);
      
      for (const client of inactiveClients) {
        console.log(`Inaktive Verbindung geschlossen: Client ${client.id} für Debatte ${debateId}`);
        removeClient(debateId, client.id);
      }
    });
  }, 60000);
}

// Starte den Bereinigungsjob in der Serverumgebung
if (typeof global !== 'undefined') {
  startCleanupJob();
} 