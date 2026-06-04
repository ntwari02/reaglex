/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Times New Roman"', 'Times', 'serif'],
        serif: ['"Times New Roman"', 'Times', 'serif'],
        mono: ['"Times New Roman"', 'Times', 'serif'],
        logo: ['"Mea Culpa"', 'serif'],
      },
      colors: {
        /* Buyer dark surfaces — resolve from theme.css tokens (light: same vars, different values) */
        'dark-primary': 'var(--bg-page)',
        'dark-secondary': 'var(--bg-secondary)',
        'dark-card': 'var(--card-bg)',
        'dark-border': 'var(--divider-strong)',
        accent: '#ff7a1a',
        'accent-purple': '#6c63ff',
      },
    },
  },
  plugins: [],
};
