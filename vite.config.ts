import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/sw-color-tester/",
  // Ensure CSS-module imports are transformed in the SSR (prerender) build.
  ssr: {
    noExternal: ["react-router"],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // supplied via public/manifest.json
      workbox: {
        // Precache the shell only — NOT the ~2,000 prerendered color pages
        // (which are generated after this step and runtime-cached instead).
        globPatterns: ["**/*.{js,css,svg,png,ico,woff,woff2}"],
        globIgnores: ["**/colors/**/*.html"],
        navigateFallback: null,
        // Visited color pages become available offline after first view.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/sw-color-tester/colors/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "color-pages",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
});
