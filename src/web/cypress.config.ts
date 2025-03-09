import { defineConfig } from 'cypress';
import codeCoverage from '@cypress/code-coverage';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
  // E2E testing configuration
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      // Set up code coverage collection
      codeCoverage(on, config);
      
      // Configure custom logging if needed
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
      });
      
      // Return the updated config
      return config;
    },
  },
  
  // Component testing configuration
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
  },
  
  // Viewport configuration
  viewportWidth: 1280,
  viewportHeight: 720,
  
  // Timeout settings
  defaultCommandTimeout: 10000,
  requestTimeout: 15000,
  responseTimeout: 15000,
  pageLoadTimeout: 30000,
  
  // Recording and screenshot settings
  video: false,
  screenshotOnRunFailure: true,
  trashAssetsBeforeRuns: true,
  
  // Test retry settings
  retries: {
    runMode: 2,      // Retry failed tests twice in CI
    openMode: 0,     // No retries in development mode
  },
  
  // Environment variables
  env: {
    // Code coverage settings
    codeCoverage: {
      url: '/api/__coverage__',
      exclude: [
        'cypress/**/*.*',
        '**/*.cy.{js,jsx,ts,tsx}'
      ],
    },
    // API URL for backend connection
    apiUrl: 'http://localhost:8000',
    // Preserve localStorage between tests
    preserveLocalStorage: true,
  },
});