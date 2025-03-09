import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import { CardProps } from '../../types/ui';
import { BORDER_RADIUS, SPACING, SHADOW, TRANSITION, FOCUS_RING } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

// Interface for the styled card component props
interface StyledCardProps {
  clickable: boolean;
}

// Main card container with theme-based styling
const StyledCard = styled.div<StyledCardProps>`
  display: flex;
  flex-direction: column;
  background-color: ${props => props.theme.colors.background.paper};
  border-radius: ${BORDER_RADIUS.MEDIUM};
  box-shadow: ${SHADOW.SMALL};
  overflow: hidden;
  transition: ${TRANSITION.DEFAULT};
  width: 100%;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  
  &:hover {
    box-shadow: ${props => props.clickable ? props.theme.shadows.medium : SHADOW.SMALL};
    transform: ${props => props.clickable ? 'translateY(-2px)' : 'none'};
  }
  
  &:focus {
    outline: none;
    box-shadow: ${FOCUS_RING};
  }
`;

// Card title section
const CardTitle = styled.div`
  padding: ${SPACING.MD};
  border-bottom: 1px solid ${props => props.theme.colors.divider};
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  font-size: ${props => props.theme.typography.h6.fontSize};
  color: ${props => props.theme.colors.text.primary};
`;

// Card content section
const CardContent = styled.div`
  padding: ${SPACING.MD};
  flex: 1;
`;

// Card footer section
const CardFooter = styled.div`
  padding: ${SPACING.MD};
  border-top: 1px solid ${props => props.theme.colors.divider};
  background-color: ${props => props.theme.colors.background.default};
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: ${SPACING.MD};
`;

/**
 * A customizable card component that provides a container with consistent styling
 * for content grouping throughout the application.
 *
 * Features:
 * - Optional title section
 * - Main content area for children
 * - Optional footer section
 * - Click interaction support
 * - Theme-aware styling
 * - Accessibility support with proper ARIA attributes
 */
const Card = ({
  title,
  children,
  footer,
  className,
  onClick
}: CardProps): JSX.Element => {
  // Get the current theme
  const { theme } = useTheme();
  
  // Determine if the card is clickable
  const isClickable = Boolean(onClick);
  
  // Handle keyboard interaction for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.();
    }
  };
  
  return (
    <StyledCard 
      className={classNames('ai-card', className)}
      clickable={isClickable}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : undefined}
      aria-label={isClickable && typeof title === 'string' ? title : undefined}
    >
      {title && <CardTitle>{title}</CardTitle>}
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </StyledCard>
  );
};

export default Card;