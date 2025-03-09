import React from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { FiMenu, FiX, FiSun, FiMoon, FiHelpCircle, FiUser } from 'react-icons/fi';

import Button from '../ui/Button';
import useTheme from '../../hooks/useTheme';
import useUIStore from '../../store/uiStore';
import { 
  SPACING, 
  Z_INDEX, 
  TRANSITION, 
  BREAKPOINTS 
} from '../../constants/uiConstants';

const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${SPACING.MD};
  height: 64px;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: ${Z_INDEX.DROPDOWN};
  background-color: ${props => props.theme.colors.background.paper};
  box-shadow: ${props => props.theme.shadows.small};
  transition: ${TRANSITION.DEFAULT};
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${SPACING.MD};
`;

const AppTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
  
  @media (max-width: ${BREAKPOINTS.MOBILE}) {
    display: none;
  }
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${SPACING.MD};
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.theme.colors.text.primary};
  font-size: 1.5rem;
  padding: ${SPACING.MD};
  margin: 0;
  
  @media (max-width: ${BREAKPOINTS.MOBILE}) {
    display: flex;
  }
`;

/**
 * Renders the application header with navigation controls, theme toggle, and user profile access
 */
const AppHeader = (): JSX.Element => {
  const { theme, toggleTheme } = useTheme();
  const { 
    isSidebarOpen, 
    setSidebarOpen,
    isMobileMenuOpen,
    toggleMobileMenu
  } = useUIStore();
  
  // Determine if we're in dark mode by checking the background color
  const isDarkMode = theme.colors.background.default === '#1E272E';

  return (
    <HeaderContainer>
      <LogoContainer>
        <Link href="/" aria-label="Home">
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 32 32" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ cursor: 'pointer' }}
          >
            <circle cx="16" cy="16" r="15" fill={theme.colors.primary.main} />
            <path
              d="M10 16.5L14 20.5L22 12.5"
              stroke={theme.colors.primary.contrastText}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <AppTitle>Personal AI Agent</AppTitle>
      </LogoContainer>
      
      <ActionContainer>
        <MobileMenuButton 
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <FiX /> : <FiMenu />}
        </MobileMenuButton>
        
        <Button 
          variant="icon" 
          onClick={toggleTheme}
          aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
        >
          {isDarkMode ? <FiSun /> : <FiMoon />}
        </Button>
        
        <Button 
          variant="icon" 
          aria-label="Help"
        >
          <FiHelpCircle />
        </Button>
        
        <Button 
          variant="icon" 
          aria-label="User profile"
        >
          <FiUser />
        </Button>
      </ActionContainer>
    </HeaderContainer>
  );
};

export default AppHeader;