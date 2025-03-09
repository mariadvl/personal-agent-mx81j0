/**
 * Authentication Service
 * 
 * Implements a local-first authentication approach for the Personal AI Agent.
 * This service handles user authentication, session management, permission checking,
 * and secure API key storage, prioritizing user privacy while ensuring appropriate
 * security controls.
 */

import {
  AuthState, AuthLevel, AuthMethod, AuthRequest, AuthResponse,
  Permission, PermissionLevel, AuthSettings, AuthCredentials,
  ApiKeyCredential, CredentialStore, AuthRequirement, AuthEvent, AuthLog
} from '../types/auth';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { setLocalStorage, getLocalStorage, removeLocalStorage } from '../utils/storage';
import { formatErrorMessage, logError, createErrorWithCode } from '../utils/errorHandlers';
import { setAuthToken, clearAuthToken } from '../services/api';
import CryptoJS from 'crypto-js'; // crypto-js version ^4.1.1
import * as uuid from 'uuid'; // uuid version ^9.0.0

// Constants
const DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const DEFAULT_INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_FAILED_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const CREDENTIAL_STORE_KEY = "credential_store";
const AUTH_LOG_KEY = "auth_log";

/**
 * Initializes the authentication service and loads stored credentials
 * @returns Promise resolving to true if initialization was successful
 */
export async function initialize(): Promise<boolean> {
  try {
    // Load credential store from local storage
    const storedCredentials = getLocalStorage(CREDENTIAL_STORE_KEY, true);
    if (!storedCredentials) {
      // Initialize empty credential store if none exists
      const newCredentialStore: CredentialStore = {
        apiKeys: {},
        authCredentials: null
      };
      setLocalStorage(CREDENTIAL_STORE_KEY, newCredentialStore, true);
    }

    // Load authentication logs from local storage
    const storedLogs = getLocalStorage(AUTH_LOG_KEY, true);
    if (!storedLogs) {
      // Initialize empty auth logs if none exist
      const newAuthLogs: AuthLog = {
        events: [],
        failedAttempts: 0,
        lastFailedAttempt: null,
        lockedUntil: null
      };
      setLocalStorage(AUTH_LOG_KEY, newAuthLogs, true);
    }

    // Check for existing session and validate it
    const token = getLocalStorage(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      try {
        // Parse token to get session data
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        
        // Check if session is still valid
        if (tokenData.exp && new Date(tokenData.exp) > new Date()) {
          setAuthToken(token);
        } else {
          // Session expired, clear token
          removeLocalStorage(STORAGE_KEYS.AUTH_TOKEN);
          clearAuthToken();
        }
      } catch (error) {
        // Invalid token, clear it
        logError(error, "Auth service initialization");
        removeLocalStorage(STORAGE_KEYS.AUTH_TOKEN);
        clearAuthToken();
      }
    }

    return true;
  } catch (error) {
    logError(error, "Auth service initialization");
    return false;
  }
}

/**
 * Authenticates a user with the provided credentials
 * @param request Authentication request details
 * @returns Promise resolving to an authentication response
 */
export async function authenticate(request: AuthRequest): Promise<AuthResponse> {
  try {
    // Load credential store and auth logs
    const credentialStore = getLocalStorage(CREDENTIAL_STORE_KEY, true) as CredentialStore | null;
    const authLogs = getLocalStorage(AUTH_LOG_KEY, true) as AuthLog | null;
    
    if (!credentialStore || !authLogs) {
      await initialize();
      return {
        success: false,
        authState: null,
        error: "Authentication system not initialized",
        sessionToken: null
      };
    }

    // Check if account is locked due to failed attempts
    const now = new Date();
    if (authLogs.lockedUntil && authLogs.lockedUntil > now) {
      return {
        success: false,
        authState: null,
        error: `Account locked due to too many failed attempts. Try again in ${Math.ceil((authLogs.lockedUntil.getTime() - now.getTime()) / 60000)} minutes.`,
        sessionToken: null
      };
    }

    // Validate credentials based on authentication method
    const isValid = await validateCredential(
      request.method,
      request.credential,
      request.biometricData,
      request.deviceToken
    );

    if (!isValid) {
      // If validation fails, increment failed attempts and potentially lock account
      authLogs.failedAttempts++;
      authLogs.lastFailedAttempt = new Date();

      // Check if we need to lock the account
      const settings = getAuthSettings();
      if (settings.maxFailedAttempts > 0 && authLogs.failedAttempts >= settings.maxFailedAttempts) {
        authLogs.lockedUntil = new Date(Date.now() + settings.lockoutDuration);
      }

      // Log failed attempt
      await logAuthEvent({
        type: 'authentication',
        timestamp: new Date(),
        success: false,
        method: request.method,
        level: request.requestedLevel,
        error: 'Invalid credentials'
      });

      // Save updated auth logs
      setLocalStorage(AUTH_LOG_KEY, authLogs, true);

      return {
        success: false,
        authState: null,
        error: 'Invalid credentials',
        sessionToken: null
      };
    }

    // If validation succeeds, create new session with expiry time
    authLogs.failedAttempts = 0;
    authLogs.lastFailedAttempt = null;
    authLogs.lockedUntil = null;

    // Create new session
    const settings = getAuthSettings();
    const expiry = new Date(now.getTime() + settings.sessionTimeout);
    
    // Generate session token and store in local storage
    const currentState = getAuthState();
    const userId = currentState.userId || uuid.v4();
    
    const newAuthState: AuthState = {
      isAuthenticated: true,
      authLevel: request.requestedLevel,
      authMethod: request.method,
      lastAuthenticated: now,
      sessionExpiry: expiry,
      userId
    };

    // Create token payload
    const tokenPayload = {
      sub: userId,
      authLevel: request.requestedLevel,
      authMethod: request.method,
      iat: now.getTime(),
      exp: expiry.getTime()
    };

    // Convert token to base64 and store
    const tokenStr = `header.${btoa(JSON.stringify(tokenPayload))}.signature`;
    setLocalStorage(STORAGE_KEYS.AUTH_TOKEN, tokenStr);
    setAuthToken(tokenStr);

    // Update auth logs with successful authentication event
    await logAuthEvent({
      type: 'authentication',
      timestamp: now,
      success: true,
      method: request.method,
      level: request.requestedLevel,
      error: null
    });

    // Save updated auth logs
    setLocalStorage(AUTH_LOG_KEY, authLogs, true);

    return {
      success: true,
      authState: newAuthState,
      error: null,
      sessionToken: tokenStr
    };
  } catch (error) {
    logError(error, "Authentication error");
    return {
      success: false,
      authState: null,
      error: formatErrorMessage(error, "Authentication failed"),
      sessionToken: null
    };
  }
}

/**
 * Logs out the current user by clearing the session
 * @returns Promise resolving to true if logout was successful
 */
export async function logout(): Promise<boolean> {
  try {
    // Clear authentication token from storage
    removeLocalStorage(STORAGE_KEYS.AUTH_TOKEN);
    clearAuthToken();

    // Update auth state to unauthenticated
    const currentState = getAuthState();
    const userId = currentState.userId;

    // Log logout event in auth logs
    await logAuthEvent({
      type: 'logout',
      timestamp: new Date(),
      success: true,
      method: AuthMethod.NONE,
      level: AuthLevel.UNAUTHENTICATED,
      error: null
    });

    return true;
  } catch (error) {
    logError(error, "Logout error");
    return false;
  }
}

/**
 * Retrieves the current authentication state
 * @returns Current authentication state
 */
export function getAuthState(): AuthState {
  // Check for existing session token
  const token = getLocalStorage(STORAGE_KEYS.AUTH_TOKEN);
  
  // If token exists, validate session expiry
  if (token) {
    try {
      // Parse token data
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const expiry = new Date(tokenData.exp);
      
      // If session is valid, return authenticated state with appropriate level
      if (expiry > new Date()) {
        return {
          isAuthenticated: true,
          authLevel: tokenData.authLevel || AuthLevel.BASIC,
          authMethod: tokenData.authMethod || AuthMethod.NONE,
          lastAuthenticated: tokenData.iat ? new Date(tokenData.iat) : null,
          sessionExpiry: expiry,
          userId: tokenData.sub || null
        };
      } else {
        // If session is expired, clear token and return unauthenticated state
        removeLocalStorage(STORAGE_KEYS.AUTH_TOKEN);
        clearAuthToken();
      }
    } catch (error) {
      // Invalid token, clear it
      removeLocalStorage(STORAGE_KEYS.AUTH_TOKEN);
      clearAuthToken();
    }
  }
  
  // If no token exists, return unauthenticated state
  return {
    isAuthenticated: false,
    authLevel: AuthLevel.UNAUTHENTICATED,
    authMethod: AuthMethod.NONE,
    lastAuthenticated: null,
    sessionExpiry: null,
    userId: null
  };
}

/**
 * Checks if the user is authenticated at the required level
 * @param requiredLevel The minimum authentication level required
 * @returns True if user is authenticated at the required level
 */
export function isAuthenticated(requiredLevel: AuthLevel = AuthLevel.BASIC): boolean {
  // Get current authentication state
  const state = getAuthState();
  
  if (!state.isAuthenticated) {
    return false;
  }
  
  // Compare current auth level with required level
  const levels = {
    [AuthLevel.UNAUTHENTICATED]: 0,
    [AuthLevel.BASIC]: 1,
    [AuthLevel.STANDARD]: 2,
    [AuthLevel.FULL]: 3
  };
  
  return levels[state.authLevel] >= levels[requiredLevel];
}

/**
 * Checks if the user has the specified permission at the required level
 * @param permission The permission to check
 * @param requiredLevel The minimum permission level required
 * @returns True if user has the required permission level
 */
export function hasPermission(
  permission: Permission, 
  requiredLevel: PermissionLevel = PermissionLevel.READ
): boolean {
  // Get current authentication state
  const state = getAuthState();
  
  // Get permission map for current auth level
  const permissionMap = getPermissionMap(state.authLevel);
  
  // Check if permission exists in the map
  if (!permissionMap[permission]) {
    return false;
  }
  
  // Compare permission level with required level
  const levels = {
    [PermissionLevel.NONE]: 0,
    [PermissionLevel.READ]: 1,
    [PermissionLevel.WRITE]: 2,
    [PermissionLevel.FULL]: 3
  };
  
  return levels[permissionMap[permission]] >= levels[requiredLevel];
}

/**
 * Checks if the user meets the specified authentication requirement
 * @param requirement Authentication requirement to check
 * @returns True if user meets the requirement
 */
export function checkRequirement(requirement: AuthRequirement): boolean {
  // Check if user is authenticated at the required level
  if (!isAuthenticated(requirement.authLevel)) {
    return false;
  }
  
  // For each permission in the requirement, check if user has the required level
  for (const { permission, level } of requirement.permissions) {
    if (!hasPermission(permission, level)) {
      return false;
    }
  }
  
  // Return true only if all checks pass
  return true;
}

/**
 * Refreshes the current authentication session
 * @returns Promise resolving to true if session was refreshed successfully
 */
export async function refreshSession(): Promise<boolean> {
  // Get current authentication state
  const state = getAuthState();
  
  // If not authenticated, return false
  if (!state.isAuthenticated) {
    return false;
  }
  
  // Calculate new session expiry time
  const settings = getAuthSettings();
  const now = new Date();
  const expiry = new Date(now.getTime() + settings.sessionTimeout);
  
  // Update session token with new expiry
  const tokenPayload = {
    sub: state.userId,
    authLevel: state.authLevel,
    authMethod: state.authMethod,
    iat: state.lastAuthenticated ? state.lastAuthenticated.getTime() : now.getTime(),
    exp: expiry.getTime()
  };
  
  const tokenStr = `header.${btoa(JSON.stringify(tokenPayload))}.signature`;
  setLocalStorage(STORAGE_KEYS.AUTH_TOKEN, tokenStr);
  setAuthToken(tokenStr);
  
  return true;
}

/**
 * Retrieves the current authentication settings
 * @returns Current authentication settings
 */
export function getAuthSettings(): AuthSettings {
  // Load authentication settings from local storage
  const settings = getLocalStorage('auth_settings') as AuthSettings | null;
  
  // If settings don't exist, return default settings
  if (!settings) {
    return getDefaultAuthSettings();
  }
  
  // Return the loaded settings
  return settings;
}

/**
 * Updates the authentication settings
 * @param settings Partial settings to update
 * @returns Promise resolving to true if settings were updated successfully
 */
export async function updateAuthSettings(settings: Partial<AuthSettings>): Promise<boolean> {
  try {
    // Load current authentication settings
    const currentSettings = getAuthSettings();
    
    // Merge current settings with provided partial settings
    const newSettings: AuthSettings = {
      ...currentSettings,
      ...settings
    };
    
    // Validate new settings for consistency
    if (newSettings.sessionTimeout <= 0) {
      newSettings.sessionTimeout = DEFAULT_SESSION_TIMEOUT;
    }
    
    if (newSettings.inactivityTimeout <= 0) {
      newSettings.inactivityTimeout = DEFAULT_INACTIVITY_TIMEOUT;
    }
    
    if (newSettings.maxFailedAttempts < 0) {
      newSettings.maxFailedAttempts = DEFAULT_MAX_FAILED_ATTEMPTS;
    }
    
    if (newSettings.lockoutDuration <= 0) {
      newSettings.lockoutDuration = DEFAULT_LOCKOUT_DURATION;
    }
    
    // Save updated settings to local storage
    setLocalStorage('auth_settings', newSettings);
    
    return true;
  } catch (error) {
    logError(error, "Update auth settings error");
    return false;
  }
}

/**
 * Updates the authentication credentials
 * @param method Authentication method
 * @param credential New credential value
 * @returns Promise resolving to true if credentials were updated successfully
 */
export async function updateCredentials(method: AuthMethod, credential: string): Promise<boolean> {
  try {
    // Load credential store
    const credentialStore = getLocalStorage(CREDENTIAL_STORE_KEY, true) as CredentialStore | null;
    
    if (!credentialStore) {
      await initialize();
      return false;
    }
    
    // Initialize auth credentials if they don't exist
    if (!credentialStore.authCredentials) {
      credentialStore.authCredentials = {
        method: AuthMethod.NONE,
        pinHash: null,
        passwordHash: null,
        biometricEnabled: false,
        deviceAuthEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    // Based on method, update the appropriate credential
    switch (method) {
      case AuthMethod.PIN:
        credentialStore.authCredentials.method = method;
        credentialStore.authCredentials.pinHash = hashCredential(credential);
        break;
        
      case AuthMethod.PASSWORD:
        credentialStore.authCredentials.method = method;
        credentialStore.authCredentials.passwordHash = hashCredential(credential);
        break;
        
      case AuthMethod.BIOMETRIC:
        credentialStore.authCredentials.method = method;
        credentialStore.authCredentials.biometricEnabled = true;
        break;
        
      case AuthMethod.DEVICE:
        credentialStore.authCredentials.method = method;
        credentialStore.authCredentials.deviceAuthEnabled = true;
        break;
        
      default:
        throw new Error(`Unsupported authentication method: ${method}`);
    }
    
    // Update timestamp
    credentialStore.authCredentials.updatedAt = new Date();
    
    // Save updated credential store
    setLocalStorage(CREDENTIAL_STORE_KEY, credentialStore, true);
    
    return true;
  } catch (error) {
    logError(error, "Update credentials error");
    return false;
  }
}

/**
 * Retrieves an API key for a specific service
 * @param service Service name
 * @returns Promise resolving to API key or null if not found
 */
export async function getApiKey(service: string): Promise<string | null> {
  try {
    // Load credential store
    const credentialStore = getLocalStorage(CREDENTIAL_STORE_KEY, true) as CredentialStore | null;
    
    if (!credentialStore) {
      await initialize();
      return null;
    }
    
    // Check if API key exists for the specified service
    const apiKey = credentialStore.apiKeys[service];
    if (!apiKey) {
      return null;
    }
    
    // If authentication required, verify user is authenticated
    if (apiKey.requiresAuth && !isAuthenticated()) {
      return null;
    }
    
    // If all checks pass, return the decrypted API key
    return CryptoJS.AES.decrypt(apiKey.key, 'api_key_encryption').toString(CryptoJS.enc.Utf8);
  } catch (error) {
    logError(error, "Get API key error");
    return null;
  }
}

/**
 * Stores an API key for a specific service
 * @param service Service name
 * @param key API key to store
 * @param requiresAuth Whether authentication is required to use the key
 * @returns Promise resolving to true if API key was stored successfully
 */
export async function storeApiKey(
  service: string,
  key: string,
  requiresAuth: boolean = true
): Promise<boolean> {
  try {
    // Load credential store
    let credentialStore = getLocalStorage(CREDENTIAL_STORE_KEY, true) as CredentialStore | null;
    
    if (!credentialStore) {
      await initialize();
      credentialStore = getLocalStorage(CREDENTIAL_STORE_KEY, true) as CredentialStore;
      if (!credentialStore) {
        return false;
      }
    }
    
    // Create new API key credential with encrypted key
    const encryptedKey = CryptoJS.AES.encrypt(key, 'api_key_encryption').toString();
    const apiKeyCredential: ApiKeyCredential = {
      key: encryptedKey,
      createdAt: new Date(),
      lastUsed: null,
      requiresAuth
    };
    
    // Add or update the key in the credential store
    credentialStore.apiKeys[service] = apiKeyCredential;
    
    // Save updated credential store
    setLocalStorage(CREDENTIAL_STORE_KEY, credentialStore, true);
    
    return true;
  } catch (error) {
    logError(error, "Store API key error");
    return false;
  }
}

/**
 * Removes an API key for a specific service
 * @param service Service name
 * @returns Promise resolving to true if API key was removed successfully
 */
export async function removeApiKey(service: string): Promise<boolean> {
  try {
    // Load credential store
    const credentialStore = getLocalStorage(CREDENTIAL_STORE_KEY, true) as CredentialStore | null;
    
    if (!credentialStore) {
      return false;
    }
    
    // Check if API key exists for the specified service
    if (!credentialStore.apiKeys[service]) {
      return true; // Already doesn't exist
    }
    
    // If key exists, remove it from the credential store
    delete credentialStore.apiKeys[service];
    
    // Save updated credential store
    setLocalStorage(CREDENTIAL_STORE_KEY, credentialStore, true);
    
    return true;
  } catch (error) {
    logError(error, "Remove API key error");
    return false;
  }
}

/**
 * Validates a credential against stored credentials
 * @param method Authentication method
 * @param credential Credential to validate
 * @param biometricData Biometric data for biometric authentication
 * @param deviceToken Device token for device authentication
 * @returns Promise resolving to true if credential is valid
 */
async function validateCredential(
  method: AuthMethod,
  credential: string | null,
  biometricData: any | null,
  deviceToken: string | null
): Promise<boolean> {
  // Load credential store
  const credentialStore = getLocalStorage(CREDENTIAL_STORE_KEY, true) as CredentialStore | null;
  
  if (!credentialStore || !credentialStore.authCredentials) {
    return false;
  }
  
  // Based on method, validate the appropriate credential
  const authCreds = credentialStore.authCredentials;
  
  switch (method) {
    case AuthMethod.PIN:
      if (!credential || !authCreds.pinHash) {
        return false;
      }
      return hashCredential(credential) === authCreds.pinHash;
      
    case AuthMethod.PASSWORD:
      if (!credential || !authCreds.passwordHash) {
        return false;
      }
      return hashCredential(credential) === authCreds.passwordHash;
      
    case AuthMethod.BIOMETRIC:
      if (!authCreds.biometricEnabled) {
        return false;
      }
      // Validate biometric data using platform APIs
      // This is a simplified implementation; real biometric validation would use platform-specific APIs
      return !!biometricData;
      
    case AuthMethod.DEVICE:
      if (!authCreds.deviceAuthEnabled) {
        return false;
      }
      // Validate device token
      // This is a simplified implementation; real device authentication would use platform-specific mechanisms
      return !!deviceToken;
      
    default:
      return false;
  }
}

/**
 * Hashes a credential for secure storage
 * @param credential Credential to hash
 * @returns Hashed credential
 */
function hashCredential(credential: string): string {
  // Use CryptoJS to create SHA-256 hash of the credential
  return CryptoJS.SHA256(credential).toString();
}

/**
 * Gets the permission map for a specific authentication level
 * @param level Authentication level
 * @returns Map of permissions to their levels
 */
function getPermissionMap(level: AuthLevel): Record<Permission, PermissionLevel> {
  // Define permission maps for each authentication level
  switch (level) {
    case AuthLevel.FULL:
      return {
        [Permission.VIEW_CONVERSATIONS]: PermissionLevel.FULL,
        [Permission.MANAGE_CONVERSATIONS]: PermissionLevel.FULL,
        [Permission.VIEW_MEMORY]: PermissionLevel.FULL,
        [Permission.MANAGE_MEMORY]: PermissionLevel.FULL,
        [Permission.PROCESS_DOCUMENTS]: PermissionLevel.FULL,
        [Permission.ACCESS_WEB]: PermissionLevel.FULL,
        [Permission.MANAGE_API_KEYS]: PermissionLevel.FULL,
        [Permission.MANAGE_SETTINGS]: PermissionLevel.FULL,
        [Permission.EXPORT_DATA]: PermissionLevel.FULL,
        [Permission.DELETE_DATA]: PermissionLevel.FULL,
        [Permission.VIEW_LOGS]: PermissionLevel.FULL
      };
      
    case AuthLevel.STANDARD:
      return {
        [Permission.VIEW_CONVERSATIONS]: PermissionLevel.FULL,
        [Permission.MANAGE_CONVERSATIONS]: PermissionLevel.WRITE,
        [Permission.VIEW_MEMORY]: PermissionLevel.FULL,
        [Permission.MANAGE_MEMORY]: PermissionLevel.WRITE,
        [Permission.PROCESS_DOCUMENTS]: PermissionLevel.WRITE,
        [Permission.ACCESS_WEB]: PermissionLevel.WRITE,
        [Permission.MANAGE_API_KEYS]: PermissionLevel.READ,
        [Permission.MANAGE_SETTINGS]: PermissionLevel.WRITE,
        [Permission.EXPORT_DATA]: PermissionLevel.READ,
        [Permission.DELETE_DATA]: PermissionLevel.NONE,
        [Permission.VIEW_LOGS]: PermissionLevel.READ
      };
      
    case AuthLevel.BASIC:
      return {
        [Permission.VIEW_CONVERSATIONS]: PermissionLevel.READ,
        [Permission.MANAGE_CONVERSATIONS]: PermissionLevel.WRITE,
        [Permission.VIEW_MEMORY]: PermissionLevel.READ,
        [Permission.MANAGE_MEMORY]: PermissionLevel.NONE,
        [Permission.PROCESS_DOCUMENTS]: PermissionLevel.READ,
        [Permission.ACCESS_WEB]: PermissionLevel.READ,
        [Permission.MANAGE_API_KEYS]: PermissionLevel.NONE,
        [Permission.MANAGE_SETTINGS]: PermissionLevel.READ,
        [Permission.EXPORT_DATA]: PermissionLevel.NONE,
        [Permission.DELETE_DATA]: PermissionLevel.NONE,
        [Permission.VIEW_LOGS]: PermissionLevel.NONE
      };
      
    case AuthLevel.UNAUTHENTICATED:
    default:
      return {
        [Permission.VIEW_CONVERSATIONS]: PermissionLevel.READ,
        [Permission.MANAGE_CONVERSATIONS]: PermissionLevel.NONE,
        [Permission.VIEW_MEMORY]: PermissionLevel.NONE,
        [Permission.MANAGE_MEMORY]: PermissionLevel.NONE,
        [Permission.PROCESS_DOCUMENTS]: PermissionLevel.NONE,
        [Permission.ACCESS_WEB]: PermissionLevel.NONE,
        [Permission.MANAGE_API_KEYS]: PermissionLevel.NONE,
        [Permission.MANAGE_SETTINGS]: PermissionLevel.NONE,
        [Permission.EXPORT_DATA]: PermissionLevel.NONE,
        [Permission.DELETE_DATA]: PermissionLevel.NONE,
        [Permission.VIEW_LOGS]: PermissionLevel.NONE
      };
  }
}

/**
 * Logs an authentication event
 * @param event Authentication event to log
 * @returns Promise that resolves when the event is logged
 */
async function logAuthEvent(event: AuthEvent): Promise<void> {
  try {
    // Load authentication logs
    let authLogs = getLocalStorage(AUTH_LOG_KEY, true) as AuthLog | null;
    
    if (!authLogs) {
      authLogs = {
        events: [],
        failedAttempts: 0,
        lastFailedAttempt: null,
        lockedUntil: null
      };
    }
    
    // Add the new event to the logs
    authLogs.events.push(event);
    
    // Trim logs if they exceed maximum size
    if (authLogs.events.length > 100) {
      authLogs.events = authLogs.events.slice(-100);
    }
    
    // Save updated logs to local storage
    setLocalStorage(AUTH_LOG_KEY, authLogs, true);
  } catch (error) {
    logError(error, "Log auth event error");
  }
}

/**
 * Gets the default authentication settings
 * @returns Default authentication settings
 */
function getDefaultAuthSettings(): AuthSettings {
  // Create default settings object with reasonable defaults
  return {
    enabled: false,
    method: AuthMethod.NONE,
    sessionTimeout: DEFAULT_SESSION_TIMEOUT,
    requireAuthForSensitiveOperations: true,
    lockAfterInactivity: true,
    inactivityTimeout: DEFAULT_INACTIVITY_TIMEOUT,
    maxFailedAttempts: DEFAULT_MAX_FAILED_ATTEMPTS,
    lockoutDuration: DEFAULT_LOCKOUT_DURATION
  };
}