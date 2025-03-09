import * as path from 'path';
import { 
  app, 
  BrowserWindow, 
  ipcMain, 
  dialog, 
  shell, 
  Menu, 
  Tray, 
  nativeTheme,
  protocol
} from 'electron'; // ^27.0.0
import { PythonShell } from 'python-shell'; // ^5.0.0
import * as fs from 'fs-extra'; // ^11.1.1
import * as log from 'electron-log'; // ^5.0.0
import { autoUpdater } from 'electron-updater'; // ^6.1.4
import handleSquirrelEvent from 'electron-squirrel-startup'; // ^1.0.0

// Global variables
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let backendProcess: PythonShell | null = null;
let backendPort: number = 0;
const isDevelopment = process.env.NODE_ENV === 'development';
let isQuitting = false;

/**
 * Creates the main application window
 * @returns The created browser window instance
 */
function createWindow(): BrowserWindow {
  // Create the browser window
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icons/icon.png'),
    show: false, // Don't show until ready-to-show
    titleBarStyle: 'default',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1a1a1a' : '#ffffff'
  });

  // Load the app
  if (isDevelopment) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Event handlers
  win.on('ready-to-show', () => {
    win.show();
    win.focus();
  });

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
      return false;
    }
    return true;
  });

  // IPC handlers for window operations
  ipcMain.handle('window:minimize', () => {
    win.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    win.hide();
  });

  return win;
}

/**
 * Sets up the system tray icon and context menu
 */
function setupTray(): void {
  const iconPath = path.join(__dirname, '../assets/icons/tray-icon.png');
  tray = new Tray(iconPath);
  
  tray.setToolTip('Personal AI Agent');
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show App', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

/**
 * Starts the Python backend process
 * @returns Promise resolving to true if backend started successfully
 */
async function startBackend(): Promise<boolean> {
  try {
    // Determine paths
    const appPath = app.getAppPath();
    const pythonPath = isDevelopment 
      ? 'python' // Use system Python in development
      : path.join(appPath, 'resources', 'python', process.platform === 'win32' ? 'python.exe' : 'bin/python3');
    
    const backendScript = isDevelopment
      ? path.join(appPath, 'backend', 'main.py')
      : path.join(appPath, 'resources', 'backend', 'main.py');
    
    // Ensure backend script exists
    if (!fs.existsSync(backendScript)) {
      log.error(`Backend script not found at: ${backendScript}`);
      return false;
    }
    
    // Find an available port
    backendPort = await findAvailablePort(5000);
    
    // Set up Python shell options
    const options = {
      mode: 'text',
      pythonPath: pythonPath,
      pythonOptions: ['-u'], // Unbuffered output
      scriptPath: path.dirname(backendScript),
      args: [
        '--port', backendPort.toString(),
        '--app-path', appPath,
        '--log-level', isDevelopment ? 'DEBUG' : 'INFO'
      ]
    };
    
    // Start the backend process
    backendProcess = new PythonShell(path.basename(backendScript), options);
    
    return new Promise((resolve, reject) => {
      // Set up timeout for backend startup
      const timeout = setTimeout(() => {
        log.error('Backend startup timed out');
        reject(new Error('Backend startup timed out'));
      }, 30000); // 30 seconds timeout
      
      // Set up message handler
      backendProcess!.on('message', message => {
        log.info(`Backend message: ${message}`);
        
        try {
          const parsed = JSON.parse(message);
          
          if (parsed.status === 'ready') {
            clearTimeout(timeout);
            log.info(`Backend started successfully on port ${backendPort}`);
            
            // Notify renderer that backend is ready
            if (mainWindow) {
              mainWindow.webContents.send('backend:ready', { port: backendPort });
            }
            
            resolve(true);
          }
        } catch (e) {
          // Not JSON or different message format, just log it
          log.debug(`Raw backend message: ${message}`);
        }
      });
      
      // Set up error handler
      backendProcess!.on('error', err => {
        log.error(`Backend error: ${err.message}`);
        clearTimeout(timeout);
        reject(err);
      });
      
      // Set up exit handler
      backendProcess!.on('close', code => {
        log.info(`Backend exited with code ${code}`);
        backendProcess = null;
        
        if (mainWindow) {
          mainWindow.webContents.send('backend:stopped');
        }
      });
    });
  } catch (error) {
    log.error(`Failed to start backend: ${error}`);
    return false;
  }
}

/**
 * Stops the running Python backend process
 * @returns Promise resolving to true if backend stopped successfully
 */
async function stopBackend(): Promise<boolean> {
  if (!backendProcess) {
    return true; // Already stopped
  }
  
  try {
    // Send termination signal to backend
    if (backendProcess.send) {
      backendProcess.send(JSON.stringify({ command: 'shutdown' }));
    }
    
    // Give the backend some time to shut down gracefully
    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        log.warn('Backend shutdown timed out, forcing termination');
        if (backendProcess) {
          backendProcess.kill();
          backendProcess = null;
        }
        resolve(true);
      }, 5000); // 5 seconds timeout
      
      backendProcess!.on('close', () => {
        clearTimeout(timeout);
        backendProcess = null;
        resolve(true);
      });
    });
  } catch (error) {
    log.error(`Error stopping backend: ${error}`);
    backendProcess = null;
    return false;
  }
}

/**
 * Configures the automatic update system
 */
function setupAutoUpdater(): void {
  // Configure logging for updater
  autoUpdater.logger = log;
  
  // Set update check frequency
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  
  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    if (mainWindow) {
      mainWindow.webContents.send('update:checking');
    }
  });
  
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update:available', info);
    }
  });
  
  autoUpdater.on('update-not-available', (info) => {
    log.info('No updates available:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update:not-available');
    }
  });
  
  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    if (mainWindow) {
      mainWindow.webContents.send('update:error', err.message);
    }
  });
  
  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${progress.percent.toFixed(2)}%`);
    if (mainWindow) {
      mainWindow.webContents.send('update:progress', progress);
    }
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded, will install on quit');
    if (mainWindow) {
      mainWindow.webContents.send('update:downloaded', info);
    }
  });
  
  // IPC handlers for updates
  ipcMain.handle('update:check', async () => {
    return await autoUpdater.checkForUpdates();
  });
  
  ipcMain.handle('update:download', async () => {
    return await autoUpdater.downloadUpdate();
  });
  
  ipcMain.handle('update:install', () => {
    isQuitting = true;
    autoUpdater.quitAndInstall();
  });
  
  // Check for updates after startup (with delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 10000); // 10 seconds after startup
}

/**
 * Sets up all IPC handlers for communication with the renderer process
 */
function setupIpcHandlers(): void {
  // File operations
  ipcMain.handle('file:read', async (_, path: string) => {
    try {
      return await fs.readFile(path, 'utf8');
    } catch (error) {
      log.error(`Error reading file ${path}: ${error}`);
      throw error;
    }
  });
  
  ipcMain.handle('file:write', async (_, path: string, content: string) => {
    try {
      await fs.writeFile(path, content, 'utf8');
      return true;
    } catch (error) {
      log.error(`Error writing file ${path}: ${error}`);
      throw error;
    }
  });
  
  ipcMain.handle('file:exists', async (_, path: string) => {
    try {
      return await fs.pathExists(path);
    } catch (error) {
      log.error(`Error checking if file exists ${path}: ${error}`);
      return false;
    }
  });
  
  // Dialog operations
  ipcMain.handle('dialog:openFile', async (_, options) => {
    if (!mainWindow) return null;
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      ...options
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    
    return result.filePaths[0];
  });
  
  ipcMain.handle('dialog:saveFile', async (_, options) => {
    if (!mainWindow) return null;
    
    const result = await dialog.showSaveDialog(mainWindow, options);
    
    if (result.canceled || !result.filePath) {
      return null;
    }
    
    return result.filePath;
  });
  
  ipcMain.handle('dialog:showMessage', async (_, options) => {
    if (!mainWindow) return null;
    
    return await dialog.showMessageBox(mainWindow, options);
  });
  
  // Backend management
  ipcMain.handle('backend:start', async () => {
    if (backendProcess) {
      return { success: true, port: backendPort };
    }
    
    const success = await startBackend();
    return { success, port: backendPort };
  });
  
  ipcMain.handle('backend:stop', async () => {
    const success = await stopBackend();
    return { success };
  });
  
  ipcMain.handle('backend:status', () => {
    return {
      running: backendProcess !== null,
      port: backendPort
    };
  });
  
  // App information
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });
  
  ipcMain.handle('app:getPath', (_, name) => {
    return app.getPath(name as any);
  });
  
  ipcMain.handle('app:getAppPath', () => {
    return app.getAppPath();
  });
  
  // System operations
  ipcMain.handle('system:openExternal', async (_, url) => {
    return await shell.openExternal(url);
  });
  
  // Theme handling
  ipcMain.handle('theme:isDark', () => {
    return nativeTheme.shouldUseDarkColors;
  });
  
  ipcMain.on('theme:toggle', () => {
    nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
    if (mainWindow) {
      mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors);
    }
  });
}

/**
 * Registers custom protocol handlers
 */
function setupProtocol(): void {
  // Register protocol handler
  app.setAsDefaultProtocolClient('personal-ai-agent');
}

/**
 * Finds an available port for the backend to listen on
 * @param startPort The port to start searching from
 * @returns Promise resolving to an available port number
 */
async function findAvailablePort(startPort: number): Promise<number> {
  const net = require('net');
  
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      // Port is in use, try the next one
      resolve(findAvailablePort(startPort + 1));
    });
    
    server.listen(startPort, () => {
      server.close(() => {
        resolve(startPort);
      });
    });
  });
}

/**
 * Creates the application menu
 */
function createAppMenu(): void {
  const isMac = process.platform === 'darwin';
  
  const template: any[] = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:preferences');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            autoUpdater.checkForUpdates();
          }
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Conversation',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:new-conversation');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (!mainWindow) return;
            
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              handleFileOpen(result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Export Conversation',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:export-conversation');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Backup Data',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:backup-data');
            }
          }
        },
        {
          label: 'Restore Data',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:restore-data');
            }
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Toggle Theme',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
            if (mainWindow) {
              mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors);
            }
          }
        },
        ...(isDevelopment ? [
          { type: 'separator' },
          { role: 'toggleDevTools' }
        ] : [])
      ]
    },
    
    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/personal-ai-agent');
          }
        },
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/personal-ai-agent/docs');
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            autoUpdater.checkForUpdates();
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:about');
            }
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Handles opening files from the system
 * @param filePath Path to the file to open
 */
function handleFileOpen(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    log.error(`File not found: ${filePath}`);
    return;
  }
  
  if (mainWindow) {
    mainWindow.webContents.send('file:opened', filePath);
    
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    
    mainWindow.focus();
  }
}

/**
 * Handles deep link protocol activation
 * @param url The deep link URL to handle
 */
function handleDeepLink(url: string): void {
  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    const command = parsedUrl.hostname; // e.g., open-conversation
    const params = Object.fromEntries(parsedUrl.searchParams.entries());
    
    log.info(`Deep link: ${command}`, params);
    
    if (mainWindow) {
      mainWindow.webContents.send('deeplink', { command, params });
      
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      
      mainWindow.focus();
    }
  } catch (error) {
    log.error(`Error handling deep link: ${error}`);
  }
}

// Handle Windows Squirrel events
if (handleSquirrelEvent) {
  app.quit();
}

// Only allow a single instance of the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_, commandLine) => {
    // Someone tried to run a second instance, we should focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // Check for deep links in the command line
      const url = commandLine.find(arg => arg.startsWith('personal-ai-agent://'));
      if (url) {
        handleDeepLink(url);
      }
    }
  });
  
  // Standard app initialization
  app.whenReady().then(async () => {
    // Set up logging
    log.transports.file.level = isDevelopment ? 'debug' : 'info';
    log.info('Application starting...');
    
    // Register protocol handler
    setupProtocol();
    
    // Create the main window
    mainWindow = createWindow();
    
    // Set up IPC handlers
    setupIpcHandlers();
    
    // Set up system tray
    setupTray();
    
    // Create application menu
    createAppMenu();
    
    // Start backend
    try {
      await startBackend();
    } catch (error) {
      log.error(`Failed to start backend: ${error}`);
      dialog.showErrorBox(
        'Backend Error',
        'Failed to start the backend service. The application may not function properly.'
      );
    }
    
    // Set up auto-updater
    setupAutoUpdater();
    
    // Handle file opening (macOS)
    app.on('open-file', (event, path) => {
      event.preventDefault();
      handleFileOpen(path);
    });
    
    // Handle macOS app activation
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    });
  });
  
  // Quit when all windows are closed, except on macOS
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      isQuitting = true;
      app.quit();
    }
  });
  
  // Handle app before-quit event
  app.on('before-quit', async (event) => {
    if (!isQuitting) {
      event.preventDefault();
      isQuitting = true;
      
      // Stop backend
      await stopBackend();
      
      // Now quit
      app.quit();
    }
  });
  
  // Handle app will-quit event
  app.on('will-quit', async (event) => {
    // Make sure backend is stopped
    if (backendProcess) {
      event.preventDefault();
      await stopBackend();
      app.quit();
    }
  });
}