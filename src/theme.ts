import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Warm amber/terracotta accent palette
        accent: {
          50: { value: "#FDF4EE" },
          100: { value: "#F9E1D0" },
          200: { value: "#F2C4A1" },
          300: { value: "#E8A272" },
          400: { value: "#D4814D" },
          500: { value: "#C2703E" },
          600: { value: "#A85A2F" },
          700: { value: "#8B4624" },
          800: { value: "#6E3419" },
          900: { value: "#52240F" },
        },
        // Warm neutrals tinted toward amber hue
        warmGray: {
          50: { value: "#FAF8F6" },
          100: { value: "#F3EFE9" },
          200: { value: "#E8E2DA" },
          300: { value: "#D4CCC2" },
          400: { value: "#B8AEA0" },
          500: { value: "#9A8E7F" },
          600: { value: "#7A6F62" },
          700: { value: "#5C5347" },
          800: { value: "#3E3730" },
          900: { value: "#2A2420" },
          950: { value: "#1C1814" },
        },
        // Deep brown/charcoal for dark mode
        shelf: {
          50: { value: "#F5F0EB" },
          100: { value: "#E6DDD4" },
          200: { value: "#C4B6A6" },
          300: { value: "#9E8C78" },
          400: { value: "#7A6B59" },
          500: { value: "#5C4F3F" },
          600: { value: "#433929" },
          700: { value: "#332B1F" },
          800: { value: "#241E17" },
          900: { value: "#1A1510" },
          950: { value: "#110E0A" },
        },
        amber: {
          400: { value: "#F0B849" },
          500: { value: "#E5A832" },
          600: { value: "#D49A20" },
        },
      },
      fonts: {
        // Vollkorn: warm organic serif for page-level headings and hero text
        heading: { value: "'Vollkorn Variable', Vollkorn, Georgia, serif" },
        // System fonts: fast, native, highly readable for UI text
        body: {
          value:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
      },
      sizes: {
        // Container width tiers
        "container.content": { value: "72rem" },   // ~1152px — readable content pages
        "container.workspace": { value: "90rem" },  // ~1440px — admin/settings/data-heavy
      },
    },
    semanticTokens: {
      colors: {
        "bg.page": {
          value: { _light: "{colors.warmGray.50}", _dark: "{colors.shelf.900}" },
        },
        "bg.card": {
          value: { _light: "{colors.white}", _dark: "{colors.shelf.700}" },
        },
        "bg.elevated": {
          value: { _light: "{colors.white}", _dark: "{colors.shelf.800}" },
        },
        "bg.subtle": {
          value: { _light: "{colors.warmGray.100}", _dark: "{colors.shelf.800}" },
        },
        "bg.nav": {
          value: {
            _light: "rgba(250, 248, 246, 0.88)",
            _dark: "rgba(26, 21, 16, 0.88)",
          },
        },
        // Muted card surface for hover / secondary areas
        "bg.muted": {
          value: { _light: "{colors.warmGray.200}", _dark: "{colors.shelf.600}" },
        },
        "fg.default": {
          value: { _light: "{colors.warmGray.900}", _dark: "{colors.warmGray.100}" },
        },
        "fg.muted": {
          value: { _light: "{colors.warmGray.600}", _dark: "{colors.warmGray.400}" },
        },
        "fg.subtle": {
          value: { _light: "{colors.warmGray.500}", _dark: "{colors.warmGray.500}" },
        },
        "fg.error": {
          value: { _light: "{colors.red.600}", _dark: "{colors.red.400}" },
        },
        "fg.success": {
          value: { _light: "{colors.green.600}", _dark: "{colors.green.400}" },
        },
        "accent.default": {
          value: { _light: "{colors.accent.500}", _dark: "{colors.accent.400}" },
        },
        "accent.hover": {
          value: { _light: "{colors.accent.600}", _dark: "{colors.accent.300}" },
        },
        "accent.muted": {
          value: { _light: "{colors.accent.50}", _dark: "{colors.accent.900}" },
        },
        "accent.subtle": {
          value: { _light: "{colors.accent.100}", _dark: "{colors.accent.800}" },
        },
        "border.card": {
          value: { _light: "{colors.warmGray.200}", _dark: "{colors.shelf.600}" },
        },
        "border.subtle": {
          value: { _light: "{colors.warmGray.200}", _dark: "{colors.shelf.700}" },
        },
        "border.focus": {
          value: { _light: "{colors.accent.500}", _dark: "{colors.accent.400}" },
        },
        "rating.star": {
          value: { _light: "{colors.amber.500}", _dark: "{colors.amber.400}" },
        },
      },
    },
  },
  globalCss: {
    "html, body": {
      bg: "bg.page",
      color: "fg.default",
      fontFamily: "body",
      lineHeight: "1.6",
      minHeight: "100vh",
    },
    "#root": {
      minHeight: "100vh",
    },
    // Only page-level headings use the serif font.
    // Card titles and UI labels should use fontFamily="body" explicitly.
    "h1, h2": {
      fontFamily: "heading",
      fontWeight: "700",
      letterSpacing: "-0.02em",
    },
    "h3, h4, h5, h6": {
      fontWeight: "600",
      letterSpacing: "-0.01em",
    },
    a: {
      color: "accent.default",
      textDecoration: "none",
      _hover: {
        color: "accent.hover",
        textDecoration: "underline",
      },
    },
    "*::selection": {
      bg: "accent.muted",
      color: "accent.default",
    },
    // Themed form controls
    "select, input[type='text'], input[type='password'], textarea": {
      colorScheme: "light dark",
    },
  },
});

export const system = createSystem(defaultConfig, customConfig);
