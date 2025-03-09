'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle,
  Button,
  Textarea,
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger,
  useToast,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Badge,
  Separator,
  ScrollArea
} from '@/components/ui';
import { 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  Loader2, 
  RefreshCw,
  Download,
  Settings,
  User,
  Users,
  BrainCircuit,
  Network,
  Zap
} from 'lucide-react';
import TypingIndicator from './TypingIndicator';

// Typen für die Multi-Experten-Chat-Funktionalität
export interface Expert {
  id: string;
  name: string;
  avatar: string;
  expertise: string[];
  bio: string;
  characteristics: string[];
}

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  sender: {
    id: string;
    name: string;
    isUser: boolean;
    avatar?: string;
  };
  reactions?: {
    helpful: number;
    neutral: number;
    unhelpful: number;
  };
  userReaction?: 'helpful' | 'neutral' | 'unhelpful';
  attachments?: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
  referencedMessages?: string[];
  metadata?: Record<string, any>;
  isGenerating?: boolean;
  cognitiveInsights?: {
    patterns: string[];
    confidence: number;
    adaptationLevel: number;
  };
}

export interface NexusSession {
  id: string;
  title: string;
  description?: string;
  created: Date;
  lastUpdated: Date;
  participants: Expert[];
  messages: ChatMessage[];
  status: 'active' | 'paused' | 'completed';
  tags: string[];
  settings: {
    debateMode: boolean;
    cognitiveAnalysis: boolean;
    realTimeProcessing: boolean;
    autoSummarize: boolean;
  };
}

interface NexusChatInterfaceProps {
  sessionId?: string;
  initialData?: NexusSession | null;
  loading?: boolean;
  typingExperts?: string[];
  wsConnected?: boolean;
  onSendMessage?: (content: string) => Promise<boolean>;
  onRateMessage?: (messageId: string, rating: 'helpful' | 'neutral' | 'unhelpful') => Promise<boolean>;
  onToggleSessionStatus?: () => Promise<boolean>;
  onExportSession?: (format: 'markdown' | 'pdf' | 'json') => Promise<void>;
}

export function NexusChatInterface({ 
  sessionId,
  initialData,
  loading = false,
  typingExperts = [],
  wsConnected = true,
  onSendMessage,
  onRateMessage,
  onToggleSessionStatus,
  onExportSession
}: NexusChatInterfaceProps) {
  const { toast } = useToast();
  const [session, setSession] = useState<NexusSession | null>(initialData || null);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedExpert, setSelectedExpert] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Automatisches Scrollen zum Ende, wenn neue Nachrichten hinzugefügt werden
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session?.messages]);

  // Nachricht senden
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;
    
    setIsSending(true);
    
    try {
      // Optimistische UI-Aktualisierung
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        content: inputValue.trim(),
        timestamp: new Date(),
        sender: {
          id: 'user',
          name: 'You',
          isUser: true
        },
        isGenerating: false
      };
      
      setSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, tempMessage]
      } : null);
      
      setInputValue('');
      
      // Tatsächliche Verarbeitung durch die Callback-Funktion
      if (onSendMessage) {
        const success = await onSendMessage(inputValue.trim());
        if (!success) {
          throw new Error('Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      
      // Fehlgeschlagene Nachricht aus der UI entfernen
      if (session) {
        setSession({
          ...session,
          messages: session.messages.filter(m => !m.id.startsWith('temp-'))
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  // Tastatureingaben behandeln
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Reaktion auf Nachricht
  const handleReaction = async (messageId: string, reaction: 'helpful' | 'neutral' | 'unhelpful') => {
    if (!session) return;
    
    try {
      // Optimistische UI-Aktualisierung
      const updatedMessages = session.messages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            userReaction: reaction,
          };
        }
        return msg;
      });
      
      setSession({
        ...session,
        messages: updatedMessages
      });
      
      // Tatsächliche Verarbeitung durch die Callback-Funktion
      if (onRateMessage) {
        const success = await onRateMessage(messageId, reaction);
        if (!success) {
          throw new Error('Failed to rate message');
        }
      }
    } catch (error) {
      console.error('Error rating message:', error);
      toast({
        title: "Error",
        description: "Failed to rate message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Session-Status umschalten (aktiv/pausiert)
  const handleToggleStatus = async () => {
    if (!session) return;
    
    try {
      if (onToggleSessionStatus) {
        const success = await onToggleSessionStatus();
        if (!success) {
          throw new Error('Failed to toggle session status');
        }
      }
    } catch (error) {
      console.error('Error toggling session status:', error);
      toast({
        title: "Error",
        description: "Failed to change session status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Session exportieren
  const handleExport = async (format: 'markdown' | 'pdf' | 'json') => {
    if (!session) return;
    
    try {
      if (onExportSession) {
        await onExportSession(format);
      }
    } catch (error) {
      console.error(`Error exporting session as ${format}:`, error);
      toast({
        title: "Export Failed",
        description: `Could not export as ${format.toUpperCase()}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Nach Experte filtern
  const handleFilterByExpert = (expertId: string | null) => {
    setSelectedExpert(expertId);
  };

  // Nachrichtenliste filtern
  const filteredMessages = session?.messages.filter(msg => 
    !selectedExpert || msg.sender.id === selectedExpert || msg.sender.isUser
  ) || [];

  // Rendert eine einzelne Nachricht
  const renderMessage = (message: ChatMessage) => {
    const isUserMessage = message.sender.isUser;
    const expert = session?.participants.find(e => e.id === message.sender.id);
    
    return (
      <div 
        key={message.id}
        className={`flex flex-col ${isUserMessage ? 'items-end' : 'items-start'} mb-4`}
      >
        <div className="flex items-start gap-2">
          {!isUserMessage && (
            <Avatar className="h-8 w-8">
              {expert?.avatar ? (
                <AvatarImage src={expert.avatar} alt={message.sender.name} />
              ) : (
                <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
          )}
          
          <div className={`max-w-[80%] ${isUserMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
            {!isUserMessage && (
              <div className="font-medium text-sm mb-1 flex items-center gap-2">
                {message.sender.name}
                {expert?.expertise.map(exp => (
                  <Badge key={exp} variant="outline" className="text-xs py-0">{exp}</Badge>
                ))}
              </div>
            )}
            
            <div className="text-sm whitespace-pre-wrap">
              {message.content}
              {message.isGenerating && <span className="animate-pulse">...</span>}
            </div>
            
            <div className="mt-1 text-xs opacity-70 flex justify-between items-center">
              <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
              
              {message.cognitiveInsights && (
                <Badge variant="outline" className="ml-2 flex items-center gap-1">
                  <BrainCircuit className="h-3 w-3" />
                  <span className="text-xs">{message.cognitiveInsights.confidence.toFixed(2)}</span>
                </Badge>
              )}
            </div>
          </div>
          
          {isUserMessage && (
            <Avatar className="h-8 w-8">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          )}
        </div>
        
        {!isUserMessage && (
          <div className="flex gap-1 mt-1 ml-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 ${message.userReaction === 'helpful' ? 'text-green-500' : ''}`}
                    onClick={() => handleReaction(message.id, 'helpful')}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Helpful</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 ${message.userReaction === 'neutral' ? 'text-blue-500' : ''}`}
                    onClick={() => handleReaction(message.id, 'neutral')}
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Neutral</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 ${message.userReaction === 'unhelpful' ? 'text-red-500' : ''}`}
                    onClick={() => handleReaction(message.id, 'unhelpful')}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Unhelpful</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="flex-1 flex flex-col h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading Nexus Chat...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="flex-1 flex flex-col h-full">
        <CardHeader>
          <CardTitle>Nexus Multi-Expert Chat</CardTitle>
          <CardDescription>Create a new session to start chatting with multiple AI experts</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <Button>Create New Session</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{session.title}</CardTitle>
            <CardDescription>
              {session.description || 'Multi-expert collaborative AI chat session'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleToggleStatus}
                  >
                    {session.status === 'active' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {session.status === 'active' ? 'Pause Session' : 'Resume Session'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Select 
              onValueChange={(value) => handleExport(value as 'markdown' | 'pdf' | 'json')}
              value=""
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Export..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList>
            <TabsTrigger value="chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="experts">
              <Users className="h-4 w-4 mr-2" />
              Experts
            </TabsTrigger>
            <TabsTrigger value="cognitive">
              <BrainCircuit className="h-4 w-4 mr-2" />
              Cognitive Insights
            </TabsTrigger>
            <TabsTrigger value="nexus">
              <Network className="h-4 w-4 mr-2" />
              The Nexus
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <TabsContent value="chat" className="m-0 h-full flex flex-col">
          <div className="p-4 pb-0">
            <div className="flex flex-wrap gap-2 mb-2">
              <Button 
                variant={selectedExpert === null ? "default" : "outline"} 
                size="sm"
                onClick={() => handleFilterByExpert(null)}
              >
                All
              </Button>
              
              {session.participants.map(expert => (
                <Button
                  key={expert.id}
                  variant={selectedExpert === expert.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterByExpert(expert.id)}
                >
                  {expert.name}
                </Button>
              ))}
            </div>
            <Separator />
          </div>
          
          <ScrollArea className="flex-1 p-4" ref={chatContainerRef}>
            <div className="flex flex-col">
              {filteredMessages.map(renderMessage)}
              
              {typingExperts.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <TypingIndicator />
                  <span>
                    {typingExperts.map(id => {
                      const expert = session.participants.find(e => e.id === id);
                      return expert?.name || id;
                    }).join(', ')} {typingExperts.length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="resize-none"
                rows={3}
                disabled={isSending || session.status !== 'active'}
              />
              
              <Button
                variant="default"
                size="icon"
                className="self-end"
                disabled={isSending || !inputValue.trim() || session.status !== 'active'}
                onClick={handleSendMessage}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="experts" className="m-0 h-full p-4">
          <ScrollArea className="h-full">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {session.participants.map(expert => (
                <Card key={expert.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {expert.avatar ? (
                          <AvatarImage src={expert.avatar} alt={expert.name} />
                        ) : (
                          <AvatarFallback>{expert.name.charAt(0)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{expert.name}</CardTitle>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {expert.expertise.map(exp => (
                            <Badge key={exp} variant="outline">{exp}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{expert.bio}</p>
                    
                    {expert.characteristics.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-semibold mb-1">Characteristics:</h4>
                        <div className="flex flex-wrap gap-1">
                          {expert.characteristics.map(trait => (
                            <Badge key={trait} variant="secondary" className="text-xs">{trait}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="cognitive" className="m-0 h-full p-4">
          <div className="flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-4">Cognitive System Insights</h3>
            <ScrollArea className="flex-1">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md">Pattern Recognition</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">The cognitive system is analyzing conversation patterns and adapting responses based on your interactions.</p>
                    
                    <div className="mt-4 space-y-2">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Learning Progress</span>
                          <span>78%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: '78%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Adaptation Level</span>
                          <span>64%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: '64%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Response Optimization</span>
                          <span>92%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '92%' }}></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md">Identified Patterns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between">
                          <span className="font-medium">Topic Focus Pattern</span>
                          <Badge>High Confidence</Badge>
                        </div>
                        <p className="text-sm mt-1">User shows consistent interest in technical implementation details.</p>
                      </div>
                      
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between">
                          <span className="font-medium">Inquiry Pattern</span>
                          <Badge>Medium Confidence</Badge>
                        </div>
                        <p className="text-sm mt-1">User frequently asks follow-up questions about system architecture.</p>
                      </div>
                      
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between">
                          <span className="font-medium">Response Preference</span>
                          <Badge>High Confidence</Badge>
                        </div>
                        <p className="text-sm mt-1">User prefers concise code examples with detailed explanations.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
        
        <TabsContent value="nexus" className="m-0 h-full p-4">
          <div className="flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-2">The Nexus Status</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The Nexus is actively synthesizing expert knowledge for enhanced collaborative intelligence.
            </p>
            
            <ScrollArea className="flex-1">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md">Knowledge Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Cross-Expert Consensus Building</span>
                          <span>87%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: '87%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Knowledge Graph Coherence</span>
                          <span>76%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: '76%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Contradiction Resolution</span>
                          <span>93%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '93%' }}></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md">Active Debates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="font-medium">Implementation Approach</h4>
                        <div className="flex justify-between text-sm mt-1">
                          <span>Tech Expert vs. System Architect</span>
                          <Badge variant="outline">In Progress</Badge>
                        </div>
                        <p className="text-sm mt-1">Debating the optimal approach for integrating the cognitive system with existing infrastructure.</p>
                      </div>
                      
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="font-medium">Performance Optimization</h4>
                        <div className="flex justify-between text-sm mt-1">
                          <span>Performance Engineer vs. ML Specialist</span>
                          <Badge variant="outline">Consensus Forming</Badge>
                        </div>
                        <p className="text-sm mt-1">Discussing trade-offs between real-time processing and accuracy of pattern recognition.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md">System Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Cognitive Loop Integration</span>
                          <span>95%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '95%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Debate System Synchronization</span>
                          <span>82%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: '82%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Pattern Recognition Feedback</span>
                          <span>78%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '78%' }}></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </CardContent>
    </Card>
  );
} 