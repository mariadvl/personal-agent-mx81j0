import React from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { FiMessageSquare, FiUpload, FiGlobe } from 'react-icons/fi';

import Button from '../ui/Button';
import Card from '../ui/Card';
import { useUIStore } from '../../store/uiStore';
import { SPACING } from '../../constants/uiConstants';
import { ButtonVariant } from '../../types/ui';

const ActionsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${SPACING.MD};
  margin-top: ${SPACING.MD};
`;

const ActionButton = styled(Button)`
  min-width: 120px;
  @media (max-width: 768px) {
    min-width: 100px;
  }
`;

/**
 * Renders a set of quick action buttons for common tasks
 */
const QuickActions = () => {
  const router = useRouter();
  const setActiveTab = useUIStore(state => state.setActiveTab);

  /**
   * Handles navigation to the new chat page
   */
  const handleNewChat = () => {
    setActiveTab('chat');
    router.push('/chat');
  };

  /**
   * Handles navigation to the files page
   */
  const handleUploadFile = () => {
    setActiveTab('files');
    router.push('/files');
  };

  /**
   * Handles navigation to the web page
   */
  const handleWebSearch = () => {
    setActiveTab('web');
    router.push('/web');
  };

  return (
    <Card title="Quick Actions">
      <ActionsContainer>
        <ActionButton
          variant={ButtonVariant.PRIMARY}
          startIcon={<FiMessageSquare />}
          onClick={handleNewChat}
        >
          New Chat
        </ActionButton>
        
        <ActionButton 
          variant={ButtonVariant.PRIMARY}
          startIcon={<FiUpload />}
          onClick={handleUploadFile}
        >
          Upload File
        </ActionButton>
        
        <ActionButton
          variant={ButtonVariant.PRIMARY}
          startIcon={<FiGlobe />}
          onClick={handleWebSearch}
        >
          Web Search
        </ActionButton>
      </ActionsContainer>
    </Card>
  );
};

export default QuickActions;