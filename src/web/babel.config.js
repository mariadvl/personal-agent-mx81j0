/**
 * Babel configuration for the Personal AI Agent web frontend
 * 
 * This configuration handles the transpilation of JavaScript and TypeScript code
 * to ensure compatibility across different environments including browsers, 
 * Node.js, and Electron.
 * 
 * @version 1.0.0
 */

module.exports = {
  presets: [
    // Transform modern JavaScript features to be compatible with target environments
    ['@babel/preset-env', {
      targets: {
        browsers: [
          'last 2 Chrome versions',
          'last 2 Firefox versions',
          'last 2 Safari versions',
          'last 2 Edge versions'
        ],
        node: '16'
      },
      // Automatically import polyfills based on usage
      useBuiltIns: 'usage',
      corejs: 3
    }],
    
    // TypeScript 5.0+ support
    ['@babel/preset-typescript', {
      isTSX: true,
      allExtensions: true
    }],
    
    // React JSX support
    ['@babel/preset-react', { 
      runtime: 'automatic', // Use the new JSX transform
      development: process.env.NODE_ENV !== 'production'
    }]
  ],
  
  plugins: [
    // Reuse Babel's helpers in runtime to reduce code size
    '@babel/plugin-transform-runtime'
  ],
  
  // Environment-specific configurations
  env: {
    // Jest test environment
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current' // Use current version of Node.js
          }
        }]
      ],
      plugins: [
        // Support for import.meta in test environment
        'babel-plugin-transform-import-meta'
      ]
    },
    
    // Production build environment
    production: {
      plugins: [
        // Remove PropTypes from production build to reduce size
        'babel-plugin-transform-react-remove-prop-types'
      ]
    },
    
    // Development environment
    development: {
      plugins: [
        // Enable React Fast Refresh for better development experience
        'react-refresh/babel'
      ]
    }
  }
};