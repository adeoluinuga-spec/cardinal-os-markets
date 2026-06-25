import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "blue-primary": "var(--blue)",
        "blue-dark": "var(--blue-dark)",
        "blue-mid": "var(--blue-mid)",
        "blue-light": "var(--blue-light)",
        "blue-pale": "var(--blue-pale)",
        ink: "var(--ink)",
        ink2: "var(--ink2)",
        ink3: "var(--ink3)",
        white: "var(--white)",
        green: "var(--green)",
        "green-light": "var(--green-light)",
        gold: "var(--gold)",
        "blue-border": "var(--border)",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
