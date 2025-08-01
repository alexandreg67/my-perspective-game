/**
 * Collision Detection System - Handles all collision logic for the racing game
 * Provides efficient collision detection with configurable parameters
 */

export interface TileCoordinate {
  x: number;
  y: number;
}

export interface CollisionConfig {
  shipTolerance: number; // How close to tile center counts as collision
  lookAheadDistance: number; // How far ahead to check for collisions
  collisionMargin: number; // Extra margin for collision detection
  enablePredictiveCollision: boolean; // Check future positions
}

export interface CollisionResult {
  hasCollision: boolean;
  collisionType: 'none' | 'off-track' | 'obstacle' | 'boundary';
  distance: number; // Distance to collision point
  position: { x: number; y: number }; // Position of collision
  severity: 'none' | 'minor' | 'major' | 'fatal';
}

export interface GameBoundaries {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Default collision configuration
const DEFAULT_CONFIG: CollisionConfig = {
  shipTolerance: 0.4, // Allow ship to be 40% off-center
  lookAheadDistance: 2, // Check 2 tiles ahead
  collisionMargin: 0.1, // 10% margin for collision detection
  enablePredictiveCollision: true,
};

export class CollisionDetector {
  private config: CollisionConfig;
  private boundaries: GameBoundaries;

  constructor(config: Partial<CollisionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.boundaries = {
      minX: 0,
      maxX: 7, // Default 7 columns
      minY: 0,
      maxY: Number.MAX_SAFE_INTEGER,
    };
  }

  /**
   * Update game boundaries
   */
  setBoundaries(boundaries: Partial<GameBoundaries>): void {
    this.boundaries = { ...this.boundaries, ...boundaries };
  }

  /**
   * Check collision between ship and path tiles
   */
  checkPathCollision(
    shipPosition: number,
    shipY: number,
    pathTiles: TileCoordinate[],
    currentYLoop: number
  ): CollisionResult {
    try {
      // Find tiles at current ship position
      const currentTiles = this.getTilesAtPosition(pathTiles, currentYLoop, shipY);
      
      if (currentTiles.length === 0) {
        // Check if this might be a temporary condition during tile generation
        // Look for tiles in nearby Y positions to determine if this is just a gap
        const nearbyTiles = pathTiles.filter(tile => 
          Math.abs(tile.y - (currentYLoop + shipY)) <= 2
        );
        
        if (nearbyTiles.length === 0) {
          // No tiles at all - check if this is game startup or actual off-track
          const totalTileCount = pathTiles.length;
          
          if (totalTileCount < 5) {
            // Likely game startup - be more forgiving
            return {
              hasCollision: true,
              collisionType: 'off-track',
              distance: 0,
              position: { x: shipPosition, y: shipY },
              severity: 'minor', // Allow recovery during startup
            };
          } else {
            // Game is running normally - ship is seriously off track
            return {
              hasCollision: true,
              collisionType: 'off-track',
              distance: 0,
              position: { x: shipPosition, y: shipY },
              severity: 'major', // Lose a life for being completely off track
            };
          }
        } else {
          // There are tiles nearby, this is just a gap - no collision yet
          return {
            hasCollision: false,
            collisionType: 'none',
            distance: 0,
            position: { x: shipPosition, y: shipY },
            severity: 'none',
          };
        }
      }

      // Check if ship is on any valid tile
      const validTile = this.findValidTile(currentTiles, shipPosition);
      
      if (!validTile) {
        // No valid tile found - ship is off track
        const nearestTile = this.findNearestTile(currentTiles, shipPosition);
        const distance = nearestTile ? Math.abs(nearestTile.x - shipPosition) : Infinity;
        
        return {
          hasCollision: true,
          collisionType: 'off-track',
          distance,
          position: nearestTile ? { x: nearestTile.x, y: nearestTile.y } : { x: shipPosition, y: shipY },
          severity: this.calculateSeverity(distance),
        };
      }

      // Check predictive collision if enabled
      if (this.config.enablePredictiveCollision) {
        const predictiveResult = this.checkPredictiveCollision(
          shipPosition,
          shipY,
          pathTiles,
          currentYLoop
        );
        
        if (predictiveResult.hasCollision) {
          return predictiveResult;
        }
      }

      // No collision detected
      return {
        hasCollision: false,
        collisionType: 'none',
        distance: 0,
        position: { x: shipPosition, y: shipY },
        severity: 'none',
      };

    } catch (error) {
      console.error('Error in collision detection:', error);
      return {
        hasCollision: false,
        collisionType: 'none',
        distance: 0,
        position: { x: shipPosition, y: shipY },
        severity: 'none',
      };
    }
  }

  /**
   * Check collision with game boundaries
   */
  checkBoundaryCollision(shipPosition: number, shipY: number): CollisionResult {
    try {
      // Check horizontal boundaries
      if (shipPosition < this.boundaries.minX || shipPosition >= this.boundaries.maxX) {
        return {
          hasCollision: true,
          collisionType: 'boundary',
          distance: Math.min(
            Math.abs(shipPosition - this.boundaries.minX),
            Math.abs(shipPosition - this.boundaries.maxX)
          ),
          position: { x: shipPosition, y: shipY },
          severity: 'major',
        };
      }

      // Check vertical boundaries
      if (shipY < this.boundaries.minY || shipY > this.boundaries.maxY) {
        return {
          hasCollision: true,
          collisionType: 'boundary',
          distance: Math.min(
            Math.abs(shipY - this.boundaries.minY),
            Math.abs(shipY - this.boundaries.maxY)
          ),
          position: { x: shipPosition, y: shipY },
          severity: 'major',
        };
      }

      return {
        hasCollision: false,
        collisionType: 'none',
        distance: 0,
        position: { x: shipPosition, y: shipY },
        severity: 'none',
      };

    } catch (error) {
      console.error('Error checking boundary collision:', error);
      return {
        hasCollision: false,
        collisionType: 'none',
        distance: 0,
        position: { x: shipPosition, y: shipY },
        severity: 'none',
      };
    }
  }

  /**
   * Get comprehensive collision result combining all checks
   */
  checkAllCollisions(
    shipPosition: number,
    shipY: number,
    pathTiles: TileCoordinate[],
    currentYLoop: number
  ): CollisionResult {
    try {
      // Check boundary collision first (most critical)
      const boundaryResult = this.checkBoundaryCollision(shipPosition, shipY);
      if (boundaryResult.hasCollision) {
        return boundaryResult;
      }

      // Check path collision
      const pathResult = this.checkPathCollision(shipPosition, shipY, pathTiles, currentYLoop);
      if (pathResult.hasCollision) {
        return pathResult;
      }

      // No collisions detected
      return {
        hasCollision: false,
        collisionType: 'none',
        distance: 0,
        position: { x: shipPosition, y: shipY },
        severity: 'none',
      };

    } catch (error) {
      console.error('Error in comprehensive collision check:', error);
      return {
        hasCollision: false,
        collisionType: 'none',
        distance: 0,
        position: { x: shipPosition, y: shipY },
        severity: 'none',
      };
    }
  }

  /**
   * Get tiles at a specific Y position (considering game loop)
   */
  private getTilesAtPosition(
    pathTiles: TileCoordinate[],
    currentYLoop: number,
    shipY: number
  ): TileCoordinate[] {
    const targetY = Math.floor(currentYLoop + shipY);
    return pathTiles.filter(tile => Math.abs(tile.y - targetY) < 1);
  }

  /**
   * Find a valid tile for the ship position
   */
  private findValidTile(tiles: TileCoordinate[], shipPosition: number): TileCoordinate | null {
    for (const tile of tiles) {
      const distance = Math.abs(tile.x - shipPosition);
      if (distance <= this.config.shipTolerance) {
        return tile;
      }
    }
    return null;
  }

  /**
   * Find the nearest tile to the ship position
   */
  private findNearestTile(tiles: TileCoordinate[], shipPosition: number): TileCoordinate | null {
    if (tiles.length === 0) return null;

    let nearestTile = tiles[0];
    let minDistance = Math.abs(nearestTile.x - shipPosition);

    for (let i = 1; i < tiles.length; i++) {
      const distance = Math.abs(tiles[i].x - shipPosition);
      if (distance < minDistance) {
        minDistance = distance;
        nearestTile = tiles[i];
      }
    }

    return nearestTile;
  }

  /**
   * Check for upcoming collisions based on ship trajectory
   */
  private checkPredictiveCollision(
    shipPosition: number,
    shipY: number,
    pathTiles: TileCoordinate[],
    currentYLoop: number
  ): CollisionResult {
    try {
      // Look ahead for potential collisions
      for (let ahead = 1; ahead <= this.config.lookAheadDistance; ahead++) {
        const futureY = shipY + ahead;
        const futureTiles = this.getTilesAtPosition(pathTiles, currentYLoop, futureY);
        
        if (futureTiles.length === 0) {
          return {
            hasCollision: true,
            collisionType: 'off-track',
            distance: ahead,
            position: { x: shipPosition, y: futureY },
            severity: 'minor', // Future collision is less severe
          };
        }

        const validTile = this.findValidTile(futureTiles, shipPosition);
        if (!validTile) {
          const nearestTile = this.findNearestTile(futureTiles, shipPosition);
          const distance = nearestTile ? Math.abs(nearestTile.x - shipPosition) : Infinity;
          
          return {
            hasCollision: true,
            collisionType: 'off-track',
            distance: ahead + distance,
            position: nearestTile ? { x: nearestTile.x, y: nearestTile.y } : { x: shipPosition, y: futureY },
            severity: 'minor',
          };
        }
      }

      // No predictive collision found
      return {
        hasCollision: false,
        collisionType: 'none',
        distance: 0,
        position: { x: shipPosition, y: shipY },
        severity: 'none',
      };

    } catch (error) {
      console.error('Error in predictive collision check:', error);
      return {
        hasCollision: false,
        collisionType: 'none',
        distance: 0,
        position: { x: shipPosition, y: shipY },
        severity: 'none',
      };
    }
  }

  /**
   * Calculate collision severity based on distance
   */
  private calculateSeverity(distance: number): 'none' | 'minor' | 'major' | 'fatal' {
    if (distance === 0) return 'fatal';
    if (distance <= 0.2) return 'major';
    if (distance <= 0.5) return 'minor';
    return 'none';
  }

  /**
   * Check if ship is safely on track
   */
  isOnTrack(
    shipPosition: number,
    shipY: number,
    pathTiles: TileCoordinate[],
    currentYLoop: number
  ): boolean {
    const result = this.checkPathCollision(shipPosition, shipY, pathTiles, currentYLoop);
    return !result.hasCollision;
  }

  /**
   * Get the safe movement range for the ship
   */
  getSafeMovementRange(
    shipY: number,
    pathTiles: TileCoordinate[],
    currentYLoop: number
  ): { min: number; max: number } {
    try {
      const currentTiles = this.getTilesAtPosition(pathTiles, currentYLoop, shipY);
      
      if (currentTiles.length === 0) {
        return { min: 0, max: this.boundaries.maxX - 1 };
      }

      const minX = Math.min(...currentTiles.map(tile => tile.x));
      const maxX = Math.max(...currentTiles.map(tile => tile.x));

      return {
        min: Math.max(minX - this.config.shipTolerance, this.boundaries.minX),
        max: Math.min(maxX + this.config.shipTolerance, this.boundaries.maxX - 1),
      };

    } catch (error) {
      console.error('Error calculating safe movement range:', error);
      return { min: 0, max: this.boundaries.maxX - 1 };
    }
  }

  /**
   * Update collision configuration
   */
  updateConfig(newConfig: Partial<CollisionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current collision configuration
   */
  getConfig(): CollisionConfig {
    return { ...this.config };
  }

  /**
   * Get current boundaries
   */
  getBoundaries(): GameBoundaries {
    return { ...this.boundaries };
  }
}