/**
 * PostCSS Configuration for Personal AI Agent
 * 
 * This configures CSS processing for the application, including:
 * - Tailwind CSS for utility-first styling (v3.3.3)
 * - Autoprefixer for cross-browser compatibility (v10.4.16)
 * - CSS nesting and modern features via postcss-preset-env
 * - Additional optimizations for production builds
 */

module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
    [
      'postcss-preset-env',
      {
        stage: 3,
        features: {
          'nesting-rules': true,
          'custom-properties': true,
          'custom-media-queries': true
        },
        autoprefixer: {
          flexbox: 'no-2009',
          grid: 'autoplace'
        }
      }
    ],
    require('postcss-import'),
    require('postcss-flexbugs-fixes')
  ]
};