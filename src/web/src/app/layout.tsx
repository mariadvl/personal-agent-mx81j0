'use client';

import React from 'react';
import { ThemeProvider, GlobalStyles } from 'styled-components'; // styled-components ^5.3.10
import { Inter } from 'next/font/google'; // next/font/google ^14.0.0
import styled from 'styled-components';

// Layout components
import AppHeader from '../components/layout/AppHeader';
import AppNavigation from '../components/layout/AppNavigation';
import AppFooter from '../components/layout/AppFooter';
import StatusBar from '../components/layout/StatusBar';
import Alert from '../components/ui/Alert';

// Hooks for theme and UI state
import useTheme from '../hooks/useTheme';
import useUIStore from '../store/uiStore';

// Configure Inter font with Latin subset for optimal performance
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

// Metadata for the application used by Next.js for SEO
export const metadata = {
  title: 'Personal AI Agent',
  description: 'A local-first, memory-augmented AI companion that prioritizes your privacy'
};

// Props interface for the RootLayout component
interface RootLayoutProps {
  children: React.ReactNode;
}

// Styled main content container with responsive padding
const MainContent = styled.main`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  margin-top: 64px; // Header height
  margin-left: 0;
  transition: margin-left 0.3s ease;
  width: 100%;
  height: calc(100vh - 64px - 28px); // viewport height minus header and status bar
  
  @media (min-width: 768px) {
    margin-left: var(--sidebar-width, 0);
    width: calc(100% - var(--sidebar-width, 0));
  }
`;

// Styled container for alerts with fixed positioning
const AlertContainer = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 400px;
  width: calc(100% - 2rem);
`;

/**
 * Root layout component that wraps all pages in the application
 * Provides theme context, global styling, and consistent layout structure
 */
export default function RootLayout({ children }: RootLayoutProps) {
  // Access the current theme using useTheme hook
  const { theme } = useTheme();
  
  // Access alerts from the UI store
  const { alerts, removeAlert } = useUIStore();
  
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ThemeProvider theme={theme}>
          <GlobalStyles />
          
          {/* Application header with navigation controls */}
          <AppHeader />
          
          {/* Sidebar navigation for desktop */}
          <AppNavigation />
          
          {/* Main content area */}
          <MainContent>
            {children}
          </MainContent>
          
          {/* Mobile footer navigation */}
          <AppFooter />
          
          {/* Status bar showing privacy information */}
          <StatusBar />
          
          {/* Alert container for notifications */}
          <AlertContainer>
            {alerts.map((alert) => (
              <Alert 
                key={alert.id}
                id={alert.id}
                type={alert.type}
                message={alert.message}
                onClose={() => removeAlert(alert.id)}
                autoClose={alert.autoClose}
                duration={alert.duration}
              />
            ))}
          </AlertContainer>
        </ThemeProvider>
      </body>
    </html>
  );
}