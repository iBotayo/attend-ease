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
        brand: {
          primary: "#123C3A",
          "primary-hover": "#0c2826",
          "primary-light": "#1d5350",
          secondary: "#2C7770",
          "secondary-hover": "#225e59",
          "secondary-light": "#3b968e",
          mint: "#D6F5E8",
          "mint-dark": "#1a6251",
          "mint-light": "#edfbf5",
          ivory: "#FAF8F2",
          "ivory-dark": "#f2eee4",
          surface: "#FFFFFF",
          success: "#23865B",
          "success-light": "#eaf6f0",
          warning: "#A86412",
          "warning-light": "#fef6ec",
          danger: "#B83B45",
          "danger-light": "#fdf1f2",
          border: "#E2DDD3",
          "border-subtle": "#ECE8DF",
          muted: "#687373",
          charcoal: "#1C2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(18, 60, 58, 0.05)",
        card: "0 1px 3px 0 rgba(18, 60, 58, 0.07), 0 1px 2px -1px rgba(18, 60, 58, 0.04)",
        dropdown: "0 10px 15px -3px rgba(18, 60, 58, 0.1), 0 4px 6px -4px rgba(18, 60, 58, 0.05)",
        modal: "0 20px 25px -5px rgba(18, 60, 58, 0.15), 0 8px 10px -6px rgba(18, 60, 58, 0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
