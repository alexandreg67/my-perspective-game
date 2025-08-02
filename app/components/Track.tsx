import { 
  transformPerspective, 
  createRacingPerspectiveConfig
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
    roadside: string;
  };
  spacing: {
    gridLineSpacing: number;
    centerLineSpacing: number;
  };
}

// Track configuration constants
const TRACK_CONFIG: TrackConfig = {
  colors: {
    background: "#1a202c", // Dark blue-gray
    gridLines: "rgba(255, 255, 255, 0.1)",
    centerLine: "rgba(255, 255, 255, 0.7)",
    roadside: "#2d3748", // Slightly lighter gray
  },
  spacing: {
    gridLineSpacing: 40, // pixels between grid lines
    centerLineSpacing: 80, // pixels between center line segments
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
 * Renders a parallax background for depth perception
 */
const renderBackground = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  try {
    // Sky gradient
    const skyGradient = context.createLinearGradient(0, 0, 0, height * 0.6);
    skyGradient.addColorStop(0, "#0c1445"); // Dark blue
    skyGradient.addColorStop(1, "#1a202c"); // Dark gray
    
    context.fillStyle = skyGradient;
    context.fillRect(0, 0, width, height * 0.6);
    
    // Ground
    context.fillStyle = TRACK_CONFIG.colors.background;
    context.fillRect(0, height * 0.6, width, height * 0.4);
    
    // Distant mountains/hills for depth
    context.fillStyle = "rgba(30, 30, 50, 0.7)";
    for (let i = 0; i < 5; i++) {
      const x = (i * width * 0.3) % (width * 1.5);
      const y = height * 0.55;
      const mountainWidth = width * 0.2;
      const mountainHeight = height * 0.1;
      
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + mountainWidth / 2, y - mountainHeight);
      context.lineTo(x + mountainWidth, y);
      context.closePath();
      context.fill();
    }
  } catch (error) {
    console.error("Error rendering background:", error);
  }
};

/**
 * Renders grid lines for depth perception
 */
const renderGridLines = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  perspectivePointY: number
): void => {
  try {
    context.strokeStyle = TRACK_CONFIG.colors.gridLines;
    context.lineWidth = 1;
    
    // Calculate how many lines to draw based on canvas height
    const linesToDraw = Math.ceil(height / TRACK_CONFIG.spacing.gridLineSpacing) + 2;
    
    for (let i = 0; i < linesToDraw; i++) {
      // Calculate Y position with perspective
      const lineY = height - (i * TRACK_CONFIG.spacing.gridLineSpacing);
      
      // Skip lines above the horizon
      if (lineY < perspectivePointY) continue;
      
      // Apply perspective transformation to line endpoints
      const [x1, y1] = transformPerspective(0, lineY, width / 2, perspectivePointY, height);
      const [x2, y2] = transformPerspective(width, lineY, width / 2, perspectivePointY, height);
      
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
    }
  } catch (error) {
    console.error("Error rendering grid lines:", error);
  }
};

/**
 * Renders the center line for the track
 */
const renderCenterLine = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  perspectivePointY: number
): void => {
  try {
    context.strokeStyle = TRACK_CONFIG.colors.centerLine;
    context.lineWidth = 2;
    context.setLineDash([20, 20]); // Dashed line
    
    // Calculate how many segments to draw
    const segmentsToDraw = Math.ceil(height / TRACK_CONFIG.spacing.centerLineSpacing) + 2;
    
    for (let i = 0; i < segmentsToDraw; i++) {
      // Calculate Y position with perspective and scrolling
      const lineY = height - (i * TRACK_CONFIG.spacing.centerLineSpacing);
      
      // Skip segments above the horizon
      if (lineY < perspectivePointY) continue;
      
      // Apply perspective transformation to line endpoints
      const [x1, y1] = transformPerspective(width * 0.4, lineY, width / 2, perspectivePointY, height);
      const [x2, y2] = transformPerspective(width * 0.6, lineY, width / 2, perspectivePointY, height);
      
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
    }
    
    context.setLineDash([]); // Reset line dash
  } catch (error) {
    console.error("Error rendering center line:", error);
  }
};

/**
 * Renders roadside elements for visual interest
 */
const renderRoadside = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  perspectivePointY: number
): void => {
  try {
    context.fillStyle = TRACK_CONFIG.colors.roadside;
    
    // Left roadside
    context.beginPath();
    const [leftX1, leftY1] = transformPerspective(0, height, width / 2, perspectivePointY, height);
    const [leftX2, leftY2] = transformPerspective(0, perspectivePointY, width / 2, perspectivePointY, height);
    const [leftX3, leftY3] = transformPerspective(width * 0.1, perspectivePointY, width / 2, perspectivePointY, height);
    const [leftX4, leftY4] = transformPerspective(width * 0.1, height, width / 2, perspectivePointY, height);
    
    context.moveTo(leftX1, leftY1);
    context.lineTo(leftX2, leftY2);
    context.lineTo(leftX3, leftY3);
    context.lineTo(leftX4, leftY4);
    context.closePath();
    context.fill();
    
    // Right roadside
    context.beginPath();
    const [rightX1, rightY1] = transformPerspective(width, height, width / 2, perspectivePointY, height);
    const [rightX2, rightY2] = transformPerspective(width, perspectivePointY, width / 2, perspectivePointY, height);
    const [rightX3, rightY3] = transformPerspective(width * 0.9, perspectivePointY, width / 2, perspectivePointY, height);
    const [rightX4, rightY4] = transformPerspective(width * 0.9, height, width / 2, perspectivePointY, height);
    
    context.moveTo(rightX1, rightY1);
    context.lineTo(rightX2, rightY2);
    context.lineTo(rightX3, rightY3);
    context.lineTo(rightX4, rightY4);
    context.closePath();
    context.fill();
  } catch (error) {
    console.error("Error rendering roadside:", error);
  }
};

/**
 * Optimized track rendering with parallax background and visual enhancements
 */
export default function Track({
  context,
  canvasSize,
  nbColumns,
  showBackground = true,
  showGridLines = true,
  showCenterLine = true,
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
    
    // Create perspective configuration with enhanced depth
    const perspectiveConfig = createRacingPerspectiveConfig(width, height);
    const perspectivePointY = perspectiveConfig.vanishingPointY;

    // Clear canvas with background color
    context.fillStyle = TRACK_CONFIG.colors.background;
    context.fillRect(0, 0, width, height);

    // Render parallax background for depth perception
    if (showBackground) {
      renderBackground(context, width, height);
    }

    // Render roadside elements
    renderRoadside(context, width, height, perspectivePointY);

    // Render grid lines for depth perception
    if (showGridLines) {
      renderGridLines(context, width, height, perspectivePointY);
    }

    // Render center line
    if (showCenterLine) {
      renderCenterLine(context, width, height, perspectivePointY);
    }

  } catch (error) {
    console.error("Track rendering failed:", error);
  }

  return null;
}