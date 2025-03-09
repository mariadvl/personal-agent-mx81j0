import { contextBridge, ipcRenderer, shell } from 'electron';

/**
 * Exposes a set of secure APIs to the renderer process through contextBridge
 */
function exposeElectronAPIs(): void {
  contextBridge.exposeInMainWorld('electron', {
    // File system operations
    fileSystem: {
      /**
       * Read file from the local file system
       * @param path - Path to the file
       * @param options - Read options (encoding, etc.)
       * @returns Promise resolving to file contents
       */
      readFile: (path: string, options?: { encoding?: string }) => 
        ipcRenderer.invoke('fileSystem:readFile', path, options),
      
      /**
       * Write data to a file in the local file system
       * @param path - Path to the file
       * @param data - Data to write
       * @param options - Write options
       * @returns Promise resolving when file is written
       */
      writeFile: (path: string, data: string | NodeJS.ArrayBufferView, options?: { encoding?: string }) => 
        ipcRenderer.invoke('fileSystem:writeFile', path, data, options),
      
      /**
       * Delete a file from the local file system
       * @param path - Path to the file
       * @returns Promise resolving when file is deleted
       */
      deleteFile: (path: string) => 
        ipcRenderer.invoke('fileSystem:deleteFile', path),
      
      /**
       * Read directory contents
       * @param path - Path to the directory
       * @returns Promise resolving to array of file/directory names
       */
      readDir: (path: string) => 
        ipcRenderer.invoke('fileSystem:readDir', path),
      
      /**
       * Create a directory
       * @param path - Path to create
       * @returns Promise resolving when directory is created
       */
      createDir: (path: string) => 
        ipcRenderer.invoke('fileSystem:createDir', path),
      
      /**
       * Check if a file or directory exists
       * @param path - Path to check
       * @returns Promise resolving to boolean
       */
      exists: (path: string) => 
        ipcRenderer.invoke('fileSystem:exists', path),
      
      /**
       * Get file or directory stats
       * @param path - Path to get stats for
       * @returns Promise resolving to stats object
       */
      getStats: (path: string) => 
        ipcRenderer.invoke('fileSystem:getStats', path),
    },
    
    // Dialog operations
    dialog: {
      /**
       * Open file dialog for selecting files
       * @param options - Dialog options
       * @returns Promise resolving to selected file path(s) or null if canceled
       */
      openFile: (options?: Electron.OpenDialogOptions) => 
        ipcRenderer.invoke('dialog:openFile', options),
      
      /**
       * Save file dialog for saving files
       * @param options - Dialog options
       * @returns Promise resolving to selected path or null if canceled
       */
      saveFile: (options?: Electron.SaveDialogOptions) => 
        ipcRenderer.invoke('dialog:saveFile', options),
      
      /**
       * Show a message box dialog
       * @param options - Dialog options
       * @returns Promise resolving to dialog result
       */
      showMessageBox: (options: Electron.MessageBoxOptions) => 
        ipcRenderer.invoke('dialog:showMessageBox', options),
    },
    
    // Backend process management
    backend: {
      /**
       * Start the Python backend process
       * @returns Promise resolving to success status
       */
      startBackend: () => 
        ipcRenderer.invoke('backend:start'),
      
      /**
       * Stop the Python backend process
       * @returns Promise resolving to success status
       */
      stopBackend: () => 
        ipcRenderer.invoke('backend:stop'),
      
      /**
       * Get the current status of the backend process
       * @returns Promise resolving to status string ('running', 'stopped', 'starting', 'error')
       */
      getBackendStatus: () => 
        ipcRenderer.invoke('backend:status'),
      
      /**
       * Get the port number the backend is running on
       * @returns Promise resolving to port number
       */
      getBackendPort: () => 
        ipcRenderer.invoke('backend:port'),
    },
    
    // Application information and operations
    app: {
      /**
       * Get the application version
       * @returns Promise resolving to version string
       */
      getVersion: () => 
        ipcRenderer.invoke('app:getVersion'),
      
      /**
       * Get the application path
       * @returns Promise resolving to app path
       */
      getAppPath: () => 
        ipcRenderer.invoke('app:getAppPath'),
      
      /**
       * Get the current platform (win32, darwin, linux)
       * @returns Promise resolving to platform string
       */
      getPlatform: () => 
        ipcRenderer.invoke('app:getPlatform'),
      
      /**
       * Get the path to the application data directory
       * @returns Promise resolving to app data path
       */
      getAppDataPath: () => 
        ipcRenderer.invoke('app:getAppDataPath'),
      
      /**
       * Check for application updates
       * @param silent Whether to show notifications for update check
       * @returns Promise resolving to update info
       */
      checkForUpdates: (silent: boolean = false) => 
        ipcRenderer.invoke('app:checkForUpdates', silent),
      
      /**
       * Install downloaded update
       * @returns Promise resolving when update is installed
       */
      installUpdate: () => 
        ipcRenderer.invoke('app:installUpdate'),
    },
    
    // System operations
    system: {
      /**
       * Open a URL in the default browser
       * @param url - URL to open
       * @returns Promise resolving when the URL is opened
       */
      openExternal: (url: string) => {
        // For security, verify URL before opening
        if (url.startsWith('https://') || url.startsWith('http://')) {
          return shell.openExternal(url);
        }
        return Promise.reject(new Error('Invalid URL protocol'));
      },
    },
    
    // Window operations
    window: {
      /**
       * Minimize the application window
       * @returns Promise resolving when window is minimized
       */
      minimize: () => 
        ipcRenderer.invoke('window:minimize'),
      
      /**
       * Maximize the application window
       * @returns Promise resolving when window is maximized
       */
      maximize: () => 
        ipcRenderer.invoke('window:maximize'),
      
      /**
       * Close the application window
       * @returns Promise resolving when window is closed
       */
      close: () => 
        ipcRenderer.invoke('window:close'),
      
      /**
       * Check if the window is maximized
       * @returns Promise resolving to boolean
       */
      isMaximized: () => 
        ipcRenderer.invoke('window:isMaximized'),
    },
  });
}

// Execute the function to expose APIs when preload script runs
exposeElectronAPIs();