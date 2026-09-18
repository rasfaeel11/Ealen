/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ["Cinzel", "serif"],
        garamond: ["Spectral", "Georgia", "serif"],
      },
      colors: {
        codex: {
          bg: "#141110",
          panel: "#1c1815",
          border: "#3a2f22",
          gold: "#c9a15a",
          goldBright: "#e8c47a",
          ink: "#cfc6b8",
          inkDim: "#8c8375",
        },
      },
    },
  },
  plugins: [],
};
