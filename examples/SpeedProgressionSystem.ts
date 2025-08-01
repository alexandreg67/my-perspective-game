/**
 * Exponential Speed Progression System for Racing Games
 * Implements engaging mathematical curves for speed progression
 * Based on research into player engagement and game balance
 */

export interface SpeedProgressionConfig {
  baseSpeed: number;
  maxSpeed: number;
  progressionType: 'exponential' | 'logarithmic' | 'sigmoid' | 'polynomial' | 'custom';
  curve: number; // Curve steepness factor
  plateauPoint: number; // Where progression starts to level off (0-1)
  boostMultiplier: number; // Temporary boost multiplier
}

export interface SpeedState {
  currentSpeed: number;
  baseSpeed: number;
  progressionLevel: number; // 0-1 representing progression through the curve
  boostActive: boolean;
  boostTimeRemaining: number;
  speedHistory: number[]; // For smooth transitions
}

export class SpeedProgressionSystem {
  private config: SpeedProgressionConfig;
  private state: SpeedState;
  private customCurveFunction?: (t: number) => number;

  constructor(config: Partial<SpeedProgressionConfig> = {}) {
    this.config = {
      baseSpeed: 200,
      maxSpeed: 800,
      progressionType: 'exponential',
      curve: 2.0,
      plateauPoint: 0.7,
      boostMultiplier: 1.5,
      ...config
    };

    this.state = {
      currentSpeed: this.config.baseSpeed,
      baseSpeed: this.config.baseSpeed,
      progressionLevel: 0,
      boostActive: false,
      boostTimeRemaining: 0,
      speedHistory: []
    };
  }

  /**
   * Update speed based on progression and time
   */
  update(deltaTime: number, progressionInput: number): void {
    // Update progression level (0-1 scale)
    this.state.progressionLevel = Math.max(0, Math.min(1, progressionInput));

    // Calculate base speed using selected curve
    const curveValue = this.calculateCurveValue(this.state.progressionLevel);
    this.state.baseSpeed = this.config.baseSpeed + 
      (this.config.maxSpeed - this.config.baseSpeed) * curveValue;

    // Apply boost if active
    let targetSpeed = this.state.baseSpeed;
    if (this.state.boostActive) {
      targetSpeed *= this.config.boostMultiplier;
      this.state.boostTimeRemaining -= deltaTime;
      
      if (this.state.boostTimeRemaining <= 0) {
        this.state.boostActive = false;
        this.state.boostTimeRemaining = 0;
      }
    }

    // Smooth speed transitions
    this.state.currentSpeed = this.smoothTransition(
      this.state.currentSpeed, 
      targetSpeed, 
      deltaTime
    );

    // Update speed history for analysis
    this.updateSpeedHistory();
  }

  /**
   * Calculate curve value based on progression type
   */
  private calculateCurveValue(t: number): number {
    // Clamp t to [0, 1]
    t = Math.max(0, Math.min(1, t));

    switch (this.config.progressionType) {
      case 'exponential':
        return this.exponentialCurve(t);
      
      case 'logarithmic':
        return this.logarithmicCurve(t);
      
      case 'sigmoid':
        return this.sigmoidCurve(t);
      
      case 'polynomial':
        return this.polynomialCurve(t);
      
      case 'custom':
        return this.customCurveFunction ? this.customCurveFunction(t) : t;
      
      default:
        return t; // Linear fallback
    }
  }

  /**
   * Exponential curve: f(t) = (e^(curve*t) - 1) / (e^curve - 1)
   * Provides rapid acceleration early, then levels off
   */
  private exponentialCurve(t: number): number {
    if (this.config.curve === 0) return t;
    
    const exp = Math.exp(this.config.curve * t);
    const maxExp = Math.exp(this.config.curve);
    return (exp - 1) / (maxExp - 1);
  }

  /**
   * Logarithmic curve: f(t) = log(1 + curve*t) / log(1 + curve)
   * Provides quick initial boost, then gradual improvement
   */
  private logarithmicCurve(t: number): number {
    if (this.config.curve === 0) return t;
    
    return Math.log(1 + this.config.curve * t) / Math.log(1 + this.config.curve);
  }

  /**
   * Sigmoid curve: f(t) = 1 / (1 + e^(-curve*(t-0.5)))
   * S-shaped curve with slow start, rapid middle, slow end
   */
  private sigmoidCurve(t: number): number {
    const shifted = t - 0.5;
    const denominator = 1 + Math.exp(-this.config.curve * shifted);
    const rawValue = 1 / denominator;
    
    // Normalize to [0, 1] range
    const minVal = 1 / (1 + Math.exp(this.config.curve * 0.5));
    const maxVal = 1 / (1 + Math.exp(-this.config.curve * 0.5));
    
    return (rawValue - minVal) / (maxVal - minVal);
  }

  /**
   * Polynomial curve: f(t) = t^curve
   * Allows for various curve shapes based on exponent
   */
  private polynomialCurve(t: number): number {
    return Math.pow(t, this.config.curve);
  }

  /**
   * Smooth speed transitions to prevent jarring changes
   */
  private smoothTransition(current: number, target: number, deltaTime: number): number {
    const smoothFactor = 5.0; // Higher = faster transitions
    const difference = target - current;
    const change = difference * smoothFactor * deltaTime;
    
    // Prevent overshooting
    if (Math.abs(change) > Math.abs(difference)) {
      return target;
    }
    
    return current + change;
  }

  /**
   * Update speed history for analysis and effects
   */
  private updateSpeedHistory(): void {
    this.state.speedHistory.push(this.state.currentSpeed);
    
    // Keep only recent history (last 60 frames at 60fps = 1 second)
    if (this.state.speedHistory.length > 60) {
      this.state.speedHistory.shift();
    }
  }

  /**
   * Activate speed boost for specified duration
   */
  activateBoost(duration: number): void {
    this.state.boostActive = true;
    this.state.boostTimeRemaining = Math.max(duration, this.state.boostTimeRemaining);
  }

  /**
   * Set a custom curve function
   */
  setCustomCurve(curveFunction: (t: number) => number): void {
    this.customCurveFunction = curveFunction;
    this.config.progressionType = 'custom';
  }

  /**
   * Get current speed
   */
  getCurrentSpeed(): number {
    return this.state.currentSpeed;
  }

  /**
   * Get speed as percentage of max speed
   */
  getSpeedPercentage(): number {
    return (this.state.currentSpeed - this.config.baseSpeed) / 
           (this.config.maxSpeed - this.config.baseSpeed);
  }

  /**
   * Calculate acceleration (change in speed over time)
   */
  getAcceleration(): number {
    if (this.state.speedHistory.length < 2) return 0;
    
    const currentSpeed = this.state.speedHistory[this.state.speedHistory.length - 1];
    const previousSpeed = this.state.speedHistory[this.state.speedHistory.length - 2];
    
    return currentSpeed - previousSpeed;
  }

  /**
   * Get visual feedback intensity based on speed and acceleration
   */
  getIntensityLevel(): number {
    const speedFactor = this.getSpeedPercentage();
    const accelFactor = Math.abs(this.getAcceleration()) / 50; // Normalize acceleration
    const boostFactor = this.state.boostActive ? 0.3 : 0;
    
    return Math.min(1, speedFactor + accelFactor + boostFactor);
  }

  /**
   * Reset progression system to initial state
   */
  reset(): void {
    this.state = {
      currentSpeed: this.config.baseSpeed,
      baseSpeed: this.config.baseSpeed,
      progressionLevel: 0,
      boostActive: false,
      boostTimeRemaining: 0,
      speedHistory: []
    };
  }

  /**
   * Get current state for debugging/UI
   */
  getState(): SpeedState {
    return { ...this.state };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SpeedProgressionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get recommended progression input based on game metrics
   */
  static calculateProgressionInput(
    score: number, 
    distance: number, 
    timeElapsed: number,
    streakMultiplier: number = 1
  ): number {
    // Combine multiple factors for progression
    const scoreFactor = Math.min(score / 10000, 0.4); // Score contribution (max 40%)
    const distanceFactor = Math.min(distance / 5000, 0.3); // Distance contribution (max 30%)
    const timeFactor = Math.min(timeElapsed / 120, 0.2); // Time contribution (max 20%)
    const streakFactor = Math.min((streakMultiplier - 1) * 0.1, 0.1); // Streak bonus (max 10%)
    
    return Math.min(1, scoreFactor + distanceFactor + timeFactor + streakFactor);
  }
}

// Pre-defined curve configurations for different game feels
export const SPEED_PRESETS = {
  // Arcade racing: Quick acceleration, high top speed
  ARCADE: {
    baseSpeed: 250,
    maxSpeed: 1000,
    progressionType: 'exponential' as const,
    curve: 3.0,
    plateauPoint: 0.6,
    boostMultiplier: 2.0
  },

  // Simulation racing: Gradual, realistic acceleration
  SIMULATION: {
    baseSpeed: 150,
    maxSpeed: 600,
    progressionType: 'logarithmic' as const,
    curve: 2.0,
    plateauPoint: 0.8,
    boostMultiplier: 1.3
  },

  // Casual racing: Balanced progression
  CASUAL: {
    baseSpeed: 200,
    maxSpeed: 700,
    progressionType: 'sigmoid' as const,
    curve: 4.0,
    plateauPoint: 0.7,
    boostMultiplier: 1.6
  },

  // Hardcore racing: Challenging progression curve
  HARDCORE: {
    baseSpeed: 120,
    maxSpeed: 800,
    progressionType: 'polynomial' as const,
    curve: 2.5,
    plateauPoint: 0.9,
    boostMultiplier: 1.8
  }
};

// Example usage:
/*
// Initialize with arcade preset
const speedSystem = new SpeedProgressionSystem(SPEED_PRESETS.ARCADE);

// Custom curve example (parabolic with plateau)
speedSystem.setCustomCurve((t) => {
  if (t < 0.7) {
    return Math.pow(t / 0.7, 1.5); // Accelerating curve
  } else {
    return 1 - 0.3 * Math.pow((t - 0.7) / 0.3, 3); // Plateaus at the end
  }
});

// In your game loop:
function gameLoop(deltaTime: number) {
  // Calculate progression input based on game state
  const progressionInput = SpeedProgressionSystem.calculateProgressionInput(
    gameState.score,
    gameState.distance,
    gameState.timeElapsed,
    gameState.streakMultiplier
  );
  
  // Update speed system
  speedSystem.update(deltaTime, progressionInput);
  
  // Get current speed for game mechanics
  const currentSpeed = speedSystem.getCurrentSpeed();
  const intensity = speedSystem.getIntensityLevel();
  
  // Use speed for game logic...
  gameState.speed = currentSpeed;
  particleSystem.setIntensity(intensity);
}

// Activate boost when power-up is collected
function onPowerUpCollected() {
  speedSystem.activateBoost(3.0); // 3 second boost
}
*/