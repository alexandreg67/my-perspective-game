import { 
  transformPerspective, 
  scaleObjectSize, 
  createRacingPerspectiveConfig,
  calculatePerspectiveScale 
} from "../utils/perspective";

interface ShipProps {
  canvasContext: CanvasRenderingContext2D;
  canvasSize: { width: number; height: number };
  shipPosition: number;
  nbColumns: number;
  color?: string;
  z?: number; // Distance from viewer for perspective scaling
}

interface ShipConfig {
  bottomOffset: number;
  height: number;
  widthRatio: number; // Ratio of lane width to use
  colors: {
    body: string;
    highlight: string;
    shadow: string;
  };
}

// Ship configuration constants
const SHIP_CONFIG: ShipConfig = {
  bottomOffset: 10,
  height: 20,
  widthRatio: 0.5, // Use 50% of lane width
  colors: {
    body: "#2563eb", // Blue
    highlight: "#60a5fa", // Light blue
    shadow: "#1e40af", // Dark blue
  },
};

/**
 * Validates ship rendering parameters to ensure safe rendering
 */
const validateShipParams = (props: ShipProps): boolean => {
  const { canvasSize, shipPosition, nbColumns } = props;
  
  if (!canvasSize || canvasSize.width <= 0 || canvasSize.height <= 0) {
    console.warn("Invalid canvas size for ship rendering");
    return false;
  }
  
  if (shipPosition < 0 || shipPosition >= nbColumns) {
    console.warn("Ship position out of bounds");
    return false;
  }
  
  if (nbColumns <= 0) {
    console.warn("Invalid number of columns");
    return false;
  }
  
  return true;
};

/**
 * Clamps a coordinate value within canvas bounds
 */
const clampToCanvas = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Renders the ship with proper perspective, error handling, and safety checks
 */
export default function Ship({
  canvasContext,
  canvasSize,
  shipPosition,
  nbColumns,
  color = SHIP_CONFIG.colors.body,
  z = 0,
}: ShipProps) {
  try {
    // Validate parameters
    if (!validateShipParams({ canvasContext, canvasSize, shipPosition, nbColumns })) {
      return null;
    }

    const { width, height } = canvasSize;
    
    // Create perspective configuration
    const perspectiveConfig = createRacingPerspectiveConfig(width, height);
    const perspectivePointX = perspectiveConfig.vanishingPointX;
    const perspectivePointY = perspectiveConfig.vanishingPointY;
    
    // Prevent division by zero
    if (nbColumns === 0) {
      console.error("Cannot render ship: nbColumns is zero");
      return null;
    }
    
    const spacingX = width / nbColumns;
    
    // Calculate perspective scale for size adjustments
    const perspectiveScale = calculatePerspectiveScale(z, height * 0.8);
    const scaledHeight = scaleObjectSize(SHIP_CONFIG.height, z, height * 0.8);
    
    // Calculate ship boundaries with perspective scaling
    const shipBottomY = height - SHIP_CONFIG.bottomOffset;
    const shipTopY = shipBottomY - scaledHeight;
    const shipWidth = spacingX * SHIP_CONFIG.widthRatio * perspectiveScale;
    const shipCenterX = (shipPosition + 0.5) * spacingX;
    const shipLeftX = shipCenterX - shipWidth / 2;
    const shipRightX = shipCenterX + shipWidth / 2;

    // Apply perspective transformation with error handling
    let leftX1: number, bottomY1: number;
    let rightX1: number, bottomY2: number;
    let topX: number, topY: number;

    try {
      [leftX1, bottomY1] = transformPerspective(
        shipLeftX,
        shipBottomY,
        perspectivePointX,
        perspectivePointY,
        height
      );
      [rightX1, bottomY2] = transformPerspective(
        shipRightX,
        shipBottomY,
        perspectivePointX,
        perspectivePointY,
        height
      );
      [topX, topY] = transformPerspective(
        shipCenterX,
        shipTopY,
        perspectivePointX,
        perspectivePointY,
        height
      );
    } catch (error) {
      console.error("Error in perspective transformation:", error);
      return null;
    }

    // Clamp coordinates to canvas bounds to prevent rendering issues
    leftX1 = clampToCanvas(leftX1, -width, width * 2);
    rightX1 = clampToCanvas(rightX1, -width, width * 2);
    topX = clampToCanvas(topX, -width, width * 2);
    bottomY1 = clampToCanvas(bottomY1, -height, height * 2);
    bottomY2 = clampToCanvas(bottomY2, -height, height * 2);
    topY = clampToCanvas(topY, -height, height * 2);

    // Only render if ship is reasonably sized and positioned
    const shipArea = Math.abs((rightX1 - leftX1) * (bottomY1 - topY));
    if (shipArea < 4) { // Skip rendering if too small
      return null;
    }

    // Render ship body with gradient effect
    canvasContext.save();
    
    try {
      // Main ship body
      canvasContext.beginPath();
      canvasContext.moveTo(topX, topY);
      canvasContext.lineTo(leftX1, bottomY1);
      canvasContext.lineTo(rightX1, bottomY2);
      canvasContext.closePath();
      
      // Create gradient for depth effect
      const gradient = canvasContext.createLinearGradient(topX, topY, topX, bottomY1);
      gradient.addColorStop(0, SHIP_CONFIG.colors.highlight);
      gradient.addColorStop(0.6, color);
      gradient.addColorStop(1, SHIP_CONFIG.colors.shadow);
      
      canvasContext.fillStyle = gradient;
      canvasContext.fill();
      
      // Add outline for better visibility
      canvasContext.strokeStyle = SHIP_CONFIG.colors.shadow;
      canvasContext.lineWidth = Math.max(1, perspectiveScale * 2);
      canvasContext.stroke();
      
      // Add details if ship is large enough
      if (perspectiveScale > 0.3 && shipArea > 100) {
        drawShipDetails(canvasContext, topX, topY, leftX1, rightX1, bottomY1, bottomY2, perspectiveScale);
      }
      
    } catch (renderError) {
      console.error("Error rendering ship:", renderError);
    } finally {
      canvasContext.restore();
    }

  } catch (error) {
    console.error("Ship rendering failed:", error);
  }

  return null;
}

/**
 * Draws additional ship details when the ship is large enough
 */
const drawShipDetails = (
  ctx: CanvasRenderingContext2D,
  topX: number,
  topY: number,
  leftX: number,
  rightX: number,
  bottomY1: number,
  bottomY2: number,
  scale: number
): void => {
  try {
    ctx.save();
    
    // Center line
    ctx.strokeStyle = SHIP_CONFIG.colors.highlight;
    ctx.lineWidth = Math.max(0.5, scale);
    ctx.globalAlpha = 0.8;
    
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(topX, (bottomY1 + bottomY2) / 2);
    ctx.stroke();
    
    // Wing details (if ship is large enough)
    if (scale > 0.5) {
      const wingY = topY + (bottomY1 - topY) * 0.6;
      
      ctx.beginPath();
      ctx.moveTo(leftX + (topX - leftX) * 0.3, wingY);
      ctx.lineTo(leftX, bottomY1);
      ctx.moveTo(rightX - (rightX - topX) * 0.3, wingY);
      ctx.lineTo(rightX, bottomY2);
      ctx.stroke();
    }
    
  } catch (error) {
    console.error("Error drawing ship details:", error);
  } finally {
    ctx.restore();
  }
};
