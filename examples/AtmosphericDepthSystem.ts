/**
 * Atmospheric Depth Effects System for HTML5 Canvas
 * Implements fog, blur, and atmospheric effects to enhance depth perception
 * Based on atmospheric scattering and distance-based rendering techniques
 */

export interface AtmosphericConfig {
  fogColor: string;
  fogDensity: number; // 0-1, how thick the fog is
  fogStart: number; // Distance where fog starts to appear
  fogEnd: number; // Distance where fog reaches maximum density
  fogType: 'linear' | 'exponential' | 'exponential_squared';
  enableDepthBlur: boolean;
  blurIntensity: number; // 0-10, blur amount for distant objects
  enableColorShift: boolean;
  distantColor: string; // Color shift for distant objects
  atmosphericScattering: boolean;
  scatteringIntensity: number;
}

export interface DepthObject {
  x: number;
  y: number;
  z: number; // Distance from camera
  width: number;
  height: number;
  originalColor?: string;
  type: string;
}

export class AtmosphericDepthSystem {
  private config: AtmosphericConfig;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private fogGradient: CanvasGradient | null = null;
  private depthBuffer: ImageData | null = null;
  private blurCanvas: HTMLCanvasElement;
  private blurContext: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, config: Partial<AtmosphericConfig> = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d')!;
    
    this.config = {
      fogColor: 'rgba(135, 206, 235, 0.8)', // Light blue fog
      fogDensity: 0.6,
      fogStart: 200,
      fogEnd: 800,
      fogType: 'linear',
      enableDepthBlur: true,
      blurIntensity: 3,
      enableColorShift: true,
      distantColor: '#a0b4d1',
      atmosphericScattering: true,
      scatteringIntensity: 0.3,
      ...config
    };

    // Create blur canvas for depth blur effects
    this.blurCanvas = document.createElement('canvas');
    this.blurCanvas.width = canvas.width;
    this.blurCanvas.height = canvas.height;
    this.blurContext = this.blurCanvas.getContext('2d')!;

    this.initializeFogGradient();
  }

  /**
   * Initialize fog gradient based on configuration
   */
  private initializeFogGradient(): void {
    const gradient = this.context.createLinearGradient(0, 0, 0, this.canvas.height);
    
    switch (this.config.fogType) {
      case 'linear':
        gradient.addColorStop(0, `rgba(135, 206, 235, ${this.config.fogDensity})`);
        gradient.addColorStop(0.7, `rgba(135, 206, 235, ${this.config.fogDensity * 0.3})`);
        gradient.addColorStop(1, 'rgba(135, 206, 235, 0)');
        break;
      case 'exponential':
        gradient.addColorStop(0, `rgba(135, 206, 235, ${this.config.fogDensity})`);
        gradient.addColorStop(0.4, `rgba(135, 206, 235, ${this.config.fogDensity * 0.6})`);
        gradient.addColorStop(0.8, `rgba(135, 206, 235, ${this.config.fogDensity * 0.2})`);
        gradient.addColorStop(1, 'rgba(135, 206, 235, 0)');
        break;
      case 'exponential_squared':
        gradient.addColorStop(0, `rgba(135, 206, 235, ${this.config.fogDensity})`);
        gradient.addColorStop(0.3, `rgba(135, 206, 235, ${this.config.fogDensity * 0.8})`);
        gradient.addColorStop(0.6, `rgba(135, 206, 235, ${this.config.fogDensity * 0.4})`);
        gradient.addColorStop(0.9, `rgba(135, 206, 235, ${this.config.fogDensity * 0.1})`);
        gradient.addColorStop(1, 'rgba(135, 206, 235, 0)');
        break;
    }

    this.fogGradient = gradient;
  }

  /**
   * Calculate fog factor based on distance and fog type
   */
  private calculateFogFactor(distance: number): number {
    if (distance <= this.config.fogStart) return 0;
    if (distance >= this.config.fogEnd) return 1;

    const normalizedDistance = (distance - this.config.fogStart) / (this.config.fogEnd - this.config.fogStart);

    switch (this.config.fogType) {
      case 'linear':
        return normalizedDistance * this.config.fogDensity;
      
      case 'exponential':
        return (1 - Math.exp(-this.config.fogDensity * normalizedDistance * 2)) * this.config.fogDensity;
      
      case 'exponential_squared':
        const exp = this.config.fogDensity * normalizedDistance * 2;
        return (1 - Math.exp(-exp * exp)) * this.config.fogDensity;
      
      default:
        return normalizedDistance * this.config.fogDensity;
    }
  }

  /**
   * Calculate atmospheric color shift based on distance
   */
  private calculateAtmosphericColor(originalColor: string, distance: number): string {
    if (!this.config.enableColorShift) return originalColor;

    const fogFactor = this.calculateFogFactor(distance);
    if (fogFactor === 0) return originalColor;

    // Parse original color (simplified - assumes hex format)
    const rgb = this.hexToRgb(originalColor);
    if (!rgb) return originalColor;

    // Parse distant color
    const distantRgb = this.hexToRgb(this.config.distantColor);
    if (!distantRgb) return originalColor;

    // Interpolate between original and distant color
    const r = Math.round(rgb.r + (distantRgb.r - rgb.r) * fogFactor);
    const g = Math.round(rgb.g + (distantRgb.g - rgb.g) * fogFactor);
    const b = Math.round(rgb.b + (distantRgb.b - rgb.b) * fogFactor);

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Apply atmospheric effects to an object before rendering
   */
  applyAtmosphericEffects(object: DepthObject, renderCallback: () => void): void {
    const fogFactor = this.calculateFogFactor(object.z);
    
    this.context.save();

    // Apply color shift
    if (this.config.enableColorShift && object.originalColor) {
      const atmosphericColor = this.calculateAtmosphericColor(object.originalColor, object.z);
      // This would need to be handled in the renderCallback
    }

    // Apply alpha based on fog
    this.context.globalAlpha *= (1 - fogFactor);

    // Apply blur for distant objects
    if (this.config.enableDepthBlur && fogFactor > 0.3) {
      const blurAmount = fogFactor * this.config.blurIntensity;
      this.applyBlurEffect(object, blurAmount);
    }

    // Render the object
    renderCallback();

    this.context.restore();
  }

  /**
   * Apply blur effect to distant objects
   */
  private applyBlurEffect(object: DepthObject, blurAmount: number): void {
    if (blurAmount <= 0) return;

    // Create a temporary canvas for the blur effect
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = object.width + blurAmount * 4;
    tempCanvas.height = object.height + blurAmount * 4;
    const tempContext = tempCanvas.getContext('2d')!;

    // Apply shadow blur as a simple blur approximation
    this.context.filter = `blur(${blurAmount}px)`;
  }

  /**
   * Render atmospheric fog overlay
   */
  renderFogOverlay(): void {
    if (!this.fogGradient || this.config.fogDensity === 0) return;

    this.context.save();
    this.context.globalCompositeOperation = 'source-over';
    this.context.fillStyle = this.fogGradient;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.restore();
  }

  /**
   * Render volumetric fog effect using Perlin noise
   */
  renderVolumetricFog(time: number = 0): void {
    if (this.config.fogDensity === 0) return;

    const imageData = this.context.createImageData(this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let y = 0; y < this.canvas.height; y++) {
      for (let x = 0; x < this.canvas.width; x++) {
        const index = (y * this.canvas.width + x) * 4;
        
        // Simple noise-based fog (simplified Perlin noise)
        const noise = this.simpleNoise(x * 0.01 + time * 0.001, y * 0.01);
        const depth = y / this.canvas.height; // Assume depth increases with Y
        const fogIntensity = Math.max(0, noise * depth * this.config.fogDensity);

        // Extract RGB from fog color
        const fogRgb = this.parseColor(this.config.fogColor);
        
        data[index] = fogRgb.r;     // Red
        data[index + 1] = fogRgb.g; // Green
        data[index + 2] = fogRgb.b; // Blue
        data[index + 3] = fogIntensity * 255; // Alpha
      }
    }

    this.context.save();
    this.context.globalCompositeOperation = 'source-over';
    this.context.putImageData(imageData, 0, 0);
    this.context.restore();
  }

  /**
   * Simple noise function (simplified Perlin noise)
   */
  private simpleNoise(x: number, y: number): number {
    const sin = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (sin - Math.floor(sin)) * 2 - 1; // Normalize to [-1, 1]
  }

  /**
   * Apply atmospheric scattering effect
   */
  applyAtmosphericScattering(sunPosition: { x: number; y: number }): void {
    if (!this.config.atmosphericScattering) return;

    const gradient = this.context.createRadialGradient(
      sunPosition.x, sunPosition.y, 0,
      sunPosition.x, sunPosition.y, Math.max(this.canvas.width, this.canvas.height)
    );

    const scatteringColor = `rgba(255, 200, 150, ${this.config.scatteringIntensity})`;
    gradient.addColorStop(0, scatteringColor);
    gradient.addColorStop(0.3, `rgba(255, 200, 150, ${this.config.scatteringIntensity * 0.5})`);
    gradient.addColorStop(1, 'rgba(255, 200, 150, 0)');

    this.context.save();
    this.context.globalCompositeOperation = 'screen';
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.restore();
  }

  /**
   * Create depth-based particle effects (dust, atmospheric particles)
   */
  renderAtmosphericParticles(cameraZ: number, time: number): void {
    const particleCount = 50;
    
    this.context.save();

    for (let i = 0; i < particleCount; i++) {
      const seed = i * 73856093;
      const x = (seed % this.canvas.width);
      const y = ((seed * 19349663) % this.canvas.height);
      const z = ((seed * 83492791) % 500) + 100; // Particle depth
      
      // Calculate relative distance from camera
      const distance = Math.abs(z - cameraZ);
      const fogFactor = this.calculateFogFactor(distance);
      
      if (fogFactor < 0.9) { // Don't render completely fogged particles
        const size = Math.max(1, 3 - fogFactor * 2);
        const alpha = (1 - fogFactor) * 0.6;
        
        // Animated movement
        const animX = x + Math.sin(time * 0.001 + i) * 20;
        const animY = y + Math.cos(time * 0.0015 + i) * 15;
        
        this.context.globalAlpha = alpha;
        this.context.fillStyle = '#ffffff';
        this.context.beginPath();
        this.context.arc(animX, animY, size, 0, Math.PI * 2);
        this.context.fill();
      }
    }

    this.context.restore();
  }

  /**
   * Apply heat shimmer effect for intense atmospheric conditions
   */
  applyHeatShimmer(intensity: number = 0.5, time: number = 0): void {
    if (intensity === 0) return;

    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const newImageData = this.context.createImageData(this.canvas.width, this.canvas.height);
    
    for (let y = 0; y < this.canvas.height; y++) {
      for (let x = 0; x < this.canvas.width; x++) {
        // Calculate distortion
        const distortionX = Math.sin(y * 0.02 + time * 0.005) * intensity * 2;
        const distortionY = Math.cos(x * 0.02 + time * 0.003) * intensity * 1;
        
        const sourceX = Math.max(0, Math.min(this.canvas.width - 1, x + distortionX));
        const sourceY = Math.max(0, Math.min(this.canvas.height - 1, y + distortionY));
        
        const sourceIndex = (Math.floor(sourceY) * this.canvas.width + Math.floor(sourceX)) * 4;
        const destIndex = (y * this.canvas.width + x) * 4;
        
        newImageData.data[destIndex] = imageData.data[sourceIndex];
        newImageData.data[destIndex + 1] = imageData.data[sourceIndex + 1];
        newImageData.data[destIndex + 2] = imageData.data[sourceIndex + 2];
        newImageData.data[destIndex + 3] = imageData.data[sourceIndex + 3];
      }
    }
    
    this.context.putImageData(newImageData, 0, 0);
  }

  /**
   * Update canvas size and reinitialize gradients
   */
  updateCanvasSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.blurCanvas.width = width;
    this.blurCanvas.height = height;
    this.initializeFogGradient();
  }

  /**
   * Update atmospheric configuration
   */
  updateConfig(newConfig: Partial<AtmosphericConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeFogGradient();
  }

  /**
   * Utility function to convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Parse color string to RGB values
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    // Simplified color parsing - in practice, you'd want a more robust parser
    if (color.startsWith('#')) {
      const rgb = this.hexToRgb(color);
      return rgb || { r: 135, g: 206, b: 235 };
    } else if (color.startsWith('rgba')) {
      const matches = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (matches) {
        return {
          r: parseInt(matches[1]),
          g: parseInt(matches[2]),
          b: parseInt(matches[3])
        };
      }
    }
    
    return { r: 135, g: 206, b: 235 }; // Default light blue
  }

  /**
   * Get visibility factor for an object at given distance
   */
  getVisibilityFactor(distance: number): number {
    return Math.max(0, 1 - this.calculateFogFactor(distance));
  }

  /**
   * Check if object should be rendered based on atmospheric conditions
   */
  shouldRenderObject(distance: number, minVisibility: number = 0.1): boolean {
    return this.getVisibilityFactor(distance) >= minVisibility;
  }
}

// Preset atmospheric configurations
export const ATMOSPHERIC_PRESETS = {
  CLEAR_DAY: {
    fogColor: 'rgba(200, 220, 255, 0.3)',
    fogDensity: 0.2,
    fogStart: 500,
    fogEnd: 1200,
    fogType: 'linear' as const,
    enableDepthBlur: false,
    blurIntensity: 1,
    enableColorShift: true,
    distantColor: '#b0c4de',
    atmosphericScattering: true,
    scatteringIntensity: 0.2
  },

  FOGGY_MORNING: {
    fogColor: 'rgba(220, 220, 235, 0.8)',
    fogDensity: 0.8,
    fogStart: 100,
    fogEnd: 400,
    fogType: 'exponential' as const,
    enableDepthBlur: true,
    blurIntensity: 4,
    enableColorShift: true,
    distantColor: '#d3d3d3',
    atmosphericScattering: false,
    scatteringIntensity: 0
  },

  DESERT_HEAT: {
    fogColor: 'rgba(255, 230, 200, 0.4)',
    fogDensity: 0.5,
    fogStart: 200,
    fogEnd: 800,
    fogType: 'exponential_squared' as const,
    enableDepthBlur: true,
    blurIntensity: 2,
    enableColorShift: true,
    distantColor: '#deb887',
    atmosphericScattering: true,
    scatteringIntensity: 0.4
  },

  STORMY_WEATHER: {
    fogColor: 'rgba(100, 100, 120, 0.9)',
    fogDensity: 0.9,
    fogStart: 50,
    fogEnd: 300,
    fogType: 'exponential' as const,
    enableDepthBlur: true,
    blurIntensity: 6,
    enableColorShift: true,
    distantColor: '#696969',
    atmosphericScattering: false,
    scatteringIntensity: 0
  }
};

// Example usage:
/*
const atmosphericSystem = new AtmosphericDepthSystem(canvas, ATMOSPHERIC_PRESETS.CLEAR_DAY);

// In your game loop:
function gameLoop(time: number) {
  // Clear canvas
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Render background objects first
  for (const bgObject of backgroundObjects) {
    if (atmosphericSystem.shouldRenderObject(bgObject.z)) {
      atmosphericSystem.applyAtmosphericEffects(bgObject, () => {
        // Your object rendering code here
        renderBackgroundObject(bgObject);
      });
    }
  }
  
  // Render atmospheric particles
  atmosphericSystem.renderAtmosphericParticles(cameraZ, time);
  
  // Render main game objects
  for (const gameObject of gameObjects) {
    atmosphericSystem.applyAtmosphericEffects(gameObject, () => {
      renderGameObject(gameObject);
    });
  }
  
  // Apply atmospheric scattering (if sun/light source exists)
  atmosphericSystem.applyAtmosphericScattering({ x: sunX, y: sunY });
  
  // Render fog overlay
  atmosphericSystem.renderFogOverlay();
  
  // Apply heat shimmer in desert levels
  if (currentLevel === 'desert') {
    atmosphericSystem.applyHeatShimmer(0.3, time);
  }
  
  requestAnimationFrame(gameLoop);
}

// Dynamic weather system
function changeWeather(weatherType: string) {
  switch (weatherType) {
    case 'fog':
      atmosphericSystem.updateConfig(ATMOSPHERIC_PRESETS.FOGGY_MORNING);
      break;
    case 'clear':
      atmosphericSystem.updateConfig(ATMOSPHERIC_PRESETS.CLEAR_DAY);
      break;
    case 'storm':
      atmosphericSystem.updateConfig(ATMOSPHERIC_PRESETS.STORMY_WEATHER);
      break;
  }
}
*/