import React, { useEffect } from 'react';
import { Metadata } from 'next/dist/lib/metadata/metadata'; // next version 13+
import Dashboard from '../components/dashboard/Dashboard';
import useSettingsStore from '../store/settingsStore'; // zustand version 4.4.0+

/**
 * The main homepage component that renders the dashboard
 * @returns The rendered homepage with dashboard
 */
const HomePage: React.FC = () => {
  // Access the loadSettings function from useSettingsStore
  const { loadSettings } = useSettingsStore();

  // Use useEffect to load user settings when the component mounts
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Return the Dashboard component which contains all dashboard sections
  // The Dashboard component will handle the layout and rendering of all dashboard sections
  return (
    <Dashboard />
  );
};

/**
 * Defines metadata for the homepage
 * @returns Homepage metadata object
 */
const metadata = (): Metadata => {
  // Define title as 'Dashboard - Personal AI Agent'
  // Define description as 'Your personal AI assistant dashboard'
  return {
    title: 'Dashboard - Personal AI Agent',
    description: 'Your personal AI assistant dashboard',
  };
};

// Export page metadata for Next.js
export { metadata };

// Default export of the homepage component
export default HomePage;