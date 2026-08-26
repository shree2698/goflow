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
        canvas: "#ECF0F3",
        card: "#ECF0F3",
        hover: "#E2E8F0",
        border: "#D1D9E6",
        foreground: {
          DEFAULT: "#3D485C",
          secondary: "#718096",
        },
        accent: {
          DEFAULT: "#6B92E5",
          hover: "#5A81D4",
        },
        lavender: {
          DEFAULT: "#7B81BE",
          hover: "#6B71AE",
        },
        pink: {
          DEFAULT: "#F88AB0",
          hover: "#E7799F",
        },
        status: {
          todo: "#7B81BE",
          in_progress: "#6B92E5",
          blocked: "#F88AB0",
          completed: "#48BB78",
          archived: "#A0AEC0",
        },
      },
      boxShadow: {
        'neu-flat': '6px 6px 12px #d1d9e6, -6px -6px 12px #ffffff',
        'neu-flat-sm': '3px 3px 6px #d1d9e6, -3px -3px 6px #ffffff',
        'neu-flat-lg': '10px 10px 20px #d1d9e6, -10px -10px 20px #ffffff',
        'neu-pressed': 'inset 4px 4px 8px #d1d9e6, inset -4px -4px 8px #ffffff',
        'neu-pressed-sm': 'inset 2px 2px 4px #d1d9e6, inset -2px -2px 4px #ffffff',
        'neu-btn': '4px 4px 8px #d1d9e6, -4px -4px 8px #ffffff',
        'neu-btn-active': 'inset 3px 3px 6px #d1d9e6, inset -3px -3px 6px #ffffff',
      },
    },
  },
  plugins: [],
};
export default config;
