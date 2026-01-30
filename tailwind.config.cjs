/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './**/*.{js,ts,jsx,tsx}', '!./node_modules/**'],
  theme: {
    extend: {
      fontFamily: {
        // CYBERPUNK THEME
        cyber: ['Orbitron', 'sans-serif'],
        // RETRO THEME
        'retro-pixel': ['"Pixelify Sans"', 'cursive'],
        'retro-display': ['"Bruno Ace"', 'sans-serif'],
        'retro-title': ['VT323', 'monospace'],
        'retro-body': ['"Chakra Petch"', 'sans-serif'],
        'retro-numbers': ['"Space Mono"', 'monospace'],
        'retro-mono': ['"IBM Plex Mono"', 'monospace'],
        'retro-jersey': ['"Jersey 20"', 'sans-serif'],
        'retro-text': ['VT323', 'monospace'],
        // UTILITIES
        heading: ['Orbitron', 'sans-serif'],
        display: ['"Pixelify Sans"', 'cursive'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        stats: ['"Space Mono"', 'monospace'],
        tech: ['"Share Tech Mono"', 'monospace'],
        feed: ['Oxanium', 'sans-serif'],
        debug: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
