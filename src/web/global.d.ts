/**
 * Global TypeScript declaration file for the Personal AI Agent
 * 
 * This file provides type definitions for:
 * - Global objects
 * - Third-party libraries without type definitions
 * - Custom interfaces for browser APIs that need augmentation
 * 
 * @version 1.0.0
 */

// File type declarations for imports
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.wav' {
  const content: string;
  export default content;
}

declare module '*.mp3' {
  const content: string;
  export default content;
}

// Audio Worklet interfaces for voice processing
interface AudioWorkletProcessor {
  /**
   * Process method called for each block of audio data
   * @param inputs Array of input audio data
   * @param outputs Array of output audio buffers to fill
   * @param parameters Parameters for the processor
   * @returns Boolean indicating whether to continue processing
   */
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
  
  /**
   * MessagePort for communication with the main thread
   */
  port: MessagePort;
}

interface AudioWorkletGlobalScope {
  /**
   * Registers a processor class with the given name
   * @param name Name of the processor
   * @param processorCtor Constructor for the processor
   */
  registerProcessor(
    name: string,
    processorCtor: AudioWorkletProcessorConstructor
  ): void;
  
  /**
   * Current processing frame
   */
  currentFrame: number;
  
  /**
   * Current audio timestamp
   */
  currentTime: number;
  
  /**
   * Sample rate of the audio context
   */
  sampleRate: number;
}

interface ProcessorOptions {
  /**
   * Number of input channels
   */
  numberOfInputs: number;
  
  /**
   * Number of output channels
   */
  numberOfOutputs: number;
  
  /**
   * Custom options for the processor
   */
  processorOptions: Record<string, any>;
}

interface ProcessorMessageEvent {
  /**
   * Data passed in the message event
   */
  data: any;
}

type AudioWorkletProcessorConstructor = {
  new (options: ProcessorOptions): AudioWorkletProcessor;
};

// IndexedDB interfaces for local storage
interface IDBDatabase {
  /**
   * Creates a transaction
   * @param storeNames Names of object stores to include in the transaction
   * @param mode Transaction mode (readonly or readwrite)
   * @returns The created transaction
   */
  transaction(
    storeNames: string | string[],
    mode?: IDBTransactionMode
  ): IDBTransaction;
  
  /**
   * Creates an object store
   * @param name Name of the object store
   * @param options Options for the object store
   * @returns The created object store
   */
  createObjectStore(
    name: string,
    options?: IDBObjectStoreParameters
  ): IDBObjectStore;
  
  /**
   * Deletes an object store
   * @param name Name of the object store to delete
   */
  deleteObjectStore(name: string): void;
  
  /**
   * Closes the database connection
   */
  close(): void;
}

interface IDBObjectStore {
  /**
   * Adds an item to the object store
   * @param value Item to add
   * @param key Optional key for the item
   * @returns Promise resolving to the generated key
   */
  add(value: any, key?: IDBValidKey): IDBRequest<IDBValidKey>;
  
  /**
   * Puts an item in the object store, overwriting if it exists
   * @param value Item to put
   * @param key Optional key for the item
   * @returns Promise resolving to the key
   */
  put(value: any, key?: IDBValidKey): IDBRequest<IDBValidKey>;
  
  /**
   * Gets an item from the object store
   * @param key Key of the item to get
   * @returns Promise resolving to the item
   */
  get(key: IDBValidKey): IDBRequest<any>;
  
  /**
   * Deletes an item from the object store
   * @param key Key of the item to delete
   * @returns Promise resolving when the item is deleted
   */
  delete(key: IDBValidKey): IDBRequest<undefined>;
  
  /**
   * Clears all items from the object store
   * @returns Promise resolving when the store is cleared
   */
  clear(): IDBRequest<undefined>;
  
  /**
   * Creates an index on the object store
   * @param name Name of the index
   * @param keyPath Path to the key to index
   * @param options Options for the index
   * @returns The created index
   */
  createIndex(
    name: string,
    keyPath: string | string[],
    options?: IDBIndexParameters
  ): IDBIndex;
}

// Electron API interface for desktop integration
interface ElectronAPI {
  /**
   * Whether the application is running in Electron
   */
  isElectron: boolean;
  
  /**
   * Gets the current application version
   * @returns The application version string
   */
  getAppVersion: () => string;
  
  /**
   * Gets the current platform (win32, darwin, linux)
   * @returns The platform string
   */
  getPlatform: () => string;
  
  /**
   * Opens a URL in the default external browser
   * @param url URL to open
   * @returns Promise resolving when the URL is opened
   */
  openExternal: (url: string) => Promise<void>;
  
  /**
   * Shows a save file dialog
   * @param options Options for the dialog
   * @returns Promise resolving to the selected file path
   */
  showSaveDialog: (options: any) => Promise<string>;
  
  /**
   * Shows an open file dialog
   * @param options Options for the dialog
   * @returns Promise resolving to an array of selected file paths
   */
  showOpenDialog: (options: any) => Promise<string[]>;
}

// Speech Recognition interfaces for voice conversation
interface SpeechRecognition {
  /**
   * Whether recognition should continue after the current result
   */
  continuous: boolean;
  
  /**
   * Whether interim results should be returned
   */
  interimResults: boolean;
  
  /**
   * Language for recognition (e.g., 'en-US')
   */
  lang: string;
  
  /**
   * Maximum number of alternative transcriptions
   */
  maxAlternatives: number;
  
  /**
   * Starts speech recognition
   */
  start(): void;
  
  /**
   * Stops speech recognition
   */
  stop(): void;
  
  /**
   * Aborts speech recognition
   */
  abort(): void;
  
  /**
   * Event handler for recognition results
   */
  onresult: (event: SpeechRecognitionEvent) => void;
  
  /**
   * Event handler for recognition errors
   */
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  
  /**
   * Event handler for recognition end
   */
  onend: () => void;
}

interface SpeechRecognitionEvent {
  /**
   * Recognition results
   */
  results: SpeechRecognitionResultList;
  
  /**
   * Index of the first new result
   */
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  /**
   * Number of results
   */
  length: number;
  
  /**
   * Gets a result at the specified index
   * @param index Index of the result
   * @returns The speech recognition result
   */
  item(index: number): SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  /**
   * Whether this result is final
   */
  isFinal: boolean;
  
  /**
   * Number of alternatives
   */
  length: number;
  
  /**
   * Gets an alternative at the specified index
   * @param index Index of the alternative
   * @returns The speech recognition alternative
   */
  item(index: number): SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  /**
   * Transcribed text
   */
  transcript: string;
  
  /**
   * Confidence score (0-1)
   */
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  /**
   * Error type
   */
  error: string;
  
  /**
   * Error message
   */
  message: string;
}

// Augment the Window interface
declare global {
  interface Window {
    /**
     * WebKit-specific AudioContext
     */
    webkitAudioContext: typeof AudioContext;
    
    /**
     * WebKit-specific SpeechRecognition
     */
    webkitSpeechRecognition: any;
    
    /**
     * Standard SpeechRecognition
     */
    SpeechRecognition: any;
    
    /**
     * IndexedDB for local storage
     */
    indexedDB: IDBFactory;
    
    /**
     * Electron API for desktop integration
     */
    electronAPI: ElectronAPI;
  }
}