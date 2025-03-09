import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import classNames from 'classnames';

import { AlertProps, AlertType } from '../../types/ui';
import { BORDER_RADIUS, SPACING, TRANSITION, SHADOW } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

// Styled components for the alert
const AlertContainer = styled.div<{ alertType: AlertType; visible: boolean }>`
  display: ${props => (props.visible ? 'flex' : 'none')};
  align-items: center;
  width: 100%;
  padding: ${SPACING.SM} ${SPACING.MD};
  margin-bottom: ${SPACING.MD};
  border-radius: ${BORDER_RADIUS.MEDIUM};
  box-shadow: ${SHADOW.SMALL};
  transition: ${TRANSITION.DEFAULT};
  
  ${props => {
    let colors;
    
    switch (props.alertType) {
      case AlertType.SUCCESS:
        colors = props.theme.colors.success;
        break;
      case AlertType.ERROR:
        colors = props.theme.colors.error;
        break;
      case AlertType.WARNING:
        colors = props.theme.colors.warning;
        break;
      case AlertType.INFO:
      default:
        colors = props.theme.colors.info;
        break;
    }
    
    return `
      background-color: ${colors.light};
      border-left: 4px solid ${colors.main};
      color: ${colors.contrastText};
    `;
  }}
`;

const AlertContent = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
`;

const IconContainer = styled.div<{ alertType: AlertType }>`
  margin-right: ${SPACING.SM};
  display: flex;
  align-items: center;
  justify-content: center;
  
  ${props => {
    let color;
    
    switch (props.alertType) {
      case AlertType.SUCCESS:
        color = props.theme.colors.success.main;
        break;
      case AlertType.ERROR:
        color = props.theme.colors.error.main;
        break;
      case AlertType.WARNING:
        color = props.theme.colors.warning.main;
        break;
      case AlertType.INFO:
      default:
        color = props.theme.colors.info.main;
        break;
    }
    
    return `color: ${color};`;
  }}
`;

const MessageText = styled.div`
  flex: 1;
  font-size: ${props => props.theme.typography.body2.fontSize};
  font-weight: ${props => props.theme.typography.body2.fontWeight};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: ${SPACING.SM};
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  opacity: 0.7;
  transition: ${TRANSITION.DEFAULT};
  margin-left: ${SPACING.SM};
  
  &:hover, &:focus {
    opacity: 1;
    outline: none;
  }
`;

// Default icons for each alert type
const SuccessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const ErrorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// Get default icon based on alert type
const getDefaultIcon = (type: AlertType) => {
  switch (type) {
    case AlertType.SUCCESS:
      return <SuccessIcon />;
    case AlertType.ERROR:
      return <ErrorIcon />;
    case AlertType.WARNING:
      return <WarningIcon />;
    case AlertType.INFO:
    default:
      return <InfoIcon />;
  }
};

// Get appropriate ARIA attributes based on alert type
const getAriaAttributes = (type: AlertType) => {
  switch (type) {
    case AlertType.ERROR:
      return { role: 'alert', 'aria-live': 'assertive' };
    case AlertType.WARNING:
      return { role: 'alert', 'aria-live': 'polite' };
    case AlertType.SUCCESS:
    case AlertType.INFO:
    default:
      return { role: 'status', 'aria-live': 'polite' };
  }
};

/**
 * Alert component for displaying notifications, warnings, errors, and success messages
 * 
 * This component supports different alert types, auto-closing functionality,
 * and customizable styling. It includes appropriate accessibility attributes
 * based on the alert type.
 */
const Alert = ({
  id,
  type = AlertType.INFO,
  message,
  autoClose = true,
  duration = 5000,
  onClose,
  icon,
  className,
  ariaLabel
}: AlertProps) => {
  const [visible, setVisible] = useState(true);
  const { theme } = useTheme();

  // Handle auto-close functionality
  useEffect(() => {
    if (autoClose && visible) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) {
          onClose();
        }
      }, duration);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [autoClose, duration, onClose, visible]);

  // Handle close button click
  const handleClose = () => {
    setVisible(false);
    if (onClose) {
      onClose();
    }
  };

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  const ariaAttributes = getAriaAttributes(type);

  return (
    <AlertContainer
      id={id}
      className={classNames('alert', `alert-${type}`, className)}
      alertType={type}
      visible={visible}
      {...ariaAttributes}
      aria-label={ariaLabel || `${type} alert`}
    >
      <AlertContent>
        <IconContainer alertType={type}>
          {icon || getDefaultIcon(type)}
        </IconContainer>
        <MessageText>{message}</MessageText>
      </AlertContent>
      <CloseButton 
        onClick={handleClose}
        aria-label="Close alert"
      >
        <CloseIcon />
      </CloseButton>
    </AlertContainer>
  );
};

export default Alert;