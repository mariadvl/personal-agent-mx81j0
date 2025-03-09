import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import { BadgeProps } from '../../types/ui';
import { 
  BORDER_RADIUS, 
  SPACING, 
  FONT_SIZE, 
  FONT_WEIGHT 
} from '../../constants/uiConstants';
import { useTheme } from '../../hooks/useTheme';

/**
 * A customizable badge component that displays small labels, status indicators, or counters.
 * Can be used standalone or positioned over other elements.
 */
const Badge = ({ 
  content, 
  color, 
  children, 
  className 
}: BadgeProps) => {
  const { theme } = useTheme();
  
  // Determine badge color - use provided color or default to theme primary
  const badgeColor = color || theme.colors.primary.main;
  
  // Determine text color based on the badge background for proper contrast
  const textColor = color 
    ? (theme.colors.primary.contrastText) // Use contrast text for custom colors for simplicity
    : theme.colors.primary.contrastText;
  
  // Generate badge class names
  const badgeStyles = classNames('badge', className);
  
  // If children are provided, render a container with the badge positioned on top right
  if (children) {
    return (
      <BadgeContainer>
        {children}
        <BadgeElement 
          className={badgeStyles} 
          $badgeColor={badgeColor} 
          $textColor={textColor}
          aria-label={typeof content === 'string' ? content : 'badge'}
          role="status"
        >
          {content}
        </BadgeElement>
      </BadgeContainer>
    );
  }
  
  // Otherwise, render just the badge
  return (
    <BadgeElement 
      className={badgeStyles} 
      $badgeColor={badgeColor} 
      $textColor={textColor}
      aria-label={typeof content === 'string' ? content : 'badge'}
      role="status"
    >
      {content}
    </BadgeElement>
  );
};

// Container for badges that wrap other elements
const BadgeContainer = styled.div`
  position: relative;
  display: inline-flex;
`;

// The badge element itself
const BadgeElement = styled.span<{ $badgeColor: string; $textColor: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  min-height: 20px;
  padding: ${SPACING.XS} ${SPACING.SM};
  border-radius: ${BORDER_RADIUS.SMALL};
  background-color: ${props => props.$badgeColor};
  color: ${props => props.$textColor};
  font-size: ${FONT_SIZE.XS};
  font-weight: ${FONT_WEIGHT.MEDIUM};
  line-height: 1;
  white-space: nowrap;
  
  /* Position the badge when it's inside a container */
  ${BadgeContainer} & {
    position: absolute;
    top: -${SPACING.SM};
    right: -${SPACING.SM};
    transform: translate(50%, -50%);
    z-index: 1; /* Ensure badge appears above the wrapped element */
  }
`;

export default Badge;