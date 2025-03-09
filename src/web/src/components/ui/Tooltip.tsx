import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import classNames from 'classnames';

import { TooltipProps, TooltipPosition } from '../../types/ui';
import { SPACING, BORDER_RADIUS, Z_INDEX, ANIMATION, FONT_SIZE } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

// Helper function to determine position styles based on tooltip position
const getPositionStyles = (props: StyledTooltipProps): string => {
  switch (props.position) {
    case TooltipPosition.TOP:
      return `
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 8px;
      `;
    case TooltipPosition.RIGHT:
      return `
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        margin-left: 8px;
      `;
    case TooltipPosition.BOTTOM:
      return `
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-top: 8px;
      `;
    case TooltipPosition.LEFT:
      return `
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
        margin-right: 8px;
      `;
    default:
      return `
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 8px;
      `;
  }
};

// Helper function to determine arrow styles based on tooltip position
const getArrowStyles = (props: StyledTooltipProps): string => {
  switch (props.position) {
    case TooltipPosition.TOP:
      return `
        border-width: 5px 5px 0;
        border-color: ${props.theme.colors.background.elevated} transparent transparent;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
      `;
    case TooltipPosition.RIGHT:
      return `
        border-width: 5px 5px 5px 0;
        border-color: transparent ${props.theme.colors.background.elevated} transparent transparent;
        left: -5px;
        top: 50%;
        transform: translateY(-50%);
      `;
    case TooltipPosition.BOTTOM:
      return `
        border-width: 0 5px 5px;
        border-color: transparent transparent ${props.theme.colors.background.elevated};
        top: -5px;
        left: 50%;
        transform: translateX(-50%);
      `;
    case TooltipPosition.LEFT:
      return `
        border-width: 5px 0 5px 5px;
        border-color: transparent transparent transparent ${props.theme.colors.background.elevated};
        right: -5px;
        top: 50%;
        transform: translateY(-50%);
      `;
    default:
      return `
        border-width: 5px 5px 0;
        border-color: ${props.theme.colors.background.elevated} transparent transparent;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
      `;
  }
};

// Interface for styled tooltip components
interface StyledTooltipProps {
  theme: any;
  position: TooltipPosition;
}

// Styled container for the tooltip wrapper
const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;
  width: fit-content;
`;

// Styled element for the tooltip content
const TooltipContent = styled.div<StyledTooltipProps>`
  position: absolute;
  z-index: ${Z_INDEX.TOOLTIP};
  background-color: ${props => props.theme.colors.background.elevated};
  color: ${props => props.theme.colors.text.primary};
  padding: ${SPACING.XS} ${SPACING.SM};
  border-radius: ${BORDER_RADIUS.SMALL};
  font-size: ${FONT_SIZE.XS};
  max-width: 250px;
  word-wrap: break-word;
  animation: ${ANIMATION.FADE_IN} 0.2s ease-in-out;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  pointer-events: none; /* Allows clicks to pass through to elements beneath */
  ${props => getPositionStyles(props)};

  &::after {
    content: '';
    position: absolute;
    border-style: solid;
    ${props => getArrowStyles(props)};
  }
`;

/**
 * A customizable tooltip component that displays informational content
 * when hovering over or focusing on an element.
 */
const Tooltip = ({
  content,
  position = TooltipPosition.TOP,
  children,
  delay = 300,
  className
}: TooltipProps) => {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipId = useRef<string>(`tooltip-${Math.random().toString(36).substring(2, 9)}`);

  const showTooltip = () => {
    // Clear any existing timer
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    
    // Set a new timer to show the tooltip after the specified delay
    timerRef.current = window.setTimeout(() => {
      setVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    // Clear any existing timer
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    setVisible(false);
  };

  // Cleanup any timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Clone children to add aria-describedby for accessibility
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        'aria-describedby': visible ? tooltipId.current : undefined
      });
    }
    return child;
  });

  return (
    <TooltipContainer 
      ref={containerRef}
      className={classNames('tooltip-container', className)}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {childrenWithProps}
      {visible && (
        <TooltipContent 
          id={tooltipId.current}
          className="tooltip-content"
          theme={theme}
          position={position}
          role="tooltip"
          aria-hidden={!visible}
        >
          {content}
        </TooltipContent>
      )}
    </TooltipContainer>
  );
};

export default Tooltip;