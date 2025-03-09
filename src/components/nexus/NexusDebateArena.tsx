'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Loader2, 
  ArrowLeft, 
  ArrowRight,
  BarChart4,
  Lightbulb,
  Gavel,
  UserCircle,
  Check,
  X,
  Network
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';

import { Expert, ChatMessage } from './NexusChatInterface';
import { useNexus } from './NexusMultiExpertProvider';
import TypingIndicator from './TypingIndicator';
import { useCognitiveLoop } from '@/hooks/use-cognitive-loop';

interface DebatePosition {
  id: string;
  title: string;
  description: string;
  supportingExperts: Expert[];
  confidenceScore: number;
  keyArguments: string[];
  evidenceStrength: number;
  consensusLikelihood: number;
}

interface DebateIssue {
  id: string;
  title: string;
  description: string;
  positions: DebatePosition[];
  status: 'active' | 'resolved' | 'stalled';
  resolutionSummary?: string;
  consensusPosition?: string;
}

interface ConsensusPoint {
  id: string;
  statement: string;
  confidenceLevel: number;
  supportingExperts: string[];
  opposingExperts: string[];
  evidenceStrength: number;
}

interface NexusDebateArenaProps {
  className?: string;
}

export function NexusDebateArena({ className }: NexusDebateArenaProps) {
  const { 
    session, 
    sendMessage, 
    rateMessage, 
    typingExperts 
  } = useNexus();
  
  const { toast } = useToast();
  const { analyzePatterns, getInsights } = useCognitiveLoop();
  
  const [activeTab, setActiveTab] = useState('debate');
  const [activeIssueIndex, setActiveIssueIndex] = useState(0);
  const [isGeneratingConsensus, setIsGeneratingConsensus] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState<string | null>(null);
  const debateContainerRef = useRef<HTMLDivElement>(null);
  
  // Simulation von Debattenthemen für die Demo-Version
  const [debateIssues, setDebateIssues] = useState<DebateIssue[]>([
    {
      id: 'issue-1',
      title: 'Optimale Implementierungsstrategie für das Cognitive System',
      description: 'Wie sollte die Cognitive Loop-Architektur optimal implementiert werden, um Leistung und Skalierbarkeit zu gewährleisten?',
      status: 'active',
      positions: [
        {
          id: 'position-1',
          title: 'Microservices-Architektur',
          description: 'Eine Microservices-Architektur bietet maximale Flexibilität und Skalierbarkeit für die Cognitive Loop.',
          supportingExperts: [],
          confidenceScore: 0.85,
          keyArguments: [
            'Bessere Skalierbarkeit bei steigender Last',
            'Unabhängige Entwicklung und Bereitstellung einzelner Komponenten',
            'Leichtere Integration neuer kognitiver Funktionen'
          ],
          evidenceStrength: 0.78,
          consensusLikelihood: 0.65
        },
        {
          id: 'position-2',
          title: 'Monolithische Architektur mit modularem Design',
          description: 'Eine monolithische Architektur mit modularem Design bietet bessere Performance und einfachere Verwaltung.',
          supportingExperts: [],
          confidenceScore: 0.72,
          keyArguments: [
            'Geringere Latenz zwischen Systemkomponenten',
            'Einfachere Verwaltung und Bereitstellung',
            'Bessere Gesamtleistung durch optimierte interne Kommunikation'
          ],
          evidenceStrength: 0.65,
          consensusLikelihood: 0.45
        }
      ]
    },
    {
      id: 'issue-2',
      title: 'Integration von maschinellem Lernen in Echtzeit',
      description: 'Welche ML-Technologien sollten für Echtzeit-Anpassungen eingesetzt werden, ohne die Systemleistung zu beeinträchtigen?',
      status: 'active',
      positions: [
        {
          id: 'position-1',
          title: 'Leichtgewichtige Edge-ML-Modelle',
          description: 'Einsatz von leichtgewichtigen ML-Modellen, die direkt am Edge ausgeführt werden können.',
          supportingExperts: [],
          confidenceScore: 0.79,
          keyArguments: [
            'Niedrigere Latenz durch lokale Verarbeitung',
            'Reduzierter Netzwerkverkehr',
            'Bessere Privatsphäre für sensible Daten'
          ],
          evidenceStrength: 0.82,
          consensusLikelihood: 0.58
        },
        {
          id: 'position-2',
          title: 'Hybride Cloud-Edge-Architektur',
          description: 'Eine hybride Architektur, die komplexe Modelle in der Cloud und schnelle Inferenz am Edge kombiniert.',
          supportingExperts: [],
          confidenceScore: 0.88,
          keyArguments: [
            'Flexibilität zwischen Leistung und Genauigkeit',
            'Skalierbare Ressourcen für Training in der Cloud',
            'Anpassungsfähig an unterschiedliche Geräteleistungen'
          ],
          evidenceStrength: 0.91,
          consensusLikelihood: 0.73
        }
      ]
    }
  ]);
  
  const [consensusPoints, setConsensusPoints] = useState<ConsensusPoint[]>([
    {
      id: 'consensus-1',
      statement: 'Systemleistung sollte höchste Priorität bei der Architekturentscheidung haben',
      confidenceLevel: 0.92,
      supportingExperts: ['tech-expert', 'system-architect', 'ai-specialist'],
      opposingExperts: [],
      evidenceStrength: 0.88
    },
    {
      id: 'consensus-2',
      statement: 'Echtzeit-Feedback-Schleifen sind für kontinuierliche Systemverbesserung unerlässlich',
      confidenceLevel: 0.87,
      supportingExperts: ['tech-expert', 'ux-expert', 'ai-specialist'],
      opposingExperts: ['system-architect'],
      evidenceStrength: 0.79
    },
    {
      id: 'consensus-3',
      statement: 'Eine hybride Datenverarbeitungsstrategie bietet das beste Gleichgewicht zwischen Leistung und Genauigkeit',
      confidenceLevel: 0.83,
      supportingExperts: ['system-architect', 'ai-specialist'],
      opposingExperts: ['tech-expert'],
      evidenceStrength: 0.75
    }
  ]);
  
  // Zuweisung von Experten zu Positionen basierend auf der Session
  useEffect(() => {
    if (session && session.participants.length > 0) {
      // Tiefer Klon des aktuellen Zustands
      const updatedIssues = JSON.parse(JSON.stringify(debateIssues));
      
      // Zuweisung der Experten zu verschiedenen Positionen basierend auf ihren Eigenschaften
      updatedIssues.forEach((issue: DebateIssue) => {
        issue.positions.forEach((position: DebatePosition) => {
          position.supportingExperts = [];
          
          session.participants.forEach(expert => {
            // Simple Zuweisungslogik für die Demo
            // In einer echten Anwendung würde dies auf tatsächlichen Analysen basieren
            if (issue.id === 'issue-1') {
              if (position.id === 'position-1' && 
                  (expert.id === 'ai-specialist' || expert.id === 'tech-expert')) {
                position.supportingExperts.push(expert);
              } else if (position.id === 'position-2' && 
                         (expert.id === 'system-architect' || expert.id === 'ux-expert')) {
                position.supportingExperts.push(expert);
              }
            } else if (issue.id === 'issue-2') {
              if (position.id === 'position-1' && 
                  (expert.id === 'tech-expert' || expert.id === 'ux-expert')) {
                position.supportingExperts.push(expert);
              } else if (position.id === 'position-2' && 
                         (expert.id === 'ai-specialist' || expert.id === 'system-architect')) {
                position.supportingExperts.push(expert);
              }
            }
          });
        });
      });
      
      setDebateIssues(updatedIssues);
    }
  }, [session]);
  
  // Automatisches Scrollen zum Ende, wenn neue Nachrichten hinzugefügt werden
  useEffect(() => {
    if (debateContainerRef.current) {
      debateContainerRef.current.scrollTop = debateContainerRef.current.scrollHeight;
    }
  }, [session?.messages]);
  
  const activeIssue = debateIssues[activeIssueIndex];
  
  const handleNextIssue = () => {
    if (activeIssueIndex < debateIssues.length - 1) {
      setActiveIssueIndex(activeIssueIndex + 1);
    }
  };
  
  const handlePreviousIssue = () => {
    if (activeIssueIndex > 0) {
      setActiveIssueIndex(activeIssueIndex - 1);
    }
  };
  
  const handleExpertSelect = (expertId: string | null) => {
    setSelectedExpert(expertId);
  };
  
  const handleGenerateConsensus = async () => {
    if (!session) return;
    
    setIsGeneratingConsensus(true);
    
    try {
      // In einer echten Anwendung würde hier ein API-Aufruf stattfinden
      // Für die Demo simulieren wir die Generierung eines Konsenses
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulation eines neuen Konsenspunkts
      const newConsensusPoint: ConsensusPoint = {
        id: `consensus-${consensusPoints.length + 1}`,
        statement: `Eine ${activeIssue.positions[0].confidenceScore > activeIssue.positions[1].confidenceScore ? 
          activeIssue.positions[0].title : activeIssue.positions[1].title} bietet die besten Ergebnisse für ${activeIssue.title}`,
        confidenceLevel: 0.8 + Math.random() * 0.15,
        supportingExperts: session.participants
          .filter(() => Math.random() > 0.3)
          .map(expert => expert.id),
        opposingExperts: session.participants
          .filter(() => Math.random() > 0.7)
          .map(expert => expert.id),
        evidenceStrength: 0.7 + Math.random() * 0.25
      };
      
      setConsensusPoints([...consensusPoints, newConsensusPoint]);
      
      toast({
        title: "Konsens generiert",
        description: "Ein neuer Konsenspunkt wurde basierend auf der aktuellen Debatte erstellt.",
      });
    } catch (error) {
      console.error('Error generating consensus:', error);
      toast({
        title: "Fehler",
        description: "Beim Generieren des Konsenses ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingConsensus(false);
    }
  };
  
  // Nachrichten filtern, die zur aktuellen Debatte gehören
  const getDebateMessages = () => {
    if (!session) return [];
    
    // In einer echten Anwendung würden wir Nachrichten basierend auf ihren Metadaten filtern
    // Für die Demo zeigen wir einfach alle Nachrichten an, die nicht vom Benutzer stammen
    // und filtern nach dem ausgewählten Experten, falls vorhanden
    return session.messages.filter(msg => 
      (!msg.sender.isUser && (!selectedExpert || msg.sender.id === selectedExpert))
    );
  };
  
  const filteredMessages = getDebateMessages();
  
  // Gibt einen Experten basierend auf seiner ID zurück
  const getExpertById = (expertId: string): Expert | undefined => {
    return session?.participants.find(e => e.id === expertId);
  };
  
  // Rendert eine einzelne Nachricht im Debatten-Feed
  const renderDebateMessage = (message: ChatMessage) => {
    const expert = getExpertById(message.sender.id);
    if (!expert) return null;
    
    return (
      <div key={message.id} className="mb-4">
        <div className="flex items-start gap-2">
          <Avatar className="h-8 w-8">
            {expert.avatar ? (
              <AvatarImage src={expert.avatar} alt={expert.name} />
            ) : (
              <AvatarFallback>{expert.name.charAt(0)}</AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{expert.name}</span>
              
              {expert.expertise.map(exp => (
                <Badge key={exp} variant="outline" className="text-xs py-0">{exp}</Badge>
              ))}
            </div>
            
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm whitespace-pre-wrap">
                {message.content}
              </div>
              
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                
                <div className="flex items-center gap-2">
                  {message.cognitiveInsights && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" />
                      <span>{(message.cognitiveInsights.confidence * 100).toFixed(0)}%</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-1 mt-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${message.userReaction === 'helpful' ? 'text-green-500' : ''}`}
                onClick={() => rateMessage(message.id, 'helpful')}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${message.userReaction === 'unhelpful' ? 'text-red-500' : ''}`}
                onClick={() => rateMessage(message.id, 'unhelpful')}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Rendert eine einzelne Position
  const renderDebatePosition = (position: DebatePosition) => {
    return (
      <Card key={position.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{position.title}</CardTitle>
            <Badge>
              {(position.confidenceScore * 100).toFixed(0)}% Konfidenz
            </Badge>
          </div>
          <CardDescription>{position.description}</CardDescription>
        </CardHeader>
        
        <CardContent className="pb-2">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-1">Schlüsselargumente:</h4>
              <ul className="space-y-1">
                {position.keyArguments.map((arg, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <div className="mt-0.5 text-primary">•</div>
                    <span>{arg}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-1">Unterstützende Experten:</h4>
              <div className="flex flex-wrap gap-2">
                {position.supportingExperts.length > 0 ? (
                  position.supportingExperts.map(expert => (
                    <div key={expert.id} className="flex items-center gap-1.5">
                      <Avatar className="h-6 w-6">
                        {expert.avatar ? (
                          <AvatarImage src={expert.avatar} alt={expert.name} />
                        ) : (
                          <AvatarFallback>{expert.name.charAt(0)}</AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-sm">{expert.name}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Keine unterstützenden Experten</span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Beweiskraft</span>
                  <span>{(position.evidenceStrength * 100).toFixed(0)}%</span>
                </div>
                <Progress value={position.evidenceStrength * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Konsenswahrscheinlichkeit</span>
                  <span>{(position.consensusLikelihood * 100).toFixed(0)}%</span>
                </div>
                <Progress value={position.consensusLikelihood * 100} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Rendert einen einzelnen Konsenspunkt
  const renderConsensusPoint = (consensus: ConsensusPoint) => {
    return (
      <Card key={consensus.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" />
              <span className="font-semibold">Konsenspunkt</span>
            </div>
            <Badge variant="secondary">
              {(consensus.confidenceLevel * 100).toFixed(0)}% Konfidenz
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pb-2">
          <p className="text-base font-medium mb-3">{consensus.statement}</p>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Beweiskraft</span>
                <span>{(consensus.evidenceStrength * 100).toFixed(0)}%</span>
              </div>
              <Progress value={consensus.evidenceStrength * 100} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Unterstützend ({consensus.supportingExperts.length})</span>
                </h4>
                <div className="flex flex-wrap gap-1">
                  {consensus.supportingExperts.map(expertId => {
                    const expert = getExpertById(expertId);
                    return expert ? (
                      <Avatar key={expertId} className="h-6 w-6">
                        {expert.avatar ? (
                          <AvatarImage src={expert.avatar} alt={expert.name} />
                        ) : (
                          <AvatarFallback>{expert.name.charAt(0)}</AvatarFallback>
                        )}
                      </Avatar>
                    ) : null;
                  })}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                  <X className="h-4 w-4 text-red-500" />
                  <span>Widersprechend ({consensus.opposingExperts.length})</span>
                </h4>
                <div className="flex flex-wrap gap-1">
                  {consensus.opposingExperts.map(expertId => {
                    const expert = getExpertById(expertId);
                    return expert ? (
                      <Avatar key={expertId} className="h-6 w-6">
                        {expert.avatar ? (
                          <AvatarImage src={expert.avatar} alt={expert.name} />
                        ) : (
                          <AvatarFallback>{expert.name.charAt(0)}</AvatarFallback>
                        )}
                      </Avatar>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  if (!session) {
    return (
      <Card className={`flex-1 h-full ${className}`}>
        <CardHeader>
          <CardTitle>Nexus Debatte Arena</CardTitle>
          <CardDescription>
            Starten Sie eine neue Chat-Session, um die Debatte-Arena nutzen zu können.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Network className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Die Nexus Debatte Arena ermöglicht tiefgreifende Diskussionen zwischen KI-Experten.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`flex-1 h-full ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>
              Nexus Debatte Arena
              <Separator className="my-2" />
            </CardTitle>
          </div>
        </div>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList>
            <TabsTrigger value="debate">
              <MessageSquare className="h-4 w-4 mr-2" />
              Debatte
            </TabsTrigger>
            <TabsTrigger value="positions">
              <UserCircle className="h-4 w-4 mr-2" />
              Positionen
            </TabsTrigger>
            <TabsTrigger value="consensus">
              <Gavel className="h-4 w-4 mr-2" />
              Konsens
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart4 className="h-4 w-4 mr-2" />
              Analytik
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-hidden">
        <TabsContent value="debate" className="m-0 h-full flex flex-col overflow-hidden">
          <div className="p-4 pb-2">
            <Card className="mb-4">
              <CardHeader className="py-2 px-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-md">Aktuelles Thema</CardTitle>
                    <CardDescription>
                      {activeIssue.title}
                    </CardDescription>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePreviousIssue}
                      disabled={activeIssueIndex === 0}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNextIssue}
                      disabled={activeIssueIndex === debateIssues.length - 1}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <p className="text-sm">{activeIssue.description}</p>
              </CardContent>
            </Card>
            
            <div className="flex flex-wrap gap-2 mb-2">
              <Button 
                variant={selectedExpert === null ? "default" : "outline"} 
                size="sm"
                onClick={() => handleExpertSelect(null)}
              >
                Alle Experten
              </Button>
              
              {session.participants.map(expert => (
                <Button
                  key={expert.id}
                  variant={selectedExpert === expert.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleExpertSelect(expert.id)}
                >
                  {expert.name}
                </Button>
              ))}
            </div>
            
            <Separator className="my-2" />
          </div>
          
          <ScrollArea ref={debateContainerRef} className="flex-1 p-4">
            <div className="space-y-4">
              {filteredMessages.length > 0 ? (
                filteredMessages.map(renderDebateMessage)
              ) : (
                <div className="text-center py-10">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Keine Debattenbeiträge vorhanden. Starten Sie eine Diskussion, um Expertenmeinungen zu sehen.
                  </p>
                </div>
              )}
              
              {typingExperts.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TypingIndicator />
                  <span>
                    {typingExperts.map(id => {
                      const expert = session.participants.find(e => e.id === id);
                      return expert?.name || id;
                    }).join(', ')} {typingExperts.length === 1 ? 'entwickelt' : 'entwickeln'} Argumente...
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="positions" className="m-0 h-full overflow-hidden">
          <ScrollArea className="h-full p-4">
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle>{activeIssue.title}</CardTitle>
                <CardDescription>{activeIssue.description}</CardDescription>
              </CardHeader>
            </Card>
            
            <div className="space-y-1">
              <h3 className="text-lg font-semibold mb-3">Positionen</h3>
              
              {activeIssue.positions.map(renderDebatePosition)}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="consensus" className="m-0 h-full overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Konsenspunkte</h3>
              
              <Button 
                onClick={handleGenerateConsensus}
                disabled={isGeneratingConsensus}
              >
                {isGeneratingConsensus ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generieren...
                  </>
                ) : (
                  <>
                    <Gavel className="h-4 w-4 mr-2" />
                    Konsens generieren
                  </>
                )}
              </Button>
            </div>
            
            {consensusPoints.length > 0 ? (
              consensusPoints.map(renderConsensusPoint)
            ) : (
              <div className="text-center py-10">
                <Gavel className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Noch keine Konsenspunkte gefunden. Generieren Sie Konsens basierend auf der laufenden Debatte.
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="analytics" className="m-0 h-full overflow-hidden">
          <ScrollArea className="h-full p-4">
            <h3 className="text-lg font-semibold mb-4">Debattenanalyse</h3>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-md">Beitragsstatistik</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {session.participants.map(expert => {
                      // Berechne Prozentsatz der Beiträge dieses Experten
                      const expertMessages = session.messages.filter(msg => msg.sender.id === expert.id);
                      const totalExpertMessages = session.messages.filter(msg => !msg.sender.isUser);
                      const percentage = totalExpertMessages.length > 0 
                        ? (expertMessages.length / totalExpertMessages.length) * 100 
                        : 0;
                      
                      return (
                        <div key={expert.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {expert.avatar ? (
                                  <AvatarImage src={expert.avatar} alt={expert.name} />
                                ) : (
                                  <AvatarFallback>{expert.name.charAt(0)}</AvatarFallback>
                                )}
                              </Avatar>
                              <span>{expert.name}</span>
                            </div>
                            <span>{expertMessages.length} Beiträge ({percentage.toFixed(1)}%)</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-md">Konsensanalyse</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Gesamtkonsenswahrscheinlichkeit</span>
                        <span>68%</span>
                      </div>
                      <Progress value={68} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Übereinstimmungsrate bei Schlüsselthemen</span>
                        <span>75%</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Meinungsdivergenz</span>
                        <span>42%</span>
                      </div>
                      <Progress value={42} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-md">Themenverteilung</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Technische Implementierung</span>
                        <span>45%</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Architektur & Design</span>
                        <span>30%</span>
                      </div>
                      <Progress value={30} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Leistungsoptimierung</span>
                        <span>15%</span>
                      </div>
                      <Progress value={15} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Sonstige Themen</span>
                        <span>10%</span>
                      </div>
                      <Progress value={10} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </CardContent>
    </Card>
  );
} 