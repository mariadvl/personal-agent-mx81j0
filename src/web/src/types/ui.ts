import React from 'react';

/**
 * Defines the types of alerts that can be displayed in the application.
 */
export enum AlertType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Defines the visual variants of buttons.
 */
export enum ButtonVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  OUTLINED = 'outlined',
  TEXT = 'text',
  ICON = 'icon'
}

/**
 * Defines the possible button sizes.
 */
export enum ButtonSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

/**
 * Defines the available sizes for modal dialogs.
 */
export enum ModalSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  FULL = 'full'
}

/**
 * Defines the orientation options for tab navigation.
 */
export enum TabOrientation {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical'
}

/**
 * Defines the types of input fields.
 */
export enum InputType {
  TEXT = 'text',
  PASSWORD = 'password',
  EMAIL = 'email',
  NUMBER = 'number',
  URL = 'url'
}

/**
 * Defines the possible positions for tooltips.
 */
export enum TooltipPosition {
  TOP = 'top',
  RIGHT = 'right',
  BOTTOM = 'bottom',
  LEFT = 'left'
}

/**
 * Props for the Alert component.
 */
export interface AlertProps {
  /** Unique identifier for the alert */
  id: string;
  /** Type of alert which affects its styling and icon */
  type: AlertType;
  /** Message to display in the alert */
  message: string;
  /** Whether the alert should automatically close after a duration */
  autoClose?: boolean;
  /** Duration in milliseconds before auto-closing (if autoClose is true) */
  duration?: number;
  /** Callback function when the alert is closed */
  onClose?: () => void;
  /** Optional icon to display with the alert */
  icon?: React.ReactNode;
  /** Additional CSS class names */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Props for the Button component.
 */
export interface ButtonProps {
  /** Visual style variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button should take up the full width of its container */
  fullWidth?: boolean;
  /** Icon to display at the start/left of the button text */
  startIcon?: React.ReactNode;
  /** Icon to display at the end/right of the button text */
  endIcon?: React.ReactNode;
  /** Click handler function */
  onClick?: () => void;
  /** Button content */
  children?: React.ReactNode;
  /** Additional CSS class names */
  className?: string;
  /** HTML button type attribute */
  type?: 'button' | 'submit' | 'reset';
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Props for the Modal component.
 */
export interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback function when the modal is closed */
  onClose: () => void;
  /** Title displayed in the modal header */
  title?: string;
  /** Size of the modal */
  size?: ModalSize;
  /** Modal content */
  children?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Whether clicking the overlay should close the modal */
  closeOnOverlayClick?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Structure for a tab item in the Tabs component.
 */
export interface Tab {
  /** Unique identifier for the tab */
  id: string;
  /** Text label for the tab */
  label: string;
  /** Optional icon for the tab */
  icon?: React.ReactNode;
  /** Whether the tab is disabled */
  disabled?: boolean;
}

/**
 * Props for the Tabs component.
 */
export interface TabsProps {
  /** Array of tab items */
  tabs: Tab[];
  /** ID of the currently active tab */
  activeTab: string;
  /** Callback function when a tab is selected */
  onChange: (tabId: string) => void;
  /** Orientation of the tabs (horizontal or vertical) */
  orientation?: TabOrientation;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Props for the Input component.
 */
export interface InputProps {
  /** Unique identifier for the input */
  id: string;
  /** Type of input field */
  type?: InputType;
  /** Current value of the input */
  value: string;
  /** Change handler function */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Label text */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input is required */
  required?: boolean;
  /** Icon to display at the start/left of the input */
  startIcon?: React.ReactNode;
  /** Icon to display at the end/right of the input */
  endIcon?: React.ReactNode;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Props for the Checkbox component.
 */
export interface CheckboxProps {
  /** Unique identifier for the checkbox */
  id: string;
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Change handler function */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Label text */
  label?: string;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Structure for a radio option in the RadioGroup component.
 */
export interface RadioOption {
  /** Value of the radio option */
  value: string;
  /** Label text for the radio option */
  label: string;
  /** Whether the radio option is disabled */
  disabled?: boolean;
}

/**
 * Props for the RadioGroup component.
 */
export interface RadioGroupProps {
  /** Name attribute for the radio group */
  name: string;
  /** Array of radio options */
  options: RadioOption[];
  /** Currently selected value */
  value: string;
  /** Change handler function */
  onChange: (value: string) => void;
  /** Whether the entire radio group is disabled */
  disabled?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Structure for a select option in the Select component.
 */
export interface SelectOption {
  /** Value of the select option */
  value: string;
  /** Label text for the select option */
  label: string;
  /** Whether the select option is disabled */
  disabled?: boolean;
}

/**
 * Props for the Select component.
 */
export interface SelectProps {
  /** Unique identifier for the select */
  id: string;
  /** Array of select options */
  options: SelectOption[];
  /** Currently selected value */
  value: string;
  /** Change handler function */
  onChange: (value: string) => void;
  /** Label text */
  label?: string;
  /** Placeholder text when no option is selected */
  placeholder?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Props for the Slider component.
 */
export interface SliderProps {
  /** Unique identifier for the slider */
  id: string;
  /** Current value of the slider */
  value: number;
  /** Change handler function */
  onChange: (value: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment value */
  step?: number;
  /** Label text */
  label?: string;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Props for the Toggle component.
 */
export interface ToggleProps {
  /** Unique identifier for the toggle */
  id: string;
  /** Whether the toggle is checked/on */
  checked: boolean;
  /** Change handler function */
  onChange: (checked: boolean) => void;
  /** Label text */
  label?: string;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Props for the Tooltip component.
 */
export interface TooltipProps {
  /** Content to display in the tooltip */
  content: React.ReactNode;
  /** Position of the tooltip relative to its target */
  position?: TooltipPosition;
  /** The element that triggers the tooltip */
  children: React.ReactNode;
  /** Delay in milliseconds before showing the tooltip */
  delay?: number;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Props for the Card component.
 */
export interface CardProps {
  /** Title displayed in the card header */
  title?: string;
  /** Card content */
  children?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Additional CSS class names */
  className?: string;
  /** Click handler function */
  onClick?: () => void;
}

/**
 * Props for the ProgressBar component.
 */
export interface ProgressBarProps {
  /** Current value of the progress */
  value: number;
  /** Maximum value (100% progress) */
  max?: number;
  /** Label text */
  label?: string;
  /** Whether to display the percentage value */
  showPercentage?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Props for the Avatar component.
 */
export interface AvatarProps {
  /** Image source URL */
  src?: string;
  /** Alternative text for the image */
  alt?: string;
  /** Size in pixels */
  size?: number;
  /** Text to display when no image is available */
  text?: string;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Props for the Badge component.
 */
export interface BadgeProps {
  /** Content to display in the badge */
  content: React.ReactNode;
  /** Badge color */
  color?: string;
  /** The element that the badge is attached to */
  children?: React.ReactNode;
  /** Additional CSS class names */
  className?: string;
}