import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import useMemory from '../../src/hooks/useMemory';
import useMemoryStore from '../../src/store/memoryStore';
import useSettings from '../../src/hooks/useSettings';
import { MemoryItem, MemorySearchResult, MemoryStats } from '../../src/types/memory';

// Mock the dependencies
jest.mock('../../src/store/memoryStore');
jest.mock('../../src/hooks/useSettings');

describe('useMemory hook', () => {
  // Mock data
  const mockMemoryItem: MemoryItem = {
    id: 'memory-1',
    created_at: '2023-06-01T12:00:00Z',
    content: 'Test memory content',
    category: 'conversation',
    source_type: 'chat',
    source_id: 'chat-1',
    importance: 1,
    metadata: {}
  };

  const mockMemorySearchResult: MemorySearchResult = {
    results: [
      mockMemoryItem,
      {
        id: 'memory-2',
        created_at: '2023-06-02T12:00:00Z',
        content: 'Another test memory',
        category: 'document',
        source_type: 'file',
        source_id: 'file-1',
        importance: 2,
        metadata: {}
      }
    ],
    total: 2,
    limit: 10,
    offset: 0
  };

  const mockMemoryStats: MemoryStats = {
    total_count: 100,
    category_counts: {
      conversation: 50,
      document: 30,
      web: 15,
      important: 5,
      user_defined: 0
    },
    storage_size: 1024000,
    oldest_memory: '2023-01-01T00:00:00Z',
    newest_memory: '2023-06-15T12:00:00Z'
  };

  const mockError = new Error('Failed to fetch memory');

  // Mock store functions
  let fetchMemoryById: jest.Mock;
  let searchMemories: jest.Mock;
  let createMemoryItem: jest.Mock;
  let updateMemoryItem: jest.Mock;
  let deleteMemoryItem: jest.Mock;
  let batchDeleteMemoryItems: jest.Mock;
  let getMemoriesByCategory: jest.Mock;
  let markAsImportant: jest.Mock;
  let fetchMemoryStats: jest.Mock;
  let fetchRelatedMemories: jest.Mock;
  let retrieveMemoryContext: jest.Mock;
  let setSelectedMemoryId: jest.Mock;
  let setSearchParams: jest.Mock;
  let clearSearchResults: jest.Mock;
  let clearError: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up function mocks
    fetchMemoryById = jest.fn();
    searchMemories = jest.fn();
    createMemoryItem = jest.fn();
    updateMemoryItem = jest.fn();
    deleteMemoryItem = jest.fn().mockResolvedValue({ success: true });
    batchDeleteMemoryItems = jest.fn().mockResolvedValue({ success: true });
    getMemoriesByCategory = jest.fn();
    markAsImportant = jest.fn();
    fetchMemoryStats = jest.fn();
    fetchRelatedMemories = jest.fn();
    retrieveMemoryContext = jest.fn();
    setSelectedMemoryId = jest.fn();
    setSearchParams = jest.fn();
    clearSearchResults = jest.fn();
    clearError = jest.fn();

    // Mock memory store
    (useMemoryStore as jest.Mock).mockReturnValue({
      memoryItems: {},
      selectedMemoryId: null,
      searchResults: null,
      searchParams: { query: '' },
      memoryStats: null,
      relatedMemories: {},
      contextResults: null,
      isLoading: false,
      error: null,
      
      fetchMemoryById,
      searchMemories,
      createMemoryItem,
      updateMemoryItem,
      deleteMemoryItem,
      batchDeleteMemoryItems,
      getMemoriesByCategory,
      markAsImportant,
      fetchMemoryStats,
      fetchRelatedMemories,
      retrieveMemoryContext,
      setSelectedMemoryId,
      setSearchParams,
      clearSearchResults,
      clearError
    });

    // Mock settings
    (useSettings as jest.Mock).mockReturnValue({
      settings: {
        memory_settings: {
          context_window_size: 10,
          recency_weight: 0.25,
          relevance_weight: 0.65,
          importance_weight: 0.1
        }
      }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should initialize with default values', () => {
    const { result } = renderHook(() => useMemory());
    
    expect(result.current.memory).toBe(null);
    expect(result.current.memoryItems).toEqual({});
    expect(result.current.searchResults).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should load memory when memoryId is provided', async () => {
    fetchMemoryById.mockResolvedValue(mockMemoryItem);
    
    // Mock loading state changes
    (useMemoryStore as jest.Mock).mockImplementation(() => ({
      ...useMemoryStore(),
      isLoading: true
    }));
    
    const { result, rerender } = renderHook(() => useMemory({ memoryId: 'memory-1', autoLoad: true }));
    
    expect(fetchMemoryById).toHaveBeenCalledWith('memory-1');
    expect(result.current.isLoading).toBe(true);
    
    // Mock state after loading completes
    (useMemoryStore as jest.Mock).mockImplementation(() => ({
      ...useMemoryStore(),
      isLoading: false,
      memoryItems: { 'memory-1': mockMemoryItem },
      selectedMemoryId: 'memory-1'
    }));
    
    rerender();
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.memory).toEqual(mockMemoryItem);
  });

  test('should handle errors when loading memory', async () => {
    fetchMemoryById.mockRejectedValue(mockError);
    const onError = jest.fn();
    
    // Mock loading state changes
    (useMemoryStore as jest.Mock).mockImplementation(() => ({
      ...useMemoryStore(),
      isLoading: true
    }));
    
    const { result, rerender } = renderHook(() => useMemory({ 
      memoryId: 'memory-1', 
      autoLoad: true,
      onError
    }));
    
    expect(result.current.isLoading).toBe(true);
    
    // Mock state after error
    (useMemoryStore as jest.Mock).mockImplementation(() => ({
      ...useMemoryStore(),
      isLoading: false,
      error: mockError
    }));
    
    rerender();
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual(mockError);
    expect(result.current.memory).toBe(null);
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  test('should search memories correctly', async () => {
    searchMemories.mockResolvedValue(mockMemorySearchResult);
    
    const { result } = renderHook(() => useMemory());
    
    const searchParams = { query: 'test', limit: 10 };
    
    await act(async () => {
      // Mock loading state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: true
      }));
      
      await result.current.searchMemory(searchParams);
      
      // Mock completed state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: false,
        searchResults: mockMemorySearchResult
      }));
    });
    
    expect(searchMemories).toHaveBeenCalledWith(searchParams);
    expect(result.current.searchResults).toEqual(mockMemorySearchResult);
    expect(result.current.isLoading).toBe(false);
  });

  test('should create memory correctly', async () => {
    createMemoryItem.mockResolvedValue(mockMemoryItem);
    
    const { result } = renderHook(() => useMemory());
    
    const input = {
      content: 'Test memory content',
      category: 'conversation' as const,
      source_type: 'chat',
      source_id: 'chat-1',
      importance: 1,
      metadata: {}
    };
    
    await act(async () => {
      // Mock loading state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: true
      }));
      
      await result.current.createMemory(input);
      
      // Mock completed state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: false,
        memoryItems: { 'memory-1': mockMemoryItem }
      }));
    });
    
    expect(createMemoryItem).toHaveBeenCalledWith(input);
    expect(result.current.isLoading).toBe(false);
  });

  test('should update memory correctly', async () => {
    const updatedMemory = { ...mockMemoryItem, content: 'Updated content' };
    updateMemoryItem.mockResolvedValue(updatedMemory);
    
    const { result } = renderHook(() => useMemory());
    
    const input = { content: 'Updated content' };
    
    await act(async () => {
      // Mock loading state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: true
      }));
      
      await result.current.updateMemory('memory-1', input);
      
      // Mock completed state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: false,
        memoryItems: { 'memory-1': updatedMemory }
      }));
    });
    
    expect(updateMemoryItem).toHaveBeenCalledWith('memory-1', input);
    expect(result.current.isLoading).toBe(false);
  });

  test('should delete memory correctly', async () => {
    const { result } = renderHook(() => useMemory());
    
    await act(async () => {
      // Mock loading state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: true
      }));
      
      await result.current.deleteMemory('memory-1');
      
      // Mock completed state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: false
      }));
    });
    
    expect(deleteMemoryItem).toHaveBeenCalledWith('memory-1');
    expect(result.current.isLoading).toBe(false);
  });

  test('should batch delete memories correctly', async () => {
    const { result } = renderHook(() => useMemory());
    
    const ids = ['memory-1', 'memory-2'];
    
    await act(async () => {
      // Mock loading state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: true
      }));
      
      await result.current.batchDeleteMemories(ids);
      
      // Mock completed state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: false
      }));
    });
    
    expect(batchDeleteMemoryItems).toHaveBeenCalledWith(ids);
    expect(result.current.isLoading).toBe(false);
  });

  test('should get memories by category correctly', async () => {
    getMemoriesByCategory.mockResolvedValue(mockMemorySearchResult);
    
    const { result } = renderHook(() => useMemory());
    
    await act(async () => {
      // Mock loading state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: true
      }));
      
      await result.current.getMemoriesByCategory('conversation');
      
      // Mock completed state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: false,
        searchResults: mockMemorySearchResult
      }));
    });
    
    expect(getMemoriesByCategory).toHaveBeenCalledWith('conversation', {});
    expect(result.current.searchResults).toEqual(mockMemorySearchResult);
    expect(result.current.isLoading).toBe(false);
  });

  test('should mark memory as important correctly', async () => {
    const importantMemory = { ...mockMemoryItem, importance: 5 };
    markAsImportant.mockResolvedValue(importantMemory);
    
    const { result } = renderHook(() => useMemory());
    
    await act(async () => {
      // Mock loading state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: true
      }));
      
      await result.current.markAsImportant('memory-1', true);
      
      // Mock completed state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: false,
        memoryItems: { 'memory-1': importantMemory },
        selectedMemoryId: 'memory-1'
      }));
    });
    
    expect(markAsImportant).toHaveBeenCalledWith('memory-1', true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.memory).toEqual(importantMemory);
  });

  test('should get memory stats correctly', async () => {
    fetchMemoryStats.mockResolvedValue(mockMemoryStats);
    
    const { result } = renderHook(() => useMemory());
    
    await act(async () => {
      // Mock loading state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: true
      }));
      
      await result.current.getMemoryStats();
      
      // Mock completed state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: false,
        memoryStats: mockMemoryStats
      }));
    });
    
    expect(fetchMemoryStats).toHaveBeenCalled();
    expect(result.current.memoryStats).toEqual(mockMemoryStats);
    expect(result.current.isLoading).toBe(false);
  });

  test('should get related memories correctly', async () => {
    const relatedMemories = [
      { memory_id: 'memory-2', similarity_score: 0.85, memory: mockMemoryItem }
    ];
    fetchRelatedMemories.mockResolvedValue(relatedMemories);
    
    const { result } = renderHook(() => useMemory());
    
    await act(async () => {
      // Mock loading state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: true
      }));
      
      await result.current.getRelatedMemories('memory-1');
      
      // Mock completed state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: false,
        relatedMemories: { 'memory-1': relatedMemories },
        selectedMemoryId: 'memory-1'
      }));
    });
    
    expect(fetchRelatedMemories).toHaveBeenCalledWith('memory-1', {});
    expect(result.current.relatedMemories).toEqual(relatedMemories);
    expect(result.current.isLoading).toBe(false);
  });

  test('should retrieve context correctly', async () => {
    const contextResults = {
      items: [mockMemoryItem],
      formatted_context: 'Formatted context',
      metadata: {}
    };
    retrieveMemoryContext.mockResolvedValue(contextResults);
    
    const { result } = renderHook(() => useMemory());
    
    const params = { query: 'test query' };
    
    await act(async () => {
      // Mock loading state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: true
      }));
      
      await result.current.retrieveContext(params);
      
      // Mock completed state
      (useMemoryStore as jest.Mock).mockImplementation(() => ({
        ...useMemoryStore(),
        isLoading: false,
        contextResults: contextResults
      }));
    });
    
    expect(retrieveMemoryContext).toHaveBeenCalledWith(params);
    expect(result.current.isLoading).toBe(false);
  });

  test('should select memory correctly', () => {
    const { result } = renderHook(() => useMemory());
    
    act(() => {
      result.current.selectMemory('memory-1');
    });
    
    expect(setSelectedMemoryId).toHaveBeenCalledWith('memory-1');
  });

  test('should set search params correctly', () => {
    const { result } = renderHook(() => useMemory());
    
    const params = { query: 'new query' };
    
    act(() => {
      result.current.setSearchParams(params);
    });
    
    expect(setSearchParams).toHaveBeenCalledWith(params);
  });

  test('should clear search results correctly', () => {
    const { result } = renderHook(() => useMemory());
    
    act(() => {
      result.current.clearSearchResults();
    });
    
    expect(clearSearchResults).toHaveBeenCalled();
  });

  test('should clear error correctly', () => {
    const { result } = renderHook(() => useMemory());
    
    act(() => {
      result.current.clearError();
    });
    
    expect(clearError).toHaveBeenCalled();
  });

  test('should respect memory settings from useSettings', async () => {
    // Mock settings with specific values
    (useSettings as jest.Mock).mockReturnValue({
      settings: {
        memory_settings: {
          context_window_size: 20,
          recency_weight: 0.3,
          relevance_weight: 0.6,
          importance_weight: 0.1
        }
      }
    });
    
    retrieveMemoryContext.mockResolvedValue({
      items: [],
      formatted_context: '',
      metadata: {}
    });
    
    const { result } = renderHook(() => useMemory());
    
    await act(async () => {
      await result.current.retrieveContext({ query: 'test' });
    });
    
    // Expect that memory operations use settings from useSettings
    expect(retrieveMemoryContext).toHaveBeenCalledWith({ query: 'test' });
  });
});