import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import { SliderProps } from '../../types/ui';
import { SPACING, BORDER_RADIUS, TRANSITION, FOCUS_RING } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

/**
 * Calculates the percentage of a value within a range
 */
const calculatePercentage = (value: number, min: number, max: number): number => {
  const clampedValue = Math.max(min, Math.min(value, max));
  return ((clampedValue - min) / (max - min)) * 100;
};

// Type for styled components props
interface SliderStyledProps {
  theme?: any;
  disabled?: boolean;
  percentage?: number;
}

// Styled components
const SliderContainer = styled.div<SliderStyledProps>`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: ${SPACING.SM};
  opacity: ${props => props.disabled ? 0.5 : 1};
  pointer-events: ${props => props.disabled ? 'none' : 'auto'};
`;

const SliderLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: ${SPACING.XS};
  color: ${props => props.theme.colors.text.primary};
`;

const SliderTrack = styled.div`
  position: relative;
  height: 4px;
  width: 100%;
  background-color: ${props => props.theme.colors.background.paper};
  border-radius: ${BORDER_RADIUS.SMALL};
  cursor: pointer;
`;

const SliderFilled = styled.div<SliderStyledProps>`
  position: absolute;
  height: 100%;
  background-color: ${props => props.theme.colors.primary.main};
  border-radius: ${BORDER_RADIUS.SMALL};
  width: ${props => props.percentage}%;
  transition: ${TRANSITION.DEFAULT};
`;

const SliderThumb = styled.div<SliderStyledProps>`
  position: absolute;
  width: 16px;
  height: 16px;
  background-color: ${props => props.theme.colors.primary.main};
  border-radius: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  left: ${props => props.percentage}%;
  cursor: grab;
  transition: ${TRANSITION.DEFAULT};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  
  &:hover {
    background-color: ${props => props.theme.colors.primary.dark};
    transform: translate(-50%, -50%) scale(1.1);
  }
  
  &:active {
    cursor: grabbing;
  }
  
  &:focus {
    box-shadow: ${FOCUS_RING};
  }
`;

const HiddenInput = styled.input`
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  top: 0;
  left: 0;
  margin: 0;
  padding: 0;
`;

/**
 * A customizable slider component that allows users to select a value within a range
 */
const Slider: React.FC<SliderProps> = ({
  id,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  disabled = false,
  className
}) => {
  const { theme } = useTheme();
  
  // Calculate the percentage of the current value within the range
  const percentage = calculatePercentage(value, min, max);
  
  // Handle change from the input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    let newValue = value;
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      newValue = Math.min(value + step, max);
      onChange(newValue);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      newValue = Math.max(value - step, min);
      onChange(newValue);
    } else if (e.key === 'Home') {
      onChange(min);
    } else if (e.key === 'End') {
      onChange(max);
    }
  };
  
  return (
    <SliderContainer className={classNames('slider-container', className)} disabled={disabled}>
      {label && <SliderLabel htmlFor={id}>{label}</SliderLabel>}
      <SliderTrack>
        <SliderFilled percentage={percentage} />
        <SliderThumb percentage={percentage} />
        <HiddenInput
          id={id}
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-orientation="horizontal"
        />
      </SliderTrack>
    </SliderContainer>
  );
};

export default Slider;