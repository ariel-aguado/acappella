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
    "notivue/nuxt",
  ],
  css: [
    "~/assets/css/main.css",
    "notivue/notification.css",
    "notivue/animations.css",
  ],
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
    registerType: "autoUpdate",
    manifest: {
      name: "Acappella",
      short_name: "Acappella",
      theme_color: "#422ad5",
      background_color: "#ffffff",
      icons: [
        {
          src: "pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      screenshots: [
        {
          src: "screenshot-desktop.png",
          sizes: "1280x800",
          type: "image/png",
          form_factor: "wide",
        },
        {
          src: "screenshot-mobile.png",
          sizes: "375x667",
          type: "image/png",
          // form_factor not set, counts as mobile
        },
      ],
    },
    workbox: {
      navigateFallback: "/",
      globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
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
      ],
    },
    injectManifest: {
      globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      navigateFallback: "/",
      navigateFallbackAllowlist: [/^\/$/],
      type: "module",
    },
  },
});
