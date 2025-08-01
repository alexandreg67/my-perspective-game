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
 * Draws the track background with perspective gradient
 */
const drawTrackBackground = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  try {
    if (!TRACK_CONFIG.effects.enableGradient) {
      context.fillStyle = TRACK_CONFIG.colors.background;
      context.fillRect(0, 0, width, height);
      return;
    }

    // Create gradient from horizon to bottom
    const gradient = context.createLinearGradient(0, height * 0.2, 0, height);
    gradient.addColorStop(0, "#000814"); // Very dark blue at horizon
    gradient.addColorStop(0.5, TRACK_CONFIG.colors.background);
    gradient.addColorStop(1, "#003366"); // Slightly lighter at bottom
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    
  } catch (error) {
    console.error("Error drawing track background:", error);
  }
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
  showCenterLine = true
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
      drawTrackBackground(context, width, height);
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
