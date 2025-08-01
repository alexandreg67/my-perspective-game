/**
 * Level of Detail (LOD) System for HTML5 Canvas Racing Games
 * Optimizes performance by rendering objects with appropriate detail based on distance
 * Adapted for your HTML5 Canvas perspective racing game
 */

export interface LODLevel {
  name: string;
  distanceMin: number;
  distanceMax: number;
  detail: number; // 0.0 to 1.0 (0 = lowest detail, 1 = highest detail)
  renderFunction: (context: CanvasRenderingContext2D, ...args: any[]) => void;
}

export interface LODObject {
  x: number;
  y: number;
  z: number; // Distance from camera/player
  type: 'track_tile' | 'obstacle' | 'power_up' | 'background_element';
  data: any; // Object-specific data
}

export class LODManager {
  private lodLevels: Map<string, LODLevel[]> = new Map();
  private activeObjects: LODObject[] = [];
  private viewerPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private maxRenderDistance: number = 1000;
  private performanceThreshold: number = 16.67; // Target 60 FPS (16.67ms per frame)
  private lastFrameTime: number = 0;
  private adaptiveQuality: boolean = true;

  constructor(maxRenderDistance: number = 1000) {
    this.maxRenderDistance = maxRenderDistance;
    this.initializeDefaultLODLevels();
  }

  /**
   * Initialize default LOD levels for different object types
   */
  private initializeDefaultLODLevels(): void {
    // Track tiles LOD levels
    this.lodLevels.set('track_tile', [
      {
        name: 'high_detail',
        distanceMin: 0,
        distanceMax: 200,
        detail: 1.0,
        renderFunction: this.renderTrackTileHighDetail.bind(this)
      },
      {
        name: 'medium_detail',
        distanceMin: 200,
        distanceMax: 500,
        detail: 0.6,
        renderFunction: this.renderTrackTileMediumDetail.bind(this)
      },
      {
        name: 'low_detail',
        distanceMin: 500,
        distanceMax: 1000,
        detail: 0.3,
        renderFunction: this.renderTrackTileLowDetail.bind(this)
      }
    ]);

    // Power-ups LOD levels
    this.lodLevels.set('power_up', [
      {
        name: 'high_detail',
        distanceMin: 0,
        distanceMax: 150,
        detail: 1.0,
        renderFunction: this.renderPowerUpHighDetail.bind(this)
      },
      {
        name: 'medium_detail',
        distanceMin: 150,
        distanceMax: 400,
        detail: 0.7,
        renderFunction: this.renderPowerUpMediumDetail.bind(this)
      },
      {
        name: 'low_detail',
        distanceMin: 400,
        distanceMax: 800,
        detail: 0.4,
        renderFunction: this.renderPowerUpLowDetail.bind(this)
      }
    ]);

    // Background elements LOD levels
    this.lodLevels.set('background_element', [
      {
        name: 'visible',
        distanceMin: 0,
        distanceMax: 600,
        detail: 0.8,
        renderFunction: this.renderBackgroundElement.bind(this)
      },
      {
        name: 'culled',
        distanceMin: 600,
        distanceMax: Number.MAX_VALUE,
        detail: 0.0,
        renderFunction: () => {} // Don't render at all
      }
    ]);
  }

  /**
   * Update viewer position (typically the player's position)
   */
  updateViewerPosition(x: number, y: number, z: number): void {
    this.viewerPosition = { x, y, z };
  }

  /**
   * Add object to be managed by LOD system
   */
  addObject(object: LODObject): void {
    this.activeObjects.push(object);
  }

  /**
   * Remove object from LOD system
   */
  removeObject(object: LODObject): void {
    const index = this.activeObjects.indexOf(object);
    if (index > -1) {
      this.activeObjects.splice(index, 1);
    }
  }

  /**
   * Clear all objects
   */
  clearObjects(): void {
    this.activeObjects = [];
  }

  /**
   * Calculate distance between viewer and object
   */
  private calculateDistance(object: LODObject): number {
    const dx = object.x - this.viewerPosition.x;
    const dy = object.y - this.viewerPosition.y;
    const dz = object.z - this.viewerPosition.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get appropriate LOD level for an object based on distance
   */
  private getLODLevel(object: LODObject, distance: number): LODLevel | null {
    const levels = this.lodLevels.get(object.type);
    if (!levels) return null;

    for (const level of levels) {
      if (distance >= level.distanceMin && distance < level.distanceMax) {
        return level;
      }
    }

    return null;
  }

  /**
   * Render all objects with appropriate LOD
   */
  render(context: CanvasRenderingContext2D): void {
    const frameStart = performance.now();

    // Sort objects by distance (far to near for proper rendering order)
    const visibleObjects = this.activeObjects
      .map(obj => ({
        object: obj,
        distance: this.calculateDistance(obj)
      }))
      .filter(item => item.distance <= this.maxRenderDistance)
      .sort((a, b) => b.distance - a.distance);

    // Adaptive quality based on performance
    let qualityMultiplier = 1.0;
    if (this.adaptiveQuality && this.lastFrameTime > this.performanceThreshold) {
      qualityMultiplier = Math.max(0.3, 1.0 - (this.lastFrameTime - this.performanceThreshold) / this.performanceThreshold);
    }

    // Render objects with appropriate LOD
    for (const { object, distance } of visibleObjects) {
      const lodLevel = this.getLODLevel(object, distance * qualityMultiplier);
      if (lodLevel && lodLevel.detail > 0) {
        try {
          lodLevel.renderFunction(context, object, distance, lodLevel.detail);
        } catch (error) {
          console.warn(`LOD rendering error for ${object.type}:`, error);
        }
      }
    }

    // Track frame time for adaptive quality
    this.lastFrameTime = performance.now() - frameStart;
  }

  /**
   * High detail track tile rendering
   */
  private renderTrackTileHighDetail(context: CanvasRenderingContext2D, object: LODObject, distance: number, detail: number): void {
    const size = 20 * (1 - distance / this.maxRenderDistance);
    
    context.save();
    context.globalAlpha = detail;
    
    // Draw detailed tile with gradient and border
    const gradient = context.createRadialGradient(object.x, object.y, 0, object.x, object.y, size);
    gradient.addColorStop(0, '#4a5568');
    gradient.addColorStop(1, '#2d3748');
    
    context.fillStyle = gradient;
    context.fillRect(object.x - size/2, object.y - size/2, size, size);
    
    // Add border detail
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1;
    context.strokeRect(object.x - size/2, object.y - size/2, size, size);
    
    context.restore();
  }

  /**
   * Medium detail track tile rendering
   */
  private renderTrackTileMediumDetail(context: CanvasRenderingContext2D, object: LODObject, distance: number, detail: number): void {
    const size = 20 * (1 - distance / this.maxRenderDistance);
    
    context.save();
    context.globalAlpha = detail;
    context.fillStyle = '#4a5568';
    context.fillRect(object.x - size/2, object.y - size/2, size, size);
    context.restore();
  }

  /**
   * Low detail track tile rendering
   */
  private renderTrackTileLowDetail(context: CanvasRenderingContext2D, object: LODObject, distance: number, detail: number): void {
    const size = 15 * (1 - distance / this.maxRenderDistance);
    
    context.save();
    context.globalAlpha = detail * 0.7;
    context.fillStyle = '#2d3748';
    context.fillRect(object.x - size/2, object.y - size/2, size, size);
    context.restore();
  }

  /**
   * High detail power-up rendering
   */
  private renderPowerUpHighDetail(context: CanvasRenderingContext2D, object: LODObject, distance: number, detail: number): void {
    const size = 15 * (1 - distance / this.maxRenderDistance);
    
    context.save();
    context.globalAlpha = detail;
    
    // Animated glow effect
    const time = Date.now() * 0.005;
    const glowSize = size + Math.sin(time) * 3;
    
    // Outer glow
    const outerGradient = context.createRadialGradient(object.x, object.y, 0, object.x, object.y, glowSize);
    outerGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
    outerGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    
    context.fillStyle = outerGradient;
    context.beginPath();
    context.arc(object.x, object.y, glowSize, 0, Math.PI * 2);
    context.fill();
    
    // Core power-up
    context.fillStyle = '#ffd700';
    context.beginPath();
    context.arc(object.x, object.y, size * 0.6, 0, Math.PI * 2);
    context.fill();
    
    context.restore();
  }

  /**
   * Medium detail power-up rendering
   */
  private renderPowerUpMediumDetail(context: CanvasRenderingContext2D, object: LODObject, distance: number, detail: number): void {
    const size = 12 * (1 - distance / this.maxRenderDistance);
    
    context.save();
    context.globalAlpha = detail;
    context.fillStyle = '#ffd700';
    context.beginPath();
    context.arc(object.x, object.y, size, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  /**
   * Low detail power-up rendering
   */
  private renderPowerUpLowDetail(context: CanvasRenderingContext2D, object: LODObject, distance: number, detail: number): void {
    const size = 8 * (1 - distance / this.maxRenderDistance);
    
    context.save();
    context.globalAlpha = detail * 0.8;
    context.fillStyle = '#ffed4e';
    context.fillRect(object.x - size/2, object.y - size/2, size, size);
    context.restore();
  }

  /**
   * Background element rendering
   */
  private renderBackgroundElement(context: CanvasRenderingContext2D, object: LODObject, distance: number, detail: number): void {
    const size = object.data.size || 30;
    const scaledSize = size * (1 - distance / this.maxRenderDistance);
    
    context.save();
    context.globalAlpha = detail * 0.6;
    context.fillStyle = object.data.color || '#1a365d';
    
    if (object.data.shape === 'circle') {
      context.beginPath();
      context.arc(object.x, object.y, scaledSize, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillRect(object.x - scaledSize/2, object.y - scaledSize/2, scaledSize, scaledSize);
    }
    
    context.restore();
  }

  /**
   * Get performance statistics
   */
  getStats(): { 
    totalObjects: number; 
    renderedObjects: number; 
    avgFrameTime: number;
    qualityLevel: string;
  } {
    const visibleCount = this.activeObjects.filter(obj => 
      this.calculateDistance(obj) <= this.maxRenderDistance
    ).length;

    let qualityLevel = 'High';
    if (this.lastFrameTime > this.performanceThreshold * 2) {
      qualityLevel = 'Low';
    } else if (this.lastFrameTime > this.performanceThreshold) {
      qualityLevel = 'Medium';
    }

    return {
      totalObjects: this.activeObjects.length,
      renderedObjects: visibleCount,
      avgFrameTime: this.lastFrameTime,
      qualityLevel
    };
  }

  /**
   * Enable or disable adaptive quality
   */
  setAdaptiveQuality(enabled: boolean): void {
    this.adaptiveQuality = enabled;
  }

  /**
   * Update performance threshold (target frame time in ms)
   */
  setPerformanceThreshold(ms: number): void {
    this.performanceThreshold = ms;
  }
}

// Example usage for your racing game:
/*
const lodManager = new LODManager(800);

// Add track tiles
for (let i = 0; i < 100; i++) {
  lodManager.addObject({
    x: Math.random() * 800,
    y: i * 50,
    z: i * 10,
    type: 'track_tile',
    data: { tileType: 'normal' }
  });
}

// Add power-ups
for (let i = 0; i < 20; i++) {
  lodManager.addObject({
    x: Math.random() * 800,
    y: Math.random() * 1000,
    z: Math.random() * 500,
    type: 'power_up',
    data: { powerType: 'speed_boost' }
  });
}

// In your game loop:
function gameLoop() {
  // Update viewer position (ship position)
  lodManager.updateViewerPosition(shipX, shipY, 0);
  
  // Render with LOD
  lodManager.render(canvasContext);
  
  requestAnimationFrame(gameLoop);
}
*/