import { useState, useEffect, useCallback, useRef } from 'react';
import { MicrophoneState } from '../types/voice';
import createAudioRecorder from '../services/audioRecorder';

/**
 * Options for configuring the microphone recorder behavior
 */
interface UseMicrophoneOptions {
  /** Whether to enable silence detection */
  silenceDetectionEnabled?: boolean;
  /** Threshold for silence detection (0.0-1.0) */
  silenceThreshold?: number;
  /** Time in ms to wait before considering silence as end of speech */
  silenceTimeout?: number;
  /** Whether to automatically stop recording after silence is detected */
  autoStopAfterSilence?: boolean;
  /** Maximum recording time in milliseconds */
  maxRecordingTime?: number;
  /** Sample rate for audio recording (Hz) */
  sampleRate?: number;
  /** Whether to enable audio processing like noise reduction */
  audioProcessing?: boolean;
  /** Desired MIME type for the output audio */
  mimeType?: string;
  /** Callback when audio data becomes available */
  onDataAvailable?: (data: Blob) => void;
  /** Callback when audio level changes */
  onAudioLevelChange?: (level: number) => void;
}

/** Permission states for microphone access */
type PermissionState = 'granted' | 'denied' | 'prompt';

/**
 * React hook that provides microphone access and voice recording functionality
 * with state management for UI integration.
 * 
 * @param options - Configuration options for the microphone
 * @returns Object containing microphone state and control functions
 */
const useMicrophone = (options: UseMicrophoneOptions = {}) => {
  // Initialize microphone state
  const [state, setState] = useState<MicrophoneState>({
    isRecording: false,
    isPaused: false,
    audioLevel: 0,
    duration: 0,
    error: null
  });

  // Refs to hold recorder instance and permission status
  const recorderRef = useRef<ReturnType<typeof createAudioRecorder> | null>(null);
  const permissionRef = useRef<PermissionState>('prompt');
  
  // Check if audio recording is supported in this browser
  const isSupported = typeof window !== 'undefined' && 
    !!(navigator.mediaDevices && 
       navigator.mediaDevices.getUserMedia && 
       window.MediaRecorder);

  /**
   * Get or create the audio recorder instance
   */
  const getRecorder = useCallback(() => {
    if (!recorderRef.current && isSupported) {
      try {
        recorderRef.current = createAudioRecorder({
          ...options
        });
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error : new Error(String(error)) 
        }));
      }
    }
    return recorderRef.current;
  }, [options, isSupported]);

  /**
   * Start recording audio from the microphone
   * 
   * @param recordOptions - Optional configuration to override defaults
   * @returns Promise that resolves when recording has started
   */
  const startRecording = useCallback(async (recordOptions?: Partial<UseMicrophoneOptions>) => {
    const recorder = getRecorder();
    if (!recorder) return;

    try {
      await recorder.startRecording(recordOptions);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error(String(error)) 
      }));
    }
  }, [getRecorder]);

  /**
   * Stop recording and return the recorded audio as a Blob
   * 
   * @returns Promise resolving to the recorded audio Blob
   */
  const stopRecording = useCallback(async (): Promise<Blob> => {
    const recorder = recorderRef.current;
    if (!recorder) return new Blob();

    try {
      return await recorder.stopRecording();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error(String(error)) 
      }));
      return new Blob();
    }
  }, []);

  /**
   * Pause the current recording
   */
  const pauseRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && state.isRecording && !state.isPaused) {
      recorder.pauseRecording();
    }
  }, [state.isRecording, state.isPaused]);

  /**
   * Resume a paused recording
   */
  const resumeRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && state.isRecording && state.isPaused) {
      recorder.resumeRecording();
    }
  }, [state.isRecording, state.isPaused]);

  /**
   * Cancel recording without saving
   */
  const cancelRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && state.isRecording) {
      recorder.cancelRecording();
    }
  }, [state.isRecording]);

  /**
   * Request microphone permission from the user
   * 
   * @returns Promise resolving to the permission state
   */
  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    if (!isSupported) {
      permissionRef.current = 'denied';
      return 'denied';
    }

    try {
      const recorder = getRecorder();
      if (recorder) {
        await recorder.requestMicrophonePermission();
        permissionRef.current = 'granted';
        return 'granted';
      }
      return 'denied';
    } catch (error) {
      permissionRef.current = 'denied';
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error(String(error)) 
      }));
      return 'denied';
    }
  }, [getRecorder, isSupported]);

  /**
   * Check current microphone permission status
   * 
   * @returns Promise resolving to the current permission state
   */
  const checkPermission = useCallback(async (): Promise<PermissionState> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      // Try to use the Permissions API if available
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        switch (result.state) {
          case 'granted':
            permissionRef.current = 'granted';
            return 'granted';
          case 'denied':
            permissionRef.current = 'denied';
            return 'denied';
          default:
            permissionRef.current = 'prompt';
            return 'prompt';
        }
      }
      
      // Otherwise, return the stored permission state
      return permissionRef.current;
    } catch (error) {
      // Permissions API might throw if 'microphone' is not supported
      return permissionRef.current;
    }
  }, [isSupported]);

  // Initialize recorder on mount and clean up on unmount
  useEffect(() => {
    if (isSupported) {
      getRecorder();
    }
    
    return () => {
      // Clean up on unmount
      if (recorderRef.current) {
        recorderRef.current.destroy();
        recorderRef.current = null;
      }
    };
  }, [getRecorder, isSupported]);

  // Set up state update when recorder state changes
  useEffect(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    // Update state from recorder
    const updateState = () => {
      const recorderState = recorder.getState();
      setState(recorderState);
    };

    // Set up event listeners
    const handleStateChange = () => {
      updateState();
    };

    const handleAudioLevel = (event: any) => {
      if (options.onAudioLevelChange && event.data?.level) {
        options.onAudioLevelChange(event.data.level);
      }
    };

    const handleDataAvailable = (event: any) => {
      if (options.onDataAvailable && event.data) {
        options.onDataAvailable(event.data);
      }
    };

    // Listen for events that should trigger state updates
    recorder.addEventListener('start', handleStateChange);
    recorder.addEventListener('stop', handleStateChange);
    recorder.addEventListener('pause', handleStateChange);
    recorder.addEventListener('resume', handleStateChange);
    recorder.addEventListener('error', handleStateChange);
    recorder.addEventListener('audioLevel', handleAudioLevel);
    recorder.addEventListener('data', handleDataAvailable);

    // Set up an interval to regularly update state (for duration and audio level)
    const intervalId = setInterval(updateState, 100);

    // Clean up event listeners and interval
    return () => {
      if (recorder) {
        recorder.removeEventListener('start', handleStateChange);
        recorder.removeEventListener('stop', handleStateChange);
        recorder.removeEventListener('pause', handleStateChange);
        recorder.removeEventListener('resume', handleStateChange);
        recorder.removeEventListener('error', handleStateChange);
        recorder.removeEventListener('audioLevel', handleAudioLevel);
        recorder.removeEventListener('data', handleDataAvailable);
      }
      clearInterval(intervalId);
    };
  }, [options]);

  // Return the microphone state and control functions
  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    requestPermission,
    checkPermission,
    isSupported
  };
};

export default useMicrophone;