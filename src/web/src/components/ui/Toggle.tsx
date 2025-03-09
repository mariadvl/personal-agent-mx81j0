import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames'; // v2.3.2

import { ToggleProps } from '../../types/ui';
import { SPACING, TRANSITION, BORDER_RADIUS, FOCUS_RING } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

// Props for styled components
interface StyledToggleProps {
  checked: boolean;
  disabled: boolean;
  theme: any;
}

// Styled components
const ToggleContainer = styled.div<StyledToggleProps>`
  display: flex;
  align-items: center;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  user-select: none;
  margin: ${SPACING.XS} 0;
`;

const HiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  height: 0;
  width: 0;
  pointer-events: none;
`;

const ToggleTrack = styled.div<StyledToggleProps>`
  position: relative;
  width: 40px;
  height: 20px;
  background-color: ${props => props.checked ? props.theme.colors.primary.main : props.theme.colors.action.disabledBackground};
  border-radius: ${BORDER_RADIUS.ROUND};
  transition: ${TRANSITION.DEFAULT};
  margin-right: ${SPACING.SM};
  
  &:hover {
    opacity: ${props => !props.disabled && 0.8};
  }
  
  &:focus-within {
    box-shadow: ${FOCUS_RING};
  }
`;

const ToggleThumb = styled.div<StyledToggleProps>`
  position: absolute;
  top: 2px;
  left: ${props => props.checked ? '22px' : '2px'};
  width: 16px;
  height: 16px;
  background-color: ${props => props.theme.colors.common.white};
  border-radius: ${BORDER_RADIUS.ROUND};
  transition: ${TRANSITION.DEFAULT};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
`;

const Label = styled.label<StyledToggleProps>`
  font-family: ${props => props.theme.typography.fontFamily};
  font-size: ${props => props.theme.typography.body2.fontSize};
  color: ${props => props.theme.colors.text.primary};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
`;

/**
 * Toggle component provides a switch-like interface for boolean settings.
 * It supports customization, accessibility, and theming with an optional label.
 */
const Toggle: React.FC<ToggleProps> = ({
  id,
  checked,
  onChange,
  label,
  disabled = false,
  className
}) => {
  const theme = useTheme();
  
  // Generate a unique ID if none is provided
  const toggleId = React.useId();
  const uniqueId = id || `toggle-${toggleId}`;
  
  // Handle changes to the toggle state
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(event.target.checked);
    }
  };
  
  return (
    <ToggleContainer 
      checked={checked} 
      disabled={disabled} 
      theme={theme}
      className={classNames('toggle-container', className)}
    >
      <HiddenInput
        id={uniqueId}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        aria-checked={checked}
        aria-disabled={disabled}
      />
      <ToggleTrack 
        checked={checked} 
        disabled={disabled} 
        theme={theme}
        onClick={() => !disabled && onChange(!checked)}
        role="presentation"
      >
        <ToggleThumb 
          checked={checked} 
          disabled={disabled} 
          theme={theme} 
        />
      </ToggleTrack>
      {label && (
        <Label 
          htmlFor={uniqueId} 
          checked={checked} 
          disabled={disabled} 
          theme={theme}
        >
          {label}
        </Label>
      )}
    </ToggleContainer>
  );
};

export default Toggle;