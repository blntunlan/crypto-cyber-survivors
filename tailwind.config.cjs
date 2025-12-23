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
                // Space Mono - Clean monospace for UI text
                mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
                // VT323 - Retro pixel for damage numbers (canvas)
                retro: ['VT323', 'monospace'],
            },
        },
    },
    plugins: [],
}
