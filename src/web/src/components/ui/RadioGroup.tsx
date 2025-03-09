import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames';

import { RadioGroupProps, RadioOption } from '../../types/ui';
import { SPACING, TRANSITION, FOCUS_RING } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

// Container for the radio group with proper spacing
const RadioGroupContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.SM};
  width: 100%;
`;

// Container for each radio option with label
const RadioOptionContainer = styled.label<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
  opacity: ${props => (props.disabled ? 0.6 : 1)};
  user-select: none;
  margin: ${SPACING.XS} 0;
`;

// Visually hidden native radio input for accessibility
const HiddenRadio = styled.input`
  position: absolute;
  opacity: 0;
  height: 0;
  width: 0;
  pointer-events: none;
`;

// Custom styled radio button indicator
const RadioIndicator = styled.div<{ checked: boolean; disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid ${props => props.checked ? props.theme.colors.primary.main : props.theme.colors.text.secondary};
  background-color: ${props => props.theme.colors.background.paper};
  transition: ${TRANSITION.DEFAULT};
  margin-right: ${SPACING.SM};
  
  &:hover {
    border-color: ${props => !props.disabled && props.theme.colors.primary.main};
  }
  
  &:focus-within {
    box-shadow: ${FOCUS_RING};
  }
`;

// Inner dot that appears when radio is checked
const RadioDot = styled.div<{ checked: boolean; disabled?: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.primary.main};
  opacity: ${props => (props.checked ? 1 : 0)};
  transform: ${props => (props.checked ? 'scale(1)' : 'scale(0)')};
  transition: ${TRANSITION.DEFAULT};
`;

// Text label for the radio option
const RadioLabel = styled.span<{ disabled?: boolean }>`
  font-family: ${props => props.theme.typography.fontFamily};
  font-size: ${props => props.theme.typography.body2.fontSize};
  color: ${props => props.theme.colors.text.primary};
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
`;

/**
 * Generates a unique ID for the radio group if none is provided
 * 
 * @param name The base name for the radio group
 * @returns A unique ID for the radio group
 */
const generateUniqueId = (name: string): string => {
  const id = React.useId();
  return `radio-${name}-${id}`;
};

/**
 * A customizable radio group component that allows users to select a single option from a list
 */
const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  disabled = false,
  className,
}) => {
  const { theme } = useTheme();
  const groupId = generateUniqueId(name);

  return (
    <RadioGroupContainer 
      className={classNames('radio-group', className)}
      role="radiogroup"
      aria-label={name}
    >
      {options.map((option, index) => {
        const isChecked = option.value === value;
        const isDisabled = disabled || !!option.disabled;
        const optionId = `${groupId}-${index}`;
        
        return (
          <RadioOptionContainer
            key={option.value}
            htmlFor={optionId}
            disabled={isDisabled}
            className={classNames('radio-option', {
              'radio-option-checked': isChecked,
              'radio-option-disabled': isDisabled,
            })}
          >
            <HiddenRadio
              type="radio"
              id={optionId}
              name={name}
              value={option.value}
              checked={isChecked}
              disabled={isDisabled}
              onChange={() => !isDisabled && onChange(option.value)}
              aria-checked={isChecked}
              aria-disabled={isDisabled}
            />
            <RadioIndicator checked={isChecked} disabled={isDisabled} theme={theme}>
              <RadioDot checked={isChecked} disabled={isDisabled} theme={theme} />
            </RadioIndicator>
            <RadioLabel disabled={isDisabled} theme={theme}>
              {option.label}
            </RadioLabel>
          </RadioOptionContainer>
        );
      })}
    </RadioGroupContainer>
  );
};

export default RadioGroup;