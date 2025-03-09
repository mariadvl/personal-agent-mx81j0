import { useState, useEffect, useCallback, useRef } from 'react'; // react version ^18.2.0
import createVoiceService, {
  isVoiceSupported
} from '../services/voiceService';
import {
  VoiceState,
  VoiceHookOptions,
  VoiceHookResult,
  VoiceInfo,
  TranscriptionRequest,
  SynthesisRequest
} from '../types/voice';
import { useSettingsStore } from '../store/settingsStore';

/**
 * React hook that provides voice interaction capabilities for the Personal AI Agent
 * 
 * This hook wraps the voice service to create a React-friendly interface for
 * using voice commands and responses in components, managing state, and applying
 * user preferences from settings.
 * 
 * @param options - Configuration options for voice behavior
 * @returns Object containing voice state and control functions
 */
const useVoice = (options: VoiceHookOptions = {}): VoiceHookResult => {
  // Get voice settings from the settings store
  const { settings } = useSettingsStore();
  const voiceSettings = settings.voice_settings;

  // State for current voice interaction
  const [state, setState] = useState<VoiceState>(VoiceState.IDLE);
  const [transcript, setTranscript] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);
  const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([]);

  // Refs for service instance and cleanup functions
  const voiceServiceRef = useRef<ReturnType<typeof createVoiceService> | null>(null);
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);

  // Initialize the voice service
  useEffect(() => {
    if (!isVoiceSupported()) {
      return;
    }

    try {
      // Create voice service instance
      voiceServiceRef.current = createVoiceService();

      // Set up event listeners
      const onStateChange = (event: any) => {
        const newState = event.current;
        setState(newState);

        // Call the onStateChange callback if provided
        if (options.onStateChange) {
          options.onStateChange(newState);
        }
      };

      const onError = (event: any) => {
        const newError = event.error;
        setError(newError);

        // Call the onError callback if provided
        if (options.onError) {
          options.onError(newError);
        }
      };

      const onTranscription = (event: any) => {
        const text = event.text;
        setTranscript(text);

        // Call the onTranscription callback if provided
        if (options.onTranscription) {
          options.onTranscription(text);
        }
      };

      const onAudioLevel = (event: any) => {
        setAudioLevel(event.level);
      };

      // Add event listeners
      const service = voiceServiceRef.current;
      service.addEventListener('state-change', onStateChange);
      service.addEventListener('error', onError);
      service.addEventListener('transcription', onTranscription);
      service.addEventListener('audio-level', onAudioLevel);

      // Store cleanup functions
      cleanupFunctionsRef.current.push(() => {
        service.removeEventListener('state-change', onStateChange);
        service.removeEventListener('error', onError);
        service.removeEventListener('transcription', onTranscription);
        service.removeEventListener('audio-level', onAudioLevel);
      });

      // Autostart listening if configured
      if (options.autoStart && voiceSettings.input_enabled) {
        voiceServiceRef.current.startListening(options.transcriptionOptions);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }

    // Cleanup on unmount
    return () => {
      // Execute all cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());

      // Destroy the voice service
      if (voiceServiceRef.current) {
        voiceServiceRef.current.destroy();
        voiceServiceRef.current = null;
      }
    };
  }, []);

  // Load available voices on initialization
  useEffect(() => {
    loadVoices();
  }, []);

  // Apply voice settings changes
  useEffect(() => {
    // We don't need to recreate the service when settings change
    // Just apply relevant settings when needed
  }, [voiceSettings]);

  /**
   * Start listening for speech input
   */
  const startListening = useCallback(
    async (transcriptionOptions?: Partial<TranscriptionRequest>) => {
      if (!voiceServiceRef.current) return;
      
      try {
        setError(null);
        // Merge hook options with call options, preferring call options
        const mergedOptions = {
          ...options.transcriptionOptions,
          ...transcriptionOptions
        };
        await voiceServiceRef.current.startListening(mergedOptions);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [options.transcriptionOptions]
  );

  /**
   * Stop listening and process the speech input
   */
  const stopListening = useCallback(async () => {
    if (!voiceServiceRef.current) return;
    
    try {
      setError(null);
      const text = await voiceServiceRef.current.stopListening();
      setTranscript(text);
      return text;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return '';
    }
  }, []);

  /**
   * Cancel listening without processing the speech
   */
  const cancelListening = useCallback(() => {
    if (!voiceServiceRef.current) return;
    
    try {
      voiceServiceRef.current.cancelListening();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  /**
   * Convert text to speech and play it
   */
  const speak = useCallback(
    async (text: string, synthesisOptions?: Partial<SynthesisRequest>) => {
      if (!voiceServiceRef.current) return;
      
      try {
        setError(null);
        // Apply voice settings from the store, but allow overrides
        const mergedOptions: Partial<SynthesisRequest> = {
          voice_id: voiceSettings.voice_id,
          speed: voiceSettings.speed,
          pitch: voiceSettings.pitch,
          provider: voiceSettings.provider,
          ...options.synthesisOptions,
          ...synthesisOptions
        };
        await voiceServiceRef.current.speak(text, mergedOptions);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [voiceSettings, options.synthesisOptions]
  );

  /**
   * Stop the current speech playback
   */
  const stopSpeaking = useCallback(() => {
    if (!voiceServiceRef.current) return;
    
    try {
      voiceServiceRef.current.stopSpeaking();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  /**
   * Load available voices for speech synthesis
   */
  const loadVoices = useCallback(async (refresh: boolean = false) => {
    if (!voiceServiceRef.current) return [];
    
    try {
      const voices = await voiceServiceRef.current.getAvailableVoices({
        force_refresh: refresh
      });
      setAvailableVoices(voices);
      return voices;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  }, []);

  // Return the voice hook interface
  return {
    state,
    isListening: state === VoiceState.LISTENING,
    isSpeaking: state === VoiceState.SPEAKING,
    isProcessing: state === VoiceState.PROCESSING,
    error,
    transcript,
    audioLevel,
    startListening,
    stopListening,
    cancelListening,
    speak,
    stopSpeaking,
    isSupported: isVoiceSupported(),
    availableVoices,
    loadVoices
  };
};

export default useVoice;