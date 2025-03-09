/**
 * Authentication Store
 * 
 * A Zustand store for managing authentication state in the Personal AI Agent.
 * Implements a local-first authentication approach that prioritizes user privacy
 * while ensuring appropriate security controls for the application.
 */

import { create } from 'zustand'; // zustand version 4.4.0
import { devtools, persist } from 'zustand/middleware'; // zustand version 4.4.0
import { 
  AuthState, AuthLevel, AuthMethod, AuthRequest, AuthResponse,
  Permission, PermissionLevel, AuthRequirement
} from '../types/auth';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '../utils/storage';
import {
  authenticate, logout, getAuthState, isAuthenticated, 
  hasPermission, checkRequirement, refreshSession
} from '../services/authService';

// Interval for checking session validity (60 seconds)
const SESSION_CHECK_INTERVAL = 60 * 1000;

/**
 * Interface for the authentication store state and actions
 */
interface AuthStore {
  // State
  authState: AuthState;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<boolean>;
  login: (request: AuthRequest) => Promise<AuthResponse>;
  logout: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  isAuthenticated: (requiredLevel?: AuthLevel) => boolean;
  hasPermission: (permission: Permission, requiredLevel?: PermissionLevel) => boolean;
  checkRequirement: (requirement: AuthRequirement) => boolean;
  resetState: () => void;
}

/**
 * Authentication store using Zustand
 * Manages authentication state, session management, and permission checking
 */
const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => {
        // Store interval ID for cleanup
        let sessionCheckIntervalId: number | null = null;
        
        // Helper to set up session checking
        const setupSessionCheck = () => {
          // Clean up existing interval if any
          if (sessionCheckIntervalId !== null) {
            clearInterval(sessionCheckIntervalId);
          }
          
          // Only set up in browser environment
          if (typeof window !== 'undefined') {
            const checkSession = async () => {
              const state = getAuthState(); // Get fresh state
              
              // Only check if authenticated and expiry exists
              if (state.isAuthenticated && state.sessionExpiry) {
                const now = new Date();
                const expiry = new Date(state.sessionExpiry);
                
                // If session is about to expire, refresh it
                if (expiry.getTime() - now.getTime() < SESSION_CHECK_INTERVAL) {
                  await get().refreshSession();
                }
              }
            };
            
            // Start interval
            sessionCheckIntervalId = window.setInterval(checkSession, SESSION_CHECK_INTERVAL);
            
            // Set up cleanup
            window.addEventListener('beforeunload', () => {
              if (sessionCheckIntervalId !== null) {
                clearInterval(sessionCheckIntervalId);
              }
            });
          }
        };
        
        return {
          // Initial state
          authState: {
            isAuthenticated: false,
            authLevel: AuthLevel.UNAUTHENTICATED,
            authMethod: AuthMethod.NONE,
            lastAuthenticated: null,
            sessionExpiry: null,
            userId: null
          },
          isInitialized: false,
          isLoading: false,
          error: null,
          
          // Initialize the authentication system
          initialize: async () => {
            set({ isLoading: true, error: null });
            try {
              // Initialize auth service
              const success = await refreshSession();
              
              // Get current auth state
              const currentState = getAuthState();
              
              set({ 
                authState: currentState,
                isInitialized: true,
                isLoading: false
              });
              
              // Set up session checking
              setupSessionCheck();
              
              return success;
            } catch (error) {
              console.error('Failed to initialize auth:', error);
              set({ 
                error: error instanceof Error ? error.message : 'Failed to initialize authentication',
                isLoading: false 
              });
              return false;
            }
          },
          
          // Authenticate a user with the provided credentials
          login: async (request: AuthRequest) => {
            set({ isLoading: true, error: null });
            try {
              const response = await authenticate(request);
              
              if (response.success && response.authState) {
                set({ 
                  authState: response.authState,
                  isLoading: false,
                  error: null
                });
                
                // Set up session checking after successful login
                setupSessionCheck();
              } else {
                set({ 
                  isLoading: false,
                  error: response.error || 'Authentication failed'
                });
              }
              
              return response;
            } catch (error) {
              console.error('Login error:', error);
              set({ 
                isLoading: false,
                error: error instanceof Error ? error.message : 'Login failed'
              });
              
              return {
                success: false,
                authState: null,
                error: error instanceof Error ? error.message : 'Login failed',
                sessionToken: null
              };
            }
          },
          
          // Log out the current user
          logout: async () => {
            set({ isLoading: true, error: null });
            try {
              const success = await logout();
              
              if (success) {
                set({ 
                  authState: {
                    isAuthenticated: false,
                    authLevel: AuthLevel.UNAUTHENTICATED,
                    authMethod: AuthMethod.NONE,
                    lastAuthenticated: null,
                    sessionExpiry: null,
                    userId: null
                  },
                  isLoading: false,
                  error: null
                });
                
                // Clear session check interval after logout
                if (sessionCheckIntervalId !== null) {
                  clearInterval(sessionCheckIntervalId);
                  sessionCheckIntervalId = null;
                }
              } else {
                set({ 
                  isLoading: false,
                  error: 'Logout failed'
                });
              }
              
              return success;
            } catch (error) {
              console.error('Logout error:', error);
              set({ 
                isLoading: false,
                error: error instanceof Error ? error.message : 'Logout failed'
              });
              return false;
            }
          },
          
          // Refresh the current authentication session
          refreshSession: async () => {
            try {
              const success = await refreshSession();
              
              if (success) {
                // Update state with fresh auth state
                const currentState = getAuthState();
                set({ authState: currentState });
              }
              
              return success;
            } catch (error) {
              console.error('Session refresh error:', error);
              return false;
            }
          },
          
          // Check if user is authenticated at the required level
          isAuthenticated: (requiredLevel?: AuthLevel) => {
            return isAuthenticated(requiredLevel);
          },
          
          // Check if user has the specified permission at the required level
          hasPermission: (permission: Permission, requiredLevel?: PermissionLevel) => {
            return hasPermission(permission, requiredLevel);
          },
          
          // Check if user meets the specified authentication requirement
          checkRequirement: (requirement: AuthRequirement) => {
            return checkRequirement(requirement);
          },
          
          // Reset the authentication state to defaults
          resetState: () => {
            set({
              authState: {
                isAuthenticated: false,
                authLevel: AuthLevel.UNAUTHENTICATED,
                authMethod: AuthMethod.NONE,
                lastAuthenticated: null,
                sessionExpiry: null,
                userId: null
              },
              isLoading: false,
              error: null
            });
            
            // Clear session check interval
            if (sessionCheckIntervalId !== null) {
              clearInterval(sessionCheckIntervalId);
              sessionCheckIntervalId = null;
            }
          }
        };
      },
      {
        name: 'auth-storage',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        // Only persist authentication state and initialization flag, not loading/error state
        partialize: (state) => ({ 
          authState: state.authState,
          isInitialized: state.isInitialized 
        }),
      }
    ),
    { name: 'auth-store' }
  )
);

export default useAuthStore;