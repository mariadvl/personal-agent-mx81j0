import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import { SelectProps, SelectOption } from '../../types/ui';
import { 
  INPUT_HEIGHT, 
  SPACING, 
  BORDER_RADIUS, 
  TRANSITION, 
  FONT_SIZE, 
  Z_INDEX,
  FOCUS_RING
} from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';
import { ThemeType } from '../../themes/theme';

// Interface for styled components props
interface SelectStyledProps {
  error?: boolean;
  disabled?: boolean;
  open?: boolean;
  hasValue?: boolean;
  selected?: boolean;
  theme: ThemeType;
}

// Styled components
const SelectContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: ${SPACING.MD};
  position: relative;
`;

const SelectLabel = styled.label<SelectStyledProps>`
  font-size: ${FONT_SIZE.SM};
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  margin-bottom: ${SPACING.XS};
  color: ${props => props.error ? props.theme.colors.error.main : props.theme.colors.text.primary};
`;

const SelectWrapper = styled.div<SelectStyledProps>`
  position: relative;
  width: 100%;
  height: ${INPUT_HEIGHT.MEDIUM};
  border: 1px solid ${props => 
    props.error 
      ? props.theme.colors.error.main 
      : props.disabled 
        ? props.theme.colors.action.disabledBackground 
        : props.theme.colors.border.main
  };
  border-radius: ${BORDER_RADIUS.MEDIUM};
  background-color: ${props => 
    props.disabled 
      ? props.theme.colors.action.disabledBackground 
      : props.theme.colors.background.paper
  };
  transition: ${TRANSITION.DEFAULT};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  
  &:focus-within, &.open {
    border-color: ${props => 
      props.error 
        ? props.theme.colors.error.main 
        : props.theme.colors.primary.main
    };
    box-shadow: ${FOCUS_RING};
  }
`;

const SelectDisplay = styled.div<SelectStyledProps>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 0 ${SPACING.SM};
  font-size: ${FONT_SIZE.MD};
  font-family: ${props => props.theme.typography.fontFamily};
  color: ${props => 
    props.hasValue 
      ? props.theme.colors.text.primary 
      : props.theme.colors.text.secondary
  };
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DropdownIcon = styled.div<SelectStyledProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => 
    props.disabled 
      ? props.theme.colors.text.disabled 
      : props.theme.colors.text.secondary
  };
  transition: ${TRANSITION.DEFAULT};
  transform: ${props => props.open ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const DropdownList = styled.ul<SelectStyledProps>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
  background-color: ${props => props.theme.colors.background.paper};
  border: 1px solid ${props => props.theme.colors.border.main};
  border-radius: ${BORDER_RADIUS.MEDIUM};
  box-shadow: ${props => props.theme.shadows.small};
  z-index: ${Z_INDEX.DROPDOWN};
  padding: ${SPACING.XS} 0;
  margin: 0;
  list-style: none;
`;

const DropdownItem = styled.li<SelectStyledProps>`
  padding: ${SPACING.SM} ${SPACING.SM};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-size: ${FONT_SIZE.MD};
  color: ${props => 
    props.disabled 
      ? props.theme.colors.text.disabled 
      : props.theme.colors.text.primary
  };
  background-color: ${props => 
    props.selected 
      ? props.theme.colors.action.selected 
      : 'transparent'
  };
  transition: ${TRANSITION.DEFAULT};
  
  &:hover {
    background-color: ${props => 
      !props.disabled && props.theme.colors.action.hover
    };
  }
`;

const ErrorMessage = styled.div<SelectStyledProps>`
  color: ${props => props.theme.colors.error.main};
  font-size: ${FONT_SIZE.SM};
  margin-top: ${SPACING.XS};
`;

/**
 * A customizable select component that displays a dropdown list of options
 */
const Select: React.FC<SelectProps> = ({ 
  id,
  options,
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  error,
  className
}) => {
  // State to track if dropdown is open
  const [isOpen, setIsOpen] = useState(false);
  
  // Reference to the select container for detecting outside clicks
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get the current theme
  const { theme } = useTheme();
  
  // Generate a unique ID if none is provided
  const selectId = id || React.useId();
  
  // Find the selected option to display its label
  const selectedOption = options.find(option => option.value === value);
  
  // Function to handle option selection
  const handleChange = (value: string) => {
    if (disabled) return;
    onChange(value);
    setIsOpen(false);
  };
  
  // Toggle dropdown open/closed
  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };
  
  // Handle clicks outside the component to close the dropdown
  const handleClickOutside = (event: MouseEvent) => {
    if (
      containerRef.current && 
      !containerRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };
  
  // Add event listener for outside clicks
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // Handle keyboard interactions
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        toggleDropdown();
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
        }
        break;
      case 'ArrowDown':
        if (!isOpen) {
          event.preventDefault();
          setIsOpen(true);
        }
        break;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  };
  
  return (
    <SelectContainer ref={containerRef} className={className}>
      {label && (
        <SelectLabel 
          htmlFor={selectId}
          error={!!error}
        >
          {label}
        </SelectLabel>
      )}
      
      <SelectWrapper 
        error={!!error}
        disabled={disabled}
        className={classNames({ open: isOpen })}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${selectId}-list`}
        role="combobox"
        aria-labelledby={label ? selectId : undefined}
        aria-disabled={disabled}
        aria-invalid={!!error}
      >
        <SelectDisplay hasValue={!!selectedOption}>
          {selectedOption ? selectedOption.label : placeholder || 'Select...'}
          <DropdownIcon 
            open={isOpen} 
            disabled={disabled}
            aria-hidden="true"
          >
            <svg 
              width="12" 
              height="8" 
              viewBox="0 0 12 8" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M1 1.5L6 6.5L11 1.5" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </DropdownIcon>
        </SelectDisplay>
      </SelectWrapper>
      
      {isOpen && (
        <DropdownList 
          id={`${selectId}-list`}
          role="listbox"
          aria-labelledby={label ? selectId : undefined}
        >
          {options.map((option) => (
            <DropdownItem
              key={option.value}
              selected={option.value === value}
              disabled={option.disabled}
              onClick={() => !option.disabled && handleChange(option.value)}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled}
            >
              {option.label}
            </DropdownItem>
          ))}
        </DropdownList>
      )}
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </SelectContainer>
  );
};

export default Select;