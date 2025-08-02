/**
 * Progressive Speed System for Racing Game
 * Provides engaging speed progression with exponential curves and skill-based bonuses
 */

export interface SpeedConfig {
  baseSpeed: number;
  maxSpeed: number;
  progressionType: 'exponential' | 'logarithmic' | 'sigmoid' | 'polynomial';
  skillMultiplier: number;
  timeMultiplier: number;
  boostDuration: number;
  difficultyScaling: boolean;
}

export interface SpeedState {
  currentSpeed: number;
  baseProgressionSpeed: number;
  skillBonus: number;
  temporaryBoost: number;
  boostTimeRemaining: number;
  difficultyLevel: number;
  totalTimeElapsed: number;
  performanceScore: number;
}

export interface PerformanceMetrics {
  onTrackTime: number;
  perfectTurns: number;
  nearMisses: number;
  comboMultiplier: number;
  averageSpeed: number;
  lastCheckpoint: number;
}

// Speed progression presets
const SPEED_PRESETS = {
  arcade: {
    baseSpeed: 200,
    maxSpeed: 800,
    progressionType: 'exponential' as const,
    skillMultiplier: 1.5,
    timeMultiplier: 1.2,
    boostDuration: 3000,
    difficultyScaling: true
  },
  simulation: {
    baseSpeed: 150,
    maxSpeed: 600,
    progressionType: 'logarithmic' as const,
    skillMultiplier: 1.2,
    timeMultiplier: 1.1,
    boostDuration: 2000,
    difficultyScaling: true
  },
  casual: {
    baseSpeed: 180,
    maxSpeed: 500,
    progressionType: 'sigmoid' as const,
    skillMultiplier: 1.3,
    timeMultiplier: 1.15,
    boostDuration: 4000,
    difficultyScaling: false
  },
  hardcore: {
    baseSpeed: 250,
    maxSpeed: 1000,
    progressionType: 'polynomial' as const,
    skillMultiplier: 2.0,
    timeMultiplier: 1.3,
    boostDuration: 1500,
    difficultyScaling: true
  }
};


export class SpeedProgressionSystem {
  private config: SpeedConfig;
  private state: SpeedState;
  private metrics: PerformanceMetrics;
  private lastUpdateTime: number = 0;

  constructor(preset: keyof typeof SPEED_PRESETS | SpeedConfig = 'arcade') {
    if (typeof preset === 'string') {
      this.config = { ...SPEED_PRESETS[preset] };
    } else {
      this.config = { ...preset };
    }

    this.state = {
      currentSpeed: this.config.baseSpeed,
      baseProgressionSpeed: this.config.baseSpeed,
      skillBonus: 0,
      temporaryBoost: 0,
      boostTimeRemaining: 0,
      difficultyLevel: 1,
      totalTimeElapsed: 0,
      performanceScore: 0
    };

    this.metrics = {
      onTrackTime: 0,
      perfectTurns: 0,
      nearMisses: 0,
      comboMultiplier: 1.0,
      averageSpeed: this.config.baseSpeed,
      lastCheckpoint: 0
    };
  }

  /**
   * Update speed progression based on time and performance
   */
  update(deltaTime: number, isOnTrack: boolean, currentScore: number): void {
    this.state.totalTimeElapsed += deltaTime;
    this.updatePerformanceMetrics(deltaTime, isOnTrack, currentScore);
    
    this.updateBaseProgression();
    this.updateSkillBonus(deltaTime);
    this.updateTemporaryBoosts(deltaTime);
    this.updateDifficultyScaling();
    
    this.calculateFinalSpeed();
  }

  /**
   * Calculate base speed progression using mathematical curves
   */
  private updateBaseProgression(): void {
    const timeInSeconds = this.state.totalTimeElapsed / 1000;
    const progressionFactor = this.calculateProgressionCurve(timeInSeconds);
    
    this.state.baseProgressionSpeed = Math.min(
      this.config.baseSpeed * progressionFactor,
      this.config.maxSpeed * 0.7 // Reserve 30% for bonuses
    );
  }

  /**
   * Calculate progression curve based on configuration type
   */
  private calculateProgressionCurve(timeInSeconds: number): number {
    switch (this.config.progressionType) {
      case 'exponential':
        // f(t) = 1 + (e^(t/30) - 1) * 0.5
        return 1 + (Math.exp(timeInSeconds / 30) - 1) * 0.5;
        
      case 'logarithmic':
        // f(t) = 1 + log(t + 1) * 0.3
        return 1 + Math.log(timeInSeconds + 1) * 0.3;
        
      case 'sigmoid':
        // f(t) = 1 + 2 / (1 + e^(-t/20))
        return 1 + 2 / (1 + Math.exp(-timeInSeconds / 20));
        
      case 'polynomial':
        // f(t) = 1 + (t/60)^1.5 * 0.8
        return 1 + Math.pow(timeInSeconds / 60, 1.5) * 0.8;
        
      default:
        return 1 + timeInSeconds * 0.02; // Linear fallback
    }
  }

  /**
   * Update skill-based speed bonuses
   */
  private updateSkillBonus(deltaTime: number): void {
    const performanceRatio = this.calculatePerformanceRatio();
    
    // Smooth skill bonus adjustment
    const targetBonus = (performanceRatio - 0.5) * this.config.skillMultiplier * this.config.baseSpeed * 0.3;
    const adjustmentRate = 0.002; // Gradual adjustment
    
    this.state.skillBonus += (targetBonus - this.state.skillBonus) * adjustmentRate * deltaTime;
    this.state.skillBonus = Math.max(-this.config.baseSpeed * 0.2, 
                                     Math.min(this.config.baseSpeed * 0.4, this.state.skillBonus));
  }

  /**
   * Calculate current performance ratio (0.0 to 1.0)
   */
  private calculatePerformanceRatio(): number {
    const onTrackRatio = this.state.totalTimeElapsed > 0 ? 
      this.metrics.onTrackTime / this.state.totalTimeElapsed : 1.0;
    
    const comboBonus = Math.min(this.metrics.comboMultiplier - 1, 0.3);
    const turnBonus = this.metrics.perfectTurns * 0.01;
    const nearMissBonus = this.metrics.nearMisses * 0.005;
    
    return Math.min(1.0, onTrackRatio + comboBonus + turnBonus + nearMissBonus);
  }

  /**
   * Update temporary speed boosts
   */
  private updateTemporaryBoosts(deltaTime: number): void {
    if (this.state.boostTimeRemaining > 0) {
      this.state.boostTimeRemaining -= deltaTime;
      
      if (this.state.boostTimeRemaining <= 0) {
        this.state.temporaryBoost = 0;
        this.state.boostTimeRemaining = 0;
      }
    }
  }

  /**
   * Update difficulty-based scaling
   */
  private updateDifficultyScaling(): void {
    if (this.config.difficultyScaling) {
      const scoreBasedLevel = Math.floor(this.state.performanceScore / 1000) + 1;
      const timeBasedLevel = Math.floor(this.state.totalTimeElapsed / 30000) + 1; // Every 30 seconds
      
      this.state.difficultyLevel = Math.max(scoreBasedLevel, timeBasedLevel);
    }
  }

  /**
   * Calculate final speed from all components
   */
  private calculateFinalSpeed(): void {
    const difficultyMultiplier = this.config.difficultyScaling ? 
      1 + (this.state.difficultyLevel - 1) * 0.1 : 1;
    
    this.state.currentSpeed = Math.min(
      (this.state.baseProgressionSpeed + this.state.skillBonus + this.state.temporaryBoost) * difficultyMultiplier,
      this.config.maxSpeed
    );
    
    // Ensure minimum speed
    this.state.currentSpeed = Math.max(this.state.currentSpeed, this.config.baseSpeed * 0.8);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(deltaTime: number, isOnTrack: boolean, currentScore: number): void {
    if (isOnTrack) {
      this.metrics.onTrackTime += deltaTime;
    }
    
    this.state.performanceScore = currentScore;
    
    // Update average speed (rolling average)
    const alpha = 0.01; // Smoothing factor
    this.metrics.averageSpeed = this.metrics.averageSpeed * (1 - alpha) + 
                               this.state.currentSpeed * alpha;
  }

  /**
   * Apply temporary speed boost
   */
  applySpeedBoost(multiplier: number = 1.5, duration: number = this.config.boostDuration): void {
    const boostAmount = this.config.baseSpeed * (multiplier - 1);
    
    // Stack or replace boost based on strength
    if (boostAmount > this.state.temporaryBoost) {
      this.state.temporaryBoost = boostAmount;
      this.state.boostTimeRemaining = duration;
    } else {
      // Extend duration of current boost
      this.state.boostTimeRemaining = Math.max(this.state.boostTimeRemaining, duration);
    }
  }

  /**
   * Record perfect turn for skill bonus
   */
  recordPerfectTurn(): void {
    this.metrics.perfectTurns++;
    this.metrics.comboMultiplier = Math.min(this.metrics.comboMultiplier + 0.1, 3.0);
  }

  /**
   * Record near miss for skill bonus
   */
  recordNearMiss(): void {
    this.metrics.nearMisses++;
    this.metrics.comboMultiplier = Math.min(this.metrics.comboMultiplier + 0.05, 3.0);
  }

  /**
   * Reset combo multiplier (called on collision)
   */
  resetCombo(): void {
    this.metrics.comboMultiplier = 1.0;
  }

  /**
   * Get current speed
   */
  getCurrentSpeed(): number {
    return this.state.currentSpeed;
  }

  /**
   * Get current state for debugging/UI
   */
  getState(): SpeedState {
    return { ...this.state };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get speed breakdown for debugging
   */
  getSpeedBreakdown(): {
    base: number;
    skill: number;
    boost: number;
    difficulty: number;
    total: number;
  } {
    const difficultyMultiplier = this.config.difficultyScaling ? 
      1 + (this.state.difficultyLevel - 1) * 0.1 : 1;
    
    return {
      base: this.state.baseProgressionSpeed,
      skill: this.state.skillBonus,
      boost: this.state.temporaryBoost,
      difficulty: difficultyMultiplier,
      total: this.state.currentSpeed
    };
  }

  /**
   * Reset system to initial state
   */
  reset(): void {
    this.state = {
      currentSpeed: this.config.baseSpeed,
      baseProgressionSpeed: this.config.baseSpeed,
      skillBonus: 0,
      temporaryBoost: 0,
      boostTimeRemaining: 0,
      difficultyLevel: 1,
      totalTimeElapsed: 0,
      performanceScore: 0
    };

    this.metrics = {
      onTrackTime: 0,
      perfectTurns: 0,
      nearMisses: 0,
      comboMultiplier: 1.0,
      averageSpeed: this.config.baseSpeed,
      lastCheckpoint: 0
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SpeedConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}