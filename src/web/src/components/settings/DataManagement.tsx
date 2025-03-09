import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import useSettings from '../../hooks/useSettings';
import useTheme from '../../hooks/useTheme';
import { SPACING } from '../../constants/uiConstants';
import { ButtonVariant } from '../../types/ui';
import { 
  clearAllData, 
  exportData, 
  importData, 
  getDatabaseSize,
} from '../../services/storageService';
import { getMemoryStats } from '../../services/memoryService';

// Interfaces
interface ConfirmationState {
  deleteConfirmOpen: boolean;
  importConfirmOpen: boolean;
  exportOptionsOpen: boolean;
}

interface ExportOptions {
  includeSettings: boolean;
  includeConversations: boolean;
  includeMemory: boolean;
  includeDocuments: boolean;
}

interface ImportOptions {
  clearExisting: boolean;
}

interface MemoryStatsData {
  totalMemoryItems: number;
  conversationMemories: number;
  documentMemories: number;
  webMemories: number;
  importantMemories: number;
}

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.LG};
`;

const Section = styled.div`
  margin-bottom: ${SPACING.LG};
`;

const SectionTitle = styled.h3`
  margin-bottom: ${SPACING.MD};
  font-size: 1.1rem;
  color: ${props => props.theme.colors.text.primary};
`;

const SectionDescription = styled.p`
  margin-bottom: ${SPACING.MD};
  color: ${props => props.theme.colors.text.secondary};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${SPACING.MD};
  margin-top: ${SPACING.MD};
`;

const StatsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
  margin-bottom: ${SPACING.LG};
`;

const StatItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${SPACING.MD};
  background-color: ${props => props.theme.colors.background.default};
  border-radius: 4px;
`;

const StatLabel = styled.span`
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
`;

const StatValue = styled.span`
  color: ${props => props.theme.colors.text.secondary};
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${SPACING.MD};
`;

const CheckboxLabel = styled.label`
  margin-left: ${SPACING.MD};
  color: ${props => props.theme.colors.text.primary};
`;

const WarningText = styled.p`
  color: ${props => props.theme.colors.error.main};
  margin-top: ${SPACING.MD};
  font-weight: 500;
`;

const HiddenInput = styled.input`
  display: none;
`;

/**
 * Data Management component that provides functionality for exporting, importing,
 * and deleting user data with clear privacy controls in the Personal AI Agent app.
 */
const DataManagement: React.FC = () => {
  // State for database size and memory statistics
  const [databaseSize, setDatabaseSize] = useState<number>(0);
  const [memoryStats, setMemoryStats] = useState<MemoryStatsData>({
    totalMemoryItems: 0,
    conversationMemories: 0,
    documentMemories: 0,
    webMemories: 0,
    importantMemories: 0
  });

  // State for confirmation modals
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>({
    deleteConfirmOpen: false,
    importConfirmOpen: false,
    exportOptionsOpen: false
  });

  // State for export and import options
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeSettings: true,
    includeConversations: true,
    includeMemory: true,
    includeDocuments: true
  });

  const [importOptions, setImportOptions] = useState<ImportOptions>({
    clearExisting: false
  });

  // File input ref for importing data
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Theme and settings hooks
  const { theme } = useTheme();
  const { resetToDefaults } = useSettings();

  // Fetch data stats on component mount
  useEffect(() => {
    fetchDataStats();
  }, []);

  // Fetch database size and memory statistics
  const fetchDataStats = async () => {
    try {
      // Get database size
      const size = await getDatabaseSize();
      setDatabaseSize(size);

      // Get memory statistics
      const stats = await getMemoryStats();
      setMemoryStats({
        totalMemoryItems: stats.total_count,
        conversationMemories: stats.category_counts.conversation || 0,
        documentMemories: stats.category_counts.document || 0,
        webMemories: stats.category_counts.web || 0,
        importantMemories: stats.category_counts.important || 0
      });
    } catch (error) {
      console.error('Failed to fetch data statistics:', error);
    }
  };

  // Handle exporting data
  const handleExportData = async () => {
    try {
      setIsLoading(true);
      
      // Generate data export based on selected options
      const exportedData = await exportData(
        exportOptions.includeSettings,
        exportOptions.includeConversations,
        exportOptions.includeMemory,
        exportOptions.includeDocuments
      );
      
      // Create download link
      const blob = new Blob([exportedData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `personal_ai_agent_export_${date}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Close the modal and reset loading state
      setConfirmationState(prev => ({ ...prev, exportOptionsOpen: false }));
      setIsLoading(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      setIsLoading(false);
    }
  };

  // Handle importing data
  const handleImportData = async () => {
    try {
      setIsLoading(true);
      
      // Get the selected file
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        setIsLoading(false);
        return;
      }
      
      // Read file contents
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as string;
          
          // Import the data
          await importData(fileContent, importOptions.clearExisting);
          
          // Refresh stats
          await fetchDataStats();
          
          // Reset state
          setConfirmationState(prev => ({ ...prev, importConfirmOpen: false }));
          setIsLoading(false);
          
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (error) {
          console.error('Error processing import file:', error);
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        console.error('Error reading file');
        setIsLoading(false);
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing data:', error);
      setIsLoading(false);
    }
  };

  // Handle deleting all data
  const handleDeleteAllData = async () => {
    try {
      setIsLoading(true);
      
      // Clear all data
      await clearAllData();
      
      // Reset settings to defaults
      await resetToDefaults();
      
      // Refresh stats
      await fetchDataStats();
      
      // Close modal and reset loading state
      setConfirmationState(prev => ({ ...prev, deleteConfirmOpen: false }));
      setIsLoading(false);
    } catch (error) {
      console.error('Error deleting data:', error);
      setIsLoading(false);
    }
  };

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is JSON
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        alert('Please select a valid JSON file');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Open confirmation modal
      setConfirmationState(prev => ({ ...prev, importConfirmOpen: true }));
    }
  };

  // Open file selection dialog
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  // Format byte size to human-readable format
  const formatSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
  };

  return (
    <Container>
      {/* Data Statistics */}
      <Section>
        <SectionTitle>Data Statistics</SectionTitle>
        <StatsContainer>
          <StatItem>
            <StatLabel>Total Database Size:</StatLabel>
            <StatValue>{formatSize(databaseSize)}</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Total Memory Items:</StatLabel>
            <StatValue>{memoryStats.totalMemoryItems}</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Conversation Memories:</StatLabel>
            <StatValue>{memoryStats.conversationMemories}</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Document Memories:</StatLabel>
            <StatValue>{memoryStats.documentMemories}</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Web Memories:</StatLabel>
            <StatValue>{memoryStats.webMemories}</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Important Memories:</StatLabel>
            <StatValue>{memoryStats.importantMemories}</StatValue>
          </StatItem>
        </StatsContainer>
      </Section>

      {/* Export Data */}
      <Card title="Export Your Data">
        <SectionDescription>
          Export all your data for backup or to transfer to another device. 
          Your exported data is saved as a JSON file that contains only the data you select below.
        </SectionDescription>
        <Button
          variant={ButtonVariant.PRIMARY}
          onClick={() => setConfirmationState(prev => ({ ...prev, exportOptionsOpen: true }))}
          disabled={isLoading}
        >
          Export Data
        </Button>
      </Card>

      {/* Import Data */}
      <Card title="Import Data">
        <SectionDescription>
          Import a previously exported data file. This will add the imported data to your 
          existing data unless you choose to clear existing data first.
        </SectionDescription>
        <Button
          variant={ButtonVariant.SECONDARY}
          onClick={openFileSelector}
          disabled={isLoading}
        >
          Select Import File
        </Button>
        <HiddenInput
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFileInputChange}
        />
      </Card>

      {/* Delete All Data */}
      <Card title="Delete All Data">
        <SectionDescription>
          Permanently delete all your data from this device. This action cannot be undone.
        </SectionDescription>
        <WarningText>
          Warning: This will permanently erase all your conversations, memories, and settings.
        </WarningText>
        <Button
          variant={ButtonVariant.OUTLINED}
          onClick={() => setConfirmationState(prev => ({ ...prev, deleteConfirmOpen: true }))}
          disabled={isLoading}
        >
          Delete All Data
        </Button>
      </Card>

      {/* Delete All Data Confirmation Modal */}
      <Modal
        isOpen={confirmationState.deleteConfirmOpen}
        onClose={() => setConfirmationState(prev => ({ ...prev, deleteConfirmOpen: false }))}
        title="Delete All Data"
        size="small"
      >
        <WarningText>
          Are you sure you want to delete all your data? This action cannot be undone.
        </WarningText>
        <ButtonGroup>
          <Button
            variant={ButtonVariant.OUTLINED}
            onClick={() => setConfirmationState(prev => ({ ...prev, deleteConfirmOpen: false }))}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handleDeleteAllData}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete Everything'}
          </Button>
        </ButtonGroup>
      </Modal>

      {/* Import Confirmation Modal */}
      <Modal
        isOpen={confirmationState.importConfirmOpen}
        onClose={() => setConfirmationState(prev => ({ ...prev, importConfirmOpen: false }))}
        title="Import Data"
        size="small"
      >
        <SectionDescription>
          You're about to import data from the selected file. How would you like to proceed?
        </SectionDescription>
        <CheckboxContainer>
          <input
            type="checkbox"
            id="clear-existing"
            checked={importOptions.clearExisting}
            onChange={e => setImportOptions(prev => ({ ...prev, clearExisting: e.target.checked }))}
          />
          <CheckboxLabel htmlFor="clear-existing">
            Clear existing data before importing
          </CheckboxLabel>
        </CheckboxContainer>
        {importOptions.clearExisting && (
          <WarningText>
            Warning: This will delete all your existing data before importing.
          </WarningText>
        )}
        <ButtonGroup>
          <Button
            variant={ButtonVariant.OUTLINED}
            onClick={() => setConfirmationState(prev => ({ ...prev, importConfirmOpen: false }))}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handleImportData}
            disabled={isLoading}
          >
            {isLoading ? 'Importing...' : 'Import Data'}
          </Button>
        </ButtonGroup>
      </Modal>

      {/* Export Options Modal */}
      <Modal
        isOpen={confirmationState.exportOptionsOpen}
        onClose={() => setConfirmationState(prev => ({ ...prev, exportOptionsOpen: false }))}
        title="Export Options"
        size="small"
      >
        <SectionDescription>
          Select which data you would like to include in your export:
        </SectionDescription>
        <CheckboxContainer>
          <input
            type="checkbox"
            id="include-settings"
            checked={exportOptions.includeSettings}
            onChange={e => setExportOptions(prev => ({ ...prev, includeSettings: e.target.checked }))}
          />
          <CheckboxLabel htmlFor="include-settings">
            Include Settings
          </CheckboxLabel>
        </CheckboxContainer>
        <CheckboxContainer>
          <input
            type="checkbox"
            id="include-conversations"
            checked={exportOptions.includeConversations}
            onChange={e => setExportOptions(prev => ({ ...prev, includeConversations: e.target.checked }))}
          />
          <CheckboxLabel htmlFor="include-conversations">
            Include Conversations
          </CheckboxLabel>
        </CheckboxContainer>
        <CheckboxContainer>
          <input
            type="checkbox"
            id="include-memory"
            checked={exportOptions.includeMemory}
            onChange={e => setExportOptions(prev => ({ ...prev, includeMemory: e.target.checked }))}
          />
          <CheckboxLabel htmlFor="include-memory">
            Include Memory Items
          </CheckboxLabel>
        </CheckboxContainer>
        <CheckboxContainer>
          <input
            type="checkbox"
            id="include-documents"
            checked={exportOptions.includeDocuments}
            onChange={e => setExportOptions(prev => ({ ...prev, includeDocuments: e.target.checked }))}
          />
          <CheckboxLabel htmlFor="include-documents">
            Include Documents
          </CheckboxLabel>
        </CheckboxContainer>
        <ButtonGroup>
          <Button
            variant={ButtonVariant.OUTLINED}
            onClick={() => setConfirmationState(prev => ({ ...prev, exportOptionsOpen: false }))}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handleExportData}
            disabled={isLoading || 
              !(exportOptions.includeSettings || 
                exportOptions.includeConversations || 
                exportOptions.includeMemory || 
                exportOptions.includeDocuments)}
          >
            {isLoading ? 'Exporting...' : 'Export Data'}
          </Button>
        </ButtonGroup>
      </Modal>
    </Container>
  );
};

export default DataManagement;