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
        // { rel: "manifest", href: "/manifest.json" },
      ],
      meta: [
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
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
    "@nuxtjs/mdc",
    "@vueuse/nuxt",
    "@nuxt/fonts",
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
});
