import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "apple-touch-icon.png",
      ],

      workbox: {
        importScripts: [
          "/push-sw.js",
        ],
      },

      manifest: {
        name: "מעקב חיטוב",
        short_name: "חיטוב",
        description: "מעקב חיטוב יומי ❤️",

        theme_color: "#f4fbfa",
        background_color: "#f4fbfa",

        display: "standalone",

        start_url: "/",
        scope: "/",

        orientation: "portrait",

        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});