import type { Config } from "tailwindcss"

/**
 * NUBJobs Tailwind configuration.
 *
 * Tailwind CSS v4 is CSS-first and normally needs no JS/TS config — the brand
 * tokens, animations and font family are declared with `@theme` in
 * `src/app/globals.css`. This file mirrors those values in the classic
 * `theme.extend` shape (the format most tooling and contributors expect) and is
 * loaded by the v4 engine via the `@config "../../tailwind.config.ts";`
 * directive in globals.css, so it is live configuration, not documentation.
 *
 * Keep the values here in sync with the `@theme` block in globals.css.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#1a56db",
          700: "#1d4ed8",
          900: "#1e3a5f",
        },
        navy: "#1e293b",
      },
      fontFamily: {
        // Uses the CSS variable injected by next/font (next/font/google → Inter)
        // so the optimized, self-hosted font is preserved.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "count-up": "countUp 2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(1rem)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(0.5rem)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}

export default config
