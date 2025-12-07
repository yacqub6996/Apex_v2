import '@mui/material/styles';

// This file teaches TypeScript about your custom colors
// It fixes the error: "Property 'accent' does not exist on type 'Palette'"...

declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary'];
  }
  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
  }
}