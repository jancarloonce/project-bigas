/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        soil: {
          dark: "#060e1a",
          DEFAULT: "#0d1e33",
          light: "#14284a",
        },
        paddy: {
          dark: "#1a6b35",
          DEFAULT: "#2a9050",
          light: "#3dbe6e",
        },
        grain: {
          DEFAULT: "#c8a020",
          light: "#f0c030",
        },
        parchment: "#c8dff5",
        rock: "#3a5878",
        shed: "#c02020",
        farmer: "#30d0a0",
        ripe: "#f5c020",
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
        mono: ['"Courier New"', "Courier", "monospace"],
      },
      boxShadow: {
        pixel: "4px 4px 0 0 rgba(0,0,0,0.8)",
        "pixel-sm": "2px 2px 0 0 rgba(0,0,0,0.8)",
      },
    },
  },
  plugins: [],
};
