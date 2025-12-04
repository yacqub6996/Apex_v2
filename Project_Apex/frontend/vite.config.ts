import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  // Load env variables from the monorepo root .env so Vite picks up VITE_*
  envDir: path.resolve(__dirname, ".."),
  plugins: [react({
    jsxImportSource: '@emotion/react'
  }), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Prevent multiple React copies (fixes "Invalid hook call" in dev)
    dedupe: ["react", "react-dom"]
  },

  // Ensure pre-bundling uses the single deduped React
  optimizeDeps: {
    include: ["react", "react-dom"],
  },

  server: {
    port: 5173, // or your dev port
    host: true, // allow external connections (needed for ngrok/mobile)
    strictPort: true, // keeps the port fixed
    cors: true, // ensures requests from ngrok/mobile are allowed

    // 👇 only needed if Vite blocks your ngrok domain
    allowedHosts: [
      "iona-scrawliest-alveolarly.ngrok-free.dev", // your current ngrok domain
    ],

    // 👇 Proxy API requests to backend to avoid CORS issues
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },

    // 👇 Use default HMR settings for local development
    // Remove custom HMR config to fix WebSocket connection issues
  },
});
