import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import { createPortal } from 'react-dom';

import { ModalProps, ModalSize } from '../../types/ui';
import Button from './Button';
import {
  MODAL_WIDTH,
  SPACING,
  BORDER_RADIUS,
  Z_INDEX,
  ANIMATION,
  SHADOW
} from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';
import { ThemeType } from '../../themes/theme';

// Interface for styled modal components props
interface StyledModalProps {
  theme: ThemeType;
  size: ModalSize;
}

// Styled components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${Z_INDEX.MODAL};
  animation: ${ANIMATION.FADE_IN};
  padding: ${SPACING.MD};
`;

const ModalContainer = styled.div<StyledModalProps>`
  background-color: ${props => props.theme.colors.background.paper};
  border-radius: ${BORDER_RADIUS.MEDIUM};
  box-shadow: ${SHADOW.LARGE};
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  width: ${props => MODAL_WIDTH[props.size]};
  max-width: 100%;
  animation: ${ANIMATION.FADE_IN};
  overflow: hidden;
`;

const ModalHeader = styled.div<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${SPACING.MD};
  border-bottom: 1px solid ${props => props.theme.colors.divider};
  background-color: ${props => props.theme.colors.background.default};
`;

const ModalTitle = styled.h2<{ theme: ThemeType }>`
  margin: 0;
  font-size: ${props => props.theme.typography.h6.fontSize};
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  color: ${props => props.theme.colors.text.primary};
`;

const ModalContent = styled.div`
  padding: ${SPACING.LG};
  overflow-y: auto;
  flex: 1;
`;

const ModalFooter = styled.div<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: ${SPACING.MD};
  border-top: 1px solid ${props => props.theme.colors.divider};
  background-color: ${props => props.theme.colors.background.default};
  gap: ${SPACING.MD};
`;

const CloseButton = styled.button<{ theme: ThemeType }>`
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${SPACING.MD};
  margin: -${SPACING.MD};
  color: ${props => props.theme.colors.text.secondary};
  transition: color 0.2s ease-in-out;
  
  &:hover, &:focus {
    color: ${props => props.theme.colors.text.primary};
    outline: none;
  }
`;

/**
 * A customizable modal component that provides a dialog overlay for important content
 * that requires user attention or interaction.
 */
const Modal = (props: ModalProps): JSX.Element | null => {
  const {
    isOpen,
    onClose,
    title,
    size = ModalSize.MEDIUM,
    children,
    footer,
    closeOnOverlayClick = true,
    className
  } = props;
  
  const { theme } = useTheme();
  const modalContentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  // Handle focus management when modal opens and closes
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element to restore focus when modal closes
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus the modal content
      if (modalContentRef.current) {
        modalContentRef.current.focus();
      }
      
      // Return cleanup function to restore focus when modal closes
      return () => {
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen]);
  
  // Handle keyboard events (Escape key to close)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isOpen && event.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
  
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);
  
  // Handle overlay click to close modal if enabled
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };
  
  // Return null if modal is not open
  if (!isOpen) {
    return null;
  }
  
  // Portal the modal to the end of the document body to avoid stacking context issues
  return createPortal(
    <ModalOverlay onClick={handleOverlayClick} data-testid="modal-overlay">
      <ModalContainer 
        size={size} 
        className={classNames('modal', className)}
        theme={theme}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {title && (
          <ModalHeader theme={theme}>
            <ModalTitle id="modal-title" theme={theme}>{title}</ModalTitle>
            <CloseButton 
              onClick={onClose} 
              aria-label="Close modal"
              theme={theme}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" 
                  fill="currentColor"/>
              </svg>
            </CloseButton>
          </ModalHeader>
        )}
        
        <ModalContent 
          ref={modalContentRef} 
          tabIndex={-1}
        >
          {children}
        </ModalContent>
        
        {footer && (
          <ModalFooter theme={theme}>
            {footer}
          </ModalFooter>
        )}
      </ModalContainer>
    </ModalOverlay>,
    document.body
  );
};

export default Modal;