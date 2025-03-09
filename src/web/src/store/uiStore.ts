import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AlertProps, AlertType, ThemeMode } from '../types/ui';

// Constants
const STORE_NAME = 'uiStore';
const DEFAULT_THEME_MODE = ThemeMode.SYSTEM;
const DEFAULT_SIDEBAR_OPEN = true;
const DEFAULT_ACTIVE_TAB = 'dashboard';
const ALERT_AUTO_DISMISS_DURATION = 5000;

/**
 * Interface for the UI store state
 */
export interface UIState {
  themeMode: ThemeMode;
  isSidebarOpen: boolean;
  activeTab: string;
  alerts: AlertProps[];
  isLoading: boolean;
  isMobileMenuOpen: boolean;
}

/**
 * Interface for the UI store actions
 */
export interface UIActions {
  /**
   * Set the theme mode (light, dark, or system)
   */
  setThemeMode: (mode: ThemeMode) => void;
  
  /**
   * Set the sidebar open state
   */
  setSidebarOpen: (isOpen: boolean) => void;
  
  /**
   * Toggle the sidebar open/closed state
   */
  toggleSidebar: () => void;
  
  /**
   * Set the active navigation tab
   */
  setActiveTab: (tab: string) => void;
  
  /**
   * Add an alert to the alerts array
   * @returns The ID of the added alert
   */
  addAlert: (alert: Omit<AlertProps, 'id'>) => string;
  
  /**
   * Remove an alert by ID
   */
  removeAlert: (id: string) => void;
  
  /**
   * Clear all alerts
   */
  clearAlerts: () => void;
  
  /**
   * Set the global loading state
   */
  setIsLoading: (isLoading: boolean) => void;
  
  /**
   * Set the mobile menu open state
   */
  setMobileMenuOpen: (isOpen: boolean) => void;
  
  /**
   * Toggle the mobile menu open/closed state
   */
  toggleMobileMenu: () => void;
}

/**
 * Combined interface for the UI store state and actions
 */
export interface UIStore extends UIState, UIActions {}

/**
 * Zustand store for UI state management
 * Manages theme preferences, navigation state, alerts, and responsive UI elements
 */
export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        themeMode: DEFAULT_THEME_MODE,
        isSidebarOpen: DEFAULT_SIDEBAR_OPEN,
        activeTab: DEFAULT_ACTIVE_TAB,
        alerts: [],
        isLoading: false,
        isMobileMenuOpen: false,

        // Theme actions
        setThemeMode: (mode) => set({ themeMode: mode }),
        
        // Sidebar actions
        setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
        toggleSidebar: () => set((state) => ({ 
          isSidebarOpen: !state.isSidebarOpen 
        })),
        
        // Navigation actions
        setActiveTab: (tab) => set({ activeTab: tab }),
        
        // Alert management
        addAlert: (alert) => {
          const id = `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          const newAlert: AlertProps = {
            ...alert,
            id,
            autoClose: alert.autoClose ?? true,
            duration: alert.duration ?? ALERT_AUTO_DISMISS_DURATION,
          };
          
          set((state) => ({ alerts: [...state.alerts, newAlert] }));
          
          // Auto-dismiss if autoClose is true
          if (newAlert.autoClose) {
            setTimeout(() => {
              get().removeAlert(id);
            }, newAlert.duration);
          }
          
          return id;
        },
        
        removeAlert: (id) => set((state) => ({ 
          alerts: state.alerts.filter((alert) => alert.id !== id) 
        })),
        
        clearAlerts: () => set({ alerts: [] }),
        
        // Loading state
        setIsLoading: (isLoading) => set({ isLoading }),
        
        // Mobile responsiveness
        setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
        toggleMobileMenu: () => set((state) => ({ 
          isMobileMenuOpen: !state.isMobileMenuOpen 
        })),
      }),
      {
        name: STORE_NAME,
        // Only persist theme and layout preferences, not transient state like alerts
        partialize: (state) => ({
          themeMode: state.themeMode,
          isSidebarOpen: state.isSidebarOpen,
          activeTab: state.activeTab,
        }),
      }
    ),
    { name: STORE_NAME }
  )
);