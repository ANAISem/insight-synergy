'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDebateWebSocket, WebSocketEvent, MessageType } from '@/lib/api/websocket/NexusWebSocket';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  MessageSquare, 
  Send as SendIcon, 
  RefreshCw, 
  Users, 
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  InfoCircle,
  Server
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TypingIndicator } from './TypingIndicator';
import { Progress } from '@/components/ui/progress';
import { useFactChecking } from '@/hooks/use-fact-checking';
import { FactCheckResult } from '@/services/fact-checking.service';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { apiService } from '@/services/api.service';
import { factCheckingService } from '@/services/fact-checking.service';
import { cognitiveLoopService } from '@/services/cognitive-loop.service';
import { 
  AdvancedValidationResult, 
  PromptAnalysisResult, 
  EnhancedValidationResult 
} from '@/services/cognitive-loop.service';
import { useI18n } from '@/hooks/use-i18n';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { apiManager } from '@/services/api-manager.service';
import { ApiDiagnostics } from '@/components/api/api-diagnostics';

// Typen für die Komponente
interface DebateRealtimeProps {
  debateId: string;
  initialExperts: Expert[];
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
}

export interface Expert {
  id: string;
  name: string;
  specialty: string;
  avatar?: string;
  color?: string;
}

interface Message {
  id: string;
  expertId: string;
  content: string;
  timestamp: string;
  factChecked?: boolean;
  factCheckResult?: FactCheckResult;
  sources?: { 
    title: string; 
    url: string;
    reliability?: number;
    relevance?: number;
  }[];
  advancedValidation?: AdvancedValidationResult;
}

interface TypingState {
  expertId: string;
  startTime: number;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempt?: number;
  error?: string;
}

export function DebateRealtime({
  debateId,
  initialExperts,
  onConnectionStatusChange
}: DebateRealtimeProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [messageInput, setMessageInput] = useState('');
  const [typingExperts, setTypingExperts] = useState<string[]>([]);
  const [debateContext, setDebateContext] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const webSocketRef = useRef<WebSocket | null>(null);
  const { isChecking, checkStatement, validateSource } = useFactChecking();
  const [factCheckQueue, setFactCheckQueue] = useState<string[]>([]);
  const { toast } = useToast();
  
  const { t } = useI18n();
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 Sekunden
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // WebSocket-Verbindung herstellen
  const webSocket = useDebateWebSocket(debateId, { debug: true });
  
  // Initialisiere API-Manager
  useEffect(() => {
    const initApi = async () => {
      const connected = await apiManager.initialize();
      if (!connected) {
        handleApiUnavailable();
      } else {
        connectWebSocket();
      }
    };
    
    initApi();
    
    return () => {
      // Bereinige die WebSocket-Verbindung beim Unmount
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, []);
  
  // Behandlung wenn API nicht verfügbar ist
  const handleApiUnavailable = () => {
    setApiError(apiManager.getStatus().lastError || t('api.error.unavailable'));
    handleOfflineMode();
    
    toast({
      variant: "destructive",
      title: t('api.error.unavailable'),
      description: t('api.diagnosis.check_connection'),
      action: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDiagnostics(true)}
        >
          {t('api.diagnosis.run')}
        </Button>
      ),
    });
  };

  const connectWebSocket = async () => {
    try {
      setApiError(null);
      setIsReconnecting(true);
      
      // Prüfe API-Verfügbarkeit
      if (!apiManager.getStatus().isConnected) {
        await apiManager.findAvailableEndpoint();
        
        if (!apiManager.getStatus().isConnected) {
          handleApiUnavailable();
          return;
        }
      }
      
      const endpoint = apiManager.getStatus().currentEndpoint;
      if (!endpoint) {
        throw new Error(t('api.error.no_endpoint'));
      }
      
      // Verbindung zum WebSocket über den verfügbaren Endpunkt herstellen
      const wsEndpoint = endpoint.url.replace(/^http/, 'ws');
      const ws = new WebSocket(`${wsEndpoint}/debates/${debateId}/ws`);
      webSocketRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket verbunden');
        setIsConnected(true);
        setIsReconnecting(false);
        setApiError(null);
        setOfflineMode(false);
        updateConnectionStatus(true, false);
        
        // Initial alle vorhandenen Nachrichten laden
        fetchDebateHistory();
        
        toast({
          title: t('connection.established'),
          description: t('connection.ready'),
        });
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket geschlossen', event);
        if (isConnected) {
          setIsConnected(false);
          updateConnectionStatus(false, false);
          
          toast({
            variant: "warning",
            title: t('connection.lost'),
            description: t('connection.try_reconnect'),
          });
          
          // Automatischer Wiederverbindungsversuch
          setTimeout(() => {
            if (reconnectAttempt < maxReconnectAttempts) {
              handleReconnect();
            } else {
              handleOfflineMode();
            }
          }, reconnectDelay);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket Fehler', error);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
    } catch (err) {
      console.error("Fehler beim Verbinden:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setApiError(errorMessage);
      
      toast({
        variant: "destructive",
        title: t('connection.api_error'),
        description: errorMessage,
      });
      
      handleOfflineMode();
    }
  };
  
  // Lade Debatte-Historie über REST API
  const fetchDebateHistory = async () => {
    try {
      const endpoint = apiManager.getStatus().currentEndpoint;
      if (!endpoint) return;
      
      const response = await apiManager.callApi<{messages: Message[]}>(`debates/${debateId}/messages`);
      
      if (response.messages && Array.isArray(response.messages)) {
        setMessages(response.messages);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Debatte-Historie:", error);
    }
  };
  
  // Behandle WebSocket-Nachrichten
  const handleWebSocketMessage = (data: any) => {
    if (data.type === 'message') {
      const newMessage: Message = {
        id: data.id,
        expertId: data.expertId,
        content: data.content,
        timestamp: data.timestamp || new Date().toISOString()
      };
      
      setMessages(prev => [...prev, newMessage]);
      setFactCheckQueue(prev => [...prev, newMessage.id]);
      
    } else if (data.type === 'typing') {
      if (data.isTyping) {
        setTypingExperts(prev => [...prev.filter(id => id !== data.expertId), data.expertId]);
      } else {
        setTypingExperts(prev => prev.filter(id => id !== data.expertId));
      }
    }
  };
  
  const handleOfflineMode = () => {
    setIsConnected(false);
    setIsReconnecting(false);
    setOfflineMode(true);
    updateConnectionStatus(false, false);
    
    // Offline-Demo-Nachrichten anzeigen
    const offlineMessages: Message[] = initialExperts.slice(0, 2).map((expert, index) => ({
      id: `offline-${index}`,
      expertId: expert.id,
      content: index === 0 
        ? t('offline.demo_message1') 
        : t('offline.demo_message2'),
      timestamp: new Date().toISOString(),
      factChecked: false
    }));
    
    setMessages(offlineMessages);
  };

  // Automatischer Wiederverbindungsversuch
  useEffect(() => {
    if (!isConnected && !isReconnecting && apiError && reconnectAttempt < maxReconnectAttempts) {
      const timer = setTimeout(() => {
        handleReconnect();
      }, reconnectDelay);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, isReconnecting, apiError, reconnectAttempt]);
  
  // Automatisches Scrollen bei neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingExperts]);
  
  // Entferne Typing-Status nach Timeout
  useEffect(() => {
    const TYPING_TIMEOUT = 3000; // 3 Sekunden
    
    const interval = setInterval(() => {
      const now = Date.now();
      
      setTypingExperts(prev => 
        prev.filter(state => (now - state.startTime) < TYPING_TIMEOUT)
      );
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Effekt für die Überprüfung von Nachrichten aus der Warteschlange
  useEffect(() => {
    if (!isChecking && factCheckQueue.length > 0) {
      checkNextMessage();
    }
  }, [isChecking, factCheckQueue]);
  
  // Prüfe die nächste Nachricht in der Warteschlange
  const checkNextMessage = async () => {
    if (factCheckQueue.length === 0) return;
    
    const messageId = factCheckQueue[0];
    const message = messages.find(m => m.id === messageId);
    
    if (!message) {
      setFactCheckQueue(prev => prev.slice(1));
      return;
    }
    
    try {
      // Überprüfe den Inhalt der Nachricht
      const factCheckResult = await checkStatement(message.content);
      
      // Validiere die Quellen und hole deren Zuverlässigkeitsbewertungen
      const sourcesWithReliability = factCheckResult.sources ? 
        await Promise.all(factCheckResult.sources.map(async (source) => {
          const reliability = await validateSource(source.url);
          return { ...source, reliability };
        })) : [];
      
      // Aktualisiere die Nachricht mit den Ergebnissen
      const updatedMessages = messages.map(m => 
        m.id === messageId ? 
          { 
            ...m, 
            factChecked: true, 
            factCheckResult, 
            sources: sourcesWithReliability 
          } : m
      );
      
      setMessages(updatedMessages);
      
      // Warne bei niedriger Vertrauenswürdigkeit
      if (factCheckResult.confidence < 0.7) {
        toast({
          variant: "warning",
          title: t('warning.quality'),
          description: t('warning.unreliable'),
        });
      }
      
      // Entferne die verarbeitete Nachricht aus der Warteschlange
      setFactCheckQueue(prev => prev.slice(1));
    } catch (error) {
      console.error('Fehler bei der Faktenüberprüfung:', error);
      toast({
        variant: "destructive",
        title: t('error.general'),
        description: String(error),
      });
      
      // Bei einem Fehler trotzdem aus der Warteschlange entfernen
      setFactCheckQueue(prev => prev.slice(1));
    }
  };
  
  // Aktualisiere den Connection-Status für Parent-Komponenten
  const updateConnectionStatus = (connected: boolean, reconnecting: boolean, attempt?: number) => {
    if (onConnectionStatusChange) {
      onConnectionStatusChange({
        connected,
        reconnecting,
        reconnectAttempt: attempt,
        error: apiError
      });
    }
  };
  
  // Manuelles Neuverbinden
  const handleReconnect = async () => {
    setReconnectAttempt(prev => prev + 1);
    setIsReconnecting(true);
    setOfflineMode(false);
    
    toast({
      title: t('connection.reconnecting'),
      description: t('connection.attempt', { attempt: String(reconnectAttempt + 1), max: String(maxReconnectAttempts) }),
    });
    
    // Erst API-Manager zurücksetzen und neu initialisieren
    try {
      await apiManager.initialize();
    } catch (error) {
      console.error("Fehler bei API-Initialisierung:", error);
    }
    
    // Dann WebSocket-Verbindung herstellen
    await connectWebSocket();
  };
  
  // Endpunkt konfigurieren
  const handleConfigureEndpoint = (endpointUrl: string) => {
    apiManager.addEndpoint({
      url: endpointUrl,
      name: 'Manueller Endpunkt',
      priority: 0 // höchste Priorität
    });
    
    handleReconnect();
  };
  
  // Nachricht senden
  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    
    if (!isConnected) {
      // Im Offline-Modus
      if (offlineMode) {
        // Lokale Nachricht erstellen
        const newMessage: Message = {
          id: `user-${Date.now()}`,
          expertId: 'user',
          content: messageInput.trim(),
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, newMessage]);
        setMessageInput('');
        
        // Simuliere Antwort eines Experten im Offline-Modus
        setTimeout(() => {
          const randomExpert = initialExperts[Math.floor(Math.random() * initialExperts.length)];
          const responseMessage: Message = {
            id: `offline-response-${Date.now()}`,
            expertId: randomExpert.id,
            content: t('offline.response'),
            timestamp: new Date().toISOString(),
            factChecked: false
          };
          
          setMessages(prev => [...prev, responseMessage]);
        }, 1500);
      } else {
        // Nicht im Offline-Modus, aber keine Verbindung - Wiederverbindung anbieten
        toast({
          variant: "warning",
          title: t('connection.disconnected'),
          description: t('connection.try_reconnect'),
          action: (
            <Button variant="outline" size="sm" onClick={handleReconnect}>
              {t('connection.reconnect')}
            </Button>
          ),
        });
      }
      
      return;
    }
    
    // Hier wird die Nachricht gesendet, wenn eine Verbindung besteht
    // ... bestehender Code für das Senden der Nachricht ...
  };
  
  // Finde einen Experten anhand seiner ID
  const getExpert = (expertId: string): Expert | undefined => {
    return initialExperts.find(expert => expert.id === expertId);
  };
  
  // Formatiere einen Zeitstempel
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Neue Komponente für die strukturierte Antwort
  const StructuredResponse = ({ 
    response, 
    category 
  }: { 
    response: EnhancedValidationResult['structuredResponse'],
    category: PromptAnalysisResult['category']
  }) => (
    <div className="mt-2 space-y-2" role="region" aria-label={t('analysis.title')}>
      {response.mainPoints.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-1">
            {t('analysis.key_points')} {category === 'scientific' && `(${t('analysis.pareto')})`}:
          </h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {response.mainPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      )}
      
      {response.contextualInfo.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-1">{t('analysis.context')}:</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {response.contextualInfo.map((info, index) => (
              <li key={index}>{info}</li>
            ))}
          </ul>
        </div>
      )}
      
      {response.safetyWarnings.length > 0 && (
        <div role="alert">
          <h4 className="text-sm font-medium text-destructive mb-1">
            {t('analysis.warnings')}:
          </h4>
          <ul className="list-disc list-inside text-sm space-y-1 text-destructive">
            {response.safetyWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
  
  // Erweiterte Analyse-Komponente
  const renderAdvancedAnalysis = (validation: EnhancedValidationResult) => (
    <div className="mt-2" role="region" aria-label={t('analysis.title')}>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            aria-expanded="false"
            aria-controls="advanced-analysis"
          >
            <InfoCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            <span>{t('analysis.title')}</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent id="advanced-analysis">
          <div className="space-y-4 mt-2">
            {/* Strukturierte Antwort */}
            <StructuredResponse 
              response={validation.structuredResponse}
              category={validation.promptAnalysis.category}
            />
            
            {/* Bewertungskriterien */}
            <div>
              <h4 className="text-sm font-medium mb-2">{t('analysis.metrics')}:</h4>
              <div 
                className="grid grid-cols-2 gap-2" 
                role="list" 
                aria-label={t('analysis.metrics')}
              >
                {Object.entries(validation.scores).map(([key, value]) => (
                  <div 
                    key={key} 
                    className="flex items-center justify-between"
                    role="listitem"
                  >
                    <span className="text-sm text-muted-foreground">
                      {key}:
                    </span>
                    <Progress 
                      value={value * 100} 
                      className="w-24"
                      aria-label={`${key} ${t('analysis.metrics')}: ${Math.round(value * 100)}%`}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Prompt-Analyse Details */}
            <div>
              <h4 className="text-sm font-medium mb-2">{t('analysis.details')}:</h4>
              <div className="text-sm space-y-1">
                <p>{t('analysis.category')}: {t(`category.${validation.promptAnalysis.category}`)}</p>
                <p>{t('analysis.context_ratio')}: {Math.round(validation.promptAnalysis.contextRatio * 100)}%</p>
                <p>{t('analysis.word_count')}: {validation.promptAnalysis.wordCount}</p>
                <p>{t('analysis.sentence_count')}: {validation.promptAnalysis.sentenceCount}</p>
              </div>
            </div>
            
            {validation.promptAnalysis.improvements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">{t('analysis.improvements')}:</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {validation.promptAnalysis.improvements.map((improvement, index) => (
                    <li key={index}>{improvement}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <p 
              className="text-xs text-muted-foreground mt-2"
              role="note"
            >
              {validation.analysis}
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
  
  // Verbesserte Fehlerbehandlung im renderMessage
  const renderMessage = (message: Message) => {
    const expert = getExpert(message.expertId);
    if (!expert) {
      console.error(`Expert with ID ${message.expertId} not found`);
      return (
        <div className="flex gap-3" role="alert">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">
            {t('expert.not_found')}
          </span>
        </div>
      );
    }

    return (
      <div key={message.id} className="flex gap-3" role="article">
        <Avatar className="h-8 w-8">
          <AvatarImage src={expert.avatar} />
          <AvatarFallback style={{ backgroundColor: expert.color || '#888' }}>
            {expert.name.substring(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{expert.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(message.timestamp)}
            </span>
            {expert.specialty && (
              <Badge variant="outline" className="text-xs">
                {expert.specialty}
              </Badge>
            )}
          </div>
          <div className="mt-1">{message.content}</div>
          
          {message.factChecked && message.factCheckResult && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={message.factCheckResult.confidence > 0.7 ? "success" : "destructive"}
                  className="text-xs"
                >
                  {message.factCheckResult.confidence > 0.7 ? (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {t('fact_check.title')}: {Math.round(message.factCheckResult.confidence * 100)}%
                </Badge>
                {message.factCheckResult.isFactual !== undefined && (
                  <Badge 
                    variant={message.factCheckResult.isFactual ? "outline" : "destructive"}
                    className="text-xs"
                  >
                    {message.factCheckResult.isFactual 
                      ? t('fact_check.factual')
                      : t('fact_check.not_factual')}
                  </Badge>
                )}
              </div>
              
              {message.sources && message.sources.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium">{t('sources.title')}:</p>
                  <ul className="text-xs space-y-1 mt-1">
                    {message.sources.map((source, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline truncate"
                        >
                          {source.title}
                        </a>
                        {source.reliability !== undefined && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant={source.reliability > 0.7 ? "outline" : "secondary"}
                                className="text-xs ml-1"
                              >
                                {Math.round(source.reliability * 100)}%
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('sources.reliability')}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {message.advancedValidation && 'promptAnalysis' in message.advancedValidation 
            ? renderAdvancedAnalysis(message.advancedValidation as EnhancedValidationResult)
            : message.advancedValidation && renderAdvancedAnalysis(message.advancedValidation as any as EnhancedValidationResult)}
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <h2 className="text-lg font-semibold">
          {t('debate.title')}
        </h2>
        <div className="flex items-center gap-2">
          {offlineMode ? (
            <Badge variant="outline" className="rounded-full bg-amber-100 text-amber-800 border-amber-200">
              {t('connection.offline_mode')}
            </Badge>
          ) : (
            <Badge variant={isConnected ? "success" : "destructive"} className="rounded-full">
              {isConnected ? t('connection.connected') : t('connection.disconnected')}
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={() => setShowDiagnostics(true)}
            title={t('api.diagnosis.run')}
          >
            <Server className="h-4 w-4" />
          </Button>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Verbindungsstatus */}
      {(!isConnected || apiError) && !offlineMode && (
        <div className="bg-background p-3 rounded-lg mb-4 border border-muted">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span>
              {isReconnecting 
                ? `${t('connection.reconnecting')} (${reconnectAttempt}/${maxReconnectAttempts})` 
                : apiError 
                  ? `${t('connection.api_error')}: ${apiError}` 
                  : t('connection.disconnected')}
            </span>
          </div>
        </div>
      )}
      
      {/* Offline-Modus-Banner */}
      {offlineMode && (
        <div className="bg-amber-50 p-3 rounded-lg mb-4 border border-amber-200">
          <div className="flex items-center gap-2">
            <InfoCircle className="h-4 w-4 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-800">{t('offline.title')}</h3>
              <p className="text-sm text-amber-700">{t('offline.description')}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => setShowDiagnostics(true)} 
              disabled={isReconnecting}
            >
              {t('api.diagnosis.run')}
            </Button>
          </div>
        </div>
      )}

      {/* Nachrichtenliste */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-background/50 rounded-lg">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {t('message.empty')}
          </div>
        ) : (
          messages.map(message => renderMessage(message))
        )}
        
        {typingExperts.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center">
              {typingExperts.map(expertId => {
                const expert = getExpert(expertId);
                return expert ? (
                  <Avatar key={expertId} className="h-5 w-5 -ml-1 first:ml-0 border border-background">
                    <AvatarFallback style={{ backgroundColor: expert.color || '#888' }}>
                      {expert.name.substring(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                ) : null;
              })}
            </div>
            {typingExperts.length === 1 ? (
              <span>{getExpert(typingExperts[0])?.name} {t('typing.single')}</span>
            ) : (
              <span>{t('typing.multiple', { count: String(typingExperts.length) })}</span>
            )}
          </div>
        )}
      </div>
      
      {/* Nachrichteneingabe */}
      <div className="mt-4">
        <div className="flex gap-2">
          <Textarea 
            value={messageInput} 
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={t('message.placeholder')}
            className="flex-1"
            disabled={!isConnected}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!isConnected || messageInput.trim() === ''}
          >
            <SendIcon className="h-4 w-4 mr-2" />
            {t('message.send')}
          </Button>
        </div>
      </div>

      {/* API-Diagnose-Dialog */}
      <Dialog open={showDiagnostics} onOpenChange={setShowDiagnostics}>
        <DialogContent className="max-w-4xl">
          <DialogTitle>{t('api.diagnosis.title')}</DialogTitle>
          <ApiDiagnostics 
            onClose={() => setShowDiagnostics(false)}
            onConfigureEndpoint={handleConfigureEndpoint}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 