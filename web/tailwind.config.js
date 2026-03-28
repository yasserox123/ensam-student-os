/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core background system
        bg: {
          DEFAULT: '#0f0f11',
          secondary: '#141416',
          tertiary: '#1a1a1d',
          elevated: '#202024',
        },
        // Surface colors for cards
        surface: {
          DEFAULT: '#1a1a1d',
          hover: '#202024',
          active: '#252529',
        },
        // Brand accent
        brand: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          light: '#818cf8',
          dark: '#4338ca',
        },
        // Semantic colors
        accent: {
          DEFAULT: '#22d3ee',
          green: '#10b981',
          yellow: '#f59e0b',
          red: '#ef4444',
          purple: '#a855f7',
          pink: '#ec4899',
          orange: '#f97316',
        },
        // Text colors
        text: {
          primary: '#fafafa',
          secondary: '#a1a1aa',
          tertiary: '#71717a',
          muted: '#52525b',
        },
        // Border colors
        border: {
          DEFAULT: '#27272a',
          hover: '#3f3f46',
        },
      },
    },
  },
  plugins: [],
}
