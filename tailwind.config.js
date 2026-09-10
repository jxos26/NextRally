/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0C1210",
        panel: "#0F1714",
        panel2: "#141F1A",
        court: "#122A22",
        line: "#1C2823",
        line2: "#24352E",
        line3: "#2A3B34",
        slot: "#16241E",
        slotline: "#2C4239",
        chalk: "#F2F7F4",
        soft: "#9FB3A8",
        mute: "#7F9389",
        dim: "#5A6B63",
        faint: "#6E8279",
        lime: "#C9F24A",
        limebright: "#E2FF8F",
        limedark: "#1B2A12",
        sand: "#D9CE84"
      },
      fontFamily: {
        sans: ["Archivo", "system-ui", "sans-serif"],
        black: ["'Archivo Black'", "sans-serif"]
      }
    }
  },
  plugins: []
};
