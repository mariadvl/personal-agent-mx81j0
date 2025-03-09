import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Animated, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // react-native-vector-icons v9.0.0

import createVoiceService, { startListening, stopListening, cancelListening, addEventListener, removeEventListener } from '../services/voiceService';
import { VoiceState, VoiceControlProps, TranscriptionRequest } from '../../src/types/voice';
import { checkMicrophonePermission, requestMicrophonePermission } from '../utils/permissions';
import { useTheme } from '../theme/theme';

const VoiceControl: React.FC<VoiceControlProps> = ({
  onTranscription,
  disabled = false,
  transcriptionOptions,
}) => {
  // Get current theme
  const { theme } = useTheme();
  
  // State for voice interaction
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.IDLE);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // References
  const voiceServiceRef = useRef<ReturnType<typeof createVoiceService> | null>(null);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  
  // Setup animation for microphone pulse effect
  useEffect(() => {
    let animation: Animated.CompositeAnimation;
    
    if (voiceState === VoiceState.LISTENING) {
      // Create a repeating pulse animation
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      animation.start();
    } else {
      // Reset animation when not recording
      animation = Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      });
      animation.start();
    }
    
    return () => {
      animation.stop();
    };
  }, [voiceState, pulseAnimation]);
  
  // Check microphone permission
  const checkPermission = useCallback(async () => {
    const permission = await checkMicrophonePermission();
    setHasPermission(permission);
    return permission;
  }, []);
  
  // Request microphone permission
  const requestPermission = useCallback(async () => {
    const granted = await requestMicrophonePermission();
    setHasPermission(granted);
    return granted;
  }, []);
  
  // Voice state change handler
  const handleStateChange = useCallback((state: VoiceState) => {
    setVoiceState(state);
  }, []);
  
  // Transcription result handler
  const handleTranscription = useCallback((text: string) => {
    if (onTranscription) {
      onTranscription(text);
    }
  }, [onTranscription]);
  
  // Start voice recording
  const startRecording = useCallback(async () => {
    // Check and request permission if needed
    const hasPermission = await checkPermission();
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access in your device settings to use voice features.'
        );
        return;
      }
    }
    
    // Initialize voice service if not already done
    if (!voiceServiceRef.current) {
      voiceServiceRef.current = createVoiceService();
    }
    
    // Start listening
    await voiceServiceRef.current.startListening();
  }, [checkPermission, requestPermission]);
  
  // Stop recording and process transcription
  const stopRecording = useCallback(async () => {
    if (!voiceServiceRef.current) return;
    
    try {
      const text = await voiceServiceRef.current.stopListening();
      if (text && onTranscription) {
        onTranscription(text);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert('Transcription Error', 'Failed to process your speech. Please try again.');
    }
  }, [onTranscription]);
  
  // Handle microphone button press
  const handlePress = useCallback(() => {
    if (disabled) return;
    
    if (voiceState === VoiceState.IDLE) {
      startRecording();
    } else if (voiceState === VoiceState.LISTENING) {
      stopRecording();
    }
  }, [voiceState, disabled, startRecording, stopRecording]);
  
  // Initialize voice service and set up event listeners
  useEffect(() => {
    const initVoiceService = async () => {
      // Check permission initially
      await checkPermission();
      
      // Create voice service
      voiceServiceRef.current = createVoiceService();
      
      // Add event listeners
      if (voiceServiceRef.current) {
        voiceServiceRef.current.addEventListener('stateChange', handleStateChange);
        voiceServiceRef.current.addEventListener('transcription', handleTranscription);
      }
    };
    
    initVoiceService();
    
    // Cleanup on unmount
    return () => {
      if (voiceServiceRef.current) {
        // Remove event listeners
        voiceServiceRef.current.removeEventListener('stateChange', handleStateChange);
        voiceServiceRef.current.removeEventListener('transcription', handleTranscription);
        
        // Cancel any ongoing listening
        if (voiceState === VoiceState.LISTENING) {
          voiceServiceRef.current.cancelListening();
        }
      }
    };
  }, [checkPermission, handleStateChange, handleTranscription, voiceState]);
  
  return (
    <View style={styles.container}>
      {voiceState === VoiceState.LISTENING && (
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              width: pulseAnimation.interpolate({
                inputRange: [1, 1.3],
                outputRange: [50, 65], // 50px to 65px
              }),
              height: pulseAnimation.interpolate({
                inputRange: [1, 1.3],
                outputRange: [50, 65], // 50px to 65px
              }),
            },
          ]}
        />
      )}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: getButtonColor(voiceState, theme) },
          disabled && { opacity: 0.5 },
        ]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Icon 
          name={getIconName(voiceState)} 
          size={24} 
          style={styles.icon} 
        />
      </TouchableOpacity>
    </View>
  );
};

// Helper function to determine button color based on voice state
const getButtonColor = (state: VoiceState, theme: any) => {
  switch (state) {
    case VoiceState.LISTENING:
      return theme.colors.error.main; // Red for recording
    case VoiceState.PROCESSING:
      return theme.colors.warning.main; // Yellow for processing
    case VoiceState.ERROR:
      return theme.colors.error.main; // Red for error
    default:
      return theme.colors.primary.main; // Primary color for idle
  }
};

// Helper function to determine icon name based on voice state
const getIconName = (state: VoiceState) => {
  switch (state) {
    case VoiceState.LISTENING:
      return 'microphone';
    case VoiceState.PROCESSING:
      return 'loading';
    case VoiceState.ERROR:
      return 'microphone-off';
    default:
      return 'microphone-outline';
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
  },
  icon: {
    color: 'white',
  },
});

export default VoiceControl;