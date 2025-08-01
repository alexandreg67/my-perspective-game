"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Path from "./Path";
import Ship from "./Ship";
import { clearPerspectiveCache } from "../utils/perspective";
import { PlayerController } from "../utils/PlayerController";
import { CollisionDetector, CollisionResult } from "../utils/CollisionDetection";

interface GameProps {
  showShip: boolean;
}

interface GameState {
  currentOffsetY: number;
  currentYLoop: number;
  shipPosition: number;
  speed: number;
  score: number;
  lives: number;
  gameStatus: 'playing' | 'paused' | 'gameOver' | 'menu';
  lastCollision: CollisionResult | null;
}

interface TileCoordinate {
  x: number;
  y: number;
}

// Game constants - extracted to prevent magic numbers
const GAME_CONSTANTS = {
  NB_COLUMNS: 7,
  SCROLL_SPEED: 240, // pixels per second
  TILE_SPACING_Y: 0.15,
  MIN_TILES: 16,
  MAX_TILES: 24,
  DEFAULT_CANVAS_WIDTH: 900,
  DEFAULT_CANVAS_HEIGHT: 400,
  TARGET_FPS: 60,
} as const;

const Game: React.FC<GameProps> = ({ showShip }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>({
    currentOffsetY: 0,
    currentYLoop: 0,
    shipPosition: Math.floor(GAME_CONSTANTS.NB_COLUMNS / 2),
    speed: GAME_CONSTANTS.SCROLL_SPEED,
    score: 0,
    lives: 3,
    gameStatus: 'playing',
    lastCollision: null,
  });

  // Game controllers
  const playerControllerRef = useRef<PlayerController>(new PlayerController());
  const collisionDetectorRef = useRef<CollisionDetector>(new CollisionDetector());

  // Canvas context state
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ 
    width: GAME_CONSTANTS.DEFAULT_CANVAS_WIDTH, 
    height: GAME_CONSTANTS.DEFAULT_CANVAS_HEIGHT 
  });
  
  // Game state
  const [gameState, setGameState] = useState<GameState>(gameStateRef.current);
  const [tilesCoordinates, setTilesCoordinates] = useState<TileCoordinate[]>([]);

  // Error handling state
  const [gameError, setGameError] = useState<string | null>(null);

  // Optimized canvas size handling with error handling
  const updateCanvasSize = useCallback(() => {
    try {
      const parent = canvasRef.current?.parentElement;
      if (parent) {
        const width = Math.max(GAME_CONSTANTS.DEFAULT_CANVAS_WIDTH, parent.clientWidth);
        const height = Math.max(GAME_CONSTANTS.DEFAULT_CANVAS_HEIGHT, parent.clientHeight);
        
        setCanvasSize(prevSize => {
          // Only update if size actually changed to prevent unnecessary re-renders
          if (prevSize.width !== width || prevSize.height !== height) {
            // Clear perspective cache when canvas size changes
            clearPerspectiveCache();
            return { width, height };
          }
          return prevSize;
        });
      }
    } catch (error) {
      console.error("Error updating canvas size:", error);
      setGameError("Failed to update canvas size");
    }
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [updateCanvasSize]);

  // Canvas context initialization with error handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setGameError("Canvas element not found");
      return;
    }

    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setGameError("Failed to get 2D rendering context");
        return;
      }

      // Configure context for optimal performance
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      
      setContext(ctx);
      setGameError(null); // Clear any previous errors
    } catch (error) {
      console.error("Error initializing canvas context:", error);
      setGameError("Failed to initialize canvas");
    }
  }, []);

  // Generate initial tiles synchronously to prevent race condition at startup
  const generateInitialTiles = useCallback(() => {
    try {
      const initialTiles: TileCoordinate[] = [];
      
      // Starting position (center of track, aligned with ship)
      let lastX = Math.floor(GAME_CONSTANTS.NB_COLUMNS / 2); // Position 3
      let lastY = gameStateRef.current.currentYLoop + 1; // Start at Y = 1
      
      // Generate initial set of tiles to ensure ship has a path
      for (let i = 0; i < GAME_CONSTANTS.MIN_TILES; i++) {
        // For the first few tiles, keep path straight to ensure ship can start safely
        if (i < 3) {
          // Keep first 3 tiles straight (no random movement)
          initialTiles.push({ x: lastX, y: lastY });
        } else {
          // After first 3 tiles, allow random path generation
          const randomStep = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
          lastX = Math.max(0, Math.min(GAME_CONSTANTS.NB_COLUMNS - 1, lastX + randomStep));
          initialTiles.push({ x: lastX, y: lastY });
        }
        lastY++;
      }
      
      // Set tiles immediately (synchronous)
      setTilesCoordinates(initialTiles);
      
      console.log(`Generated ${initialTiles.length} initial tiles, starting at position (${initialTiles[0]?.x}, ${initialTiles[0]?.y})`);
      
    } catch (error) {
      console.error("Error generating initial tiles:", error);
      // Fallback: ensure at least one tile exists where ship starts
      setTilesCoordinates([{ 
        x: Math.floor(GAME_CONSTANTS.NB_COLUMNS / 2), 
        y: gameStateRef.current.currentYLoop + 1 
      }]);
    }
  }, []);

  // Initialize game controllers
  useEffect(() => {
    try {
      // Initialize player controller
      playerControllerRef.current.initialize(gameStateRef.current.shipPosition);
      
      // Set collision detector boundaries (fix off-by-one error)
      collisionDetectorRef.current.setBoundaries({
        minX: 0,
        maxX: GAME_CONSTANTS.NB_COLUMNS - 1, // Valid positions: 0 to 6
        minY: 0,
        maxY: Number.MAX_SAFE_INTEGER,
      });

      // Generate initial tiles synchronously to prevent race condition
      generateInitialTiles();

    } catch (error) {
      console.error("Error initializing game controllers:", error);
      setGameError("Failed to initialize game controllers");
    }

    // Cleanup function
    return () => {
      try {
        const controller = playerControllerRef.current;
        if (controller) {
          controller.cleanup();
        }
      } catch (error) {
        console.error("Error cleaning up game controllers:", error);
      }
    };
  }, [generateInitialTiles]);

  // Optimized tile generation with memoization and performance improvements
  const generateTilesCoordinates = useCallback(() => {
    setTilesCoordinates((prevTiles) => {
      try {
        // Filter tiles efficiently without creating intermediate arrays
        const validTiles = prevTiles.filter((tile) => tile.y >= gameStateRef.current.currentYLoop);
        
        // Calculate how many new tiles we need
        const tilesNeeded = GAME_CONSTANTS.MIN_TILES - validTiles.length;
        if (tilesNeeded <= 0) return prevTiles;

        // Get last position for continuity
        const lastTile = validTiles[validTiles.length - 1];
        let lastX = lastTile ? lastTile.x : Math.floor(GAME_CONSTANTS.NB_COLUMNS / 2);
        let lastY = gameStateRef.current.currentYLoop + 1;

        // Generate new tiles more efficiently
        const newTiles: TileCoordinate[] = [];
        for (let i = 0; i < tilesNeeded; i++) {
          // Smoother path generation with controlled randomness
          const randomStep = Math.floor(Math.random() * 3) - 1;
          lastX = Math.max(0, Math.min(GAME_CONSTANTS.NB_COLUMNS - 1, lastX + randomStep));
          newTiles.push({ x: lastX, y: lastY });
          lastY++;
        }

        return [...validTiles, ...newTiles];
      } catch (error) {
        console.error("Error generating tiles:", error);
        return prevTiles; // Return previous state on error
      }
    });
  }, []);

  // Handle collision events
  const handleCollision = useCallback((gameState: GameState, collision: CollisionResult) => {
    try {
      gameState.lastCollision = collision;

      switch (collision.severity) {
        case 'fatal':
          // Immediate game over
          gameState.lives = 0;
          gameState.gameStatus = 'gameOver';
          break;
          
        case 'major':
          // Lose a life
          gameState.lives -= 1;
          if (gameState.lives <= 0) {
            gameState.gameStatus = 'gameOver';
          } else {
            // Brief pause and reset position
            setTimeout(() => {
              if (gameState.gameStatus === 'playing') {
                playerControllerRef.current.setPosition(
                  Math.floor(GAME_CONSTANTS.NB_COLUMNS / 2),
                  GAME_CONSTANTS.NB_COLUMNS
                );
              }
            }, 500);
          }
          break;
          
        case 'minor':
          // Small score penalty, no life lost
          gameState.score = Math.max(0, gameState.score - 50);
          break;
          
        default:
          // No action needed
          break;
      }

      // Visual feedback for collision
      if (collision.severity !== 'none') {
        console.log(`Collision detected: ${collision.collisionType} (${collision.severity})`);
        
        // Could add screen shake, sound effects, etc. here
        if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
          // Haptic feedback on mobile devices
          const intensity = collision.severity === 'fatal' ? 200 : 
                          collision.severity === 'major' ? 100 : 50;
          navigator.vibrate(intensity);
        }
      }

    } catch (error) {
      console.error('Error handling collision:', error);
    }
  }, []);

  // Reset game to initial state
  const resetGame = useCallback(() => {
    try {
      const initialState: GameState = {
        currentOffsetY: 0,
        currentYLoop: 0,
        shipPosition: Math.floor(GAME_CONSTANTS.NB_COLUMNS / 2),
        speed: GAME_CONSTANTS.SCROLL_SPEED,
        score: 0,
        lives: 3,
        gameStatus: 'playing',
        lastCollision: null,
      };

      gameStateRef.current = initialState;
      setGameState(initialState);
      
      // Reset controllers
      playerControllerRef.current.setPosition(
        initialState.shipPosition,
        GAME_CONSTANTS.NB_COLUMNS
      );
      
      // Generate initial tiles synchronously to prevent race condition
      generateInitialTiles();
      
    } catch (error) {
      console.error('Error resetting game:', error);
      setGameError('Failed to reset game');
    }
  }, [generateInitialTiles]);

  // Pause/unpause game
  const togglePause = useCallback(() => {
    const currentState = gameStateRef.current;
    if (currentState.gameStatus === 'playing') {
      currentState.gameStatus = 'paused';
    } else if (currentState.gameStatus === 'paused') {
      currentState.gameStatus = 'playing';
    }
    setGameState({ ...currentState });
  }, []);

  // Global keyboard handlers for game controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'space':
          e.preventDefault();
          togglePause();
          break;
        case 'r':
          e.preventDefault();
          if (gameState.gameStatus === 'gameOver' || e.ctrlKey) {
            resetGame();
          }
          break;
        case 'escape':
          e.preventDefault();
          if (gameState.gameStatus === 'playing') {
            togglePause();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause, resetGame, gameState.gameStatus]);

  // Unified game loop with proper cleanup and time-based animation
  useEffect(() => {
    if (!context) return;

    let isRunning = true;

    const gameLoop = (currentTime: number) => {
      if (!isRunning) return;

      try {
        // Calculate delta time for smooth animation
        const deltaTime = lastTimeRef.current > 0 ? (currentTime - lastTimeRef.current) / 1000 : 0;
        lastTimeRef.current = currentTime;

        // Update game state only if playing
        const currentState = gameStateRef.current;
        
        if (currentState.gameStatus === 'playing') {
          // Update player input and ship position
          const playerState = playerControllerRef.current.update(deltaTime, GAME_CONSTANTS.NB_COLUMNS);
          currentState.shipPosition = playerState.position;

          // Update scrolling
          const newOffsetY = currentState.currentOffsetY + (currentState.speed * deltaTime);
          const spacingY = GAME_CONSTANTS.TILE_SPACING_Y * canvasSize.height;

          if (newOffsetY >= spacingY) {
            currentState.currentYLoop += 1;
            currentState.currentOffsetY = newOffsetY - spacingY;
            currentState.score += 10; // Increment score
            
            // Generate new tiles synchronously before collision detection
            generateTilesCoordinates();
          } else {
            currentState.currentOffsetY = newOffsetY;
          }

          // Check collisions (after tile generation if needed)
          // Only check collisions if we have sufficient tiles to avoid false positives
          let collisionResult: CollisionResult = { 
            hasCollision: false, 
            severity: 'none', 
            collisionType: 'none', 
            distance: 0, 
            position: { x: currentState.shipPosition, y: 0 } 
          };
          
          if (tilesCoordinates.length >= 3) { // Require at least 3 tiles before collision detection
            collisionResult = collisionDetectorRef.current.checkAllCollisions(
              currentState.shipPosition,
              0, // Ship Y position (always at bottom)
              tilesCoordinates,
              currentState.currentYLoop
            );
          }

          // Handle collision
          if (collisionResult.hasCollision && collisionResult.severity !== 'none') {
            handleCollision(currentState, collisionResult);
          } else {
            // Clear previous collision if no longer colliding
            currentState.lastCollision = null;
          }

          // Update speed based on progress (progressive difficulty)
          const baseSpeed = GAME_CONSTANTS.SCROLL_SPEED;
          const speedIncrease = Math.floor(currentState.score / 500) * 20; // Increase every 500 points
          currentState.speed = Math.min(baseSpeed + speedIncrease, baseSpeed * 2); // Cap at 2x speed
        }

        // Update React state periodically (not every frame for performance)
        if (Math.floor(currentTime / 100) !== Math.floor(lastTimeRef.current / 100)) {
          setGameState({ ...currentState });
        }

        // Clear canvas efficiently
        context.clearRect(0, 0, canvasSize.width, canvasSize.height);

        // Render game objects with error handling
        try {
          // Draw path tiles
          Path({
            context,
            canvasSize,
            currentOffsetY: currentState.currentOffsetY,
            currentYLoop: currentState.currentYLoop,
            nbColumns: GAME_CONSTANTS.NB_COLUMNS,
            tilesCoordinates,
          });

          // Draw ship if enabled
          if (showShip) {
            Ship({
              canvasContext: context,
              canvasSize,
              shipPosition: currentState.shipPosition,
              nbColumns: GAME_CONSTANTS.NB_COLUMNS,
            });
          }
        } catch (renderError) {
          console.error("Rendering error:", renderError);
          setGameError("Rendering failed");
        }

        // Continue animation loop
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      } catch (error) {
        console.error("Game loop error:", error);
        setGameError("Game loop failed");
      }
    };

    // Start the game loop
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    // Cleanup function to prevent memory leaks
    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [context, canvasSize, showShip, tilesCoordinates, generateTilesCoordinates, handleCollision]);


  // Error display component
  const ErrorDisplay = () => {
    if (!gameError) return null;
    
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-75">
        <div className="bg-red-800 text-white p-4 rounded-lg">
          <h3 className="text-lg font-bold">Game Error</h3>
          <p>{gameError}</p>
          <button 
            onClick={() => setGameError(null)}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="block"
        style={{
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated' // For crisp pixel art if needed
        }}
      />
      <ErrorDisplay />
      
      {/* Game UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Score and Lives */}
        <div className="absolute top-4 left-4 text-white text-lg font-bold">
          <div>Score: {gameState.score}</div>
          <div>Lives: {gameState.lives}</div>
          <div>Speed: {Math.round(gameState.speed)}px/s</div>
        </div>

        {/* Controls Info */}
        <div className="absolute top-4 right-4 text-white text-sm text-right">
          <div>← → or A D: Move</div>
          <div>Space: Pause</div>
          <div>R: Reset</div>
        </div>

        {/* Collision Warning */}
        {gameState.lastCollision && gameState.lastCollision.severity !== 'none' && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className={`text-2xl font-bold px-4 py-2 rounded ${
              gameState.lastCollision.severity === 'fatal' ? 'bg-red-600 text-white' :
              gameState.lastCollision.severity === 'major' ? 'bg-orange-600 text-white' :
              'bg-yellow-600 text-black'
            }`}>
              {gameState.lastCollision.collisionType === 'off-track' ? 'OFF TRACK!' :
               gameState.lastCollision.collisionType === 'boundary' ? 'BOUNDARY HIT!' :
               'COLLISION!'}
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState.gameStatus === 'gameOver' && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center pointer-events-auto">
            <div className="bg-gray-800 text-white p-8 rounded-lg text-center">
              <h2 className="text-3xl font-bold mb-4">Game Over</h2>
              <p className="text-xl mb-2">Final Score: {gameState.score}</p>
              <p className="text-lg mb-6">You survived {gameState.currentYLoop} loops!</p>
              <button 
                onClick={resetGame}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {/* Pause Screen */}
        {gameState.gameStatus === 'paused' && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-auto">
            <div className="bg-gray-800 text-white p-6 rounded-lg text-center">
              <h2 className="text-2xl font-bold mb-4">Paused</h2>
              <button 
                onClick={togglePause}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-bold"
              >
                Resume
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Development info overlay */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white p-2 text-xs font-mono">
          <div>Status: {gameState.gameStatus}</div>
          <div>Ship Pos: {gameState.shipPosition.toFixed(2)}</div>
          <div>Y Loop: {gameState.currentYLoop}</div>
          <div>Offset: {Math.round(gameState.currentOffsetY)}</div>
          <div>Tiles: {tilesCoordinates.length}</div>
          {gameState.lastCollision && (
            <div>Collision: {gameState.lastCollision.collisionType} ({gameState.lastCollision.severity})</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Game;
