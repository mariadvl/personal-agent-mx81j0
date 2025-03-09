import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioPlayerState } from '../types/voice';
import createAudioPlayer from '../services/audioPlayer';

/**
 * Options for configuring the audio player hook
 */
interface UseAudioPlayerOptions {
  /**
   * Callback fired when audio playback completes
   */
  onEnded?: () => void;
  
  /**
   * Callback fired when an error occurs during playback
   */
  onError?: (error: Error) => void;
  
  /**
   * Initial volume level (0.0 to 1.0)
   */
  initialVolume?: number;
  
  /**
   * Update interval for tracking playback progress in milliseconds
   */
  updateInterval?: number;
}

/**
 * Return type for the useAudioPlayer hook
 */
interface UseAudioPlayerReturn extends AudioPlayerState {
  /**
   * Play audio from the provided source
   * @param source URL string, Blob, or Base64 encoded string
   * @returns Promise resolving to success status
   */
  play: (source: string | Blob) => Promise<boolean>;
  
  /**
   * Pause audio playback
   * @returns Success status
   */
  pause: () => boolean;
  
  /**
   * Resume paused audio playback
   * @returns Promise resolving to success status
   */
  resume: () => Promise<boolean>;
  
  /**
   * Stop audio playback and reset position
   * @returns Success status
   */
  stop: () => boolean;
  
  /**
   * Seek to a specific time position
   * @param time Position in seconds
   * @returns Success status
   */
  seek: (time: number) => boolean;
  
  /**
   * Set the audio volume
   * @param level Volume level (0.0 to 1.0)
   * @returns Success status
   */
  setVolume: (level: number) => boolean;
  
  /**
   * Set the playback rate
   * @param rate Playback rate (1.0 = normal speed)
   * @returns Success status
   */
  setPlaybackRate: (rate: number) => boolean;
  
  /**
   * Toggle between play and pause states
   * @returns Promise resolving to success status
   */
  togglePlayPause: () => Promise<boolean>;
}

/**
 * React hook that provides audio playback functionality with state management
 * 
 * @param options Configuration options
 * @returns Audio player state and control functions
 */
const useAudioPlayer = (options: UseAudioPlayerOptions = {}): UseAudioPlayerReturn => {
  // Initialize state based on AudioPlayerState interface
  const [playerState, setPlayerState] = useState<AudioPlayerState>({
    isPlaying: false,
    isPaused: false,
    duration: 0,
    currentTime: 0,
    volume: options.initialVolume ?? 1.0,
    error: null
  });

  // Refs to store the audio player instance and update interval
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const updateIntervalRef = useRef<number | null>(null);
  
  // Use ref to track isPlaying state to avoid dependency issues
  const isPlayingRef = useRef(playerState.isPlaying);
  useEffect(() => {
    isPlayingRef.current = playerState.isPlaying;
  }, [playerState.isPlaying]);

  // Initialize the audio player
  useEffect(() => {
    // Create audio player instance
    const player = createAudioPlayer({
      initialVolume: options.initialVolume,
      onStateChange: (state) => {
        setPlayerState(state);
      },
      onEnded: options.onEnded,
      onError: options.onError
    });

    playerRef.current = player;

    // Set up an interval to update the player state for smoother UI updates
    const intervalTime = options.updateInterval || 100;
    updateIntervalRef.current = window.setInterval(() => {
      if (playerRef.current && isPlayingRef.current) {
        const state = playerRef.current.getState();
        setPlayerState((prev) => ({
          ...prev,
          currentTime: state.currentTime
        }));
      }
    }, intervalTime);

    // Cleanup on unmount
    return () => {
      if (updateIntervalRef.current) {
        window.clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [options.onEnded, options.onError, options.initialVolume, options.updateInterval]);

  // Play function that accepts URL string, Blob, or Base64 encoded string
  const play = useCallback(async (source: string | Blob): Promise<boolean> => {
    if (playerRef.current) {
      try {
        await playerRef.current.play(source);
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }, []);

  // Pause function
  const pause = useCallback((): boolean => {
    if (playerRef.current) {
      playerRef.current.pause();
      return true;
    }
    return false;
  }, []);

  // Resume function
  const resume = useCallback(async (): Promise<boolean> => {
    if (playerRef.current) {
      try {
        await playerRef.current.resume();
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }, []);

  // Stop function
  const stop = useCallback((): boolean => {
    if (playerRef.current) {
      playerRef.current.stop();
      return true;
    }
    return false;
  }, []);

  // Seek function
  const seek = useCallback((time: number): boolean => {
    if (playerRef.current) {
      playerRef.current.seek(time);
      return true;
    }
    return false;
  }, []);

  // Set volume function
  const setVolume = useCallback((level: number): boolean => {
    if (playerRef.current) {
      playerRef.current.setVolume(level);
      return true;
    }
    return false;
  }, []);

  // Set playback rate function
  const setPlaybackRate = useCallback((rate: number): boolean => {
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(rate);
      return true;
    }
    return false;
  }, []);

  // Toggle play/pause function
  const togglePlayPause = useCallback(async (): Promise<boolean> => {
    if (playerRef.current) {
      if (playerState.isPlaying) {
        return pause();
      } else if (playerState.isPaused) {
        return await resume();
      }
    }
    return false;
  }, [playerState.isPlaying, playerState.isPaused, pause, resume]);

  // Return player state and control functions
  return {
    ...playerState,
    play,
    pause,
    resume,
    stop,
    seek,
    setVolume,
    setPlaybackRate,
    togglePlayPause
  };
};

export default useAudioPlayer;