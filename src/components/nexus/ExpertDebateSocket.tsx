'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  Loader2, 
  RefreshCw,
  Download,
  Settings,
  Pause,
  Play,
  CheckCircle,
  Link as LinkIcon,
  X,
  AlertCircle,
  MessageCircle,
  Zap,
  WifiOff
} from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Expert, Message, DebateSession, nexusApi } from '@/lib/api/nexusAPI';
import { NexusSocket, useNexusSocket, NexusSocketManager } from '@/lib/websocket/nexusSocket';

export function ExpertDebateSocket({ 
  debateId,
  initialData
}: { 
  debateId: string;
  initialData?: DebateSession;
}) {
  const [debate, setDebate] = useState<DebateSession | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [sending, setSending] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [experts, setExperts] = useState<Expert[]>([]);
  const [activeExpertId, setActiveExpertId] = useState<string | null>(null);
  const [typingExperts, setTypingExperts] = useState<string[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = useNexusSocket(debateId);
  const { toast } = useToast();
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Lade die Debatte, wenn sie nicht als initialData übergeben wurde
  useEffect(() => {
    if (!initialData && debateId) {
      loadDebate();
    }
  }, [debateId, initialData]);

  // Verbinde mit dem WebSocket, wenn die Debatte geladen ist
  useEffect(() => {
    if (debate) {
      connectToSocket();
    }

    return () => {
      // Beim Unmount wird die Socket-Verbindung geschlossen
      NexusSocketManager.getInstance().closeConnection(debateId);
    };
  }, [debate]);

  // Scrolle zum Ende der Nachrichten, wenn neue hinzukommen
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [debate?.messages, typingExperts]);

  // WebSocket-Event-Listener registrieren
  useEffect(() => {
    if (!socket) return;

    // Event-Handler für die Socket-Verbindung
    const handleConnection = () => {
      setSocketConnected(true);
      setConnectionError(null);
      toast({
        title: "Mit Debatte verbunden",
        description: "Du bist jetzt live mit der Expertendebatte verbunden.",
      });
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
      toast({
        variant: "destructive",
        title: "Verbindung getrennt",
        description: "Die Verbindung zur Expertendebatte wurde unterbrochen.",
      });
    };

    const handleReconnecting = () => {
      toast({
        title: "Verbindung wird wiederhergestellt",
        description: "Versuche, die Verbindung zur Debatte wiederherzustellen...",
      });
    };

    const handleReconnected = () => {
      setSocketConnected(true);
      setConnectionError(null);
      toast({
        title: "Verbindung wiederhergestellt",
        description: "Die Verbindung zur Expertendebatte wurde wiederhergestellt.",
      });
    };

    const handleMessage = (data: { message: Message }) => {
      if (!debate) return;

      // Aktualisiere die Nachrichtenliste
      setDebate(prevDebate => {
        if (!prevDebate) return null;
        
        // Prüfe, ob die Nachricht bereits vorhanden ist
        const messageExists = prevDebate.messages.some(m => m.id === data.message.id);
        if (messageExists) return prevDebate;
        
        // Entferne den Experten aus der "typing"-Liste
        setTypingExperts(prev => prev.filter(id => id !== data.message.expertId));
        
        // Füge die neue Nachricht hinzu
        return {
          ...prevDebate,
          messages: [...prevDebate.messages, data.message]
        };
      });

      // Sound oder andere Benachrichtigung könnte hier hinzugefügt werden
    };

    const handleExpertTyping = (data: { expertId: string, isTyping: boolean }) => {
      if (data.isTyping) {
        // Experte beginnt zu tippen
        setTypingExperts(prev => {
          if (prev.includes(data.expertId)) return prev;
          return [...prev, data.expertId];
        });
        
        // Setze einen Timeout, um den Tipp-Status zu löschen, falls keine Aktualisierung erfolgt
        if (typingTimeoutsRef.current[data.expertId]) {
          clearTimeout(typingTimeoutsRef.current[data.expertId]);
        }
        
        typingTimeoutsRef.current[data.expertId] = setTimeout(() => {
          setTypingExperts(prev => prev.filter(id => id !== data.expertId));
        }, 5000);
      } else {
        // Experte hört auf zu tippen
        setTypingExperts(prev => prev.filter(id => id !== data.expertId));
        if (typingTimeoutsRef.current[data.expertId]) {
          clearTimeout(typingTimeoutsRef.current[data.expertId]);
        }
      }
    };

    const handleDebateUpdate = (data: { status: 'active' | 'paused' | 'completed' }) => {
      if (!debate) return;
      
      setDebate(prevDebate => {
        if (!prevDebate) return null;
        return {
          ...prevDebate,
          status: data.status
        };
      });
      
      toast({
        title: "Debattenstatus aktualisiert",
        description: `Die Debatte ist jetzt ${
          data.status === 'active' ? 'aktiv' : 
          data.status === 'paused' ? 'pausiert' : 'abgeschlossen'
        }.`,
      });
    };

    const handleServerError = (error: any) => {
      toast({
        variant: "destructive",
        title: "Server-Fehler",
        description: error.message || "Ein Fehler ist auf dem Server aufgetreten.",
      });
    };

    // Event-Listener registrieren
    socket.on('connection', handleConnection);
    socket.on('disconnection', handleDisconnect);
    socket.on('reconnecting', handleReconnecting);
    socket.on('reconnected', handleReconnected);
    socket.on('message', handleMessage);
    socket.on('expert_typing', handleExpertTyping);
    socket.on('debate_update', handleDebateUpdate);
    socket.on('server_error', handleServerError);

    // Event-Listener beim Cleanup entfernen
    return () => {
      socket.off('connection', handleConnection);
      socket.off('disconnection', handleDisconnect);
      socket.off('reconnecting', handleReconnecting);
      socket.off('reconnected', handleReconnected);
      socket.off('message', handleMessage);
      socket.off('expert_typing', handleExpertTyping);
      socket.off('debate_update', handleDebateUpdate);
      socket.off('server_error', handleServerError);
      
      // Timeouts löschen
      Object.values(typingTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      typingTimeoutsRef.current = {};
    };
  }, [socket, debate, toast]);

  // Lade die Debatte vom Server
  const loadDebate = async () => {
    try {
      setLoading(true);
      setConnectionError(null);
      const debateData = await nexusApi.getDebate(debateId);
      setDebate(debateData);
      setExperts(debateData.experts);
    } catch (error: any) {
      console.error('Fehler beim Laden der Debatte:', error);
      setConnectionError(error.message || 'Die Debatte konnte nicht geladen werden.');
      toast({
        variant: "destructive",
        title: "Fehler beim Laden",
        description: error.message || "Die Debatte konnte nicht geladen werden.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Verbinde mit dem WebSocket
  const connectToSocket = async () => {
    try {
      const authToken = localStorage.getItem('auth_token');
      await socket.connect(authToken || undefined);
    } catch (error: any) {
      console.error('Fehler bei der WebSocket-Verbindung:', error);
      setConnectionError(error.message || 'Verbindung zur Debatte fehlgeschlagen.');
      toast({
        variant: "destructive",
        title: "Verbindungsfehler",
        description: error.message || "Verbindung zur Debatte fehlgeschlagen.",
      });
    }
  };

  // Sende eine Nachricht an die Debatte
  const handleSendMessage = () => {
    if (!userMessage.trim() || !socket || !socket.isConnected() || !debate) {
      return;
    }
    
    setSending(true);
    
    // Sende die Nachricht über WebSocket
    const success = socket.sendMessage(userMessage.trim());
    
    if (success) {
      setUserMessage('');
      
      // Optimistisches UI-Update: Zeige "Experten tippen..." an
      toast({
        title: "Nachricht gesendet",
        description: "Die Experten analysieren deine Frage.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Nachricht konnte nicht gesendet werden",
        description: "Bitte versuche es später erneut.",
      });
    }
    
    setSending(false);
  };

  // Reagiere auf eine Expertenantwort
  const handleReactionToMessage = (messageId: string, reaction: 'helpful' | 'neutral' | 'unhelpful') => {
    if (!socket || !socket.isConnected() || !debate) {
      toast({
        variant: "destructive",
        title: "Keine Verbindung",
        description: "Du bist nicht mit der Debatte verbunden.",
      });
      return;
    }
    
    // Sende die Bewertung über WebSocket
    const success = socket.rateMessage(messageId, reaction);
    
    if (success) {
      // Optimistisches UI-Update
      setDebate(prevDebate => {
        if (!prevDebate) return null;
        
        const updatedMessages = prevDebate.messages.map(message => {
          if (message.id === messageId) {
            // Einfache Logik für das Update des Reaktionsscores
            const deltaScore = reaction === 'helpful' ? 1 : reaction === 'unhelpful' ? -1 : 0;
            return {
              ...message,
              reactionScore: (message.reactionScore || 0) + deltaScore
            };
          }
          return message;
        });
        
        return {
          ...prevDebate,
          messages: updatedMessages
        };
      });
      
      toast({
        title: reaction === 'helpful' ? 'Als hilfreich bewertet' : 
              reaction === 'unhelpful' ? 'Als nicht hilfreich bewertet' : 
              'Neutrale Bewertung',
        description: "Danke für dein Feedback."
      });
    }
  };

  // Ändere den Status der Debatte
  const handleToggleDebateStatus = () => {
    if (!socket || !socket.isConnected() || !debate) {
      toast({
        variant: "destructive",
        title: "Keine Verbindung",
        description: "Du bist nicht mit der Debatte verbunden.",
      });
      return;
    }
    
    const newStatus = debate.status === 'active' ? 'paused' : 'active';
    
    // Sende die Statusänderung über WebSocket
    const success = socket.updateDebateStatus(newStatus);
    
    if (success) {
      // Keine UI-Aktualisierung nötig, da wir auf das Server-Event warten
      toast({
        title: "Status-Änderung gesendet",
        description: `Die Debatte wird ${newStatus === 'active' ? 'fortgesetzt' : 'pausiert'}...`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Status konnte nicht geändert werden",
        description: "Bitte versuche es später erneut.",
      });
    }
  };

  // Fordere eine Antwort von einem bestimmten Experten an
  const handleRequestExpert = (expertId: string) => {
    if (!socket || !socket.isConnected() || !debate) {
      toast({
        variant: "destructive",
        title: "Keine Verbindung",
        description: "Du bist nicht mit der Debatte verbunden.",
      });
      return;
    }
    
    // Sende die Anfrage über WebSocket
    const success = socket.requestExpertResponse(expertId, userMessage.trim());
    
    if (success) {
      setUserMessage('');
      
      // Optimistisches UI-Update
      const expert = debate.experts.find(e => e.id === expertId);
      
      if (expert) {
        toast({
          title: "Experte angefordert",
          description: `${expert.name} wurde um eine Antwort gebeten.`,
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Anfrage konnte nicht gesendet werden",
        description: "Bitte versuche es später erneut.",
      });
    }
  };

  // Handle für den Export der Debatte
  const handleExportDebate = async (format: 'markdown' | 'pdf' | 'json') => {
    try {
      toast({
        title: "Export gestartet",
        description: `Die Debatte wird als ${format.toUpperCase()} exportiert...`,
      });
      
      const result = await nexusApi.exportDebate(debateId, format);
      
      // Erstelle einen Download-Link
      const url = window.URL.createObjectURL(new Blob([JSON.stringify(result)]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `debatte-${debateId}.${format}`);
      document.body.appendChild(link);
      link.click();
      
      toast({
        title: "Export abgeschlossen",
        description: "Die Datei wurde heruntergeladen.",
      });
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      toast({
        variant: "destructive",
        title: "Export fehlgeschlagen",
        description: "Die Debatte konnte nicht exportiert werden.",
      });
    }
  };

  // Filtere nach einem bestimmten Experten
  const handleFilterByExpert = (expertId: string | null) => {
    setActiveExpertId(expertId);
  };

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

  if (connectionError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Verbindungsfehler</AlertTitle>
        <AlertDescription>
          {connectionError}
          <div className="mt-4">
            <Button onClick={loadDebate} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Erneut versuchen
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!debate) {
    return (
      <div className="rounded-lg border border-destructive p-6 text-center">
        <h3 className="mb-2 text-lg font-medium">Debatte nicht gefunden</h3>
        <p className="text-muted-foreground">Die angeforderte Expertendebatte existiert nicht oder ist nicht verfügbar.</p>
      </div>
    );
  }

  // Filtere Nachrichten nach aktivem Experten
  const filteredMessages = activeExpertId 
    ? debate.messages.filter(message => message.expertId === activeExpertId)
    : debate.messages;

  return (
    <div className="flex flex-col space-y-4">
      {/* Verbindungsstatus-Anzeige */}
      {!socketConnected && (
        <Alert variant="warning" className="bg-amber-50 dark:bg-amber-950">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Nicht verbunden</AlertTitle>
          <AlertDescription>
            Du bist nicht mit der Live-Debatte verbunden. Du siehst möglicherweise nicht die neuesten Nachrichten.
            <div className="mt-2">
              <Button onClick={connectToSocket} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Verbinden
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{debate.topic}</CardTitle>
              <CardDescription className="mt-1 max-w-3xl">{debate.question}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <ConnectionStatus connected={socketConnected} />
              <DebateStatus status={debate.status} />
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleDebateStatus}
                disabled={!socketConnected}
              >
                {debate.status === 'active' ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Pausieren
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Fortsetzen
                  </>
                )}
              </Button>
              <Select onValueChange={(value) => {
                if (value.startsWith('export-')) {
                  handleExportDebate(value.replace('export-', '') as any);
                }
              }}>
                <SelectTrigger className="w-40">
                  <Settings className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Optionen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="export-markdown">Als Markdown exportieren</SelectItem>
                  <SelectItem value="export-pdf">Als PDF exportieren</SelectItem>
                  <SelectItem value="export-json">Als JSON exportieren</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                const expert = debate.experts.find(e => e.id === message.expertId);
                
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
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Faktengeprüft
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 rounded-lg p-3 bg-muted/50">
                        {message.content}
                      </div>
                      
                      {message.references && message.references.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-muted-foreground">Quellen:</span>
                          <div className="mt-1 space-y-1">
                            {message.references.map((ref, i) => (
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
                          disabled={!socketConnected}
                          className="h-8 px-2"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReactionToMessage(message.id, 'unhelpful')}
                          disabled={!socketConnected}
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

              {/* Anzeige von "Experte tippt..." */}
              {typingExperts.map(expertId => {
                const expert = debate.experts.find(e => e.id === expertId);
                if (!expert) return null;

                if (activeExpertId && activeExpertId !== expertId) return null;
                
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
                        <span className="text-xs text-muted-foreground">schreibt...</span>
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
                disabled={debate.status !== 'active' || sending || !socketConnected}
              />
            </div>
            <Button 
              onClick={handleSendMessage} 
              disabled={!userMessage.trim() || debate.status !== 'active' || sending || !socketConnected}
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
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleRequestExpert(expert.id)}
                      disabled={!socketConnected || debate.status !== 'active'}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Antwort anfordern
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Verbindungsstatus-Anzeige
function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={connected ? "outline" : "secondary"} className={`${connected ? 'border-green-500 bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            {connected ? (
              <>
                <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
                Live
              </>
            ) : (
              <>
                <WifiOff className="mr-1 h-3 w-3" />
                Offline
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {connected 
            ? "Du bist in Echtzeit mit der Debatte verbunden" 
            : "Du bist nicht mit der Debatte verbunden"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Debattenstatus-Anzeige
function DebateStatus({ status }: { status: 'active' | 'paused' | 'completed' }) {
  let badgeClass = '';
  let icon;
  let label = '';

  switch (status) {
    case 'active':
      badgeClass = 'border-green-500 bg-green-50 text-green-700';
      icon = <Zap className="mr-1 h-3 w-3" />;
      label = 'Aktiv';
      break;
    case 'paused':
      badgeClass = 'border-amber-500 bg-amber-50 text-amber-700';
      icon = <Pause className="mr-1 h-3 w-3" />;
      label = 'Pausiert';
      break;
    case 'completed':
      badgeClass = 'border-blue-500 bg-blue-50 text-blue-700';
      icon = <CheckCircle className="mr-1 h-3 w-3" />;
      label = 'Abgeschlossen';
      break;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={badgeClass}>
            {icon}
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {status === 'active' 
            ? "Die Debatte ist aktiv, Experten antworten in Echtzeit" 
            : status === 'paused'
            ? "Die Debatte ist pausiert, Experten antworten derzeit nicht"
            : "Die Debatte ist abgeschlossen"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 