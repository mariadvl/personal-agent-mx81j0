/**
 * Voice Service
 * 
 * Provides voice-related functionality for the Personal AI Agent, including speech-to-text transcription
 * and text-to-speech synthesis. This service acts as a bridge between the frontend UI components 
 * and the backend voice processing APIs.
 * 
 * @version 1.0.0
 */

import { API_ROUTES } from '../constants/apiRoutes';
import { post, get, uploadFile } from './api';
import createAudioRecorder from './audioRecorder';
import createAudioPlayer from './audioPlayer';
import {
  TranscriptionRequest,
  TranscriptionResponse,
  SynthesisRequest,
  SynthesisResponse,
  VoiceInfo,
  VoiceListRequest,
  VoiceListResponse,
  VoiceState,
  SpeechModel,
  AudioFormat
} from '../types/voice';

// Default options for speech-to-text transcription
const DEFAULT_TRANSCRIPTION_OPTIONS: Partial<TranscriptionRequest> = {
  model: SpeechModel.WHISPER_BASE,
  language: 'en',
  detect_language: false,
  temperature: 0.0
};

// Default options for text-to-speech synthesis
const DEFAULT_SYNTHESIS_OPTIONS: Partial<SynthesisRequest> = {
  voice_id: 'default',
  speed: 1.0,
  pitch: 1.0,
  format: AudioFormat.MP3,
  provider: 'elevenlabs'
};

// Cache duration for voice list (24 hours in milliseconds)
const VOICE_CACHE_DURATION = 24 * 60 * 60 * 1000;

/**
 * Transcribes audio data to text using the backend API
 * 
 * @param audioData - Audio data as Blob or File
 * @param options - Optional transcription settings
 * @returns Promise resolving to transcription result containing the recognized text
 */
export const transcribeAudio = async (
  audioData: Blob | File,
  options: Partial<TranscriptionRequest> = {}
): Promise<TranscriptionResponse> => {
  try {
    // Merge options with defaults
    const transcriptionOptions = {
      ...DEFAULT_TRANSCRIPTION_OPTIONS,
      ...options
    };
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', audioData);
    
    // Add transcription options to form data
    Object.entries(transcriptionOptions).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value));
      }
    });
    
    // Send to backend API
    const response = await uploadFile<TranscriptionResponse>(
      API_ROUTES.VOICE.TRANSCRIBE,
      audioData,
      {
        additionalData: transcriptionOptions
      }
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to transcribe audio');
    }
    
    return response.data;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
};

/**
 * Converts text to speech using the backend API
 * 
 * @param text - Text to convert to speech
 * @param options - Optional synthesis settings
 * @returns Promise resolving to synthesis result containing the generated audio
 */
export const synthesizeSpeech = async (
  text: string,
  options: Partial<SynthesisRequest> = {}
): Promise<SynthesisResponse> => {
  try {
    // Merge options with defaults
    const synthesisOptions = {
      ...DEFAULT_SYNTHESIS_OPTIONS,
      ...options
    };
    
    // Send to backend API
    const response = await post<SynthesisResponse>(
      API_ROUTES.VOICE.SYNTHESIZE,
      {
        text,
        ...synthesisOptions
      },
      {
        responseType: 'blob'
      }
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to synthesize speech');
    }
    
    let audioData: Blob;
    let duration = 0;
    
    // Handle different response formats
    if (response.data instanceof Blob) {
      // API returned a direct Blob
      audioData = response.data;
    } else if (response.data.audio_data instanceof Blob) {
      // API returned a structured response with blob
      audioData = response.data.audio_data;
      duration = response.data.duration || 0;
    } else {
      // Unexpected response format
      throw new Error('Invalid response format from speech synthesis API');
    }
    
    // Return properly formatted response
    return {
      audio_data: audioData,
      duration: duration,
      format: synthesisOptions.format || AudioFormat.MP3,
      voice_id: synthesisOptions.voice_id || 'default'
    };
  } catch (error) {
    console.error('Speech synthesis error:', error);
    throw error;
  }
};

/**
 * Retrieves list of available voices from the backend API
 * 
 * @param options - Optional request parameters
 * @returns Promise resolving to array of available voice options
 */
export const getAvailableVoices = async (
  options: Partial<VoiceListRequest> = {}
): Promise<VoiceInfo[]> => {
  // Internal cache structure
  interface VoiceCache {
    voices: VoiceInfo[];
    timestamp: number;
  }
  
  // Module-level cache variable
  let voicesCache: VoiceCache | null = null;
  
  try {
    // Check if we have cached voices and they're not expired
    const now = Date.now();
    if (
      voicesCache && 
      voicesCache.voices.length > 0 && 
      now - voicesCache.timestamp < VOICE_CACHE_DURATION &&
      !options.force_refresh
    ) {
      // Filter cached voices if provider or language is specified
      let filteredVoices = voicesCache.voices;
      
      if (options.provider) {
        filteredVoices = filteredVoices.filter(
          voice => voice.provider === options.provider
        );
      }
      
      if (options.language) {
        filteredVoices = filteredVoices.filter(
          voice => voice.language === options.language
        );
      }
      
      return filteredVoices;
    }
    
    // Fetch voices from API
    const response = await get<VoiceListResponse>(
      API_ROUTES.VOICE.VOICES,
      { ...options }
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get available voices');
    }
    
    // Cache the voices
    voicesCache = {
      voices: response.data.voices,
      timestamp: now
    };
    
    return response.data.voices;
  } catch (error) {
    console.error('Failed to get available voices:', error);
    
    // If we have cached voices, return them as fallback
    if (voicesCache && voicesCache.voices.length > 0) {
      console.warn('Using cached voices as fallback');
      return voicesCache.voices;
    }
    
    throw error;
  }
};

/**
 * Creates a voice service instance with methods for voice interaction
 * 
 * @returns Voice service instance with methods for transcription and synthesis
 */
export const createVoiceService = () => {
  type EventType = 'state-change' | 'error' | 'listening-start' | 'listening-stop' | 
                  'listening-cancel' | 'transcription' | 'speech-start' | 'speech-end' | 'speech-stop';
  
  // Initialize state
  let recorder: ReturnType<typeof createAudioRecorder> | null = null;
  let player: ReturnType<typeof createAudioPlayer> | null = null;
  let currentState: VoiceState = VoiceState.IDLE;
  let eventListeners: { [key in EventType]?: Function[] } = {};
  
  // Initialize audio recorder
  const initRecorder = () => {
    if (!recorder) {
      try {
        recorder = createAudioRecorder();
        
        // Set up recorder event listeners
        recorder.addEventListener('start', () => {
          setState(VoiceState.LISTENING);
        });
        
        recorder.addEventListener('stop', () => {
          if (currentState === VoiceState.LISTENING) {
            setState(VoiceState.PROCESSING);
          }
        });
        
        recorder.addEventListener('error', (event) => {
          setState(VoiceState.ERROR);
          emitEvent('error', { error: event.error });
        });
        
        recorder.addEventListener('audioLevel', (event) => {
          emitEvent('audio-level', { level: event.data?.level || 0 });
        });
      } catch (error) {
        console.error('Failed to initialize audio recorder:', error);
        setState(VoiceState.ERROR);
        emitEvent('error', { error });
      }
    }
    return recorder;
  };
  
  // Initialize audio player
  const initPlayer = () => {
    if (!player) {
      player = createAudioPlayer({
        onStateChange: (state) => {
          if (state.isPlaying) {
            setState(VoiceState.SPEAKING);
          } else if (currentState === VoiceState.SPEAKING) {
            setState(VoiceState.IDLE);
          }
        },
        onEnded: () => {
          setState(VoiceState.IDLE);
          emitEvent('speech-end', {});
        },
        onError: (error) => {
          setState(VoiceState.ERROR);
          emitEvent('error', { error });
        }
      });
    }
    return player;
  };
  
  // Update state and emit events
  const setState = (newState: VoiceState) => {
    if (currentState !== newState) {
      const previousState = currentState;
      currentState = newState;
      emitEvent('state-change', { previous: previousState, current: newState });
    }
  };
  
  // Emit event to listeners
  const emitEvent = (eventName: string, data: any) => {
    const listeners = eventListeners[eventName as EventType];
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in voice service event listener (${eventName}):`, error);
        }
      });
    }
  };
  
  // Start listening for speech
  const startListening = async (options?: Partial<TranscriptionRequest>) => {
    try {
      const rec = initRecorder();
      if (!rec) {
        throw new Error('Recorder not available');
      }
      
      await rec.startRecording();
      emitEvent('listening-start', {});
    } catch (error) {
      setState(VoiceState.ERROR);
      emitEvent('error', { error });
      throw error;
    }
  };
  
  // Stop listening and transcribe speech
  const stopListening = async (): Promise<string> => {
    try {
      const rec = initRecorder();
      if (!rec) {
        throw new Error('Recorder not available');
      }
      
      setState(VoiceState.PROCESSING);
      emitEvent('listening-stop', {});
      
      // Stop recording and get audio blob
      const audioBlob = await rec.stopRecording();
      
      // Transcribe the audio
      const result = await transcribeAudio(audioBlob);
      
      setState(VoiceState.IDLE);
      emitEvent('transcription', { text: result.text });
      
      return result.text;
    } catch (error) {
      setState(VoiceState.ERROR);
      emitEvent('error', { error });
      throw error;
    }
  };
  
  // Cancel listening without transcribing
  const cancelListening = () => {
    try {
      const rec = initRecorder();
      if (rec) {
        rec.cancelRecording();
      }
      setState(VoiceState.IDLE);
      emitEvent('listening-cancel', {});
    } catch (error) {
      setState(VoiceState.ERROR);
      emitEvent('error', { error });
    }
  };
  
  // Speak text using text-to-speech
  const speak = async (text: string, options?: Partial<SynthesisRequest>): Promise<void> => {
    try {
      const p = initPlayer();
      if (!p) {
        throw new Error('Audio player not available');
      }
      
      // Generate speech
      setState(VoiceState.PROCESSING);
      const result = await synthesizeSpeech(text, options);
      
      // Play the audio
      await p.play(result.audio_data);
      
      emitEvent('speech-start', { text });
    } catch (error) {
      setState(VoiceState.ERROR);
      emitEvent('error', { error });
      throw error;
    }
  };
  
  // Stop speaking
  const stopSpeaking = () => {
    try {
      if (player) {
        player.stop();
      }
      
      if (currentState === VoiceState.SPEAKING) {
        setState(VoiceState.IDLE);
      }
      
      emitEvent('speech-stop', {});
    } catch (error) {
      setState(VoiceState.ERROR);
      emitEvent('error', { error });
    }
  };
  
  // Add event listener
  const addEventListener = (event: string, callback: Function) => {
    if (!eventListeners[event as EventType]) {
      eventListeners[event as EventType] = [];
    }
    eventListeners[event as EventType]?.push(callback);
  };
  
  // Remove event listener
  const removeEventListener = (event: string, callback: Function) => {
    if (eventListeners[event as EventType]) {
      eventListeners[event as EventType] = eventListeners[event as EventType]?.filter(
        listener => listener !== callback
      );
    }
  };
  
  // Clean up resources
  const destroy = () => {
    if (recorder) {
      recorder.destroy();
      recorder = null;
    }
    
    if (player) {
      player.destroy();
      player = null;
    }
    
    eventListeners = {};
    currentState = VoiceState.IDLE;
  };
  
  return {
    startListening,
    stopListening,
    cancelListening,
    speak,
    stopSpeaking,
    getAvailableVoices: async (options?: Partial<VoiceListRequest>) => 
      getAvailableVoices(options),
    isVoiceSupported,
    addEventListener,
    removeEventListener,
    getState: () => currentState,
    destroy
  };
};

/**
 * Checks if the browser supports voice input and output
 * 
 * @returns True if voice features are supported, false otherwise
 */
export const isVoiceSupported = (): boolean => {
  // Check for MediaRecorder API
  const hasMediaRecorder = typeof window !== 'undefined' && 
    'MediaRecorder' in window;
  
  // Check for getUserMedia API
  const hasGetUserMedia = typeof navigator !== 'undefined' && 
    'mediaDevices' in navigator && 
    'getUserMedia' in navigator.mediaDevices;
  
  // Check for AudioContext
  const hasAudioContext = typeof window !== 'undefined' && 
    !!(window.AudioContext || window.webkitAudioContext);
  
  return hasMediaRecorder && hasGetUserMedia && hasAudioContext;
};

// Default export the factory function
export default createVoiceService;