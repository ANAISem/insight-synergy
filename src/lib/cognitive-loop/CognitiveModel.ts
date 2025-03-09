/**
 * Cognitive Loop AI Model
 * 
 * Dieses Modul implementiert das adaptive Lernsystem, das Nutzerpräferenzen und
 * Denkmuster erkennt und speichert. Es ist das Herzstück der Personalisierung von
 * Insight Synergy.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Typen für das Cognitive Loop-System
 */
export interface ThoughtPattern {
  id: string;
  patternType: 'concept' | 'framework' | 'approach' | 'mindset';
  name: string;
  description: string;
  strength: number;  // 0-1, wie stark dieses Muster ausgeprägt ist
  context?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CognitivePreference {
  id: string;
  category: 'communication' | 'learning' | 'decision' | 'problem-solving';
  name: string;
  value: number;  // -1 bis 1, negative Werte bedeuten Präferenz für das Gegenteil
  confidence: number;  // 0-1, wie sicher wir über diese Präferenz sind
  examples: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionInteraction {
  id: string;
  timestamp: string;
  type: 'question' | 'response' | 'rating' | 'selection';
  content: string;
  metadata: Record<string, any>;
}

export interface CognitiveProfile {
  userId: string;
  thoughtPatterns: ThoughtPattern[];
  preferences: CognitivePreference[];
  interactions: SessionInteraction[];
  topicInterests: Record<string, number>;
  lastUpdated: string;
}

/**
 * Cognitive Loop Manager
 * 
 * Hauptklasse zur Verwaltung des kognitiven Profils eines Nutzers
 */
export class CognitiveLoopManager {
  private profile: CognitiveProfile;
  private initialized: boolean = false;
  private pendingChanges: boolean = false;
  
  constructor(userId: string) {
    this.profile = {
      userId,
      thoughtPatterns: [],
      preferences: [],
      interactions: [],
      topicInterests: {},
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Lädt das kognitive Profil aus dem Speicher
   */
  async loadProfile(): Promise<boolean> {
    // TODO: Tatsächliche Implementierung mit API-Aufruf
    try {
      // Simulierter API-Aufruf, später durch echte Implementierung ersetzen
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Beispielprofil für Entwicklungszwecke
      if (process.env.NODE_ENV === 'development') {
        this.profile = this.generateDemoProfile(this.profile.userId);
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Fehler beim Laden des kognitiven Profils:', error);
      return false;
    }
  }
  
  /**
   * Speichert das kognitive Profil
   */
  async saveProfile(): Promise<boolean> {
    // TODO: Tatsächliche Implementierung mit API-Aufruf
    try {
      // Simulierter API-Aufruf, später durch echte Implementierung ersetzen
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.profile.lastUpdated = new Date().toISOString();
      this.pendingChanges = false;
      return true;
    } catch (error) {
      console.error('Fehler beim Speichern des kognitiven Profils:', error);
      return false;
    }
  }
  
  /**
   * Fügt eine neue Interaktion hinzu und aktualisiert das Profil
   */
  addInteraction(type: SessionInteraction['type'], content: string, metadata: Record<string, any> = {}): SessionInteraction {
    const interaction: SessionInteraction = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type,
      content,
      metadata
    };
    
    this.profile.interactions.push(interaction);
    this.pendingChanges = true;
    
    // Aktualisiere das Profil basierend auf der neuen Interaktion
    this.updateProfileFromInteraction(interaction);
    
    return interaction;
  }
  
  /**
   * Aktualisiert das Profil basierend auf einer Interaktion
   */
  private updateProfileFromInteraction(interaction: SessionInteraction): void {
    // Extrahiere Themen aus dem Inhalt
    const topics = this.extractTopics(interaction.content);
    
    // Aktualisiere Themeninteressen
    topics.forEach(topic => {
      if (!this.profile.topicInterests[topic]) {
        this.profile.topicInterests[topic] = 0;
      }
      
      // Erhöhe das Interesse basierend auf dem Interaktionstyp
      this.profile.topicInterests[topic] += (interaction.type === 'rating' || interaction.type === 'selection') ? 0.5 : 0.2;
      
      // Begrenze den Wert auf 0-1
      this.profile.topicInterests[topic] = Math.min(1, this.profile.topicInterests[topic]);
    });
    
    // Analysiere die Interaktion auf Denkmuster und Präferenzen
    if (interaction.type === 'question' || interaction.type === 'response') {
      this.analyzeThoughtPatterns(interaction);
    }
    
    // Präferenzen aus Bewertungsinteraktionen lernen
    if (interaction.type === 'rating' && interaction.metadata.rating) {
      this.learnFromRating(interaction);
    }
  }
  
  /**
   * Extrahiert Themen aus einem Text
   * (Vereinfachte Version, in Produktion würde hier NLP verwendet)
   */
  private extractTopics(text: string): string[] {
    // TODO: Implementiere tatsächliche NLP-basierte Themenextraktion
    
    // Vereinfachte Implementierung: Große Wörter als "Themen" betrachten
    return text
      .split(/\s+/)
      .filter(word => word.length > 6)
      .map(word => word.toLowerCase())
      .filter((v, i, a) => a.indexOf(v) === i) // Deduplizieren
      .slice(0, 3); // Maximal 3 Themen
  }
  
  /**
   * Analysiert die Interaktion auf Denkmuster
   */
  private analyzeThoughtPatterns(interaction: SessionInteraction): void {
    // TODO: Implementiere tatsächliche Denkmusteranalyse
    
    // In einer vollständigen Implementierung würde hier eine KI-basierte Analyse stattfinden
    // Für Entwicklungszwecke generieren wir zufällige Muster, wenn der Text bestimmte Schlüsselwörter enthält
    
    const content = interaction.content.toLowerCase();
    
    if (content.includes('systematisch') || content.includes('struktur') || content.includes('prozess')) {
      this.addOrUpdateThoughtPattern('framework', 'Systematischer Denker', 
        'Bevorzugt strukturierte und methodische Herangehensweisen', 0.7);
    }
    
    if (content.includes('kreativ') || content.includes('innovation') || content.includes('neu')) {
      this.addOrUpdateThoughtPattern('approach', 'Kreativer Problemlöser', 
        'Sucht nach innovativen und unkonventionellen Lösungen', 0.6);
    }
    
    if (content.includes('detail') || content.includes('genau') || content.includes('präzise')) {
      this.addOrUpdateThoughtPattern('mindset', 'Detailorientiert', 
        'Legt großen Wert auf Genauigkeit und Details', 0.8);
    }
  }
  
  /**
   * Fügt ein Denkmuster hinzu oder aktualisiert es
   */
  private addOrUpdateThoughtPattern(patternType: ThoughtPattern['patternType'], name: string, description: string, strength: number): void {
    const existing = this.profile.thoughtPatterns.find(p => p.name === name);
    
    if (existing) {
      // Aktualisiere vorhandenes Muster
      existing.strength = (existing.strength * 0.7) + (strength * 0.3); // Gewichteter Durchschnitt
      existing.updatedAt = new Date().toISOString();
    } else {
      // Füge neues Muster hinzu
      this.profile.thoughtPatterns.push({
        id: uuidv4(),
        patternType,
        name,
        description,
        strength,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    this.pendingChanges = true;
  }
  
  /**
   * Lernt aus einer Bewertungsinteraktion
   */
  private learnFromRating(interaction: SessionInteraction): void {
    const rating = interaction.metadata.rating;
    const contentType = interaction.metadata.contentType;
    
    if (typeof rating !== 'number' || !contentType) return;
    
    // Positive Bewertung für "detaillierte" Antworten
    if (contentType === 'detailed' && rating > 0) {
      this.addOrUpdatePreference('communication', 'Detaillierte Kommunikation', 0.6);
    }
    
    // Positive Bewertung für "prägnante" Antworten
    if (contentType === 'concise' && rating > 0) {
      this.addOrUpdatePreference('communication', 'Prägnante Kommunikation', -0.6);
    }
    
    // Positive Bewertung für "technische" Antworten
    if (contentType === 'technical' && rating > 0) {
      this.addOrUpdatePreference('communication', 'Technische Sprache', 0.7);
    }
  }
  
  /**
   * Fügt eine Präferenz hinzu oder aktualisiert sie
   */
  private addOrUpdatePreference(category: CognitivePreference['category'], name: string, value: number): void {
    const existing = this.profile.preferences.find(p => p.name === name);
    
    if (existing) {
      // Aktualisiere vorhandene Präferenz
      existing.value = (existing.value * 0.8) + (value * 0.2); // Gewichteter Durchschnitt
      existing.confidence = Math.min(1, existing.confidence + 0.1); // Erhöhe Konfidenz
      existing.updatedAt = new Date().toISOString();
    } else {
      // Füge neue Präferenz hinzu
      this.profile.preferences.push({
        id: uuidv4(),
        category,
        name,
        value,
        confidence: 0.3, // Starte mit niedriger Konfidenz
        examples: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    this.pendingChanges = true;
  }
  
  /**
   * Gibt das aktuelle kognitive Profil zurück
   */
  getProfile(): CognitiveProfile {
    return this.profile;
  }
  
  /**
   * Gibt die Top-Denkmuster zurück, sortiert nach Stärke
   */
  getTopThoughtPatterns(limit: number = 5): ThoughtPattern[] {
    return [...this.profile.thoughtPatterns]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, limit);
  }
  
  /**
   * Gibt die Top-Themeninteressen zurück
   */
  getTopInterests(limit: number = 5): { topic: string, interest: number }[] {
    return Object.entries(this.profile.topicInterests)
      .map(([topic, interest]) => ({ topic, interest }))
      .sort((a, b) => b.interest - a.interest)
      .slice(0, limit);
  }
  
  /**
   * Gibt die stärksten Präferenzen zurück
   */
  getStrongPreferences(): CognitivePreference[] {
    return this.profile.preferences
      .filter(p => p.confidence > 0.5 && Math.abs(p.value) > 0.4)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }
  
  /**
   * Generiert ein Demo-Profil zu Entwicklungszwecken
   */
  private generateDemoProfile(userId: string): CognitiveProfile {
    return {
      userId,
      thoughtPatterns: [
        {
          id: uuidv4(),
          patternType: 'framework',
          name: 'Systematischer Denker',
          description: 'Bevorzugt strukturierte und methodische Herangehensweisen',
          strength: 0.85,
          createdAt: new Date(Date.now() - 864000000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: uuidv4(),
          patternType: 'approach',
          name: 'Analytischer Problemlöser',
          description: 'Zerlegt komplexe Probleme in überschaubare Bestandteile',
          strength: 0.75,
          createdAt: new Date(Date.now() - 864000000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: uuidv4(),
          patternType: 'mindset',
          name: 'Zukunftsorientiert',
          description: 'Betrachtet langfristige Auswirkungen und Potenziale',
          strength: 0.65,
          createdAt: new Date(Date.now() - 864000000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString()
        }
      ],
      preferences: [
        {
          id: uuidv4(),
          category: 'communication',
          name: 'Detaillierte Kommunikation',
          value: 0.7,
          confidence: 0.8,
          examples: ['Hat ausführliche Erklärungen positiv bewertet', 'Stellt detaillierte Nachfragen'],
          createdAt: new Date(Date.now() - 864000000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: uuidv4(),
          category: 'learning',
          name: 'Visuelles Lernen',
          value: 0.5,
          confidence: 0.6,
          examples: ['Reagiert positiv auf grafische Darstellungen'],
          createdAt: new Date(Date.now() - 864000000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: uuidv4(),
          category: 'problem-solving',
          name: 'Datenbasierte Entscheidungen',
          value: 0.8,
          confidence: 0.7,
          examples: ['Fragt nach Daten und Statistiken', 'Bewertet datengestützte Antworten besser'],
          createdAt: new Date(Date.now() - 864000000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString()
        }
      ],
      interactions: [
        {
          id: uuidv4(),
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          type: 'question',
          content: 'Wie kann ich die Effizienz meines Teams verbessern?',
          metadata: {}
        },
        {
          id: uuidv4(),
          timestamp: new Date(Date.now() - 85000000).toISOString(),
          type: 'rating',
          content: 'Bewertung',
          metadata: {
            rating: 1,
            contentType: 'detailed',
            responseId: 'resp-123'
          }
        }
      ],
      topicInterests: {
        'effizienz': 0.7,
        'teamarbeit': 0.65,
        'management': 0.8,
        'technologie': 0.9,
        'innovation': 0.75
      },
      lastUpdated: new Date().toISOString()
    };
  }
}

// Singleton für globalen Zustand
let cognitiveLoopInstance: CognitiveLoopManager | null = null;

/**
 * Initialisiert den Cognitive Loop Manager für einen Benutzer
 */
export const initCognitiveLoop = async (userId: string): Promise<CognitiveLoopManager> => {
  if (cognitiveLoopInstance) {
    return cognitiveLoopInstance;
  }
  
  cognitiveLoopInstance = new CognitiveLoopManager(userId);
  await cognitiveLoopInstance.loadProfile();
  
  return cognitiveLoopInstance;
};

/**
 * Utility-Funktion zum Visualisieren eines kognitiven Profils
 */
export const visualizeCognitiveProfile = (profile: CognitiveProfile): string => {
  // In einer vollständigen Implementierung würde hier eine Visualisierung generiert
  // Für jetzt geben wir eine vereinfachte Textdarstellung zurück
  
  const patternStr = profile.thoughtPatterns
    .sort((a, b) => b.strength - a.strength)
    .map(p => `- ${p.name} (${Math.round(p.strength * 100)}%): ${p.description}`)
    .join('\n');
    
  const prefStr = profile.preferences
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .map(p => {
      const direction = p.value > 0 ? 'Präferiert' : 'Vermeidet';
      const value = Math.abs(Math.round(p.value * 100));
      const confidence = Math.round(p.confidence * 100);
      return `- ${direction} ${p.name} (${value}%, Konfidenz: ${confidence}%)`;
    })
    .join('\n');
    
  const topicStr = Object.entries(profile.topicInterests)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, interest]) => `- ${topic} (${Math.round(interest * 100)}%)`)
    .join('\n');
  
  return `
Kognitives Profil für ${profile.userId}
Zuletzt aktualisiert: ${new Date(profile.lastUpdated).toLocaleString()}

DENKMUSTER:
${patternStr}

PRÄFERENZEN:
${prefStr}

THEMENINTERESSEN:
${topicStr}
  `;
}; 