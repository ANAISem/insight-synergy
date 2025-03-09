import { AdaptiveLearningSystem } from '../adaptiveLearning';

describe('AdaptiveLearningSystem', () => {
  let adaptiveSystem: AdaptiveLearningSystem;

  beforeEach(() => {
    adaptiveSystem = new AdaptiveLearningSystem();
  });

  describe('calculateNextDifficulty', () => {
    it('erhöht die Schwierigkeit bei guter Performance', () => {
      const currentProfile = {
        skillLevel: 5,
        learningRate: 0.5,
        preferredDifficulty: 6
      };

      const performance = {
        completionTime: 180, // 3 Minuten
        accuracy: 0.9,
        attempts: 1
      };

      const newDifficulty = adaptiveSystem.calculateNextDifficulty(
        currentProfile,
        performance
      );

      expect(newDifficulty).toBeGreaterThan(currentProfile.skillLevel);
    });

    it('verringert die Schwierigkeit bei schlechter Performance', () => {
      const currentProfile = {
        skillLevel: 5,
        learningRate: 0.5,
        preferredDifficulty: 4
      };

      const performance = {
        completionTime: 420, // 7 Minuten
        accuracy: 0.4,
        attempts: 3
      };

      const newDifficulty = adaptiveSystem.calculateNextDifficulty(
        currentProfile,
        performance
      );

      expect(newDifficulty).toBeLessThan(currentProfile.skillLevel);
    });

    it('berücksichtigt Nutzerpräferenzen bei der Schwierigkeitsanpassung', () => {
      const currentProfile = {
        skillLevel: 5,
        learningRate: 0.5,
        preferredDifficulty: 7
      };

      const performance = {
        completionTime: 300,
        accuracy: 0.7,
        attempts: 2
      };

      const newDifficulty = adaptiveSystem.calculateNextDifficulty(
        currentProfile,
        performance
      );

      // Sollte in Richtung der bevorzugten Schwierigkeit tendieren
      expect(newDifficulty).toBeGreaterThan(currentProfile.skillLevel);
    });
  });

  describe('updateLearningRate', () => {
    it('passt die Lernrate basierend auf der Performance an', () => {
      const currentProfile = {
        skillLevel: 5,
        learningRate: 0.5,
        preferredDifficulty: 5
      };

      const performance = {
        completionTime: 300,
        accuracy: 0.7,
        attempts: 2
      };

      const newLearningRate = adaptiveSystem.updateLearningRate(
        currentProfile,
        performance
      );

      expect(newLearningRate).toBeLessThanOrEqual(1.0);
      expect(newLearningRate).toBeGreaterThanOrEqual(0.1);
    });
  });
}); 