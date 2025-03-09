import { AudioPlayerState } from '../types/voice';
import { convertBase64ToBlob } from '../utils/audioUtils';

/**
 * Factory function to create an audio player instance with methods for controlling audio playback
 * 
 * @param options - Configuration options for the audio player
 * @returns Audio player instance with control methods and state
 */
const createAudioPlayer = (options: { 
  initialVolume?: number; 
  onStateChange?: (state: AudioPlayerState) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
} = {}) => {
  // Create audio element
  const audioElement = new Audio();
  
  // Initialize state
  let currentSource: string | Blob | null = null;
  let audioState: AudioPlayerState = {
    isPlaying: false,
    isPaused: false,
    duration: 0,
    currentTime: 0,
    volume: options.initialVolume ?? 1.0,
    error: null
  };
  
  // Set initial volume
  audioElement.volume = audioState.volume;
  
  // Event callbacks
  const stateChangeCallback = options.onStateChange || (() => {});
  const endedCallback = options.onEnded || (() => {});
  const errorCallback = options.onError || (() => {});
  
  // Update state and trigger callback
  const updateState = (updates: Partial<AudioPlayerState>) => {
    audioState = { ...audioState, ...updates };
    stateChangeCallback(audioState);
  };
  
  // Set up event listeners
  audioElement.addEventListener('loadedmetadata', () => {
    updateState({ 
      duration: audioElement.duration,
      isPlaying: !audioElement.paused,
      isPaused: audioElement.paused
    });
  });
  
  audioElement.addEventListener('timeupdate', () => {
    updateState({ currentTime: audioElement.currentTime });
  });
  
  audioElement.addEventListener('play', () => {
    updateState({ isPlaying: true, isPaused: false });
  });
  
  audioElement.addEventListener('pause', () => {
    updateState({ isPlaying: false, isPaused: true });
  });
  
  audioElement.addEventListener('ended', () => {
    updateState({ isPlaying: false, isPaused: false });
    endedCallback();
  });
  
  audioElement.addEventListener('error', (e) => {
    const error = new Error(`Audio playback error: ${audioElement.error?.message || 'Unknown error'}`);
    updateState({ error, isPlaying: false });
    errorCallback(error);
  });
  
  /**
   * Play audio from a specified source (URL, Blob, or Base64 string)
   * 
   * @param source - Audio source (URL string, Blob, or Base64 string)
   * @returns Promise that resolves when audio begins playing
   */
  const play = async (source: string | Blob): Promise<void> => {
    try {
      // Reset error state
      updateState({ error: null });
      
      // Revoke previous object URL if one exists
      if (typeof currentSource === 'string' && currentSource.startsWith('blob:')) {
        URL.revokeObjectURL(currentSource);
      }
      
      // Convert source to a playable URL
      let sourceUrl: string;
      
      if (typeof source === 'string') {
        // Check if it's a base64 string
        if (source.startsWith('data:') || /^[A-Za-z0-9+/=]+$/.test(source)) {
          // Convert base64 to blob and create object URL
          const blob = convertBase64ToBlob(
            source, 
            source.startsWith('data:audio') ? source.split(';')[0].split(':')[1] : 'audio/mp3'
          );
          sourceUrl = URL.createObjectURL(blob);
        } else {
          // Direct URL
          sourceUrl = source;
        }
      } else {
        // Blob source
        sourceUrl = URL.createObjectURL(source);
      }
      
      // Update current source
      currentSource = sourceUrl;
      
      // Set the source and load the audio
      audioElement.src = sourceUrl;
      await audioElement.load();
      
      // Play the audio
      await audioElement.play();
      
      // Update state
      updateState({ 
        isPlaying: true, 
        isPaused: false
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to play audio');
      updateState({ 
        error,
        isPlaying: false,
        isPaused: false 
      });
      errorCallback(error);
      throw error;
    }
  };
  
  /**
   * Pause audio playback
   */
  const pause = (): void => {
    if (audioElement.src && !audioElement.paused) {
      audioElement.pause();
      updateState({ isPlaying: false, isPaused: true });
    }
  };
  
  /**
   * Resume audio playback if paused
   */
  const resume = async (): Promise<void> => {
    if (audioElement.src && audioElement.paused && audioElement.currentTime > 0) {
      try {
        await audioElement.play();
        updateState({ isPlaying: true, isPaused: false });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to resume audio');
        updateState({ error });
        errorCallback(error);
        throw error;
      }
    }
  };
  
  /**
   * Stop audio playback and reset position
   */
  const stop = (): void => {
    if (audioElement.src) {
      audioElement.pause();
      audioElement.currentTime = 0;
      updateState({ 
        isPlaying: false, 
        isPaused: false, 
        currentTime: 0 
      });
    }
  };
  
  /**
   * Seek to a specific time in the audio
   * 
   * @param time - Time position in seconds to seek to
   */
  const seek = (time: number): void => {
    if (audioElement.src && isFinite(time) && time >= 0 && time <= audioElement.duration) {
      audioElement.currentTime = time;
      updateState({ currentTime: time });
    }
  };
  
  /**
   * Set the volume level
   * 
   * @param level - Volume level between 0.0 and 1.0
   */
  const setVolume = (level: number): void => {
    if (isFinite(level) && level >= 0 && level <= 1) {
      audioElement.volume = level;
      updateState({ volume: level });
    }
  };
  
  /**
   * Set the playback rate
   * 
   * @param rate - Playback rate (1.0 = normal speed)
   */
  const setPlaybackRate = (rate: number): void => {
    if (isFinite(rate) && rate > 0) {
      audioElement.playbackRate = rate;
    }
  };
  
  /**
   * Get the current state of the audio player
   * 
   * @returns Current audio player state
   */
  const getState = (): AudioPlayerState => {
    return { ...audioState };
  };
  
  /**
   * Add an event listener to the audio element
   * 
   * @param event - Event name
   * @param callback - Event handler function
   */
  const addEventListener = (
    event: string, 
    callback: EventListenerOrEventListenerObject
  ): void => {
    audioElement.addEventListener(event, callback);
  };
  
  /**
   * Remove an event listener from the audio element
   * 
   * @param event - Event name
   * @param callback - Event handler function
   */
  const removeEventListener = (
    event: string, 
    callback: EventListenerOrEventListenerObject
  ): void => {
    audioElement.removeEventListener(event, callback);
  };
  
  /**
   * Clean up resources used by the audio player
   */
  const destroy = (): void => {
    // Stop any playback
    stop();
    
    // Remove event listeners
    audioElement.onloadedmetadata = null;
    audioElement.ontimeupdate = null;
    audioElement.onplay = null;
    audioElement.onpause = null;
    audioElement.onended = null;
    audioElement.onerror = null;
    
    // Release source
    audioElement.src = '';
    
    // Revoke object URL if one exists
    if (typeof currentSource === 'string' && currentSource.startsWith('blob:')) {
      URL.revokeObjectURL(currentSource);
    }
    
    currentSource = null;
  };
  
  // Return the player instance with all methods
  return {
    play,
    pause,
    resume,
    stop,
    seek,
    setVolume,
    setPlaybackRate,
    getState,
    addEventListener,
    removeEventListener,
    destroy
  };
};

export default createAudioPlayer;