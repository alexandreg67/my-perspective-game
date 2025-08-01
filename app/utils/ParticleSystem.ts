/**
 * Particle System for Speed Effects and Visual Enhancements
 * Provides various particle effects to enhance the racing game experience
 */

export interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'speed_line' | 'spark' | 'dust' | 'boost';
}

export interface ParticleSystemConfig {
  maxParticles: number;
  spawnRate: number;
  speedThreshold: number;
  enableSpeedLines: boolean;
  enableSparks: boolean;
  enableDust: boolean;
}

// Default particle system configuration
const DEFAULT_CONFIG: ParticleSystemConfig = {
  maxParticles: 150,
  spawnRate: 0.8,
  speedThreshold: 200,
  enableSpeedLines: true,
  enableSparks: true,
  enableDust: true,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private config: ParticleSystemConfig;
  private canvasSize: { width: number; height: number };

  constructor(canvasSize: { width: number; height: number }, config: Partial<ParticleSystemConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.canvasSize = canvasSize;
  }

  /**
   * Update canvas size when window resizes
   */
  updateCanvasSize(canvasSize: { width: number; height: number }): void {
    this.canvasSize = canvasSize;
  }

  /**
   * Update particle system configuration
   */
  updateConfig(newConfig: Partial<ParticleSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Update all particles and spawn new ones based on game state
   */
  update(
    deltaTime: number,
    gameSpeed: number,
    shipPosition: number,
    isOnTrack: boolean,
    isBoosting: boolean = false
  ): void {
    try {
      // Update existing particles
      this.updateExistingParticles(deltaTime, gameSpeed);

      // Remove dead particles
      this.particles = this.particles.filter(particle => particle.life > 0);

      // Spawn new particles based on conditions
      if (gameSpeed > this.config.speedThreshold) {
        this.spawnSpeedEffects(gameSpeed, shipPosition, isOnTrack, isBoosting);
      }

      // Limit particle count for performance
      if (this.particles.length > this.config.maxParticles) {
        this.particles = this.particles.slice(-this.config.maxParticles);
      }

    } catch (error) {
      console.error('Error updating particle system:', error);
    }
  }

  /**
   * Render all particles to the canvas
   */
  render(context: CanvasRenderingContext2D): void {
    try {
      context.save();
      
      this.particles.forEach(particle => {
        this.renderParticle(context, particle);
      });

    } catch (error) {
      console.error('Error rendering particles:', error);
    } finally {
      context.restore();
    }
  }

  /**
   * Update existing particles' position, life, and properties
   */
  private updateExistingParticles(deltaTime: number, gameSpeed: number): void {
    this.particles.forEach(particle => {
      // Update position
      particle.x += particle.velocityX * deltaTime;
      particle.y += particle.velocityY * deltaTime;

      // Update life
      particle.life -= deltaTime;

      // Update alpha based on remaining life
      particle.alpha = Math.max(0, particle.life / particle.maxLife);

      // Specific updates per particle type
      switch (particle.type) {
        case 'speed_line':
          // Speed lines accelerate and fade quickly
          particle.velocityY += gameSpeed * deltaTime * 0.5;
          particle.size = Math.max(0.5, particle.size - deltaTime * 2);
          break;
        case 'spark':
          // Sparks have gravity and friction
          particle.velocityY += 200 * deltaTime; // Gravity
          particle.velocityX *= 0.98; // Friction
          particle.size = Math.max(0.2, particle.size - deltaTime * 3);
          break;
        case 'dust':
          // Dust particles drift and settle
          particle.velocityX *= 0.95; // Air resistance
          particle.velocityY += 50 * deltaTime; // Light gravity
          break;
        case 'boost':
          // Boost particles are fast and bright
          particle.velocityY += gameSpeed * deltaTime * 2;
          particle.size += deltaTime; // Grow over time
          break;
      }
    });
  }

  /**
   * Spawn speed-related particle effects
   */
  private spawnSpeedEffects(
    gameSpeed: number,
    shipPosition: number,
    isOnTrack: boolean,
    isBoosting: boolean
  ): void {
    const intensity = Math.min(gameSpeed / 400, 2); // Normalize speed to intensity
    const spawnCount = Math.floor(intensity * this.config.spawnRate * 10);

    for (let i = 0; i < spawnCount; i++) {
      // Spawn speed lines
      if (this.config.enableSpeedLines) {
        this.spawnSpeedLine(intensity, shipPosition);
      }

      // Spawn sparks when off-track or boosting
      if (this.config.enableSparks && (!isOnTrack || isBoosting)) {
        this.spawnSpark(intensity, shipPosition, isBoosting);
      }

      // Spawn dust particles
      if (this.config.enableDust && isOnTrack) {
        this.spawnDustParticle(intensity, shipPosition);
      }

      // Spawn boost particles when boosting
      if (isBoosting) {
        this.spawnBoostParticle(intensity, shipPosition);
      }
    }
  }

  /**
   * Spawn a speed line particle
   */
  private spawnSpeedLine(intensity: number, shipPosition: number): void {
    const laneWidth = this.canvasSize.width / 7;
    const baseX = shipPosition * laneWidth + laneWidth / 2;
    
    this.particles.push({
      x: baseX + (Math.random() - 0.5) * this.canvasSize.width * 0.8,
      y: this.canvasSize.height + 10,
      velocityX: (Math.random() - 0.5) * 50,
      velocityY: -200 - intensity * 150,
      life: 0.5 + intensity * 0.5,
      maxLife: 0.5 + intensity * 0.5,
      size: 1 + intensity * 2,
      color: `hsl(${200 + Math.random() * 60}, 80%, 70%)`,
      alpha: 0.8,
      type: 'speed_line'
    });
  }

  /**
   * Spawn a spark particle
   */
  private spawnSpark(intensity: number, shipPosition: number, isBoosting: boolean): void {
    const laneWidth = this.canvasSize.width / 7;
    const baseX = shipPosition * laneWidth + laneWidth / 2;
    
    const sparkColor = isBoosting ? 
      `hsl(${30 + Math.random() * 30}, 90%, 70%)` : // Orange/yellow for boost
      `hsl(${0 + Math.random() * 30}, 80%, 60%)`; // Red/orange for off-track
    
    this.particles.push({
      x: baseX + (Math.random() - 0.5) * laneWidth,
      y: this.canvasSize.height - 30,
      velocityX: (Math.random() - 0.5) * 100,
      velocityY: -50 - Math.random() * 100,
      life: 0.3 + Math.random() * 0.4,
      maxLife: 0.3 + Math.random() * 0.4,
      size: 2 + Math.random() * 3,
      color: sparkColor,
      alpha: 1,
      type: 'spark'
    });
  }

  /**
   * Spawn a dust particle
   */
  private spawnDustParticle(intensity: number, shipPosition: number): void {
    const laneWidth = this.canvasSize.width / 7;
    const baseX = shipPosition * laneWidth + laneWidth / 2;
    
    this.particles.push({
      x: baseX + (Math.random() - 0.5) * laneWidth * 1.5,
      y: this.canvasSize.height - 10,
      velocityX: (Math.random() - 0.5) * 30,
      velocityY: -20 - Math.random() * 40,
      life: 1 + Math.random() * 1.5,
      maxLife: 1 + Math.random() * 1.5,
      size: 3 + Math.random() * 4,
      color: `hsl(${30 + Math.random() * 30}, 30%, 50%)`,
      alpha: 0.6,
      type: 'dust'
    });
  }

  /**
   * Spawn a boost particle
   */
  private spawnBoostParticle(intensity: number, shipPosition: number): void {
    const laneWidth = this.canvasSize.width / 7;
    const baseX = shipPosition * laneWidth + laneWidth / 2;
    
    this.particles.push({
      x: baseX + (Math.random() - 0.5) * laneWidth * 0.5,
      y: this.canvasSize.height - 40,
      velocityX: (Math.random() - 0.5) * 40,
      velocityY: -300 - intensity * 200,
      life: 0.8,
      maxLife: 0.8,
      size: 4 + Math.random() * 3,
      color: `hsl(${180 + Math.random() * 40}, 90%, 80%)`,
      alpha: 1,
      type: 'boost'
    });
  }

  /**
   * Render a single particle
   */
  private renderParticle(context: CanvasRenderingContext2D, particle: Particle): void {
    try {
      context.save();
      context.globalAlpha = particle.alpha;
      
      switch (particle.type) {
        case 'speed_line':
          this.renderSpeedLine(context, particle);
          break;
        case 'spark':
          this.renderSpark(context, particle);
          break;
        case 'dust':
          this.renderDust(context, particle);
          break;
        case 'boost':
          this.renderBoostParticle(context, particle);
          break;
      }

    } catch (error) {
      console.error('Error rendering individual particle:', error);
    } finally {
      context.restore();
    }
  }

  /**
   * Render a speed line particle
   */
  private renderSpeedLine(context: CanvasRenderingContext2D, particle: Particle): void {
    context.strokeStyle = particle.color;
    context.lineWidth = particle.size;
    context.lineCap = 'round';
    
    const trailLength = 15 + particle.velocityY * -0.1;
    
    context.beginPath();
    context.moveTo(particle.x, particle.y);
    context.lineTo(particle.x, particle.y + trailLength);
    context.stroke();
  }

  /**
   * Render a spark particle
   */
  private renderSpark(context: CanvasRenderingContext2D, particle: Particle): void {
    // Create a glowing effect
    const gradient = context.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.size * 2
    );
    gradient.addColorStop(0, particle.color);
    gradient.addColorStop(1, 'transparent');
    
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
    context.fill();
    
    // Bright center
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
  }

  /**
   * Render a dust particle
   */
  private renderDust(context: CanvasRenderingContext2D, particle: Particle): void {
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
  }

  /**
   * Render a boost particle
   */
  private renderBoostParticle(context: CanvasRenderingContext2D, particle: Particle): void {
    // Create a bright, expanding effect
    const gradient = context.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.size * 3
    );
    gradient.addColorStop(0, particle.color);
    gradient.addColorStop(0.5, particle.color.replace(')', ', 0.5)').replace('hsl', 'hsla'));
    gradient.addColorStop(1, 'transparent');
    
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
    context.fill();
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.particles = [];
  }

  /**
   * Get current particle count for debugging
   */
  getParticleCount(): number {
    return this.particles.length;
  }

  /**
   * Get particle statistics for debugging
   */
  getStats(): { total: number; byType: Record<string, number> } {
    const stats = { total: this.particles.length, byType: {} as Record<string, number> };
    
    this.particles.forEach(particle => {
      stats.byType[particle.type] = (stats.byType[particle.type] || 0) + 1;
    });
    
    return stats;
  }
}