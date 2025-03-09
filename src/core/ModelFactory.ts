import { AdvancedMLEngine } from './AdvancedMLEngine';

/**
 * Factory-Klasse für ML-Modelle
 * Verwendet das Singleton-Pattern für eine zentrale Instanz
 */
export class ModelFactory {
  private static instance: ModelFactory;
  private modelInstance: AdvancedMLEngine | null = null;

  private constructor() {
    // Private Konstruktor für Singleton-Pattern
  }

  /**
   * Liefert die Singleton-Instanz der ModelFactory
   */
  public static getInstance(): ModelFactory {
    if (!ModelFactory.instance) {
      ModelFactory.instance = new ModelFactory();
    }

    return ModelFactory.instance;
  }

  /**
   * Liefert eine Instanz des ML-Models
   * Erstellt das Modell bei Bedarf oder verwendet die gecachte Version
   */
  public async getModel(): Promise<AdvancedMLEngine> {
    if (!this.modelInstance) {
      this.modelInstance = await this.loadModel();
    }

    return this.modelInstance;
  }

  /**
   * Lädt ein neues ML-Modell
   * In dieser vereinfachten Implementierung wird einfach eine neue Instanz erstellt
   */
  private async loadModel(): Promise<AdvancedMLEngine> {
    console.log('Lade ML-Modell...');
    return new AdvancedMLEngine();
  }
} 