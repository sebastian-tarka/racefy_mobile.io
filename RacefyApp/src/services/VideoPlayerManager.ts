import { VideoPlayer } from 'expo-video';
import { AppState, AppStateStatus } from 'react-native';
import { logger } from './logger';

/**
 * Centralized video player manager
 * Manages all video player instances across the app and provides global control
 */
class VideoPlayerManagerClass {
  private players: Map<string, VideoPlayer> = new Map();
  private appStateSubscription: any = null;

  constructor() {
    this.setupAppStateListener();
  }

  /**
   * Register a video player instance
   * @param id - Unique identifier for this player
   * @param player - The VideoPlayer instance
   */
  register(id: string, player: VideoPlayer) {
    this.players.set(id, player);
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
      player.pause();
      this.players.delete(id);
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

    this.players.forEach((player, id) => {
      try {
        player.pause();
      } catch (error) {
        logger.error('activity', `[VideoPlayerManager] Error pausing player ${id}`, { error });
      }
    });
  }

  /**
   * Resume all registered video players
   * Note: In most cases, you should let viewability logic handle resume
   */
  resumeAll() {
    logger.activity('[VideoPlayerManager] Resuming all players', {
      totalPlayers: this.players.size,
    });

    this.players.forEach((player, id) => {
      try {
        player.play();
      } catch (error) {
        logger.error('activity', `[VideoPlayerManager] Error resuming player ${id}`, { error });
      }
    });
  }

  /**
   * Pause a specific player by ID
   * @param id - Unique identifier for the player
   */
  pause(id: string) {
    const player = this.players.get(id);
    if (player) {
      player.pause();
      logger.activity(`[VideoPlayerManager] Paused player: ${id}`);
    }
  }

  /**
   * Resume a specific player by ID
   * @param id - Unique identifier for the player
   */
  resume(id: string) {
    const player = this.players.get(id);
    if (player) {
      player.play();
      logger.activity(`[VideoPlayerManager] Resumed player: ${id}`);
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
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

// Export singleton instance
export const VideoPlayerManager = new VideoPlayerManagerClass();