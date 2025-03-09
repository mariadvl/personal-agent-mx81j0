import 'cypress';

/**
 * Cypress tests for the document processing functionality of the Personal AI Agent
 * 
 * These tests verify the document upload, processing, viewing, and integration
 * with other parts of the system, ensuring that documents can be properly
 * analyzed and their information made available through the memory system.
 */

describe('Document Upload', () => {
  beforeEach(() => {
    // Login and set up test environment
    cy.login();
    cy.visit('/files');
  });

  afterEach(() => {
    // Clean up test data
  });

  it('should upload a document successfully', () => {
    // Mock successful document upload response
    cy.mockDocumentUpload({
      document_id: 'test-document-id',
      filename: 'test-document.pdf',
      file_type: 'pdf',
      created_at: '2023-06-10T12:00:00Z',
      size: 1024000,
      processed: false
    });

    // Upload a test PDF file
    cy.get('[data-testid=file-input]').attachFile('test-document.pdf');
    
    // Verify upload progress indicator is shown
    cy.get('[data-testid=loading-indicator]').should('be.visible');
    
    // Verify success message is displayed
    cy.get('[data-testid=success-message]').should('be.visible');
    
    // Verify uploaded document appears in the list
    cy.get('[data-testid=document-list]')
      .find('[data-testid=document-item]')
      .should('contain', 'test-document.pdf');
  });

  it('should validate document file types', () => {
    // Attempt to upload an unsupported file type
    cy.get('[data-testid=file-input]').attachFile('invalid-document.xyz');
    
    // Verify validation error message is displayed
    cy.get('[data-testid=error-message]').should('be.visible')
      .and('contain', 'Unsupported file type');
    
    // Verify upload button remains enabled
    cy.get('[data-testid=upload-button]').should('be.enabled');
    
    // Mock successful document upload response
    cy.mockDocumentUpload({
      document_id: 'test-document-id',
      filename: 'test-document.pdf',
      file_type: 'pdf',
      created_at: '2023-06-10T12:00:00Z',
      size: 1024000,
      processed: false
    });
    
    // Upload a supported file type
    cy.get('[data-testid=file-input]').attachFile('test-document.pdf');
    
    // Verify upload succeeds
    cy.get('[data-testid=success-message]').should('be.visible');
  });
  
  it('should handle file size limits', () => {
    // Attempt to upload a file exceeding size limit
    cy.get('[data-testid=file-input]').attachFile('large-document.pdf');
    
    // Verify size limit error message is displayed
    cy.get('[data-testid=error-message]').should('be.visible')
      .and('contain', 'File size exceeds the limit');
    
    // Verify upload button remains enabled
    cy.get('[data-testid=upload-button]').should('be.enabled');
  });
  
  it('should handle upload errors gracefully', () => {
    // Mock failed document upload response
    cy.mockDocumentUpload({
      success: false,
      error: 'Server error occurred during upload'
    }, { statusCode: 500 });
    
    // Upload a test document
    cy.get('[data-testid=file-input]').attachFile('test-document.pdf');
    
    // Verify error message is displayed
    cy.get('[data-testid=error-message]').should('be.visible');
    
    // Verify retry option is available
    cy.get('[data-testid=retry-button]').should('be.visible');
    
    // Mock successful response on retry
    cy.mockDocumentUpload({
      document_id: 'test-document-id',
      filename: 'test-document.pdf',
      file_type: 'pdf',
      created_at: '2023-06-10T12:00:00Z',
      size: 1024000,
      processed: false
    });
    
    // Click retry button
    cy.get('[data-testid=retry-button]').click();
    
    // Verify upload succeeds on retry
    cy.get('[data-testid=success-message]').should('be.visible');
  });
});

describe('Document Processing', () => {
  beforeEach(() => {
    // Login and set up test environment
    cy.login();
    cy.visit('/files');
  });

  afterEach(() => {
    // Clean up test data
  });

  it('should process an uploaded document', () => {
    // Mock successful document upload response
    cy.mockDocumentUpload({
      document_id: 'test-document-id',
      filename: 'test-document.pdf',
      file_type: 'pdf',
      created_at: '2023-06-10T12:00:00Z',
      size: 1024000,
      processed: false
    });
    
    // Upload a test document
    cy.uploadDocument('test-document.pdf', 'application/pdf');
    
    // Mock successful document processing response
    cy.mockDocumentProcess('test-document-id', {
      document_id: 'test-document-id',
      status: 'completed',
      progress: 100,
      summary: 'This is a test document summary containing key information about the project timeline, budget, and deliverables.',
      memory_items: ['memory-1', 'memory-2', 'memory-3'],
      error: null
    });
    
    // Initiate processing
    cy.get('[data-testid=process-button]').click();
    
    // Verify processing status is displayed
    cy.get('[data-testid=processing-status]').should('be.visible');
    
    // Mock processing progress
    cy.mockDocumentStatus('test-document-id', {
      document_id: 'test-document-id',
      status: 'processing',
      progress: 50,
      error: null
    });
    
    // Verify processing progress updates
    cy.get('[data-testid=progress-bar]').should('have.attr', 'value', '50');
    
    // Mock processing completion
    cy.mockDocumentStatus('test-document-id', {
      document_id: 'test-document-id',
      status: 'completed',
      progress: 100,
      error: null
    });
    
    // Wait for processing to complete
    cy.waitForProcessing('test-document-id');
    
    // Verify processing completion is indicated
    cy.get('[data-testid=processing-status]').should('contain', 'Completed');
    
    // Verify document summary is displayed after processing
    cy.get('[data-testid=document-summary]').should('be.visible')
      .and('contain', 'This is a test document summary');
  });

  it('should auto-process documents when configured', () => {
    // Mock settings with auto-process enabled
    cy.mockSettingsResponse({
      voice_settings: { enabled: false, voice_id: 'default' },
      privacy_settings: { local_storage_only: true, allow_web_search: false },
      personality_settings: { name: 'Assistant', style: 'helpful' },
      document_settings: { auto_process: true, store_in_memory: true }
    });
    
    // Mock successful document upload response
    cy.mockDocumentUpload({
      document_id: 'test-document-id',
      filename: 'test-document.pdf',
      file_type: 'pdf',
      created_at: '2023-06-10T12:00:00Z',
      size: 1024000,
      processed: false
    });
    
    // Mock successful document processing response
    cy.mockDocumentProcess('test-document-id', {
      document_id: 'test-document-id',
      status: 'completed',
      progress: 100,
      summary: 'This is a test document summary containing key information about the project timeline, budget, and deliverables.',
      memory_items: ['memory-1', 'memory-2', 'memory-3'],
      error: null
    });
    
    // Upload a test document
    cy.uploadDocument('test-document.pdf', 'application/pdf');
    
    // Verify processing starts automatically
    cy.get('[data-testid=processing-status]').should('be.visible');
    
    // Wait for processing to complete
    cy.waitForProcessing('test-document-id');
    
    // Verify processing completes successfully
    cy.get('[data-testid=processing-status]').should('contain', 'Completed');
    
    // Verify document summary is displayed
    cy.get('[data-testid=document-summary]').should('be.visible');
  });
  
  it('should handle processing errors', () => {
    // Upload a test document
    cy.uploadDocument('test-document.pdf', 'application/pdf');
    
    // Mock failed document processing response
    cy.mockDocumentProcess('test-document-id', {
      document_id: 'test-document-id',
      status: 'failed',
      progress: 0,
      summary: null,
      memory_items: [],
      error: 'Error processing document'
    }, { statusCode: 500 });
    
    // Initiate document processing
    cy.get('[data-testid=process-button]').click();
    
    // Verify error message is displayed
    cy.get('[data-testid=error-message]').should('be.visible')
      .and('contain', 'Error processing document');
    
    // Verify retry option is available
    cy.get('[data-testid=retry-button]').should('be.visible');
    
    // Mock successful response on retry
    cy.mockDocumentProcess('test-document-id', {
      document_id: 'test-document-id',
      status: 'completed',
      progress: 100,
      summary: 'This is a test document summary containing key information about the project timeline, budget, and deliverables.',
      memory_items: ['memory-1', 'memory-2', 'memory-3'],
      error: null
    });
    
    // Click retry button
    cy.get('[data-testid=retry-button]').click();
    
    // Verify processing succeeds on retry
    cy.waitForProcessing('test-document-id');
    cy.get('[data-testid=document-summary]').should('be.visible');
  });
  
  it('should display processing status correctly', () => {
    // Upload a test document
    cy.uploadDocument('test-document.pdf', 'application/pdf');
    
    // Mock document status as pending
    cy.mockDocumentStatus('test-document-id', {
      document_id: 'test-document-id',
      status: 'pending',
      progress: 0,
      error: null
    });
    
    // Initiate processing
    cy.get('[data-testid=process-button]').click();
    
    // Verify status shows as pending
    cy.get('[data-testid=processing-status]').should('contain', 'Pending');
    
    // Mock document status as processing
    cy.mockDocumentStatus('test-document-id', {
      document_id: 'test-document-id',
      status: 'processing',
      progress: 50,
      error: null
    });
    
    // Verify status updates to processing
    cy.get('[data-testid=processing-status]').should('contain', 'Processing');
    
    // Verify progress bar reflects processing progress
    cy.get('[data-testid=progress-bar]').should('have.attr', 'value', '50');
    
    // Mock document status as completed
    cy.mockDocumentStatus('test-document-id', {
      document_id: 'test-document-id',
      status: 'completed',
      progress: 100,
      error: null
    });
    
    // Verify completion is clearly indicated
    cy.get('[data-testid=processing-status]').should('contain', 'Completed');
    cy.get('[data-testid=progress-bar]').should('have.attr', 'value', '100');
  });
});

describe('Document Viewing', () => {
  beforeEach(() => {
    // Login and set up test environment
    cy.login();
    cy.visit('/files');
    
    // Set up document for viewing
    cy.mockDocumentUpload({
      document_id: 'test-document-id',
      filename: 'test-document.pdf',
      file_type: 'pdf',
      created_at: '2023-06-10T12:00:00Z',
      size: 1024000,
      processed: false
    });
    
    cy.uploadDocument('test-document.pdf', 'application/pdf');
    
    cy.mockDocumentProcess('test-document-id', {
      document_id: 'test-document-id',
      status: 'completed',
      progress: 100,
      summary: 'This is a test document summary containing key information about the project timeline, budget, and deliverables.',
      memory_items: ['memory-1', 'memory-2', 'memory-3'],
      error: null
    });
    
    cy.get('[data-testid=process-button]').click();
    cy.waitForProcessing('test-document-id');
  });

  afterEach(() => {
    // Clean up test data
  });

  it('should display document summary after processing', () => {
    // Verify document title is displayed
    cy.get('[data-testid=document-title]').should('contain', 'test-document.pdf');
    
    // Verify document metadata is displayed
    cy.get('[data-testid=document-metadata]').should('be.visible')
      .and('contain', 'pdf')
      .and('contain', '1 MB')
      .and('contain', '2023-06-10');
    
    // Verify AI-generated summary is displayed
    cy.get('[data-testid=document-summary]').should('be.visible')
      .and('contain', 'This is a test document summary');
    
    // Verify summary contains key information
    cy.get('[data-testid=document-summary]').should('contain', 'project timeline')
      .and('contain', 'budget')
      .and('contain', 'deliverables');
  });

  it('should allow viewing full document text', () => {
    // Mock full text response
    cy.mockDocumentFullText('test-document-id', {
      document_id: 'test-document-id',
      text: 'This is the full text content of the test document. It contains multiple paragraphs of information about the project, including timelines, budgets, and deliverables. The project is scheduled to start on July 1st and will be completed by September 30th. The total budget is $75,000.'
    });
    
    // Click 'View Full Text' button
    cy.get('[data-testid=view-full-text-button]').click();
    
    // Verify full document text is displayed
    cy.get('[data-testid=full-text-content]').should('be.visible')
      .and('contain', 'This is the full text content')
      .and('contain', 'July 1st')
      .and('contain', 'September 30th')
      .and('contain', '$75,000');
    
    // Verify navigation back to summary is available
    cy.get('[data-testid=back-to-summary-button]').should('be.visible');
    cy.get('[data-testid=back-to-summary-button]').click();
    
    // Verify we're back to summary view
    cy.get('[data-testid=document-summary]').should('be.visible');
  });
  
  it('should enable asking questions about the document', () => {
    // Click 'Ask Questions' button
    cy.get('[data-testid=ask-questions-button]').click();
    
    // Verify navigation to chat interface
    cy.url().should('include', '/chat');
    
    // Verify document context is included in chat
    cy.get('[data-testid=message-list]').should('contain', 'test-document.pdf');
    
    // Ask a question about the document
    cy.get('[data-testid=message-input]').type('What is the project budget?{enter}');
    
    // Mock AI response with document information
    cy.intercept('POST', '/api/conversation', {
      response: 'According to the document, the total budget is $75,000.',
      conversation_id: 'conv-123'
    }).as('sendMessage');
    
    // Wait for response
    cy.wait('@sendMessage');
    
    // Verify AI response includes document information
    cy.get('[data-testid=message-list]').should('contain', '$75,000');
  });
  
  it('should store document in memory when requested', () => {
    // Mock successful memory storage response
    cy.mockDocumentStoreInMemory('test-document-id', {
      success: true,
      memory_items: ['memory-1', 'memory-2', 'memory-3'],
      error: null
    });
    
    // Click 'Store in Memory' button
    cy.get('[data-testid=store-in-memory-button]').click();
    
    // Verify success confirmation is displayed
    cy.get('[data-testid=success-message]').should('be.visible')
      .and('contain', 'Document stored in memory');
    
    // Navigate to memory page
    cy.visit('/memory');
    
    // Mock memory list with document memory
    cy.intercept('GET', '/api/memory/search*', {
      results: [
        {
          id: 'memory-1',
          content: 'This is a test document summary containing key information about the project timeline, budget, and deliverables.',
          source: 'document',
          source_id: 'test-document-id',
          category: 'document',
          created_at: '2023-06-10T12:10:00Z'
        }
      ]
    }).as('memorySearch');
    
    // Verify document appears in memory list
    cy.get('[data-testid=memory-list]').should('contain', 'test-document.pdf');
    
    // Verify document content is correctly stored in memory
    cy.get('[data-testid=memory-list]').find('[data-testid=memory-item]').click();
    cy.get('[data-testid=memory-content]').should('contain', 'project timeline')
      .and('contain', 'budget')
      .and('contain', 'deliverables');
  });
});

describe('Document Management', () => {
  beforeEach(() => {
    // Login and set up test environment
    cy.login();
    
    // Mock recent documents response
    cy.mockRecentDocuments({
      documents: [
        {
          id: 'doc-1',
          filename: 'Project_Proposal.pdf',
          file_type: 'pdf',
          created_at: '2023-06-10T12:00:00Z',
          updated_at: '2023-06-10T12:05:00Z',
          size: 1024000,
          processed: true,
          summary: 'Project proposal with timeline and budget details.'
        },
        {
          id: 'doc-2',
          filename: 'Meeting_Notes.docx',
          file_type: 'docx',
          created_at: '2023-06-09T10:00:00Z',
          updated_at: '2023-06-09T10:15:00Z',
          size: 512000,
          processed: true,
          summary: 'Notes from client meeting discussing requirements.'
        },
        {
          id: 'doc-3',
          filename: 'Research_Data.xlsx',
          file_type: 'xlsx',
          created_at: '2023-06-08T14:30:00Z',
          updated_at: '2023-06-08T14:45:00Z',
          size: 2048000,
          processed: true,
          summary: 'Research data with market analysis figures.'
        }
      ],
      total: 3
    });
    
    cy.visit('/files');
  });

  afterEach(() => {
    // Clean up test data
  });

  it('should display list of recent documents', () => {
    // Verify recent documents are listed
    cy.get('[data-testid=document-list]').should('be.visible');
    
    // Verify documents show correct metadata
    cy.get('[data-testid=document-list]').find('[data-testid=document-item]').should('have.length', 3);
    
    // Check first document
    cy.get('[data-testid=document-list]').find('[data-testid=document-item]').eq(0)
      .should('contain', 'Project_Proposal.pdf')
      .and('contain', 'pdf')
      .and('contain', 'June 10, 2023');
    
    // Verify documents are sorted by recency
    cy.get('[data-testid=document-list]').find('[data-testid=document-item]').eq(0)
      .should('contain', 'Project_Proposal.pdf');
    cy.get('[data-testid=document-list]').find('[data-testid=document-item]').eq(1)
      .should('contain', 'Meeting_Notes.docx');
    cy.get('[data-testid=document-list]').find('[data-testid=document-item]').eq(2)
      .should('contain', 'Research_Data.xlsx');
  });

  it('should select and view existing documents', () => {
    // Mock document details response
    cy.mockDocumentDetails('doc-1', {
      id: 'doc-1',
      filename: 'Project_Proposal.pdf',
      file_type: 'pdf',
      created_at: '2023-06-10T12:00:00Z',
      updated_at: '2023-06-10T12:05:00Z',
      size: 1024000,
      processed: true,
      summary: 'Project proposal with timeline and budget details.',
      metadata: {
        page_count: 5,
        author: 'Test User',
        created: '2023-06-01T10:00:00Z'
      }
    });
    
    // Click on a document in the list
    cy.get('[data-testid=document-list]').find('[data-testid=document-item]').first().click();
    
    // Verify selected document details are displayed
    cy.get('[data-testid=document-title]').should('contain', 'Project_Proposal.pdf');
    
    // Verify document summary is shown
    cy.get('[data-testid=document-summary]').should('contain', 'Project proposal with timeline and budget details');
    
    // Verify metadata is displayed
    cy.get('[data-testid=document-metadata]').should('contain', 'pdf')
      .and('contain', '1 MB')
      .and('contain', '5 pages')
      .and('contain', 'Test User');
  });
  
  it('should delete documents', () => {
    // Mock successful delete response
    cy.mockDocumentDelete('doc-1', {
      success: true,
      error: null
    });
    
    // Select a document
    cy.get('[data-testid=document-list]').find('[data-testid=document-item]').first().click();
    
    // Click delete button
    cy.get('[data-testid=delete-button]').click();
    
    // Confirm deletion in dialog
    cy.get('[data-testid=confirm-delete-button]').click();
    
    // Verify document is removed from the list
    cy.get('[data-testid=document-list]').find('[data-testid=document-item]').should('have.length', 2);
    cy.get('[data-testid=document-list]').should('not.contain', 'Project_Proposal.pdf');
    
    // Verify success message is displayed
    cy.get('[data-testid=success-message]').should('be.visible')
      .and('contain', 'Document deleted successfully');
  });
  
  it('should download processed documents', () => {
    // Mock document details response
    cy.mockDocumentDetails('doc-1', {
      id: 'doc-1',
      filename: 'Project_Proposal.pdf',
      file_type: 'pdf',
      created_at: '2023-06-10T12:00:00Z',
      updated_at: '2023-06-10T12:05:00Z',
      size: 1024000,
      processed: true,
      summary: 'Project proposal with timeline and budget details.',
      metadata: {
        page_count: 5,
        author: 'Test User',
        created: '2023-06-01T10:00:00Z'
      }
    });
    
    // Select a document
    cy.get('[data-testid=document-list]').find('[data-testid=document-item]').first().click();
    
    // Spy on the download
    cy.window().document().then(function(doc) {
      cy.spy(doc, 'createElement');
      cy.spy(doc.body, 'appendChild');
      cy.spy(doc.body, 'removeChild');
    });
    
    // Click download button
    cy.get('[data-testid=download-button]').click();
    
    // Verify download is initiated
    cy.window().document().then(function(doc) {
      expect(doc.createElement).to.be.calledWith('a');
      expect(doc.body.appendChild).to.be.called;
      expect(doc.body.removeChild).to.be.called;
    });
  });
});

describe('Document Integration', () => {
  beforeEach(() => {
    // Login and set up test environment
    cy.login();
  });

  afterEach(() => {
    // Clean up test data
  });

  it('should reference documents in conversations', () => {
    // Visit the files page
    cy.visit('/files');
    
    // Upload and process a test document
    cy.uploadDocument('test-document.pdf', 'application/pdf');
    cy.processDocument('test-document-id');
    
    // Navigate to chat page
    cy.visit('/chat');
    
    // Ask about the document
    cy.get('[data-testid=message-input]').type('Tell me about the project budget in the document I uploaded{enter}');
    
    // Mock AI response with document reference
    cy.intercept('POST', '/api/conversation', {
      response: 'According to the document "test-document.pdf", the total budget is $75,000. [View Document](test-document-id)',
      conversation_id: 'conv-123'
    }).as('sendMessage');
    
    // Wait for response
    cy.wait('@sendMessage');
    
    // Verify AI response includes document information
    cy.get('[data-testid=message-list]').should('contain', '$75,000')
      .and('contain', 'test-document.pdf');
    
    // Verify document reference is clickable
    cy.get('[data-testid=message-list]').contains('View Document').should('be.visible');
    
    // Mock document details response
    cy.mockDocumentDetails('test-document-id', {
      id: 'test-document-id',
      filename: 'test-document.pdf',
      file_type: 'pdf',
      created_at: '2023-06-10T12:00:00Z',
      updated_at: '2023-06-10T12:05:00Z',
      size: 1024000,
      processed: true,
      summary: 'This is a test document summary containing key information about the project timeline, budget, and deliverables.',
      metadata: {
        page_count: 5,
        author: 'Test User',
        created: '2023-06-01T10:00:00Z'
      }
    });
    
    // Click document reference
    cy.get('[data-testid=message-list]').contains('View Document').click();
    
    // Verify navigation to document view
    cy.url().should('include', '/files/test-document-id');
    cy.get('[data-testid=document-title]').should('contain', 'test-document.pdf');
  });

  it('should upload documents directly in conversations', () => {
    // Visit the chat page
    cy.visit('/chat');
    
    // Mock document upload response
    cy.mockDocumentUpload({
      document_id: 'test-document-id',
      filename: 'test-document.pdf',
      file_type: 'pdf',
      created_at: '2023-06-10T12:00:00Z',
      size: 1024000,
      processed: false
    });
    
    // Mock document process response
    cy.mockDocumentProcess('test-document-id', {
      document_id: 'test-document-id',
      status: 'completed',
      progress: 100,
      summary: 'This is a test document summary containing key information about the project timeline, budget, and deliverables.',
      memory_items: ['memory-1', 'memory-2', 'memory-3'],
      error: null
    });
    
    // Click file upload button in chat
    cy.get('[data-testid=file-upload-button]').click();
    
    // Upload a test document
    cy.get('[data-testid=file-input]').attachFile('test-document.pdf');
    
    // Verify document reference appears in conversation
    cy.get('[data-testid=message-list]').should('contain', 'test-document.pdf');
    
    // Mock AI response acknowledging the document
    cy.intercept('POST', '/api/conversation', {
      response: 'I see you\'ve uploaded a document "test-document.pdf". This document contains information about a project with a budget of $75,000. Would you like me to summarize the key points?',
      conversation_id: 'conv-123'
    }).as('sendMessage');
    
    // Wait for the AI response
    cy.get('[data-testid=message-list]').should('contain', 'uploaded a document')
      .and('contain', 'test-document.pdf');
  });
  
  it('should show documents in memory search results', () => {
    // Visit the files page
    cy.visit('/files');
    
    // Upload and process a document with specific content
    cy.uploadDocument('test-document.pdf', 'application/pdf');
    cy.processDocument('test-document-id');
    
    // Store document in memory
    cy.mockDocumentStoreInMemory('test-document-id', {
      success: true,
      memory_items: ['memory-1', 'memory-2', 'memory-3'],
      error: null
    });
    cy.get('[data-testid=store-in-memory-button]').click();
    
    // Navigate to memory page
    cy.visit('/memory');
    
    // Search for terms from the document
    cy.get('[data-testid=memory-search-input]').type('project budget{enter}');
    
    // Mock memory search results including the document
    cy.intercept('GET', '/api/memory/search*', {
      results: [
        {
          id: 'memory-1',
          content: 'The project budget is $75,000 as outlined in the project proposal.',
          source: 'document',
          source_id: 'test-document-id',
          source_name: 'test-document.pdf',
          category: 'document',
          created_at: '2023-06-10T12:10:00Z'
        }
      ]
    }).as('memorySearch');
    
    // Verify document appears in search results
    cy.get('[data-testid=memory-list]').should('contain', 'test-document.pdf');
    
    // Verify document content is correctly displayed
    cy.get('[data-testid=memory-list]').find('[data-testid=memory-item]').click();
    cy.get('[data-testid=memory-content]').should('contain', 'project budget')
      .and('contain', '$75,000');
  });
  
  it('should maintain privacy indicators for documents', () => {
    // Mock settings with local-only mode
    cy.mockSettingsResponse({
      voice_settings: { enabled: false, voice_id: 'default' },
      privacy_settings: { local_storage_only: true, allow_web_search: false },
      personality_settings: { name: 'Assistant', style: 'helpful' },
      document_settings: { auto_process: false, store_in_memory: true }
    });
    
    // Visit the files page
    cy.visit('/files');
    
    // Verify 'Local Only' indicator is displayed
    cy.get('[data-testid=privacy-indicator]').should('contain', 'Local Only');
    
    // Upload and process a document
    cy.uploadDocument('test-document.pdf', 'application/pdf');
    cy.processDocument('test-document-id');
    
    // Verify document processing privacy indicator shows 'Local Only'
    cy.get('[data-testid=privacy-indicator]').should('contain', 'Local Only');
    
    // Mock settings with cloud features enabled
    cy.mockSettingsResponse({
      voice_settings: { enabled: false, voice_id: 'default' },
      privacy_settings: { local_storage_only: false, allow_web_search: true },
      personality_settings: { name: 'Assistant', style: 'helpful' },
      document_settings: { auto_process: false, store_in_memory: true }
    });
    
    // Refresh page
    cy.reload();
    
    // Verify appropriate privacy indicator is updated
    cy.get('[data-testid=privacy-indicator]').should('not.contain', 'Local Only');
    cy.get('[data-testid=privacy-indicator]').should('contain', 'Cloud Features Enabled');
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    // Login and set up test environment
    cy.login();
  });

  afterEach(() => {
    // Clean up test data
  });

  it('should handle document fetch errors', () => {
    // Visit the files page
    cy.visit('/files');
    
    // Mock failed documents list response
    cy.intercept('GET', '/api/document', {
      statusCode: 500,
      body: {
        error: 'Server error while fetching documents'
      }
    }).as('getDocuments');
    
    // Verify error message is displayed
    cy.get('[data-testid=error-message]').should('be.visible')
      .and('contain', 'error while fetching documents');
    
    // Verify retry option is available
    cy.get('[data-testid=retry-button]').should('be.visible');
    
    // Mock successful response on retry
    cy.mockRecentDocuments({
      documents: [
        {
          id: 'doc-1',
          filename: 'Project_Proposal.pdf',
          file_type: 'pdf',
          created_at: '2023-06-10T12:00:00Z',
          updated_at: '2023-06-10T12:05:00Z',
          size: 1024000,
          processed: true,
          summary: 'Project proposal with timeline and budget details.'
        }
      ],
      total: 1
    });
    
    // Click retry button
    cy.get('[data-testid=retry-button]').click();
    
    // Verify documents load successfully
    cy.get('[data-testid=document-list]').should('be.visible')
      .and('contain', 'Project_Proposal.pdf');
  });

  it('should handle document operation errors', () => {
    // Visit the files page
    cy.visit('/files');
    
    // Mock recent documents response
    cy.mockRecentDocuments({
      documents: [
        {
          id: 'doc-1',
          filename: 'Project_Proposal.pdf',
          file_type: 'pdf',
          created_at: '2023-06-10T12:00:00Z',
          updated_at: '2023-06-10T12:05:00Z',
          size: 1024000,
          processed: true,
          summary: 'Project proposal with timeline and budget details.'
        }
      ],
      total: 1
    });
    
    // Select a document
    cy.get('[data-testid=document-list]').find('[data-testid=document-item]').first().click();
    
    // Mock failed delete response
    cy.mockDocumentDelete('doc-1', {
      success: false,
      error: 'Permission denied or document not found'
    }, { statusCode: 403 });
    
    // Attempt to delete document
    cy.get('[data-testid=delete-button]').click();
    cy.get('[data-testid=confirm-delete-button]').click();
    
    // Verify error message is displayed
    cy.get('[data-testid=error-message]').should('be.visible')
      .and('contain', 'Permission denied');
    
    // Verify document remains in the list
    cy.get('[data-testid=document-list]').should('contain', 'Project_Proposal.pdf');
  });
  
  it('should handle network connectivity issues', () => {
    // Visit the files page
    cy.visit('/files');
    
    // Simulate network disconnection
    cy.intercept('*', { forceNetworkError: true }).as('networkError');
    
    // Attempt document operation
    cy.get('[data-testid=upload-button]').click();
    
    // Verify offline error message
    cy.get('[data-testid=error-message]').should('be.visible')
      .and('contain', 'network connection');
    
    // Restore network connection
    cy.intercept('*').as('networkRestored');
    
    // Mock successful document list response
    cy.mockRecentDocuments({
      documents: [
        {
          id: 'doc-1',
          filename: 'Project_Proposal.pdf',
          file_type: 'pdf',
          created_at: '2023-06-10T12:00:00Z',
          updated_at: '2023-06-10T12:05:00Z',
          size: 1024000,
          processed: true,
          summary: 'Project proposal with timeline and budget details.'
        }
      ],
      total: 1
    });
    
    // Verify operations resume successfully
    cy.get('[data-testid=retry-button]').click();
    cy.get('[data-testid=document-list]').should('be.visible')
      .and('contain', 'Project_Proposal.pdf');
  });
  
  it('should handle unsupported document content', () => {
    // Visit the files page
    cy.visit('/files');
    
    // Upload a document with unsupported content
    cy.uploadDocument('test-document.pdf', 'application/pdf');
    
    // Mock processing response with content error
    cy.mockDocumentProcess('test-document-id', {
      document_id: 'test-document-id',
      status: 'failed',
      progress: 0,
      summary: null,
      memory_items: [],
      error: 'Document is password-protected or contains unsupported content'
    }, { statusCode: 422 });
    
    // Initiate processing
    cy.get('[data-testid=process-button]').click();
    
    // Verify specific error about content is displayed
    cy.get('[data-testid=error-message]').should('be.visible')
      .and('contain', 'password-protected')
      .and('contain', 'unsupported content');
    
    // Verify guidance for supported content is shown
    cy.get('[data-testid=error-message]').should('contain', 'Please ensure the document is not password-protected');
  });
});