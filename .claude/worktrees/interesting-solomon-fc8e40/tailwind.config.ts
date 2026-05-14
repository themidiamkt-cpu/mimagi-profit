import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Inter', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: "var(--border-subtle)",
        input: "var(--bg-secondary)",
        ring: "var(--accent)",
        background: "var(--bg-tertiary)",
        foreground: "var(--text-primary)",
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text-secondary)",
        },
        destructive: {
          DEFAULT: "var(--color-danger-text)",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "var(--color-warning-text)",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "var(--color-success-text)",
          foreground: "#ffffff",
        },
        info: {
          DEFAULT: "var(--color-info-text)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text-tertiary)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "var(--bg-primary)",
          foreground: "var(--text-primary)",
        },
        card: {
          DEFAULT: "var(--bg-primary)",
          foreground: "var(--text-primary)",
        },
        sidebar: {
          DEFAULT: "var(--bg-tertiary)",
          foreground: "var(--text-secondary)",
          primary: "var(--accent)",
          "primary-foreground": "#ffffff",
          accent: "var(--border-subtle)",
          "accent-foreground": "var(--text-primary)",
          border: "var(--border-subtle)",
          ring: "var(--accent)",
        },
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        'none': 'none',
        'focus': '0 0 0 3px rgba(201, 100, 66, 0.2)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
