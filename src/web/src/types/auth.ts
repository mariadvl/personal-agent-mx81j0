/**
 * Auth Type Definitions
 * 
 * This file defines the core types, interfaces, and enums used throughout 
 * the authentication and authorization system of the Personal AI Agent.
 * It implements a local-first approach that prioritizes user privacy
 * while ensuring appropriate security controls.
 */

/**
 * Authentication methods available in the application
 */
export enum AuthMethod {
  /** No authentication configured */
  NONE = "none",
  /** PIN-based authentication */
  PIN = "pin", 
  /** Password-based authentication */
  PASSWORD = "password",
  /** Biometric authentication (fingerprint, face ID) */
  BIOMETRIC = "biometric",
  /** Device-level authentication (leverages OS security) */
  DEVICE = "device"
}

/**
 * Authentication levels with increasing privileges
 */
export enum AuthLevel {
  /** No authentication, limited access */
  UNAUTHENTICATED = "unauthenticated",
  /** Basic authentication, access to non-sensitive features */
  BASIC = "basic",
  /** Standard authentication, access to most features */
  STANDARD = "standard", 
  /** Full authentication, access to all features including sensitive operations */
  FULL = "full"
}

/**
 * Available permissions for feature access
 */
export enum Permission {
  /** Permission to view conversations */
  VIEW_CONVERSATIONS = "view_conversations",
  /** Permission to create, update, delete conversations */
  MANAGE_CONVERSATIONS = "manage_conversations",
  /** Permission to view stored memories */
  VIEW_MEMORY = "view_memory",
  /** Permission to create, update, delete memories */
  MANAGE_MEMORY = "manage_memory",
  /** Permission to upload and process documents */
  PROCESS_DOCUMENTS = "process_documents",
  /** Permission to access web content and perform searches */
  ACCESS_WEB = "access_web",
  /** Permission to configure and manage API keys */
  MANAGE_API_KEYS = "manage_api_keys",
  /** Permission to modify application settings */
  MANAGE_SETTINGS = "manage_settings",
  /** Permission to export user data */
  EXPORT_DATA = "export_data",
  /** Permission to delete user data */
  DELETE_DATA = "delete_data",
  /** Permission to view authentication and access logs */
  VIEW_LOGS = "view_logs"
}

/**
 * Permission levels for each permission
 */
export enum PermissionLevel {
  /** No access granted */
  NONE = "none",
  /** Read-only access */
  READ = "read",
  /** Read and write access */
  WRITE = "write",
  /** Full access including management operations */
  FULL = "full"
}

/**
 * Represents the current authentication state
 */
export interface AuthState {
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** The current authentication level */
  authLevel: AuthLevel;
  /** The method used for authentication */
  authMethod: AuthMethod;
  /** When the last successful authentication occurred */
  lastAuthenticated: Date | null;
  /** When the current session expires */
  sessionExpiry: Date | null;
  /** Unique identifier for the authenticated user (device-specific) */
  userId: string | null;
}

/**
 * Represents stored authentication credentials
 */
export interface AuthCredentials {
  /** The primary authentication method */
  method: AuthMethod;
  /** Hash of the PIN if PIN authentication is used */
  pinHash: string | null;
  /** Hash of the password if password authentication is used */
  passwordHash: string | null;
  /** Whether biometric authentication is enabled */
  biometricEnabled: boolean;
  /** Whether device authentication is enabled */
  deviceAuthEnabled: boolean;
  /** When the credentials were created */
  createdAt: Date;
  /** When the credentials were last updated */
  updatedAt: Date;
}

/**
 * Represents an authentication request
 */
export interface AuthRequest {
  /** The authentication method being used */
  method: AuthMethod;
  /** The credential (PIN or password) if applicable */
  credential: string | null;
  /** Biometric data if using biometric authentication */
  biometricData: any | null;
  /** Device token if using device authentication */
  deviceToken: string | null;
  /** The authentication level being requested */
  requestedLevel: AuthLevel;
}

/**
 * Represents an authentication response
 */
export interface AuthResponse {
  /** Whether authentication was successful */
  success: boolean;
  /** The new authentication state if authentication was successful */
  authState: AuthState | null;
  /** Error message if authentication failed */
  error: string | null;
  /** Session token for subsequent requests */
  sessionToken: string | null;
}

/**
 * Represents authentication settings
 */
export interface AuthSettings {
  /** Whether authentication is enabled */
  enabled: boolean;
  /** The configured authentication method */
  method: AuthMethod;
  /** Session timeout in minutes */
  sessionTimeout: number;
  /** Whether to require authentication for sensitive operations */
  requireAuthForSensitiveOperations: boolean;
  /** Whether to lock after a period of inactivity */
  lockAfterInactivity: boolean;
  /** Inactivity timeout in minutes */
  inactivityTimeout: number;
  /** Maximum number of failed authentication attempts before lockout */
  maxFailedAttempts: number;
  /** Lockout duration in minutes after maximum failed attempts */
  lockoutDuration: number;
}

/**
 * Maps permissions to their levels for a specific auth level
 */
export interface PermissionMap {
  [key: Permission]: PermissionLevel;
}

/**
 * Defines authentication requirements for a feature
 */
export interface AuthRequirement {
  /** Minimum authentication level required */
  authLevel: AuthLevel;
  /** Specific permissions required */
  permissions: Array<{ permission: Permission, level: PermissionLevel }>;
}

/**
 * Represents an authentication event for logging
 */
export interface AuthEvent {
  /** Type of authentication event */
  type: string;
  /** When the event occurred */
  timestamp: Date;
  /** Whether the authentication was successful */
  success: boolean;
  /** The authentication method used */
  method: AuthMethod;
  /** The authentication level requested/granted */
  level: AuthLevel;
  /** Error message if authentication failed */
  error: string | null;
}

/**
 * Represents authentication logs for tracking and security
 */
export interface AuthLog {
  /** List of authentication events */
  events: AuthEvent[];
  /** Current count of failed authentication attempts */
  failedAttempts: number;
  /** When the last failed attempt occurred */
  lastFailedAttempt: Date | null;
  /** When the lockout expires, if applicable */
  lockedUntil: Date | null;
}

/**
 * Represents an API key credential for external services
 */
export interface ApiKeyCredential {
  /** The API key (stored securely) */
  key: string;
  /** When the key was created */
  createdAt: Date;
  /** When the key was last used */
  lastUsed: Date | null;
  /** Whether authentication is required to use this key */
  requiresAuth: boolean;
}

/**
 * Represents the secure credential store
 */
export interface CredentialStore {
  /** Map of service names to API key credentials */
  apiKeys: Record<string, ApiKeyCredential>;
  /** Authentication credentials */
  authCredentials: AuthCredentials | null;
}