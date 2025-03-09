/**
 * Entry point for the Personal AI Agent React Native mobile application.
 * This file registers the main App component with the React Native AppRegistry and handles any global initialization required before the app renders.
 */

import { AppRegistry, LogBox } from 'react-native'; // react-native 0.72.0+
import App from './App'; // Main application component

// Name of the application used for registration with AppRegistry
const APP_NAME = 'PersonalAIAgent';

if (__DEV__) {
  LogBox.ignoreLogs([
    'Remote debugger',
    'Require cycle:',
    'AsyncStorage has been extracted'
  ]);
}

AppRegistry.registerComponent(APP_NAME, () => App);