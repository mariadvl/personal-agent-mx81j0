const path = require('path'); // Node.js path module v18.0.0+

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class', // Enables dark mode with class-based approach
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C5CE7', // Main primary color
          light: '#8C7CFF',   // Lighter shade for hover states
          dark: '#5549C0',    // Darker shade for active states
        },
        secondary: {
          DEFAULT: '#00B894', // Main secondary color
          light: '#1DD1A1',   // Lighter shade for hover states
          dark: '#009B7D',    // Darker shade for active states
        },
        error: {
          DEFAULT: '#E64C4C', // Error state
          light: '#FF6B6B',   // Light error for backgrounds
          dark: '#C03A3A',    // Dark error for active states
        },
        warning: {
          DEFAULT: '#E0B050', // Warning state
          light: '#FDCB6E',   // Light warning for backgrounds
          dark: '#C99A3C',    // Dark warning for active states
        },
        info: {
          DEFAULT: '#5A9AE0', // Information state
          light: '#74B9FF',   // Light info for backgrounds
          dark: '#4A7FB8',    // Dark info for active states
        },
        success: {
          DEFAULT: '#41D0A5', // Success state
          light: '#55EFC4',   // Light success for backgrounds
          dark: '#36B08C',    // Dark success for active states
        },
        background: {
          DEFAULT: '#F5F6FA', // Default background
          paper: '#FFFFFF',   // Card/paper background
          elevated: '#FFFFFF', // Elevated surface background
          dark: '#1E272E',    // Dark mode background
          'dark-paper': '#2D3436', // Dark mode card/paper
          'dark-elevated': '#3D4852', // Dark mode elevated surface
        },
        text: {
          primary: '#1E272E',   // Primary text color (WCAG AA compliant)
          secondary: '#2D3436', // Secondary text color
          disabled: '#95A5A6',  // Disabled text color
          hint: '#B2BEC3',      // Hint text color
        },
        privacy: {
          local: '#00B894',    // Green for local data indication
          external: '#E0B050', // Yellow for external services indication
          warning: '#E64C4C',  // Red for privacy warning indication
        },
      },
      fontFamily: {
        sans: [
          "'Inter'",
          '-apple-system',
          'BlinkMacSystemFont',
          "'Segoe UI'",
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          "'Open Sans'",
          "'Helvetica Neue'",
          'sans-serif',
        ],
      },
      fontSize: {
        'xs': '0.75rem',    // 12px
        'sm': '0.875rem',   // 14px
        'base': '1rem',     // 16px
        'lg': '1.125rem',   // 18px
        'xl': '1.25rem',    // 20px
        '2xl': '1.5rem',    // 24px
        '3xl': '1.875rem',  // 30px
        '4xl': '2.25rem',   // 36px
        '5xl': '3rem',      // 48px
      },
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',   // 2px
        DEFAULT: '0.25rem', // 4px
        'md': '0.375rem',   // 6px
        'lg': '0.5rem',     // 8px
        'xl': '0.75rem',    // 12px
        '2xl': '1rem',      // 16px
        'full': '9999px',   // Fully rounded
      },
      boxShadow: {
        'sm': '0 2px 8px rgba(0, 0, 0, 0.1)',
        DEFAULT: '0 4px 12px rgba(0, 0, 0, 0.15)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.2)',
        'dark-sm': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'dark-lg': '0 8px 24px rgba(0, 0, 0, 0.5)',
      },
      spacing: {
        '0': '0',
        '1': '0.25rem',   // 4px
        '2': '0.5rem',    // 8px
        '3': '0.75rem',   // 12px
        '4': '1rem',      // 16px
        '5': '1.25rem',   // 20px
        '6': '1.5rem',    // 24px
        '8': '2rem',      // 32px
        '10': '2.5rem',   // 40px
        '12': '3rem',     // 48px
        '16': '4rem',     // 64px
        '20': '5rem',     // 80px
        '24': '6rem',     // 96px
        '32': '8rem',     // 128px
        '40': '10rem',    // 160px
        '48': '12rem',    // 192px
        '56': '14rem',    // 224px
        '64': '16rem',    // 256px
      },
      screens: {
        'sm': '640px',    // Small devices (mobile landscape)
        'md': '768px',    // Medium devices (tablets)
        'lg': '1024px',   // Large devices (desktops)
        'xl': '1280px',   // Extra large devices (large desktops)
        '2xl': '1536px',  // Extra extra large devices
      },
      transitionProperty: {
        DEFAULT: 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
        colors: 'background-color, border-color, color, fill, stroke',
        opacity: 'opacity',
        shadow: 'box-shadow',
        transform: 'transform',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
        linear: 'linear',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        out: 'cubic-bezier(0.0, 0, 0.2, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        DEFAULT: '300ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),      // Provides better form styling
    require('@tailwindcss/typography'), // Provides styling for prose content
    require('tailwindcss-animate'),     // Provides animation utilities
  ],
};