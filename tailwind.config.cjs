/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
        "!./node_modules/**",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
