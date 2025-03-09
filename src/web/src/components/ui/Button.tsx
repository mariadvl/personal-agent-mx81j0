import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames';

import {
  ButtonProps,
  ButtonVariant,
  ButtonSize
} from '../../types/ui';

import {
  BUTTON_HEIGHT,
  SPACING,
  BORDER_RADIUS,
  TRANSITION,
  FONT_SIZE,
  FOCUS_RING
} from '../../constants/uiConstants';

import useTheme from '../../hooks/useTheme';
import { ThemeType } from '../../themes/theme';

// Interface for styled button component props
interface ButtonStyledProps extends ButtonProps {
  theme: ThemeType;
}

// Helper functions for determining button styles based on variant and theme
const getBackgroundColor = (props: ButtonStyledProps): string => {
  const { variant, theme } = props;
  
  switch (variant) {
    case ButtonVariant.PRIMARY:
      return theme.colors.primary.main;
    case ButtonVariant.SECONDARY:
      return theme.colors.secondary.main;
    case ButtonVariant.OUTLINED:
    case ButtonVariant.TEXT:
    case ButtonVariant.ICON:
      return 'transparent';
    default:
      return theme.colors.primary.main;
  }
};

const getTextColor = (props: ButtonStyledProps): string => {
  const { variant, theme } = props;
  
  switch (variant) {
    case ButtonVariant.PRIMARY:
      return theme.colors.primary.contrastText;
    case ButtonVariant.SECONDARY:
      return theme.colors.secondary.contrastText;
    case ButtonVariant.OUTLINED:
      return theme.colors.primary.main;
    case ButtonVariant.TEXT:
      return theme.colors.primary.main;
    case ButtonVariant.ICON:
      return theme.colors.text.primary;
    default:
      return theme.colors.primary.contrastText;
  }
};

const getHoverBackgroundColor = (props: ButtonStyledProps): string => {
  const { variant, theme } = props;
  
  switch (variant) {
    case ButtonVariant.PRIMARY:
      return theme.colors.primary.dark;
    case ButtonVariant.SECONDARY:
      return theme.colors.secondary.dark;
    case ButtonVariant.OUTLINED:
    case ButtonVariant.TEXT:
    case ButtonVariant.ICON:
      return theme.colors.action.hover;
    default:
      return theme.colors.primary.dark;
  }
};

const getHoverTextColor = (props: ButtonStyledProps): string => {
  const { variant, theme } = props;
  
  switch (variant) {
    case ButtonVariant.PRIMARY:
      return theme.colors.primary.contrastText;
    case ButtonVariant.SECONDARY:
      return theme.colors.secondary.contrastText;
    case ButtonVariant.OUTLINED:
      return theme.colors.primary.main;
    case ButtonVariant.TEXT:
      return theme.colors.primary.dark;
    case ButtonVariant.ICON:
      return theme.colors.primary.main;
    default:
      return theme.colors.primary.contrastText;
  }
};

const getBorder = (props: ButtonStyledProps): string => {
  const { variant, theme } = props;
  
  switch (variant) {
    case ButtonVariant.OUTLINED:
      return `1px solid ${theme.colors.primary.main}`;
    default:
      return 'none';
  }
};

// Styled components
const StyledButton = styled.button<ButtonStyledProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${SPACING.XS};
  border: none;
  cursor: pointer;
  font-family: ${props => props.theme.typography.fontFamily};
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  transition: ${TRANSITION.DEFAULT};
  outline: none;
  position: relative;
  overflow: hidden;
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  height: ${props => BUTTON_HEIGHT[props.size]};
  border-radius: ${props => props.variant === ButtonVariant.ICON ? BORDER_RADIUS.ROUND : BORDER_RADIUS.MEDIUM};
  padding: ${props => props.variant === ButtonVariant.ICON ? '0' : `0 ${SPACING.MD}`};
  font-size: ${props => props.size === ButtonSize.SMALL ? FONT_SIZE.SM : FONT_SIZE.MD};
  background-color: ${props => getBackgroundColor(props)};
  color: ${props => getTextColor(props)};
  border: ${props => getBorder(props)};
  
  &:hover {
    background-color: ${props => getHoverBackgroundColor(props)};
    color: ${props => getHoverTextColor(props)};
  }
  
  &:active {
    transform: translateY(1px);
  }
  
  &:focus {
    box-shadow: ${FOCUS_RING};
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    background-color: ${props => props.theme.colors.action.disabledBackground};
    color: ${props => props.theme.colors.text.disabled};
    border-color: ${props => props.theme.colors.action.disabledBackground};
    
    &:hover {
      background-color: ${props => props.theme.colors.action.disabledBackground};
      color: ${props => props.theme.colors.text.disabled};
    }
  }
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
`;

/**
 * A customizable button component that supports different variants, sizes, and states.
 * Follows the application's design system and provides consistent styling across the app.
 */
const Button = (props: ButtonProps): JSX.Element => {
  const {
    variant = ButtonVariant.PRIMARY,
    size = ButtonSize.MEDIUM,
    disabled = false,
    fullWidth = false,
    startIcon,
    endIcon,
    children,
    className,
    onClick,
    type = 'button',
    ariaLabel,
    ...rest
  } = props;
  
  const { theme } = useTheme();
  
  // Prevent action when button is disabled
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    
    if (onClick) {
      onClick();
    }
  };
  
  return (
    <StyledButton
      variant={variant}
      size={size}
      disabled={disabled}
      fullWidth={fullWidth}
      className={classNames('button', {
        [`button--${variant}`]: variant,
        [`button--${size}`]: size,
        'button--full-width': fullWidth,
        'button--disabled': disabled,
      }, className)}
      onClick={handleClick}
      type={type}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-disabled={disabled}
      theme={theme}
      {...rest}
    >
      {startIcon && <IconWrapper>{startIcon}</IconWrapper>}
      {children}
      {endIcon && <IconWrapper>{endIcon}</IconWrapper>}
    </StyledButton>
  );
};

export default Button;