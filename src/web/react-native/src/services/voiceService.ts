import { Audio } from 'expo-av'; // expo-av v13.0.0
import * as FileSystem from 'react-native-fs'; // react-native-fs v2.20.0
import { EventEmitter } from 'events'; // events v3.3.0

// Internal imports
import { API_ROUTES } from '../../src/constants/apiRoutes';
import { post, get, uploadFile } from './api';
import { 
  VoiceState, 
  SpeechModel, 
  AudioFormat,
  TranscriptionRequest,
  TranscriptionResponse,
  SynthesisRequest,
  SynthesisResponse,
  VoiceInfo,
  VoiceListRequest,
  VoiceListResponse
} from '../../src/types/voice';
import { 
  checkMicrophonePermission, 
  requestMicrophonePermission,
  showPermissionExplanation
} from '../utils/permissions';

// Default configuration options
const DEFAULT_TRANSCRIPTION_OPTIONS = {
  model: SpeechModel.WHISPER_BASE,
  language: 'en',
  detect_language: false,
  temperature: 0.0
};

const DEFAULT_SYNTHESIS_OPTIONS = {
  voice_id: 'default',
  speed: 1.0,
  pitch: 1.0,
  format: AudioFormat.MP3,
  provider: 'elevenlabs'
};

// Cache duration for voices (24 hours)
const VOICE_CACHE_DURATION = 24 * 60 * 60 * 1000;

/**
 * Transcribes audio data to text using the backend API
 * @param audioFilePath Path to the audio file to transcribe
 * @param options Additional transcription options
 * @returns Transcription result containing the recognized text
 */
export const transcribeAudio = async (
  audioFilePath: string,
  options: Partial<TranscriptionRequest> = {}
): Promise<TranscriptionResponse> => {
  // Merge provided options with defaults
  const transcriptionOptions = {
    ...DEFAULT_TRANSCRIPTION_OPTIONS,
    ...options
  };
  
  // Check if file exists
  const fileExists = await FileSystem.exists(audioFilePath);
  if (!fileExists) {
    throw new Error(`Audio file not found at path: ${audioFilePath}`);
  }
  
  // Upload the audio file for transcription
  const response = await uploadFile<TranscriptionResponse>(
    API_ROUTES.VOICE.TRANSCRIBE,
    audioFilePath,
    {
      additionalData: transcriptionOptions,
      onProgress: () => {} // Optional progress handler
    }
  );
  
  if (!response.success) {
    throw new Error(`Transcription failed: ${response.error}`);
  }
  
  return response.data;
};

/**
 * Converts text to speech using the backend API
 * @param text The text to convert to speech
 * @param options Additional synthesis options
 * @returns Synthesis result containing the generated audio
 */
export const synthesizeSpeech = async (
  text: string,
  options: Partial<SynthesisRequest> = {}
): Promise<SynthesisResponse & { file_path: string }> => {
  // Merge provided options with defaults
  const synthesisOptions = {
    ...DEFAULT_SYNTHESIS_OPTIONS,
    ...options
  };
  
  // Send request to generate speech
  const response = await post<any>(
    API_ROUTES.VOICE.SYNTHESIZE,
    {
      text,
      ...synthesisOptions
    },
    {
      responseType: 'arraybuffer'
    }
  );
  
  if (!response.success) {
    throw new Error(`Speech synthesis failed: ${response.error}`);
  }
  
  // Create directories if they don't exist
  const tempDir = `${FileSystem.CachesDirectoryPath}/voice`;
  await FileSystem.mkdir(tempDir).catch(() => {});
  
  const format = synthesisOptions.format || AudioFormat.MP3;
  const tempFilePath = `${tempDir}/speech_${Date.now()}.${format}`;
  
  // Download the audio file to the temporary location
  await FileSystem.writeFile(tempFilePath, response.data, 'base64');
  
  // For React Native, we need to extend the SynthesisResponse with a file path
  const synthResponse: SynthesisResponse & { file_path: string } = {
    audio_data: new Blob(), // Placeholder to satisfy the type
    duration: 0, // Will be updated when playing
    format: format,
    voice_id: synthesisOptions.voice_id,
    file_path: tempFilePath
  };
  
  return synthResponse;
};

/**
 * Retrieves list of available voices from the backend API
 * @param options Optional parameters for the voice list request
 * @returns Array of available voice options
 */
export const getAvailableVoices = async (
  options: Partial<VoiceListRequest> = {}
): Promise<VoiceInfo[]> => {
  // Check cache first (if not forcing refresh)
  if (!options.force_refresh) {
    try {
      // Check if cache file exists
      const cacheFilePath = `${FileSystem.CachesDirectoryPath}/voices_cache.json`;
      const cacheExists = await FileSystem.exists(cacheFilePath);
      
      if (cacheExists) {
        const cachedVoicesJson = await FileSystem.readFile(cacheFilePath, 'utf8');
        const cachedData = JSON.parse(cachedVoicesJson);
        const timestamp = cachedData.timestamp || 0;
        const now = Date.now();
        
        // If cache is still valid (less than 24 hours old)
        if (now - timestamp < VOICE_CACHE_DURATION) {
          return cachedData.voices || [];
        }
      }
    } catch (error) {
      console.warn('Error reading voice cache:', error);
      // Continue to fetch voices if cache read fails
    }
  }
  
  // Fetch voices from API
  const response = await get<VoiceListResponse>(
    API_ROUTES.VOICE.VOICES,
    options
  );
  
  if (!response.success) {
    throw new Error(`Failed to get available voices: ${response.error}`);
  }
  
  const voices = response.data.voices;
  
  // Cache the voices
  try {
    await FileSystem.writeFile(
      `${FileSystem.CachesDirectoryPath}/voices_cache.json`,
      JSON.stringify({
        voices,
        timestamp: Date.now()
      }),
      'utf8'
    );
  } catch (error) {
    console.warn('Error writing voice cache:', error);
    // Continue even if caching fails
  }
  
  return voices;
};

/**
 * Creates a voice service instance with methods for voice interaction
 * @returns Voice service instance with methods for transcription and synthesis
 */
export const createVoiceService = () => {
  // State variables
  let recording: Audio.Recording | null = null;
  let sound: Audio.Sound | null = null;
  let currentState = VoiceState.IDLE;
  let voicesCache: { voices: VoiceInfo[], timestamp: number } | null = null;
  
  // Create event emitter for state changes
  const eventEmitter = new EventEmitter();
  
  /**
   * Updates the current voice state and emits an event
   */
  const updateState = (newState: VoiceState) => {
    currentState = newState;
    eventEmitter.emit('stateChange', newState);
  };
  
  /**
   * Starts listening for user speech
   */
  const startListening = async () => {
    try {
      // Check if already recording
      if (recording) {
        await stopRecording();
      }
      
      // Check microphone permission
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) {
        const granted = await requestMicrophonePermission();
        if (!granted) {
          await showPermissionExplanation('microphone', 'Microphone access is required for voice conversations.');
          throw new Error('Microphone permission denied');
        }
      }
      
      // Prepare recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
        playThroughEarpieceAndroid: false,
        shouldDuckAndroid: true,
      });
      
      // Create recording object
      recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      
      // Start recording
      await recording.startAsync();
      updateState(VoiceState.LISTENING);
      
      return true;
    } catch (error) {
      console.error('Error starting voice recording:', error);
      updateState(VoiceState.ERROR);
      eventEmitter.emit('error', error);
      return false;
    }
  };
  
  /**
   * Stops recording and provides the audio file URI
   */
  const stopRecording = async (): Promise<string | null> => {
    if (!recording) {
      return null;
    }
    
    try {
      // Stop recording
      await recording.stopAndUnloadAsync();
      
      // Get the recording URI
      const uri = recording.getURI();
      if (!uri) {
        throw new Error('Failed to get recording URI');
      }
      
      // Reset recording object
      recording = null;
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
        playThroughEarpieceAndroid: false,
        shouldDuckAndroid: true,
      });
      
      return uri;
    } catch (error) {
      console.error('Error stopping recording:', error);
      recording = null;
      updateState(VoiceState.ERROR);
      eventEmitter.emit('error', error);
      return null;
    }
  };
  
  /**
   * Stops listening and transcribes the audio
   */
  const stopListening = async (): Promise<string> => {
    try {
      updateState(VoiceState.PROCESSING);
      
      // Stop recording and get file URI
      const audioUri = await stopRecording();
      if (!audioUri) {
        throw new Error('No audio recording to transcribe');
      }
      
      // Transcribe the audio
      const result = await transcribeAudio(audioUri);
      
      // Clean up temporary audio file
      await FileSystem.unlink(audioUri).catch(err => 
        console.warn('Failed to delete temporary audio file:', err)
      );
      
      // Update state
      updateState(VoiceState.IDLE);
      
      // Emit transcription event
      eventEmitter.emit('transcription', result.text);
      
      return result.text;
    } catch (error) {
      console.error('Error in speech recognition:', error);
      updateState(VoiceState.ERROR);
      eventEmitter.emit('error', error);
      throw error;
    }
  };
  
  /**
   * Cancels the current listening session without processing
   */
  const cancelListening = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        // Try to get the URI to delete the temporary file
        const uri = recording.getURI();
        if (uri) {
          await FileSystem.unlink(uri).catch(() => {});
        }
        
        recording = null;
        
        // Reset audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
          playThroughEarpieceAndroid: false,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Error canceling recording:', error);
      }
    }
    
    updateState(VoiceState.IDLE);
  };
  
  /**
   * Converts text to speech and plays it
   */
  const speak = async (text: string, options: Partial<SynthesisRequest> = {}) => {
    try {
      // Stop any currently playing audio
      await stopSpeaking();
      
      updateState(VoiceState.SPEAKING);
      
      // Generate speech
      const result = await synthesizeSpeech(text, options);
      
      // Create sound object
      sound = new Audio.Sound();
      
      // Load audio file
      await sound.loadAsync({ uri: `file://${result.file_path}` });
      
      // Set up completion handler
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          updateState(VoiceState.IDLE);
          
          // Cleanup
          if (sound) {
            sound.unloadAsync().catch(() => {});
            sound = null;
          }
          
          // Delete temporary file
          FileSystem.unlink(result.file_path).catch(() => {});
        }
      });
      
      // Start playback
      await sound.playAsync();
      
      return true;
    } catch (error) {
      console.error('Error in text-to-speech:', error);
      updateState(VoiceState.ERROR);
      eventEmitter.emit('error', error);
      return false;
    }
  };
  
  /**
   * Stops any currently playing speech
   */
  const stopSpeaking = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
        sound = null;
      } catch (error) {
        console.error('Error stopping speech playback:', error);
      }
    }
    
    if (currentState === VoiceState.SPEAKING) {
      updateState(VoiceState.IDLE);
    }
  };
  
  /**
   * Gets available voices with optional caching
   */
  const getVoices = async (options: Partial<VoiceListRequest> = {}) => {
    // Use cache if available and not forcing refresh
    if (voicesCache && !options.force_refresh) {
      const now = Date.now();
      if (now - voicesCache.timestamp < VOICE_CACHE_DURATION) {
        return voicesCache.voices;
      }
    }
    
    // Fetch voices
    const voices = await getAvailableVoices(options);
    
    // Update cache
    voicesCache = {
      voices,
      timestamp: Date.now()
    };
    
    return voices;
  };
  
  /**
   * Checks if voice features are supported on the current device
   */
  const checkVoiceSupport = async () => {
    try {
      return await isVoiceSupported();
    } catch (error) {
      console.error('Error checking voice support:', error);
      return false;
    }
  };
  
  return {
    // Core functionality
    startListening,
    stopListening,
    cancelListening,
    speak,
    stopSpeaking,
    
    // Voice management
    getAvailableVoices: getVoices,
    isVoiceSupported: checkVoiceSupport,
    
    // State management
    getState: () => currentState,
    
    // Event handling
    addEventListener: (event: string, listener: (...args: any[]) => void) => {
      eventEmitter.on(event, listener);
    },
    removeEventListener: (event: string, listener: (...args: any[]) => void) => {
      eventEmitter.off(event, listener);
    }
  };
};

/**
 * Checks if the device supports voice input and output
 * @returns True if voice features are supported, false otherwise
 */
export const isVoiceSupported = async (): Promise<boolean> => {
  try {
    // Check if Audio recording is available
    const recordingAvailable = Audio.Recording !== undefined;
    
    // Check if Sound playback is available
    const soundAvailable = Audio.Sound !== undefined;
    
    // Check if filesystem is available
    const fsAvailable = FileSystem !== undefined;
    
    // All components must be available
    return recordingAvailable && soundAvailable && fsAvailable;
  } catch (error) {
    console.error('Error checking voice support:', error);
    return false;
  }
};

// Export individual functions and default voice service creator
export { transcribeAudio, synthesizeSpeech, getAvailableVoices, isVoiceSupported };
export default createVoiceService;