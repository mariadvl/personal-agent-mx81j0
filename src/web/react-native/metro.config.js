/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * This file configures the Metro bundler used by React Native to transform and bundle
 * JavaScript code for the Personal AI Agent mobile application.
 * 
 * @version 1.0.0
 */

const { getDefaultConfig } = require('metro-config'); // v0.76.7
const path = require('path');

module.exports = async () => {
  // Get the default Metro configuration first
  const {
    resolver: { sourceExts, assetExts },
    transformer,
    server,
    cacheStores,
  } = await getDefaultConfig();

  return {
    transformer: {
      ...transformer,
      // Configure Babel transformation options for better performance
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
    
    resolver: {
      // Add TypeScript extensions to support .ts and .tsx files
      sourceExts: [...sourceExts, 'ts', 'tsx'],
      
      // Use default asset extensions for images, fonts, etc.
      assetExts: [...assetExts],
      
      // Configure module resolution aliases for cleaner imports and better organization
      extraNodeModules: {
        // UI components and screens
        '@components': path.resolve(__dirname, 'src/components'),
        '@screens': path.resolve(__dirname, 'src/screens'),
        
        // Core functionality
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@services': path.resolve(__dirname, 'src/services'),
        
        // Resources
        '@assets': path.resolve(__dirname, 'src/assets'),
        
        // Personal AI Agent specific modules
        '@conversation': path.resolve(__dirname, 'src/conversation'),
        '@memory': path.resolve(__dirname, 'src/memory'),
        '@voice': path.resolve(__dirname, 'src/voice'),
        '@documents': path.resolve(__dirname, 'src/documents'),
        '@settings': path.resolve(__dirname, 'src/settings'),
        '@search': path.resolve(__dirname, 'src/search'),
      },
    },
    
    // Allow importing from shared code in the parent directory
    // This enables code sharing between web and mobile platforms
    watchFolders: [
      path.resolve(__dirname, '../..'), // Access to shared code outside the React Native directory
    ],
    
    // Use default server configuration
    server,
    
    // Use default cache stores for better performance
    cacheStores,
    
    // Set worker count to optimize build performance
    // This helps with build times on CI systems and developer machines
    maxWorkers: process.env.MAX_WORKERS || 2,
  };
};