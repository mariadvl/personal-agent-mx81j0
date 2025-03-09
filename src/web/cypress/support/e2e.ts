// ***********************************************************
// This file is processed and loaded automatically before your 
// test files when using the 'e2e' configuration.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
// ***********************************************************

// Import Cypress plugins and commands
import 'cypress'; // ^12.0.0
import '@testing-library/cypress'; // ^9.0.0
import 'cypress-localstorage-commands'; // ^2.0.0
import '@cypress/code-coverage'; // ^3.10.0

// Import our custom commands
import './commands';

// Configure plugins and Cypress behavior
// Register Testing Library commands
Cypress.Commands.add = Cypress.Commands.add || (() => {});

// Configure localStorage commands
const LOCAL_STORAGE_MEMORY = {};

// Set up Cypress event handlers
// Prevent tests from failing on uncaught exceptions in the application
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false prevents Cypress from failing the test
  console.warn('Uncaught exception:', err.message);
  return false;
});

// Set up the window environment before page loads
Cypress.on('window:before:load', (win) => {
  // You could mock global objects, set environment variables, etc.
  win.ResizeObserver = win.ResizeObserver || class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Process test results after each test
Cypress.on('test:after:run', (attributes, runnable) => {
  // If the test failed, take a screenshot
  if (attributes.state === 'failed') {
    const specName = Cypress.spec.name;
    const testName = runnable.fullTitle();
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const screenshotName = `${specName}--${testName}--${timestamp}`;
    
    // Log the failure for easier debugging
    console.error(`Test failed: ${testName}`);
    
    // Save screenshot with organized naming
    cy.screenshot(screenshotName, { capture: 'runner' });
  }
});

// Before each test
beforeEach(() => {
  // Preserve localStorage between tests if configured
  if (Cypress.env('preserveLocalStorage')) {
    cy.restoreLocalStorage();
  }
  
  // Reset API mocks and interceptors
  cy.intercept('**', (req) => {
    req.on('before:response', (res) => {
      // Ensure stable response times in tests
      res.delay = 0;
    });
  });
  
  // Set default viewport size for consistent testing
  cy.viewport(1280, 720);
});

// After each test
afterEach(() => {
  // Save localStorage if preservation is enabled
  if (Cypress.env('preserveLocalStorage')) {
    cy.saveLocalStorage();
  } else {
    cy.clearLocalStorage();
  }
  
  // Clean up any remaining interceptors
  cy.get('@mockConversation', { log: false }).then(() => {}, () => {});
  cy.get('@mockDocumentUpload', { log: false }).then(() => {}, () => {});
  cy.get('@mockDocumentProcess', { log: false }).then(() => {}, () => {});
  cy.get('@mockMemoryList', { log: false }).then(() => {}, () => {});
  cy.get('@mockMemorySearch', { log: false }).then(() => {}, () => {});
  cy.get('@mockSettingsResponse', { log: false }).then(() => {}, () => {});
  cy.get('@mockWebExtract', { log: false }).then(() => {}, () => {});
  cy.get('@mockSearchResults', { log: false }).then(() => {}, () => {});
  cy.get('@mockVoiceTranscription', { log: false }).then(() => {}, () => {});
  cy.get('@mockVoiceSynthesis', { log: false }).then(() => {}, () => {});
  
  // Log test completion for better CI output
  cy.log('Test completed');
});