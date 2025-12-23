/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
        "!./node_modules/**",
    ],
    theme: {
        extend: {
            fontFamily: {
                // Press Start 2P - Arcade/Pixel style for logos and main titles
                display: ['"Press Start 2P"', 'cursive'],
                // Orbitron - Futuristic for headings and numbers
                heading: ['Orbitron', 'sans-serif'],
                // IBM Plex Mono - Clean monospace for UI text
                mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
                // Exo 2 - Optimized for numbers, stats, metrics
                stats: ['"Exo 2"', 'sans-serif'],
                // Share Tech Mono - Technical/settings panels
                tech: ['"Share Tech Mono"', 'monospace'],
                // Oxanium - Futuristic terminal-like for live feeds
                feed: ['Oxanium', 'sans-serif'],
                // JetBrains Mono - Developer/debug/error messages
                debug: ['"JetBrains Mono"', 'monospace'],
                // VT323 - Retro pixel for damage numbers (canvas)
                retro: ['VT323', 'monospace'],
            },
        },
    },
    plugins: [],
}
