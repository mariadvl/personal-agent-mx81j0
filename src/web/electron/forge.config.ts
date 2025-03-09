import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import path from 'path';

/**
 * Electron Forge configuration for the Personal AI Agent desktop application
 * This defines build, packaging, and distribution settings for all supported platforms
 */
export default {
  // Configuration for electron-packager
  packagerConfig: {
    name: 'Personal AI Agent',
    executableName: 'personal-ai-agent',
    icon: './assets/icons/app-icon', // Platform-specific extension will be added automatically
    appBundleId: 'com.example.personalaiagent',
    appCategoryType: 'public.app-category.productivity',
    asar: true, // Package app source code into an archive for better performance
    extraResource: [
      './assets', // Include assets directory in the package
      '../backend/dist' // Include the Python backend distribution
    ],
    // macOS code signing configuration
    osxSign: {
      identity: 'Developer ID Application: Personal AI Agent Team',
      hardenedRuntime: true,
      entitlements: 'entitlements.plist',
      entitlementsInherit: 'entitlements.plist'
    }
  },
  
  // Configuration for electron-rebuild
  rebuildConfig: {
    onlyModules: [] // Specify modules that need rebuilding for the target platform
  },
  
  // Publishers configuration for release distribution
  publishers: [
    {
      name: 'GitHub',
      config: {
        repository: {
          owner: 'personal-ai-agent',
          name: 'personal-ai-agent'
        },
        prerelease: false,
        draft: true // Create draft releases for review before publishing
      }
    }
  ],
  
  // Makers configuration for creating installers for different platforms
  makers: [
    // Windows installer (Squirrel.Windows)
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'PersonalAIAgent',
        authors: 'Personal AI Agent Team',
        description: 'A local-first, memory-augmented AI companion with privacy-focused design',
        iconUrl: 'https://example.com/icon.ico', // URL to icon for installer
        setupIcon: './assets/icons/app-icon.ico',
        loadingGif: './assets/installer/loading.gif'
      }
    },
    // macOS disk image (DMG)
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'Personal AI Agent',
        icon: './assets/icons/app-icon.icns',
        background: './assets/installer/background.png',
        format: 'ULFO' // Universal macOS Format
      }
    },
    // ZIP archives for all platforms
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32']
    },
    // Debian Linux package
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Personal AI Agent Team',
          homepage: 'https://example.com',
          icon: './assets/icons/app-icon.png',
          categories: ['Utility', 'Artificial Intelligence']
        }
      }
    },
    // RPM Linux package
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          maintainer: 'Personal AI Agent Team',
          homepage: 'https://example.com',
          icon: './assets/icons/app-icon.png',
          categories: ['Utility', 'Artificial Intelligence']
        }
      }
    }
  ],
  
  // Plugins for extending forge functionality
  plugins: [
    // Automatically unpack native dependencies
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    },
    // Webpack for building and bundling
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.ts', // Config for the main process
        renderer: {
          config: './webpack.renderer.config.ts', // Config for the renderer process
          entryPoints: [
            {
              html: '../public/index.html',
              js: './renderer.ts',
              name: 'main_window',
              preload: {
                js: './preload.ts' // Preload script for renderer process
              }
            }
          ]
        },
        port: 3001, // Development server port
        loggerPort: 9001, // Logger port
        // Content Security Policy for development
        devContentSecurityPolicy: "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:; connect-src 'self' http://localhost:* ws://localhost:*"
      }
    }
  ],
  
  // Custom hooks for the build process
  hooks: {
    generateAssets: './scripts/generate-assets.ts', // Generate assets before packaging
    postPackage: './scripts/post-package.ts', // Run after packaging but before making installers
    postMake: './scripts/post-make.ts', // Run after making installers
    readPackageJson: './scripts/read-package-json.ts' // Modify package.json before packaging
  }
};