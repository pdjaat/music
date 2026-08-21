/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07080d",
        panel: "#10131c",
        card: "#161b27",
        line: "#242a38",
        ember: "#ff6b4a",
        glow: "#7c6cff",
        mint: "#3ee0b2",
      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["Manrope", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(124,108,255,0.25)",
      },
    },
  },
  plugins: [],
};
