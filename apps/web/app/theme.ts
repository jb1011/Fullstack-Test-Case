import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  globalCss: {
    body: {
      bg: "canvas",
      color: "ink",
      fontFamily: "body",
      fontSize: "14px",
    },
    button: {
      cursor: "pointer",
    },
    "button:disabled": {
      cursor: "default",
    },
    "button:focus-visible, a:focus-visible": {
      outline: "2px solid",
      outlineColor: "accent",
      outlineOffset: "2px",
    },
  },
  theme: {
    tokens: {
      colors: {
        canvas: { value: "#FAFAF9" },
        surface: { value: "#FFFFFF" },
        ink: { value: "#0A0A0A" },
        muted: { value: "#78716C" },
        line: { value: "#E7E5E4" },
        soft: { value: "#F5F5F4" },
        accent: { value: "#2F6BFF" },
        accentSoft: { value: "#EAF0FF" },
        positive: { value: "#16A34A" },
        rowHover: { value: "#FAFAFF" },
      },
      fonts: {
        body: { value: '"Geist", ui-sans-serif, system-ui, sans-serif' },
        heading: { value: '"Geist", ui-sans-serif, system-ui, sans-serif' },
        mono: { value: '"Geist Mono", ui-monospace, monospace' },
      },
      radii: {
        card: { value: "16px" },
        kpi: { value: "14px" },
        pill: { value: "999px" },
        badge: { value: "6px" },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
