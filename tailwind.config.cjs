/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './**/*.{js,ts,jsx,tsx}', '!./node_modules/**'],
  theme: {
    extend: {
      fontFamily: {
        // CYBERPUNK THEME
        cyber: ['Orbitron', 'sans-serif'],
        // RETRO THEME
        'retro-pixel': ['"Press Start 2P"', 'cursive'],
        'retro-text': ['VT323', 'monospace'],
        // UTILITIES
        heading: ['Orbitron', 'sans-serif'],
        display: ['"Press Start 2P"', 'cursive'], // Keeping for backward compatibility
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        stats: ['"Exo 2"', 'sans-serif'],
        tech: ['"Share Tech Mono"', 'monospace'],
        feed: ['Oxanium', 'sans-serif'],
        debug: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
