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
  Wifi,
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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

// Diese Typen werden jetzt aus der nexusAPI importiert
import { Expert, Message, DebateSession } from '@/lib/api/nexusAPI';
import { getDebateSocket, DebateSocketEventType } from '@/lib/websocket/debateSocket';

// Erweiterte Props für ExpertDebate mit WebSocket-bezogenen Eigenschaften
interface ExpertDebateProps {
  debateId?: string;
  initialData?: DebateSession | null;
  loading?: boolean;
  typingExperts?: string[];
  wsConnected?: boolean;
  onSendMessage?: (content: string) => boolean;
  onRateMessage?: (messageId: string, rating: 'helpful' | 'neutral' | 'unhelpful') => boolean;
  onToggleDebateStatus?: () => boolean;
  onExportDebate?: (format: 'markdown' | 'pdf' | 'json') => void;
}

// Mock-Daten für die Entwicklung - werden nur verwendet, wenn keine initialData vorhanden ist
const MOCK_EXPERTS: Expert[] = [
  {
    id: 'exp1',
    name: 'Dr. Anna Schmidt',
    specialty: 'Technologie-Ethikerin',
    perspective: 'Gesellschaftliche Auswirkungen',
    avatar: '/avatars/female-1.png',
    color: '#4f46e5'
  },
  {
    id: 'exp2',
    name: 'Prof. Markus Weber',
    specialty: 'KI-Forscher',
    perspective: 'Technische Machbarkeit',
    avatar: '/avatars/male-1.png',
    color: '#0891b2'
  },
  {
    id: 'exp3',
    name: 'Sophia Berger',
    specialty: 'Wirtschaftsanalystin',
    perspective: 'Ökonomische Perspektive',
    avatar: '/avatars/female-2.png',
    color: '#ca8a04'
  },
  {
    id: 'exp4',
    name: 'Dr. Thomas Müller',
    specialty: 'Psychologe',
    perspective: 'Kognitive Auswirkungen',
    avatar: '/avatars/male-2.png',
    color: '#be185d'
  }
];

const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg1',
    expertId: 'exp1',
    content: 'Bei der Betrachtung dieses Problems müssen wir zunächst die ethischen Implikationen bedenken. Neue Technologien verändern nicht nur unser Handeln, sondern auch unser Denken und unsere gesellschaftlichen Strukturen.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isFactChecked: true
  },
  {
    id: 'msg2',
    expertId: 'exp2',
    content: 'Aus technischer Sicht sind die von Ihnen beschriebenen Anforderungen umsetzbar, aber wir müssen die Grenzen der aktuellen KI-Modelle berücksichtigen. Large Language Models haben zwar beeindruckende Fähigkeiten, aber auch bekannte Einschränkungen bei komplexem Reasoning.',
    timestamp: new Date(Date.now() - 3000000).toISOString(),
    references: [
      {
        title: 'Limitations of LLMs in Complex Reasoning Tasks',
        url: 'https://example.com/llm-limitations'
      }
    ],
    isFactChecked: true
  },
  {
    id: 'msg3',
    expertId: 'exp3',
    content: 'Wenn wir die Wirtschaftlichkeit betrachten, sehe ich sowohl Chancen als auch Risiken. Die Implementierung solcher Systeme erfordert erhebliche Investitionen, aber das ROI-Potenzial ist beträchtlich, insbesondere durch Effizienzsteigerungen und neue Geschäftsmodelle.',
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    isFactChecked: false
  },
];

const MOCK_DEBATE: DebateSession = {
  id: 'debate1',
  topic: 'Künstliche Intelligenz in der Bildung',
  question: 'Wie kann KI effektiv in Bildungssysteme integriert werden, ohne bestehende Ungleichheiten zu verstärken?',
  experts: MOCK_EXPERTS,
  messages: MOCK_MESSAGES,
  status: 'active',
  createdAt: new Date(Date.now() - 7200000).toISOString(),
  updatedAt: new Date(Date.now() - 2400000).toISOString(),
  creditsUsed: 45
};

export function ExpertDebate({ 
  debateId,
  initialData,
  loading = false,
  typingExperts = [],
  wsConnected = false,
  onSendMessage,
  onRateMessage,
  onToggleDebateStatus,
  onExportDebate
}: ExpertDebateProps) {
  const [debate, setDebate] = useState<DebateSession | null>(initialData || null);
  const [userMessage, setUserMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeExpertId, setActiveExpertId] = useState<string | null>(null);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [typingExperts, setTypingExperts] = useState<Set<string>>(new Set());
  const [isWebsocketConnected, setIsWebsocketConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const socketRef = useRef<ReturnType<typeof getDebateSocket> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Lade die Debatte und richte WebSocket ein
  useEffect(() => {
    if (!debateId) return;
    
    const loadDebate = async () => {
      try {
        setLoading(true);
        const debateData = await nexusApi.getDebate(debateId);
        setDebate(debateData);
        setExperts(debateData.experts);
      } catch (error) {
        console.error('Fehler beim Laden der Debatte:', error);
        toast({
          variant: "destructive",
          title: "Fehler beim Laden",
          description: "Die Debatte konnte nicht geladen werden. Bitte versuche es später erneut.",
        });
      } finally {
        setLoading(false);
      }
    };

    // Lade die Debatte, wenn sie nicht als initialData übergeben wurde
    if (!initialData) {
      loadDebate();
    } else {
      setExperts(initialData.experts);
    }

    // WebSocket-Verbindung einrichten
    setupWebsocket(debateId);

    // Cleanup beim Unmounten
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [debateId, initialData, toast]);

  // WebSocket-Verbindung einrichten
  const setupWebsocket = (debateId: string) => {
    try {
      const socket = getDebateSocket(debateId, { debug: true });
      socketRef.current = socket;

      // Event-Handler registrieren
      socket.on(DebateSocketEventType.CONNECT, () => {
        setIsWebsocketConnected(true);
        toast({
          title: "Verbindung hergestellt",
          description: "Du bist jetzt mit der Echtzeit-Debatte verbunden.",
        });
      });

      socket.on(DebateSocketEventType.DISCONNECT, () => {
        setIsWebsocketConnected(false);
      });

      socket.on(DebateSocketEventType.ERROR, (error) => {
        console.error('WebSocket-Fehler:', error);
        toast({
          variant: "destructive",
          title: "Verbindungsfehler",
          description: "Es gab ein Problem mit der Echtzeit-Verbindung.",
        });
      });

      socket.on(DebateSocketEventType.MESSAGE_RECEIVED, (data) => {
        if (data && data.message) {
          addMessage(data.message);
        }
      });

      socket.on(DebateSocketEventType.TYPING_START, (data) => {
        if (data && data.expertId) {
          setTypingExperts(prev => new Set(prev).add(data.expertId));
        }
      });

      socket.on(DebateSocketEventType.TYPING_END, (data) => {
        if (data && data.expertId) {
          setTypingExperts(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.expertId);
            return newSet;
          });
        }
      });

      socket.on(DebateSocketEventType.FACT_CHECK_COMPLETE, (data) => {
        if (data && data.messageId) {
          updateMessageFactCheck(data.messageId, data.isFactChecked, data.sources);
        }
      });

      socket.on(DebateSocketEventType.DEBATE_STATUS, (data) => {
        if (data && data.status) {
          updateDebateStatus(data.status);
        }
      });

      // Verbindung herstellen
      socket.connect();
    } catch (error) {
      console.error('Fehler beim Einrichten der WebSocket-Verbindung:', error);
    }
  };

  // Behandelt eingehende Nachrichten
  const addMessage = useCallback((message: Message) => {
    setDebate(prevDebate => {
      if (!prevDebate) return null;
      
      // Prüfe, ob die Nachricht bereits existiert
      const exists = prevDebate.messages.some(m => m.id === message.id);
      if (exists) return prevDebate;
      
      // Füge die Nachricht am Ende hinzu
      return {
        ...prevDebate,
        messages: [...prevDebate.messages, message]
      };
    });
    
    // Entferne den Experten aus der Typing-Liste
    setTypingExperts(prev => {
      const newSet = new Set(prev);
      newSet.delete(message.expertId);
      return newSet;
    });
  }, []);

  // Aktualisiert den Faktencheck-Status einer Nachricht
  const updateMessageFactCheck = useCallback((messageId: string, isFactChecked: boolean, sources?: any[]) => {
    setDebate(prevDebate => {
      if (!prevDebate) return null;
      
      const updatedMessages = prevDebate.messages.map(message => {
        if (message.id === messageId) {
          return { 
            ...message, 
            isFactChecked,
            references: sources || message.references
          };
        }
        return message;
      });
      
      return {
        ...prevDebate,
        messages: updatedMessages
      };
    });
  }, []);

  // Aktualisiert den Status der Debatte
  const updateDebateStatus = useCallback((status: 'active' | 'paused' | 'completed') => {
    setDebate(prevDebate => {
      if (!prevDebate) return null;
      return {
        ...prevDebate,
        status
      };
    });
  }, []);

  // Auto-Scroll zu neuen Nachrichten
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [debate?.messages, typingExperts, autoScroll]);

  // Sende eine Nachricht
  const handleSendMessage = async () => {
    if (!userMessage.trim() || !debate || !socketRef.current) return;
    
    try {
      setSending(true);
      
      // Sende die Nachricht über den WebSocket
      const success = socketRef.current.sendUserMessage(userMessage.trim());
      
      if (success) {
        setUserMessage('');
        
        // Falls der WebSocket-Versand fehlschlägt, sende über die REST API
        if (!success) {
          toast({
            title: "Nachricht wird gesendet...",
            description: "Die Echtzeit-Verbindung ist nicht verfügbar. Wir senden deine Nachricht über eine Standardverbindung.",
          });
          
          // Fallback zur REST API
          await nexusApi.sendMessage(debate.id, userMessage.trim());
        }
      }
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Senden",
        description: "Deine Nachricht konnte nicht gesendet werden. Bitte versuche es später erneut.",
      });
    } finally {
      setSending(false);
    }
  };

  // Taste gedrückt Ereignis im Textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Strg+Enter zum Senden
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
    
    // User Typing Indikator
    if (socketRef.current && debate?.status === 'active') {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      socketRef.current.sendTypingStart();
      
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.sendTypingEnd();
        }
      }, 2000);
    }
  };

  // Bewerte eine Nachricht
  const handleReactionToMessage = async (messageId: string, rating: 'helpful' | 'neutral' | 'unhelpful') => {
    if (!debate) return;
    
    try {
      // Sende die Bewertung über den WebSocket
      if (socketRef.current) {
        socketRef.current.rateMessage(messageId, rating);
      } else {
        // Fallback zur REST API
        await nexusApi.rateMessage(debate.id, messageId, rating);
      }
      
      // Aktualisiere die UI
      setDebate(prevDebate => {
        if (!prevDebate) return null;
        
        const updatedMessages = prevDebate.messages.map(message => {
          if (message.id === messageId) {
            return {
              ...message,
              reactionScore: (message.reactionScore || 0) + (rating === 'helpful' ? 1 : rating === 'unhelpful' ? -1 : 0)
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
        title: rating === 'helpful' ? 'Als hilfreich bewertet' : rating === 'unhelpful' ? 'Als weniger hilfreich bewertet' : 'Neutrales Feedback',
        description: 'Danke für dein Feedback zur Expertenantwort.',
      });
    } catch (error) {
      console.error('Fehler beim Bewerten der Nachricht:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Deine Bewertung konnte nicht gespeichert werden.",
      });
    }
  };

  // Debattenstatus umschalten
  const handleToggleDebateStatus = async () => {
    if (!debate) return;
    
    const newStatus = debate.status === 'active' ? 'paused' : 'active';
    
    try {
      await nexusApi.updateDebateStatus(debate.id, newStatus);
      
      setDebate(prevDebate => {
        if (!prevDebate) return null;
        return {
          ...prevDebate,
          status: newStatus
        };
      });
      
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
        title: "Fehler",
        description: "Der Status der Debatte konnte nicht geändert werden.",
      });
    }
  };

  // Debatte exportieren
  const handleExportDebate = async (format: 'json' | 'markdown' | 'pdf') => {
    if (!debate) return;
    
    try {
      toast({
        title: "Export gestartet",
        description: `Die Debatte wird als ${format.toUpperCase()} exportiert.`,
      });
      
      // API-Aufruf zum Exportieren
      const result = await nexusApi.exportDebate(debate.id, format);
      
      if (result && result.url) {
        // URL zum Download auslösen
        const link = document.createElement('a');
        link.href = result.url;
        link.download = `debatte-${debate.id}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Export abgeschlossen",
          description: "Die Datei wurde heruntergeladen.",
        });
      }
    } catch (error) {
      console.error('Fehler beim Exportieren der Debatte:', error);
      toast({
        variant: "destructive",
        title: "Export fehlgeschlagen",
        description: "Die Debatte konnte nicht exportiert werden.",
      });
    }
  };

  // Nach Experte filtern
  const handleFilterByExpert = (expertId: string | null) => {
    setActiveExpertId(expertId);
  };

  // Verbindung zum WebSocket wiederherstellen
  const handleReconnect = () => {
    if (socketRef.current && !isWebsocketConnected && debateId) {
      socketRef.current.connect();
      
      toast({
        title: "Verbindung wird hergestellt...",
        description: "Versuche, die Echtzeit-Verbindung wiederherzustellen.",
      });
    }
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>{debate.topic}</CardTitle>
                {isWebsocketConnected ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="ml-2 bg-green-100 text-green-800">
                          <Wifi className="mr-1 h-3 w-3" />
                          Live
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Echtzeit-Verbindung aktiv
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 cursor-pointer" onClick={handleReconnect}>
                          <WifiOff className="mr-1 h-3 w-3" />
                          Offline
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Keine Echtzeit-Verbindung. Klicke zum Verbinden.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Badge variant={debate.status === 'active' ? 'default' : 'secondary'}>
                  {debate.status === 'active' ? 'Aktiv' : debate.status === 'paused' ? 'Pausiert' : 'Abgeschlossen'}
                </Badge>
              </div>
              <CardDescription className="mt-1 max-w-3xl">{debate.question}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleDebateStatus}
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
              <Select>
                <SelectTrigger className="w-40">
                  <Settings className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Optionen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="export-markdown" onClick={() => handleExportDebate('markdown')}>
                    Als Markdown exportieren
                  </SelectItem>
                  <SelectItem value="export-pdf" onClick={() => handleExportDebate('pdf')}>
                    Als PDF exportieren
                  </SelectItem>
                  <SelectItem value="export-json" onClick={() => handleExportDebate('json')}>
                    Als JSON exportieren
                  </SelectItem>
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
            {experts.map(expert => (
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
                {typingExperts.has(expert.id) && (
                  <span className="ml-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-white"></span>
                )}
              </Button>
            ))}
          </div>

          <div className="relative">
            <div className="h-[500px] overflow-y-auto rounded-md border p-4">
              <div className="space-y-6">
                {filteredMessages.map((message) => {
                  const expert = experts.find(e => e.id === message.expertId);
                  
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
                        
                        <div className={`mt-1 rounded-lg p-3 ${
                          message.status === 'typing' 
                            ? 'bg-muted animate-pulse' 
                            : 'bg-muted/50'
                        }`}>
                          {message.status === 'typing' ? (
                            <div className="flex items-center space-x-2">
                              <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></div>
                              <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0.2s' }}></div>
                              <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                          ) : (
                            message.content
                          )}
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
                            {message.reactionScore ? (message.reactionScore > 0 ? '+' : '') + message.reactionScore : '0'} Reaktionen
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Typing Indikatoren für Experten, die gerade tippen */}
                {Array.from(typingExperts).map(expertId => {
                  const expert = experts.find(e => e.id === expertId);
                  if (!expert || (activeExpertId && activeExpertId !== expertId)) return null;
                  
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
                            schreibt...
                          </span>
                        </div>
                        
                        <div className="mt-1 rounded-lg bg-muted/30 p-3">
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
            
            <div className="absolute bottom-4 right-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-scroll"
                        checked={autoScroll}
                        onCheckedChange={setAutoScroll}
                      />
                      <Label htmlFor="auto-scroll" className="text-xs cursor-pointer">Auto-Scroll</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Automatisch zu neuen Nachrichten scrollen
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-end gap-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                placeholder="Stelle eine Frage oder gib einen Diskussionspunkt ein..."
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[80px]"
                disabled={debate.status !== 'active' || sending}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Drücke <kbd className="rounded border px-1 py-0.5 text-xs">Strg</kbd> + <kbd className="rounded border px-1 py-0.5 text-xs">Enter</kbd> zum Senden
              </p>
            </div>
            <Button 
              onClick={handleSendMessage} 
              disabled={!userMessage.trim() || debate.status !== 'active' || sending}
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
            {experts.map(expert => (
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
                  {expert.background && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {expert.background}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 