import { Platform, Alert, Linking } from 'react-native'; // React Native v0.72.0
import * as Permissions from 'expo-permissions'; // Expo Permissions v14.0.0
import * as MediaLibrary from 'expo-media-library'; // Expo Media Library v15.0.0
import { Audio } from 'expo-av'; // Expo AV v13.0.0

/**
 * Checks if the application has permission to access the device's microphone
 * @returns Promise resolving to true if permission is granted, false otherwise
 */
export const checkMicrophonePermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      const { status } = await Audio.getPermissionsAsync();
      return status === 'granted';
    } else {
      const { status } = await Permissions.getAsync(Permissions.AUDIO_RECORDING);
      return status === 'granted';
    }
  } catch (error) {
    console.error('Error checking microphone permission:', error);
    return false;
  }
};

/**
 * Requests permission to access the device's microphone
 * @returns Promise resolving to true if permission is granted, false otherwise
 */
export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } else {
      const { status } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
      return status === 'granted';
    }
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return false;
  }
};

/**
 * Checks if the application has permission to access device storage
 * @returns Promise resolving to true if permission is granted, false otherwise
 */
export const checkStoragePermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      const { status } = await MediaLibrary.getPermissionsAsync();
      return status === 'granted';
    } else {
      const { status } = await Permissions.getAsync(Permissions.MEDIA_LIBRARY);
      return status === 'granted';
    }
  } catch (error) {
    console.error('Error checking storage permission:', error);
    return false;
  }
};

/**
 * Requests permission to access device storage
 * @returns Promise resolving to true if permission is granted, false otherwise
 */
export const requestStoragePermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === 'granted';
    } else {
      const { status } = await Permissions.askAsync(Permissions.MEDIA_LIBRARY);
      return status === 'granted';
    }
  } catch (error) {
    console.error('Error requesting storage permission:', error);
    return false;
  }
};

/**
 * Shows an alert explaining why a permission is needed and how to grant it
 * @param permissionType The type of permission being requested (e.g., 'microphone', 'storage')
 * @param message Custom message explaining why the permission is needed
 * @returns Promise that resolves when the alert is handled
 */
export const showPermissionExplanation = async (
  permissionType: string,
  message?: string
): Promise<void> => {
  const title = `${permissionType.charAt(0).toUpperCase() + permissionType.slice(1)} Permission Required`;
  
  const defaultMessages: Record<string, string> = {
    microphone: 'This permission is required for voice conversations with the AI assistant.',
    storage: 'This permission is required to access and process documents.',
    camera: 'This permission is required to scan documents or take photos.'
  };
  
  const explanationMessage = message || defaultMessages[permissionType.toLowerCase()] || 
    'This permission is required for the app to function properly.';
  
  return new Promise((resolve) => {
    Alert.alert(
      title,
      `${explanationMessage}\n\nPlease enable this permission in your device settings.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve()
        },
        {
          text: 'Settings',
          onPress: () => {
            Linking.openSettings();
            resolve();
          }
        }
      ]
    );
  });
};

/**
 * Gets the current status of a specific permission
 * @param permissionType The type of permission to check ('microphone', 'storage', 'camera')
 * @returns Promise resolving to permission status ('granted', 'denied', or 'undetermined')
 */
export const getPermissionStatus = async (permissionType: string): Promise<string> => {
  try {
    switch (permissionType.toLowerCase()) {
      case 'microphone':
        if (Platform.OS === 'ios') {
          const { status } = await Audio.getPermissionsAsync();
          return status;
        } else {
          const { status } = await Permissions.getAsync(Permissions.AUDIO_RECORDING);
          return status;
        }
      
      case 'storage':
        if (Platform.OS === 'ios') {
          const { status } = await MediaLibrary.getPermissionsAsync();
          return status;
        } else {
          const { status } = await Permissions.getAsync(Permissions.MEDIA_LIBRARY);
          return status;
        }
      
      case 'camera':
        const { status } = await Permissions.getAsync(Permissions.CAMERA);
        return status;
      
      default:
        console.warn(`Unknown permission type: ${permissionType}`);
        return 'undetermined';
    }
  } catch (error) {
    console.error(`Error getting ${permissionType} permission status:`, error);
    return 'undetermined';
  }
};

/**
 * Generic function to request a specific permission
 * @param permissionType The type of permission to request ('microphone', 'storage', 'camera')
 * @returns Promise resolving to true if permission is granted, false otherwise
 */
export const requestPermission = async (permissionType: string): Promise<boolean> => {
  try {
    switch (permissionType.toLowerCase()) {
      case 'microphone':
        return await requestMicrophonePermission();
      
      case 'storage':
        return await requestStoragePermission();
      
      case 'camera':
        const { status } = await Permissions.askAsync(Permissions.CAMERA);
        return status === 'granted';
      
      default:
        console.warn(`Unknown permission type: ${permissionType}`);
        return false;
    }
  } catch (error) {
    console.error(`Error requesting ${permissionType} permission:`, error);
    return false;
  }
};