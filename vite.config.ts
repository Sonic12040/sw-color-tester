import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/sw-color-tester/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // supplied via public/manifest.json
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        navigateFallback: null,
      },
    }),
  ],
});
