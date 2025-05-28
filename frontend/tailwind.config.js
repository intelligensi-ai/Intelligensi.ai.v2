const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        // Base text
        'xs': '0.75rem',      // 12px
        'sm': '0.875rem',     // 14px
        'base': '0.9rem',     // 14.4px - base text size
        'lg': '1rem',         // 16px - h6
        'xl': '1.1rem',       // 17.6px - h5
        '2xl': '1.25rem',     // 20px - h4
        '3xl': '1.5rem',      // 24px - h3
        '4xl': '1.75rem',     // 28px - h2
        '5xl': '2rem',        // 32px - h1
      },
      fontWeight: {
        light: 300,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
  },
  corePlugins: {
    fontSize: true, // Ensure font size utilities are generated
  },
  plugins: [],
};
