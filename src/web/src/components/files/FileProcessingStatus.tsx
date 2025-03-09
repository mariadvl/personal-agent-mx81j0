import React from 'react';
import styled from 'styled-components';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import { DocumentStatus } from '../../types/document';
import useTheme from '../../hooks/useTheme';

interface FileProcessingStatusProps {
  filename: string;
  status: DocumentStatus | null;
  progress: number;
  error: string | null;
  className?: string;
}

const StatusContainer = styled.div`
  padding: 16px;
`;

const FileName = styled.h3`
  margin-top: 0;
  margin-bottom: 8px;
  font-size: ${props => props.theme.typography.h6.fontSize};
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  color: ${props => props.theme.colors.text.primary};
`;

const StatusMessage = styled.div<{ $status: DocumentStatus | null }>`
  margin-bottom: 8px;
  font-size: ${props => props.theme.typography.body2.fontSize};
  color: ${props => 
    props.$status === 'completed' 
      ? props.theme.colors.success.main 
      : props.$status === 'failed'
        ? props.theme.colors.error.main
        : props.theme.colors.text.secondary
  };
`;

const ProgressContainer = styled.div`
  margin-top: 16px;
  margin-bottom: 16px;
`;

const ErrorMessage = styled.div`
  margin-top: 16px;
  color: ${props => props.theme.colors.error.main};
  font-size: ${props => props.theme.typography.body2.fontSize};
`;

const StatusIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const getStatusMessage = (status: DocumentStatus | null): string => {
  switch (status) {
    case 'pending':
      return 'Waiting to process...';
    case 'processing':
      return 'Processing document...';
    case 'completed':
      return 'Processing complete';
    case 'failed':
      return 'Processing failed';
    default:
      return 'Unknown status';
  }
};

const FileProcessingStatus = ({
  filename,
  status,
  progress,
  error,
  className
}: FileProcessingStatusProps): JSX.Element => {
  const { theme } = useTheme();
  
  const statusMessage = getStatusMessage(status);
  
  return (
    <Card className={className}>
      <StatusContainer>
        <FileName>{filename}</FileName>
        
        <StatusRow>
          <StatusMessage $status={status} aria-live="polite">{statusMessage}</StatusMessage>
        </StatusRow>
        
        {(status === 'processing' || status === 'pending') && (
          <ProgressContainer>
            <ProgressBar
              value={progress}
              max={100}
              showPercentage={true}
              aria-label={`Document processing progress for ${filename}`}
            />
          </ProgressContainer>
        )}
        
        {status === 'completed' && (
          <div aria-live="polite" role="status">
            Document has been successfully processed and is ready to use.
          </div>
        )}
        
        {status === 'failed' && error && (
          <ErrorMessage aria-live="assertive" role="alert">
            Error: {error}
          </ErrorMessage>
        )}
      </StatusContainer>
    </Card>
  );
};

export default FileProcessingStatus;