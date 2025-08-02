/**
 * Perspective transformation utilities for 3D-like effects in 2D canvas
 * Implements mathematically correct perspective projection
 */

export interface PerspectiveConfig {
  viewerDistance: number;  // Distance from viewer to projection plane
  vanishingPointX: number; // X coordinate of vanishing point
  vanishingPointY: number; // Y coordinate of vanishing point
  fieldOfView: number;     // Field of view in radians
}

export interface Point3D {
  x: number;
  y: number;
  z: number; // Distance from viewer (positive = away from viewer)
}

export interface Point2D {
  x: number;
  y: number;
  scale: number; // Scaling factor for size adjustments
}

// Performance cache for expensive calculations
const scaleCache = new Map<string, number>();
const pointCache = new Map<string, [number, number]>();
let cacheSize = 0;
const MAX_CACHE_SIZE = 1000;

// Clear cache when it gets too large
const clearCacheIfNeeded = () => {
  if (cacheSize > MAX_CACHE_SIZE) {
    scaleCache.clear();
    pointCache.clear();
    cacheSize = 0;
  }
};

/**
 * Mathematically correct perspective scaling based on distance
 * Uses the formula: scale = viewerDistance / (viewerDistance + z)
 * This prevents division by zero and provides proper hyperbolic scaling
 */
export const calculatePerspectiveScale = (z: number, viewerDistance: number = 400): number => {
  const cacheKey = `${z}_${viewerDistance}`;
  
  if (scaleCache.has(cacheKey)) {
    return scaleCache.get(cacheKey)!;
  }

  // Ensure z is non-negative and add small epsilon to prevent division issues
  const safeZ = z >= 0 ? z : 0;
  const epsilon = 0.001;
  
  // Perspective formula: scale = f / (f + z) where f is focal length
  const scale = viewerDistance / (viewerDistance + safeZ + epsilon);
  
  // Clamp scale to reasonable bounds
  const clampedScale = Math.max(0.001, Math.min(10, scale));
  
  // Cache the result
  scaleCache.set(cacheKey, clampedScale);
  cacheSize++;
  clearCacheIfNeeded();
  
  return clampedScale;
};

/**
 * Legacy function for backward compatibility - improved version
 * Now uses proper perspective mathematics instead of cubic scaling
 */
export const transformPerspective = (
  x: number,
  y: number,
  perspectivePointX: number,
  perspectivePointY: number,
  height: number
): [number, number] => {
  const cacheKey = `${x}_${y}_${perspectivePointX}_${perspectivePointY}_${height}`;
  
  if (pointCache.has(cacheKey)) {
    return pointCache.get(cacheKey)!;
  }

  // Convert y position to depth (z) - objects lower on screen are closer
  const normalizedY = Math.max(0, Math.min(1, y / height));
  const z = (1 - normalizedY) * height; // Invert so bottom of screen = z=0
  
  // Calculate perspective scale using proper mathematics
  const scale = calculatePerspectiveScale(z, height * 0.8);
  
  // Apply perspective transformation
  const diffX = x - perspectivePointX;
  const offsetX = diffX * scale;
  const trX = perspectivePointX + offsetX;
  const trY = perspectivePointY + scale * (height - perspectivePointY);
  
  const result: [number, number] = [trX, trY];
  
  // Cache the result
  pointCache.set(cacheKey, result);
  cacheSize++;
  clearCacheIfNeeded();
  
  return result;
};

/**
 * Transform a 3D point to 2D screen coordinates with perspective
 * Implements proper perspective projection mathematics
 */
export const project3DTo2D = (
  point3D: Point3D,
  config: PerspectiveConfig
): Point2D => {
  const scale = calculatePerspectiveScale(point3D.z, config.viewerDistance);
  
  // Perspective projection formulas
  const projectedX = config.vanishingPointX + (point3D.x * scale);
  const projectedY = config.vanishingPointY + (point3D.y * scale);
  
  return {
    x: projectedX,
    y: projectedY,
    scale: scale
  };
};

/**
 * Calculate the Y position for a track segment based on distance
 * Provides consistent depth perception
 */
export const calculateSegmentY = (
  segmentIndex: number,
  totalSegments: number,
  startY: number,
  endY: number,
  viewerDistance: number = 400
): number => {
  const progress = segmentIndex / (totalSegments - 1);
  
  // Use perspective-correct interpolation
  const z = progress * viewerDistance;
  const scale = calculatePerspectiveScale(z, viewerDistance);
  
  // Interpolate Y position with perspective correction
  return startY + (endY - startY) * (1 - scale);
};

/**
 * Generate track lane positions with proper perspective
 */
export const generateTrackLane = (
  segmentIndex: number,
  totalSegments: number,
  baseWidth: number,
  laneOffset: number,
  vanishingPointX: number,
  viewerDistance: number = 400
): { leftX: number; rightX: number; scale: number } => {
  const progress = segmentIndex / (totalSegments - 1);
  const z = progress * viewerDistance * 2; // Multiply by 2 for more dramatic perspective
  
  const scale = calculatePerspectiveScale(z, viewerDistance);
  const scaledWidth = baseWidth * scale;
  const scaledOffset = laneOffset * scale;
  
  return {
    leftX: vanishingPointX - scaledWidth / 2 + scaledOffset,
    rightX: vanishingPointX + scaledWidth / 2 + scaledOffset,
    scale: scale
  };
};

/**
 * Apply perspective to object size (for sprites, ships, etc.)
 */
export const scaleObjectSize = (originalSize: number, z: number, viewerDistance: number = 400): number => {
  const scale = calculatePerspectiveScale(z, viewerDistance);
  return Math.max(1, originalSize * scale); // Ensure minimum size of 1 pixel
};

/**
 * Check if a point is within the viewing frustum
 */
export const isInViewingFrustum = (
  point3D: Point3D,
  config: PerspectiveConfig
): boolean => {
  const projected = project3DTo2D(point3D, config);
  const fovScale = Math.tan(config.fieldOfView / 2);
  const maxX = config.vanishingPointX + (config.viewerDistance * fovScale);
  const minX = config.vanishingPointX - (config.viewerDistance * fovScale);
  
  return projected.x >= minX && projected.x <= maxX && point3D.z >= 0;
};

/**
 * Create a standard perspective configuration for racing games
 */
export const createRacingPerspectiveConfig = (screenWidth: number, screenHeight: number): PerspectiveConfig => {
  return {
    viewerDistance: screenHeight * 1.5, // Increased for more dramatic perspective
    vanishingPointX: screenWidth / 2,
    vanishingPointY: screenHeight * 0.2, // Lower vanishing point for better track visibility
    fieldOfView: Math.PI / 2 // Wider field of view
  };
}

/**
 * Clear all caches - call when perspective configuration changes
 */
export const clearPerspectiveCache = (): void => {
  scaleCache.clear();
  pointCache.clear();
  cacheSize = 0;
};
