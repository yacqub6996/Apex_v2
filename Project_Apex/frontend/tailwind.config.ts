import type { Config } from "tailwindcss"
import plugin from "tailwindcss/plugin"
import typography from "@tailwindcss/typography"
import rac from "tailwindcss-react-aria-components"
import animate from "tailwindcss-animate"

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // Support dark mode with either .dark or .dark-mode on the root
  darkMode: ["class", ".dark-mode"],
  theme: {
    extend: {},
  },
  plugins: [
    typography,
    rac,
    animate,
    plugin(({ addVariant }) => {
      addVariant("label", "& [data-label]")
      addVariant("focus-input-within", ":is(&):has(input:focus)")
      // dark variant handled by darkMode config above
    }),
  ],
} satisfies Config
