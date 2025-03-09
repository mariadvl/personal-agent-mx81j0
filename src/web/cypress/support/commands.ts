// Import required dependencies
import '@testing-library/cypress/add-commands'; // v9.0.0
import 'cypress-localstorage-commands'; // v2.0.0
import 'cypress-file-upload'; // Required for file upload functionality

/**
 * This file extends Cypress with custom commands for testing the Personal AI Agent
 * Commands are organized by feature area: authentication, conversation, document, memory, settings, web, voice
 * Each command is designed to be reusable across multiple test files
 * Type definitions are provided for TypeScript support and better IDE integration
 */

declare global {
  namespace Cypress {
    interface Chainable {
      // Authentication
      login(): Chainable<void>;
      
      // Conversation
      createConversation(): Chainable<string>;
      sendMessage(message: string): Chainable<void>;
      waitForResponse(): Chainable<void>;
      mockConversationResponse(response: any): Chainable<void>;
      
      // Document
      uploadDocument(fixture: string, fileType: string): Chainable<string>;
      processDocument(documentId: string): Chainable<void>;
      mockDocumentUpload(response: any): Chainable<void>;
      mockDocumentProcess(documentId: string, response: any): Chainable<void>;
      
      // Memory
      mockMemoryList(response: any): Chainable<void>;
      mockMemorySearch(params: any, response: any): Chainable<void>;
      mockMemoryDetail(id: string, response: any): Chainable<void>;
      mockMemoryUpdate(id: string, response: any): Chainable<void>;
      mockMemoryDelete(id: string, response: any): Chainable<void>;
      
      // Settings
      mockSettingsResponse(settings: any): Chainable<void>;
      updateSettings(settings: any): Chainable<void>;
      
      // Web
      mockWebExtract(url: string, response: any): Chainable<void>;
      mockSearchResults(query: string, response: any): Chainable<void>;
      
      // Voice
      mockVoiceTranscription(response: any): Chainable<void>;
      mockVoiceSynthesis(response: any): Chainable<void>;
      
      // LocalStorage
      saveLocalStorage(): Chainable<void>;
      restoreLocalStorage(): Chainable<void>;
      clearLocalStorage(): Chainable<void>;
    }
  }
}

// Authentication commands
Cypress.Commands.add('login', () => {
  // Set localStorage with authentication token
  localStorage.setItem('auth_token', 'test-auth-token');
  
  // Set user preferences in localStorage
  localStorage.setItem('user_preferences', JSON.stringify({
    theme: 'light',
    voice_enabled: false,
    privacy_settings: {
      local_storage_only: true
    }
  }));
  
  // Visit the application home page
  cy.visit('/');
  
  // Wait for the application to load
  cy.findByTestId('dashboard-container').should('be.visible');
});

// Conversation commands
Cypress.Commands.add('createConversation', () => {
  // Intercept POST request to /api/conversation
  cy.intercept('POST', '/api/conversation').as('createConversation');
  
  // Visit the chat page
  cy.visit('/chat');
  
  // Wait for the conversation to be created
  return cy.wait('@createConversation').then((interception) => {
    const conversationId = interception.response?.body?.conversation_id;
    return conversationId;
  });
});

Cypress.Commands.add('sendMessage', (message: string) => {
  // Type the message in the message input field
  cy.findByTestId('message-input').type(message);
  
  // Press Enter to send the message
  cy.findByTestId('message-input').type('{enter}');
  
  // Wait for the message to appear in the conversation
  cy.findByTestId('message-list').contains(message).should('be.visible');
});

Cypress.Commands.add('waitForResponse', () => {
  // Wait for the AI message to appear in the conversation
  cy.findByTestId('message-list').find('[data-role="assistant"]').should('be.visible');
  
  // Verify the AI message has content
  cy.findByTestId('message-list').find('[data-role="assistant"]').should('not.be.empty');
});

Cypress.Commands.add('mockConversationResponse', (response: any) => {
  // Intercept POST request to /api/conversation
  cy.intercept('POST', '/api/conversation', {
    statusCode: 200,
    body: response
  }).as('mockConversation');
});

// Document commands
Cypress.Commands.add('uploadDocument', (fixture: string, fileType: string) => {
  // Intercept POST request to /api/document/upload
  cy.intercept('POST', '/api/document/upload').as('documentUpload');
  
  // Upload the fixture file
  cy.findByTestId('file-upload').attachFile({ filePath: fixture, fileType });
  
  // Wait for the upload to complete
  return cy.wait('@documentUpload').then((interception) => {
    const documentId = interception.response?.body?.document_id;
    return documentId;
  });
});

Cypress.Commands.add('processDocument', (documentId: string) => {
  // Intercept POST request to /api/document/{documentId}/process
  cy.intercept('POST', `/api/document/${documentId}/process`).as('processDocument');
  
  // Click the process button
  cy.findByTestId('process-document-button').click();
  
  // Wait for processing to complete
  cy.wait('@processDocument');
});

Cypress.Commands.add('mockDocumentUpload', (response: any) => {
  // Intercept POST request to /api/document/upload
  cy.intercept('POST', '/api/document/upload', {
    statusCode: 200,
    body: response
  }).as('mockDocumentUpload');
});

Cypress.Commands.add('mockDocumentProcess', (documentId: string, response: any) => {
  // Intercept POST request to /api/document/{documentId}/process
  cy.intercept('POST', `/api/document/${documentId}/process`, {
    statusCode: 200,
    body: response
  }).as('mockDocumentProcess');
});

// Memory commands
Cypress.Commands.add('mockMemoryList', (response: any) => {
  // Intercept GET request to /api/memory
  cy.intercept('GET', '/api/memory', {
    statusCode: 200,
    body: response
  }).as('mockMemoryList');
});

Cypress.Commands.add('mockMemorySearch', (params: any, response: any) => {
  // Intercept POST request to /api/memory/search
  cy.intercept('POST', '/api/memory/search', (req) => {
    if (JSON.stringify(req.body) === JSON.stringify(params)) {
      req.reply({
        statusCode: 200,
        body: response
      });
    }
  }).as('mockMemorySearch');
});

Cypress.Commands.add('mockMemoryDetail', (id: string, response: any) => {
  // Intercept GET request to /api/memory/{id}
  cy.intercept('GET', `/api/memory/${id}`, {
    statusCode: 200,
    body: response
  }).as('mockMemoryDetail');
});

Cypress.Commands.add('mockMemoryUpdate', (id: string, response: any) => {
  // Intercept PUT request to /api/memory/{id}
  cy.intercept('PUT', `/api/memory/${id}`, {
    statusCode: 200,
    body: response
  }).as('mockMemoryUpdate');
});

Cypress.Commands.add('mockMemoryDelete', (id: string, response: any) => {
  // Intercept DELETE request to /api/memory/{id}
  cy.intercept('DELETE', `/api/memory/${id}`, {
    statusCode: 200,
    body: response
  }).as('mockMemoryDelete');
});

// Settings commands
Cypress.Commands.add('mockSettingsResponse', (settings: any) => {
  // Intercept GET request to /api/settings
  cy.intercept('GET', '/api/settings', {
    statusCode: 200,
    body: { settings }
  }).as('mockSettingsResponse');
});

Cypress.Commands.add('updateSettings', (settings: any) => {
  // Intercept PUT request to /api/settings
  cy.intercept('PUT', '/api/settings').as('updateSettings');
  
  // Visit the settings page
  cy.visit('/settings');
  
  // Update settings through the UI
  // This is a simplified example - actual implementation would depend on UI structure
  Object.entries(settings).forEach(([key, value]) => {
    if (typeof value === 'boolean') {
      cy.findByTestId(`setting-${key}`).click();
    } else if (typeof value === 'string') {
      cy.findByTestId(`setting-${key}`).clear().type(value);
    }
  });
  
  // Save the settings
  cy.findByTestId('save-settings-button').click();
  
  // Wait for the settings to be saved
  cy.wait('@updateSettings');
});

// Web commands
Cypress.Commands.add('mockWebExtract', (url: string, response: any) => {
  // Intercept POST request to /api/web/extract
  cy.intercept('POST', '/api/web/extract', (req) => {
    if (req.body.url === url) {
      req.reply({
        statusCode: 200,
        body: response
      });
    }
  }).as('mockWebExtract');
});

Cypress.Commands.add('mockSearchResults', (query: string, response: any) => {
  // Intercept POST request to /api/search
  cy.intercept('POST', '/api/search', (req) => {
    if (req.body.query === query) {
      req.reply({
        statusCode: 200,
        body: response
      });
    }
  }).as('mockSearchResults');
});

// Voice commands
Cypress.Commands.add('mockVoiceTranscription', (response: any) => {
  // Intercept POST request to /api/voice/transcribe
  cy.intercept('POST', '/api/voice/transcribe', {
    statusCode: 200,
    body: response
  }).as('mockVoiceTranscription');
});

Cypress.Commands.add('mockVoiceSynthesis', (response: any) => {
  // Intercept POST request to /api/voice/synthesize
  cy.intercept('POST', '/api/voice/synthesize', {
    statusCode: 200,
    body: response
  }).as('mockVoiceSynthesis');
});

// LocalStorage commands
Cypress.Commands.add('saveLocalStorage', () => {
  cy.saveLocalStorage();
});

Cypress.Commands.add('restoreLocalStorage', () => {
  cy.restoreLocalStorage();
});

Cypress.Commands.add('clearLocalStorage', () => {
  cy.clearLocalStorage();
});