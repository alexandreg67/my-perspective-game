/**
 * Level of Detail (LOD) System for Racing Game
 * Optimizes rendering performance by reducing detail for distant objects
 */

export interface LODLevel {
  name: string;
  detailLevel: number; // 0.0 to 1.0, where 1.0 is maximum detail
  renderBorders: boolean;
  renderGradients: boolean;
  renderParticles: boolean;
  tileSimplification: number; // 1.0 = normal, 0.5 = half resolution
}

export interface LODConfig {
  nearDistance: number;
  farDistance: number;
  levels: LODLevel[];
  adaptiveQuality: boolean;
  targetFrameTime: number; // milliseconds
}

// Predefined LOD levels
const LOD_LEVELS: LODLevel[] = [
  {
    name: 'high',
    detailLevel: 1.0,
    renderBorders: true,
    renderGradients: true,
    renderParticles: true,
    tileSimplification: 1.0
  },
  {
    name: 'medium',
    detailLevel: 0.7,
    renderBorders: true,
    renderGradients: false,
    renderParticles: true,
    tileSimplification: 0.8
  },
  {
    name: 'low',
    detailLevel: 0.4,
    renderBorders: false,
    renderGradients: false,
    renderParticles: false,
    tileSimplification: 0.6
  },
  {
    name: 'minimal',
    detailLevel: 0.2,
    renderBorders: false,
    renderGradients: false,
    renderParticles: false,
    tileSimplification: 0.4
  }
];

const DEFAULT_CONFIG: LODConfig = {
  nearDistance: 500,
  farDistance: 1200,
  levels: LOD_LEVELS,
  adaptiveQuality: true,
  targetFrameTime: 16.67 // 60 FPS
};

export class LODSystem {
  private config: LODConfig;
  private frameTimeHistory: number[] = [];
  private currentQualityLevel: number = 0; // Index into LOD_LEVELS
  private performanceAdjustmentTimer: number = 0;

  constructor(config: Partial<LODConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update LOD system based on current frame performance
   */
  update(deltaTime: number, frameTime: number): void {
    if (this.config.adaptiveQuality) {
      this.updateAdaptiveQuality(frameTime, deltaTime);
    }
  }

  /**
   * Get appropriate LOD level for a given distance
   */
  getLODForDistance(distance: number): LODLevel {
    // Adaptive quality adjustment
    const qualityOffset = this.currentQualityLevel;
    
    if (distance <= this.config.nearDistance) {
      return this.config.levels[Math.min(0 + qualityOffset, this.config.levels.length - 1)];
    } else if (distance >= this.config.farDistance) {
      return this.config.levels[Math.min(3 + qualityOffset, this.config.levels.length - 1)];
    } else {
      // Interpolate between near and far
      const progress = (distance - this.config.nearDistance) / 
                      (this.config.farDistance - this.config.nearDistance);
      const levelIndex = Math.floor(progress * 2) + 1 + qualityOffset;
      return this.config.levels[Math.min(levelIndex, this.config.levels.length - 1)];
    }
  }

  /**
   * Calculate atmospheric fade based on distance
   */
  getAtmosphericFade(distance: number): number {
    if (distance <= this.config.nearDistance) return 1.0;
    if (distance >= this.config.farDistance) return 0.3;
    
    const progress = (distance - this.config.nearDistance) / 
                    (this.config.farDistance - this.config.nearDistance);
    return 1.0 - (progress * 0.7); // Fade from 1.0 to 0.3
  }

  /**
   * Get fog color for distance-based atmospheric effects
   */
  getFogEffect(distance: number): string {
    const fadeAmount = 1.0 - this.getAtmosphericFade(distance);
    const fogIntensity = Math.min(fadeAmount * 0.6, 0.5);
    
    // Return fog color
    const fogColor = `rgba(100, 120, 150, ${fogIntensity})`;
    return fogColor;
  }

  /**
   * Adaptive quality adjustment based on frame performance
   */
  private updateAdaptiveQuality(frameTime: number, deltaTime: number): void {
    this.frameTimeHistory.push(frameTime);
    
    // Keep only last 30 frames
    if (this.frameTimeHistory.length > 30) {
      this.frameTimeHistory.shift();
    }

    this.performanceAdjustmentTimer += deltaTime;
    
    // Check performance every 2 seconds
    if (this.performanceAdjustmentTimer >= 2000) {
      this.performanceAdjustmentTimer = 0;
      
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / 
                          this.frameTimeHistory.length;
      
      if (avgFrameTime > this.config.targetFrameTime * 1.2) {
        // Performance is poor, reduce quality
        this.currentQualityLevel = Math.min(this.currentQualityLevel + 1, 2);
        console.log(`LOD: Reducing quality to level ${this.currentQualityLevel} (avg frame time: ${avgFrameTime.toFixed(2)}ms)`);
      } else if (avgFrameTime < this.config.targetFrameTime * 0.8) {
        // Performance is good, increase quality
        this.currentQualityLevel = Math.max(this.currentQualityLevel - 1, 0);
        console.log(`LOD: Increasing quality to level ${this.currentQualityLevel} (avg frame time: ${avgFrameTime.toFixed(2)}ms)`);
      }
    }
  }

  /**
   * Check if an object should be rendered at all based on distance
   */
  shouldRender(distance: number): boolean {
    return distance <= this.config.farDistance;
  }

  /**
   * Get simplified tile rendering parameters
   */
  getTileRenderParams(distance: number): {
    shouldRender: boolean;
    alpha: number;
    simplification: number;
    lod: LODLevel;
  } {
    if (!this.shouldRender(distance)) {
      return {
        shouldRender: false,
        alpha: 0,
        simplification: 0,
        lod: this.config.levels[this.config.levels.length - 1]
      };
    }

    const lod = this.getLODForDistance(distance);
    const alpha = this.getAtmosphericFade(distance);

    return {
      shouldRender: true,
      alpha,
      simplification: lod.tileSimplification,
      lod
    };
  }

  /**
   * Update LOD configuration
   */
  updateConfig(newConfig: Partial<LODConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current performance statistics
   */
  getStats(): {
    currentQualityLevel: number;
    avgFrameTime: number;
    frameCount: number;
  } {
    const avgFrameTime = this.frameTimeHistory.length > 0 
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      : 0;

    return {
      currentQualityLevel: this.currentQualityLevel,
      avgFrameTime,
      frameCount: this.frameTimeHistory.length
    };
  }

  /**
   * Reset performance tracking
   */
  reset(): void {
    this.frameTimeHistory = [];
    this.currentQualityLevel = 0;
    this.performanceAdjustmentTimer = 0;
  }
}