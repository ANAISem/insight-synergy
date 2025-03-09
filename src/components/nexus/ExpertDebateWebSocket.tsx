'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  WebSocketManager, 
  WebSocketMessage, 
  useDebateSocket 
} from '@/lib/websocket/WebSocketManager';
import { Expert, Message, DebateSession } from '@/lib/api/nexusAPI';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  MessageSquare, 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  Loader2, 
  RefreshCw,
  CheckCircle,
  Link as LinkIcon,
  Wifi,
  WifiOff
} from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { apiService } from '@/lib/api/apiService';

// Die grundlegende ExpertDebate-Komponente wird erweitert, um WebSocket-Funktionalität zu unterstützen
export function ExpertDebateWebSocket({ 
  debateId,
  initialData,
  onDebateUpdate
}: { 
  debateId: string;
  initialData?: DebateSession;
  onDebateUpdate?: (debate: DebateSession) => void;
}) {
  const [debate, setDebate] = useState<DebateSession | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [sending, setSending] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [activeExpertId, setActiveExpertId] = useState<string | null>(null);
  const [typingExperts, setTypingExperts] = useState<Set<string>>(new Set());
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // WebSocket-Verbindung einrichten
  const socket = useDebateSocket(debateId);
  
  // Initial Debate-Daten laden, wenn nicht übergeben
  useEffect(() => {
    if (!initialData && debateId) {
      loadDebate();
    }
  }, [debateId]);
  
  // Lade Debatte-Daten vom Server
  const loadDebate = async () => {
    try {
      setLoading(true);
      const debateData = await apiService.nexus.getDebate(debateId);
      setDebate(debateData);
      
      // Callback für Parent-Komponente
      if (onDebateUpdate) {
        onDebateUpdate(debateData);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Debatte:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Laden",
        description: "Die Expertendebatte konnte nicht geladen werden.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Verbinde WebSocket und richte Event-Handler ein
  useEffect(() => {
    // Verbindung herstellen
    socket.connect().catch(error => {
      console.error('Fehler beim Verbinden mit WebSocket:', error);
    });
    
    // Event-Handler registrieren
    const connectHandler = () => {
      setWsConnected(true);
      toast({
        title: "Verbindung hergestellt",
        description: "Echtzeit-Aktualisierungen sind jetzt aktiv.",
      });
    };
    
    const disconnectHandler = () => {
      setWsConnected(false);
      toast({
        variant: "destructive",
        title: "Verbindung unterbrochen",
        description: "Die Echtzeit-Verbindung wurde unterbrochen. Versuche erneut zu verbinden...",
      });
    };
    
    const expertTypingHandler = (message: WebSocketMessage) => {
      const { expertId, isTyping } = message.payload;
      
      setTypingExperts(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(expertId);
        } else {
          newSet.delete(expertId);
        }
        return newSet;
      });
    };
    
    const expertMessageHandler = (message: WebSocketMessage) => {
      const newMessage: Message = message.payload.message;
      
      // Entferne den Experten aus der Typing-Liste
      setTypingExperts(prev => {
        const newSet = new Set(prev);
        newSet.delete(newMessage.expertId);
        return newSet;
      });
      
      // Füge die neue Nachricht zum aktuellen Debate-State hinzu
      setDebate(prevDebate => {
        if (!prevDebate) return null;
        
        const updatedMessages = [...prevDebate.messages, newMessage];
        const updatedDebate = {
          ...prevDebate,
          messages: updatedMessages
        };
        
        // Callback für Parent-Komponente
        if (onDebateUpdate) {
          onDebateUpdate(updatedDebate);
        }
        
        return updatedDebate;
      });
    };
    
    const factCheckResultHandler = (message: WebSocketMessage) => {
      const { messageId, isFactChecked, sources } = message.payload;
      
      // Aktualisiere die Message mit den Fact-Check-Ergebnissen
      setDebate(prevDebate => {
        if (!prevDebate) return null;
        
        const updatedMessages = prevDebate.messages.map(msg => 
          msg.id === messageId 
            ? { ...msg, isFactChecked, sources: sources || msg.sources } 
            : msg
        );
        
        const updatedDebate = {
          ...prevDebate,
          messages: updatedMessages
        };
        
        // Callback für Parent-Komponente
        if (onDebateUpdate) {
          onDebateUpdate(updatedDebate);
        }
        
        return updatedDebate;
      });
      
      // Zeige eine Benachrichtigung, wenn Fact-Checking abgeschlossen ist
      toast({
        title: "Faktenprüfung abgeschlossen",
        description: isFactChecked 
          ? "Die Antwort wurde auf Faktentreue überprüft und bestätigt." 
          : "Bei der Faktenprüfung wurden mögliche Ungenauigkeiten gefunden.",
        variant: isFactChecked ? "default" : "destructive"
      });
    };
    
    const debateUpdateHandler = (message: WebSocketMessage) => {
      const updatedDebate: DebateSession = message.payload.debate;
      
      setDebate(updatedDebate);
      
      // Callback für Parent-Komponente
      if (onDebateUpdate) {
        onDebateUpdate(updatedDebate);
      }
      
      toast({
        title: "Debatte aktualisiert",
        description: `Status: ${getStatusText(updatedDebate.status)}`,
      });
    };
    
    // Event-Listener registrieren
    socket.on('connect', connectHandler);
    socket.on('disconnect', disconnectHandler);
    socket.on('expert_typing', expertTypingHandler);
    socket.on('expert_message', expertMessageHandler);
    socket.on('fact_check_result', factCheckResultHandler);
    socket.on('debate_update', debateUpdateHandler);
    
    // Cleanup beim Unmounten
    return () => {
      socket.off('connect', connectHandler);
      socket.off('disconnect', disconnectHandler);
      socket.off('expert_typing', expertTypingHandler);
      socket.off('expert_message', expertMessageHandler);
      socket.off('fact_check_result', factCheckResultHandler);
      socket.off('debate_update', debateUpdateHandler);
    };
  }, [debateId, socket]);
  
  // Automatisches Scrollen zu neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [debate?.messages, typingExperts]);
  
  // Benutzernachricht senden
  const handleSendMessage = async () => {
    if (!userMessage.trim() || !debate) return;
    
    try {
      setSending(true);
      
      // Sende die Nachricht an das Backend
      await apiService.nexus.sendMessage(debateId, userMessage);
      
      // Direkt über WebSocket wird die Antwort kommen, daher nur State zurücksetzen
      setUserMessage('');
      
      toast({
        title: "Nachricht gesendet",
        description: "Die Experten werden nun antworten.",
      });
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      toast({
        variant: "destructive",
        title: "Senden fehlgeschlagen",
        description: "Die Nachricht konnte nicht gesendet werden.",
      });
    } finally {
      setSending(false);
    }
  };
  
  // Bewertung einer Nachricht senden
  const handleReactionToMessage = async (messageId: string, reaction: 'helpful' | 'neutral' | 'unhelpful') => {
    if (!debate) return;
    
    try {
      await apiService.nexus.rateMessage(debateId, messageId, reaction);
      
      toast({
        title: "Bewertung gesendet",
        description: "Danke für dein Feedback zur Expertenantwort.",
      });
    } catch (error) {
      console.error('Fehler beim Bewerten der Nachricht:', error);
      toast({
        variant: "destructive",
        title: "Bewertung fehlgeschlagen",
        description: "Die Bewertung konnte nicht gespeichert werden.",
      });
    }
  };
  
  // Status der Debatte ändern (pausieren/fortsetzen)
  const handleToggleDebateStatus = async () => {
    if (!debate) return;
    
    const newStatus = debate.status === 'active' ? 'paused' : 'active';
    
    try {
      await apiService.nexus.updateDebateStatus(debateId, newStatus);
      
      // Die Aktualisierung kommt über WebSocket zurück, daher hier keine State-Änderung
      toast({
        title: newStatus === 'active' ? 'Debatte fortgesetzt' : 'Debatte pausiert',
        description: newStatus === 'active' 
          ? 'Die Experten werden wieder antworten.' 
          : 'Die Experten werden keine weiteren Antworten geben, bis du fortsetzt.',
      });
    } catch (error) {
      console.error('Fehler beim Ändern des Debattenstatus:', error);
      toast({
        variant: "destructive",
        title: "Statusänderung fehlgeschlagen",
        description: "Der Status der Debatte konnte nicht geändert werden.",
      });
    }
  };
  
  // Nach Experte filtern
  const handleFilterByExpert = (expertId: string | null) => {
    setActiveExpertId(expertId);
  };
  
  // Hilfsfunktion für Statustext
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'paused': return 'Pausiert';
      case 'completed': return 'Abgeschlossen';
      default: return status;
    }
  };
  
  // Rendere Ladeansicht
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Lade Expertendebatte...</p>
        </div>
      </div>
    );
  }
  
  // Rendere Fehlerzustand
  if (!debate) {
    return (
      <div className="rounded-lg border border-destructive p-6 text-center">
        <h3 className="mb-2 text-lg font-medium">Debatte nicht gefunden</h3>
        <p className="text-muted-foreground">Die angeforderte Expertendebatte existiert nicht oder ist nicht verfügbar.</p>
        <Button onClick={loadDebate} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Erneut versuchen
        </Button>
      </div>
    );
  }
  
  // Filtere Nachrichten nach aktivem Experten
  const filteredMessages = activeExpertId 
    ? debate.messages.filter(message => message.expertId === activeExpertId)
    : debate.messages;
    
  // Erstelle eine Map für schnellen Experten-Lookup
  const expertsMap = Object.fromEntries(
    debate.experts.map(expert => [expert.id, expert])
  );
  
  return (
    <div className="flex flex-col space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <CardTitle>{debate.topic}</CardTitle>
                <ConnectionStatus connected={wsConnected} />
              </div>
              <CardDescription className="mt-1 max-w-3xl">{debate.question}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleDebateStatus}
              disabled={debate.status === 'completed'}
            >
              {debate.status === 'active' ? 'Pausieren' : 'Fortsetzen'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button 
              variant={activeExpertId === null ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterByExpert(null)}
            >
              Alle Experten
            </Button>
            {debate.experts.map(expert => (
              <Button
                key={expert.id}
                variant={activeExpertId === expert.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterByExpert(expert.id)}
                style={{ 
                  backgroundColor: activeExpertId === expert.id ? expert.color : undefined,
                  borderColor: expert.color,
                  color: activeExpertId === expert.id ? 'white' : expert.color
                }}
              >
                {expert.name}
              </Button>
            ))}
          </div>

          <div className="h-[500px] overflow-y-auto rounded-md border p-4">
            <div className="space-y-6">
              {filteredMessages.map((message) => {
                const expert = expertsMap[message.expertId];
                
                if (!expert) return null;
                
                return (
                  <div key={message.id} className="flex gap-4">
                    <Avatar>
                      <AvatarImage src={expert.avatar} />
                      <AvatarFallback style={{ backgroundColor: expert.color }}>
                        {expert.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: expert.color }}>
                          {expert.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {expert.specialty}
                        </span>
                        {message.isFactChecked && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Faktengeprüft
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Diese Antwort wurde auf Faktentreue überprüft</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      
                      <div className="mt-1 rounded-lg p-3 bg-muted/50">
                        {message.content}
                      </div>
                      
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-muted-foreground">Quellen:</span>
                          <div className="mt-1 space-y-1">
                            {message.sources.map((ref, i) => (
                              <a 
                                key={i}
                                href={ref.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                              >
                                <LinkIcon className="mr-1 h-3 w-3" />
                                {ref.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2 flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReactionToMessage(message.id, 'helpful')}
                          className="h-8 px-2"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReactionToMessage(message.id, 'unhelpful')}
                          className="h-8 px-2"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {message.reactionScore || 0} Reaktionen
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Typing-Indikatoren */}
              {Array.from(typingExperts).map(expertId => {
                const expert = expertsMap[expertId];
                if (!expert) return null;
                
                return (
                  <div key={`typing-${expertId}`} className="flex gap-4">
                    <Avatar>
                      <AvatarImage src={expert.avatar} />
                      <AvatarFallback style={{ backgroundColor: expert.color }}>
                        {expert.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: expert.color }}>
                          {expert.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          tippt...
                        </span>
                      </div>
                      
                      <div className="mt-1 rounded-lg p-3 bg-muted animate-pulse">
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></div>
                          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0.2s' }}></div>
                          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-end gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="Stelle eine Frage oder gib einen Diskussionspunkt ein..."
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                className="min-h-[80px]"
                disabled={debate.status !== 'active' || sending || !wsConnected}
              />
            </div>
            <Button 
              onClick={handleSendMessage} 
              disabled={!userMessage.trim() || debate.status !== 'active' || sending || !wsConnected}
              className="h-10"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Senden...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Senden
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Experten in dieser Debatte</CardTitle>
          <CardDescription>Diese Experten diskutieren das Thema aus unterschiedlichen Perspektiven</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {debate.experts.map(expert => (
              <Card key={expert.id} className="overflow-hidden">
                <div className="h-2" style={{ backgroundColor: expert.color }} />
                <CardHeader className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={expert.avatar} />
                      <AvatarFallback style={{ backgroundColor: expert.color }}>
                        {expert.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{expert.name}</CardTitle>
                      <CardDescription className="text-xs">{expert.specialty}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 py-3">
                  <p className="text-sm">
                    <span className="font-medium">Perspektive:</span> {expert.perspective}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Komponente für den WebSocket-Verbindungsstatus
function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center rounded-full px-2 py-1 ${
            connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {connected ? (
              <>
                <Wifi className="mr-1 h-3 w-3" />
                <span className="text-xs">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="mr-1 h-3 w-3" />
                <span className="text-xs">Offline</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {connected 
              ? 'Echtzeit-Verbindung aktiv: Du erhältst Updates in Echtzeit'
              : 'Keine Echtzeit-Verbindung: Einige Funktionen sind eingeschränkt'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 