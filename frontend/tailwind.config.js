/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        uv: {
          yellow: "#FFD726",
          black: "#0A0A09",
          card: "#111110",
          border: "#1E1E1A",
          muted: "#3A3A35",
        },
        radar: {
          red: "#E24B4A",
          amber: "#EF9F27",
          teal: "#1D9E75",
          dark: "#0A0A0B",
          card: "#111113",
          border: "#1E1E22",
          muted: "#3A3A3F",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.35s ease forwards",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
