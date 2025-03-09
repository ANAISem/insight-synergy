import { useState, useEffect, useCallback } from 'react';
import { Expert } from '@/components/expert-discussion/ExpertValidationPanel';
import { factCheckingService } from '@/services/fact-checking.service';
import { cognitiveLoopService, CognitiveState } from '@/services/cognitive-loop.service';
import { useToast } from '@/components/ui/use-toast';

export interface Message {
  id: string;
  expertId: string;
  content: string;
  timestamp: string;
  factChecked?: boolean;
  factCheckResult?: any;
  sources?: {
    title: string;
    url: string;
    reliability?: number;
    relevance?: number;
  }[];
  advancedValidation?: AdvancedValidationResult;
}

export interface DebateState {
  experts: Expert[];
  messages: Message[];
  isActive: boolean;
  cognitiveState: CognitiveState | null;
  qualityScore?: number;
  improvements?: string[];
  learningPoints?: string[];
}

export function useExpertDebate(topic: string) {
  const [state, setState] = useState<DebateState>({
    experts: [],
    messages: [],
    isActive: false,
    cognitiveState: null
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Initialisiere die Debatte
  const initializeDebate = useCallback(async (selectedExperts: Expert[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Cognitive Loop initialisieren
      const cognitiveState = await cognitiveLoopService.initialize(topic);
      
      setState(prev => ({
        ...prev,
        experts: selectedExperts,
        isActive: true,
        cognitiveState
      }));
      
      toast({
        title: "Debatte initialisiert",
        description: "Die Experten sind bereit für die Diskussion."
      });
    } catch (err) {
      console.error('Fehler beim Initialisieren der Debatte:', err);
      setError('Die Debatte konnte nicht initialisiert werden.');
      
      toast({
        variant: "destructive",
        title: "Initialisierungsfehler",
        description: "Die Debatte konnte nicht gestartet werden."
      });
    } finally {
      setIsLoading(false);
    }
  }, [topic, toast]);
  
  // Neue Nachricht hinzufügen mit erweiterter Validierung
  const addMessage = useCallback(async (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
    
    try {
      // Fact-Checking durchführen
      const factCheckResult = await factCheckingService.validateStatement({
        statement: message.content,
        context: topic
      });
      
      // Erweiterte Validierung durchführen
      const advancedValidation = await cognitiveLoopService.analyzeSourceWithHistory({
        content: message.content,
        expert: state.experts.find(e => e.id === message.expertId),
        context: topic,
        previousMessages: state.messages
      });
      
      // Quellen validieren
      if (factCheckResult.sources) {
        const sourcesWithReliability = await Promise.all(
          factCheckResult.sources.map(async source => ({
            ...source,
            reliability: await factCheckingService.validateSourceReliability(source.url)
          }))
        );
        
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === newMessage.id ? {
              ...msg,
              factChecked: true,
              factCheckResult,
              sources: sourcesWithReliability,
              advancedValidation
            } : msg
          )
        }));
      }
      
      // Warnungen bei niedrigen Bewertungen
      if (advancedValidation.scores.factualAccuracy < 0.7 || 
          advancedValidation.scores.sourceReliability < 0.7) {
        toast({
          variant: "warning",
          title: "Qualitätswarnung",
          description: "Diese Nachricht enthält möglicherweise unzuverlässige Informationen.",
        });
      }
      
      // Red Flags anzeigen
      if (advancedValidation.redFlags.length > 0) {
        toast({
          variant: "destructive",
          title: "Warnhinweise gefunden",
          description: advancedValidation.redFlags[0],
        });
      }
      
    } catch (err) {
      console.error('Fehler bei der Nachrichtenverarbeitung:', err);
      
      toast({
        variant: "destructive",
        title: "Verarbeitungsfehler",
        description: "Die Nachricht konnte nicht vollständig validiert werden."
      });
    }
  }, [state.messages, state.experts, topic, toast]);
  
  // Feedback zur Diskussion geben
  const provideFeedback = useCallback(async (messageId: string, isCorrect: boolean, explanation?: string) => {
    try {
      await cognitiveLoopService.provideFeedback({
        messageId,
        isCorrect,
        explanation
      });
      
      toast({
        title: "Feedback gespeichert",
        description: "Ihr Feedback wurde erfolgreich verarbeitet."
      });
    } catch (err) {
      console.error('Fehler beim Speichern des Feedbacks:', err);
      
      toast({
        variant: "destructive",
        title: "Feedback-Fehler",
        description: "Ihr Feedback konnte nicht gespeichert werden."
      });
    }
  }, [toast]);
  
  // Nächste Schritte vorhersagen
  const predictNextSteps = useCallback(async () => {
    if (!state.cognitiveState) return;
    
    try {
      const prediction = await cognitiveLoopService.predictNextSteps({
        topic,
        messages: state.messages,
        experts: state.experts
      });
      
      return prediction;
    } catch (err) {
      console.error('Fehler bei der Vorhersage:', err);
      return null;
    }
  }, [state.cognitiveState, state.messages, state.experts, topic]);
  
  // Debatte beenden
  const endDebate = useCallback(async () => {
    try {
      // Finale Analyse durchführen
      const analysis = await cognitiveLoopService.analyzeDiscussion(state.messages);
      
      // Modelle optimieren
      await cognitiveLoopService.optimizeModels();
      
      setState(prev => ({
        ...prev,
        isActive: false,
        qualityScore: analysis.qualityScore,
        improvements: analysis.improvements,
        learningPoints: analysis.learningPoints
      }));
      
      toast({
        title: "Debatte beendet",
        description: "Die Erkenntnisse wurden gespeichert und verarbeitet."
      });
    } catch (err) {
      console.error('Fehler beim Beenden der Debatte:', err);
      
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Debatte konnte nicht ordnungsgemäß beendet werden."
      });
    }
  }, [state.messages, toast]);
  
  // Automatische Optimierung der Modelle
  useEffect(() => {
    if (!state.cognitiveState) return;
    
    const optimizeInterval = setInterval(async () => {
      try {
        await cognitiveLoopService.optimizeModels();
      } catch (err) {
        console.error('Fehler bei der Modelloptimierung:', err);
      }
    }, 1000 * 60 * 30); // Alle 30 Minuten
    
    return () => clearInterval(optimizeInterval);
  }, [state.cognitiveState]);
  
  return {
    state,
    isLoading,
    error,
    initializeDebate,
    addMessage,
    provideFeedback,
    predictNextSteps,
    endDebate
  };
} 