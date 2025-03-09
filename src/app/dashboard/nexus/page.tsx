'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NexusChatInterface } from '@/components/nexus/NexusChatInterface';
import { NexusDebateArena } from '@/components/nexus/NexusDebateArena';
import { NexusMultiExpertProvider } from '@/components/nexus/NexusMultiExpertProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  BarChart4, 
  Users, 
  BrainCircuit, 
  Plus,
  Network,
  Lightbulb,
  PanelTopOpen,
  History
} from 'lucide-react';

export default function NexusPage() {
  const [activeTab, setActiveTab] = useState('multi-expert');

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-2">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">The Nexus</h1>
            <p className="text-muted-foreground mt-1">
              Kollaborative KI-Experten, kognitive Adaption und dynamische Debattenumgebung
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-normal">
              <BrainCircuit className="h-3.5 w-3.5 mr-1" />
              Kognitive Loop aktiv
            </Badge>
            
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neue Session
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="multi-expert">
              <Users className="h-4 w-4 mr-2" />
              Multi-Experten Chat
            </TabsTrigger>
            <TabsTrigger value="debate-arena">
              <Network className="h-4 w-4 mr-2" />
              Nexus Debatte Arena
            </TabsTrigger>
            <TabsTrigger value="cognitive-insights">
              <BrainCircuit className="h-4 w-4 mr-2" />
              Kognitive Insights
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <History className="h-4 w-4 mr-2" />
              Sessionverwaltung
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex-1 overflow-hidden p-4 pt-0">
        <NexusMultiExpertProvider devMode={true}>
          <TabsContent value="multi-expert" className="h-full m-0">
            <NexusChatInterface />
          </TabsContent>
          
          <TabsContent value="debate-arena" className="h-full m-0">
            <NexusDebateArena />
          </TabsContent>
          
          <TabsContent value="cognitive-insights" className="h-full m-0">
            <CognitiveInsightsPanel />
          </TabsContent>
          
          <TabsContent value="sessions" className="h-full m-0">
            <SessionManagement />
          </TabsContent>
        </NexusMultiExpertProvider>
      </div>
    </div>
  );
}

function CognitiveInsightsPanel() {
  const metrics = [
    { name: 'Adaptionsrate', value: 87, description: 'Wie schnell das System sich an neue Einflüsse anpasst' },
    { name: 'Lernfortschritt', value: 64, description: 'Gesamtfortschritt der kognitiven Lernkurve' },
    { name: 'Mustererkennung', value: 92, description: 'Präzision bei der Erkennung von Interaktionsmustern' },
    { name: 'Optimierungseffizienz', value: 78, description: 'Effizienz des Systems bei der Optimierung von Antworten' },
  ];

  const patterns = [
    { 
      id: 'pattern-1', 
      name: 'Technische Detailfokussierung', 
      confidence: 95,
      description: 'Starkes Interesse an technischen Implementierungsdetails',
      examples: ['Architekturanfragen', 'Implementierungsdetails', 'Codebeispiele']
    },
    { 
      id: 'pattern-2', 
      name: 'Konzeptionelles Verständnis', 
      confidence: 87,
      description: 'Fokus auf das Verstehen grundlegender Konzepte',
      examples: ['Theoretische Fragen', 'Konzepterklärungen', 'Architekturübersicht']
    },
    { 
      id: 'pattern-3', 
      name: 'Interaktive Exploration', 
      confidence: 76,
      description: 'Explorative Interaktion mit dem System durch Folgefragen',
      examples: ['Vertiefende Fragen', 'Folgeanfragen', 'Alternativvorschläge']
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      <div className="flex flex-col">
        <Card className="mb-4 flex-1">
          <CardHeader>
            <CardTitle>Kognitive System Metriken</CardTitle>
            <CardDescription>
              Echtzeitmetriken zur kognitiven Systemperformance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {metrics.map(metric => (
                <div key={metric.name}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <span className="text-sm font-semibold">{metric.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-primary" 
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Systemadaption Visualisierung</CardTitle>
            <CardDescription>
              Visualisierung der kognitiven Adaptionsprozesse
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="text-center p-8">
              <BrainCircuit className="h-24 w-24 text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">
                Die Visualisierungskomponente des kognitiven Systems zeigt Adaptionsprozesse in Echtzeit.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex flex-col">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Erkannte Interaktionsmuster</CardTitle>
            <CardDescription>
              Vom kognitiven System identifizierte Nutzungsmuster
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patterns.map(pattern => (
                <div key={pattern.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{pattern.name}</h3>
                    <Badge variant="secondary">{pattern.confidence}% Konfidenz</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{pattern.description}</p>
                  <div>
                    <h4 className="text-xs font-medium mb-1">Beispiele:</h4>
                    <div className="flex flex-wrap gap-1">
                      {pattern.examples.map((example, index) => (
                        <Badge key={index} variant="outline" className="text-xs">{example}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Systemanpassungen</CardTitle>
            <CardDescription>
              Automatische Anpassungen basierend auf kognitiven Erkenntnissen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 border-b pb-3">
                <div className="bg-muted rounded-full h-8 w-8 flex items-center justify-center text-primary shrink-0">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Antwortoptimierung</h3>
                  <p className="text-xs text-muted-foreground">
                    Antworten werden für technisches Detailniveau optimiert basierend auf erkannten Präferenzen.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 border-b pb-3">
                <div className="bg-muted rounded-full h-8 w-8 flex items-center justify-center text-primary shrink-0">
                  <PanelTopOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">UI-Personalisierung</h3>
                  <p className="text-xs text-muted-foreground">
                    Interface-Elemente werden basierend auf Interaktionsmuster priorisiert.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-muted rounded-full h-8 w-8 flex items-center justify-center text-primary shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Expertenauswahl</h3>
                  <p className="text-xs text-muted-foreground">
                    Automatische Auswahl relevanter Experten basierend auf Themenpräferenzen.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SessionManagement() {
  const sessions = [
    { 
      id: 'session-1', 
      title: 'Architekturoptimierung für Nexus System', 
      created: new Date(2023, 5, 12), 
      lastUpdated: new Date(2023, 5, 15),
      experts: ['Tech Expert', 'System Architect', 'UX Specialist'],
      messageCount: 48,
      status: 'active'
    },
    { 
      id: 'session-2', 
      title: 'ML-Integration in Echtzeit-Feedback-Loops', 
      created: new Date(2023, 5, 8), 
      lastUpdated: new Date(2023, 5, 14),
      experts: ['AI Specialist', 'Tech Expert', 'System Architect'],
      messageCount: 72,
      status: 'active'
    },
    { 
      id: 'session-3', 
      title: 'UI/UX-Optimierung für Nexus Dashboard', 
      created: new Date(2023, 5, 5), 
      lastUpdated: new Date(2023, 5, 10),
      experts: ['UX Specialist', 'Tech Expert'],
      messageCount: 35,
      status: 'paused'
    },
    { 
      id: 'session-4', 
      title: 'Leistungsanalyse der Kognitiven Loop', 
      created: new Date(2023, 5, 1), 
      lastUpdated: new Date(2023, 5, 8),
      experts: ['AI Specialist', 'System Architect'],
      messageCount: 64,
      status: 'completed'
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Session-Verwaltung</CardTitle>
            <CardDescription>
              Verwalten Sie Ihre Nexus-Sitzungen und Expertendiskussionen
            </CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neue Session
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map(session => (
            <div key={session.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{session.title}</h3>
                <Badge variant={
                  session.status === 'active' ? 'default' : 
                  session.status === 'paused' ? 'secondary' : 
                  'outline'
                }>
                  {session.status === 'active' ? 'Aktiv' : 
                   session.status === 'paused' ? 'Pausiert' : 
                   'Abgeschlossen'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 my-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Erstellt:</p>
                  <p>{session.created.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Letztes Update:</p>
                  <p>{session.lastUpdated.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Experten:</p>
                  <p>{session.experts.join(', ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nachrichten:</p>
                  <p>{session.messageCount}</p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm">Fortsetzen</Button>
                <Button variant="outline" size="sm">Exportieren</Button>
                <Button variant="ghost" size="sm" className="ml-auto">Löschen</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 