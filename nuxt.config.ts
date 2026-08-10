import tailwindcss from "@tailwindcss/vite";
import { isDevelopment } from "std-env";

import "./lib/env";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  ssr: false,
  devtools: { enabled: true },
  app: {
    head: {
      viewport: "width=device-width,initial-scale=1,viewport-fit=cover",
      link: [
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        { rel: "icon", type: "image/svg+xml", href: "/logo.svg" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      ],
      meta: [
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-title", content: "Acappella" },
        { name: "format-detection", content: "telephone=no" },
        // open graph social image
        { property: "og:url", content: "https://acappella-montevideo.vercel.app" },
        { property: "og:title", content: "Acappella" },
        { property: "og:description", content: "Himnos y cánticos espirituales para la adoración" },
        { property: "og:type", content: "website" },
        { property: "og:image", content: "https://acappella-montevideo.vercel.app/acappella-og-optimized.png" },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "600" },
        { property: "og:image:alt", content: "Acappella - Himnos y cánticos espirituales" },
        { property: "og:site_name", content: "Acappella" },
        { property: "og:locale", content: "es_UY" },
        { name: "twitter:site", content: "@acappella" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Acappella" },
        { name: "twitter:description", content: "Himnos y cánticos espirituales para la adoración" },
        { name: "twitter:image", content: "https://acappella-montevideo.vercel.app/acappella-og-optimized.png" },
      ],
    },
    pageTransition: {
      name: "android",
      mode: "out-in",
    },
  },
  modules: [
    "@nuxt/eslint",
    "@nuxt/icon",
    "@nuxtjs/color-mode",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxt/fonts",
    "@vite-pwa/nuxt",
  ],
  css: [
    "~/assets/css/main.css",
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
  sourcemap: isDevelopment,

  pwa: {
    registerType: "autoUpdate",
    injectRegister: "auto",
    strategies: "injectManifest",
    srcDir: ".",
    filename: "sw.ts",
    manifest: {
      id: "/",
      name: "Acappella",
      short_name: "Acappella",
      description: "Himnos y cánticos espirituales para la adoración.",
      start_url: "/?source=pwa",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      lang: "es",
      dir: "ltr",
      theme_color: "#422ad5",
      background_color: "#ffffff",
      categories: ["music", "lifestyle"],
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
          form_factor: "narrow",
        },
      ],
      shortcuts: [
        {
          name: "Buscar himno",
          short_name: "Buscar",
          description: "Buscar himnos por número o título",
          url: "/search?source=shortcut",
          icons: [{ src: "pwa-192x192.png", sizes: "192x192", type: "image/png" }],
        },
        {
          name: "Búsqueda completa",
          short_name: "Full-text",
          description: "Buscar dentro del contenido de los himnos",
          url: "/fully-search?source=shortcut",
          icons: [{ src: "pwa-192x192.png", sizes: "192x192", type: "image/png" }],
        },
      ],
    },
    injectManifest: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
    },
    devOptions: {
      enabled: false,
    },
    client: {
      // We capture `beforeinstallprompt` ourselves in `use-pwa-install.ts`,
      // so disable the plugin's duplicate listener.
      installPrompt: false,
    },
  },
});
