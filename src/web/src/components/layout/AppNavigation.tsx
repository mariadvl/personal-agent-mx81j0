import React from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  FiHome, 
  FiMessageSquare, 
  FiFile, 
  FiGlobe, 
  FiSettings,
  FiChevronLeft,
  FiChevronRight 
} from 'react-icons/fi';

import Button from '../ui/Button';
import useTheme from '../../hooks/useTheme';
import { useUIStore } from '../../store/uiStore';
import { 
  SIDEBAR_WIDTH, 
  Z_INDEX, 
  SPACING, 
  TRANSITION,
  BREAKPOINTS 
} from '../../constants/uiConstants';
import { ButtonVariant } from '../../types/ui';

// Interface for navigation item data
interface NavItemType {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

// Navigation items array
const NAV_ITEMS: NavItemType[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: <FiHome />
  },
  {
    id: 'chat',
    label: 'Chat',
    path: '/chat',
    icon: <FiMessageSquare />
  },
  {
    id: 'files',
    label: 'Files',
    path: '/files',
    icon: <FiFile />
  },
  {
    id: 'web',
    label: 'Web',
    path: '/web',
    icon: <FiGlobe />
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: <FiSettings />
  }
];

// Styled components
const SidebarContainer = styled.nav<{ isOpen: boolean; theme: any }>`
  position: fixed;
  top: 64px;
  left: 0;
  height: calc(100vh - 64px);
  width: ${props => props.isOpen ? SIDEBAR_WIDTH.EXPANDED : SIDEBAR_WIDTH.COLLAPSED};
  background-color: ${props => props.theme.colors.background.paper};
  box-shadow: ${props => props.theme.shadows.small};
  z-index: ${Z_INDEX.DROPDOWN};
  transition: ${TRANSITION.DEFAULT};
  display: flex;
  flex-direction: column;
  padding: ${SPACING.MD} 0;
  overflow-x: hidden;
  overflow-y: auto;
  
  @media (max-width: ${BREAKPOINTS.MOBILE}) {
    display: none;
  }
`;

const NavItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
  padding: 0 ${SPACING.MD};
  margin-bottom: ${SPACING.MD};
`;

const NavItem = styled.div<{ isActive: boolean; theme: any }>`
  display: flex;
  align-items: center;
  width: 100%;
  height: 40px;
  border-radius: 8px;
  padding: 0 ${SPACING.MD};
  cursor: pointer;
  transition: ${TRANSITION.DEFAULT};
  color: ${props => props.isActive ? props.theme.colors.primary.main : props.theme.colors.text.primary};
  background-color: ${props => props.isActive ? props.theme.colors.action.selected : 'transparent'};
  
  &:hover {
    background-color: ${props => props.theme.colors.action.hover};
  }
`;

const NavItemIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  min-width: 24px;
`;

const NavItemLabel = styled.span<{ isVisible: boolean }>`
  margin-left: ${SPACING.MD};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: ${props => props.isVisible ? 1 : 0};
  transition: opacity 0.2s ease-in-out;
  max-width: ${SIDEBAR_WIDTH.EXPANDED - 80}px;
`;

const ToggleButton = styled.button<{ isOpen: boolean; theme: any }>`
  position: absolute;
  bottom: ${SPACING.MD};
  left: ${props => props.isOpen ? 'calc(100% - 28px)' : 'calc(100% - 14px)'};
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.background.paper};
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid ${props => props.theme.colors.divider};
  transition: ${TRANSITION.DEFAULT};
  z-index: ${Z_INDEX.DROPDOWN + 1};
  
  &:hover {
    background-color: ${props => props.theme.colors.action.hover};
  }
`;

/**
 * Renders the sidebar navigation with links to main application sections
 * @returns The rendered navigation sidebar component
 */
const AppNavigation = (): JSX.Element => {
  const { theme } = useTheme();
  const { isSidebarOpen, setSidebarOpen, activeTab, setActiveTab } = useUIStore();
  const router = useRouter();
  
  /**
   * Handles navigation item click
   * @param item - The navigation item that was clicked
   */
  const handleNavItemClick = (item: NavItemType) => {
    setActiveTab(item.id);
  };
  
  /**
   * Toggles sidebar between expanded and collapsed states
   */
  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };
  
  return (
    <SidebarContainer isOpen={isSidebarOpen} theme={theme}>
      <NavItemContainer>
        {NAV_ITEMS.map(item => (
          <Link href={item.path} key={item.id}>
            <NavItem 
              isActive={activeTab === item.id}
              theme={theme}
              onClick={() => handleNavItemClick(item)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              role="button"
              tabIndex={0}
            >
              <NavItemIcon>{item.icon}</NavItemIcon>
              <NavItemLabel isVisible={isSidebarOpen}>{item.label}</NavItemLabel>
            </NavItem>
          </Link>
        ))}
      </NavItemContainer>
      
      <ToggleButton 
        isOpen={isSidebarOpen} 
        theme={theme} 
        onClick={toggleSidebar}
        aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={isSidebarOpen}
      >
        {isSidebarOpen ? <FiChevronLeft /> : <FiChevronRight />}
      </ToggleButton>
    </SidebarContainer>
  );
};

export default AppNavigation;