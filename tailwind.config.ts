import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit", "Inter", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Outfit", "sans-serif"],
      },
      colors: {
        pitch: {
          950: "#040806", // ultra-dark charcoal with green undertone
          900: "#09120c", // rich pitch card background
          800: "#102316", // border hover glow green
          600: "#059669", // emerald primary
          500: "#10b981", // vibrant mint green
          400: "#34d399",
        },
        gold: {
          300: "#fde047",
          400: "#facc15", // athletic gold
          500: "#eab308",
          600: "#ca8a04",
        },
        slate: {
          950: "#030712",
          900: "#0f172a",
        }
      },
      boxShadow: {
        "glow-green": "0 0 20px -5px rgba(16, 185, 129, 0.15)",
        "glow-gold": "0 0 20px -5px rgba(250, 204, 21, 0.15)",
        "premium": "0 8px 30px rgb(0 0 0 / 0.5)",
      },
      backgroundImage: {
        "radial-dark": "radial-gradient(circle at top, #0c2518 0%, #040806 60%, #010201 100%)",
        "radial-card": "radial-gradient(100% 100% at 50% 0%, rgba(16, 185, 129, 0.05) 0%, rgba(0, 0, 0, 0) 100%)",
      },
      animation: {
        aurora: "aurora 60s linear infinite",
      },
      keyframes: {
        aurora: {
          from: {
            backgroundPosition: "50% 50%, 50% 50%",
          },
          to: {
            backgroundPosition: "350% 50%, 350% 50%",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
