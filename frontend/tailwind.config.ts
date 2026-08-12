import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "hsl(var(--canvas) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        hover: "hsl(var(--hover) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        foreground: {
          DEFAULT: "hsl(var(--foreground-primary) / <alpha-value>)",
          secondary: "hsl(var(--foreground-secondary) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--primary-accent) / <alpha-value>)",
          hover: "hsl(var(--accent-hover) / <alpha-value>)",
        },
        status: {
          todo: "hsl(215, 16%, 47%)",
          in_progress: "hsl(199, 89%, 48%)",
          blocked: "hsl(38, 92%, 50%)",
          completed: "hsl(142, 71%, 45%)",
          archived: "hsl(240, 5%, 34%)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
