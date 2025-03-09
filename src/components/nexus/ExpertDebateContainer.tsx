'use client';

import { useState, useEffect } from 'react';
import { getNexusWebSocket, NexusEventType, NexusWebSocketEvent } from '@/lib/websocket/nexusWebSocket';
import { Expert, Message, DebateSession } from '@/lib/api/nexusAPI';
import { ExpertDebate } from './ExpertDebate';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ExpertDebateContainerProps {
  debateId: string;
  initialData?: DebateSession;
}

export function ExpertDebateContainer({ debateId, initialData }: ExpertDebateContainerProps) {
  const [debate, setDebate] = useState<DebateSession | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingExperts, setTypingExperts] = useState<string[]>([]);
  const { toast } = useToast();
  const { data: session } = useSession();
  const userId = session?.user?.id || 'anonymous-user';

  // Effekt für die WebSocket-Verbindung
  useEffect(() => {
    if (!debateId || !userId) return;

    const wsClient = getNexusWebSocket(debateId, userId);
    let mounted = true;

    // Verbindungsstatus-Handler
    const handleConnect = () => {
      if (mounted) {
        setConnected(true);
        setConnecting(false);
        toast({
          title: "Verbunden",
          description: "Echtzeit-Verbindung zur Expertendebatte hergestellt",
        });
      }
    };

    // Verbindungsfehler-Handler
    const handleError = (event: NexusWebSocketEvent) => {
      if (mounted) {
        setError(`Verbindungsfehler: ${event.payload?.message || 'Unbekannter Fehler'}`);
        setConnecting(false);
        setConnected(false);
        toast({
          variant: "destructive",
          title: "Verbindungsfehler",
          description: "Die Verbindung zur Expertendebatte konnte nicht hergestellt werden.",
        });
      }
    };

    // Verbindungstrennung-Handler
    const handleDisconnect = () => {
      if (mounted) {
        setConnected(false);
        toast({
          variant: "default",
          title: "Verbindung getrennt",
          description: "Die Verbindung zur Expertendebatte wurde getrennt.",
        });
      }
    };

    // Experten-Nachricht-Handler
    const handleExpertMessage = (event: NexusWebSocketEvent) => {
      if (!mounted || !event.payload) return;

      // Experten-Nachricht zum Debattenverlauf hinzufügen
      setDebate((currentDebate) => {
        if (!currentDebate) return null;

        // Überprüfe, ob die Nachricht bereits existiert
        const messageExists = currentDebate.messages.some(msg => msg.id === event.payload.id);
        if (messageExists) return currentDebate;

        // Erzeuge neue Nachricht
        const newMessage: Message = {
          id: event.payload.id,
          expertId: event.payload.expertId,
          content: event.payload.content,
          timestamp: event.payload.timestamp || new Date().toISOString(),
          references: event.payload.references,
          isFactChecked: event.payload.isFactChecked || false,
          reactionScore: 0
        };

        // Entferne den Experten aus der Liste der tippenden Experten
        setTypingExperts(prev => prev.filter(id => id !== event.payload.expertId));

        // Aktualisiere die Debatte mit der neuen Nachricht
        return {
          ...currentDebate,
          messages: [...currentDebate.messages, newMessage]
        };
      });
    };

    // Experte-tippt-Handler
    const handleExpertTyping = (event: NexusWebSocketEvent) => {
      if (!mounted || !event.payload) return;

      const expertId = event.payload.expertId;
      
      // Füge den Experten zur Liste der tippenden Experten hinzu
      setTypingExperts(prev => {
        if (prev.includes(expertId)) return prev;
        return [...prev, expertId];
      });
      
      // Entferne den Experten nach einer gewissen Zeit wieder aus der Liste
      setTimeout(() => {
        setTypingExperts(prev => prev.filter(id => id !== expertId));
      }, 3000);
    };

    // Debattenstatus-Änderungs-Handler
    const handleDebateStatusChanged = (event: NexusWebSocketEvent) => {
      if (!mounted || !event.payload) return;

      setDebate(currentDebate => {
        if (!currentDebate) return null;
        
        return {
          ...currentDebate,
          status: event.payload.status
        };
      });

      toast({
        title: event.payload.status === 'active' ? "Debatte fortgesetzt" : "Debatte pausiert",
        description: event.payload.status === 'active' 
          ? "Die Experten nehmen ihre Diskussion wieder auf." 
          : "Die Experten haben ihre Diskussion pausiert."
      });
    };

    // Faktenprüfungs-Ergebnis-Handler
    const handleFactCheckResult = (event: NexusWebSocketEvent) => {
      if (!mounted || !event.payload) return;

      setDebate(currentDebate => {
        if (!currentDebate) return null;
        
        // Finde die Nachricht und aktualisiere den Faktenprüfungsstatus
        const updatedMessages = currentDebate.messages.map(message => {
          if (message.id === event.payload.messageId) {
            return {
              ...message,
              isFactChecked: true,
              references: event.payload.sources || message.references
            };
          }
          return message;
        });
        
        return {
          ...currentDebate,
          messages: updatedMessages
        };
      });
    };

    // Registriere Event-Handler
    wsClient.on(NexusEventType.CONNECT, handleConnect);
    wsClient.on(NexusEventType.ERROR, handleError);
    wsClient.on(NexusEventType.DISCONNECT, handleDisconnect);
    wsClient.on(NexusEventType.EXPERT_MESSAGE, handleExpertMessage);
    wsClient.on(NexusEventType.EXPERT_TYPING, handleExpertTyping);
    wsClient.on(NexusEventType.DEBATE_STATUS_CHANGED, handleDebateStatusChanged);
    wsClient.on(NexusEventType.FACT_CHECK_RESULT, handleFactCheckResult);

    // Stelle die Verbindung her
    if (!wsClient.isConnected()) {
      setConnecting(true);
      wsClient.connect().catch(err => {
        console.error('WebSocket-Verbindung fehlgeschlagen:', err);
        if (mounted) {
          setError('Verbindung zur Expertendebatte konnte nicht hergestellt werden.');
          setConnecting(false);
        }
      });
    } else {
      setConnected(true);
    }

    // Bereinige beim Unmounten
    return () => {
      mounted = false;
      wsClient.off(NexusEventType.CONNECT, handleConnect);
      wsClient.off(NexusEventType.ERROR, handleError);
      wsClient.off(NexusEventType.DISCONNECT, handleDisconnect);
      wsClient.off(NexusEventType.EXPERT_MESSAGE, handleExpertMessage);
      wsClient.off(NexusEventType.EXPERT_TYPING, handleExpertTyping);
      wsClient.off(NexusEventType.DEBATE_STATUS_CHANGED, handleDebateStatusChanged);
      wsClient.off(NexusEventType.FACT_CHECK_RESULT, handleFactCheckResult);
    };
  }, [debateId, userId, toast]);

  // Handler für das Senden einer Nachricht
  const handleSendMessage = (content: string) => {
    if (!debateId || !userId || !content.trim()) return false;
    
    const wsClient = getNexusWebSocket(debateId, userId);
    return wsClient.sendMessage(content);
  };

  // Handler für die Bewertung einer Nachricht
  const handleRateMessage = (messageId: string, rating: 'helpful' | 'neutral' | 'unhelpful') => {
    if (!debateId || !userId) return false;
    
    const wsClient = getNexusWebSocket(debateId, userId);
    return wsClient.rateMessage(messageId, rating);
  };

  // Handler für das Pausieren/Fortsetzen der Debatte
  const handleToggleDebateStatus = () => {
    if (!debateId || !userId || !debate) return false;
    
    const wsClient = getNexusWebSocket(debateId, userId);
    
    if (debate.status === 'active') {
      return wsClient.pauseDebate();
    } else {
      return wsClient.resumeDebate();
    }
  };

  // Handler für das Exportieren der Debatte
  const handleExportDebate = (format: 'markdown' | 'pdf' | 'json') => {
    // Diese Funktion würde in der tatsächlichen Implementierung über die API aufgerufen werden
    toast({
      title: "Export wird vorbereitet",
      description: `Die Debatte wird als ${format.toUpperCase()} exportiert...`,
    });
    
    // Simuliere einen Erfolg nach kurzer Zeit
    setTimeout(() => {
      toast({
        title: "Export abgeschlossen",
        description: "Die Datei wurde zum Download bereitgestellt.",
      });
    }, 1500);
  };

  // Handler für erneuten Verbindungsversuch
  const handleReconnect = () => {
    if (!debateId || !userId) return;
    
    setConnecting(true);
    setError(null);
    
    const wsClient = getNexusWebSocket(debateId, userId);
    wsClient.connect()
      .then(() => {
        toast({
          title: "Verbunden",
          description: "Verbindung zur Expertendebatte wiederhergestellt.",
        });
      })
      .catch(err => {
        console.error('Wiederverbindung fehlgeschlagen:', err);
        setError('Verbindung konnte nicht wiederhergestellt werden.');
        toast({
          variant: "destructive",
          title: "Verbindungsfehler",
          description: "Die Verbindung konnte nicht wiederhergestellt werden.",
        });
      })
      .finally(() => {
        setConnecting(false);
      });
  };

  // Zeige Fehlermeldung, wenn ein Fehler aufgetreten ist
  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-6 text-center">
        <h3 className="mb-2 text-lg font-medium">Verbindungsfehler</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button 
          onClick={handleReconnect} 
          disabled={connecting}
          className="mx-auto"
        >
          {connecting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Verbinde...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Erneut verbinden
            </>
          )}
        </Button>
      </div>
    );
  }

  // Übergib alle Props an die ExpertDebate-Komponente
  return (
    <ExpertDebate
      debateId={debateId}
      initialData={debate}
      loading={loading}
      typingExperts={typingExperts}
      onSendMessage={handleSendMessage}
      onRateMessage={handleRateMessage}
      onToggleDebateStatus={handleToggleDebateStatus}
      onExportDebate={handleExportDebate}
      wsConnected={connected}
    />
  );
} 