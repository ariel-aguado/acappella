import tailwindcss from "@tailwindcss/vite";

import "./lib/env";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  ssr: false,
  devtools: { enabled: true },
  modules: [
    "@nuxt/eslint",
    "@nuxt/icon",
    "@nuxtjs/color-mode",
    "@pinia/nuxt",
    "@nuxtjs/mdc",
    "@vueuse/nuxt",
    "@nuxt/fonts",
    "@vite-pwa/nuxt",
  ],
  css: ["~/assets/css/main.css"],
  eslint: {
    config: {
      standalone: false,
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  colorMode: {
    dataValue: "theme",
  },
  fonts: {
    families: [
      {
        name: "Inter",
        provider: "google",
        weights: [300, 400, 500, 700, 900],
        styles: ["normal", "italic"],
        subsets: ["latin"],
      },
    ],
  },
  pwa: {
    registerType: "autoUpdate", // Always keep service worker updated
    includeAssets: ["favicon.ico", "apple-touch-icon.png", "icons/*.svg"],
    manifest: {
      name: "Acappella",
      short_name: "Acappella",
      description: "Visor de himnos y cánticos espirituales - Iglesia de Cristo",
      theme_color: "#0f172a", // your brand color
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait",
      lang: "es",
      icons: [
        {
          src: "/web-app-manifest-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/web-app-manifest-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/web-app-manifest-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    },

    workbox: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
          handler: "CacheFirst",
          options: {
            cacheName: "google-fonts-cache",
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
        {
          urlPattern: ({ url }) => url.pathname.startsWith("/_nuxt/"),
          handler: "CacheFirst",
          options: {
            cacheName: "nuxt-assets",
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30,
            },
          },
        },
        {
          urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
          handler: "NetworkFirst",
          options: {
            cacheName: "api-cache",
            networkTimeoutSeconds: 5,
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 60 * 24,
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          urlPattern: ({ url }) => url.pathname.startsWith("/songs/"),
          handler: "CacheFirst",
          options: {
            cacheName: "songs-cache",
            expiration: {
              maxEntries: 400,
              maxAgeSeconds: 60 * 60 * 24 * 365,
            },
          },
        },
      ],
    },
  },
});
