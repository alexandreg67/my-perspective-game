/**
 * Player Controller - Handles keyboard input and ship movement
 * Provides smooth, responsive controls with proper state management
 */

export interface PlayerControllerConfig {
  moveSpeed: number; // Lanes per second
  smoothingFactor: number; // For smooth movement interpolation
  keyRepeatDelay: number; // Milliseconds before key repeat
  maxMoveDistance: number; // Maximum distance per move
}

export interface PlayerState {
  position: number; // Current lane position (can be fractional)
  targetPosition: number; // Target lane position
  velocity: number; // Current movement velocity
  isMoving: boolean; // Whether player is currently moving
}

export interface KeyState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  space: boolean;
}

// Default configuration for responsive controls
const DEFAULT_CONFIG: PlayerControllerConfig = {
  moveSpeed: 4.0, // Lanes per second
  smoothingFactor: 0.15, // Smooth interpolation
  keyRepeatDelay: 150, // 150ms delay
  maxMoveDistance: 0.3, // Max distance per frame
};

export class PlayerController {
  private config: PlayerControllerConfig;
  private keyState: KeyState;
  private lastKeyTime: { [key: string]: number };
  private playerState: PlayerState;
  private eventListeners: { type: string; handler: (e: Event) => void }[];
  private isActive: boolean;

  constructor(config: Partial<PlayerControllerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.keyState = {
      left: false,
      right: false,
      up: false,
      down: false,
      space: false,
    };
    this.lastKeyTime = {};
    this.playerState = {
      position: 0,
      targetPosition: 0,
      velocity: 0,
      isMoving: false,
    };
    this.eventListeners = [];
    this.isActive = false;
  }

  /**
   * Initialize player controller and start listening to input
   */
  initialize(initialPosition: number = 3): void { // Default to center lane
    try {
      this.playerState = {
        position: initialPosition,
        targetPosition: initialPosition,
        velocity: 0,
        isMoving: false,
      };

      this.attachEventListeners();
      this.isActive = true;
    } catch (error) {
      console.error('Failed to initialize player controller:', error);
    }
  }

  /**
   * Clean up event listeners and stop controller
   */
  cleanup(): void {
    try {
      this.detachEventListeners();
      this.isActive = false;
      this.resetKeyState();
    } catch (error) {
      console.error('Error during player controller cleanup:', error);
    }
  }

  /**
   * Update player position based on input and time delta
   */
  update(deltaTime: number, maxLanes: number): PlayerState {
    if (!this.isActive) return this.playerState;

    try {
      // Handle input and update target position
      this.processInput(maxLanes);
      
      // Smooth movement interpolation
      this.updateMovement(deltaTime);
      
      // Clamp position to valid lanes
      this.clampPosition(maxLanes);
      
      return { ...this.playerState };
    } catch (error) {
      console.error('Error updating player controller:', error);
      return { ...this.playerState };
    }
  }

  /**
   * Get current player state
   */
  getState(): PlayerState {
    return { ...this.playerState };
  }

  /**
   * Set player position (useful for reset or teleport)
   */
  setPosition(position: number, maxLanes: number): void {
    const clampedPosition = Math.max(0, Math.min(maxLanes - 1, position));
    this.playerState.position = clampedPosition;
    this.playerState.targetPosition = clampedPosition;
    this.playerState.velocity = 0;
    this.playerState.isMoving = false;
  }

  /**
   * Check if player is currently moving
   */
  isPlayerMoving(): boolean {
    return this.playerState.isMoving;
  }

  /**
   * Get current key state (useful for debugging)
   */
  getKeyState(): KeyState {
    return { ...this.keyState };
  }

  /**
   * Process keyboard input and update target position
   */
  private processInput(maxLanes: number): void {
    const currentTime = Date.now();

    // Handle left movement
    if (this.keyState.left && this.canMoveLeft(currentTime)) {
      this.playerState.targetPosition = Math.max(0, this.playerState.targetPosition - 1);
      this.lastKeyTime.left = currentTime;
    }

    // Handle right movement
    if (this.keyState.right && this.canMoveRight(currentTime, maxLanes)) {
      this.playerState.targetPosition = Math.min(maxLanes - 1, this.playerState.targetPosition + 1);
      this.lastKeyTime.right = currentTime;
    }

    // Update moving state
    this.playerState.isMoving = Math.abs(this.playerState.position - this.playerState.targetPosition) > 0.01;
  }

  /**
   * Update smooth movement interpolation
   */
  private updateMovement(deltaTime: number): void {
    if (!this.playerState.isMoving) return;

    const distance = this.playerState.targetPosition - this.playerState.position;
    const maxDistance = this.config.maxMoveDistance;
    
    // Calculate movement with speed limiting
    let movement = distance * this.config.smoothingFactor;
    movement = Math.max(-maxDistance, Math.min(maxDistance, movement));
    
    // Apply movement
    this.playerState.position += movement;
    this.playerState.velocity = movement / deltaTime;

    // Stop moving if close enough to target
    if (Math.abs(distance) < 0.01) {
      this.playerState.position = this.playerState.targetPosition;
      this.playerState.velocity = 0;
      this.playerState.isMoving = false;
    }
  }

  /**
   * Clamp position to valid range
   */
  private clampPosition(maxLanes: number): void {
    this.playerState.position = Math.max(0, Math.min(maxLanes - 1, this.playerState.position));
    this.playerState.targetPosition = Math.max(0, Math.min(maxLanes - 1, this.playerState.targetPosition));
  }

  /**
   * Check if left movement is allowed (considering key repeat delay)
   */
  private canMoveLeft(currentTime: number): boolean {
    return !this.lastKeyTime.left || 
           currentTime - this.lastKeyTime.left >= this.config.keyRepeatDelay;
  }

  /**
   * Check if right movement is allowed (considering key repeat delay)
   */
  private canMoveRight(currentTime: number, maxLanes: number): boolean {
    return this.playerState.targetPosition < maxLanes - 1 &&
           (!this.lastKeyTime.right || 
            currentTime - this.lastKeyTime.right >= this.config.keyRepeatDelay);
  }

  /**
   * Attach keyboard event listeners
   */
  private attachEventListeners(): void {
    const keyDownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    const keyUpHandler = (e: KeyboardEvent) => this.handleKeyUp(e);
    
    window.addEventListener('keydown', keyDownHandler);
    window.addEventListener('keyup', keyUpHandler);
    
    this.eventListeners = [
      { type: 'keydown', handler: keyDownHandler as (e: Event) => void },
      { type: 'keyup', handler: keyUpHandler as (e: Event) => void },
    ];
  }

  /**
   * Remove keyboard event listeners
   */
  private detachEventListeners(): void {
    this.eventListeners.forEach(({ type, handler }) => {
      window.removeEventListener(type, handler);
    });
    this.eventListeners = [];
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    // Prevent default behavior for game keys
    if (this.isGameKey(e.key)) {
      e.preventDefault();
    }

    switch (e.key.toLowerCase()) {
      case 'arrowleft':
      case 'a':
        this.keyState.left = true;
        break;
      case 'arrowright':
      case 'd':
        this.keyState.right = true;
        break;
      case 'arrowup':
      case 'w':
        this.keyState.up = true;
        break;
      case 'arrowdown':
      case 's':
        this.keyState.down = true;
        break;
      case ' ':
      case 'space':
        this.keyState.space = true;
        break;
    }
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'arrowleft':
      case 'a':
        this.keyState.left = false;
        break;
      case 'arrowright':
      case 'd':
        this.keyState.right = false;
        break;
      case 'arrowup':
      case 'w':
        this.keyState.up = false;
        break;
      case 'arrowdown':
      case 's':
        this.keyState.down = false;
        break;
      case ' ':
      case 'space':
        this.keyState.space = false;
        break;
    }
  }

  /**
   * Check if a key is used for game controls
   */
  private isGameKey(key: string): boolean {
    const gameKeys = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'a', 'd', 'w', 's'];
    return gameKeys.includes(key.toLowerCase());
  }

  /**
   * Reset all key states
   */
  private resetKeyState(): void {
    this.keyState = {
      left: false,
      right: false,
      up: false,
      down: false,
      space: false,
    };
    this.lastKeyTime = {};
  }

  /**
   * Update controller configuration
   */
  updateConfig(newConfig: Partial<PlayerControllerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get controller configuration
   */
  getConfig(): PlayerControllerConfig {
    return { ...this.config };
  }
}