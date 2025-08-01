import { 
  transformPerspective, 
  createRacingPerspectiveConfig,
  calculatePerspectiveScale 
} from "../utils/perspective";

interface TrackProps {
  context: CanvasRenderingContext2D;
  canvasSize: { width: number; height: number };
  nbColumns: number;
  showBackground?: boolean;
  showGridLines?: boolean;
  showCenterLine?: boolean;
  gameSpeed?: number;
  scrollOffset?: number;
}

interface ParallaxLayer {
  name: string;
  scrollSpeed: number;
  depth: number;
  opacity: number;
  color: string;
  pattern?: 'stars' | 'clouds' | 'mountains' | 'none';
}

interface TrackConfig {
  colors: {
    background: string;
    gridLines: string;
    centerLine: string;
    trackSurface: string;
    trackBorder: string;
  };
  lineWidths: {
    grid: number;
    center: number;
    border: number;
  };
  effects: {
    enableGradient: boolean;
    enableDashPattern: boolean;
    enablePerspectiveScaling: boolean;
  };
}

// Track configuration constants
const TRACK_CONFIG: TrackConfig = {
  colors: {
    background: "#001122", // Dark blue background
    gridLines: "#ffffff", // White grid lines
    centerLine: "#ffff00", // Yellow center line
    trackSurface: "#2d3748", // Gray track surface
    trackBorder: "#ffffff", // White track borders
  },
  lineWidths: {
    grid: 1,
    center: 2,
    border: 2,
  },
  effects: {
    enableGradient: true,
    enableDashPattern: true,
    enablePerspectiveScaling: true,
  },
};

// Parallax background layers configuration
const PARALLAX_LAYERS: ParallaxLayer[] = [
  {
    name: 'distant_stars',
    scrollSpeed: 0.05,
    depth: 1000,
    opacity: 0.4,
    color: '#ffffff',
    pattern: 'stars'
  },
  {
    name: 'nebula',
    scrollSpeed: 0.1,
    depth: 800,
    opacity: 0.3,
    color: '#4a5568',
    pattern: 'clouds'
  },
  {
    name: 'distant_mountains',
    scrollSpeed: 0.2,
    depth: 600,
    opacity: 0.6,
    color: '#2d3748',
    pattern: 'mountains'
  },
  {
    name: 'atmosphere',
    scrollSpeed: 0.4,
    depth: 400,
    opacity: 0.2,
    color: '#1a365d',
    pattern: 'none'
  }
];

/**
 * Validates track rendering parameters
 */
const validateTrackParams = (props: TrackProps): boolean => {
  const { canvasSize, nbColumns } = props;
  
  if (!canvasSize || canvasSize.width <= 0 || canvasSize.height <= 0) {
    console.warn("Invalid canvas size for track rendering");
    return false;
  }
  
  if (nbColumns <= 0) {
    console.warn("Invalid number of columns for track");
    return false;
  }
  
  return true;
};

/**
 * Renders parallax background layers for depth effect
 */
const drawParallaxBackground = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  gameSpeed: number = 1,
  scrollOffset: number = 0
): void => {
  try {
    // Draw base background first
    const baseGradient = context.createLinearGradient(0, 0, 0, height);
    baseGradient.addColorStop(0, "#000611"); // Deep space at top
    baseGradient.addColorStop(0.4, "#001122"); // Main background color
    baseGradient.addColorStop(1, "#002244"); // Slightly lighter at bottom
    
    context.fillStyle = baseGradient;
    context.fillRect(0, 0, width, height);

    // Render each parallax layer
    PARALLAX_LAYERS.forEach(layer => {
      drawParallaxLayer(context, layer, width, height, gameSpeed, scrollOffset);
    });
    
  } catch (error) {
    console.error("Error drawing parallax background:", error);
  }
};

/**
 * Draws a single parallax layer
 */
const drawParallaxLayer = (
  context: CanvasRenderingContext2D,
  layer: ParallaxLayer,
  width: number,
  height: number,
  gameSpeed: number,
  scrollOffset: number
): void => {
  try {
    context.save();
    context.globalAlpha = layer.opacity;
    
    const layerOffset = (scrollOffset * layer.scrollSpeed * gameSpeed) % height;
    
    switch (layer.pattern) {
      case 'stars':
        drawStarField(context, width, height, layerOffset, layer.color);
        break;
      case 'clouds':
        drawCloudLayer(context, width, height, layerOffset, layer.color);
        break;
      case 'mountains':
        drawMountainSilhouette(context, width, height, layerOffset, layer.color);
        break;
      default:
        // Simple color layer
        context.fillStyle = layer.color;
        context.fillRect(0, 0, width, height * 0.4);
        break;
    }
    
  } catch (error) {
    console.error(`Error drawing parallax layer ${layer.name}:`, error);
  } finally {
    context.restore();
  }
};

/**
 * Draws animated star field
 */
const drawStarField = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  offset: number,
  color: string
): void => {
  context.fillStyle = color;
  
  // Generate consistent star positions using simple hash
  for (let i = 0; i < 100; i++) {
    const seed = i * 73856093;
    const x = (seed % width);
    const y = ((seed * 19349663) % (height * 2) + offset) % (height * 2);
    
    if (y < height && y > 0) {
      const size = ((seed * 83492791) % 3) + 1;
      const brightness = 0.3 + ((seed * 39916801) % 70) / 100;
      
      context.globalAlpha *= brightness;
      context.fillRect(x, y, size, size);
      context.globalAlpha /= brightness;
    }
  }
};

/**
 * Draws scrolling cloud layer
 */
const drawCloudLayer = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  offset: number,
  color: string
): void => {
  context.fillStyle = color;
  
  // Draw soft cloud shapes
  for (let i = 0; i < 20; i++) {
    const seed = i * 127773;
    const x = (seed % (width + 200)) - 100;
    const y = ((seed * 16777619) % (height * 3) + offset) % (height * 3);
    
    if (y < height * 0.6 && y > -50) {
      const cloudWidth = 80 + ((seed * 2147483647) % 60);
      const cloudHeight = 20 + ((seed * 1103515245) % 30);
      
      context.beginPath();
      context.ellipse(x, y, cloudWidth, cloudHeight, 0, 0, Math.PI * 2);
      context.fill();
    }
  }
};

/**
 * Draws distant mountain silhouettes
 */
const drawMountainSilhouette = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  offset: number,
  color: string
): void => {
  context.fillStyle = color;
  
  // Draw mountain peaks
  const peakCount = 8;
  const baseY = height * 0.4;
  
  context.beginPath();
  context.moveTo(0, baseY);
  
  for (let i = 0; i <= peakCount; i++) {
    const x = (i / peakCount) * width;
    const peakHeight = 40 + Math.sin(i * 0.7 + offset * 0.01) * 30;
    const y = baseY - peakHeight;
    
    if (i === 0) {
      context.lineTo(x, y);
    } else {
      const prevX = ((i - 1) / peakCount) * width;
      const midX = (prevX + x) / 2;
      context.quadraticCurveTo(prevX, baseY - 10, midX, y);
      context.quadraticCurveTo(midX, y, x, y);
    }
  }
  
  context.lineTo(width, baseY);
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  context.fill();
};

/**
 * Draws the track background with perspective gradient (legacy for compatibility)
 */
const drawTrackBackground = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  // This function is now replaced by drawParallaxBackground but kept for compatibility
  drawParallaxBackground(context, width, height, 1, 0);
};

/**
 * Draws the main track surface
 */
const drawTrackSurface = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  perspectivePointX: number,
  perspectivePointY: number
): void => {
  try {
    context.save();
    
    // Calculate track boundaries with perspective
    const trackWidth = width * 0.8; // Track takes 80% of canvas width
    const leftBoundary = (width - trackWidth) / 2;
    const rightBoundary = width - leftBoundary;
    
    // Transform track boundaries with perspective
    const [leftFar, topY] = transformPerspective(
      leftBoundary,
      0,
      perspectivePointX,
      perspectivePointY,
      height
    );
    const [rightFar] = transformPerspective(
      rightBoundary,
      0,
      perspectivePointX,
      perspectivePointY,
      height
    );
    const [leftNear, bottomY] = transformPerspective(
      leftBoundary,
      height,
      perspectivePointX,
      perspectivePointY,
      height
    );
    const [rightNear] = transformPerspective(
      rightBoundary,
      height,
      perspectivePointX,
      perspectivePointY,
      height
    );
    
    // Draw track surface
    context.beginPath();
    context.moveTo(leftFar, topY);
    context.lineTo(rightFar, topY);
    context.lineTo(rightNear, bottomY);
    context.lineTo(leftNear, bottomY);
    context.closePath();
    
    if (TRACK_CONFIG.effects.enableGradient) {
      const gradient = context.createLinearGradient(0, topY, 0, bottomY);
      gradient.addColorStop(0, "#4a5568"); // Lighter at distance
      gradient.addColorStop(1, TRACK_CONFIG.colors.trackSurface);
      context.fillStyle = gradient;
    } else {
      context.fillStyle = TRACK_CONFIG.colors.trackSurface;
    }
    
    context.fill();
    
  } catch (error) {
    console.error("Error drawing track surface:", error);
  } finally {
    context.restore();
  }
};

/**
 * Draws grid lines with perspective scaling
 */
const drawGridLines = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  nbColumns: number,
  perspectivePointX: number,
  perspectivePointY: number
): void => {
  try {
    context.save();
    context.strokeStyle = TRACK_CONFIG.colors.gridLines;
    
    const spacingX = width / nbColumns;
    
    // Draw vertical grid lines
    for (let i = 0; i <= nbColumns; i++) {
      const lineX = i * spacingX;
      
      // Calculate perspective scale for line width
      const scale = TRACK_CONFIG.effects.enablePerspectiveScaling 
        ? calculatePerspectiveScale(height * 0.5, height * 0.8)
        : 1;
      
      context.lineWidth = TRACK_CONFIG.lineWidths.grid * scale;
      
      try {
        const [x1, y1] = transformPerspective(
          lineX,
          height,
          perspectivePointX,
          perspectivePointY,
          height
        );
        const [x2, y2] = transformPerspective(
          lineX,
          0,
          perspectivePointX,
          perspectivePointY,
          height
        );
        
        // Only draw lines that are within reasonable bounds
        if (Math.abs(x1 - x2) < width && Math.abs(y1 - y2) < height * 2) {
          context.beginPath();
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          context.stroke();
        }
        
      } catch (transformError) {
        console.warn(`Error transforming grid line ${i}:`, transformError);
      }
    }
    
  } catch (error) {
    console.error("Error drawing grid lines:", error);
  } finally {
    context.restore();
  }
};

/**
 * Draws center line with dashed pattern
 */
const drawCenterLine = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  perspectivePointX: number,
  perspectivePointY: number
): void => {
  try {
    context.save();
    context.strokeStyle = TRACK_CONFIG.colors.centerLine;
    context.lineWidth = TRACK_CONFIG.lineWidths.center;
    
    if (TRACK_CONFIG.effects.enableDashPattern) {
      context.setLineDash([10, 10]); // Dashed pattern
    }
    
    // Draw center line
    const centerX = width / 2;
    
    try {
      const [x1, y1] = transformPerspective(
        centerX,
        height,
        perspectivePointX,
        perspectivePointY,
        height
      );
      const [x2, y2] = transformPerspective(
        centerX,
        0,
        perspectivePointX,
        perspectivePointY,
        height
      );
      
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
      
    } catch (transformError) {
      console.error("Error transforming center line:", transformError);
    }
    
  } catch (error) {
    console.error("Error drawing center line:", error);
  } finally {
    context.restore();
  }
};

/**
 * Renders a complete track with background, surface, grid lines, and center line
 */
export default function Track({ 
  context, 
  canvasSize, 
  nbColumns,
  showBackground = true,
  showGridLines = true,
  showCenterLine = true,
  gameSpeed = 1,
  scrollOffset = 0
}: TrackProps) {
  try {
    // Validate parameters
    if (!validateTrackParams({ context, canvasSize, nbColumns })) {
      return null;
    }

    const { width, height } = canvasSize;
    
    // Prevent division by zero
    if (nbColumns === 0) {
      console.error("Cannot render track: nbColumns is zero");
      return null;
    }
    
    // Create perspective configuration
    const perspectiveConfig = createRacingPerspectiveConfig(width, height);
    const perspectivePointX = perspectiveConfig.vanishingPointX;
    const perspectivePointY = perspectiveConfig.vanishingPointY;

    // Draw track layers in order (background to foreground)
    if (showBackground) {
      drawParallaxBackground(context, width, height, gameSpeed, scrollOffset);
    }
    
    // Draw track surface
    drawTrackSurface(context, width, height, perspectivePointX, perspectivePointY);
    
    // Draw grid lines
    if (showGridLines) {
      drawGridLines(context, width, height, nbColumns, perspectivePointX, perspectivePointY);
    }
    
    // Draw center line
    if (showCenterLine) {
      drawCenterLine(context, width, height, perspectivePointX, perspectivePointY);
    }

  } catch (error) {
    console.error("Track rendering failed:", error);
  }

  return null;
}
