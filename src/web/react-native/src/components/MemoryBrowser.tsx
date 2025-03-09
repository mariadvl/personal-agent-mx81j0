import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  ActivityIndicator, 
  StyleSheet, 
  Modal,
  Alert,
  useWindowDimensions,
  Animated
} from 'react-native';
import { ChevronLeft, Filter, Search, Trash } from 'react-native-feather';
import { useNavigation } from '@react-navigation/native';

// Internal imports
import theme from '../theme/theme';
import { get, post, delete as deleteRequest, API_BASE_URL } from '../services/api';

// Interfaces
export interface MemoryBrowserProps {
  navigation: any;
  memoryId?: string;
  initialCategory?: string;
  onMemorySelect?: (memory: any) => void;
}

interface MemoryItem {
  id: string;
  created_at: string;
  content: string;
  category: string;
  source_type: string | null;
  source_id: string | null;
  importance: number;
  metadata: Record<string, any>;
}

interface MemorySearchResult {
  results: MemoryItem[];
  total: number;
  limit: number;
  offset: number;
  metadata: Record<string, any> | undefined;
}

interface MemoryStats {
  total_count: number;
  category_counts: Record<string, number>;
  storage_size: number;
  oldest_memory: string;
  newest_memory: string;
}

/**
 * Component that provides a mobile-optimized interface for browsing and managing memory items
 */
const MemoryBrowser: React.FC<MemoryBrowserProps> = ({ 
  navigation,
  memoryId,
  initialCategory,
  onMemorySelect
}) => {
  // State for selected category
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  
  // State for search query
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // State for memory items
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  
  // State for selected memory for detail view
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);
  
  // State for loading status
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // State for confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    message: '',
    onConfirm: () => {}
  });
  
  // Memory stats
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  
  // Window dimensions for responsive layout
  const { width } = useWindowDimensions();
  
  // Animation values
  const listPosition = useState(new Animated.Value(0))[0];
  const detailPosition = useState(new Animated.Value(width))[0];
  const listOpacity = useState(new Animated.Value(1))[0];
  const detailOpacity = useState(new Animated.Value(0))[0];

  // Fetch memories from API
  const fetchMemories = useCallback(async (category: string = 'all', query: string = '') => {
    setIsLoading(true);
    try {
      let endpoint = '/memory/search';
      const params: Record<string, any> = {
        limit: 50,
        offset: 0
      };
      
      if (category !== 'all') {
        params.category = category;
      }
      
      if (query) {
        params.query = query;
      }
      
      const response = await get<MemorySearchResult>(endpoint, params);
      
      if (response.success && response.data) {
        setMemories(response.data.results);
      } else {
        setMemories([]);
        console.error('Failed to fetch memories:', response.error);
      }
    } catch (error) {
      console.error('Error fetching memories:', error);
      setMemories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle search
  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    fetchMemories(selectedCategory, text);
  }, [selectedCategory, fetchMemories]);

  // Handle category change
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    fetchMemories(category, searchQuery);
  }, [searchQuery, fetchMemories]);

  // Handle memory selection
  const handleMemorySelect = useCallback((memory: MemoryItem) => {
    setSelectedMemory(memory);
    
    // Animate transition to detail view
    Animated.parallel([
      Animated.timing(listPosition, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(detailPosition, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(listOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(detailOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
    
    // Call onMemorySelect prop if provided
    if (onMemorySelect) {
      onMemorySelect(memory);
    }
  }, [width, listPosition, detailPosition, listOpacity, detailOpacity, onMemorySelect]);

  // Handle back from detail view
  const handleBackToList = useCallback(() => {
    // Animate transition back to list view
    Animated.parallel([
      Animated.timing(listPosition, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(detailPosition, {
        toValue: width,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(detailOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      setSelectedMemory(null);
    });
  }, [width, listPosition, detailPosition, listOpacity, detailOpacity]);

  // Handle memory deletion
  const handleMemoryDelete = useCallback((memory: MemoryItem) => {
    setConfirmDialog({
      visible: true,
      message: `Are you sure you want to delete this memory? This action cannot be undone.`,
      onConfirm: () => handleDeleteConfirm(memory.id)
    });
  }, []);

  // Confirm and execute memory deletion
  const handleDeleteConfirm = useCallback(async (memoryId: string) => {
    setConfirmDialog(prev => ({ ...prev, visible: false }));
    setIsLoading(true);
    
    try {
      const response = await deleteRequest(`/memory/${memoryId}`);
      
      if (response.success) {
        if (selectedMemory && selectedMemory.id === memoryId) {
          handleBackToList();
        }
        
        // Refresh memory list
        fetchMemories(selectedCategory, searchQuery);
        
        // Fetch updated memory stats
        getMemoryStats();
      } else {
        Alert.alert('Error', 'Failed to delete memory. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting memory:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMemory, handleBackToList, selectedCategory, searchQuery, fetchMemories]);

  // Get memory statistics
  const getMemoryStats = useCallback(async () => {
    try {
      const response = await get<MemoryStats>('/memory/stats');
      
      if (response.success && response.data) {
        setMemoryStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching memory stats:', error);
    }
  }, []);

  // Format memory stats for display
  const formattedMemoryStats = useMemo(() => {
    if (!memoryStats) return '';
    
    const sizeInMB = (memoryStats.storage_size / (1024 * 1024)).toFixed(2);
    return `${memoryStats.total_count} items • ${sizeInMB} MB`;
  }, [memoryStats]);

  // Load memories on mount
  useEffect(() => {
    fetchMemories(selectedCategory, searchQuery);
    getMemoryStats();
  }, []);

  // Load specific memory if memoryId is provided
  useEffect(() => {
    if (memoryId) {
      const fetchMemoryById = async () => {
        try {
          const response = await get<MemoryItem>(`/memory/${memoryId}`);
          
          if (response.success && response.data) {
            handleMemorySelect(response.data);
          }
        } catch (error) {
          console.error('Error fetching memory by ID:', error);
        }
      };
      
      fetchMemoryById();
    }
  }, [memoryId]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search width={20} height={20} color={theme.colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search memories..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor={theme.colors.text.secondary}
          returnKeyType="search"
        />
      </View>
      
      {/* Category Filter */}
      {renderCategoryFilter({ 
        selectedCategory, 
        onCategoryChange: handleCategoryChange 
      })}
      
      {/* Memory List */}
      <Animated.View 
        style={[
          styles.memoryList,
          { 
            transform: [{ translateX: listPosition }],
            opacity: listOpacity
          }
        ]}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
          </View>
        ) : memories.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={memories}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => renderMemoryItem({ 
              item, 
              index, 
              handleSelect: handleMemorySelect,
              handleDelete: handleMemoryDelete
            })}
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
      
      {/* Memory Detail View */}
      <Animated.View 
        style={[
          styles.detailContainer,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateX: detailPosition }],
            opacity: detailOpacity,
            zIndex: selectedMemory ? 1 : -1
          }
        ]}
      >
        {selectedMemory && renderMemoryDetail({
          memory: selectedMemory,
          onBack: handleBackToList,
          onDelete: () => handleMemoryDelete(selectedMemory)
        })}
      </Animated.View>
      
      {/* Memory Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText} numberOfLines={1}>
          {memoryStats ? formattedMemoryStats : 'Loading stats...'}
        </Text>
        <Text style={styles.statsText}>
          {theme.colors.privacy.local ? 'Local Only' : 'Synced'}
        </Text>
      </View>
      
      {/* Confirmation Dialog */}
      {renderConfirmationDialog({
        visible: confirmDialog.visible,
        message: confirmDialog.message,
        onConfirm: confirmDialog.onConfirm,
        onCancel: () => setConfirmDialog(prev => ({ ...prev, visible: false }))
      })}
    </View>
  );
};

/**
 * Renders an individual memory item in the list
 */
const renderMemoryItem = ({ 
  item, 
  index, 
  handleSelect, 
  handleDelete 
}: { 
  item: MemoryItem; 
  index: number; 
  handleSelect: (memory: MemoryItem) => void;
  handleDelete: (memory: MemoryItem) => void;
}) => {
  // Format date
  const date = new Date(item.created_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  // Get category icon
  const getCategoryIcon = () => {
    // This would be replaced with actual icons based on category
    return null;
  };
  
  return (
    <TouchableOpacity 
      style={styles.memoryItem}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <Text 
        style={styles.memoryItemContent} 
        numberOfLines={2}
      >
        {item.content}
      </Text>
      
      <View style={styles.memoryItemMeta}>
        <Text style={styles.memoryItemDate}>{formattedDate}</Text>
        <Text style={styles.memoryItemCategory}>{item.category}</Text>
      </View>
      
      {/* Swipe action would be implemented here for delete functionality */}
    </TouchableOpacity>
  );
};

/**
 * Renders the detailed view of a selected memory item
 */
const renderMemoryDetail = ({ 
  memory, 
  onBack, 
  onDelete 
}: { 
  memory: MemoryItem; 
  onBack: () => void;
  onDelete: () => void;
}) => {
  // Format date
  const date = new Date(memory.created_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  return (
    <View style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <ChevronLeft width={24} height={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text 
          style={{ 
            marginLeft: theme.spacing.md, 
            fontSize: theme.typography.h6.fontSize, 
            fontWeight: 'bold',
            color: theme.colors.text.primary 
          }}
        >
          Memory Detail
        </Text>
      </View>
      
      <View style={styles.detailContent}>
        <View style={{ flexDirection: 'row', marginBottom: theme.spacing.md }}>
          <Text style={styles.memoryItemCategory}>{memory.category}</Text>
        </View>
        
        <Text style={styles.detailText}>{memory.content}</Text>
        
        <View style={styles.detailMeta}>
          <Text style={{ color: theme.colors.text.secondary }}>
            Created on {formattedDate}
          </Text>
          
          {memory.source_type && (
            <Text style={{ color: theme.colors.text.secondary, marginTop: theme.spacing.xs }}>
              Source: {memory.source_type} {memory.source_id ? `(${memory.source_id})` : ''}
            </Text>
          )}
        </View>
        
        <View style={styles.detailActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={onDelete}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

/**
 * Renders the category filter buttons
 */
const renderCategoryFilter = ({ 
  selectedCategory, 
  onCategoryChange 
}: { 
  selectedCategory: string; 
  onCategoryChange: (category: string) => void;
}) => {
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'conversation', label: 'Conversations' },
    { id: 'document', label: 'Documents' },
    { id: 'web', label: 'Web' },
    { id: 'important', label: 'Important' }
  ];
  
  return (
    <View style={{ marginBottom: theme.spacing.sm }}>
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory === item.id && styles.categoryButtonActive
            ]}
            onPress={() => onCategoryChange(item.id)}
          >
            <Filter 
              width={14} 
              height={14} 
              color={selectedCategory === item.id 
                ? theme.colors.primary.contrastText 
                : theme.colors.text.primary} 
            />
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === item.id && styles.categoryButtonTextActive
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md }}
      />
    </View>
  );
};

/**
 * Renders an empty state when no memories are found
 */
const renderEmptyState = () => {
  return (
    <View style={styles.emptyContainer}>
      <Search width={48} height={48} color={theme.colors.text.secondary} />
      <Text style={styles.emptyText}>
        No memories found. Try a different search or category.
      </Text>
    </View>
  );
};

/**
 * Renders a confirmation dialog for delete actions
 */
const renderConfirmationDialog = ({ 
  visible, 
  message, 
  onConfirm, 
  onCancel 
}: { 
  visible: boolean; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void;
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={{ 
            color: theme.colors.text.primary, 
            fontSize: theme.typography.body1.fontSize,
            marginBottom: theme.spacing.md 
          }}>
            {message}
          </Text>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.background.paper }]}
              onPress={onCancel}
            >
              <Text style={{ 
                color: theme.colors.text.primary, 
                fontWeight: 'bold' 
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={onConfirm}
            >
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.paper,
    borderRadius: 8,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: theme.spacing.sm,
    color: theme.colors.text.primary,
    fontSize: theme.typography.body1.fontSize,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.sm,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.paper,
    elevation: 1,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.primary.main,
  },
  categoryButtonText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.typography.body2.fontSize,
    color: theme.colors.text.primary,
  },
  categoryButtonTextActive: {
    color: theme.colors.primary.contrastText,
  },
  memoryList: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  memoryItem: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: 8,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    elevation: 1,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  memoryItemContent: {
    fontSize: theme.typography.body1.fontSize,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  memoryItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  memoryItemDate: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  memoryItemCategory: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    backgroundColor: theme.colors.background.default,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.paper,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.main,
  },
  detailContent: {
    padding: theme.spacing.md,
    flex: 1,
  },
  detailText: {
    fontSize: theme.typography.body1.fontSize,
    color: theme.colors.text.primary,
    lineHeight: 24,
  },
  detailMeta: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.main,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.main,
  },
  actionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 4,
    marginLeft: theme.spacing.sm,
  },
  deleteButton: {
    backgroundColor: theme.colors.error.main,
  },
  buttonText: {
    color: theme.colors.primary.contrastText,
    fontSize: theme.typography.button.fontSize,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.typography.body1.fontSize,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    padding: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.main,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: 8,
    padding: theme.spacing.lg,
    width: '80%',
    elevation: 5,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
  },
});

export default MemoryBrowser;