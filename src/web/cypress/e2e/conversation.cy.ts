// Import Cypress
import 'cypress';

// Test suites for the conversation functionality
describe('Conversation Tests', () => {
  // Common setup for all tests
  beforeEach(() => {
    // Login and set up test environment
    cy.login();
  });

  // Clean up after each test
  afterEach(() => {
    // Clean up test data
  });

  // Test suite: New Conversation
  describe('New Conversation', () => {
    // Test case: should create a new conversation
    it('should create a new conversation', () => {
      // Mock successful conversation creation response
      cy.intercept('POST', '/api/conversation', {
        statusCode: 200,
        body: {
          conversation_id: 'test-conversation-id',
          created_at: '2023-06-10T12:00:00Z',
          title: 'New Conversation'
        }
      }).as('createConversation');

      // Visit the chat page
      cy.visit('/chat');
      cy.wait('@createConversation');

      // Verify the chat interface is displayed
      cy.get('[data-testid=chat-container]').should('be.visible');
      
      // Verify the message input is enabled
      cy.get('[data-testid=message-input]').should('be.enabled');
      
      // Verify the conversation is empty
      cy.get('[data-testid=message-list]').children().should('have.length', 0);
    });

    // Test case: should show welcome message in new conversation
    it('should show welcome message in new conversation', () => {
      // Mock conversation with welcome message
      cy.intercept('POST', '/api/conversation', {
        statusCode: 200,
        body: {
          conversation_id: 'test-conversation-id',
          created_at: '2023-06-10T12:00:00Z',
          title: 'New Conversation',
          welcome_message: 'Hello! How can I assist you today?'
        }
      }).as('createConversation');

      // Visit the chat page
      cy.visit('/chat');
      cy.wait('@createConversation');

      // Verify welcome message is displayed
      cy.get('[data-testid=assistant-message]').should('contain.text', 'Hello! How can I assist you today?');
      
      // Verify message is attributed to AI
      cy.get('[data-testid=assistant-message]').should('have.attr', 'data-role', 'assistant');
    });

    // Test case: should handle conversation creation errors
    it('should handle conversation creation errors', () => {
      // Mock failed conversation creation response
      cy.intercept('POST', '/api/conversation', {
        statusCode: 500,
        body: {
          error: 'Failed to create conversation'
        }
      }).as('createConversationFailed');

      // Visit the chat page
      cy.visit('/chat');
      cy.wait('@createConversationFailed');

      // Verify error message is displayed
      cy.get('[data-testid=error-message]').should('be.visible');
      cy.get('[data-testid=error-message]').should('contain.text', 'Failed to create conversation');
      
      // Verify retry option is available
      cy.get('[data-testid=retry-button]').should('be.visible');
    });
  });

  // Test suite: Message Exchange
  describe('Message Exchange', () => {
    // Test case: should send a message and receive a response
    it('should send a message and receive a response', () => {
      // Mock successful conversation response
      cy.mockConversationResponse({
        response: 'This is a test response from the AI assistant.',
        conversation_id: 'test-conversation-id',
        audio_url: null
      });

      // Visit the chat page
      cy.visit('/chat');

      // Type a message in the input field
      cy.get('[data-testid=message-input]').type('Hello AI{enter}');

      // Verify user message appears in the conversation
      cy.get('[data-testid=user-message]').should('contain.text', 'Hello AI');
      
      // Verify AI response appears in the conversation
      cy.get('[data-testid=assistant-message]').should('contain.text', 'This is a test response from the AI assistant.');
      
      // Verify message content matches expected values
      cy.get('[data-testid=user-message]').should('have.attr', 'data-role', 'user');
      cy.get('[data-testid=assistant-message]').should('have.attr', 'data-role', 'assistant');
    });

    // Test case: should show typing indicator while waiting for response
    it('should show typing indicator while waiting for response', () => {
      // Mock delayed conversation response
      cy.intercept('POST', '/api/conversation', req => {
        // Delay the response by 1 second
        req.reply(res => {
          setTimeout(() => {
            res.send({
              statusCode: 200,
              body: {
                response: 'This is a delayed response from the AI assistant.',
                conversation_id: 'test-conversation-id',
                audio_url: null
              }
            });
          }, 1000);
        });
      }).as('delayedResponse');

      // Visit the chat page
      cy.visit('/chat');

      // Send a message
      cy.get('[data-testid=message-input]').type('Hello AI{enter}');

      // Verify typing indicator is displayed
      cy.get('[data-testid=typing-indicator]').should('be.visible');
      
      // Wait for response and verify typing indicator disappears
      cy.wait('@delayedResponse');
      cy.get('[data-testid=typing-indicator]').should('not.exist');
      
      // Verify AI response is displayed
      cy.get('[data-testid=assistant-message]').should('contain.text', 'This is a delayed response from the AI assistant.');
    });

    // Test case: should handle message sending errors
    it('should handle message sending errors', () => {
      // First set up the initial conversation
      cy.mockConversationResponse({
        conversation_id: 'test-conversation-id',
        created_at: '2023-06-10T12:00:00Z',
        title: 'New Conversation'
      });
      
      cy.visit('/chat');
      
      // Mock failed message response
      cy.intercept('POST', '/api/conversation', {
        statusCode: 500,
        body: {
          error: 'Failed to send message'
        }
      }).as('sendMessageFailed');

      // Send a message
      cy.get('[data-testid=message-input]').type('Hello AI{enter}');
      cy.wait('@sendMessageFailed');

      // Verify error message is displayed
      cy.get('[data-testid=error-message]').should('be.visible');
      cy.get('[data-testid=error-message]').should('contain.text', 'Failed to send message');
      
      // Verify retry option is available
      cy.get('[data-testid=retry-button]').should('be.visible');
      
      // Mock successful response on retry
      cy.intercept('POST', '/api/conversation', {
        statusCode: 200,
        body: {
          response: 'This is a response after retry.',
          conversation_id: 'test-conversation-id',
          audio_url: null
        }
      }).as('retrySendMessage');
      
      // Click retry button
      cy.get('[data-testid=retry-button]').click();
      cy.wait('@retrySendMessage');
      
      // Verify message is sent successfully on retry
      cy.get('[data-testid=assistant-message]').should('contain.text', 'This is a response after retry.');
    });

    // Test case: should not send empty messages
    it('should not send empty messages', () => {
      // Visit the chat page
      cy.visit('/chat');

      // Try to send an empty message
      cy.get('[data-testid=message-input]').type('{enter}');
      
      // Verify no message is sent
      cy.get('[data-testid=message-list]').children().should('have.length', 0);
      
      // Verify input field remains empty
      cy.get('[data-testid=message-input]').should('have.value', '');
    });
  });

  // Test suite: Conversation Context
  describe('Conversation Context', () => {
    // Test case: should maintain conversation context across multiple messages
    it('should maintain conversation context across multiple messages', () => {
      // Visit the chat page
      cy.visit('/chat');
      
      // Mock first message response
      cy.mockConversationResponse({
        response: 'Paris is the capital of France and is known for the Eiffel Tower.',
        conversation_id: 'test-conversation-id',
        audio_url: null
      });
      
      // Send first message about a specific topic
      cy.get('[data-testid=message-input]').type('What is the capital of France?{enter}');
      cy.get('[data-testid=assistant-message]').should('contain.text', 'Paris is the capital of France');
      
      // Mock follow-up response that references previous context
      cy.mockConversationResponse({
        response: 'The Eiffel Tower is 330 meters tall and was completed in 1889.',
        conversation_id: 'test-conversation-id',
        audio_url: null
      });
      
      // Send follow-up message with pronoun reference
      cy.get('[data-testid=message-input]').type('How tall is it?{enter}');
      
      // Verify AI response correctly maintains context from previous messages
      cy.get('[data-testid=assistant-message]').eq(1).should('contain.text', '330 meters');
      cy.get('[data-testid=assistant-message]').eq(1).should('contain.text', '1889');
    });

    // Test case: should display related memories in responses
    it('should display related memories in responses', () => {
      // Visit the chat page
      cy.visit('/chat');
      
      // Mock response with related memories
      cy.mockConversationResponse({
        response: 'According to my memory, your meeting with John is scheduled for tomorrow at 2 PM.',
        conversation_id: 'test-conversation-id',
        audio_url: null,
        related_memories: [
          {
            id: 'memory-123',
            content: 'Meeting with John scheduled for June 11, 2023 at 2 PM',
            source: 'conversation',
            timestamp: '2023-06-05T14:30:00Z'
          }
        ]
      });
      
      // Send a message that would trigger memory retrieval
      cy.get('[data-testid=message-input]').type('When is my meeting with John?{enter}');
      
      // Verify AI response includes reference to related memories
      cy.get('[data-testid=assistant-message]').should('contain.text', 'meeting with John is scheduled for tomorrow at 2 PM');
      
      // Verify related memory links are displayed
      cy.get('[data-testid=related-memory]').should('be.visible');
      
      // Click on related memory link
      cy.get('[data-testid=related-memory]').click();
      
      // Verify memory details are displayed
      cy.get('[data-testid=memory-details]').should('be.visible');
      cy.get('[data-testid=memory-details]').should('contain.text', 'Meeting with John scheduled for June 11, 2023');
    });

    // Test case: should reference uploaded documents in conversation
    it('should reference uploaded documents in conversation', () => {
      // First upload a document
      cy.visit('/files');
      
      // Setup file upload mock
      cy.intercept('POST', '/api/document/upload', {
        statusCode: 200,
        body: {
          document_id: 'doc-123',
          filename: 'test-document.pdf',
          success: true
        }
      }).as('documentUpload');
      
      // Setup document processing mock
      cy.intercept('POST', '/api/document/doc-123/process', {
        statusCode: 200,
        body: {
          document_id: 'doc-123',
          filename: 'test-document.pdf',
          summary: 'This is a test document about project timelines.',
          memory_items: ['memory-456']
        }
      }).as('documentProcess');
      
      // Upload a test document
      cy.get('input[type=file]').attachFile('test-document.pdf');
      cy.wait('@documentUpload');
      cy.wait('@documentProcess');
      
      // Navigate to chat page
      cy.visit('/chat');
      
      // Mock response with document reference
      cy.mockConversationResponse({
        response: 'Based on the document you uploaded, the project timeline shows a completion date of December 15, 2023.',
        conversation_id: 'test-conversation-id',
        audio_url: null,
        related_memories: [
          {
            id: 'memory-456',
            content: 'Project completion date: December 15, 2023',
            source: 'document',
            source_id: 'doc-123',
            timestamp: '2023-06-10T14:30:00Z'
          }
        ]
      });
      
      // Send a message asking about the document
      cy.get('[data-testid=message-input]').type('What is the project completion date?{enter}');
      
      // Verify AI response includes document information
      cy.get('[data-testid=assistant-message]').should('contain.text', 'December 15, 2023');
      
      // Verify document reference is clickable
      cy.get('[data-testid=related-memory][data-source="document"]').should('be.visible');
      
      // Click document reference
      cy.get('[data-testid=related-memory][data-source="document"]').click();
      
      // Verify navigation to document view
      cy.url().should('include', '/files/doc-123');
    });
  });

  // Test suite: Conversation History
  describe('Conversation History', () => {
    // Test case: should load existing conversation
    it('should load existing conversation', () => {
      // Mock conversation history response
      cy.mockConversationHistory('test-conversation-id', {
        id: 'test-conversation-id',
        title: 'Test Conversation',
        created_at: '2023-06-10T12:00:00Z',
        updated_at: '2023-06-10T12:05:00Z',
        messages: [
          {
            id: 'msg-1',
            conversation_id: 'test-conversation-id',
            role: 'user',
            content: 'Hello, AI!',
            created_at: '2023-06-10T12:00:00Z'
          },
          {
            id: 'msg-2',
            conversation_id: 'test-conversation-id',
            role: 'assistant',
            content: 'Hello! How can I help you today?',
            created_at: '2023-06-10T12:00:05Z'
          }
        ]
      });
      
      // Visit a specific conversation page with ID
      cy.visit('/chat/test-conversation-id');
      
      // Verify conversation title is displayed
      cy.get('[data-testid=conversation-title]').should('contain.text', 'Test Conversation');
      
      // Verify message history is loaded
      cy.get('[data-testid=message-list]').children().should('have.length', 2);
      
      // Verify messages are displayed in chronological order
      cy.get('[data-testid=message-item]').eq(0).should('contain.text', 'Hello, AI!');
      cy.get('[data-testid=message-item]').eq(1).should('contain.text', 'Hello! How can I help you today?');
    });

    // Test case: should display recent conversations in sidebar
    it('should display recent conversations in sidebar', () => {
      // Mock recent conversations response
      cy.mockRecentConversations({
        conversations: [
          {
            id: 'conv-1',
            title: 'Recent Conversation 1',
            created_at: '2023-06-10T12:00:00Z',
            updated_at: '2023-06-10T12:05:00Z'
          },
          {
            id: 'conv-2',
            title: 'Recent Conversation 2',
            created_at: '2023-06-09T10:00:00Z',
            updated_at: '2023-06-09T10:15:00Z'
          }
        ],
        total: 2
      });
      
      // Visit the chat page
      cy.visit('/chat');
      
      // Verify recent conversations are listed in sidebar
      cy.get('[data-testid=recent-conversations-list]').should('be.visible');
      cy.get('[data-testid=recent-conversation-item]').should('have.length', 2);
      
      // Verify conversations are sorted by recency
      cy.get('[data-testid=recent-conversation-item]').eq(0).should('contain.text', 'Recent Conversation 1');
      cy.get('[data-testid=recent-conversation-item]').eq(1).should('contain.text', 'Recent Conversation 2');
      
      // Mock response for selected conversation
      cy.mockConversationHistory('conv-1', {
        id: 'conv-1',
        title: 'Recent Conversation 1',
        created_at: '2023-06-10T12:00:00Z',
        updated_at: '2023-06-10T12:05:00Z',
        messages: [
          {
            id: 'msg-1',
            conversation_id: 'conv-1',
            role: 'user',
            content: 'First message',
            created_at: '2023-06-10T12:00:00Z'
          }
        ]
      });
      
      // Click on a conversation in the list
      cy.get('[data-testid=recent-conversation-item]').eq(0).click();
      
      // Verify navigation to selected conversation
      cy.url().should('include', '/chat/conv-1');
      
      // Verify correct conversation is loaded
      cy.get('[data-testid=conversation-title]').should('contain.text', 'Recent Conversation 1');
      cy.get('[data-testid=message-item]').should('contain.text', 'First message');
    });

    // Test case: should create new conversation when requested
    it('should create new conversation when requested', () => {
      // Mock existing conversation
      cy.mockConversationHistory('test-conversation-id', {
        id: 'test-conversation-id',
        title: 'Test Conversation',
        created_at: '2023-06-10T12:00:00Z',
        updated_at: '2023-06-10T12:05:00Z',
        messages: [
          {
            id: 'msg-1',
            conversation_id: 'test-conversation-id',
            role: 'user',
            content: 'Existing message',
            created_at: '2023-06-10T12:00:00Z'
          }
        ]
      });
      
      // Visit the chat page with existing conversation
      cy.visit('/chat/test-conversation-id');
      
      // Mock new conversation creation
      cy.intercept('POST', '/api/conversation', {
        statusCode: 200,
        body: {
          conversation_id: 'new-conversation-id',
          created_at: '2023-06-10T13:00:00Z',
          title: 'New Conversation'
        }
      }).as('createNewConversation');
      
      // Click 'New Chat' button
      cy.get('[data-testid=new-chat-button]').click();
      cy.wait('@createNewConversation');
      
      // Verify new empty conversation is created
      cy.get('[data-testid=message-list]').children().should('have.length', 0);
      
      // Verify URL is updated to new conversation ID
      cy.url().should('include', '/chat/new-conversation-id');
    });
  });

  // Test suite: Conversation Management
  describe('Conversation Management', () => {
    // Test case: should rename a conversation
    it('should rename a conversation', () => {
      // Visit a specific conversation page
      cy.mockConversationHistory('test-conversation-id', {
        id: 'test-conversation-id',
        title: 'Original Title',
        created_at: '2023-06-10T12:00:00Z',
        updated_at: '2023-06-10T12:05:00Z',
        messages: []
      });
      
      cy.visit('/chat/test-conversation-id');
      
      // Click on conversation title
      cy.get('[data-testid=conversation-title]').click();
      
      // Enter new title
      cy.get('[data-testid=conversation-title] input').clear().type('Updated Title');
      
      // Mock successful update response
      cy.mockConversationUpdate('test-conversation-id', {
        id: 'test-conversation-id',
        title: 'Updated Title',
        created_at: '2023-06-10T12:00:00Z',
        updated_at: '2023-06-10T13:00:00Z'
      });
      
      // Submit new title
      cy.get('[data-testid=conversation-title] input').type('{enter}');
      
      // Verify title is updated in UI
      cy.get('[data-testid=conversation-title]').should('contain.text', 'Updated Title');
      
      // Mock recent conversations to verify update
      cy.mockRecentConversations({
        conversations: [
          {
            id: 'test-conversation-id',
            title: 'Updated Title',
            created_at: '2023-06-10T12:00:00Z',
            updated_at: '2023-06-10T13:00:00Z'
          }
        ],
        total: 1
      });
      
      // Verify title is updated in recent conversations list
      cy.get('[data-testid=recent-conversation-item]').should('contain.text', 'Updated Title');
    });

    // Test case: should delete a conversation
    it('should delete a conversation', () => {
      // Visit a specific conversation page
      cy.mockConversationHistory('test-conversation-id', {
        id: 'test-conversation-id',
        title: 'Test Conversation',
        created_at: '2023-06-10T12:00:00Z',
        updated_at: '2023-06-10T12:05:00Z',
        messages: []
      });
      
      cy.visit('/chat/test-conversation-id');
      
      // Setup delete response
      cy.mockConversationDelete('test-conversation-id', {
        success: true
      });
      
      // Mock new conversation creation for redirect
      cy.intercept('POST', '/api/conversation', {
        statusCode: 200,
        body: {
          conversation_id: 'new-conversation-id',
          created_at: '2023-06-10T13:00:00Z',
          title: 'New Conversation'
        }
      }).as('createNewConversation');
      
      // Open conversation options menu
      cy.get('[data-testid=conversation-options-menu]').click();
      
      // Click delete option
      cy.get('[data-testid=delete-conversation-option]').click();
      
      // Confirm deletion in dialog
      cy.get('[data-testid=confirm-dialog]').should('be.visible');
      cy.get('[data-testid=confirm-button]').click();
      
      // Verify redirection to new conversation
      cy.url().should('include', '/chat/new-conversation-id');
      
      // Mock empty recent conversations
      cy.mockRecentConversations({
        conversations: [],
        total: 0
      });
      
      // Verify deleted conversation is removed from recent list
      cy.get('[data-testid=recent-conversation-item]').should('not.exist');
    });

    // Test case: should clear conversation history
    it('should clear conversation history', () => {
      // Visit a specific conversation page with history
      cy.mockConversationHistory('test-conversation-id', {
        id: 'test-conversation-id',
        title: 'Test Conversation',
        created_at: '2023-06-10T12:00:00Z',
        updated_at: '2023-06-10T12:05:00Z',
        messages: [
          {
            id: 'msg-1',
            conversation_id: 'test-conversation-id',
            role: 'user',
            content: 'Hello, AI!',
            created_at: '2023-06-10T12:00:00Z'
          },
          {
            id: 'msg-2',
            conversation_id: 'test-conversation-id',
            role: 'assistant',
            content: 'Hello! How can I help you today?',
            created_at: '2023-06-10T12:00:05Z'
          }
        ]
      });
      
      cy.visit('/chat/test-conversation-id');
      
      // Verify messages exist
      cy.get('[data-testid=message-list]').children().should('have.length', 2);
      
      // Setup clear history response
      cy.intercept('POST', '/api/conversation/test-conversation-id/clear', {
        statusCode: 200,
        body: {
          success: true,
          conversation_id: 'test-conversation-id'
        }
      }).as('clearHistory');
      
      // Mock welcome message response
      cy.intercept('GET', '/api/conversation/test-conversation-id', {
        statusCode: 200,
        body: {
          id: 'test-conversation-id',
          title: 'Test Conversation',
          created_at: '2023-06-10T12:00:00Z',
          updated_at: '2023-06-10T13:00:00Z',
          messages: [
            {
              id: 'welcome-msg',
              conversation_id: 'test-conversation-id',
              role: 'assistant',
              content: 'How can I help you today?',
              created_at: '2023-06-10T13:00:00Z'
            }
          ]
        }
      }).as('getUpdatedConversation');
      
      // Open conversation options menu
      cy.get('[data-testid=conversation-options-menu]').click();
      
      // Click clear history option
      cy.get('[data-testid=clear-history-option]').click();
      
      // Confirm clearing in dialog
      cy.get('[data-testid=confirm-dialog]').should('be.visible');
      cy.get('[data-testid=confirm-button]').click();
      
      cy.wait('@clearHistory');
      cy.wait('@getUpdatedConversation');
      
      // Verify conversation is empty but ID remains the same
      cy.get('[data-testid=message-list]').children().should('have.length', 1);
      cy.url().should('include', '/chat/test-conversation-id');
      
      // Verify welcome message is displayed in cleared conversation
      cy.get('[data-testid=assistant-message]').should('contain.text', 'How can I help you today?');
    });
  });

  // Test suite: UI Features
  describe('UI Features', () => {
    // Test case: should scroll to bottom on new messages
    it('should scroll to bottom on new messages', () => {
      // Visit a conversation with many messages
      cy.mockConversationHistory('test-conversation-id', {
        id: 'test-conversation-id',
        title: 'Test Conversation',
        created_at: '2023-06-10T12:00:00Z',
        updated_at: '2023-06-10T12:05:00Z',
        messages: Array(20).fill(null).map((_, i) => ({
          id: `msg-${i}`,
          conversation_id: 'test-conversation-id',
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          created_at: new Date(Date.parse('2023-06-10T12:00:00Z') + i * 1000).toISOString()
        }))
      });
      
      cy.visit('/chat/test-conversation-id');
      
      // Scroll to middle of conversation
      cy.get('[data-testid=message-item]').eq(10).scrollIntoView();
      
      // Mock response for new message
      cy.mockConversationResponse({
        response: 'This is a new response that should trigger scrolling.',
        conversation_id: 'test-conversation-id',
        audio_url: null
      });
      
      // Send a new message
      cy.get('[data-testid=message-input]').type('New message to test scrolling{enter}');
      
      // Verify new message is visible (this implicitly tests scrolling because Cypress will fail if the element is not visible)
      cy.get('[data-testid=assistant-message]').last().should('be.visible');
      cy.get('[data-testid=assistant-message]').last().should('contain.text', 'This is a new response that should trigger scrolling.');
    });

    // Test case: should show privacy indicator based on settings
    it('should show privacy indicator based on settings', () => {
      // Mock settings with local-only mode
      cy.mockSettingsResponse({
        voice_settings: {
          enabled: false,
          voice_id: 'default'
        },
        privacy_settings: {
          local_storage_only: true,
          allow_web_search: false
        },
        personality_settings: {
          name: 'Assistant',
          style: 'helpful'
        }
      });
      
      // Visit the chat page
      cy.visit('/chat');
      
      // Verify 'Local Only' indicator is displayed
      cy.get('[data-testid=privacy-indicator]').should('contain.text', 'Local Only');
      
      // Mock settings with cloud features enabled
      cy.mockSettingsResponse({
        voice_settings: {
          enabled: false,
          voice_id: 'default'
        },
        privacy_settings: {
          local_storage_only: false,
          allow_web_search: true
        },
        personality_settings: {
          name: 'Assistant',
          style: 'helpful'
        }
      });
      
      // Refresh page
      cy.reload();
      
      // Verify appropriate privacy indicator is updated
      cy.get('[data-testid=privacy-indicator]').should('not.contain.text', 'Local Only');
      cy.get('[data-testid=privacy-indicator]').should('contain.text', 'Web: ON');
    });

    // Test case: should support file uploads in conversation
    it('should support file uploads in conversation', () => {
      // Visit the chat page
      cy.visit('/chat');
      
      // Mock file upload response
      cy.intercept('POST', '/api/document/upload', {
        statusCode: 200,
        body: {
          document_id: 'doc-123',
          filename: 'test-file.pdf',
          success: true
        }
      }).as('fileUpload');
      
      // Mock AI response acknowledging the file
      cy.mockConversationResponse({
        response: 'I\'ve received your file "test-file.pdf". Would you like me to analyze it?',
        conversation_id: 'test-conversation-id',
        audio_url: null
      });
      
      // Click file upload button
      cy.get('[data-testid=file-upload-button]').click();
      
      // Select a test file
      cy.get('input[type=file]').attachFile('test-file.pdf');
      cy.wait('@fileUpload');
      
      // Verify file upload progress indicator (this may be briefly shown)
      cy.get('[data-testid=upload-progress]').should('exist');
      
      // Verify file reference appears in conversation
      cy.get('[data-testid=file-reference]').should('contain.text', 'test-file.pdf');
      
      // Verify AI response mentions the uploaded file
      cy.get('[data-testid=assistant-message]').should('contain.text', 'I\'ve received your file');
      cy.get('[data-testid=assistant-message]').should('contain.text', 'test-file.pdf');
    });

    // Test case: should support message formatting
    it('should support message formatting', () => {
      // Visit the chat page
      cy.visit('/chat');
      
      // Mock response with formatted content (markdown)
      cy.mockConversationResponse({
        response: '# Formatted Response\n\n**Bold text** and *italic text*.\n\n```javascript\nconst code = "example";\nconsole.log(code);\n```\n\n- List item 1\n- List item 2\n\n> Blockquote example',
        conversation_id: 'test-conversation-id',
        audio_url: null
      });
      
      // Send a message requesting formatted content
      cy.get('[data-testid=message-input]').type('Show me a formatted response with code and lists{enter}');
      
      // Verify AI response contains properly rendered formatting
      cy.get('[data-testid=assistant-message] h1').should('contain.text', 'Formatted Response');
      cy.get('[data-testid=assistant-message] strong').should('contain.text', 'Bold text');
      cy.get('[data-testid=assistant-message] em').should('contain.text', 'italic text');
      
      // Verify code blocks, lists, and other formatting elements display correctly
      cy.get('[data-testid=assistant-message] code').should('exist');
      cy.get('[data-testid=assistant-message] ul').should('exist');
      cy.get('[data-testid=assistant-message] li').should('have.length', 2);
      cy.get('[data-testid=assistant-message] blockquote').should('contain.text', 'Blockquote example');
    });
  });
});

// Declare custom commands to extend Cypress
declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
      createConversation(): Chainable<void>;
      sendMessage(message: string): Chainable<void>;
      waitForResponse(): Chainable<void>;
      mockConversationResponse(response: any): Chainable<void>;
      mockConversationHistory(conversationId: string, response: any): Chainable<void>;
      mockRecentConversations(response: any): Chainable<void>;
      mockConversationUpdate(conversationId: string, response: any): Chainable<void>;
      mockConversationDelete(conversationId: string, response: any): Chainable<void>;
      mockSettingsResponse(settings: any): Chainable<void>;
    }
  }
}