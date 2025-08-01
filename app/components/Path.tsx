import { 
  transformPerspective, 
  createRacingPerspectiveConfig,
  calculatePerspectiveScale 
} from "../utils/perspective";
import { LODSystem } from "../utils/LODSystem";

interface PathProps {
  context: CanvasRenderingContext2D;
  canvasSize: { width: number; height: number };
  currentOffsetY: number;
  currentYLoop: number;
  nbColumns: number;
  tilesCoordinates: { x: number; y: number }[];
  frameTime?: number; // For LOD adaptive quality
}

interface TileCoordinate {
  x: number;
  y: number;
}

interface PathConfig {
  tileSpacing: number; // Height spacing between tiles as ratio of canvas height
  cullingMargin: number; // Margin for off-screen culling
  colors: {
    primary: string;
    secondary: string;
    border: string;
  };
  visualEffects: {
    enableGradient: boolean;
    enableBorder: boolean;
    alternatingPattern: boolean;
  };
}

// Path configuration constants
const PATH_CONFIG: PathConfig = {
  tileSpacing: 0.08, // Match Game.tsx spacing for better visibility
  cullingMargin: 300, // Increased significantly for LOD system
  colors: {
    primary: "#4f8df7", // Brighter blue
    secondary: "#2563eb", // Dark blue  
    border: "#1e40af", // Very dark blue
  },
  visualEffects: {
    enableGradient: true,
    enableBorder: true,
    alternatingPattern: true,
  },
};

// Global LOD system instance
const lodSystem = new LODSystem({
  nearDistance: 500,
  farDistance: 1200,
  adaptiveQuality: true,
  targetFrameTime: 16.67
});

/**
 * Validates path rendering parameters
 */
const validatePathParams = (props: PathProps): boolean => {
  const { canvasSize, nbColumns, tilesCoordinates } = props;
  
  if (!canvasSize || canvasSize.width <= 0 || canvasSize.height <= 0) {
    console.warn("Invalid canvas size for path rendering");
    return false;
  }
  
  if (nbColumns <= 0) {
    console.warn("Invalid number of columns for path");
    return false;
  }
  
  if (!Array.isArray(tilesCoordinates)) {
    console.warn("Invalid tiles coordinates array");
    return false;
  }
  
  return true;
};

/**
 * Checks if a tile is within the visible area (with culling margin)
 */
const isTileVisible = (lineY: number, height: number, margin: number = PATH_CONFIG.cullingMargin): boolean => {
  return lineY <= height + margin && lineY >= -margin;
};

/**
 * Calculates the screen Y position for a tile
 */
const calculateTileScreenY = (
  tileY: number,
  currentYLoop: number,
  currentOffsetY: number,
  canvasHeight: number
): number => {
  return canvasHeight - (tileY - currentYLoop) * PATH_CONFIG.tileSpacing * canvasHeight + currentOffsetY;
};

/**
 * Renders a single path tile with perspective, visual effects, and LOD optimization
 */
const renderTile = (
  context: CanvasRenderingContext2D,
  tile: TileCoordinate,
  tileIndex: number,
  spacingX: number,
  lineY: number,
  perspectivePointX: number,
  perspectivePointY: number,
  height: number
): void => {
  try {
    const { x } = tile;
    const tileHeight = PATH_CONFIG.tileSpacing * height;
    
    // Calculate perspective scale and distance for this tile
    const z = Math.max(0, height - lineY);
    const perspectiveScale = calculatePerspectiveScale(z, height * 0.8);
    const distance = z; // Use z as distance for LOD calculations
    
    // Get LOD parameters for this distance
    const renderParams = lodSystem.getTileRenderParams(distance);
    if (!renderParams.shouldRender) return;

    // Apply perspective transformation to tile corners with LOD simplification
    const simplification = renderParams.simplification;
    const [x1, y1] = transformPerspective(
      x * spacingX,
      lineY,
      perspectivePointX,
      perspectivePointY,
      height
    );
    const [x2, y2] = transformPerspective(
      (x + 1) * spacingX,
      lineY,
      perspectivePointX,
      perspectivePointY,
      height
    );
    const [x3, y3] = transformPerspective(
      (x + 1) * spacingX,
      lineY - tileHeight * simplification,
      perspectivePointX,
      perspectivePointY,
      height
    );
    const [x4, y4] = transformPerspective(
      x * spacingX,
      lineY - tileHeight * simplification,
      perspectivePointX,
      perspectivePointY,
      height
    );

    // Skip rendering if tile is too small or deformed
    const tileArea = Math.abs((x2 - x1) * (y1 - y4));
    if (tileArea < 1) return;

    context.save();
    
    // Apply LOD-based alpha for atmospheric fading
    context.globalAlpha = renderParams.alpha;
    
    // Create tile path
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineTo(x3, y3);
    context.lineTo(x4, y4);
    context.closePath();

    // Apply visual effects based on LOD configuration
    if (PATH_CONFIG.visualEffects.enableGradient && renderParams.lod.renderGradients) {
      // Create gradient effect for depth
      const gradient = context.createLinearGradient(x1, y1, x4, y4);
      const primaryColor = PATH_CONFIG.visualEffects.alternatingPattern && tileIndex % 2 === 0
        ? PATH_CONFIG.colors.secondary
        : PATH_CONFIG.colors.primary;
      
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(1, PATH_CONFIG.colors.secondary);
      context.fillStyle = gradient;
    } else {
      // Simple color fill for distant tiles
      const baseColor = PATH_CONFIG.visualEffects.alternatingPattern && tileIndex % 2 === 0
        ? PATH_CONFIG.colors.secondary
        : PATH_CONFIG.colors.primary;
      
      // Apply atmospheric fog effect for distant tiles
      if (distance > 800) {
        const fogAmount = Math.min((distance - 800) / 400, 0.6);
        context.fillStyle = `rgba(100, 120, 150, ${(1 - fogAmount) * renderParams.alpha})`;
      } else {
        context.fillStyle = baseColor;
      }
    }
    
    context.fill();

    // Add border if enabled by LOD and tile is large enough
    if (PATH_CONFIG.visualEffects.enableBorder && renderParams.lod.renderBorders && perspectiveScale > 0.05) {
      context.strokeStyle = PATH_CONFIG.colors.border;
      context.lineWidth = Math.max(0.3, perspectiveScale * 2 * simplification);
      context.globalAlpha = renderParams.alpha * 0.8;
      context.stroke();
    }

  } catch (error) {
    console.error("Error rendering tile:", error);
  } finally {
    context.restore();
  }
};

/**
 * Optimized path rendering with culling, error handling, and visual effects
 */
export default function Path({
  context,
  canvasSize,
  currentOffsetY,
  currentYLoop,
  nbColumns,
  tilesCoordinates,
  frameTime = 16.67
}: PathProps) {
  try {
    // Update LOD system with current frame performance
    lodSystem.update(16.67, frameTime);

    // Validate parameters
    if (!validatePathParams({ context, canvasSize, currentOffsetY, currentYLoop, nbColumns, tilesCoordinates })) {
      return null;
    }

    const { width, height } = canvasSize;
    
    // Prevent division by zero
    if (nbColumns === 0) {
      console.error("Cannot render path: nbColumns is zero");
      return null;
    }
    
    // Create perspective configuration
    const perspectiveConfig = createRacingPerspectiveConfig(width, height);
    const perspectivePointX = perspectiveConfig.vanishingPointX;
    const perspectivePointY = perspectiveConfig.vanishingPointY;
    const spacingX = width / nbColumns;

    // Track performance metrics in development
    let tilesRendered = 0;
    let tilesCulled = 0;
    let tilesLODCulled = 0;

    // Optimized rendering loop with early exit for off-screen tiles and LOD culling
    tilesCoordinates.forEach((tile, index) => {
      try {
        const lineY = calculateTileScreenY(tile.y, currentYLoop, currentOffsetY, height);
        
        // Early exit for off-screen tiles (culling optimization)
        if (!isTileVisible(lineY, height)) {
          tilesCulled++;
          return;
        }

        // Calculate distance for LOD culling
        const z = Math.max(0, height - lineY);
        if (!lodSystem.shouldRender(z)) {
          tilesLODCulled++;
          return;
        }

        // Validate tile coordinates
        if (tile.x < 0 || tile.x >= nbColumns) {
          console.warn(`Invalid tile x coordinate: ${tile.x}`);
          return;
        }

        // Render the tile with LOD optimizations
        renderTile(
          context,
          tile,
          index,
          spacingX,
          lineY,
          perspectivePointX,
          perspectivePointY,
          height
        );
        
        tilesRendered++;
        
      } catch (tileError) {
        console.error(`Error processing tile ${index}:`, tileError);
      }
    });

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development' && tilesRendered > 0) {
      const totalTiles = tilesRendered + tilesCulled + tilesLODCulled;
      const cullingEfficiency = ((tilesCulled + tilesLODCulled) / totalTiles) * 100;
      const lodStats = lodSystem.getStats();
      
      if (cullingEfficiency < 30 || frameTime > 20) {
        console.debug(`Path rendering - Tiles: ${tilesRendered}/${totalTiles}, Culling: ${cullingEfficiency.toFixed(1)}%, LOD Level: ${lodStats.currentQualityLevel}, Frame: ${frameTime.toFixed(2)}ms`);
      }
    }

  } catch (error) {
    console.error("Path rendering failed:", error);
  }

  return null;
}
