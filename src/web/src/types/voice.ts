/**
 * Voice-related TypeScript interfaces, types, and enums for the Personal AI Agent.
 * Defines types for speech-to-text transcription, text-to-speech synthesis,
 * voice state management, and voice control components.
 */

/**
 * Enum representing the current state of voice interaction
 */
export enum VoiceState {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  SPEAKING = 'speaking',
  ERROR = 'error'
}

/**
 * Enum for speech-to-text model options
 * Based on OpenAI Whisper models - version 20231117
 */
export enum SpeechModel {
  WHISPER_TINY = 'whisper-tiny',
  WHISPER_BASE = 'whisper-base',
  WHISPER_SMALL = 'whisper-small',
  WHISPER_MEDIUM = 'whisper-medium',
  WHISPER_LARGE = 'whisper-large'
}

/**
 * Enum for audio format options
 */
export enum AudioFormat {
  MP3 = 'mp3',
  WAV = 'wav',
  OGG = 'ogg'
}

/**
 * Interface for speech-to-text transcription requests
 */
export interface TranscriptionRequest {
  /**
   * The speech-to-text model to use
   */
  model: SpeechModel;
  
  /**
   * ISO 639-1 language code (e.g., 'en', 'fr', 'es')
   * If not specified, the model will attempt to detect the language
   */
  language?: string;
  
  /**
   * Optional prompt to guide the transcription
   */
  prompt?: string;
  
  /**
   * Model temperature, controls randomness. Range: 0.0 to 1.0
   * Lower values for more focused and deterministic outputs
   */
  temperature?: number;
  
  /**
   * Whether to automatically detect the language of the audio
   */
  detect_language?: boolean;
}

/**
 * Interface for speech-to-text transcription responses
 */
export interface TranscriptionResponse {
  /**
   * The transcribed text
   */
  text: string;
  
  /**
   * Detected or specified language of the audio
   */
  language: string;
  
  /**
   * Duration of the processed audio in seconds
   */
  duration: number;
  
  /**
   * Confidence score of the transcription (0.0 to 1.0)
   */
  confidence: number;
  
  /**
   * Array of segments with timestamps
   */
  segments?: Array<{
    start: number; // Start time in seconds
    end: number;   // End time in seconds
    text: string;  // Text in this segment
  }>;
}

/**
 * Interface for text-to-speech synthesis requests
 */
export interface SynthesisRequest {
  /**
   * ID of the voice to use for synthesis
   */
  voice_id: string;
  
  /**
   * Speech speed modifier (default: 1.0)
   * Range typically from 0.5 (slower) to 2.0 (faster)
   */
  speed?: number;
  
  /**
   * Voice pitch modifier (default: 1.0)
   * Range typically from 0.5 (lower) to 2.0 (higher)
   */
  pitch?: number;
  
  /**
   * Output audio format
   */
  format?: AudioFormat;
  
  /**
   * TTS provider to use (e.g., 'elevenlabs', 'native', 'coqui')
   */
  provider?: string;
}

/**
 * Interface for text-to-speech synthesis responses
 */
export interface SynthesisResponse {
  /**
   * The synthesized audio data as a Blob
   */
  audio_data: Blob;
  
  /**
   * Duration of the audio in seconds
   */
  duration: number;
  
  /**
   * Format of the audio data
   */
  format: AudioFormat;
  
  /**
   * ID of the voice used for synthesis
   */
  voice_id: string;
}

/**
 * Interface for voice information
 */
export interface VoiceInfo {
  /**
   * Unique identifier for the voice
   */
  id: string;
  
  /**
   * Display name of the voice
   */
  name: string;
  
  /**
   * Provider of the voice (e.g., 'elevenlabs', 'native', 'coqui')
   */
  provider: string;
  
  /**
   * Language of the voice as ISO 639-1 code
   */
  language: string;
  
  /**
   * Gender of the voice ('male', 'female', 'neutral')
   */
  gender: string;
  
  /**
   * URL to a preview audio clip of the voice
   */
  preview_url?: string;
  
  /**
   * Description of the voice characteristics
   */
  description?: string;
}

/**
 * Interface for requesting available voices
 */
export interface VoiceListRequest {
  /**
   * Optional provider to filter voices by
   */
  provider?: string;
  
  /**
   * Optional language code to filter voices by
   */
  language?: string;
  
  /**
   * Whether to refresh the cached voice list
   */
  force_refresh?: boolean;
}

/**
 * Interface for response containing available voices
 */
export interface VoiceListResponse {
  /**
   * Array of available voices
   */
  voices: VoiceInfo[];
}

/**
 * Interface for microphone state information
 */
export interface MicrophoneState {
  /**
   * Whether the microphone is currently recording
   */
  isRecording: boolean;
  
  /**
   * Whether recording is paused
   */
  isPaused: boolean;
  
  /**
   * Current audio level (0.0 to 1.0)
   */
  audioLevel: number;
  
  /**
   * Duration of the current recording in seconds
   */
  duration: number;
  
  /**
   * Error object if there's an issue with the microphone
   */
  error: Error | null;
}

/**
 * Interface for audio player state information
 */
export interface AudioPlayerState {
  /**
   * Whether audio is currently playing
   */
  isPlaying: boolean;
  
  /**
   * Whether audio playback is paused
   */
  isPaused: boolean;
  
  /**
   * Total duration of the current audio in seconds
   */
  duration: number;
  
  /**
   * Current playback position in seconds
   */
  currentTime: number;
  
  /**
   * Current volume level (0.0 to 1.0)
   */
  volume: number;
  
  /**
   * Error object if there's an issue with the audio player
   */
  error: Error | null;
}

/**
 * Interface for voice control component props
 */
export interface VoiceControlProps {
  /**
   * Callback function when transcription is complete
   * @param text The transcribed text
   */
  onTranscription: (text: string) => void;
  
  /**
   * Whether the voice control is disabled
   */
  disabled?: boolean;
  
  /**
   * CSS class name for styling
   */
  className?: string;
  
  /**
   * Whether to show tooltips for the voice control
   */
  showTooltip?: boolean;
  
  /**
   * Size of the voice control ('small', 'medium', 'large')
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Options for speech-to-text transcription
   */
  transcriptionOptions?: Partial<TranscriptionRequest>;
}

/**
 * Interface for voice hook options
 */
export interface VoiceHookOptions {
  /**
   * Whether to automatically start listening on hook initialization
   */
  autoStart?: boolean;
  
  /**
   * Options for speech-to-text transcription
   */
  transcriptionOptions?: Partial<TranscriptionRequest>;
  
  /**
   * Options for text-to-speech synthesis
   */
  synthesisOptions?: Partial<SynthesisRequest>;
  
  /**
   * Callback for voice state changes
   */
  onStateChange?: (state: VoiceState) => void;
  
  /**
   * Callback for when transcription is complete
   */
  onTranscription?: (text: string) => void;
  
  /**
   * Callback for errors
   */
  onError?: (error: Error) => void;
}

/**
 * Interface for voice hook result
 */
export interface VoiceHookResult {
  /**
   * Current state of voice interaction
   */
  state: VoiceState;
  
  /**
   * Whether the system is currently listening for speech
   */
  isListening: boolean;
  
  /**
   * Whether the system is currently speaking
   */
  isSpeaking: boolean;
  
  /**
   * Whether the system is processing audio
   */
  isProcessing: boolean;
  
  /**
   * Error object if there's an issue
   */
  error: Error | null;
  
  /**
   * Current transcription text
   */
  transcript: string;
  
  /**
   * Current audio input level (0.0 to 1.0)
   */
  audioLevel: number;
  
  /**
   * Function to start listening for speech
   */
  startListening: () => Promise<void>;
  
  /**
   * Function to stop listening and process the speech
   */
  stopListening: () => Promise<void>;
  
  /**
   * Function to cancel listening without processing
   */
  cancelListening: () => void;
  
  /**
   * Function to convert text to speech and play it
   * @param text The text to speak
   * @param options Optional synthesis options
   */
  speak: (text: string, options?: Partial<SynthesisRequest>) => Promise<void>;
  
  /**
   * Function to stop speaking
   */
  stopSpeaking: () => void;
  
  /**
   * Whether voice functionality is supported in the current environment
   */
  isSupported: boolean;
  
  /**
   * Array of available voices
   */
  availableVoices: VoiceInfo[];
  
  /**
   * Function to load or refresh the available voices
   * @param options Optional request options
   */
  loadVoices: (options?: Partial<VoiceListRequest>) => Promise<VoiceInfo[]>;
}