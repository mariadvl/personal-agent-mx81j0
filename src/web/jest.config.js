const path = require('path');

module.exports = {
  // Test environment for React components
  testEnvironment: 'jsdom',
  
  // Additional setup after the testing framework is installed
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Transform files with Babel
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Module name mappers for path aliases and non-JS files
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  
  // Paths to ignore when looking for tests
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/cypress/',
  ],
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
    '!**/node_modules/**',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/components/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'src/utils/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // Directories where to look for modules
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Test pattern matching
  testMatch: ['**/__tests__/**/*.test.(js|jsx|ts|tsx)'],
  
  // Plugins for watch mode
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],
  
  // Reset mocks between tests
  resetMocks: true,
};