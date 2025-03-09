interface PerformanceMetrics {
  completionTime: number;
  accuracy: number;
  attempts: number;
}

interface UserProfile {
  skillLevel: number;
  learningRate: number;
  preferredDifficulty: number;
}

export class AdaptiveLearningSystem {
  private readonly MIN_DIFFICULTY = 1;
  private readonly MAX_DIFFICULTY = 10;
  private readonly LEARNING_RATE_ADJUSTMENT = 0.1;

  calculateNextDifficulty(
    currentProfile: UserProfile,
    performance: PerformanceMetrics
  ): number {
    // Berechne Performance-Score (0-1)
    const performanceScore = this.calculatePerformanceScore(performance);

    // Passe Schwierigkeit basierend auf Performance an
    let difficultyAdjustment = this.calculateDifficultyAdjustment(
      performanceScore,
      currentProfile.learningRate
    );

    // Berücksichtige bevorzugte Schwierigkeit
    difficultyAdjustment *= this.getPreferenceFactor(
      currentProfile.preferredDifficulty,
      currentProfile.skillLevel
    );

    // Berechne neue Schwierigkeit
    const newDifficulty = Math.max(
      this.MIN_DIFFICULTY,
      Math.min(
        this.MAX_DIFFICULTY,
        currentProfile.skillLevel + difficultyAdjustment
      )
    );

    return newDifficulty;
  }

  private calculatePerformanceScore(performance: PerformanceMetrics): number {
    // Gewichtete Kombination aus Zeit, Genauigkeit und Versuchen
    const timeScore = 1 / (1 + performance.completionTime / 300); // Normalisiert auf 5 Minuten
    const accuracyScore = performance.accuracy;
    const attemptsScore = 1 / (1 + performance.attempts - 1);

    return (timeScore * 0.3 + accuracyScore * 0.5 + attemptsScore * 0.2);
  }

  private calculateDifficultyAdjustment(
    performanceScore: number,
    learningRate: number
  ): number {
    // Performance über 0.8 = Erhöhung, unter 0.6 = Verringerung
    const targetPerformance = 0.7;
    const difference = performanceScore - targetPerformance;
    return difference * learningRate;
  }

  private getPreferenceFactor(
    preferredDifficulty: number,
    currentSkillLevel: number
  ): number {
    // Gewichte Anpassung basierend auf Präferenz und aktuellem Level
    const difference = preferredDifficulty - currentSkillLevel;
    return 1 + Math.sign(difference) * 0.2;
  }

  updateLearningRate(
    currentProfile: UserProfile,
    performance: PerformanceMetrics
  ): number {
    const performanceScore = this.calculatePerformanceScore(performance);
    const targetPerformance = 0.7;
    const difference = Math.abs(performanceScore - targetPerformance);

    // Passe Lernrate an - verringere sie bei großen Abweichungen
    const newLearningRate = currentProfile.learningRate * (1 - difference * this.LEARNING_RATE_ADJUSTMENT);
    
    return Math.max(0.1, Math.min(1.0, newLearningRate));
  }
} 