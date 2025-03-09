import React from 'react';
import styled from 'styled-components'; // styled-components version ^5.3.10

import RecentConversations from './RecentConversations';
import QuickActions from './QuickActions';
import MemoryHighlights from './MemoryHighlights';
import SystemStatus from './SystemStatus';
import useTheme from '../../hooks/useTheme';
import useMediaQuery from '../../hooks/useMediaQuery';
import { SPACING } from '../../constants/uiConstants'; // UI constants for consistent spacing

// Styled container for the entire dashboard with responsive width and padding
const DashboardContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: ${SPACING.LG};
`;

// Responsive grid layout for dashboard sections that adapts to screen size
const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: ${SPACING.LG};

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 768px) {
    gap: ${SPACING.LG};
  }
`;

// Left column for main content (recent conversations and quick actions)
const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.LG};
`;

// Right column for sidebar content (memory highlights and system status)
const SideColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.LG};
`;

// Section title styling for dashboard headings
const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 ${SPACING.LG} 0;
`;

// Container for sections that only appear on mobile layouts
const MobileOnlySection = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    margin-bottom: ${SPACING.LG};
  }
`;

/**
 * Main dashboard component that displays an overview of the application's key features
 * @returns Rendered dashboard component
 */
const Dashboard: React.FC = () => {
  // Access the current theme using useTheme hook
  const { theme } = useTheme();

  // Use useMediaQuery to determine screen size for responsive layout
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <DashboardContainer>
      <DashboardGrid>
        <MainColumn>
          <RecentConversations />
          <QuickActions />
        </MainColumn>
        <SideColumn>
          <MemoryHighlights />
          <SystemStatus />
        </SideColumn>
      </DashboardGrid>
    </DashboardContainer>
  );
};

export default Dashboard;