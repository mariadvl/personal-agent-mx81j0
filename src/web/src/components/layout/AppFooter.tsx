import React from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiHome, FiMessageSquare, FiFile, FiGlobe, FiSettings } from 'react-icons/fi';

import Button from '../ui/Button';
import useTheme from '../../hooks/useTheme';
import { useUIStore } from '../../store/uiStore';
import { SPACING, BREAKPOINTS, Z_INDEX } from '../../constants/uiConstants';

// Define the footer height for consistency
const FOOTER_HEIGHT = '60px';

// Styled components for footer
const FooterContainer = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${FOOTER_HEIGHT};
  background-color: ${props => props.theme.colors.background.paper};
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: ${props => props.theme.shadows.small};
  z-index: ${Z_INDEX.DROPDOWN};
  border-top: 1px solid ${props => props.theme.colors.divider};
  
  @media (min-width: ${BREAKPOINTS.MOBILE}) {
    display: none;
  }
`;

const NavItem = styled.div`
  display: flex;
  flex: 1;
`;

interface NavLinkProps {
  $isActive: boolean;
}

const NavLink = styled.a<NavLinkProps>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: ${SPACING.SM} 0;
  color: ${props => props.$isActive 
    ? props.theme.colors.primary.main 
    : props.theme.colors.text.secondary};
  text-decoration: none;
  font-size: 0.75rem;
  transition: color 0.2s ease-in-out;
  
  &:hover, &:focus {
    color: ${props => props.theme.colors.primary.main};
    outline: none;
  }
  
  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary.main};
    outline-offset: -2px;
  }
  
  svg {
    margin-bottom: 4px;
  }
`;

/**
 * A mobile-optimized navigation footer that appears at the bottom of the screen on mobile devices.
 * Provides easy access to the main sections of the application with touch-friendly buttons.
 */
const AppFooter: React.FC = () => {
  const { theme } = useTheme();
  const { activeTab, setActiveTab } = useUIStore();
  const router = useRouter();
  
  // Navigation items with icons, labels, and paths
  const navItems = [
    { icon: <FiHome size={20} />, label: 'Home', path: '/' },
    { icon: <FiMessageSquare size={20} />, label: 'Chat', path: '/chat' },
    { icon: <FiFile size={20} />, label: 'Files', path: '/files' },
    { icon: <FiGlobe size={20} />, label: 'Web', path: '/web' },
    { icon: <FiSettings size={20} />, label: 'Settings', path: '/settings' },
  ];
  
  return (
    <FooterContainer theme={theme} role="navigation" aria-label="Mobile Navigation">
      {navItems.map((item) => {
        // Determine if this nav item is active based on the current route
        const isActive = 
          router.pathname === item.path || 
          (router.pathname === '/' && item.path === '/') ||
          (router.pathname.startsWith(item.path) && item.path !== '/');
        
        return (
          <NavItem key={item.path}>
            <Link href={item.path} passHref legacyBehavior>
              <NavLink 
                $isActive={isActive}
                onClick={() => setActiveTab(item.label.toLowerCase())}
                aria-label={`${item.label} ${isActive ? '(current page)' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                theme={theme}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </Link>
          </NavItem>
        );
      })}
    </FooterContainer>
  );
};

export default AppFooter;