/**
 * Audio Utilities
 * 
 * A collection of utility functions for audio processing in the Personal AI Agent.
 * Provides functionality for audio conversion, manipulation, analysis, and formatting.
 */

// web-audio-api polyfill for environments where native implementation is not available
import { AudioContext } from 'web-audio-api'; // v0.2.2

// Global AudioContext with fallbacks for browser compatibility
const AudioContextClass = window.AudioContext || window.webkitAudioContext;

/**
 * Convert a Blob to an ArrayBuffer for audio processing
 * 
 * @param blob - The Blob to convert
 * @returns Promise resolving to the ArrayBuffer representation
 */
export const convertBlobToArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert Blob to ArrayBuffer'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Error reading Blob'));
    };
    reader.readAsArrayBuffer(blob);
  });
};

/**
 * Convert an ArrayBuffer to a Blob with specified MIME type
 * 
 * @param buffer - The ArrayBuffer to convert
 * @param mimeType - The MIME type of the resulting Blob
 * @returns Blob representation of the ArrayBuffer
 */
export const convertArrayBufferToBlob = (buffer: ArrayBuffer, mimeType: string): Blob => {
  return new Blob([buffer], { type: mimeType });
};

/**
 * Convert a Base64 encoded string to a Blob with specified MIME type
 * 
 * @param base64String - The Base64 string to convert (with or without data URL prefix)
 * @param mimeType - The MIME type of the resulting Blob
 * @returns Blob representation of the Base64 string
 */
export const convertBase64ToBlob = (base64String: string, mimeType: string): Blob => {
  // Remove data URL prefix if present
  let base64 = base64String;
  if (base64.startsWith('data:')) {
    base64 = base64.split(',')[1];
  }
  
  // Convert Base64 string to binary string
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  
  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Create and return a Blob from the Uint8Array
  return new Blob([bytes], { type: mimeType });
};

/**
 * Interface for WAV conversion options
 */
interface WavConversionOptions {
  sampleRate?: number;
  float32?: boolean;
}

/**
 * Convert an AudioBuffer to a WAV format Blob for transmission
 * 
 * @param audioBuffer - The AudioBuffer to convert
 * @param options - Conversion options (sampleRate, float32)
 * @returns WAV format Blob containing the audio data
 */
export const convertAudioBufferToWav = (
  audioBuffer: AudioBuffer, 
  options: WavConversionOptions = {}
): Blob => {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = options.sampleRate || audioBuffer.sampleRate;
  const format = options.float32 ? 3 : 1; // 3 is float32, 1 is PCM
  const bitDepth = format === 3 ? 32 : 16;
  
  // Extract audio data from channels
  const channelData = [];
  for (let channel = 0; channel < numChannels; channel++) {
    channelData.push(audioBuffer.getChannelData(channel));
  }
  
  // Interleave channel data if needed
  let interleaved: Float32Array;
  if (numChannels === 2) {
    // Stereo case - interleave the two channels
    const left = channelData[0];
    const right = channelData[1];
    interleaved = new Float32Array(left.length * 2);
    for (let i = 0, k = 0; i < left.length; i++) {
      interleaved[k++] = left[i];
      interleaved[k++] = right[i];
    }
  } else {
    // Mono case - use the single channel directly
    interleaved = channelData[0];
  }
  
  // Create WAV buffer with header
  const dataSize = interleaved.length * (bitDepth / 8);
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);
  
  // WAV header (44 bytes)
  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // File size - 8
  writeString(view, 8, 'WAVE');
  
  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 = PCM, 3 = IEEE float)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // ByteRate
  view.setUint16(32, numChannels * (bitDepth / 8), true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample
  
  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size
  
  // Write actual audio data
  if (format === 1) { // PCM
    // Convert float32 to Int16
    floatTo16BitPCM(view, 44, interleaved);
  } else { // Float32
    // Write float32 values directly
    for (let i = 0; i < interleaved.length; i++) {
      view.setFloat32(44 + (i * 4), interleaved[i], true);
    }
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
  
  // Helper function to write a string to a DataView
  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  
  // Helper function to convert float samples to 16-bit PCM
  function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }
};

/**
 * Interface for silence detection options
 */
interface SilenceOptions {
  threshold?: number; // Silence threshold (default: 0.01)
  minDuration?: number; // Minimum duration to consider as silence (in samples)
}

/**
 * Detect silence in audio data to help determine when speech has ended
 * 
 * @param audioData - Float32Array containing audio samples
 * @param options - Options for silence detection
 * @returns True if silence is detected, false otherwise
 */
export const detectSilence = (
  audioData: Float32Array, 
  options: SilenceOptions = {}
): boolean => {
  const threshold = options.threshold !== undefined ? options.threshold : 0.01;
  const minDuration = options.minDuration || 0;
  
  // Calculate RMS (Root Mean Square) value of the audio data
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  const rms = Math.sqrt(sum / audioData.length);
  
  // If minDuration is specified, we need to check if silence persists
  if (minDuration > 0 && audioData.length >= minDuration) {
    let silentSamples = 0;
    for (let i = 0; i < audioData.length; i++) {
      if (Math.abs(audioData[i]) < threshold) {
        silentSamples++;
      } else {
        silentSamples = 0; // Reset counter on non-silent sample
      }
      
      // If we've found enough consecutive silent samples
      if (silentSamples >= minDuration) {
        return true;
      }
    }
    return false;
  }
  
  // Otherwise, just check if the RMS is below threshold
  return rms < threshold;
};

/**
 * Normalize audio volume to improve speech recognition quality
 * 
 * @param audioBuffer - The AudioBuffer to normalize
 * @param targetLevel - Target level for normalization (default: 0.9)
 * @returns Normalized AudioBuffer
 */
export const normalizeAudio = (
  audioBuffer: AudioBuffer, 
  targetLevel: number = 0.9
): AudioBuffer => {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  
  // Find the peak amplitude across all channels
  let maxPeak = 0;
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const absValue = Math.abs(channelData[i]);
      if (absValue > maxPeak) {
        maxPeak = absValue;
      }
    }
  }
  
  // If the audio is already silent, return it as is
  if (maxPeak === 0) {
    return audioBuffer;
  }
  
  // Calculate the normalization factor
  const normalFactor = targetLevel / maxPeak;
  
  // Create a new AudioBuffer for the normalized audio
  const normalizedBuffer = new AudioBuffer({
    numberOfChannels: numChannels,
    length: length,
    sampleRate: audioBuffer.sampleRate
  });
  
  // Apply normalization to each channel
  for (let channel = 0; channel < numChannels; channel++) {
    const inputData = audioBuffer.getChannelData(channel);
    const outputData = normalizedBuffer.getChannelData(channel);
    
    for (let i = 0; i < length; i++) {
      outputData[i] = inputData[i] * normalFactor;
    }
  }
  
  return normalizedBuffer;
};

/**
 * Interface for audio meter options
 */
interface AudioMeterOptions {
  smoothingTimeConstant?: number; // Smoothing time constant (0-1)
  fftSize?: number; // FFT size (power of 2)
  clipLevel?: number; // Level that would be considered clipping
  averaging?: number; // How many values to use for averaging
  clipLag?: number; // How long to wait before returning to normal after clipping
}

/**
 * Interface for the audio meter return object
 */
interface AudioMeter {
  getLevel: () => number; // Get current audio level (0-1)
  checkClipping: () => boolean; // Check if audio is clipping
  shutdown: () => void; // Clean up resources
}

/**
 * Create an audio level meter for visualizing microphone input
 * 
 * @param audioContext - The AudioContext instance
 * @param sourceNode - The audio source node (e.g., from microphone)
 * @param options - Configuration options for the meter
 * @returns Audio meter object with methods to get volume level
 */
export const createAudioMeter = (
  audioContext: AudioContext,
  sourceNode: MediaStreamAudioSourceNode,
  options: AudioMeterOptions = {}
): AudioMeter => {
  const analyser = audioContext.createAnalyser();
  const smoothing = options.smoothingTimeConstant || 0.8;
  const fftSize = options.fftSize || 1024;
  const clipLevel = options.clipLevel || 0.98;
  const averaging = options.averaging || 0.95;
  const clipLag = options.clipLag || 750;
  
  // Configure analyser
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = smoothing;
  
  // Connect source to analyser
  sourceNode.connect(analyser);
  
  // Create data array for analyser
  const dataArray = new Float32Array(analyser.fftSize);
  
  // Variables for tracking audio levels
  let volume = 0;
  let clipFlag = false;
  let lastClip = 0;
  
  // The returned object with methods to access the meter
  const meter: AudioMeter = {
    getLevel: () => {
      // Get frequency data
      analyser.getFloatTimeDomainData(dataArray);
      
      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      
      // Update volume with averaging
      volume = Math.max(rms, volume * averaging);
      
      // Check for clipping
      if (volume > clipLevel) {
        clipFlag = true;
        lastClip = window.performance.now();
      } else if (clipFlag && window.performance.now() - lastClip > clipLag) {
        clipFlag = false;
      }
      
      return volume;
    },
    
    checkClipping: () => {
      return clipFlag;
    },
    
    shutdown: () => {
      sourceNode.disconnect(analyser);
    }
  };
  
  return meter;
};

/**
 * Format audio duration in seconds as a readable time string (MM:SS)
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted time string in MM:SS format
 */
export const formatAudioDuration = (seconds: number): string => {
  // Handle edge cases
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  
  // Calculate minutes and remaining seconds
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  // Format with leading zeros
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');
  
  return `${formattedMinutes}:${formattedSeconds}`;
};

/**
 * Resample audio data to a different sample rate
 * 
 * @param audioBuffer - The AudioBuffer to resample
 * @param targetSampleRate - The target sample rate
 * @returns Promise resolving to the resampled AudioBuffer
 */
export const resampleAudio = async (
  audioBuffer: AudioBuffer, 
  targetSampleRate: number
): Promise<AudioBuffer> => {
  // If the buffer is already at the target sample rate, return it
  if (audioBuffer.sampleRate === targetSampleRate) {
    return audioBuffer;
  }
  
  // Create an offline audio context with the target sample rate
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.duration * targetSampleRate,
    targetSampleRate
  );
  
  // Create a buffer source and set its buffer
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  
  // Connect the source to the offline context destination
  source.connect(offlineContext.destination);
  
  // Start the source and render the offline context
  source.start(0);
  
  // Render the audio
  return offlineContext.startRendering();
};

/**
 * Concatenate multiple AudioBuffers into a single AudioBuffer
 * 
 * @param buffers - Array of AudioBuffers to concatenate
 * @param audioContext - The AudioContext to use for creating the new buffer
 * @returns Combined AudioBuffer containing all input buffers in sequence
 */
export const concatenateAudioBuffers = (
  buffers: AudioBuffer[], 
  audioContext: AudioContext
): AudioBuffer => {
  // If no buffers or only one buffer, return it
  if (!buffers || buffers.length === 0) {
    throw new Error('No buffers provided for concatenation');
  }
  
  if (buffers.length === 1) {
    return buffers[0];
  }
  
  // Get the number of channels from the first buffer
  const numberOfChannels = buffers[0].numberOfChannels;
  
  // Calculate the total length
  let totalLength = 0;
  for (const buffer of buffers) {
    totalLength += buffer.length;
  }
  
  // Create a new buffer with the combined length
  const result = audioContext.createBuffer(
    numberOfChannels,
    totalLength,
    buffers[0].sampleRate
  );
  
  // Copy data from each buffer into the result
  let offset = 0;
  for (const buffer of buffers) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const resultChannel = result.getChannelData(channel);
      const bufferChannel = buffer.getChannelData(channel);
      
      // Copy this buffer's data into the result
      for (let i = 0; i < buffer.length; i++) {
        resultChannel[offset + i] = bufferChannel[i];
      }
    }
    
    // Update offset for the next buffer
    offset += buffer.length;
  }
  
  return result;
};

/**
 * Interface for trim silence options
 */
interface TrimSilenceOptions {
  threshold?: number; // Silence threshold (default: 0.01)
  timeWindow?: number; // Window size for silence detection (in samples)
  minSilenceDuration?: number; // Minimum silence duration to trim (in samples)
}

/**
 * Trim silence from the beginning and end of an AudioBuffer
 * 
 * @param audioBuffer - The AudioBuffer to trim
 * @param options - Options for silence detection and trimming
 * @returns AudioBuffer with silence removed
 */
export const trimSilence = (
  audioBuffer: AudioBuffer,
  options: TrimSilenceOptions = {}
): AudioBuffer => {
  const threshold = options.threshold || 0.01;
  const timeWindow = options.timeWindow || 1024;
  const minSilenceDuration = options.minSilenceDuration || 2048;
  
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  
  // Helper function to check if a window is silent
  const isSilent = (channelData: Float32Array, start: number, windowSize: number): boolean => {
    const end = Math.min(start + windowSize, channelData.length);
    for (let i = start; i < end; i++) {
      if (Math.abs(channelData[i]) > threshold) {
        return false;
      }
    }
    return true;
  };
  
  // Find the first non-silent window from the start
  let startIndex = 0;
  let foundStart = false;
  
  // Use the first channel for detection
  const firstChannelData = audioBuffer.getChannelData(0);
  
  // Find start point (first non-silent window)
  for (let i = 0; i < length - timeWindow; i += timeWindow) {
    if (!isSilent(firstChannelData, i, timeWindow)) {
      startIndex = Math.max(0, i - timeWindow); // Go back one window to ensure we don't cut speech
      foundStart = true;
      break;
    }
  }
  
  // If the entire buffer is silent, return an empty buffer
  if (!foundStart) {
    return new AudioBuffer({
      numberOfChannels: numChannels,
      length: 0,
      sampleRate: sampleRate
    });
  }
  
  // Find the last non-silent window from the end
  let endIndex = length;
  
  // Find end point (last non-silent window)
  for (let i = length - timeWindow; i >= 0; i -= timeWindow) {
    if (!isSilent(firstChannelData, i, timeWindow)) {
      endIndex = Math.min(length, i + timeWindow * 2); // Add some buffer
      break;
    }
  }
  
  // Create a new buffer with the non-silent portion
  const newLength = endIndex - startIndex;
  const result = new AudioBuffer({
    numberOfChannels: numChannels,
    length: newLength,
    sampleRate: sampleRate
  });
  
  // Copy the non-silent portion of each channel
  for (let channel = 0; channel < numChannels; channel++) {
    const inputData = audioBuffer.getChannelData(channel);
    const outputData = result.getChannelData(channel);
    
    for (let i = 0; i < newLength; i++) {
      outputData[i] = inputData[startIndex + i];
    }
  }
  
  return result;
};

/**
 * Calculate the current audio level (volume) from raw audio data
 * 
 * @param audioData - Float32Array containing audio samples
 * @returns Audio level between 0.0 and 1.0
 */
export const calculateAudioLevel = (audioData: Float32Array): number => {
  // Calculate RMS (Root Mean Square) value
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  const rms = Math.sqrt(sum / audioData.length);
  
  // Apply logarithmic scaling to better match human perception
  // Map to range 0.0-1.0 with a logarithmic scale
  const logScaled = rms > 0 ? 1.0 + 0.23 * Math.log10(rms) : 0;
  
  // Clamp to 0.0-1.0 range
  return Math.max(0, Math.min(1, logScaled));
};

/**
 * Interface for audio context options
 */
interface AudioContextOptions {
  sampleRate?: number;
  latencyHint?: AudioContextLatencyCategory | number;
}

/**
 * Create an AudioContext with fallbacks for browser compatibility
 * 
 * @param options - Options for creating the AudioContext
 * @returns New AudioContext instance
 */
export const createAudioContext = (options: AudioContextOptions = {}): AudioContext => {
  if (!AudioContextClass) {
    throw new Error('AudioContext is not supported in this environment');
  }
  
  // Create with provided options
  try {
    return new AudioContextClass(options);
  } catch (e) {
    // Fallback: try without options
    try {
      return new AudioContextClass();
    } catch (e2) {
      throw new Error('Failed to create AudioContext: ' + e2);
    }
  }
};