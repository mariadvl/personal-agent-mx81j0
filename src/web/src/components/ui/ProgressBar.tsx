import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames';

import { ProgressBarProps } from '../../types/ui';
import { BORDER_RADIUS, TRANSITION, FONT_SIZE } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

/**
 * Props for the styled progress fill component
 */
interface ProgressFillProps {
  percentage: number;
}

// Styled container for the progress bar component
const ProgressContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 4px;
`;

// Label text for the progress bar
const ProgressLabel = styled.div`
  font-size: ${FONT_SIZE.SM};
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 4px;
`;

// Background track for the progress bar
const ProgressTrack = styled.div`
  width: 100%;
  height: 8px;
  background-color: ${props => props.theme.colors.action.hover};
  border-radius: ${BORDER_RADIUS.SMALL};
  overflow: hidden;
  position: relative;
`;

// Filled portion of the progress bar
const ProgressFill = styled.div<ProgressFillProps>`
  height: 100%;
  background-color: ${props => props.theme.colors.primary.main};
  border-radius: ${BORDER_RADIUS.SMALL};
  transition: ${TRANSITION.DEFAULT};
  width: ${props => props.percentage}%;
`;

// Text displaying the percentage completion
const ProgressPercentage = styled.div`
  font-size: ${FONT_SIZE.SM};
  color: ${props => props.theme.colors.text.secondary};
  margin-top: 4px;
  text-align: right;
`;

/**
 * A customizable progress bar component that visualizes completion progress
 * 
 * @param props - The component props
 * @returns A rendered progress bar component
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = false,
  className,
}) => {
  // Get the current theme
  const { theme } = useTheme();
  
  // Calculate percentage and ensure it's between 0 and 100
  let percentage = Math.floor((value / max) * 100);
  percentage = Math.max(0, Math.min(100, percentage));
  
  return (
    <ProgressContainer className={classNames('progress-bar', className)}>
      {/* Show label if provided */}
      {label && <ProgressLabel>{label}</ProgressLabel>}
      
      {/* Progress track with proper ARIA attributes for accessibility */}
      <ProgressTrack 
        role="progressbar" 
        aria-valuenow={value} 
        aria-valuemin={0} 
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        {/* Filled portion of the progress bar */}
        <ProgressFill percentage={percentage} />
      </ProgressTrack>
      
      {/* Show percentage text if enabled */}
      {showPercentage && (
        <ProgressPercentage>{percentage}%</ProgressPercentage>
      )}
    </ProgressContainer>
  );
};

export default ProgressBar;