/**
 * Power-Up System for HTML5 Canvas Racing Games
 * Implements temporary gameplay modifiers that enhance engagement and strategic depth
 * Based on successful power-up mechanics from classic racing games
 */

export interface PowerUpEffect {
  id: string;
  name: string;
  description: string;
  duration: number; // Duration in seconds (0 = instant effect)
  stackable: boolean; // Can multiple instances be active?
  maxStacks: number; // Maximum stacks if stackable
  icon: string; // Icon identifier or path
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  onActivate: (gameState: any, powerUp: PowerUpInstance) => void;
  onUpdate: (gameState: any, powerUp: PowerUpInstance, deltaTime: number) => void;
  onDeactivate: (gameState: any, powerUp: PowerUpInstance) => void;
}

export interface PowerUpInstance {
  id: string;
  effectId: string;
  timeRemaining: number;
  stacks: number;
  activatedAt: number;
  data: Record<string, any>; // Custom data for the power-up instance
}

export interface PowerUpSpawner {
  x: number;
  y: number;
  z: number;
  effectId: string;
  collected: boolean;
  spawnTime: number;
  despawnTime?: number; // When to remove if not collected
}

export interface PowerUpConfig {
  spawnRate: number; // Spawns per minute
  maxActiveSpawners: number;
  despawnTime: number; // Time before uncollected power-ups disappear
  collectionRadius: number;
  rarityWeights: Record<string, number>; // Probability weights for each rarity
}

export class PowerUpSystem {
  private effects: Map<string, PowerUpEffect> = new Map();
  private activeInstances: PowerUpInstance[] = [];
  private spawners: PowerUpSpawner[] = [];
  private config: PowerUpConfig;
  private lastSpawnTime: number = 0;
  private gameState: any;

  constructor(config: Partial<PowerUpConfig> = {}) {
    this.config = {
      spawnRate: 2, // 2 power-ups per minute
      maxActiveSpawners: 5,
      despawnTime: 30, // 30 seconds
      collectionRadius: 25,
      rarityWeights: {
        common: 50,
        uncommon: 30,
        rare: 15,
        legendary: 5
      },
      ...config
    };

    this.initializeDefaultEffects();
  }

  /**
   * Initialize default power-up effects
   */
  private initializeDefaultEffects(): void {
    // Speed Boost
    this.registerEffect({
      id: 'speed_boost',
      name: 'Speed Boost',
      description: 'Increase speed by 50% for 5 seconds',
      duration: 5,
      stackable: false,
      maxStacks: 1,
      icon: 'speed_icon',
      rarity: 'common',
      onActivate: (gameState, powerUp) => {
        gameState.speedMultiplier = (gameState.speedMultiplier || 1) * 1.5;
        powerUp.data.originalSpeedMultiplier = gameState.speedMultiplier / 1.5;
      },
      onUpdate: (gameState, powerUp, deltaTime) => {
        // Visual effects could be updated here
      },
      onDeactivate: (gameState, powerUp) => {
        gameState.speedMultiplier = powerUp.data.originalSpeedMultiplier || 1;
      }
    });

    // Shield
    this.registerEffect({
      id: 'shield',
      name: 'Shield',
      description: 'Protect against obstacles for 8 seconds',
      duration: 8,
      stackable: false,
      maxStacks: 1,
      icon: 'shield_icon',
      rarity: 'uncommon',
      onActivate: (gameState, powerUp) => {
        gameState.hasShield = true;
        powerUp.data.hitsTaken = 0;
      },
      onUpdate: (gameState, powerUp, deltaTime) => {
        // Could add shield visual effects
      },
      onDeactivate: (gameState, powerUp) => {
        gameState.hasShield = false;
      }
    });

    // Score Multiplier
    this.registerEffect({
      id: 'score_multiplier',
      name: 'Score Multiplier',
      description: 'Double score for 10 seconds',
      duration: 10,
      stackable: true,
      maxStacks: 3,
      icon: 'multiplier_icon',
      rarity: 'rare',
      onActivate: (gameState, powerUp) => {
        gameState.scoreMultiplier = (gameState.scoreMultiplier || 1) * 2;
      },
      onUpdate: (gameState, powerUp, deltaTime) => {},
      onDeactivate: (gameState, powerUp) => {
        gameState.scoreMultiplier = (gameState.scoreMultiplier || 2) / 2;
      }
    });

    // Magnet
    this.registerEffect({
      id: 'magnet',
      name: 'Magnet',
      description: 'Attract nearby power-ups and bonuses',
      duration: 12,
      stackable: false,
      maxStacks: 1,
      icon: 'magnet_icon',
      rarity: 'uncommon',
      onActivate: (gameState, powerUp) => {
        gameState.magnetRadius = 100;
        powerUp.data.attractedItems = [];
      },
      onUpdate: (gameState, powerUp, deltaTime) => {
        // Attract nearby collectibles
        this.attractNearbyItems(gameState, powerUp);
      },
      onDeactivate: (gameState, powerUp) => {
        gameState.magnetRadius = 0;
      }
    });

    // Ghost Mode
    this.registerEffect({
      id: 'ghost_mode',
      name: 'Ghost Mode',
      description: 'Phase through obstacles for 6 seconds',
      duration: 6,
      stackable: false,
      maxStacks: 1,
      icon: 'ghost_icon',
      rarity: 'rare',
      onActivate: (gameState, powerUp) => {
        gameState.isGhost = true;
        powerUp.data.originalAlpha = gameState.playerAlpha || 1;
        gameState.playerAlpha = 0.5;
      },
      onUpdate: (gameState, powerUp, deltaTime) => {
        // Flickering ghost effect
        const flicker = Math.sin(Date.now() * 0.01) * 0.2 + 0.5;
        gameState.playerAlpha = flicker;
      },
      onDeactivate: (gameState, powerUp) => {
        gameState.isGhost = false;
        gameState.playerAlpha = powerUp.data.originalAlpha;
      }
    });

    // Time Slow
    this.registerEffect({
      id: 'time_slow',
      name: 'Time Slow',
      description: 'Slow down time for better reaction',
      duration: 4,
      stackable: false,
      maxStacks: 1,
      icon: 'time_icon',
      rarity: 'legendary',
      onActivate: (gameState, powerUp) => {
        gameState.timeScale = 0.5;
        powerUp.data.originalTimeScale = 1;
      },
      onUpdate: (gameState, powerUp, deltaTime) => {},
      onDeactivate: (gameState, powerUp) => {
        gameState.timeScale = powerUp.data.originalTimeScale;
      }
    });

    // Instant Points
    this.registerEffect({
      id: 'instant_points',
      name: 'Point Bonus',
      description: 'Instantly gain 500 points',
      duration: 0, // Instant effect
      stackable: true,
      maxStacks: 999,
      icon: 'points_icon',
      rarity: 'common',
      onActivate: (gameState, powerUp) => {
        const bonus = 500 * (powerUp.stacks || 1);
        gameState.score = (gameState.score || 0) + bonus;
        powerUp.data.pointsAwarded = bonus;
      },
      onUpdate: (gameState, powerUp, deltaTime) => {},
      onDeactivate: (gameState, powerUp) => {}
    });

    // Super Jump
    this.registerEffect({
      id: 'super_jump',
      name: 'Super Jump',
      description: 'Higher jump ability for 8 seconds',
      duration: 8,
      stackable: false,
      maxStacks: 1,
      icon: 'jump_icon',
      rarity: 'uncommon',
      onActivate: (gameState, powerUp) => {
        gameState.jumpPower = (gameState.jumpPower || 1) * 2;
      },
      onUpdate: (gameState, powerUp, deltaTime) => {},
      onDeactivate: (gameState, powerUp) => {
        gameState.jumpPower = (gameState.jumpPower || 2) / 2;
      }
    });
  }

  /**
   * Register a new power-up effect
   */
  registerEffect(effect: PowerUpEffect): void {
    this.effects.set(effect.id, effect);
  }

  /**
   * Update the power-up system
   */
  update(deltaTime: number, gameState: any): void {
    this.gameState = gameState;
    
    // Update active power-up instances
    this.updateActiveInstances(deltaTime);
    
    // Update spawners
    this.updateSpawners(deltaTime);
    
    // Spawn new power-ups
    this.trySpawnPowerUp(deltaTime);
  }

  /**
   * Update active power-up instances
   */
  private updateActiveInstances(deltaTime: number): void {
    this.activeInstances = this.activeInstances.filter(instance => {
      const effect = this.effects.get(instance.effectId);
      if (!effect) return false;

      // Update the effect
      effect.onUpdate(this.gameState, instance, deltaTime);

      // Decrease time remaining
      if (instance.timeRemaining > 0) {
        instance.timeRemaining -= deltaTime;

        if (instance.timeRemaining <= 0) {
          // Effect expired
          effect.onDeactivate(this.gameState, instance);
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Update power-up spawners
   */
  private updateSpawners(deltaTime: number): void {
    const currentTime = Date.now();

    this.spawners = this.spawners.filter(spawner => {
      // Remove collected spawners
      if (spawner.collected) return false;

      // Remove expired spawners
      if (spawner.despawnTime && currentTime > spawner.despawnTime) {
        return false;
      }

      return true;
    });
  }

  /**
   * Try to spawn a new power-up
   */
  private trySpawnPowerUp(deltaTime: number): void {
    const currentTime = Date.now();
    const timeSinceLastSpawn = (currentTime - this.lastSpawnTime) / 1000;
    const spawnInterval = 60 / this.config.spawnRate; // Convert per minute to interval

    if (timeSinceLastSpawn >= spawnInterval && 
        this.spawners.length < this.config.maxActiveSpawners) {
      
      this.spawnPowerUp();
      this.lastSpawnTime = currentTime;
    }
  }

  /**
   * Spawn a new power-up at a random location
   */
  spawnPowerUp(position?: { x: number; y: number; z: number }): void {
    const effectId = this.selectRandomEffect();
    const currentTime = Date.now();

    const spawner: PowerUpSpawner = {
      x: position?.x || Math.random() * 800, // Random X position
      y: position?.y || Math.random() * 600, // Random Y position  
      z: position?.z || Math.random() * 200, // Random Z depth
      effectId,
      collected: false,
      spawnTime: currentTime,
      despawnTime: currentTime + (this.config.despawnTime * 1000)
    };

    this.spawners.push(spawner);
  }

  /**
   * Select a random effect based on rarity weights
   */
  private selectRandomEffect(): string {
    const availableEffects = Array.from(this.effects.values());
    const totalWeight = availableEffects.reduce((sum, effect) => 
      sum + this.config.rarityWeights[effect.rarity], 0);

    let random = Math.random() * totalWeight;

    for (const effect of availableEffects) {
      const weight = this.config.rarityWeights[effect.rarity];
      if (random < weight) {
        return effect.id;
      }
      random -= weight;
    }

    // Fallback to first effect
    return availableEffects[0]?.id || 'speed_boost';
  }

  /**
   * Check for power-up collection
   */
  checkCollisions(playerPosition: { x: number; y: number; z: number }): PowerUpSpawner[] {
    const collected: PowerUpSpawner[] = [];

    for (const spawner of this.spawners) {
      if (spawner.collected) continue;

      const distance = Math.sqrt(
        Math.pow(spawner.x - playerPosition.x, 2) +
        Math.pow(spawner.y - playerPosition.y, 2) +
        Math.pow(spawner.z - playerPosition.z, 2)
      );

      if (distance <= this.config.collectionRadius) {
        spawner.collected = true;
        this.activatePowerUp(spawner.effectId);
        collected.push(spawner);
      }
    }

    return collected;
  }

  /**
   * Activate a power-up effect
   */
  activatePowerUp(effectId: string): PowerUpInstance | null {
    const effect = this.effects.get(effectId);
    if (!effect) return null;

    // Check if effect is stackable
    const existingInstance = this.activeInstances.find(i => i.effectId === effectId);
    
    if (existingInstance && effect.stackable && existingInstance.stacks < effect.maxStacks) {
      // Stack the effect
      existingInstance.stacks++;
      existingInstance.timeRemaining = Math.max(existingInstance.timeRemaining, effect.duration);
      effect.onActivate(this.gameState, existingInstance);
      return existingInstance;
    } else if (!existingInstance || effect.stackable) {
      // Create new instance
      const instance: PowerUpInstance = {
        id: `${effectId}_${Date.now()}`,
        effectId,
        timeRemaining: effect.duration,
        stacks: 1,
        activatedAt: Date.now(),
        data: {}
      };

      this.activeInstances.push(instance);
      effect.onActivate(this.gameState, instance);
      return instance;
    }

    return null;
  }

  /**
   * Force deactivate a power-up
   */
  deactivatePowerUp(instanceId: string): boolean {
    const index = this.activeInstances.findIndex(i => i.id === instanceId);
    if (index === -1) return false;

    const instance = this.activeInstances[index];
    const effect = this.effects.get(instance.effectId);
    
    if (effect) {
      effect.onDeactivate(this.gameState, instance);
    }

    this.activeInstances.splice(index, 1);
    return true;
  }

  /**
   * Helper method for magnet effect
   */
  private attractNearbyItems(gameState: any, magnetPowerUp: PowerUpInstance): void {
    const magnetRadius = gameState.magnetRadius || 0;
    const playerPos = { x: gameState.playerX || 0, y: gameState.playerY || 0, z: 0 };

    // Attract uncollected power-ups
    for (const spawner of this.spawners) {
      if (spawner.collected) continue;

      const distance = Math.sqrt(
        Math.pow(spawner.x - playerPos.x, 2) +
        Math.pow(spawner.y - playerPos.y, 2)
      );

      if (distance <= magnetRadius) {
        // Move spawner towards player
        const moveSpeed = 200; // pixels per second
        const direction = {
          x: (playerPos.x - spawner.x) / distance,
          y: (playerPos.y - spawner.y) / distance
        };

        spawner.x += direction.x * moveSpeed * 0.016; // Assuming 60 FPS
        spawner.y += direction.y * moveSpeed * 0.016;
      }
    }
  }

  /**
   * Render power-up spawners
   */
  render(context: CanvasRenderingContext2D): void {
    for (const spawner of this.spawners) {
      if (spawner.collected) continue;

      const effect = this.effects.get(spawner.effectId);
      if (!effect) continue;

      this.renderPowerUpSpawner(context, spawner, effect);
    }
  }

  /**
   * Render a single power-up spawner
   */
  private renderPowerUpSpawner(context: CanvasRenderingContext2D, spawner: PowerUpSpawner, effect: PowerUpEffect): void {
    context.save();

    // Animated floating effect
    const time = (Date.now() - spawner.spawnTime) * 0.003;
    const floatOffset = Math.sin(time) * 5;
    const y = spawner.y + floatOffset;

    // Rarity-based glow
    const glowColors = {
      common: '#ffffff',
      uncommon: '#00ff00',
      rare: '#0080ff',
      legendary: '#ff8000'
    };

    const glowColor = glowColors[effect.rarity];
    const glowSize = 20 + Math.sin(time * 2) * 5;

    // Outer glow
    const gradient = context.createRadialGradient(spawner.x, y, 0, spawner.x, y, glowSize);
    gradient.addColorStop(0, glowColor + '80');
    gradient.addColorStop(1, glowColor + '00');

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(spawner.x, y, glowSize, 0, Math.PI * 2);
    context.fill();

    // Power-up icon (simplified geometric shape)
    context.fillStyle = glowColor;
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2;

    const size = 12;
    context.beginPath();
    
    // Different shapes for different effects
    switch (effect.id) {
      case 'speed_boost':
        // Triangle pointing right
        context.moveTo(spawner.x - size, y - size);
        context.lineTo(spawner.x + size, y);
        context.lineTo(spawner.x - size, y + size);
        break;
      case 'shield':
        // Shield shape
        context.moveTo(spawner.x, y - size);
        context.lineTo(spawner.x + size * 0.7, y - size * 0.3);
        context.lineTo(spawner.x + size * 0.7, y + size * 0.3);
        context.lineTo(spawner.x, y + size);
        context.lineTo(spawner.x - size * 0.7, y + size * 0.3);
        context.lineTo(spawner.x - size * 0.7, y - size * 0.3);
        break;
      default:
        // Default circle
        context.arc(spawner.x, y, size, 0, Math.PI * 2);
        break;
    }

    context.closePath();
    context.fill();
    context.stroke();

    context.restore();
  }

  /**
   * Get all active power-up instances
   */
  getActiveInstances(): PowerUpInstance[] {
    return [...this.activeInstances];
  }

  /**
   * Get all spawners
   */
  getSpawners(): PowerUpSpawner[] {
    return [...this.spawners];
  }

  /**
   * Check if a specific effect is active
   */
  hasActiveEffect(effectId: string): boolean {
    return this.activeInstances.some(i => i.effectId === effectId);
  }

  /**
   * Get remaining time for an active effect
   */
  getEffectTimeRemaining(effectId: string): number {
    const instance = this.activeInstances.find(i => i.effectId === effectId);
    return instance ? instance.timeRemaining : 0;
  }

  /**
   * Clear all active effects and spawners
   */
  clear(): void {
    // Deactivate all effects
    for (const instance of this.activeInstances) {
      const effect = this.effects.get(instance.effectId);
      if (effect) {
        effect.onDeactivate(this.gameState, instance);
      }
    }

    this.activeInstances = [];
    this.spawners = [];
  }

  /**
   * Get system statistics
   */
  getStats(): {
    activeEffects: number;
    availableSpawners: number;
    totalEffectsRegistered: number;
  } {
    return {
      activeEffects: this.activeInstances.length,
      availableSpawners: this.spawners.filter(s => !s.collected).length,
      totalEffectsRegistered: this.effects.size
    };
  }
}

// Example usage:
/*
const powerUpSystem = new PowerUpSystem({
  spawnRate: 3, // 3 power-ups per minute
  maxActiveSpawners: 3,
  collectionRadius: 30
});

// In your game loop:
function gameLoop(deltaTime: number) {
  // Update power-up system
  powerUpSystem.update(deltaTime, gameState);
  
  // Check for collections
  const collected = powerUpSystem.checkCollisions({
    x: gameState.playerX,
    y: gameState.playerY,
    z: 0
  });
  
  // Handle collected power-ups
  for (const powerUp of collected) {
    console.log(`Collected power-up: ${powerUp.effectId}`);
    // Play sound, show effect, etc.
  }
  
  // Render power-ups
  powerUpSystem.render(canvasContext);
}

// Register custom power-up:
powerUpSystem.registerEffect({
  id: 'double_points',
  name: 'Double Points',
  description: 'Double all points for 15 seconds',
  duration: 15,
  stackable: false,
  maxStacks: 1,
  icon: 'double_points_icon',
  rarity: 'rare',
  onActivate: (gameState, powerUp) => {
    gameState.pointMultiplier = (gameState.pointMultiplier || 1) * 2;
  },
  onUpdate: (gameState, powerUp, deltaTime) => {},
  onDeactivate: (gameState, powerUp) => {
    gameState.pointMultiplier = (gameState.pointMultiplier || 2) / 2;
  }
});
*/