// family-connect-app/tailwind.config.js
const { addDynamicIconSelectors } = require('@iconify/tailwind');
const daisyui = require('daisyui');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    daisyui, 
    addDynamicIconSelectors(), 
    require('tailwind-scrollbar')({
      nocompatible: true,
      // preferredStrategy: 'pseudoelements',
    }),
  ],
  daisyui: {},
}