import { VideoPlayer } from 'expo-video';
import { AppState, AppStateStatus } from 'react-native';
import { logger } from './logger';

/**
 * Centralized video player manager
 * Manages all video player instances across the app and provides global control
 */
class VideoPlayerManagerClass {
  private players: Map<string, VideoPlayer> = new Map();
  private playerOrder: string[] = []; // Track insertion order for eviction
  private appStateSubscription: any = null;
  private maxConcurrentPlayers = 3;

  constructor() {
    this.setupAppStateListener();
  }

  /**
   * Register a video player instance.
   * If the number of players exceeds maxConcurrentPlayers, the oldest player
   * is paused and evicted to prevent OutOfMemory on Android.
   * @param id - Unique identifier for this player
   * @param player - The VideoPlayer instance
   */
  register(id: string, player: VideoPlayer) {
    // If re-registering the same id, remove old entry from order tracking
    if (this.players.has(id)) {
      this.playerOrder = this.playerOrder.filter(pid => pid !== id);
    }

    this.players.set(id, player);
    this.playerOrder.push(id);

    // Evict oldest players when over the limit
    while (this.playerOrder.length > this.maxConcurrentPlayers) {
      const oldestId = this.playerOrder.shift();
      if (oldestId && oldestId !== id) {
        const oldPlayer = this.players.get(oldestId);
        if (oldPlayer) {
          try {
            oldPlayer.pause();
          } catch {
            // Player already released
          }
          this.players.delete(oldestId);
          logger.debug('activity', `[VideoPlayerManager] Evicted oldest player: ${oldestId}`, {
            totalPlayers: this.players.size,
          });
        }
      }
    }

    logger.activity(`[VideoPlayerManager] Registered player: ${id}`, {
      totalPlayers: this.players.size,
    });
  }

  /**
   * Unregister a video player instance
   * @param id - Unique identifier for the player to remove
   */
  unregister(id: string) {
    const player = this.players.get(id);
    if (player) {
      try {
        player.pause();
      } catch (error) {
        logger.debug('activity', `[VideoPlayerManager] Player ${id} already released during unregister`);
      }
      this.players.delete(id);
      this.playerOrder = this.playerOrder.filter(pid => pid !== id);
      logger.activity(`[VideoPlayerManager] Unregistered player: ${id}`, {
        totalPlayers: this.players.size,
      });
    }
  }

  /**
   * Pause all registered video players
   */
  pauseAll() {
    logger.activity('[VideoPlayerManager] Pausing all players', {
      totalPlayers: this.players.size,
    });

    const invalidPlayers: string[] = [];

    this.players.forEach((player, id) => {
      try {
        player.pause();
      } catch (error) {
        logger.debug('activity', `[VideoPlayerManager] Player ${id} no longer valid, removing`, { error });
        invalidPlayers.push(id);
      }
    });

    // Clean up invalid players
    invalidPlayers.forEach(id => this.players.delete(id));

    if (invalidPlayers.length > 0) {
      logger.activity('[VideoPlayerManager] Cleaned up released players', {
        removed: invalidPlayers.length,
        remaining: this.players.size,
      });
    }
  }

  /**
   * Resume all registered video players
   * Note: In most cases, you should let viewability logic handle resume
   */
  resumeAll() {
    logger.activity('[VideoPlayerManager] Resuming all players', {
      totalPlayers: this.players.size,
    });

    const invalidPlayers: string[] = [];

    this.players.forEach((player, id) => {
      try {
        player.play();
      } catch (error) {
        logger.debug('activity', `[VideoPlayerManager] Player ${id} no longer valid, removing`, { error });
        invalidPlayers.push(id);
      }
    });

    // Clean up invalid players
    invalidPlayers.forEach(id => this.players.delete(id));

    if (invalidPlayers.length > 0) {
      logger.activity('[VideoPlayerManager] Cleaned up released players', {
        removed: invalidPlayers.length,
        remaining: this.players.size,
      });
    }
  }

  /**
   * Pause a specific player by ID
   * @param id - Unique identifier for the player
   */
  pause(id: string) {
    const player = this.players.get(id);
    if (player) {
      try {
        player.pause();
        logger.activity(`[VideoPlayerManager] Paused player: ${id}`);
      } catch (error) {
        logger.debug('activity', `[VideoPlayerManager] Player ${id} no longer valid, removing`);
        this.players.delete(id);
      }
    }
  }

  /**
   * Resume a specific player by ID
   * @param id - Unique identifier for the player
   */
  resume(id: string) {
    const player = this.players.get(id);
    if (player) {
      try {
        player.play();
        logger.activity(`[VideoPlayerManager] Resumed player: ${id}`);
      } catch (error) {
        logger.debug('activity', `[VideoPlayerManager] Player ${id} no longer valid, removing`);
        this.players.delete(id);
      }
    }
  }

  /**
   * Get the number of registered players
   */
  getPlayerCount(): number {
    return this.players.size;
  }

  /**
   * Check if a player is registered
   * @param id - Unique identifier for the player
   */
  hasPlayer(id: string): boolean {
    return this.players.has(id);
  }

  /**
   * Setup app state listener to pause videos when app goes to background
   */
  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      logger.activity('[VideoPlayerManager] App went to background, pausing all videos');
      this.pauseAll();
    }
  };

  /**
   * Cleanup (should be called when app unmounts, though rarely needed)
   */
  cleanup() {
    this.pauseAll();
    this.players.clear();
    this.playerOrder = [];
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

// Export singleton instance
export const VideoPlayerManager = new VideoPlayerManagerClass();