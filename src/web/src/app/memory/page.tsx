import React from 'react'; // React v18.2.0
import { Metadata } from 'next'; // next v14.0.0
import styled from 'styled-components'; // styled-components v5.3.10

import MemoryBrowser from '../../components/memory/MemoryBrowser';
import useMemory from '../../hooks/useMemory';
import useSettingsStore from '../../store/settingsStore';

/**
 * Defines metadata for the memory page including title and description
 */
export const metadata = {
  title: 'Memory Management - Personal AI Agent',
  description: 'Browse and manage your AI assistant\'s memories',
};

/**
 * Page component that renders the memory management interface
 */
const MemoryPage: React.FC = () => {
  // Access memory-related settings from useSettingsStore
  const { settings } = useSettingsStore();

  // Initialize the useMemory hook to access memory operations
  const { getMemoryStats } = useMemory();

  // Render the PageContainer with appropriate styling
  return (
    <PageContainer>
      {/* Render the PageHeader with title and description */}
      <PageHeader>
        <PageTitle>Memory Management</PageTitle>
        <PageDescription>
          Browse, search, and manage your AI assistant's memories.
        </PageDescription>
      </PageHeader>

      {/* Render the MemoryBrowser component as the main content */}
      <ContentContainer>
        <MemoryBrowser />
      </ContentContainer>
    </PageContainer>
  );
};

// Styled container for the memory page with appropriate spacing and layout
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 1rem;
  overflow: hidden;
  background-color: ${props => props.theme.colors.background.default};
`;

// Styled header for the memory page with title and description
const PageHeader = styled.div`
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border.main};
`;

// Styled title for the memory page
const PageTitle = styled.h1`
  font-size: ${props => props.theme.typography.h4.fontSize};
  font-weight: ${props => props.theme.typography.h4.fontWeight};
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
`;

// Styled description text for the memory page
const PageDescription = styled.p`
  font-size: ${props => props.theme.typography.body2.fontSize};
  color: ${props => props.theme.colors.text.secondary};
  margin: 0;
`;

// Styled container for the main content area
const ContentContainer = styled.div`
  flex: 1;
  overflow: hidden;
  border-radius: ${props => props.theme.borderRadius.medium};
  border: 1px solid ${props => props.theme.colors.border.main};
  background-color: ${props => props.theme.colors.background.paper};
`;

export default MemoryPage;