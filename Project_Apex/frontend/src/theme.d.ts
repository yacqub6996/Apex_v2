import "@mui/material/styles";

// Teach TypeScript about the custom accent palette
// and extra shade tokens used in the theme.
declare module "@mui/material/styles" {
  interface Palette {
    accent: Palette["primary"];
  }
  interface PaletteOptions {
    accent?: PaletteOptions["primary"];
  }

  // Allow custom shade keys on palette colors
  interface PaletteColor {
    soft?: string;
    strong?: string;
  }

  interface SimplePaletteColorOptions {
    soft?: string;
    strong?: string;
  }
}
