import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep, warm forest green — the "trustworthy fintech" primary.
        // Deliberately not Tailwind's stock `green` (too generic/bright);
        // this scale skews darker and slightly warmer, closer to what
        // Mercury/Stripe-style products use for a calm, premium feel.
        brand: {
          50: "#EEF4F0",
          100: "#D6E6DA",
          200: "#AFCFB8",
          300: "#83B492",
          400: "#5B9A6E",
          500: "#2F7A4D", // primary actions (SEND, primary buttons, active nav)
          600: "#256640",
          700: "#1D5233",
          800: "#163F27",
          900: "#0E2E1C", // high-emphasis text, active sidebar item
        },
        // Warm amber/ochre — the single deliberate accent, used sparingly
        // for the voice action and "recommended order" emphasis, so it
        // reads as "a distinct, attention-worthy action" against the calm
        // green + neutral base rather than everything competing for
        // attention in one color.
        accent: {
          50: "#FBF3E7",
          100: "#F4E1C2",
          200: "#EAC788",
          300: "#DEA94E",
          400: "#CE8F2E",
          500: "#B87A1F", // mic button, order badges
          600: "#996419",
          700: "#7A4F14",
        },
        // Warm neutral paper tones instead of cold gray — the background
        // and body-text scale.
        paper: {
          25: "#FDFCFA",
          50: "#FAF8F4",
          100: "#F3F0E9",
          200: "#E7E2D7",
          400: "#A9A296",
          600: "#726B5E",
          800: "#3D392F",
          900: "#231F19",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-manrope)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(14, 46, 28, 0.04), 0 1px 3px 0 rgba(14, 46, 28, 0.06)",
        elevated: "0 4px 16px -4px rgba(14, 46, 28, 0.12), 0 2px 6px -2px rgba(14, 46, 28, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
