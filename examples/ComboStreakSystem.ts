/**
 * Combo/Streak System for HTML5 Racing Games
 * Tracks and rewards player performance streaks with engaging mechanics
 * Based on successful game design patterns for maintaining player engagement
 */

export interface ComboConfig {
  maxCombo: number;
  decayRate: number; // How fast combo decays when not maintained
  timeWindow: number; // Time window to maintain combo (in seconds)
  multiplierCap: number; // Maximum score multiplier
  streakThresholds: number[]; // Thresholds for streak bonuses
}

export interface ComboAction {
  type: 'perfect_turn' | 'obstacle_avoid' | 'powerup_collect' | 'perfect_landing' | 'drift' | 'overtake';
  value: number; // Base combo value
  timestamp: number;
  position: { x: number; y: number }; // For visual effects
}

export interface StreakReward {
  name: string;
  threshold: number;
  description: string;
  effect: 'score_multiplier' | 'speed_boost' | 'invulnerability' | 'point_bonus';
  value: number;
  duration?: number; // For temporary effects
}

export interface ComboState {
  currentCombo: number;
  maxComboReached: number;
  currentStreak: number;
  longestStreak: number;
  lastActionTime: number;
  totalActions: number;
  scoreMultiplier: number;
  activeRewards: StreakReward[];
  recentActions: ComboAction[];
}

export class ComboStreakSystem {
  private config: ComboConfig;
  private state: ComboState;
  private streakRewards: StreakReward[];
  private onComboChange?: (combo: number, multiplier: number) => void;
  private onStreakMilestone?: (streak: number, reward: StreakReward) => void;
  private onComboBreak?: (finalCombo: number, reason: string) => void;

  constructor(config: Partial<ComboConfig> = {}) {
    this.config = {
      maxCombo: 100,
      decayRate: 0.5, // Combo decreases by 0.5 per second
      timeWindow: 2.0, // 2 second window to maintain combo
      multiplierCap: 5.0,
      streakThresholds: [5, 10, 20, 35, 50, 75, 100],
      ...config
    };

    this.state = {
      currentCombo: 0,
      maxComboReached: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActionTime: 0,
      totalActions: 0,
      scoreMultiplier: 1.0,
      activeRewards: [],
      recentActions: []
    };

    this.initializeStreakRewards();
  }

  /**
   * Initialize streak reward system
   */
  private initializeStreakRewards(): void {
    this.streakRewards = [
      {
        name: 'Momentum Builder',
        threshold: 5,
        description: '+25% Score Multiplier',
        effect: 'score_multiplier',
        value: 1.25,
        duration: 10
      },
      {
        name: 'Speed Demon',
        threshold: 10,
        description: '+15% Speed Boost',
        effect: 'speed_boost',
        value: 1.15,
        duration: 8
      },
      {
        name: 'Combo Master',
        threshold: 20,
        description: '+50% Score Multiplier',
        effect: 'score_multiplier',
        value: 1.5,
        duration: 12
      },
      {
        name: 'Untouchable',
        threshold: 35,
        description: '3s Invulnerability',
        effect: 'invulnerability',
        value: 1,
        duration: 3
      },
      {
        name: 'Legend',
        threshold: 50,
        description: '2000 Point Bonus',
        effect: 'point_bonus',
        value: 2000
      },
      {
        name: 'Perfectionist',
        threshold: 75,
        description: '+100% Score Multiplier',
        effect: 'score_multiplier',
        value: 2.0,
        duration: 15
      },
      {
        name: 'Godlike',
        threshold: 100,
        description: 'Ultimate Boost + 5000 Points',
        effect: 'point_bonus',
        value: 5000
      }
    ];
  }

  /**
   * Register a combo action
   */
  addAction(action: Omit<ComboAction, 'timestamp'>): number {
    const currentTime = Date.now();
    const fullAction: ComboAction = {
      ...action,
      timestamp: currentTime
    };

    // Check if action is within time window
    const timeSinceLastAction = (currentTime - this.state.lastActionTime) / 1000;
    
    if (timeSinceLastAction <= this.config.timeWindow || this.state.currentCombo === 0) {
      // Continue or start combo
      this.state.currentCombo = Math.min(
        this.config.maxCombo, 
        this.state.currentCombo + action.value
      );
      this.state.currentStreak++;
      this.state.totalActions++;
    } else {
      // Combo broken, start new one
      this.breakCombo('timeout');
      this.state.currentCombo = action.value;
      this.state.currentStreak = 1;
      this.state.totalActions++;
    }

    this.state.lastActionTime = currentTime;
    this.state.maxComboReached = Math.max(this.state.maxComboReached, this.state.currentCombo);
    this.state.longestStreak = Math.max(this.state.longestStreak, this.state.currentStreak);

    // Add to recent actions (keep last 10)
    this.state.recentActions.push(fullAction);
    if (this.state.recentActions.length > 10) {
      this.state.recentActions.shift();
    }

    // Update score multiplier
    this.updateScoreMultiplier();

    // Check for streak milestones
    this.checkStreakMilestones();

    // Notify combo change
    if (this.onComboChange) {
      this.onComboChange(this.state.currentCombo, this.state.scoreMultiplier);
    }

    return this.state.currentCombo;
  }

  /**
   * Update the system (called in game loop)
   */
  update(deltaTime: number): void {
    const currentTime = Date.now();
    
    // Decay combo over time if no recent actions
    if (this.state.currentCombo > 0) {
      const timeSinceLastAction = (currentTime - this.state.lastActionTime) / 1000;
      
      if (timeSinceLastAction > this.config.timeWindow) {
        // Apply decay
        const decayAmount = this.config.decayRate * deltaTime;
        this.state.currentCombo = Math.max(0, this.state.currentCombo - decayAmount);
        
        if (this.state.currentCombo === 0) {
          this.breakCombo('decay');
        } else {
          this.updateScoreMultiplier();
          
          if (this.onComboChange) {
            this.onComboChange(this.state.currentCombo, this.state.scoreMultiplier);
          }
        }
      }
    }

    // Update active rewards (remove expired ones)
    this.updateActiveRewards(deltaTime);
  }

  /**
   * Force break the combo
   */
  breakCombo(reason: string = 'manual'): void {
    if (this.state.currentCombo > 0) {
      const finalCombo = this.state.currentCombo;
      
      this.state.currentCombo = 0;
      this.state.currentStreak = 0;
      this.state.scoreMultiplier = 1.0;

      // Remove temporary rewards
      this.state.activeRewards = this.state.activeRewards.filter(
        reward => !reward.duration
      );

      if (this.onComboBreak) {
        this.onComboBreak(finalCombo, reason);
      }

      if (this.onComboChange) {
        this.onComboChange(0, 1.0);
      }
    }
  }

  /**
   * Update score multiplier based on current combo
   */
  private updateScoreMultiplier(): void {
    // Base multiplier calculation (exponential curve)
    const baseMultiplier = 1 + (this.state.currentCombo / this.config.maxCombo) * (this.config.multiplierCap - 1);
    
    // Apply active reward multipliers
    let totalMultiplier = baseMultiplier;
    for (const reward of this.state.activeRewards) {
      if (reward.effect === 'score_multiplier') {
        totalMultiplier *= reward.value;
      }
    }

    this.state.scoreMultiplier = Math.min(this.config.multiplierCap * 2, totalMultiplier);
  }

  /**
   * Check and activate streak milestones
   */
  private checkStreakMilestones(): void {
    for (const reward of this.streakRewards) {
      if (this.state.currentStreak === reward.threshold) {
        this.activateStreakReward(reward);
        
        if (this.onStreakMilestone) {
          this.onStreakMilestone(this.state.currentStreak, reward);
        }
        break;
      }
    }
  }

  /**
   * Activate a streak reward
   */
  private activateStreakReward(reward: StreakReward): void {
    // Remove any existing reward of the same type
    this.state.activeRewards = this.state.activeRewards.filter(
      r => r.effect !== reward.effect || r.name === reward.name
    );

    // Add the new reward with remaining duration
    const activeReward: StreakReward = {
      ...reward,
      duration: reward.duration || 0
    };

    this.state.activeRewards.push(activeReward);
    
    // Update multiplier if it's a score multiplier reward
    if (reward.effect === 'score_multiplier') {
      this.updateScoreMultiplier();
    }
  }

  /**
   * Update active rewards and remove expired ones
   */
  private updateActiveRewards(deltaTime: number): void {
    this.state.activeRewards = this.state.activeRewards.filter(reward => {
      if (reward.duration !== undefined && reward.duration > 0) {
        reward.duration -= deltaTime;
        return reward.duration > 0;
      }
      return true; // Keep rewards without duration (permanent bonuses)
    });
  }

  /**
   * Get current combo value
   */
  getCurrentCombo(): number {
    return this.state.currentCombo;
  }

  /**
   * Get current score multiplier
   */
  getScoreMultiplier(): number {
    return this.state.scoreMultiplier;
  }

  /**
   * Get current streak
   */
  getCurrentStreak(): number {
    return this.state.currentStreak;
  }

  /**
   * Check if specific reward is active
   */
  hasActiveReward(effectType: StreakReward['effect']): boolean {
    return this.state.activeRewards.some(reward => reward.effect === effectType);
  }

  /**
   * Get active reward value for specific effect
   */
  getActiveRewardValue(effectType: StreakReward['effect']): number {
    const reward = this.state.activeRewards.find(r => r.effect === effectType);
    return reward ? reward.value : 0;
  }

  /**
   * Get combo progress as percentage
   */
  getComboProgress(): number {
    return Math.min(1, this.state.currentCombo / this.config.maxCombo);
  }

  /**
   * Get recent action pattern for analysis
   */
  getRecentActionPattern(): string {
    return this.state.recentActions
      .slice(-5)
      .map(action => action.type.charAt(0).toUpperCase())
      .join('');
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    currentCombo: number;
    maxCombo: number;
    currentStreak: number;
    longestStreak: number;
    totalActions: number;
    scoreMultiplier: number;
    activeRewards: number;
    comboProgress: number;
  } {
    return {
      currentCombo: this.state.currentCombo,
      maxCombo: this.state.maxComboReached,
      currentStreak: this.state.currentStreak,
      longestStreak: this.state.longestStreak,
      totalActions: this.state.totalActions,
      scoreMultiplier: this.state.scoreMultiplier,
      activeRewards: this.state.activeRewards.length,
      comboProgress: this.getComboProgress()
    };
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: {
    onComboChange?: (combo: number, multiplier: number) => void;
    onStreakMilestone?: (streak: number, reward: StreakReward) => void;
    onComboBreak?: (finalCombo: number, reason: string) => void;
  }): void {
    this.onComboChange = handlers.onComboChange;
    this.onStreakMilestone = handlers.onStreakMilestone;
    this.onComboBreak = handlers.onComboBreak;
  }

  /**
   * Reset the combo system
   */
  reset(): void {
    this.state = {
      currentCombo: 0,
      maxComboReached: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActionTime: 0,
      totalActions: 0,
      scoreMultiplier: 1.0,
      activeRewards: [],
      recentActions: []
    };
  }

  /**
   * Save state for persistence
   */
  serialize(): string {
    return JSON.stringify({
      state: this.state,
      config: this.config
    });
  }

  /**
   * Load state from persistence
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.state = { ...this.state, ...parsed.state };
      this.config = { ...this.config, ...parsed.config };
    } catch (error) {
      console.warn('Failed to deserialize combo system state:', error);
    }
  }
}

// Predefined action values for different racing game actions
export const COMBO_ACTIONS = {
  PERFECT_TURN: { type: 'perfect_turn' as const, value: 5 },
  OBSTACLE_AVOID: { type: 'obstacle_avoid' as const, value: 3 },
  POWERUP_COLLECT: { type: 'powerup_collect' as const, value: 2 },
  PERFECT_LANDING: { type: 'perfect_landing' as const, value: 4 },
  DRIFT: { type: 'drift' as const, value: 2 },
  OVERTAKE: { type: 'overtake' as const, value: 6 }
};

// Example usage:
/*
const comboSystem = new ComboStreakSystem({
  maxCombo: 50,
  decayRate: 1.0,
  timeWindow: 1.5,
  multiplierCap: 4.0
});

// Set up event handlers
comboSystem.setEventHandlers({
  onComboChange: (combo, multiplier) => {
    console.log(`Combo: ${combo}, Multiplier: ${multiplier.toFixed(1)}x`);
    updateUI(combo, multiplier);
  },
  onStreakMilestone: (streak, reward) => {
    console.log(`Streak milestone! ${streak} - ${reward.name}: ${reward.description}`);
    showStreakNotification(reward);
  },
  onComboBreak: (finalCombo, reason) => {
    console.log(`Combo broken! Final combo: ${finalCombo} (${reason})`);
    showComboBreakEffect(finalCombo);
  }
});

// In your game loop
function gameLoop(deltaTime) {
  comboSystem.update(deltaTime);
  
  // When player performs actions:
  // comboSystem.addAction({ ...COMBO_ACTIONS.PERFECT_TURN, position: { x: playerX, y: playerY } });
  
  // When player hits obstacle or goes off track:
  // comboSystem.breakCombo('collision');
  
  // Use multiplier for scoring:
  const scoreMultiplier = comboSystem.getScoreMultiplier();
  const adjustedScore = baseScore * scoreMultiplier;
}
*/