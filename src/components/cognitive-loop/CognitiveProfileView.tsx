'use client';

import React, { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Settings,
  RefreshCw,
  TrendingUp,
  Sparkles,
  Target,
  Book,
  MessageSquare,
  PieChart,
  Download
} from 'lucide-react';

import { 
  CognitiveProfile, 
  ThoughtPattern, 
  CognitivePreference, 
  initCognitiveLoop 
} from '@/lib/cognitive-loop/CognitiveModel';

export function CognitiveProfileView({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<CognitiveProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lade das kognitive Profil
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const manager = await initCognitiveLoop(userId);
        setProfile(manager.getProfile());
      } catch (err) {
        console.error('Fehler beim Laden des kognitiven Profils:', err);
        setError('Das kognitive Profil konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  // Aktualisiere das Profil
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const manager = await initCognitiveLoop(userId);
      setProfile(manager.getProfile());
    } catch (err) {
      console.error('Fehler beim Aktualisieren des Profils:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Lade kognitives Profil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-6 text-center">
        <h3 className="mb-2 text-lg font-medium">Fehler beim Laden</h3>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={handleRefresh} className="mt-4">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <h3 className="mb-2 text-lg font-medium">Noch kein Profil erstellt</h3>
        <p className="text-muted-foreground">
          Dein kognitives Profil wird erstellt, sobald du mit Insight Synergy interagierst.
        </p>
      </div>
    );
  }

  // Sortiere Denkmuster nach Stärke
  const sortedPatterns = [...profile.thoughtPatterns].sort((a, b) => b.strength - a.strength);
  
  // Sortiere Präferenzen nach absolutem Wert
  const sortedPreferences = [...profile.preferences].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  
  // Sortiere Themeninteressen
  const sortedInterests = Object.entries(profile.topicInterests)
    .map(([topic, interest]) => ({ topic, interest }))
    .sort((a, b) => b.interest - a.interest);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dein kognitives Profil</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Aktualisiere...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil-Übersicht</CardTitle>
          <CardDescription>
            Dein kognitives Profil basiert auf {profile.interactions.length} 
            Interaktionen und wird ständig angepasst.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard 
              title="Denkmuster" 
              value={profile.thoughtPatterns.length}
              description="Erkannte Denkmuster"
              icon={<Brain className="h-5 w-5 text-blue-500" />}
            />
            <StatsCard 
              title="Präferenzen" 
              value={profile.preferences.length}
              description="Identifizierte Präferenzen"
              icon={<Settings className="h-5 w-5 text-purple-500" />}
            />
            <StatsCard 
              title="Interessen" 
              value={Object.keys(profile.topicInterests).length}
              description="Erkannte Themeninteressen"
              icon={<Target className="h-5 w-5 text-green-500" />}
            />
            <StatsCard 
              title="Interaktionen" 
              value={profile.interactions.length}
              description="Erfasste Interaktionen"
              icon={<MessageSquare className="h-5 w-5 text-amber-500" />}
            />
          </div>
          
          <p className="mt-4 text-sm text-muted-foreground">
            Zuletzt aktualisiert: {new Date(profile.lastUpdated).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="thoughtPatterns">
        <TabsList>
          <TabsTrigger value="thoughtPatterns">
            <Brain className="mr-2 h-4 w-4" />
            Denkmuster
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Settings className="mr-2 h-4 w-4" />
            Präferenzen
          </TabsTrigger>
          <TabsTrigger value="interests">
            <Target className="mr-2 h-4 w-4" />
            Interessen
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="thoughtPatterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deine Denkmuster</CardTitle>
              <CardDescription>
                Erkannte Muster in deinem Denken und deiner Problemlösung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sortedPatterns.length > 0 ? (
                  sortedPatterns.map((pattern) => (
                    <ThoughtPatternItem key={pattern.id} pattern={pattern} />
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">
                    Noch keine Denkmuster erkannt. Durch mehr Interaktionen wird 
                    dein Profil genauer.
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <p className="text-xs text-muted-foreground">
                Denkmuster werden durch Analyse deiner Fragen und Reaktionen erkannt.
                Je mehr du mit dem System interagierst, desto genauer werden die Muster.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deine Präferenzen</CardTitle>
              <CardDescription>
                Erkannte Vorlieben in Kommunikation, Lernen und Problemlösung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sortedPreferences.length > 0 ? (
                  sortedPreferences.map((preference) => (
                    <PreferenceItem key={preference.id} preference={preference} />
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">
                    Noch keine Präferenzen erkannt. Durch mehr Interaktionen und Bewertungen
                    werden deine Präferenzen deutlicher.
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <p className="text-xs text-muted-foreground">
                Präferenzen werden vor allem durch deine Bewertungen und Auswahlen in Konversationen erkannt.
                Stärkere Präferenzen haben mehr Einfluss auf die Anpassung der Antworten.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="interests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deine Interessen</CardTitle>
              <CardDescription>
                Themen und Bereiche, die dich besonders interessieren
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedInterests.length > 0 ? (
                  sortedInterests.slice(0, 10).map((interest) => (
                    <InterestItem 
                      key={interest.topic} 
                      topic={interest.topic} 
                      interest={interest.interest} 
                    />
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">
                    Noch keine Interessen erkannt. Durch mehr Fragen und Themen
                    werden deine Interessen deutlicher.
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <p className="text-xs text-muted-foreground">
                Interessen werden aus den Themen deiner Fragen und Interaktionen abgeleitet.
                Diese helfen dem System, relevantere Inhalte zu priorisieren.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader>
          <CardTitle>Erweiterte Funktionen</CardTitle>
          <CardDescription>
            Manage dein kognitives Profil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-24 flex-col items-center justify-center space-y-2">
              <Download className="h-6 w-6 text-primary" />
              <span>Profil exportieren</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col items-center justify-center space-y-2">
              <PieChart className="h-6 w-6 text-amber-500" />
              <span>Profilanalyse</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col items-center justify-center space-y-2">
              <TrendingUp className="h-6 w-6 text-green-500" />
              <span>Entwicklung anzeigen</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ 
  title, 
  value, 
  description, 
  icon 
}: { 
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        {icon}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ThoughtPatternItem({ pattern }: { pattern: ThoughtPattern }) {
  // Berechne Farbe basierend auf dem Mustertyp
  const getColorForType = (type: ThoughtPattern['patternType']): string => {
    switch (type) {
      case 'concept': return 'bg-blue-600';
      case 'framework': return 'bg-purple-600';
      case 'approach': return 'bg-green-600';
      case 'mindset': return 'bg-amber-600';
      default: return 'bg-slate-600';
    }
  };
  
  const getTypeLabel = (type: ThoughtPattern['patternType']): string => {
    switch (type) {
      case 'concept': return 'Konzept';
      case 'framework': return 'Denkrahmen';
      case 'approach': return 'Herangehensweise';
      case 'mindset': return 'Denkweise';
      default: return type;
    }
  };
  
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{pattern.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs text-white ${getColorForType(pattern.patternType)}`}>
            {getTypeLabel(pattern.patternType)}
          </span>
        </div>
        <span className="text-sm font-medium">{Math.round(pattern.strength * 100)}%</span>
      </div>
      <Progress value={pattern.strength * 100} className={`h-2 ${getColorForType(pattern.patternType)}`} />
      <p className="mt-1 text-sm text-muted-foreground">{pattern.description}</p>
    </div>
  );
}

function PreferenceItem({ preference }: { preference: CognitivePreference }) {
  // Berechne absolute Stärke für die Fortschrittsanzeige
  const absoluteValue = Math.abs(preference.value);
  
  // Bestimme die Richtung der Präferenz
  const isPositive = preference.value > 0;
  
  // Anpassung der Beschreibung basierend auf der Richtung
  const description = isPositive 
    ? `Du bevorzugst ${preference.name} in deinen Interaktionen.`
    : `Du vermeidest ${preference.name} in deinen Interaktionen.`;
  
  // Sicherheit der Präferenz
  const confidenceLabel = preference.confidence < 0.3 
    ? 'Geringe Sicherheit' 
    : preference.confidence < 0.7 
      ? 'Mittlere Sicherheit' 
      : 'Hohe Sicherheit';
  
  // Farbgebung basierend auf der Kategorie
  const getColorForCategory = (category: CognitivePreference['category']): string => {
    switch (category) {
      case 'communication': return isPositive ? 'bg-blue-600' : 'bg-blue-300';
      case 'learning': return isPositive ? 'bg-green-600' : 'bg-green-300';
      case 'decision': return isPositive ? 'bg-purple-600' : 'bg-purple-300';
      case 'problem-solving': return isPositive ? 'bg-amber-600' : 'bg-amber-300';
      default: return isPositive ? 'bg-slate-600' : 'bg-slate-300';
    }
  };
  
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{preference.name}</span>
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
            {confidenceLabel}
          </span>
        </div>
        <span className="text-sm font-medium">
          {isPositive ? '+' : '-'}{Math.round(absoluteValue * 100)}%
        </span>
      </div>
      <Progress value={absoluteValue * 100} className={`h-2 ${getColorForCategory(preference.category)}`} />
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function InterestItem({ topic, interest }: { topic: string; interest: number }) {
  // Farbskala basierend auf dem Interesse
  const getInterestColor = (value: number): string => {
    if (value > 0.8) return 'bg-green-600';
    if (value > 0.6) return 'bg-green-500';
    if (value > 0.4) return 'bg-amber-500';
    if (value > 0.2) return 'bg-amber-400';
    return 'bg-gray-400';
  };
  
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="capitalize font-medium">{topic}</span>
        <span className="text-sm font-medium">{Math.round(interest * 100)}%</span>
      </div>
      <Progress value={interest * 100} className={`h-2 ${getInterestColor(interest)}`} />
    </div>
  );
} 