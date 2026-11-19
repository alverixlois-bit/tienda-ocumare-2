import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#064E3B",
          dark: "#032e23",
          light: "#0D6E53",
          container: "#0D6E53",
          "on-container": "#D1FAE5",
        },
        cta: {
          DEFAULT: "#84CC16",
          hover: "#65A30D",
          light: "#A3E635",
          dark: "#4D7C0F",
          on: "#14532D",
        },
        surface: {
          DEFAULT: "#FAFAF9",
          card: "#FFFFFF",
          glass: "rgba(255, 255, 255, 0.85)",
          "glass-border": "rgba(255, 255, 255, 0.4)",
          "container-low": "#F5F5F4",
          container: "#E7E5E4",
          "container-high": "#D6D3D1",
          dark: "#0F172A",
          "dark-card": "#1E293B",
        },
        "ves-gold": "#D97706",
        outline: "#E2E8F0",
        "outline-strong": "#CBD5E1",
        "text-muted": "#64748B",
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
      },
      borderRadius: {
        '3xl': '32px',
        '2xl': '24px',
        'xl': '20px',
      },
      fontFamily: {
        display: ['var(--font-plus-jakarta)', 'sans-serif'],
        headline: ['var(--font-plus-jakarta)', 'sans-serif'],
        body: ['var(--font-instrument)', 'sans-serif'],
        sans: ['var(--font-instrument)', 'sans-serif'],
      },
    },
  },
  safelist: [
    // Avatar colors used dynamically in reviews section
    "bg-purple-600",
    "bg-blue-600",
    "bg-rose-600",
    "bg-amber-600",
    "bg-green-600",
    "bg-indigo-600",
  ],
  plugins: [],
};

export default config;
