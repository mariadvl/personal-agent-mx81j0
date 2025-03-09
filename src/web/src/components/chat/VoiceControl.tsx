import React, { useState, useEffect, useCallback, useRef } from 'react'; // react version ^18.2.0
import styled from 'styled-components'; // styled-components version ^5.3.10
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid'; // @heroicons/react version ^2.0.18

import Button from '../ui/Button';
import { ButtonVariant, ButtonSize } from '../../types/ui';
import Tooltip from '../ui/Tooltip';
import useVoice from '../../hooks/useVoice';
import { VoiceState, VoiceControlProps, TranscriptionRequest } from '../../types/voice';

/**
 * Interface for the audio visualization component properties.
 */
interface AudioVisualizationProps {
  /**
   * Audio level value between 0 and 1.
   */
  level: number;
}

/**
 * Container for the voice control button and visualization.
 */
const VoiceControlContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

/**
 * Circular visualization of audio levels during recording.
 */
const AudioVisualization = styled.div<AudioVisualizationProps>`
  position: absolute;
  border-radius: 50%;
  transform: scale(${props => 1 + props.level * 0.5});
  opacity: ${props => 0.2 + props.level * 0.3};
  background-color: ${props => props.theme.colors.primary.main};
  transition: transform 0.1s ease-out, opacity 0.1s ease-out;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

/**
 * Pulsing dot animation for processing state.
 */
const PulsingDot = styled.div`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.primary.main};
  top: 0;
  right: 0;
  animation: pulse 1.5s infinite ease-in-out;

  @keyframes pulse {
    0% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.2);
      opacity: 1;
    }
    100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
  }
`;

/**
 * A component that provides voice recording and transcription functionality.
 */
const VoiceControl: React.FC<VoiceControlProps> = (props) => {
  // Destructure props to get onTranscription, disabled, className, showTooltip, size, and transcriptionOptions
  const {
    onTranscription,
    disabled,
    className,
    showTooltip = true, // Set default value for showTooltip
    size = ButtonSize.MEDIUM, // Set default value for size
    transcriptionOptions
  } = props;

  // Get voice capabilities and state from useVoice hook
  const {
    state,
    isListening,
    isProcessing,
    audioLevel,
    transcript,
    error,
    startListening,
    stopListening,
    cancelListening,
    isSupported
  } = useVoice();

  // Create a memoized handler for toggling voice recording
  const toggleRecording = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening(transcriptionOptions);
    }
  }, [isListening, startListening, stopListening, transcriptionOptions]);

  // Create a memoized handler for handling transcription completion
  const handleCancel = useCallback(() => {
    cancelListening();
  }, [cancelListening]);

  // Set up effect to call onTranscription when transcript is available
  useEffect(() => {
    if (transcript && state === VoiceState.IDLE) {
      onTranscription(transcript);
    }
  }, [transcript, state, onTranscription]);

  // Set up effect to handle errors with appropriate UI feedback
  useEffect(() => {
    if (error) {
      console.error('Voice control error:', error);
      // Implement error handling logic here, e.g., display an error message
    }
  }, [error]);

  // Determine button color based on voice state (red when recording, error state, etc.)
  let buttonColor = ButtonVariant.PRIMARY;
  if (isListening) {
    buttonColor = ButtonVariant.SECONDARY;
  } else if (error) {
    buttonColor = ButtonVariant.ERROR;
  }

  // Render a container with the microphone button and audio visualization
  return (
    <VoiceControlContainer className={className}>
      {/* Show audio level visualization when listening */}
      {isListening && <AudioVisualization level={audioLevel} />}

      {/* Show different icons based on voice state (microphone or stop icon) */}
      <Tooltip content={isSupported ? (isListening ? 'Stop Listening' : 'Start Listening') : 'Voice not supported'} position="top" disabled={!showTooltip}>
        <Button
          variant={buttonColor}
          size={size}
          onClick={toggleRecording}
          disabled={!isSupported || disabled}
          aria-label={isListening ? 'Stop Listening' : 'Start Listening'}
          startIcon={isListening ? <StopIcon width={20} height={20} /> : <MicrophoneIcon width={20} height={20} />}
        >
          {/* Apply appropriate ARIA attributes for accessibility */}
          {isListening ? 'Stop' : 'Speak'}
        </Button>
      </Tooltip>

      {/* Show pulsing dot animation when processing */}
      {isProcessing && <PulsingDot />}
    </VoiceControlContainer>
  );
};

export default VoiceControl;