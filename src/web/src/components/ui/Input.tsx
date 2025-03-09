import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames'; // v2.3.2

import { InputProps, InputType } from '../../types/ui';
import {
  INPUT_HEIGHT,
  SPACING,
  BORDER_RADIUS,
  TRANSITION,
  FONT_SIZE,
  FOCUS_RING
} from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';
import { ThemeType } from '../../themes/theme';

// Interface for styled component props
interface InputStyledProps {
  error?: boolean;
  disabled?: boolean;
  theme: ThemeType;
}

const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: ${SPACING.MD};
`;

const InputLabel = styled.label<InputStyledProps>`
  font-size: ${FONT_SIZE.SM};
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  margin-bottom: ${SPACING.XS};
  color: ${props => props.error 
    ? props.theme.colors.error.main 
    : props.theme.colors.text.primary};
  display: flex;
  align-items: center;
`;

const RequiredIndicator = styled.span<InputStyledProps>`
  color: ${props => props.theme.colors.error.main};
  margin-left: ${SPACING.XS};
`;

const InputWrapper = styled.div<InputStyledProps>`
  display: flex;
  align-items: center;
  width: 100%;
  position: relative;
  border: 1px solid ${props => props.error 
    ? props.theme.colors.error.main 
    : props.disabled 
      ? props.theme.colors.action.disabledBackground 
      : props.theme.colors.divider};
  border-radius: ${BORDER_RADIUS.MEDIUM};
  background-color: ${props => props.disabled 
    ? props.theme.colors.action.disabledBackground 
    : props.theme.colors.background.paper};
  transition: ${TRANSITION.DEFAULT};
  &:focus-within {
    border-color: ${props => props.error 
      ? props.theme.colors.error.main 
      : props.theme.colors.primary.main};
    box-shadow: ${FOCUS_RING};
  }
  height: ${INPUT_HEIGHT.MEDIUM};
`;

const StyledInput = styled.input<InputStyledProps>`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: ${FONT_SIZE.MD};
  font-family: ${props => props.theme.typography.fontFamily};
  color: ${props => props.theme.colors.text.primary};
  padding: 0 ${SPACING.SM};
  height: 100%;
  width: 100%;
  &::placeholder {
    color: ${props => props.theme.colors.text.secondary};
  }
  &:disabled {
    cursor: not-allowed;
    color: ${props => props.theme.colors.text.disabled};
  }
`;

const IconWrapper = styled.div<InputStyledProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 ${SPACING.SM};
  color: ${props => props.error 
    ? props.theme.colors.error.main 
    : props.disabled 
      ? props.theme.colors.text.disabled 
      : props.theme.colors.text.secondary};
`;

const ErrorMessage = styled.div<InputStyledProps>`
  color: ${props => props.theme.colors.error.main};
  font-size: ${FONT_SIZE.SM};
  margin-top: ${SPACING.XS};
`;

/**
 * A customizable input component that supports different types, states, and styling options
 */
function Input(props: InputProps): JSX.Element {
  const {
    id,
    type = InputType.TEXT,
    value,
    onChange,
    placeholder,
    label,
    error,
    disabled = false,
    required = false,
    startIcon,
    endIcon,
    className,
  } = props;
  
  const { theme } = useTheme();
  
  // Generate a unique ID if none is provided
  const uniqueId = React.useId();
  const inputId = id || `input-${uniqueId}`;

  return (
    <InputContainer className={classNames('input-container', className)}>
      {label && (
        <InputLabel 
          htmlFor={inputId} 
          error={!!error} 
          disabled={disabled}
          theme={theme}
        >
          {label}
          {required && <RequiredIndicator theme={theme}>*</RequiredIndicator>}
        </InputLabel>
      )}
      
      <InputWrapper 
        error={!!error} 
        disabled={disabled}
        theme={theme}
      >
        {startIcon && (
          <IconWrapper 
            error={!!error} 
            disabled={disabled}
            theme={theme}
          >
            {startIcon}
          </IconWrapper>
        )}
        
        <StyledInput
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          error={!!error}
          theme={theme}
        />
        
        {endIcon && (
          <IconWrapper 
            error={!!error} 
            disabled={disabled}
            theme={theme}
          >
            {endIcon}
          </IconWrapper>
        )}
      </InputWrapper>
      
      {error && (
        <ErrorMessage 
          id={`${inputId}-error`} 
          role="alert"
          theme={theme}
        >
          {error}
        </ErrorMessage>
      )}
    </InputContainer>
  );
}

export default Input;