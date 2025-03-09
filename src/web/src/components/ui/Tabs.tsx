import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import { Tab, TabsProps, TabOrientation } from '../../types/ui';
import { SPACING, BORDER_RADIUS, TRANSITION, FOCUS_RING } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';
import { ThemeType } from '../../themes/theme';

/**
 * Props for the styled tabs container
 */
interface StyledTabsContainerProps {
  theme: ThemeType;
  orientation: TabOrientation;
}

/**
 * Props for the styled tab item
 */
interface StyledTabItemProps {
  theme: ThemeType;
  active: boolean;
  disabled: boolean;
  orientation: TabOrientation;
}

/**
 * Styled container for the tabs with orientation-based styling
 */
const TabsContainer = styled.div<StyledTabsContainerProps>`
  display: flex;
  flex-direction: ${props => props.orientation === TabOrientation.VERTICAL ? 'column' : 'row'};
  border-bottom: ${props => props.orientation === TabOrientation.HORIZONTAL ? `1px solid ${props.theme.colors.divider}` : 'none'};
  border-right: ${props => props.orientation === TabOrientation.VERTICAL ? `1px solid ${props.theme.colors.divider}` : 'none'};
  width: ${props => props.orientation === TabOrientation.VERTICAL ? 'fit-content' : '100%'};
  overflow: auto;
`;

/**
 * Styled tab item with active and disabled states
 */
const TabItem = styled.button<StyledTabItemProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${SPACING.XS};
  padding: ${SPACING.SM} ${SPACING.MD};
  background-color: transparent;
  border: none;
  cursor: pointer;
  font-family: ${props => props.theme.typography.fontFamily};
  font-size: ${props => props.theme.typography.body1.fontSize};
  font-weight: ${props => props.active ? props.theme.typography.fontWeightMedium : props.theme.typography.fontWeightRegular};
  color: ${props => props.active ? props.theme.colors.primary.main : props.theme.colors.text.primary};
  transition: ${TRANSITION.DEFAULT};
  position: relative;
  outline: none;
  
  border-bottom: ${props => props.orientation === TabOrientation.HORIZONTAL && props.active ? `2px solid ${props.theme.colors.primary.main}` : props.orientation === TabOrientation.HORIZONTAL ? '2px solid transparent' : 'none'};
  border-right: ${props => props.orientation === TabOrientation.VERTICAL && props.active ? `2px solid ${props.theme.colors.primary.main}` : props.orientation === TabOrientation.VERTICAL ? '2px solid transparent' : 'none'};
  
  &:hover {
    background-color: ${props => props.theme.colors.action.hover};
  }
  
  &:focus {
    box-shadow: ${FOCUS_RING};
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    color: ${props => props.theme.colors.text.disabled};
  }
`;

/**
 * Wrapper for tab icons to ensure proper alignment
 */
const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
`;

/**
 * A customizable tabs component that supports different orientations and states
 */
const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  orientation = TabOrientation.HORIZONTAL,
  className,
}) => {
  const { theme } = useTheme();
  
  // Handle tab click if not disabled
  const handleTabClick = (tab: Tab) => {
    if (!tab.disabled) {
      onChange(tab.id);
    }
  };
  
  // Handle keyboard navigation for accessibility
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const enabledTabs = tabs.filter(tab => !tab.disabled);
    const currentIndex = enabledTabs.findIndex(tab => tab.id === activeTab);
    
    // Exit if no enabled tabs or active tab not found
    if (enabledTabs.length === 0 || currentIndex === -1) return;
    
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        if ((orientation === TabOrientation.HORIZONTAL && event.key === 'ArrowRight') ||
            (orientation === TabOrientation.VERTICAL && event.key === 'ArrowDown')) {
          event.preventDefault();
          const nextIndex = (currentIndex + 1) % enabledTabs.length;
          onChange(enabledTabs[nextIndex].id);
        }
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        if ((orientation === TabOrientation.HORIZONTAL && event.key === 'ArrowLeft') ||
            (orientation === TabOrientation.VERTICAL && event.key === 'ArrowUp')) {
          event.preventDefault();
          const prevIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
          onChange(enabledTabs[prevIndex].id);
        }
        break;
      case 'Home':
        event.preventDefault();
        onChange(enabledTabs[0].id);
        break;
      case 'End':
        event.preventDefault();
        onChange(enabledTabs[enabledTabs.length - 1].id);
        break;
      default:
        break;
    }
  };
  
  return (
    <TabsContainer 
      orientation={orientation}
      className={classNames('tabs-container', className)}
      role="tablist"
      aria-orientation={orientation}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        
        return (
          <TabItem
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            onKeyDown={handleKeyDown}
            active={isActive}
            disabled={!!tab.disabled}
            orientation={orientation}
            tabIndex={isActive ? 0 : -1}
            role="tab"
            aria-selected={isActive}
            aria-disabled={!!tab.disabled}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={classNames('tab-item', { 
              'active': isActive, 
              'disabled': tab.disabled 
            })}
          >
            {tab.icon && <IconWrapper>{tab.icon}</IconWrapper>}
            {tab.label}
          </TabItem>
        );
      })}
    </TabsContainer>
  );
};

export default Tabs;