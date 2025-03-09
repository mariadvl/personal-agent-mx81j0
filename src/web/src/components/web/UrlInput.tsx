import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Alert from '../ui/Alert';
import { validateUrlInput } from '../../utils/validators';
import { WebReaderState, WebReaderStatus, MAX_URL_LENGTH } from '../../types/web';
import { AlertType, ButtonVariant, ButtonSize, InputType } from '../../types/ui';

// Styled components for layout and spacing
const UrlInputContainer = styled.div`
  margin-bottom: 16px;
  width: 100%;
`;

const InputWrapper = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
`;

const WarningActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

// Interface defining the component props
interface UrlInputProps {
  onSubmit: (url: string) => void;
  webReaderState: WebReaderState;
  onExternalServiceWarningConfirm: () => void;
  initialUrl?: string;
  className?: string;
}

/**
 * Component for URL input with validation and external service warning
 * Provides a user interface for entering and validating URLs for web content extraction
 */
const UrlInput: React.FC<UrlInputProps> = ({
  onSubmit,
  webReaderState,
  onExternalServiceWarningConfirm,
  initialUrl = '',
  className,
}) => {
  // State for URL input and validation errors
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  
  // Determine if the component is in a loading/processing state
  const isLoading = 
    webReaderState.status === WebReaderStatus.LOADING || 
    webReaderState.status === WebReaderStatus.PROCESSING;

  // Handle URL input changes
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError(null); // Clear errors when input changes
  };

  // Validate URL when it changes
  useEffect(() => {
    if (url) {
      const validation = validateUrlInput(url);
      if (!validation.isValid) {
        setError(validation.errorMessage);
      } else {
        setError(null);
      }
    }
  }, [url]);

  // Handle form submission
  const handleSubmit = () => {
    // Validate before submitting
    const validation = validateUrlInput(url);
    if (!validation.isValid) {
      setError(validation.errorMessage);
      return;
    }
    
    onSubmit(url);
  };

  // Handle keyboard navigation and submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && !error && url.trim() !== '') {
      handleSubmit();
    }
  };

  // Handle external service warning confirmation
  const handleExternalServiceWarningConfirm = () => {
    onExternalServiceWarningConfirm();
  };

  return (
    <Card className={className}>
      <UrlInputContainer>
        <InputWrapper>
          <Input
            id="url-input"
            type={InputType.URL}
            value={url}
            onChange={handleUrlChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter a URL to extract content (e.g., https://example.com/article)"
            label="URL"
            error={error}
            disabled={isLoading}
            required
          />
          <Button
            variant={ButtonVariant.PRIMARY}
            size={ButtonSize.MEDIUM}
            onClick={handleSubmit}
            disabled={isLoading || !!error || !url.trim()}
            ariaLabel="Extract web content"
          >
            {isLoading ? 'Processing...' : 'Extract'}
          </Button>
        </InputWrapper>

        {/* External service warning alert */}
        {webReaderState.showExternalServiceWarning && (
          <Alert
            id="external-service-warning"
            type={AlertType.WARNING}
            message="This will send the URL to external services for content extraction."
            autoClose={false}
          />
        )}

        {/* Confirmation and cancel buttons for external service warning */}
        {webReaderState.showExternalServiceWarning && (
          <WarningActions>
            <Button 
              variant={ButtonVariant.OUTLINED}
              size={ButtonSize.MEDIUM}
              onClick={() => onSubmit('')} // Submit empty URL to effectively cancel
              ariaLabel="Cancel content extraction"
            >
              Cancel
            </Button>
            <Button 
              variant={ButtonVariant.PRIMARY}
              size={ButtonSize.MEDIUM}
              onClick={handleExternalServiceWarningConfirm}
              ariaLabel="Confirm content extraction using external service"
            >
              Continue
            </Button>
          </WarningActions>
        )}
      </UrlInputContainer>
    </Card>
  );
};

export default UrlInput;