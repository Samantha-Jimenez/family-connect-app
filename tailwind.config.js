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
      colors: {
        'palm-green': '#3E7A4E',
        'forest-green': '#2E6E49',
        'british-racing-green': '#16442D',
        'dark-spring-green': '#227D54',
        'plantain-green': '#5CAB68',
        'tea-green': '#C8D5B9',
        'sand-beige': '#E8D4B8',
        'golden-sand': '#F4C47A',
        'cocoa-brown': '#6B3E2E',
        'terracotta-red': '#D94E2B',
        'engineering-orange': '#BC2C1A',
        'moonstone': '#53A2BE',
        'blue-ncs': '#1D84B5',
        'lime': '#D2FF28',
        'carrot-orange': '#EA9010',
        'giants-orange': '#F05D23'
      },
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
  ],
  daisyui: {
    // themes: [
    //   {
    //     familyconnect: {
    //       primary: '#FF6B35', // mango-orange
    //       secondary: '#3E7A4E', // palm-green
    //       accent: '#F4C47A', // golden-sand
    //       neutral: '#6B3E2E', // cocoa-brown
    //       'base-100': '#E8D4B8', // sand-beige
    //       info: '#CFE0D6', // sea-mist
    //       success: '#3E7A4E',
    //       warning: '#F4C47A',
    //       error: '#FF886A',
    //     },
    //   },
    // ],
  },
}