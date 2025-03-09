/**
 * Jest configuration for the Personal AI Agent React Native mobile application
 * This file configures Jest to properly test React Native components and properly
 * handle TypeScript, transformations, and native module mocking.
 * 
 * @version 1.0.0
 */

module.exports = {
  // Use the React Native preset which configures Jest with proper defaults for React Native
  preset: 'react-native',
  
  // File extensions Jest should look for
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Transform files with Babel
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  
  // Don't transform node_modules except for React Native and Expo packages
  // This is crucial for React Native testing as some RN packages need transformation
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo-.*|@expo|@react-navigation)/)',
  ],
  
  // Module name mapper for path aliases and static assets
  moduleNameMapper: {
    // Map "@/" imports to the src directory
    '^@/(.*)$': '<rootDir>/src/$1',
    
    // Mock static asset imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  
  // Setup files for React Native testing library
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
  ],
  
  // Paths to ignore for testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
  ],
  
  // Enable code coverage collection
  collectCoverage: true,
  
  // Specify which files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!**/node_modules/**',
  ],
  
  // Coverage report formats
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage thresholds to enforce code quality
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Higher threshold for UI components to ensure quality
    'src/components/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};