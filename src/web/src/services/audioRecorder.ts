/**
 * Audio Recorder Service
 * 
 * Provides functionality for recording audio input from the user's microphone.
 * Handles microphone access, audio processing, and conversion to formats suitable
 * for speech-to-text processing in the Personal AI Agent.
 * 
 * @version 1.0.0
 */

import { MicrophoneState } from '../types/voice';
import { 
  detectSilence, 
  calculateAudioLevel, 
  convertAudioBufferToWav,
  createAudioContext
} from '../utils/audioUtils';

// Type definitions for the audio recorder
interface AudioRecorderOptions {
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
}

/** Event types that the recorder can emit */
type AudioRecorderEventType = 'start' | 'stop' | 'pause' | 'resume' | 'data' | 'error' | 'silence' | 'audioLevel';

/** Listener function type for recorder events */
interface AudioRecorderEventListener {
  (event: {
    type: AudioRecorderEventType;
    data?: any;
    error?: Error;
    recorder?: AudioRecorder;
  }): void;
}

/** Interface for the audio recorder instance */
interface AudioRecorder {
  /** Start recording audio */
  startRecording: (options?: Partial<AudioRecorderOptions>) => Promise<void>;
  /** Stop recording and return the recorded audio as a Blob */
  stopRecording: () => Promise<Blob>;
  /** Pause the current recording */
  pauseRecording: () => void;
  /** Resume a paused recording */
  resumeRecording: () => void;
  /** Cancel recording without saving */
  cancelRecording: () => void;
  /** Get the current recorder state */
  getState: () => MicrophoneState;
  /** Get the current audio input level (0.0-1.0) */
  getAudioLevel: () => number;
  /** Request microphone permission from the user */
  requestMicrophonePermission: () => Promise<MediaStream>;
  /** Add an event listener */
  addEventListener: (eventType: AudioRecorderEventType, listener: AudioRecorderEventListener) => void;
  /** Remove an event listener */
  removeEventListener: (eventType: AudioRecorderEventType, listener: AudioRecorderEventListener) => void;
  /** Clean up resources */
  destroy: () => void;
}

/**
 * Factory function that creates an audio recorder instance with methods for controlling audio recording
 * 
 * @param options - Configuration options for the audio recorder
 * @returns An audio recorder instance with methods for controlling recording
 * @throws Error if audio recording is not supported in the browser
 */
const createAudioRecorder = (options: Partial<AudioRecorderOptions> = {}): AudioRecorder => {
  // Check for browser support
  const isSupported = (): boolean => {
    return !!(navigator.mediaDevices && 
              navigator.mediaDevices.getUserMedia && 
              window.MediaRecorder && 
              (window.AudioContext || window.webkitAudioContext));
  };

  if (!isSupported()) {
    throw new Error('Audio recording is not supported in this browser');
  }

  // Default options
  const defaultOptions: AudioRecorderOptions = {
    silenceDetectionEnabled: true,
    silenceThreshold: 0.01,
    silenceTimeout: 1500, // ms
    autoStopAfterSilence: true,
    maxRecordingTime: 60000, // 1 minute
    sampleRate: 16000, // Hz (optimal for speech recognition)
    audioProcessing: true,
    mimeType: 'audio/wav'
  };

  // Merge with user options
  const recorderOptions: AudioRecorderOptions = {
    ...defaultOptions,
    ...options
  };

  // State variables
  let mediaStream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let audioContext: AudioContext | null = null;
  let analyserNode: AnalyserNode | null = null;
  let audioProcessor: ScriptProcessorNode | null = null;
  let audioChunks: Blob[] = [];
  let recordingStartTime: number = 0;
  let silenceDetectionTimer: number | null = null;
  let maxRecordingTimer: number | null = null;
  let audioLevelInterval: number | null = null;
  let isPaused: boolean = false;
  let isRecording: boolean = false;
  let audioLevel: number = 0;
  let recordingDuration: number = 0;
  let durationInterval: number | null = null;
  let recordingError: Error | null = null;
  let eventListeners: Map<AudioRecorderEventType, Set<AudioRecorderEventListener>> = new Map();

  /**
   * Set up audio processing pipeline for analyzing audio input
   * 
   * @param stream - The media stream from the microphone
   */
  const setupAudioProcessing = (stream: MediaStream): void => {
    try {
      audioContext = createAudioContext({ sampleRate: recorderOptions.sampleRate });
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create analyser for volume level monitoring
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 1024;
      analyserNode.smoothingTimeConstant = 0.8;
      source.connect(analyserNode);
      
      // Create script processor for silence detection if enabled
      if (recorderOptions.silenceDetectionEnabled) {
        // Using ScriptProcessorNode (deprecated but still widely supported)
        // In the future, this could be replaced with AudioWorkletNode
        audioProcessor = audioContext.createScriptProcessor(2048, 1, 1);
        
        audioProcessor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Calculate current audio level
          audioLevel = calculateAudioLevel(inputData);
          
          // Emit audio level event for visualization
          emitEvent('audioLevel', { level: audioLevel });
          
          // Check for silence if we're recording
          if (isRecording && !isPaused && recorderOptions.silenceDetectionEnabled) {
            const isSilent = detectSilence(inputData, { 
              threshold: recorderOptions.silenceThreshold 
            });
            
            if (isSilent) {
              // If silence is detected, start the silence timer if not already started
              if (silenceDetectionTimer === null) {
                silenceDetectionTimer = window.setTimeout(() => {
                  emitEvent('silence', {});
                  
                  // Auto-stop if enabled
                  if (recorderOptions.autoStopAfterSilence) {
                    stopRecording();
                  }
                }, recorderOptions.silenceTimeout);
              }
            } else {
              // If speech is detected, clear the silence timer
              if (silenceDetectionTimer !== null) {
                window.clearTimeout(silenceDetectionTimer);
                silenceDetectionTimer = null;
              }
            }
          }
        };
        
        source.connect(audioProcessor);
        audioProcessor.connect(audioContext.destination);
      }
      
      // Start monitoring audio level
      if (!audioLevelInterval) {
        audioLevelInterval = window.setInterval(() => {
          if (analyserNode) {
            const dataArray = new Float32Array(analyserNode.fftSize);
            analyserNode.getFloatTimeDomainData(dataArray);
            audioLevel = calculateAudioLevel(dataArray);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to set up audio processing:', error);
      recordingError = error instanceof Error ? error : new Error(String(error));
      emitEvent('error', { error: recordingError });
    }
  };

  /**
   * Clean up audio processing resources
   */
  const cleanupAudioProcessing = (): void => {
    if (audioProcessor) {
      audioProcessor.disconnect();
      audioProcessor = null;
    }
    
    if (analyserNode) {
      analyserNode.disconnect();
      analyserNode = null;
    }
    
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(console.error);
      audioContext = null;
    }
    
    if (audioLevelInterval) {
      clearInterval(audioLevelInterval);
      audioLevelInterval = null;
    }
  };

  /**
   * Emit an event to all registered listeners
   * 
   * @param eventType - Type of event to emit
   * @param data - Data to include with the event
   */
  const emitEvent = (eventType: AudioRecorderEventType, data: any = {}): void => {
    const listeners = eventListeners.get(eventType);
    if (listeners) {
      const event = {
        type: eventType,
        ...data,
        recorder: recorder
      };
      
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in audio recorder event listener:', error);
        }
      });
    }
  };

  /**
   * Update recording duration
   */
  const updateDuration = (): void => {
    if (isRecording && !isPaused && recordingStartTime > 0) {
      recordingDuration = Date.now() - recordingStartTime;
    }
  };

  /**
   * Request permission to access the user's microphone
   * 
   * @returns Promise resolving to MediaStream when permission is granted
   * @throws Error if permission is denied or an error occurs
   */
  const requestMicrophonePermission = async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: recorderOptions.audioProcessing,
          noiseSuppression: recorderOptions.audioProcessing,
          autoGainControl: recorderOptions.audioProcessing
        }
      });
      
      mediaStream = stream;
      return stream;
    } catch (error) {
      recordingError = error instanceof Error ? error : new Error(String(error));
      emitEvent('error', { error: recordingError });
      throw recordingError;
    }
  };

  /**
   * Start recording audio from the microphone
   * 
   * @param startOptions - Optional configuration options to override defaults
   * @returns Promise that resolves when recording has started
   * @throws Error if recording fails to start
   */
  const startRecording = async (startOptions?: Partial<AudioRecorderOptions>): Promise<void> => {
    // Update options if provided
    if (startOptions) {
      Object.assign(recorderOptions, startOptions);
    }
    
    if (isRecording) {
      return; // Already recording
    }
    
    // Reset state
    audioChunks = [];
    recordingDuration = 0;
    recordingError = null;
    isPaused = false;
    
    try {
      // Get microphone access if we don't have it yet
      if (!mediaStream) {
        await requestMicrophonePermission();
      }
      
      if (!mediaStream) {
        throw new Error('Failed to get media stream');
      }
      
      // Set up audio processing pipeline
      setupAudioProcessing(mediaStream);
      
      // Create media recorder
      let mimeType = 'audio/webm;codecs=opus';
      
      // Try to use the preferred mime type, fall back to supported type
      if (MediaRecorder.isTypeSupported(mimeType)) {
        mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
      } else {
        // Fall back to browser default
        mediaRecorder = new MediaRecorder(mediaStream);
      }
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          emitEvent('data', { data: event.data });
        }
      };
      
      mediaRecorder.onstart = () => {
        isRecording = true;
        recordingStartTime = Date.now();
        
        // Start duration timer
        durationInterval = window.setInterval(updateDuration, 100);
        
        // Set maximum recording time if specified
        if (recorderOptions.maxRecordingTime && recorderOptions.maxRecordingTime > 0) {
          maxRecordingTimer = window.setTimeout(() => {
            stopRecording();
          }, recorderOptions.maxRecordingTime);
        }
        
        emitEvent('start', {});
      };
      
      mediaRecorder.onstop = () => {
        isRecording = false;
        
        // Clear all timers
        if (durationInterval) {
          clearInterval(durationInterval);
          durationInterval = null;
        }
        
        if (maxRecordingTimer) {
          clearTimeout(maxRecordingTimer);
          maxRecordingTimer = null;
        }
        
        if (silenceDetectionTimer) {
          clearTimeout(silenceDetectionTimer);
          silenceDetectionTimer = null;
        }
        
        emitEvent('stop', {});
      };
      
      mediaRecorder.onerror = (event) => {
        recordingError = new Error('MediaRecorder error: ' + event.error);
        emitEvent('error', { error: recordingError });
      };
      
      // Start recording - request data every 1 second
      mediaRecorder.start(1000);
      
    } catch (error) {
      recordingError = error instanceof Error ? error : new Error(String(error));
      emitEvent('error', { error: recordingError });
      throw recordingError;
    }
  };

  /**
   * Stop recording and get the recorded audio as a Blob
   * 
   * @returns Promise resolving to the recorded audio Blob
   */
  const stopRecording = async (): Promise<Blob> => {
    if (!isRecording || !mediaRecorder) {
      return new Blob([], { type: recorderOptions.mimeType });
    }
    
    return new Promise((resolve, reject) => {
      try {
        const handleStop = async () => {
          // Remove the event listener
          mediaRecorder?.removeEventListener('stop', handleStop);
          
          // Process the recorded chunks
          if (audioChunks.length === 0) {
            resolve(new Blob([], { type: recorderOptions.mimeType }));
            return;
          }
          
          // Combine all chunks
          const recordedBlob = new Blob(audioChunks, { 
            type: mediaRecorder?.mimeType || 'audio/webm' 
          });
          
          // If WAV is requested, convert to WAV format
          if (recorderOptions.mimeType === 'audio/wav' && recordedBlob.type !== 'audio/wav') {
            try {
              // Convert to ArrayBuffer
              const arrayBuffer = await recordedBlob.arrayBuffer();
              
              // Create audio context for decoding
              const context = createAudioContext({ sampleRate: recorderOptions.sampleRate });
              
              // Decode the audio
              const audioBuffer = await context.decodeAudioData(arrayBuffer);
              
              // Convert to WAV
              const wavBlob = convertAudioBufferToWav(audioBuffer);
              
              // Close the context
              await context.close();
              
              resolve(wavBlob);
            } catch (error) {
              console.error('Failed to convert to WAV:', error);
              // Fall back to original format
              resolve(recordedBlob);
            }
          } else {
            resolve(recordedBlob);
          }
        };
        
        // Add event listener for when recording stops
        mediaRecorder.addEventListener('stop', handleStop);
        
        // Stop the recording
        mediaRecorder.stop();
        
      } catch (error) {
        recordingError = error instanceof Error ? error : new Error(String(error));
        emitEvent('error', { error: recordingError });
        reject(recordingError);
      }
    });
  };

  /**
   * Pause the current recording
   */
  const pauseRecording = (): void => {
    if (isRecording && !isPaused && mediaRecorder && 'pause' in mediaRecorder) {
      try {
        mediaRecorder.pause();
        isPaused = true;
        emitEvent('pause', {});
      } catch (error) {
        recordingError = error instanceof Error ? error : new Error(String(error));
        emitEvent('error', { error: recordingError });
      }
    }
  };

  /**
   * Resume a paused recording
   */
  const resumeRecording = (): void => {
    if (isRecording && isPaused && mediaRecorder && 'resume' in mediaRecorder) {
      try {
        mediaRecorder.resume();
        isPaused = false;
        emitEvent('resume', {});
      } catch (error) {
        recordingError = error instanceof Error ? error : new Error(String(error));
        emitEvent('error', { error: recordingError });
      }
    }
  };

  /**
   * Cancel recording without saving the recorded audio
   */
  const cancelRecording = (): void => {
    if (!isRecording) {
      return;
    }
    
    try {
      // Clear all recorded data
      audioChunks = [];
      
      // Stop recording
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
      
      // Reset state
      isRecording = false;
      isPaused = false;
      recordingDuration = 0;
      
      // Clear all timers
      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }
      
      if (maxRecordingTimer) {
        clearTimeout(maxRecordingTimer);
        maxRecordingTimer = null;
      }
      
      if (silenceDetectionTimer) {
        clearTimeout(silenceDetectionTimer);
        silenceDetectionTimer = null;
      }
      
      emitEvent('stop', { cancelled: true });
    } catch (error) {
      recordingError = error instanceof Error ? error : new Error(String(error));
      emitEvent('error', { error: recordingError });
    }
  };

  /**
   * Get the current state of the recorder
   * 
   * @returns MicrophoneState object with current recorder state
   */
  const getState = (): MicrophoneState => {
    return {
      isRecording,
      isPaused,
      audioLevel,
      duration: recordingDuration / 1000, // Convert to seconds
      error: recordingError
    };
  };

  /**
   * Get the current audio input level (0.0-1.0)
   * 
   * @returns Audio level as a number between 0 and 1
   */
  const getAudioLevel = (): number => {
    return audioLevel;
  };

  /**
   * Add an event listener for recorder events
   * 
   * @param eventType - Type of event to listen for
   * @param listener - Callback function to execute when event occurs
   */
  const addEventListener = (eventType: AudioRecorderEventType, listener: AudioRecorderEventListener): void => {
    if (!eventListeners.has(eventType)) {
      eventListeners.set(eventType, new Set());
    }
    
    eventListeners.get(eventType)?.add(listener);
  };

  /**
   * Remove an event listener
   * 
   * @param eventType - Type of event to remove listener from
   * @param listener - Listener function to remove
   */
  const removeEventListener = (eventType: AudioRecorderEventType, listener: AudioRecorderEventListener): void => {
    const listeners = eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        eventListeners.delete(eventType);
      }
    }
  };

  /**
   * Clean up all resources used by the recorder
   */
  const destroy = (): void => {
    // Stop recording if active
    if (isRecording) {
      cancelRecording();
    }
    
    // Clean up audio processing
    cleanupAudioProcessing();
    
    // Stop and remove all media tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    
    // Clear all timers
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
    
    if (maxRecordingTimer) {
      clearTimeout(maxRecordingTimer);
      maxRecordingTimer = null;
    }
    
    if (silenceDetectionTimer) {
      clearTimeout(silenceDetectionTimer);
      silenceDetectionTimer = null;
    }
    
    if (audioLevelInterval) {
      clearInterval(audioLevelInterval);
      audioLevelInterval = null;
    }
    
    // Clear all event listeners
    eventListeners.clear();
    
    // Reset state
    mediaRecorder = null;
    isRecording = false;
    isPaused = false;
    audioLevel = 0;
    recordingDuration = 0;
    recordingError = null;
  };

  // The recorder instance
  const recorder: AudioRecorder = {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    getState,
    getAudioLevel,
    requestMicrophonePermission,
    addEventListener,
    removeEventListener,
    destroy
  };

  return recorder;
};

export default createAudioRecorder;