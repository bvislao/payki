import type { Config } from 'tailwindcss'
export default {
    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}'
    ],
    theme: {
        extend: {
            colors: {
                payki: {
                    50: '#f0fff8',
                    100: '#d3ffe9',
                    200: '#a8ffd6',
                    300: '#6afbbd',
                    400: '#31e1a0',
                    500: '#00ad86', // Pantone 339 C aprox
                    600: '#007b80', // Pantone 7474 C aprox
                    700: '#003c49' // Pantone 309 C aprox
                }
            }
        }
    },
    plugins: []
} satisfies Config