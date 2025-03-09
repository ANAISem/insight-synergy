import { apiService } from '@/lib/api/apiService';
import { factCheckingService } from '@/lib/fact-checking/factCheckingService';

export interface CognitiveState {
  currentContext: string;
  learningProgress: number;
  activeModels: string[];
  confidenceScores: {
    [key: string]: number;
  };
  lastUpdate: Date;
  sourceValidations: {
    [sourceId: string]: AdvancedValidationResult;
  };
}

export interface LearningFeedback {
  messageId: string;
  isCorrect: boolean;
  explanation?: string;
  suggestedImprovement?: string;
}

export interface ModelPerformance {
  modelId: string;
  accuracy: number;
  latency: number;
  reliability: number;
  usageCount: number;
}

interface PromptAnalysisResult {
  category: 'scientific' | 'practical' | 'general';
  contextRatio: number;
  wordCount: number;
  sentenceCount: number;
  safetyScore: number;
  improvements: string[];
}

interface EnhancedValidationResult extends AdvancedValidationResult {
  promptAnalysis: PromptAnalysisResult;
  structuredResponse: {
    mainPoints: string[];
    contextualInfo: string[];
    safetyWarnings: string[];
  };
}

class CognitiveLoopService {
  private readonly baseUrl: string;
  private currentState: CognitiveState | null = null;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async initialize(context: string): Promise<CognitiveState> {
    try {
      const response = await apiService.post<CognitiveState>(
        `${this.baseUrl}/cognitive-loop/initialize`,
        { context }
      );
      
      this.currentState = response.data;
      return response.data;
    } catch (error) {
      console.error('Failed to initialize cognitive loop:', error);
      throw new Error('Cognitive loop initialization failed');
    }
  }
  
  async updateContext(newContext: string): Promise<void> {
    if (!this.currentState) {
      throw new Error('Cognitive loop not initialized');
    }
    
    try {
      const response = await apiService.post(
        `${this.baseUrl}/cognitive-loop/update-context`,
        { 
          currentContext: this.currentState.currentContext,
          newContext 
        }
      );
      
      this.currentState = {
        ...this.currentState,
        currentContext: newContext,
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error('Failed to update cognitive context:', error);
      throw error;
    }
  }
  
  async provideFeedback(feedback: LearningFeedback): Promise<void> {
    if (!this.currentState) {
      throw new Error('Cognitive loop not initialized');
    }
    
    try {
      await apiService.post(
        `${this.baseUrl}/cognitive-loop/feedback`,
        {
          ...feedback,
          context: this.currentState.currentContext
        }
      );
    } catch (error) {
      console.error('Failed to provide feedback:', error);
      throw error;
    }
  }
  
  async getModelPerformance(): Promise<ModelPerformance[]> {
    try {
      const response = await apiService.get<ModelPerformance[]>(
        `${this.baseUrl}/cognitive-loop/performance`
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to get model performance:', error);
      return [];
    }
  }
  
  async optimizeModels(): Promise<void> {
    if (!this.currentState) {
      throw new Error('Cognitive loop not initialized');
    }
    
    try {
      const response = await apiService.post<CognitiveState>(
        `${this.baseUrl}/cognitive-loop/optimize`,
        { currentState: this.currentState }
      );
      
      this.currentState = response.data;
    } catch (error) {
      console.error('Failed to optimize models:', error);
      throw error;
    }
  }
  
  async analyzeDiscussion(messages: any[]): Promise<{
    qualityScore: number;
    improvements: string[];
    learningPoints: string[];
  }> {
    try {
      const response = await apiService.post(
        `${this.baseUrl}/cognitive-loop/analyze-discussion`,
        { messages }
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to analyze discussion:', error);
      throw error;
    }
  }
  
  async predictNextSteps(currentState: any): Promise<{
    suggestedActions: string[];
    confidence: number;
  }> {
    try {
      const response = await apiService.post(
        `${this.baseUrl}/cognitive-loop/predict`,
        { currentState }
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to predict next steps:', error);
      return {
        suggestedActions: [],
        confidence: 0
      };
    }
  }
  
  private async analyzeWithPrompt(content: string, context: string): Promise<PromptAnalysisResult> {
    try {
      const response = await apiService.post<PromptAnalysisResult>(
        `${this.baseUrl}/cognitive-loop/analyze-prompt`,
        {
          content,
          context,
          promptConfig: {
            minWords: content.length > 500 ? 50 : 31,
            targetContextRatio: 0.85,
            requiresSafety: true,
            category: this.determineCategory(content)
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Fehler bei der Prompt-Analyse:', error);
      throw error;
    }
  }

  private determineCategory(content: string): 'scientific' | 'practical' | 'general' {
    const scientificIndicators = ['studie', 'forschung', 'analyse', 'hypothese', 'evidenz'];
    const practicalIndicators = ['anleitung', 'schritte', 'implementierung', 'lösung', 'methode'];
    
    const lowerContent = content.toLowerCase();
    
    if (scientificIndicators.some(indicator => lowerContent.includes(indicator))) {
      return 'scientific';
    } else if (practicalIndicators.some(indicator => lowerContent.includes(indicator))) {
      return 'practical';
    }
    
    return 'general';
  }

  async analyzeSourceWithHistory(source: any): Promise<EnhancedValidationResult> {
    if (!this.currentState) {
      throw new Error('Cognitive loop not initialized');
    }

    try {
      // Vorherige Validierungen abrufen
      const previousValidations = Object.values(this.currentState.sourceValidations || {});
      
      // Relevante vorherige Validierungen finden
      const relevantValidations = previousValidations.filter(validation => {
        return this.calculateSimilarity(source.content, validation.analysis) > 0.7;
      });

      // Prompt-basierte Analyse durchführen
      const promptAnalysis = await this.analyzeWithPrompt(
        source.content,
        this.currentState.currentContext
      );

      // Neue Validierung mit optimiertem Prompt
      const baseValidation = await factCheckingService.validateSourceAdvanced(source);
      
      // Strukturierte Antwort basierend auf Prompt-Kategorien erstellen
      const structuredResponse = this.createStructuredResponse(
        baseValidation,
        promptAnalysis,
        source.content
      );

      // Erweiterte Validierung zusammenstellen
      const enhancedValidation: EnhancedValidationResult = {
        ...baseValidation,
        promptAnalysis,
        structuredResponse,
        scores: {
          ...baseValidation.scores,
          contextQuality: promptAnalysis.contextRatio,
          responseStructure: this.calculateStructureScore(promptAnalysis)
        }
      };

      // State aktualisieren
      this.currentState = {
        ...this.currentState,
        sourceValidations: {
          ...this.currentState.sourceValidations,
          [source.id]: enhancedValidation
        }
      };

      // Bewertungskriterien optimieren
      await this.optimizeValidationCriteria([...relevantValidations, enhancedValidation]);

      return enhancedValidation;
    } catch (error) {
      console.error('Fehler bei der erweiterten Quellenanalyse:', error);
      throw error;
    }
  }

  private createStructuredResponse(
    validation: AdvancedValidationResult,
    promptAnalysis: PromptAnalysisResult,
    content: string
  ) {
    const response = {
      mainPoints: [] as string[],
      contextualInfo: [] as string[],
      safetyWarnings: [] as string[]
    };

    // Hauptpunkte nach Pareto-Prinzip (80/20)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    const mainPointCount = Math.ceil(sentences.length * 0.2);
    response.mainPoints = sentences
      .slice(0, mainPointCount)
      .map(s => s.trim());

    // Kontextinformationen basierend auf Kategorie
    if (promptAnalysis.category === 'scientific') {
      response.contextualInfo = validation.analysis.split('\n')
        .filter(line => line.includes('Quelle:') || line.includes('Methodik:'));
    }

    // Sicherheitswarnungen
    if (validation.redFlags.length > 0) {
      response.safetyWarnings = validation.redFlags.map(flag => 
        `Achtung: ${flag}`
      );
    }

    return response;
  }

  private calculateStructureScore(analysis: PromptAnalysisResult): number {
    const weights = {
      contextRatio: 0.4,
      wordCount: 0.3,
      sentenceCount: 0.3
    };

    const scores = {
      contextRatio: Math.min(Math.abs(analysis.contextRatio - 0.85) * 2, 1),
      wordCount: analysis.category === 'scientific' 
        ? Math.min(analysis.wordCount / 50, 1)
        : Math.min(analysis.wordCount / 31, 1),
      sentenceCount: Math.min(analysis.sentenceCount / 5, 1)
    };

    return Object.entries(weights).reduce(
      (score, [key, weight]) => score + (scores[key as keyof typeof scores] * weight),
      0
    );
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Vereinfachte Implementierung der Textsimilaritätsberechnung
    const words1 = new Set(text1.toLowerCase().split(/\W+/));
    const words2 = new Set(text2.toLowerCase().split(/\W+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    return intersection.size / Math.max(words1.size, words2.size);
  }

  private async optimizeValidationCriteria(historicalValidations: AdvancedValidationResult[]): Promise<void> {
    if (historicalValidations.length === 0) return;

    try {
      // Berechne Durchschnittswerte und Abweichungen
      const averageScores = this.calculateAverageScores(historicalValidations);
      
      // Aktualisiere die Gewichtung der Bewertungskriterien
      await this.updateValidationWeights(averageScores);
      
    } catch (error) {
      console.error('Fehler bei der Optimierung der Validierungskriterien:', error);
    }
  }

  private calculateAverageScores(validations: AdvancedValidationResult[]): Record<string, number> {
    const totals: Record<string, number> = {};
    
    validations.forEach(validation => {
      Object.entries(validation.scores).forEach(([key, value]) => {
        totals[key] = (totals[key] || 0) + value;
      });
    });

    return Object.fromEntries(
      Object.entries(totals).map(([key, total]) => [
        key,
        total / validations.length
      ])
    );
  }

  private async updateValidationWeights(averageScores: Record<string, number>): Promise<void> {
    try {
      await apiService.post(
        `${this.baseUrl}/cognitive-loop/update-weights`,
        { averageScores }
      );
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Gewichtungen:', error);
    }
  }
  
  getCurrentState(): CognitiveState | null {
    return this.currentState;
  }
}

export const cognitiveLoopService = new CognitiveLoopService(
  process.env.NEXT_PUBLIC_API_URL || ''
); 