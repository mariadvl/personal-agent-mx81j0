import 'cypress';

describe('Memory Management', () => {
  beforeEach(() => {
    // Login and set up test environment
    cy.login();
  });

  describe('Memory Browsing', () => {
    it('should display memory items correctly', () => {
      // Visit the memory page
      cy.visitMemoryPage();
      
      // Mock memory items response
      cy.mockMemoryList({
        memories: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          },
          {
            id: 'memory-2',
            content: 'Client meeting scheduled for July 15th at 10:00 AM to review project progress.',
            category: 'conversation',
            created_at: '2023-06-09T14:30:00Z',
            source_type: 'conversation',
            source_id: 'conv-124',
            importance: 3,
            metadata: { conversation_title: 'Meeting Planning' }
          },
          {
            id: 'memory-3',
            content: 'Project proposal outlines a 12-week development timeline with a budget of $75,000.',
            category: 'document',
            created_at: '2023-06-08T09:15:00Z',
            source_type: 'document',
            source_id: 'doc-456',
            importance: 2,
            metadata: { document_title: 'Project Proposal.pdf' }
          }
        ],
        total: 3
      });
      
      // Verify memory items are displayed
      cy.get('[data-testid=memory-list]').should('be.visible');
      cy.get('[data-testid=memory-item]').should('have.length', 3);
      
      // Verify memory items show correct metadata (category, date, content preview)
      cy.get('[data-testid=memory-item]').first().within(() => {
        cy.get('[data-testid=memory-content]').should('contain', 'Project timeline');
        cy.get('[data-testid=memory-category]').should('contain', 'conversation');
        cy.get('[data-testid=memory-date]').should('contain', 'Jun 10, 2023');
      });
      
      // Verify memory items are sorted by recency
      cy.get('[data-testid=memory-item]').eq(0).should('contain', 'Project timeline');
      cy.get('[data-testid=memory-item]').eq(1).should('contain', 'Client meeting');
      cy.get('[data-testid=memory-item]').eq(2).should('contain', 'Project proposal');
    });

    it('should navigate between memory categories', () => {
      cy.visitMemoryPage();
      
      // Mock memory categories response
      cy.mockMemoryList({
        memories: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          },
          {
            id: 'memory-2',
            content: 'Client meeting scheduled for July 15th at 10:00 AM to review project progress.',
            category: 'conversation',
            created_at: '2023-06-09T14:30:00Z',
            source_type: 'conversation',
            source_id: 'conv-124',
            importance: 3,
            metadata: { conversation_title: 'Meeting Planning' }
          },
          {
            id: 'memory-3',
            content: 'Project proposal outlines a 12-week development timeline with a budget of $75,000.',
            category: 'document',
            created_at: '2023-06-08T09:15:00Z',
            source_type: 'document',
            source_id: 'doc-456',
            importance: 2,
            metadata: { document_title: 'Project Proposal.pdf' }
          }
        ],
        total: 3
      });
      
      // Click on different category filters
      cy.get('[data-testid=category-filter]').click();
      cy.get('[data-testid=category-option]').contains('Document').click();
      
      // Mock filtered response
      cy.mockMemoryByCategory('document', {
        results: [
          {
            id: 'memory-3',
            content: 'Project proposal outlines a 12-week development timeline with a budget of $75,000.',
            category: 'document',
            created_at: '2023-06-08T09:15:00Z',
            source_type: 'document',
            source_id: 'doc-456',
            importance: 2,
            metadata: { document_title: 'Project Proposal.pdf' }
          }
        ],
        total: 1,
        limit: 20,
        offset: 0
      });
      
      // Verify memory list updates based on selected category
      cy.get('[data-testid=memory-item]').should('have.length', 1);
      cy.get('[data-testid=memory-item]').first().should('contain', 'Project proposal');
      
      // Verify active category is highlighted
      cy.get('[data-testid=category-option]').contains('Document').should('have.class', 'active');
    });

    it('should display memory details when selected', () => {
      cy.visitMemoryPage();
      
      // Mock memory items response
      cy.mockMemoryList({
        memories: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1
      });
      
      // Click on a memory item
      cy.get('[data-testid=memory-item]').first().click();
      
      // Mock memory detail response
      cy.mockMemoryDetail('memory-1', {
        id: 'memory-1',
        content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
        category: 'conversation',
        created_at: '2023-06-10T12:00:00Z',
        source_type: 'conversation',
        source_id: 'conv-123',
        importance: 2,
        metadata: {
          conversation_title: 'Project Discussion',
          conversation_date: '2023-06-10T12:00:00Z',
          participants: ['User', 'AI Assistant']
        }
      });
      
      // Verify memory detail view is displayed
      cy.get('[data-testid=memory-detail]').should('be.visible');
      
      // Verify memory content is shown in full
      cy.get('[data-testid=memory-content]').should('contain', 'Project timeline discussed with client');
      
      // Verify memory metadata is displayed (source, date, category)
      cy.get('[data-testid=memory-source]').should('contain', 'Project Discussion');
      cy.get('[data-testid=memory-date]').should('contain', 'Jun 10, 2023');
      cy.get('[data-testid=memory-category]').should('contain', 'conversation');
    });

    it('should handle empty memory states', () => {
      cy.visitMemoryPage();
      
      // Mock empty memory response
      cy.mockMemoryList({
        memories: [],
        total: 0
      });
      
      // Verify empty state message is displayed
      cy.get('[data-testid=empty-state]').should('be.visible');
      cy.get('[data-testid=empty-state]').should('contain', 'No memories found');
      
      // Verify guidance for creating memories is shown
      cy.get('[data-testid=empty-state]').should('contain', 'Start a conversation or upload a document');
    });
  });

  describe('Memory Search', () => {
    it('should search memories by text query', () => {
      cy.visitMemoryPage();
      
      // Enter search query in search field
      cy.get('[data-testid=search-input]').type('project timeline');
      
      // Submit search
      cy.get('[data-testid=search-button]').click();
      
      // Mock memory search response
      cy.mockMemorySearch({
        results: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1,
        limit: 20,
        offset: 0
      });
      
      // Verify search results are displayed
      cy.get('[data-testid=memory-list]').should('be.visible');
      cy.get('[data-testid=memory-item]').should('have.length', 1);
      
      // Verify results match search query
      cy.get('[data-testid=memory-item]').first().should('contain', 'Project timeline');
      
      // Verify search term is highlighted in results
      cy.get('[data-testid=memory-content]').find('.highlight').should('contain', 'project timeline');
    });

    it('should filter search results by category', () => {
      cy.visitMemoryPage();
      
      // Enter search query
      cy.get('[data-testid=search-input]').type('project');
      
      // Select category filter
      cy.get('[data-testid=category-filter]').click();
      cy.get('[data-testid=category-option]').contains('Document').click();
      
      // Submit search
      cy.get('[data-testid=search-button]').click();
      
      // Mock filtered search response
      cy.mockMemorySearch({
        results: [
          {
            id: 'memory-3',
            content: 'Project proposal outlines a 12-week development timeline with a budget of $75,000.',
            category: 'document',
            created_at: '2023-06-08T09:15:00Z',
            source_type: 'document',
            source_id: 'doc-456',
            importance: 2,
            metadata: { document_title: 'Project Proposal.pdf' }
          }
        ],
        total: 1,
        limit: 20,
        offset: 0
      });
      
      // Verify results are filtered by selected category
      cy.get('[data-testid=memory-item]').should('have.length', 1);
      cy.get('[data-testid=memory-category]').should('contain', 'document');
      
      // Change category selection
      cy.get('[data-testid=category-filter]').click();
      cy.get('[data-testid=category-option]').contains('Conversation').click();
      
      // Submit search again
      cy.get('[data-testid=search-button]').click();
      
      // Mock updated search response
      cy.mockMemorySearch({
        results: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1,
        limit: 20,
        offset: 0
      });
      
      // Verify results update accordingly
      cy.get('[data-testid=memory-item]').should('have.length', 1);
      cy.get('[data-testid=memory-category]').should('contain', 'conversation');
    });

    it('should handle no search results', () => {
      cy.visitMemoryPage();
      
      // Enter search query with no matches
      cy.get('[data-testid=search-input]').type('nonexistent content');
      
      // Submit search
      cy.get('[data-testid=search-button]').click();
      
      // Mock empty search response
      cy.mockMemorySearch({
        results: [],
        total: 0,
        limit: 20,
        offset: 0
      });
      
      // Verify no results message is displayed
      cy.get('[data-testid=no-results-message]').should('be.visible');
      cy.get('[data-testid=no-results-message]').should('contain', 'No results found');
      
      // Verify search query is shown in message
      cy.get('[data-testid=no-results-message]').should('contain', 'nonexistent content');
      
      // Verify option to clear search is available
      cy.get('[data-testid=clear-search-button]').should('be.visible');
    });

    it('should clear search results', () => {
      cy.visitMemoryPage();
      
      // Perform search with results
      cy.get('[data-testid=search-input]').type('project');
      cy.get('[data-testid=search-button]').click();
      
      cy.mockMemorySearch({
        results: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1,
        limit: 20,
        offset: 0
      });
      
      // Click clear search button
      cy.get('[data-testid=clear-search-button]').click();
      
      // Mock default memory items response
      cy.mockMemoryList({
        memories: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          },
          {
            id: 'memory-2',
            content: 'Client meeting scheduled for July 15th at 10:00 AM to review project progress.',
            category: 'conversation',
            created_at: '2023-06-09T14:30:00Z',
            source_type: 'conversation',
            source_id: 'conv-124',
            importance: 3,
            metadata: { conversation_title: 'Meeting Planning' }
          },
          {
            id: 'memory-3',
            content: 'Project proposal outlines a 12-week development timeline with a budget of $75,000.',
            category: 'document',
            created_at: '2023-06-08T09:15:00Z',
            source_type: 'document',
            source_id: 'doc-456',
            importance: 2,
            metadata: { document_title: 'Project Proposal.pdf' }
          }
        ],
        total: 3
      });
      
      // Verify search field is cleared
      cy.get('[data-testid=search-input]').should('have.value', '');
      
      // Verify default memory view is restored
      cy.get('[data-testid=memory-item]').should('have.length', 3);
    });
  });

  describe('Memory Management', () => {
    it('should edit memory content', () => {
      cy.visitMemoryPage();
      
      // Select a memory item
      cy.mockMemoryList({
        memories: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1
      });
      
      cy.get('[data-testid=memory-item]').first().click();
      
      cy.mockMemoryDetail('memory-1', {
        id: 'memory-1',
        content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
        category: 'conversation',
        created_at: '2023-06-10T12:00:00Z',
        source_type: 'conversation',
        source_id: 'conv-123',
        importance: 2,
        metadata: {
          conversation_title: 'Project Discussion',
          conversation_date: '2023-06-10T12:00:00Z',
          participants: ['User', 'AI Assistant']
        }
      });
      
      // Click edit button
      cy.get('[data-testid=edit-button]').click();
      
      // Modify memory content
      cy.get('[data-testid=content-input]').clear().type('Updated project timeline: Research phase (2 weeks), Design phase (4 weeks), Development (5 weeks), Testing (3 weeks).');
      
      // Save changes
      cy.get('[data-testid=save-button]').click();
      
      // Mock successful update response
      cy.mockMemoryUpdate('memory-1', {
        id: 'memory-1',
        content: 'Updated project timeline: Research phase (2 weeks), Design phase (4 weeks), Development (5 weeks), Testing (3 weeks).',
        category: 'conversation',
        created_at: '2023-06-10T12:00:00Z',
        updated_at: '2023-06-11T10:00:00Z',
        source_type: 'conversation',
        source_id: 'conv-123',
        importance: 2,
        metadata: {
          conversation_title: 'Project Discussion',
          conversation_date: '2023-06-10T12:00:00Z',
          participants: ['User', 'AI Assistant']
        }
      });
      
      // Verify success message is displayed
      cy.get('[data-testid=success-message]').should('be.visible');
      
      // Verify memory content is updated in the UI
      cy.get('[data-testid=memory-content]').should('contain', 'Updated project timeline');
    });

    it('should change memory category', () => {
      cy.visitMemoryPage();
      cy.mockMemoryList({
        memories: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1
      });
      
      // Select a memory item
      cy.get('[data-testid=memory-item]').first().click();
      
      cy.mockMemoryDetail('memory-1', {
        id: 'memory-1',
        content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
        category: 'conversation',
        created_at: '2023-06-10T12:00:00Z',
        source_type: 'conversation',
        source_id: 'conv-123',
        importance: 2,
        metadata: {
          conversation_title: 'Project Discussion',
          conversation_date: '2023-06-10T12:00:00Z',
          participants: ['User', 'AI Assistant']
        }
      });
      
      // Click edit button
      cy.get('[data-testid=edit-button]').click();
      
      // Change memory category
      cy.get('[data-testid=category-select]').click();
      cy.get('[data-testid=category-option]').contains('Important').click();
      
      // Save changes
      cy.get('[data-testid=save-button]').click();
      
      // Mock successful update response
      cy.mockMemoryUpdate('memory-1', {
        id: 'memory-1',
        content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
        category: 'important',
        created_at: '2023-06-10T12:00:00Z',
        updated_at: '2023-06-11T10:00:00Z',
        source_type: 'conversation',
        source_id: 'conv-123',
        importance: 3,
        metadata: {
          conversation_title: 'Project Discussion',
          conversation_date: '2023-06-10T12:00:00Z',
          participants: ['User', 'AI Assistant']
        }
      });
      
      // Verify category is updated in the UI
      cy.get('[data-testid=memory-category]').should('contain', 'important');
      
      // Verify memory appears in new category when filtered
      cy.get('[data-testid=category-filter]').click();
      cy.get('[data-testid=category-option]').contains('Important').click();
      
      cy.mockMemoryByCategory('important', {
        results: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'important',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 3,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1,
        limit: 20,
        offset: 0
      });
      
      cy.get('[data-testid=memory-item]').should('have.length', 1);
    });

    it('should mark memory as important', () => {
      cy.visitMemoryPage();
      cy.mockMemoryList({
        memories: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1
      });
      
      // Select a memory item
      cy.get('[data-testid=memory-item]').first().click();
      
      cy.mockMemoryDetail('memory-1', {
        id: 'memory-1',
        content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
        category: 'conversation',
        created_at: '2023-06-10T12:00:00Z',
        source_type: 'conversation',
        source_id: 'conv-123',
        importance: 2,
        metadata: {
          conversation_title: 'Project Discussion',
          conversation_date: '2023-06-10T12:00:00Z',
          participants: ['User', 'AI Assistant']
        }
      });
      
      // Click 'Mark Important' button
      cy.get('[data-testid=mark-important-button]').click();
      
      // Mock successful update response
      cy.mockMemoryUpdate('memory-1', {
        id: 'memory-1',
        content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
        category: 'important',
        created_at: '2023-06-10T12:00:00Z',
        updated_at: '2023-06-11T10:00:00Z',
        source_type: 'conversation',
        source_id: 'conv-123',
        importance: 3,
        metadata: {
          conversation_title: 'Project Discussion',
          conversation_date: '2023-06-10T12:00:00Z',
          participants: ['User', 'AI Assistant']
        }
      });
      
      // Verify importance indicator is displayed
      cy.get('[data-testid=memory-item]').should('have.class', 'important');
      
      // Filter by important category
      cy.get('[data-testid=category-filter]').click();
      cy.get('[data-testid=category-option]').contains('Important').click();
      
      cy.mockMemoryByCategory('important', {
        results: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'important',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 3,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1,
        limit: 20,
        offset: 0
      });
      
      // Verify memory appears in important category
      cy.get('[data-testid=memory-item]').should('have.length', 1);
    });

    it('should delete a memory item', () => {
      cy.visitMemoryPage();
      cy.mockMemoryList({
        memories: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1
      });
      
      // Select a memory item
      cy.get('[data-testid=memory-item]').first().click();
      
      cy.mockMemoryDetail('memory-1', {
        id: 'memory-1',
        content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
        category: 'conversation',
        created_at: '2023-06-10T12:00:00Z',
        source_type: 'conversation',
        source_id: 'conv-123',
        importance: 2,
        metadata: {
          conversation_title: 'Project Discussion',
          conversation_date: '2023-06-10T12:00:00Z',
          participants: ['User', 'AI Assistant']
        }
      });
      
      // Click delete button
      cy.get('[data-testid=delete-button]').click();
      
      // Confirm deletion in dialog
      cy.get('[data-testid=confirm-dialog]').should('be.visible');
      cy.get('[data-testid=confirm-button]').click();
      
      // Mock successful delete response
      cy.mockMemoryDelete('memory-1', { success: true });
      
      // Mock empty memory list after deletion
      cy.mockMemoryList({
        memories: [],
        total: 0
      });
      
      // Verify success message is displayed
      cy.get('[data-testid=success-message]').should('be.visible');
      
      // Verify memory item is removed from the list
      cy.get('[data-testid=memory-item]').should('not.exist');
      cy.get('[data-testid=empty-state]').should('be.visible');
    });

    it('should batch delete multiple memory items', () => {
      cy.visitMemoryPage();
      cy.mockMemoryList({
        memories: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          },
          {
            id: 'memory-2',
            content: 'Client meeting scheduled for July 15th at 10:00 AM to review project progress.',
            category: 'conversation',
            created_at: '2023-06-09T14:30:00Z',
            source_type: 'conversation',
            source_id: 'conv-124',
            importance: 3,
            metadata: { conversation_title: 'Meeting Planning' }
          }
        ],
        total: 2
      });
      
      // Select multiple memory items using checkboxes
      cy.get('[data-testid=memory-checkbox]').first().click();
      cy.get('[data-testid=memory-checkbox]').last().click();
      
      // Verify selection count is displayed
      cy.get('[data-testid=selection-count]').should('contain', '2 selected');
      
      // Click batch delete button
      cy.get('[data-testid=batch-delete-button]').click();
      
      // Confirm deletion in dialog
      cy.get('[data-testid=confirm-dialog]').should('be.visible');
      cy.get('[data-testid=confirm-button]').click();
      
      // Mock successful batch delete response
      cy.mockMemoryBatchDelete({
        success: true,
        deleted_count: 2,
        errors: []
      });
      
      // Mock empty memory list after deletion
      cy.mockMemoryList({
        memories: [],
        total: 0
      });
      
      // Verify success message is displayed
      cy.get('[data-testid=success-message]').should('be.visible');
      
      // Verify all selected items are removed from the list
      cy.get('[data-testid=memory-item]').should('not.exist');
    });
  });

  describe('Memory Statistics', () => {
    it('should display memory statistics', () => {
      cy.visitMemoryPage();
      
      // Mock memory stats response
      cy.mockMemoryStats({
        total_count: 156,
        category_counts: {
          conversation: 87,
          document: 42,
          web: 18,
          important: 9
        },
        storage_size: 2560000,
        oldest_memory: '2023-01-15T09:30:00Z',
        newest_memory: '2023-06-10T14:45:00Z'
      });
      
      // Verify total memory count is displayed
      cy.get('[data-testid=total-count]').should('contain', '156');
      
      // Verify category distribution is shown
      cy.get('[data-testid=category-distribution]').should('be.visible');
      cy.get('[data-testid=category-distribution]').should('contain', 'Conversation: 87');
      cy.get('[data-testid=category-distribution]').should('contain', 'Document: 42');
      
      // Verify storage usage information is available
      cy.get('[data-testid=storage-usage]').should('contain', '2.56 MB');
    });

    it('should update statistics after operations', () => {
      cy.visitMemoryPage();
      
      // Mock initial memory stats
      cy.mockMemoryStats({
        total_count: 156,
        category_counts: {
          conversation: 87,
          document: 42,
          web: 18,
          important: 9
        },
        storage_size: 2560000,
        oldest_memory: '2023-01-15T09:30:00Z',
        newest_memory: '2023-06-10T14:45:00Z'
      });
      
      // Verify initial statistics
      cy.get('[data-testid=total-count]').should('contain', '156');
      
      // Mock memory list for deletion
      cy.mockMemoryList({
        memories: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1
      });
      
      // Select memory and delete it
      cy.get('[data-testid=memory-item]').first().click();
      cy.mockMemoryDetail('memory-1', {
        id: 'memory-1',
        content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
        category: 'conversation',
        created_at: '2023-06-10T12:00:00Z',
        source_type: 'conversation',
        source_id: 'conv-123',
        importance: 2,
        metadata: { conversation_title: 'Project Discussion' }
      });
      
      cy.get('[data-testid=delete-button]').click();
      cy.get('[data-testid=confirm-button]').click();
      
      // Mock successful delete response
      cy.mockMemoryDelete('memory-1', { success: true });
      
      // Mock updated memory stats after deletion
      cy.mockMemoryStats({
        total_count: 155,
        category_counts: {
          conversation: 86,
          document: 42,
          web: 18,
          important: 9
        },
        storage_size: 2540000,
        oldest_memory: '2023-01-15T09:30:00Z',
        newest_memory: '2023-06-10T14:45:00Z'
      });
      
      // Verify statistics are updated to reflect deletion
      cy.get('[data-testid=total-count]').should('contain', '155');
      cy.get('[data-testid=category-distribution]').should('contain', 'Conversation: 86');
    });
  });

  describe('Memory Integration', () => {
    it('should show conversation memories', () => {
      // Create a conversation with specific content
      cy.visitMemoryPage();
      
      // Filter by conversation category
      cy.get('[data-testid=category-filter]').click();
      cy.get('[data-testid=category-option]').contains('Conversation').click();
      
      // Mock conversation memories response
      cy.mockMemoryByCategory('conversation', {
        results: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          },
          {
            id: 'memory-2',
            content: 'Client meeting scheduled for July 15th at 10:00 AM to review project progress.',
            category: 'conversation',
            created_at: '2023-06-09T14:30:00Z',
            source_type: 'conversation',
            source_id: 'conv-124',
            importance: 3,
            metadata: { conversation_title: 'Meeting Planning' }
          }
        ],
        total: 2,
        limit: 20,
        offset: 0
      });
      
      // Verify conversation memories are displayed
      cy.get('[data-testid=memory-item]').should('have.length', 2);
      
      // Select a conversation memory
      cy.get('[data-testid=memory-item]').first().click();
      
      // Mock memory detail response
      cy.mockMemoryDetail('memory-1', {
        id: 'memory-1',
        content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
        category: 'conversation',
        created_at: '2023-06-10T12:00:00Z',
        source_type: 'conversation',
        source_id: 'conv-123',
        importance: 2,
        metadata: {
          conversation_title: 'Project Discussion',
          conversation_date: '2023-06-10T12:00:00Z',
          participants: ['User', 'AI Assistant']
        }
      });
      
      // Verify conversation details are shown
      cy.get('[data-testid=memory-detail]').should('be.visible');
      cy.get('[data-testid=memory-source]').should('contain', 'Project Discussion');
      
      // Verify link to original conversation is available
      cy.get('[data-testid=source-link]').should('be.visible');
      cy.get('[data-testid=source-link]').should('have.attr', 'href').and('include', '/chat/conv-123');
    });

    it('should show document memories', () => {
      // Process a document
      // Store document in memory
      cy.visitMemoryPage();
      
      // Filter by document category
      cy.get('[data-testid=category-filter]').click();
      cy.get('[data-testid=category-option]').contains('Document').click();
      
      // Mock document memories response
      cy.mockMemoryByCategory('document', {
        results: [
          {
            id: 'memory-3',
            content: 'Project proposal outlines a 12-week development timeline with a budget of $75,000.',
            category: 'document',
            created_at: '2023-06-08T09:15:00Z',
            source_type: 'document',
            source_id: 'doc-456',
            importance: 2,
            metadata: { document_title: 'Project Proposal.pdf' }
          }
        ],
        total: 1,
        limit: 20,
        offset: 0
      });
      
      // Verify document memories are displayed
      cy.get('[data-testid=memory-item]').should('have.length', 1);
      
      // Select a document memory
      cy.get('[data-testid=memory-item]').first().click();
      
      // Mock memory detail response
      cy.mockMemoryDetail('memory-3', {
        id: 'memory-3',
        content: 'Project proposal outlines a 12-week development timeline with a budget of $75,000.',
        category: 'document',
        created_at: '2023-06-08T09:15:00Z',
        source_type: 'document',
        source_id: 'doc-456',
        importance: 2,
        metadata: {
          document_title: 'Project Proposal.pdf',
          document_type: 'pdf',
          page_number: 1,
          total_pages: 5
        }
      });
      
      // Verify document content is shown
      cy.get('[data-testid=memory-detail]').should('be.visible');
      cy.get('[data-testid=memory-content]').should('contain', 'Project proposal');
      
      // Verify link to original document is available
      cy.get('[data-testid=source-link]').should('be.visible');
      cy.get('[data-testid=source-link]').should('have.attr', 'href').and('include', '/files/doc-456');
    });

    it('should show web content memories', () => {
      // Process a web page
      // Store web content in memory
      cy.visitMemoryPage();
      
      // Filter by web category
      cy.get('[data-testid=category-filter]').click();
      cy.get('[data-testid=category-option]').contains('Web').click();
      
      // Mock web memories response
      cy.mockMemoryByCategory('web', {
        results: [
          {
            id: 'memory-4',
            content: 'AI research breakthrough: New model achieves 98% accuracy on benchmark tests.',
            category: 'web',
            created_at: '2023-06-05T16:20:00Z',
            source_type: 'web',
            source_id: 'web-789',
            importance: 1,
            metadata: {
              page_title: 'AI Research Breakthroughs',
              url: 'https://example.com/ai-research',
              source: 'AI Research Journal'
            }
          }
        ],
        total: 1,
        limit: 20,
        offset: 0
      });
      
      // Verify web memories are displayed
      cy.get('[data-testid=memory-item]').should('have.length', 1);
      
      // Select a web memory
      cy.get('[data-testid=memory-item]').first().click();
      
      // Mock memory detail response
      cy.mockMemoryDetail('memory-4', {
        id: 'memory-4',
        content: 'AI research breakthrough: New model achieves 98% accuracy on benchmark tests.',
        category: 'web',
        created_at: '2023-06-05T16:20:00Z',
        source_type: 'web',
        source_id: 'web-789',
        importance: 1,
        metadata: {
          page_title: 'AI Research Breakthroughs',
          url: 'https://example.com/ai-research',
          source: 'AI Research Journal',
          accessed_date: '2023-06-05T16:20:00Z'
        }
      });
      
      // Verify web content is shown
      cy.get('[data-testid=memory-detail]').should('be.visible');
      cy.get('[data-testid=memory-content]').should('contain', 'AI research breakthrough');
      
      // Verify link to original web page is available
      cy.get('[data-testid=source-link]').should('be.visible');
      cy.get('[data-testid=source-link]').should('contain', 'Visit Website');
      cy.get('[data-testid=source-link]').should('have.attr', 'href', 'https://example.com/ai-research');
      cy.get('[data-testid=source-link]').should('have.attr', 'target', '_blank');
    });

    it('should use memories in conversations', () => {
      cy.visitMemoryPage();
      
      // Mock memory list response
      cy.mockMemoryList({
        memories: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1
      });
      
      // Select a memory item with specific content
      cy.get('[data-testid=memory-item]').first().click();
      
      cy.mockMemoryDetail('memory-1', {
        id: 'memory-1',
        content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
        category: 'conversation',
        created_at: '2023-06-10T12:00:00Z',
        source_type: 'conversation',
        source_id: 'conv-123',
        importance: 2,
        metadata: {
          conversation_title: 'Project Discussion',
          conversation_date: '2023-06-10T12:00:00Z',
          participants: ['User', 'AI Assistant']
        }
      });
      
      // Click 'Ask About This' button
      cy.get('[data-testid=ask-about-button]').click();
      
      // Verify navigation to chat interface
      cy.url().should('include', '/chat');
      
      // Verify memory context is included in chat
      cy.get('[data-testid=context-indicator]').should('contain', 'Using memory: Project timeline');
      
      // Ask a question about the memory
      cy.get('[data-testid=message-input]').type('What was the timeline for the design phase?{enter}');
      
      // Mock AI response with memory information
      cy.intercept('POST', '/api/conversation', {
        statusCode: 200,
        body: {
          response: "Based on the project timeline we discussed with the client, the Design phase was allocated 3 weeks.",
          conversation_id: 'new-conv-id'
        }
      }).as('chatResponse');
      
      // Verify AI response includes memory information
      cy.wait('@chatResponse');
      cy.get('[data-testid=message-list]').should('contain', 'Design phase was allocated 3 weeks');
    });
  });

  describe('Error Handling', () => {
    it('should handle memory fetch errors', () => {
      cy.visitMemoryPage();
      
      // Mock failed memory list response
      cy.intercept('GET', '/api/memory', {
        statusCode: 500,
        body: {
          error: 'Internal server error'
        }
      }).as('memoryFetchError');
      
      // Verify error message is displayed
      cy.wait('@memoryFetchError');
      cy.get('[data-testid=error-message]').should('be.visible');
      cy.get('[data-testid=error-message]').should('contain', 'Failed to load memories');
      
      // Verify retry option is available
      cy.get('[data-testid=retry-button]').should('be.visible');
      
      // Mock successful response on retry
      cy.intercept('GET', '/api/memory', {
        statusCode: 200,
        body: {
          memories: [
            {
              id: 'memory-1',
              content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
              category: 'conversation',
              created_at: '2023-06-10T12:00:00Z',
              source_type: 'conversation',
              source_id: 'conv-123',
              importance: 2,
              metadata: { conversation_title: 'Project Discussion' }
            }
          ],
          total: 1
        }
      }).as('memoryFetchRetry');
      
      // Click retry button
      cy.get('[data-testid=retry-button]').click();
      
      // Verify memories load successfully
      cy.wait('@memoryFetchRetry');
      cy.get('[data-testid=memory-item]').should('have.length', 1);
    });

    it('should handle memory operation errors', () => {
      cy.visitMemoryPage();
      
      // Mock memory list response
      cy.mockMemoryList({
        memories: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1
      });
      
      // Select a memory item
      cy.get('[data-testid=memory-item]').first().click();
      
      cy.mockMemoryDetail('memory-1', {
        id: 'memory-1',
        content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
        category: 'conversation',
        created_at: '2023-06-10T12:00:00Z',
        source_type: 'conversation',
        source_id: 'conv-123',
        importance: 2,
        metadata: {
          conversation_title: 'Project Discussion',
          conversation_date: '2023-06-10T12:00:00Z',
          participants: ['User', 'AI Assistant']
        }
      });
      
      // Attempt to delete memory
      cy.get('[data-testid=delete-button]').click();
      cy.get('[data-testid=confirm-button]').click();
      
      // Mock failed delete response
      cy.intercept('DELETE', '/api/memory/memory-1', {
        statusCode: 500,
        body: {
          error: 'Failed to delete memory'
        }
      }).as('deleteError');
      
      // Verify error message is displayed
      cy.wait('@deleteError');
      cy.get('[data-testid=error-message]').should('be.visible');
      
      // Verify memory remains in the list
      cy.get('[data-testid=memory-item]').should('exist');
    });

    it('should handle search errors', () => {
      cy.visitMemoryPage();
      
      // Enter search query
      cy.get('[data-testid=search-input]').type('project');
      
      // Mock failed search response
      cy.intercept('POST', '/api/memory/search', {
        statusCode: 500,
        body: {
          error: 'Search failed'
        }
      }).as('searchError');
      
      // Submit search
      cy.get('[data-testid=search-button]').click();
      
      // Verify error message is displayed
      cy.wait('@searchError');
      cy.get('[data-testid=error-message]').should('be.visible');
      
      // Verify search can be attempted again
      cy.get('[data-testid=search-button]').should('be.enabled');
    });

    it('should handle network connectivity issues', () => {
      cy.visitMemoryPage();
      
      // Mock memory list response
      cy.mockMemoryList({
        memories: [
          {
            id: 'memory-1',
            content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
            category: 'conversation',
            created_at: '2023-06-10T12:00:00Z',
            source_type: 'conversation',
            source_id: 'conv-123',
            importance: 2,
            metadata: { conversation_title: 'Project Discussion' }
          }
        ],
        total: 1
      });
      
      // Simulate network disconnection
      cy.intercept('*', (req) => {
        req.reply({
          forceNetworkError: true
        });
      }).as('networkError');
      
      // Attempt memory operation
      cy.get('[data-testid=memory-item]').first().click();
      
      // Verify offline error message
      cy.get('[data-testid=error-message]').should('be.visible');
      cy.get('[data-testid=error-message]').should('contain', 'Network connection lost');
      
      // Restore network connection
      cy.intercept('GET', '/api/memory*').as('memoryRequests');
      cy.mockMemoryDetail('memory-1', {
        id: 'memory-1',
        content: 'Project timeline discussed with client: Research phase (2 weeks), Design phase (3 weeks), Development (6 weeks), Testing (2 weeks).',
        category: 'conversation',
        created_at: '2023-06-10T12:00:00Z',
        source_type: 'conversation',
        source_id: 'conv-123',
        importance: 2,
        metadata: {
          conversation_title: 'Project Discussion',
          conversation_date: '2023-06-10T12:00:00Z',
          participants: ['User', 'AI Assistant']
        }
      });
      
      // Click retry button
      cy.get('[data-testid=retry-button]').click();
      
      // Verify operations resume successfully
      cy.get('[data-testid=memory-detail]').should('be.visible');
    });
  });
});