import { useState, useEffect, useCallback } from 'react';
import { 
  cognitiveLoopService, 
  CognitiveState, 
  LearningFeedback,
  ModelPerformance, 
  EnhancedValidationResult 
} from '@/services/cognitive-loop.service';
import { useToast } from '@/components/ui/use-toast';
import { useI18n } from '@/hooks/use-i18n';

/**
 * Hook für die Nutzung des kognitiven Loops
 * Vereinfacht die Integration des kognitiven Loops in React-Komponenten
 */
export function useCognitiveLoop() {
  const [cognitiveState, setCognitiveState] = useState<CognitiveState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  /**
   * Initialisiert den kognitiven Loop mit einem Kontext
   * @param context Der Kontext für den kognitiven Loop
   */
  const initialize = useCallback(async (context: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const state = await cognitiveLoopService.initialize(context);
      setCognitiveState(state);
      
      toast({
        title: t('cognitive.initialized'),
        description: t('cognitive.ready_to_learn'),
      });
      
      return state;
    } catch (err) {
      setError(String(err));
      
      toast({
        variant: 'destructive',
        title: t('cognitive.init_error'),
        description: String(err),
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast, t]);

  /**
   * Aktualisiert den Kontext des kognitiven Loops
   * @param newContext Der neue Kontext
   */
  const updateContext = useCallback(async (newContext: string) => {
    if (!cognitiveState) {
      setError(t('cognitive.not_initialized'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      await cognitiveLoopService.updateContext(newContext);
      const currentState = cognitiveLoopService.getCurrentState();
      setCognitiveState(currentState);
    } catch (err) {
      setError(String(err));
      
      toast({
        variant: 'destructive',
        title: t('cognitive.update_error'),
        description: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, [cognitiveState, toast, t]);

  /**
   * Stellt Feedback für den kognitiven Loop bereit
   * @param feedback Das Feedback-Objekt
   */
  const provideFeedback = useCallback(async (feedback: LearningFeedback) => {
    if (!cognitiveState) {
      setError(t('cognitive.not_initialized'));
      return;
    }
    
    try {
      await cognitiveLoopService.provideFeedback(feedback);
      
      toast({
        title: t('cognitive.feedback_sent'),
        description: t('cognitive.feedback_processing'),
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('cognitive.feedback_error'),
        description: String(err),
      });
    }
  }, [cognitiveState, toast, t]);

  /**
   * Analysiert eine Quelle mit historischem Kontext
   * @param source Die zu analysierende Quelle
   */
  const analyzeSourceWithHistory = useCallback(async (source: any): Promise<EnhancedValidationResult | null> => {
    if (!cognitiveState) {
      setError(t('cognitive.not_initialized'));
      return null;
    }
    
    setIsLoading(true);
    
    try {
      const result = await cognitiveLoopService.analyzeSourceWithHistory(source);
      const currentState = cognitiveLoopService.getCurrentState();
      setCognitiveState(currentState);
      return result;
    } catch (err) {
      setError(String(err));
      
      toast({
        variant: 'destructive',
        title: t('cognitive.analysis_error'),
        description: String(err),
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [cognitiveState, toast, t]);

  /**
   * Optimiert die Modelle des kognitiven Loops
   */
  const optimizeModels = useCallback(async () => {
    if (!cognitiveState) {
      setError(t('cognitive.not_initialized'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      await cognitiveLoopService.optimizeModels();
      
      toast({
        title: t('cognitive.optimization_complete'),
        description: t('cognitive.models_improved'),
      });
    } catch (err) {
      setError(String(err));
      
      toast({
        variant: 'destructive',
        title: t('cognitive.optimization_error'),
        description: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, [cognitiveState, toast, t]);

  /**
   * Holt die Performance-Daten der Modelle
   */
  const getModelPerformance = useCallback(async (): Promise<ModelPerformance[] | null> => {
    if (!cognitiveState) {
      setError(t('cognitive.not_initialized'));
      return null;
    }
    
    try {
      return await cognitiveLoopService.getModelPerformance();
    } catch (err) {
      setError(String(err));
      
      toast({
        variant: 'destructive',
        title: t('cognitive.performance_error'),
        description: String(err),
      });
      
      return null;
    }
  }, [cognitiveState, toast, t]);

  /**
   * Analysiert eine Diskussion
   * @param messages Die zu analysierenden Nachrichten
   */
  const analyzeDiscussion = useCallback(async (messages: any[]) => {
    if (!cognitiveState) {
      setError(t('cognitive.not_initialized'));
      return null;
    }
    
    setIsLoading(true);
    
    try {
      const result = await cognitiveLoopService.analyzeDiscussion(messages);
      return result;
    } catch (err) {
      setError(String(err));
      
      toast({
        variant: 'destructive',
        title: t('cognitive.discussion_analysis_error'),
        description: String(err),
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [cognitiveState, toast, t]);

  // Automatische regelmäßige Optimierung (alle 30 Minuten)
  useEffect(() => {
    if (!cognitiveState) return;
    
    const interval = setInterval(() => {
      optimizeModels();
    }, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [cognitiveState, optimizeModels]);

  return {
    cognitiveState,
    isLoading,
    error,
    initialize,
    updateContext,
    provideFeedback,
    analyzeSourceWithHistory,
    optimizeModels,
    getModelPerformance,
    analyzeDiscussion
  };
} 