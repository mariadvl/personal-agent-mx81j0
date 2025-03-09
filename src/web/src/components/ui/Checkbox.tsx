import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import { CheckboxProps } from '../../types/ui';
import { SPACING, TRANSITION, FOCUS_RING } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

// Define additional props for styled checkbox
interface StyledCheckboxProps {
  checked: boolean;
  disabled?: boolean;
  theme: any; // ThemeType
}

// Container for the checkbox and label with proper alignment
const CheckboxContainer = styled.div<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  user-select: none;
  margin: ${SPACING.XS} 0;
`;

// Visually hidden native checkbox for accessibility
const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  height: 0;
  width: 0;
  pointer-events: none;
`;

// Custom styled checkbox with visual states
const StyledCheckbox = styled.div<StyledCheckboxProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background-color: ${props => props.checked ? props.theme.colors.primary.main : props.theme.colors.background.paper};
  border: 1px solid ${props => props.checked ? props.theme.colors.primary.main : props.theme.colors.text.secondary};
  border-radius: 3px;
  transition: ${TRANSITION.DEFAULT};
  margin-right: ${SPACING.SM};
  
  &:hover {
    border-color: ${props => !props.disabled && props.theme.colors.primary.main};
  }
  
  &:focus-within {
    box-shadow: ${FOCUS_RING};
  }
`;

// Checkmark icon that appears when checkbox is checked
const CheckIcon = styled.svg<{ checked: boolean }>`
  fill: none;
  stroke: ${props => props.theme.colors.primary.contrastText};
  stroke-width: 2px;
  width: 12px;
  height: 12px;
  visibility: ${props => props.checked ? 'visible' : 'hidden'};
`;

// Text label for the checkbox
const Label = styled.label<{ disabled?: boolean }>`
  font-family: ${props => props.theme.typography.fontFamily};
  font-size: ${props => props.theme.typography.body2.fontSize};
  color: ${props => props.theme.colors.text.primary};
  margin-left: ${SPACING.XS};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
`;

/**
 * A customizable checkbox component that supports different states and an optional label
 */
const Checkbox = ({
  id,
  checked,
  onChange,
  label,
  disabled = false,
  className,
}: CheckboxProps) => {
  const { theme } = useTheme();
  
  // Generate a unique ID if none is provided
  const generatedId = React.useId();
  const checkboxId = id || `checkbox-${generatedId}`;

  return (
    <CheckboxContainer 
      className={classNames('checkbox-container', className)}
      disabled={disabled}
    >
      <HiddenCheckbox
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-checked={checked}
      />
      <StyledCheckbox 
        checked={checked} 
        disabled={disabled}
        theme={theme}
        onClick={() => {
          if (!disabled) {
            const event = {
              target: {
                checked: !checked
              }
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(event);
          }
        }}
      >
        <CheckIcon 
          checked={checked} 
          viewBox="0 0 24 24"
          theme={theme}
        >
          <polyline points="20 6 9 17 4 12" />
        </CheckIcon>
      </StyledCheckbox>
      {label && (
        <Label 
          htmlFor={checkboxId}
          disabled={disabled}
          theme={theme}
        >
          {label}
        </Label>
      )}
    </CheckboxContainer>
  );
};

export default Checkbox;